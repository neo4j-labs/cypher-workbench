import React, { Component } from 'react'
import {
    CircularProgress,
    IconButton, 
    Table, TableBody, TableCell, 
    TableHead, TableRow, TextField, Tooltip, Typography
} from '@material-ui/core';
//import { CypherEditor } from "graph-app-kit/components/Editor";
//import CypherEditor from "react-codemirror-cypher";
import { CypherEditor } from '@neo4j-cypher/react-codemirror'; 
import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";
import { getCurrentConnectionInfo } from '../../../../common/Cypher';
import { 
    DebugSteps,
    debugStep
} from '../../../../dataModel/debugSteps';
import { tryAgain } from '../../../common/util';
import CypherStringConverter from "../../../../dataModel/cypherStringConverter";
import { CypherVariableScope } from '../../../../dataModel/cypherVariableScope';
import { LAYOUTS } from '../../../../components/canvas/d3/layoutHelper';
import { COLORS } from "../../../../common/Constants";
import { stopListeningTo, listenTo } from "../../../../dataModel/eventEmitter";
import { getDynamicConfigValue } from '../../../../dynamicConfig';

const pxVal = (px) => typeof(px) === 'string' ? parseInt(px.replace(/px$/,'')) : px;

const Sizes = {
    ToolbarHeight: '40px',
    TabsAndDebugBarHeight: '100px',
    MinCypherEditorWidth: '300px',
    MaxCypherEditorWidth: '1400px',
    DefaultCypherEditorWidth: '800px'
}

const DebugDirection = {
    Forward: "Forward",
    Backward: "Backward"
}

const Placeholder = {
    Key: '_gd_placeholder', 
    Value: 'placeholder'    
}

const CYPHER_RETURN = '\nRETURN *';
const DATABASE_HELP_MESSAGE = "Click here to connect to a database";

const DEFAULT_NODE_STYLE = {
    color: 'white',
    stroke: 'gray',
    size: 'md',
    fontSize: 14,
    fontColor: 'black',
    strokeWidth: 2
}

const PLACEHOLDER_NODE_STYLE = {
    color: '#cccccc',
    stroke: 'gray',
    size: 'md',
    fontSize: 14,
    fontColor: 'black',
    strokeWidth: 2
}

export default class ResultsTable extends Component {

    state = {
        headers: [],
        rows: [],
        cypherQuery: '',
        limit: '10',
        debugSteps: null,
        isBusy: false,
        isRunningUntilNoResults: false,
        stopRunning: false,
        canStepBackward: false,
        canStepForward: false,
        areStepping: false,
        resultTableHeight: 400,
        cypherEditorHeight: 100,
        codeDebugWidth: pxVal(Sizes.DefaultCypherEditorWidth)
    }

    debugNodeStyle = {};

    // duck-typing because remote connections don't create a 'Node' javascript object, 
    //  only driver connections in the browser do, and we need to handle both
    isNode = (value) => value && typeof(value === 'object') && value.labels && Array.isArray(value.labels);

    // duck-typing because remote connections don't create a 'Relationship' javascript object, 
    //  only driver connections in the browser do, and we need to handle both
    isRelationship = (value) => value && typeof(value === 'object') && typeof(value.start) === 'number' && typeof(value.end) === 'number';

    getNodeHeaders = (headers, rows) => {
        var nodeHeaders = [];
        if (rows && rows.length > 0 && rows[0]) {
            const firstRow = rows[0];
            nodeHeaders = headers.filter(header => this.isNode(firstRow[header]));
        }
        return nodeHeaders;
    }

    getRelationshipHeaders = (headers, rows) => {
        var relationshipHeaders = [];
        if (rows && rows.length > 0 && rows[0]) {
            const firstRow = rows[0];
            relationshipHeaders = headers.filter(header => this.isRelationship(firstRow[header]));
        }
        return relationshipHeaders;
    }

    addPlaceholderNode = (syncedGraphDataAndView, nodeId, initialX, initialY, graphCanvas) => {
        var displayNode = syncedGraphDataAndView.createNode({
            neoInternalId: nodeId,
            key: nodeId,
            labels: []
        }, {
            key: nodeId,
            x: initialX,
            y: initialY,
            ...PLACEHOLDER_NODE_STYLE
        });
        displayNode.getNode().addProperty(Placeholder.Key, Placeholder.Value);
        syncedGraphDataAndView.addNode(displayNode);
        if (graphCanvas) {
            graphCanvas.reRenderNode(displayNode);
        }
        return displayNode;
    }

    isPlaceholderNode = (displayNode) => {
        if (displayNode) {
            var property = displayNode.getNode().getPropertyByKey(Placeholder.Key);
            return (property && property.value === Placeholder.Value);
        } else {
            return false;
        }
    }

    getNodeStyle = ({ key, labels, dataModel }) => {

        const existingStyle = this.debugNodeStyle[key];
        if (existingStyle) { 
            return existingStyle;
        } else {
            if (dataModel && labels) {
                const nodeLabel = labels
                    .map(label => dataModel.getNodeLabelByLabel(label))
                    .filter(x => x)[0];

                if (nodeLabel) {
                    return {
                        color: nodeLabel.display.color,
                        stroke: nodeLabel.display.stroke,
                        size: nodeLabel.display.size,
                        fontSize: nodeLabel.display.fontSize,
                        fontColor: nodeLabel.display.fontColor,
                        //strokeWidth: nodeLabel.display.strokeWidth
                        strokeWidth: 2
                    }
                } else {
                    return DEFAULT_NODE_STYLE;
                }
            } else {
                return DEFAULT_NODE_STYLE;
            }
        }
    }

    reconcileRowsToSyncedGraphData = (syncedGraphDataAndView, headers, rows) => {
        const { graphDebugCanvasControlRef, parentContainer } = this.props;

        var selectedDataModel = null;
        if (parentContainer.getDataModel) {
            selectedDataModel = parentContainer.getDataModel();
        }

        const nodeHeaders = this.getNodeHeaders(headers, rows);
        const relationshipHeaders = this.getRelationshipHeaders(headers, rows);
        var graphCanvas = null;

        var initialX = 100, initialY = 150;
        if (graphDebugCanvasControlRef.current) {
            graphCanvas = graphDebugCanvasControlRef.current.getGraphCanvas();
            initialX = Math.floor(graphCanvas.getCanvasWidth() / 2);
            initialY = Math.floor(graphCanvas.getCanvasHeight() / 2);
            var snappedPoint = graphCanvas.snapPoint({x: initialX, y: initialY});
            initialX = snappedPoint.x;
            initialY = snappedPoint.y;
        }

        const allNodeKeysFromRows = new Set();
        const allRelKeysFromRows = new Set();

        // TODO - make this configurable
        //const MAX_FAN_OUT = 3;

        // var nodeRelCountMap = {};
        // rows.forEach(row => {
        //     relationshipHeaders.forEach(header => {
        //         const relInfo = row[header];

        //         var displayStartNode = syncedGraphDataAndView.getNodeByKey(relInfo.start);
        //         var displayEndNode = syncedGraphDataAndView.getNodeByKey(relInfo.end);
        //         var outboundRels = [];
        //         var inboundRels = [];
        //         if (displayStartNode) {
        //             outboundRels = syncedGraphDataAndView.getOutboundRelationshipsForNodeByType(displayStartNode, relInfo.type);
        //         }
        //         if (displayEndNode) {
        //             inboundRels = syncedGraphDataAndView.getInboundRelationshipsForNodeByType(displayEndNode, relInfo.type);
        //         }

        //         if (outboundRels.length > 0) {
        //             var count1 = nodeRelCountMap[relInfo.start];
        //             if (!count1) {
        //                 nodeRelCountMap[relInfo.start] = 1;
        //             } else {
        //                 nodeRelCountMap[relInfo.start] = count1 + 1;
        //             }
        //         }

        //         if (inboundRels.length > 0 || this.isPlaceholderNode(displayEndNode)) {
        //             var count2 = nodeRelCountMap[relInfo.end];
        //             if (!count2) {
        //                 nodeRelCountMap[relInfo.end] = 1;
        //             } else {
        //                 nodeRelCountMap[relInfo.end] = count2 + 1;
        //             }
        //         }
        //     })
        // });

        // handle nodes
        rows.forEach(row => {
            nodeHeaders.forEach(header => {
                const nodeInfo = row[header];

                //if (nodeRelCountMap[nodeInfo.identity] > 0 || Object.keys(nodeRelCountMap).length === 0) {
                    allNodeKeysFromRows.add(nodeInfo.identity);

                    const graphNodeProps = {
                        neoInternalId: nodeInfo.identity,
                        key: nodeInfo.identity,
                        labels: nodeInfo.labels
                    };
    
                    const displayNodeProps = {
                        key: nodeInfo.identity,
                        x: initialX,
                        y: initialY,
                        ...this.getNodeStyle({
                            key: nodeInfo.key,
                            labels: nodeInfo.labels,
                            dataModel: selectedDataModel
                        })
                    }
    
                    var displayNode = syncedGraphDataAndView.getNodeByKey(displayNodeProps.key);
                    var graphNode = null;
    
                    var updateProperties = false;
                    if (!displayNode) {
                        displayNode = syncedGraphDataAndView.createNode(graphNodeProps, displayNodeProps);
                        syncedGraphDataAndView.addNode(displayNode);
                        updateProperties = true;
                    } else {
                        // we are doing this to re-layout everything fresh every time
                        if (this.isPlaceholderNode(displayNode)) {
    
                            graphNode = displayNode.getNode();
                            // moving the removal of the placeholder node after the relationship check later
                            //graphNode.removeProperty(Placeholder.Key)
                            graphNode.labels = graphNodeProps.labels;
    
                            var nodeStyle = this.getNodeStyle({
                                key: displayNode.key,
                                labels: graphNode.labels,
                                dataModel: selectedDataModel
                            });
                            
                            updateProperties = true;
                            //displayNode.stroke = nodeStyle.stroke;
    
                            displayNode.fontSize = nodeStyle.fontSize;
                            displayNode.strokeWidth = nodeStyle.strokeWidth;
                            displayNode.setSize(nodeStyle.size);
                            // this sets stroke and fontColor
                            displayNode.setColor(nodeStyle.color);
                            
                            if (graphCanvas) {
                                graphCanvas.reRenderNode(displayNode);
                            }
                        } 
                        displayNode.setX(initialX);
                        displayNode.setY(initialY);
                    }
                    if (updateProperties) {
                        graphNode = displayNode.getNode();
                        if (nodeInfo.properties) {
                            Object.keys(nodeInfo.properties).forEach(key => {
                                graphNode.addProperty(key, nodeInfo.properties[key]);
                            });
                        }
                    }
                //}
            });
        });

        // remove any nodes that are no longer part of the result set
        syncedGraphDataAndView.getNodeArray()
            .filter(displayNode => !allNodeKeysFromRows.has(displayNode.key))
            .forEach(displayNode => syncedGraphDataAndView.removeNode(displayNode))

        // handle relationships
        rows.forEach(row => {
            relationshipHeaders.forEach(header => {
                const relInfo = row[header];

                var displayStartNode = syncedGraphDataAndView.getNodeByKey(relInfo.start);
                var displayEndNode = syncedGraphDataAndView.getNodeByKey(relInfo.end);

                var outboundRels = syncedGraphDataAndView.getOutboundRelationshipsForNodeByType(displayStartNode, relInfo.type);
                var inboundRels = syncedGraphDataAndView.getInboundRelationshipsForNodeByType(displayEndNode, relInfo.type);

                //if (outboundRels.length < MAX_FAN_OUT || this.isPlaceholderNode(displayEndNode)) {
                    allRelKeysFromRows.add(relInfo.identity);

                    // removing place holder status
                    if (this.isPlaceholderNode(displayEndNode)) {
                        var graphNode = displayEndNode.getNode();
                        graphNode.removeProperty(Placeholder.Key);
                    }

                    if (!displayStartNode) {
                        displayStartNode = this.addPlaceholderNode(syncedGraphDataAndView, 
                                relInfo.start, initialX, initialY, graphCanvas)
                    }
    
                    if (!displayEndNode) {
                        displayEndNode = this.addPlaceholderNode(syncedGraphDataAndView, 
                                relInfo.end, initialX, initialY, graphCanvas)
                    }
    
                    const graphRelProps = {
                        key: relInfo.identity,
                        type: relInfo.type,
                        startNode: displayStartNode.getNode(),
                        endNode: displayEndNode.getNode()
                    };
    
                    const displayRelProps = {
                        key: relInfo.identity,
                        startDisplayNode: displayStartNode,
                        endDisplayNode: displayEndNode
                    }
    
                    var existingRel = syncedGraphDataAndView.getRelationshipByKey(displayRelProps.key);
                    if (!existingRel) {
                        var displayRel = syncedGraphDataAndView.createRelationship(graphRelProps, displayRelProps);
                        var graphRel = displayRel.getRelationship();
                        if (relInfo.properties) {
                            Object.keys(relInfo.properties).forEach(key => {
                                graphRel.addProperty(key, relInfo.properties[key]);
                            });
                        }
                        syncedGraphDataAndView.addRelationship(displayRel);
                    }
                //} 
            })
        })

        // remove any relationships that are no longer part of the result set
        syncedGraphDataAndView.getRelationshipArray()
            .filter(displayRel => !allRelKeysFromRows.has(displayRel.key))
            .forEach(displayRel => syncedGraphDataAndView.removeRelationship(displayRel))        
    }

    updateDebugCanvas = (headers, rows) => {
        console.log('updateDebugCanvas headers + rows', headers, rows);
        const { graphDebugCanvasControlRef, graphDebugCanvasDataProvider } = this.props;
        if (graphDebugCanvasControlRef && graphDebugCanvasDataProvider) {
            const syncedGraphData = graphDebugCanvasDataProvider.data();
            this.reconcileRowsToSyncedGraphData(syncedGraphData, headers, rows);

            if (graphDebugCanvasControlRef.current) {
                //graphDebugCanvasControlRef.current.getGraphCanvas().getLayoutHelper().doForceLayout();
                //graphDebugCanvasControlRef.current.getGraphCanvas().getLayoutHelper().doGridLayout();
                graphDebugCanvasControlRef.current.getGraphCanvas()
                    .getLayoutHelper().doDagreLayout(LAYOUTS.DAGRE_TOP_BOTTOM, { yOffset: 80 });
                graphDebugCanvasControlRef.current.getGraphCanvas().render({animate: true});
            }
        }
    }

    setData = (data, isDebug) => {
        var { headers, rows } = data;

        if (isDebug) {
            this.updateDebugCanvas(headers, rows);
        }

        this.setState({
            headers: headers,
            rows: rows
        });
    }

    constructor (props) {
        super(props);
        this.dividerDrag = {};
        //this.cypherEditorRef = React.createRef();
    }

    dataChangeListener = (id, messageName, messagePayload) => {
        //console.log("messageName: ", messageName)
        //console.log("messagePayload: ", messagePayload)
        if (messageName === "GraphDataViewEvent" 
            && messagePayload.messageName === "NodeDisplayUpdate"
            && messagePayload.messagePayload.changedObject 
            && messagePayload.messagePayload.changedObject.classType === "NodeDisplay") {
            
            const nodeDisplay = messagePayload.messagePayload.changedObject;
            if (!this.isPlaceholderNode(nodeDisplay)) {
                this.debugNodeStyle[nodeDisplay.key] = {
                    size: nodeDisplay.size,
                    color: nodeDisplay.color,
                    stroke: nodeDisplay.stroke,
                    fontColor: nodeDisplay.fontColor,
                    fontSize: nodeDisplay.fontSize,
                    strokeWidth: nodeDisplay.strokeWidth
                }
            }
        }
    }

    componentDidMount = () => {
        var { parentContainer } = this.props;
        const cypher = parentContainer.getCypher();
        this.setState({
            cypher: cypher
        });

        const { mykey, graphDebugCanvasDataProvider } = this.props; 
        if (graphDebugCanvasDataProvider && mykey) {
            listenTo(graphDebugCanvasDataProvider, mykey, this.dataChangeListener);        
        }        
    }

    componentWillUnmount = () => {
        const { mykey, graphDebugCanvasDataProvider } = this.props;        
        if (graphDebugCanvasDataProvider && mykey) {
            stopListeningTo(graphDebugCanvasDataProvider, mykey);        
        }
    }

    refreshCodeMirrorCode = () => {
        /*
        if (this.cypherEditorRef.current) {
            var codeMirror = this.cypherEditorRef.current.getCodeMirror();        
            codeMirror.refresh();
        }*/
    }   

    setCypherEditorSize = () => {
        var { parentContainer } = this.props;

        var bottomDrawerOpenHeight = parentContainer.getBottomDrawerOpenHeight();
        var cypherEditorOffset = parentContainer.getSizeValue('CypherEditorOffset');
        var height = bottomDrawerOpenHeight - cypherEditorOffset - pxVal(Sizes.ToolbarHeight);
        this.setState({
            cypherEditorHeight: height
        });
    }

    setResultTableHeight = () => {
        var { parentContainer } = this.props;

        var bottomDrawerOpenHeight = parentContainer.getBottomDrawerOpenHeight();
        var height = bottomDrawerOpenHeight - pxVal(Sizes.ToolbarHeight) - pxVal(Sizes.TabsAndDebugBarHeight);
        
        this.setState({
            resultTableHeight: height
        });
    }

    /*
    setCypherEditor = (editor) => {
        this.cypherEditor = editor;
    } 

    setCypherEditorCypherQuery = (cypherQuery) => {
        tryAgain(() => {
            if (this.cypherEditor) {
                this.cypherEditor.setValue(cypherQuery);                
            }
        }, 5, 200);
      }
    */

    setCypherQuery = (value, options) => {
        options = options || {};
        const { source } = options;
        const { areStepping } = this.state;

        if (!(source === 'CypherBuilder' && areStepping)) {
            /*
            if (!options.skipSettingInternalValue) {
                this.setCypherEditorCypherQuery(value);
            }
            */
            this.setState({
                cypherQuery: value
            }, () => {
                //this.updateResultsPanel(value);            
            });
        }
    }

    getLineKeyword = (line) => {
        var tokens = line.split(' ');
        var keyword = tokens[0].trim().toUpperCase();
        var token2 = (tokens[1]) ? tokens[1].trim().toUpperCase() : '';
        keyword = (token2 === 'BY' || token2 === 'MATCH') ? `${keyword} ${token2}` : keyword;
        return keyword;
    }

    toggleShowDebugCanvas = () => {
        var { parentContainer } = this.props;
        parentContainer.toggleShowDebugCanvas();
    }    

    executeCypher = () => {
        var { parentContainer } = this.props;
        var cypher = parentContainer.getCypher();
        
        const cypherStringConverter = new CypherStringConverter();
        var clauses = [];
        try {
            clauses = cypherStringConverter.convertToClauses(cypher);
            if (clauses && clauses.length > 0) {
                var returnIndex = clauses.findIndex(clause => clause.keyword.toUpperCase() === 'RETURN');                   
                if (returnIndex >= 0) {
                    var lastClause = clauses[clauses.length-1];
                    if (lastClause.keyword.toUpperCase() !== 'LIMIT') {
                        var { limit } = this.state;
                        cypher = `${cypher}\nLIMIT ${limit}`;
                    }
                }
            }
        } catch (e) {
            console.log(`Encountered error while parsing cypherQuery ${cypher}: `, e);
            console.log('Query will still run, but LIMIT could not be added');
        }

        //this.setCypherEditorCypherQuery(cypher);        
        this.setState({
            cypherQuery: cypher,
            isBusy: true,
            debugSteps: null,
            areStepping: false,
            canStepBackward: false,
            canStepForward: false
        });

        parentContainer.executeCypherAndShowResults(cypher, false, (results) => {
            this.setState({ isBusy: false });
        });      
    }

    runUntilNoResults = () => {

        const { isRunningUntilNoResults } = this.state;
        if (isRunningUntilNoResults) {
            this.setState({
                stopRunning: true,
                isRunningUntilNoResults: false
            });
            return;
        }

        const runAndCheckResults = (results) => {
            const { rows, isError } = results;
            const { debugSteps, stopRunning } = this.state;
            //if (!isError && rows.length > 0 && !stopRunning && debugSteps.canStepForward()) {
            // changing to not check error, because we may encounter syntax errors during debugging and don't want to stop
            if (rows.length > 0 && !stopRunning && debugSteps.canStepForward()) {
                setTimeout(() => {
                    this.internalStepForward(runAndCheckResults);    
                }, 50);
            } else {
                this.setState({
                    stopRunning: false,
                    isRunningUntilNoResults: false
                })
            }
        }

        this.setState({
            isRunningUntilNoResults: true,
            limit: '1'
        }, () => {
            this.startDebugging(() => {
                this.internalStepForward(runAndCheckResults);
            });
        });
    }

    commentOutCypher = (cypher) => 
        cypher.split(/\n/)
            .filter(line => line.trim())
            .map(line => `// ${line}`)
            .join('\n');

    areDebugging = () => {
        const { areStepping } = this.state;
        return areStepping;        
    }

    startDebugging = (callback) => {

        var { parentContainer, graphDebugCanvasControlRef, graphDebugCanvasDataProvider } = this.props;
        var cypherBlocks = parentContainer.getCypherBlocks(); 
        this.debugNodeStyle = {};

        var debugSteps = new DebugSteps();
        var variableScope = new CypherVariableScope();
        if (graphDebugCanvasDataProvider) {
            graphDebugCanvasDataProvider.data().clearData();
            if (graphDebugCanvasControlRef && graphDebugCanvasControlRef.current) {
                graphDebugCanvasControlRef.current.getGraphCanvas().render();
            }
        }

        cypherBlocks.map(block => {
            var debugSnippets = block.getDebugCypherSnippets(variableScope);
            var blockCypher = block.getCypher(variableScope);
            console.log('blockCypher: ', blockCypher);
            var step = debugStep(blockCypher, debugSnippets);
            debugSteps.addStep(step);
        });

        var cypherToDisplay = debugSteps.getCypher(true);

        //this.setCypherEditorCypherQuery(cypherToDisplay);
        this.setState({
            cypherQuery: cypherToDisplay,
            headers: [],
            rows: [],
            debugSteps: debugSteps,
            stopRunning: false,
            areStepping: true,
            canStepBackward: debugSteps.canStepBackward(),
            canStepForward: debugSteps.canStepForward()
        }, () => {
            if (typeof(callback) === 'function') { callback(); }
        });
    }

    executeDebugQuery = (callback) => {
        var { debugSteps, limit } = this.state;
        var { parentContainer } = this.props;

        var cypherToRun = '';
        var cypherToDisplay = '';
        if (debugSteps) {
            cypherToRun = debugSteps.getCypher();
            cypherToDisplay = debugSteps.getCypher(true);

            var activeStep = debugSteps.getActiveStep();
            var activeStepCypher = (activeStep) ? activeStep.getCypher() : '';
            var keyword = '';            
            if (activeStepCypher) {
                keyword = this.getLineKeyword(activeStepCypher);
            }

            var { parentContainer } = this.props;
            var limitMultiplier = 1;
            if (parentContainer.isDebugCanvasActive && parentContainer.isDebugCanvasActive()) {
                if (keyword.match(/MATCH/i)) {
                    limitMultiplier = Math.floor(activeStep.getInternalActiveStepIndex() / 2);
                    if (limitMultiplier < 1) {
                        limitMultiplier = 1;
                        this.setState({
                            limitMultiplier: limitMultiplier
                        });
                    }
                } else {
                    limitMultiplier = (this.state.limitMultiplier) ? this.state.limitMultiplier : 1;
                }
            }
            var limit = parseInt(limit);
            var additionalLimit = 0;
            if (limitMultiplier > 1) {
                additionalLimit = 10;
            }
            limit = limit * limitMultiplier + additionalLimit;
            if (limit > 300) {
                limit = 300;
            }
            console.log(`limitMultiplier is: ${limitMultiplier}, limit is: ${limit}`);
            var cypherLimit = '';
            if (!isNaN(limit)) {
                cypherLimit = `\nLIMIT ${limit}`;
            }

            if (cypherToRun) {
                var shouldAddReturn = (['RETURN','ORDER BY','LIMIT','SKIP'].includes(keyword) === false);
                var shouldAddLimit = (keyword !== 'LIMIT')

                cypherToRun = (shouldAddReturn) ? `${cypherToRun}${CYPHER_RETURN}` : cypherToRun;
                cypherToRun = (shouldAddLimit) ? `${cypherToRun}${cypherLimit}` : cypherToRun;
            }

        } else {
            cypherToRun = this.cypherBlockDataProvider.getCypher();
            cypherToDisplay = cypherToRun;
        }

        //this.setCypherEditorCypherQuery(cypherToDisplay);        
        this.setState({
            isBusy: true,
            cypherQuery: cypherToDisplay,
            canStepForward: debugSteps.canStepForward(),
            canStepBackward: debugSteps.canStepBackward()
        }, () => {
            if (cypherToRun) {
                console.log('cypherToRun: ', cypherToRun);
                parentContainer.executeCypherAndShowResults(cypherToRun, true, (results) => {
                    this.setState({ isBusy: false });
                    if (typeof(callback) === 'function') callback(results);
                });
            } else {
                var results = {
                    headers: [],
                    rows: [],
                    isBusy: false
                }
                this.setState(results);
                this.setData({headers: [], rows: []}, true);

                if (typeof(callback) === 'function') callback(results);
            }
        });
    }

    stepForward = () => {
        const { debugSteps } = this.state;
        debugSteps.stepForward();     
        this.executeDebugQuery();   
    }

    stepBackward = () => {
        const { debugSteps } = this.state;
        debugSteps.stepBackward();        
        this.executeDebugQuery();   
    }

    internalStepForward = (callback) => {
        const { debugSteps } = this.state;
        debugSteps.internalStepForward();        
        if (typeof(callback) === 'function') {
            this.executeDebugQuery(callback);   
        } else {
            this.executeDebugQuery();
        }        
    }

    internalStepBackward = () => {
        const { debugSteps } = this.state;
        debugSteps.internalStepBackward();        
        this.executeDebugQuery();   
    }

    setLimit = (e) => {
        var { limit } = this.state;
        var newValueString = e.target.value;
        if (newValueString !== '') {
            const matches = newValueString.match(/^\d+$/);
            newValueString = (matches) ? newValueString : limit;
        }
        this.setState({
            limit: newValueString
        }); 
    }

    dividerDrag = {
        resizing: false,
        initialX: 0,
        initialY: 0,
        currentX: 0,
        currentY: 0,
        time: null,
      };    

    dividerMouseDown = (e) => {
        //console.log('dividerMouseDown: ', e);
        this.dividerDrag = {
            resizing: true,
            initialX: e.pageX,
            initialY: e.pageY,
            currentX: e.pageX,
            currentY: e.pageY,
            time: new Date().getTime()
        };
      };

    dividerMouseUp = (e) => {
        //console.log('dividerMouseUp: ', e);
        this.dividerDrag.resizing = false;
    };
    
    dividerMouseMove = (e) => {
        if (this.dividerDrag.resizing) {
            const { currentX } = this.dividerDrag;
            const { codeDebugWidth } = this.state;
            var increase = currentX - e.pageX;
            // console.log('codeDebugWidth: ', codeDebugWidth)        
            // console.log('currentX: ', currentX)        
            // console.log('e.pageX: ', e.pageX)        
            // console.log('increase: ', increase)        
            var newWidth = codeDebugWidth + increase;
            newWidth =
                newWidth > pxVal(Sizes.MaxCypherEditorWidth)
                ? pxVal(Sizes.MaxCypherEditorWidth)
                : newWidth;
            newWidth =
                newWidth < pxVal(Sizes.MinCypherEditorWidth)
                ? pxVal(Sizes.MinCypherEditorWidth)
                : newWidth;
            //console.log('newWidth: ', newWidth);
                this.setState({
                    codeDebugWidth: newWidth,
                },
                () => {
                    this.setDebugCodeSize();
                    //this.viewChanged(GraphDocChangeType.PanelResize);
                }
            );
            this.dividerDrag.currentX = e.pageX;
            //console.log('this.dividerDrag.currentX: ', this.dividerDrag.currentX)
        }
    }
    
    setDebugCodeSize = () => {
        /*
        if (this.dataModelRef.current) {
          var { rightDrawerOpenWidth } = this.state;
          var currentSize = this.dataModelRef.current.getCurrentDimensions();
          this.dataModelRef.current.updateDimensions({
            width: pxVal(rightDrawerOpenWidth) - 50,
            height: currentSize.height,
          });
        }
        */
    };
    
    render () {
        var { 
            headers, rows, cypherQuery, areStepping, canStepBackward, canStepForward, 
            limit, isRunningUntilNoResults, isBusy, resultTableHeight, cypherEditorHeight,
            codeDebugWidth
        } = this.state;
        var headers = headers || [];
        var rows = rows || [];
        const exportResultsEnabled = this.props.exportResultsEnabled || false;
        const exportResultsTitle = this.props.exportResultsTitle || '';
        const noOpFunc = () => {};
        const showExportResultsDialog = this.props.showExportResultsDialog || noOpFunc;

        const connectionActive = (getCurrentConnectionInfo()) ? true : false;
        const runUntilNoResultsButtonIcon = (isRunningUntilNoResults) ? 'fa-stop-circle' : 'fa-dot-circle';
        const runUntilNoResultsButtonStyle = (isRunningUntilNoResults) ? {color: 'red'} : {};
        const runUntilNoResultsHelpMessage = (isRunningUntilNoResults) ? 'Stop Running' : 'Debug Cypher Until No Results';
        const canvasDebugEnabledValue = getDynamicConfigValue('REACT_APP_CYPHER_CANVAS_DEBUG_ENABLED');
        const canvasDebugEnabled = canvasDebugEnabledValue === "true";

        return (
            <>
            <div style={{height: Sizes.ToolbarHeight, border: '1px solid lightgray', display: 'flex', flexFlow:'row'}}>
                <div>
                    <Tooltip enterDelay={600} arrow title="Execute Cypher">
                        <IconButton aria-label="Execute Cypher" onClick={this.executeCypher}>
                            <span className='runCypherButton1 fa fa-play' />
                        </IconButton>
                    </Tooltip>
                    {/*}
                    <Tooltip enterDelay={600} arrow title={runUntilNoResultsHelpMessage}>
                        <IconButton aria-label={runUntilNoResultsHelpMessage} onClick={this.runUntilNoResults}>
                            <span style={runUntilNoResultsButtonStyle} className={`runCypherButton2 fa ${runUntilNoResultsButtonIcon}`} />
                        </IconButton>
                    </Tooltip>
                    */}
                    <Tooltip enterDelay={600} arrow title="Debug Cypher">
                        <span>
                            <IconButton aria-label="Start Debugging" onClick={this.startDebugging}>
                                <span className='runCypherButton2 fa fa-bug' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={600} arrow title="Step backward a line">
                        <span>
                            <IconButton disabled={!canStepBackward} aria-label="Step backward a line" onClick={this.stepBackward}>
                                <span className='runCypherButton2 fa fa-angle-double-up' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={600} arrow title="Step forward a line">
                        <span>
                            <IconButton disabled={!canStepForward} aria-label="Step forward a line" onClick={this.stepForward}>
                                <span className='runCypherButton2 fa fa-angle-double-down' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={600} arrow title="Step backward inside line" onClick={this.internalStepBackward}>
                        <span>
                            <IconButton disabled={!canStepBackward} aria-label="Step backward inside line">
                                <span className='runCypherButton2 fa fa-arrow-left' />
                            </IconButton>
                        </span>                    
                    </Tooltip>
                    <Tooltip enterDelay={600} arrow title="Step forward inside line" onClick={this.internalStepForward}>
                        <span>
                            <IconButton disabled={!canStepForward} aria-label="Step forward inside line">
                                <span className='runCypherButton2 fa fa-arrow-right' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {isBusy && 
                        <CircularProgress style={{
                            marginLeft: '.2em', marginBottom: '-.25em', width:'1em', height:'1em'
                        }}/>                
                    }
                    <span style={{marginLeft: '15em', color: 'gray', marginRight: '.5em'}}>Num Records Returned 
                        <span style={{marginLeft: '0.5em', color: 'black'}}>{(connectionActive) ? rows.length : 0}</span>
                    </span>
                    <span style={{marginLeft: '2em', color: 'gray', marginRight: '.5em'}}>Limit </span>
                    <TextField value={limit} onChange={this.setLimit} margin="dense" style={{width: '5em', marginTop: '.46em'}}/>
                    {exportResultsEnabled &&
                        <Tooltip enterDelay={600} arrow title={exportResultsTitle} onClick={showExportResultsDialog}>
                            <IconButton aria-label={exportResultsTitle} style={{marginLeft: '1.5em', width: '1.5em'}}>
                                <span className='runCypherButton2 fa fa-file-export' />
                            </IconButton>
                        </Tooltip>
                    }
                </div>
                {canvasDebugEnabled &&
                    <>
                    <div style={{flexGrow: 1}}/>
                    <div style={{marginRight: '10px'}}>
                        <Tooltip enterDelay={600} arrow title="Show Debug Canvas" onClick={this.toggleShowDebugCanvas}>
                            <span>
                                <IconButton aria-label="Show Debug Canvas">
                                    <span className='runCypherButton2 fa fa-sitemap' />
                                </IconButton>
                            </span>                    
                        </Tooltip>
                    </div>
                    </>
                }
            </div>  
            <div style={{display:'flex',flexFlow:'row'}}
                onMouseMove={this.dividerMouseMove}
                onMouseUp={this.dividerMouseUp}
            >
                <div style={{width: areStepping ? `calc(100% - ${codeDebugWidth}px - 10px)` : '100%'}}>
                    {(headers.length !== 0) ? 
                        <div style={{
                            marginTop: '.5em', 
                            height: resultTableHeight,
                            overflowX: 'scroll', 
                            overflowY: 'scroll'
                        }}>
                            <Table stickyHeader aria-label="sticky table">
                                <TableHead>
                                <TableRow>
                                    {headers.map((header,index) =>
                                        <TableCell key={index} style={{paddingTop: '8px', paddingBottom: '8px'}}>{header}</TableCell>
                                    )}
                                </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((row,index) =>
                                        <TableRow key={index} hover={true}>
                                            {Object.keys(row).map(header => {
                                                var value = row[header];
                                                value = (typeof(value) === 'string') ? value : JSON.stringify(value); 
                                                return (
                                                    <TableCell style={{cursor: 'pointer'}} key={header}>
                                                        {(connectionActive) ? 
                                                            value :
                                                            <>
                                                                <span>{value}</span>
                                                                <span className='fa fa-question-circle' 
                                                                    style={{marginLeft: '.3em', cursor: 'pointer'}}
                                                                    onClick={()=>window.showDatabaseHelpMessage(DATABASE_HELP_MESSAGE)}>
                                                                </span>
                                                            </>                                  
                                                        }
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        :
                        <div style={{padding: '5px'}}>
                            {(connectionActive) ? 
                                'No results' :
                                <>
                                    <span>Connect to a database to run cypher</span>
                                    <span className='fa fa-question-circle' 
                                        style={{marginLeft: '.3em', cursor: 'pointer'}}
                                        onClick={()=>window.showDatabaseHelpMessage(DATABASE_HELP_MESSAGE)}>
                                    </span>
                                </>                                  
                            }
                        </div>
                    }
                </div>
                <div style={{width: '5px',
                        color: COLORS.toolBarFontColor,
                        backgroundColor: COLORS.secondaryToolBarColor,
                        cursor: 'ew-resize'
                    }}
                    onMouseDown={this.dividerMouseDown}
                />
                {areStepping &&
                    <div id='cypherEditorResults' style={{
                        width: `${codeDebugWidth}px`,
                        marginLeft: '2px',
                        height: `${cypherEditorHeight}px`, 
                        borderBottom: '1px solid gray',
                        borderLeft: '1px dashed gray',
                        borderRight: '1px dashed gray'
                    }}>
                        <CypherEditor
                            readOnly={true}
                            //initialValue={cypherQuery}
                            lineWrapping={true}
                            value={cypherQuery}
                            //onValueChanged={(value) => this.setCypherQuery(value, {skipSettingInternalValue: true})}
                            //onEditorCreated={this.setCypherEditor}
                            //cypherLanguage={false}
                            onSelectionChanged={(e) => {
                                console.log("Selection Changed (ResultsTable): ", e);
                            }}
                            classNames={["cypherEditor"]}                            
                        />
                    </div>
                }
            </div>                  
            </>
        )
    }
}
