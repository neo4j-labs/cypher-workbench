import React, { Component } from 'react'
import { Resizable, ResizableBox } from 'react-resizable';

import "../../../common/css/react-resizable.css";

import GraphCanvasControl from '../../../components/canvas/GraphCanvasControl';
import { CANVAS_MESSAGES } from '../../../components/canvas/d3/graphCanvas';

import { SyncedEventTypes } from '../../../dataModel/syncedGraphDataAndView';

import GraphCanvasEditHelper from '../graphCanvas/graphCanvasEditHelper';
import ModalVariableLabelsAndTypes from '../../../components/common/ModalVariableLabelsAndTypes';

import { ALERT_TYPES, USER_ROLE, COLORS } from '../../../common/Constants';
import SecurityRole from '../SecurityRole';
import { GraphDocChangeType } from '../../../dataModel/graphDataConstants';
import { OutlinedStyledButton } from '../../../components/common/Components';

import { 
    RELATIONSHIP_DIRECTION
} from '../../../dataModel/cypherPattern';

import {
    NETWORK_STATUS
} from '../../../persistence/graphql/GraphQLPersistence';
import SearchableChips from '../../../components/common/SearchableChips';
import ModalChips from '../../../components/common/ModalChips';
import DataSource from './DataSource';
import { CONTAINER_CALLBACK_MESSAGES } from '../graphCanvas/canvasConfig';

import { DomIds } from '../../toolDataMapping/DataMapping';

const Sizes = {
    DefaultDataMappingPanelCanvasHeight: 400,
    DefaultDataMappingPanelExtraHeight: 100,
    SourceDataWidth: 620,
    SourceMarginRight: 0,
    CanvasMarginBottom: 20
}

const pxVal = (px) => typeof(px) === 'string' ? parseInt(px.replace(/px$/,'')) : px;

export default class DataMappingBlock extends Component {

    GraphDocType = 'DataMapping';

    loading = false;
    dataChangeTimer = null;
    retryTimer = null;

    getDataProvider = () => this.props.getDataProvider();
    getCanvasConfig = () => this.props.canvasConfig;
    getDataModel = () => this.state.selectedDataModel;

    canvasCallback = (callbackMessage) => {
        console.log(callbackMessage);
        var { editHelper } = this.state;
        var { parentContainer } = this.props;

        if (callbackMessage) {
            switch (callbackMessage.message) {
                case CANVAS_MESSAGES.EDIT_REQUESTED:
                    if (this.modalVariableLabelAndTypesRef.current) {
                        editHelper.setPrimaryPropertyContainer(callbackMessage.propertyContainer);
                        var dataItem = editHelper.getDataItem();
                        this.modalVariableLabelAndTypesRef.current.open(
                            callbackMessage.canvasDimensions,
                            callbackMessage.popupPosition, 
                            callbackMessage.expectedTextLength,
                            dataItem                            
                        );
                    }
                    break;
                case CONTAINER_CALLBACK_MESSAGES.PROMPT_USER:
                    console.log("canvasCallback callbackMessage: ", callbackMessage);
                    parentContainer.showGeneralDialog(callbackMessage.title, callbackMessage.description, [
                        {
                            text: 'Yes',
                            onClick: (button, index) => {
                                callbackMessage.yesAction();
                                parentContainer.closeGeneralDialog();
                            },
                            autofocus: false
                        },
                        {
                            text: 'No',
                            onClick: (button, index) => parentContainer.closeGeneralDialog(),
                            autofocus: true
                        }]
                    );
                    break;
                default:
                    alert(`Unhandled message in canvasCallback '${callbackMessage.message}' (see console)`);
                    console.log("canvasCallback callbackMessage: ", callbackMessage);
            }
        }
    }

    constructor (props) {
        super(props);
        //props.setSureRef(this);
        this.canvasRef = React.createRef();
        this.dataModelRef = React.createRef();
        this.nodeLabelChipsRef = React.createRef();
        this.whereClauseRef = React.createRef();
        this.modalChipsRef = React.createRef();
        this.cypherEditorRef = React.createRef();
        this.modalVariableLabelAndTypesRef = React.createRef();

        if (this.props.canvasConfig) {
            this.props.canvasConfig.setContainerCallback(this.canvasCallback);
        }
        //var testCypherPattern = getCypherPattern(this.variableScope);
        //this.dataProvider.setCypherPattern(testCypherPattern);

    }

    state = {
        cypherInput: '',
        activeKey: '',
        status: '',
        canvasHeight: Sizes.DefaultDataMappingPanelCanvasHeight,
        selectedDataModel: null,
        activityIndicator: false,
        editHelper: new GraphCanvasEditHelper(),
        availableMappingDestinations: []
    }

    reset = () => {
        this.setState({
            cypherInput: '',
            activeKey: '',
            status: '',
            canvasHeight: Sizes.DefaultDataMappingPanelCanvasHeight,
            selectedDataModel: null,
            activityIndicator: false,
            editHelper: new GraphCanvasEditHelper(),
            availableMappingDestinations: []
        })
    }

    doWhen = (doWhat, whenCondition, description, params) => {
        var { maxTries, timeBetweenTries } = params || {};
        maxTries = (maxTries !== undefined) ? maxTries : 20;
        timeBetweenTries = (timeBetweenTries !== undefined ) ? timeBetweenTries : 100;
        var tryNumber = 1;

        const doThis = () => {
            if (whenCondition()) {
                //console.log(`when condition satisfied, calling doWhat re: $${description}`);
                doWhat();
            } else {
                tryNumber++;
                //console.log(`doWhen tryNumber ${tryNumber} re: ${description}`);
                if (tryNumber <= maxTries) {
                    //console.log(`calling setTimeout re: $${description}`);
                    setTimeout(doThis, timeBetweenTries);    
                } else {
                    console.log(`Error: DataMappingBlock doWhen timed out re: ${description}`);
                }
            }
        }
        doThis();
    }

    componentDidMount () {
        const { canvasConfig, getDataProvider, getViewSettings, dataModel, dataModelKey } = this.props;

        this.doWhen(
            () => {
                const graphCanvas = this.getGraphCanvas();
                //console.log('doWhen canvasConfig.setGraphCanvas graphCanvas = ', graphCanvas);
                canvasConfig.setGraphCanvas(graphCanvas)
            }, 
            () => this.getGraphCanvas(),
            "componentDidMount canvasConfig.setGraphCanvas(graphCanvas)"
        );

        this.doWhen(
            () => this.loadData(getViewSettings, getDataProvider, dataModel, dataModelKey),
            () => this.getGraphCanvas(),
            "componentDidMount loadData"
        )
    }

    refreshAvailableMappingDestinations = (cypherPattern) => {
        //console.log('DataMappingBlock refreshAvailableMappingDestinations: ', cypherPattern);

        const { selectedDataModel } = this.state;
        if (!selectedDataModel) {
            //alert('A data model must be selected', ALERT_TYPES.WARNING);
            return;
        }
        /* availableDestination looks like: 
            {
                key
                propertyDefinition
                nodePattern (optional)
                nodeRelNodePattern (optional)
        */

        var availableMappingDestinations = {};
	    // for each NodePattern
        cypherPattern.getAllNodePatterns().map(nodePattern => {
            const nodeLabelStrings = nodePattern.nodeLabels || [];
            // find the associated NodeLabel in the data model 
            nodeLabelStrings.map(nodeLabelString => {
                var nodeLabel = selectedDataModel.getNodeLabelByLabel(nodeLabelString);
                var propertyDefinitions = (nodeLabel && nodeLabel.properties) ? nodeLabel.properties : {};
                // add all properties
                Object.values(propertyDefinitions).map(propertyDefinition => {
                    var key = `np_${nodePattern.key}_${propertyDefinition.key}`;
                    availableMappingDestinations[key] = {
                        key, propertyDefinition, nodePattern, nodeLabel
                    };
                });
            });
        });

	    // for each RelationshipPattern (nodePattern-relationshipPattern->nodePattern)
        cypherPattern.getAllNodeRelNodePatterns().map(nodeRelNodePattern => {
            const startNodeLabelStrings = nodeRelNodePattern.startNodePattern.nodeLabels || [];
            const endNodeLabelStrings = nodeRelNodePattern.endNodePattern.nodeLabels || [];            
            var relationshipTypeString = nodeRelNodePattern.relationshipPattern.types[0] || '';
            // find the associated RelationshipType in the data model 
            startNodeLabelStrings.map(startNodeLabelString => {
                endNodeLabelStrings.map(endNodeLabelString => {
                    var relationshipType = selectedDataModel.getRelationshipType(relationshipTypeString, startNodeLabelString, endNodeLabelString);
                    var propertyDefinitions = (relationshipType && relationshipType.properties) ? relationshipType.properties : {};
                    // add all properties
                    Object.values(propertyDefinitions).map(propertyDefinition => {
                        var key = `rt_${nodeRelNodePattern.relationshipPattern.key}_${propertyDefinition.key}`;
                        availableMappingDestinations[key] = {
                            key, propertyDefinition, nodeRelNodePattern, relationshipType
                        }
                    });
                });
            });
        });

        var availableMappingDestinationsArray = Object.values(availableMappingDestinations);
        // populate the availableMappingDestinations	    
        this.setState({ availableMappingDestinations: availableMappingDestinationsArray});

        var { parentContainer } = this.props;
        if (parentContainer.setAvailableMappingDestinations) {
            parentContainer.setAvailableMappingDestinations(availableMappingDestinationsArray);
        }

    }

    getGraphCanvas = () => (this.canvasRef && this.canvasRef.current) ? this.canvasRef.current.getGraphCanvas() : null;

    viewChanged = (changeType, changeObj) => this.props.dataChangeListener("viewChanged", changeType, changeObj);

    setDataMappingDataProvider (dataProvider) {
        const { editHelper } = this.state;
        editHelper.setDataProvider(dataProvider);
        if (this.canvasRef.current) {
            this.canvasRef.current.setDataProvider(dataProvider);
        }
    }

    handleViewSettings = (canvasViewSettings, graphCanvas, canvasRef) => {
        graphCanvas.setViewSettings(canvasViewSettings);
        if (canvasViewSettings.scaleFactor && canvasViewSettings.scaleFactor != 1) {
            var scaleFactor = 100 * canvasViewSettings.scaleFactor;
            var howMuch = Math.round(Math.abs(100 - scaleFactor));
            if (scaleFactor > 100) {
                canvasRef.current.zoomIn(howMuch);
            } else {
                canvasRef.current.zoomOut(howMuch);
            }
        }
    }

    updateDataProvider = () => {
        const { getDataProvider } = this.props;        
        const dataProvider = getDataProvider();
        this.setDataMappingDataProvider(dataProvider);
    }

    getViewSettings = () => {
        return this.getGraphCanvas().getViewSettings();
    }

    loadData = (getViewSettings, getDataProvider, dataModel, dataModelKey) => {
        this.canvasRef.current.resetCanvas();
        const dataProvider = getDataProvider();
        this.setDataMappingDataProvider(dataProvider);

        var viewSettings = (getViewSettings) ? getViewSettings() : {};
        var canvasViewSettings = (viewSettings.canvasViewSettings) ? viewSettings.canvasViewSettings : {};

        this.handleCanvasViewSettings(canvasViewSettings);

        if (dataModel && dataModelKey) {
            this.handleDataModel(dataModel, dataModelKey);
        }
    }

    handleCanvasViewSettings = (canvasViewSettings) => {
        this.handleViewSettings(canvasViewSettings, this.getGraphCanvas(), this.canvasRef);
        this.getGraphCanvas().bringAllNodesToTop();
    }

    handleUserSettings = (userSettings) => {
        if (userSettings && userSettings.canvasSettings) {
            var { canvasSettings } = userSettings;
            console.log('handleUserSettings canvasSettings');
            console.log(canvasSettings);
            var maxTries = 5;
            var tryNum = 1;

            var applySettings = () => {
                var graphCanvas = this.getGraphCanvas();
                if (graphCanvas !== null) {
                    // TODO: uncomment and implement below
                    /*
                    graphCanvas.setSnapToGrid(canvasSettings.snapToGrid);
                    graphCanvas.setDisplayAnnotations(canvasSettings.displayAnnotations);
                    graphCanvas.setRelationshipDisplay(canvasSettings.relationshipDisplay);
                    if (canvasSettings.showGrid) {
                        //console.log('showGrid');
                        graphCanvas.showGrid();
                    } else {
                        //console.log('hideGrid');
                        graphCanvas.hideGrid();
                    }
                    */
                } else {
                    // waiting for getGraphCanvas() to not be null
                    if (tryNum <= maxTries) {
                        tryNum++;
                        setTimeout(applySettings, 150);
                    }
                }
            }
            applySettings();
        }
    }

    /*
    handleLockedCypherBuilder = (errorStr, actions) => {
        var matches = errorStr.match(/locked by user '(.+)' at (.+)/);
        var description = `${TOOL_HUMAN_NAME} is locked`;
        if (matches[1] && matches[2]) {
            description = `${TOOL_HUMAN_NAME} was locked by ${matches[1]} at ${new Date(parseInt(matches[2])).toLocaleString()}.
                Your version may be out of date. Please consider reloading before editing. What would you like to do?`
        }
        this.showGeneralDialog(`${TOOL_HUMAN_NAME} is Locked`, description, actions);
    }
    */

    recordMetadataChanges = (key, value) => {
        var { editMetadata } = this.state;
        this.setState({
            editMetadata: {
                ...editMetadata,
                [key]: value
            }
        })
    }

    addNewNodePattern = () => {
        /*
        - add to dataProvider
        - ensure graphData and graphDataView updated
        - ensure canvas shows it
        - ensure that it is saved to the backend
        */
        if (SecurityRole.canEdit(true)) {
            this.getGraphCanvas().createNewNode();
        }
    }

    /*
    clearDataModel = () => {
        //this.dataProvider.setDataModelKey(null);                    
        this.setState({
            selectedDataModel: null
        });

        if (this.dataModelRef.current) {
            this.dataModelRef.current.resetCanvas();
        }
        this.state.editHelper.setDataModel(null);

        var data = {
            key: null,
            dataItems: []
        }
        if (this.nodeLabelChipsRef.current) {
            this.nodeLabelChipsRef.current.setData(data);
        }
    }*/

    handleDataModel = (dataModel, dataModelKey, callback) => {
        //this.getDataProvider().setDataModelKey(dataModelKey);                    
        this.setState({
            selectedDataModel: dataModel
        }, () => {
            this.state.editHelper.setDataModel(dataModel);
            this.buildAndSetDataModelChips(dataModel, dataModelKey);
            const { getDataProvider } = this.props;
            this.refreshAvailableMappingDestinations(getDataProvider().getCypherPattern());
            if (callback) {
                callback();
            }
        });
    }

    buildAndSetDataModelChips = (dataModel, dataModelKey) => {
        if (this.nodeLabelChipsRef.current) {
            var nodeLabels = dataModel.getNodeLabelArray();
            nodeLabels.sort((a,b) => (a.label === b.label) ? 0 : (a.label > b.label) ? 1 : -1);
            var dataItems = nodeLabels.map(nodeLabel => {
                return {
                    key: nodeLabel.key,
                    nodeLabel: nodeLabel,
                    getText: () => nodeLabel.getText(), 
                    getFontColor: () => nodeLabel.display.fontColor,
                    getColor: () => nodeLabel.display.color,
                    matches: (searchText) => {
                        if (searchText) {
                            return nodeLabel.getText().toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                        } else {
                            return true;
                        }
                    }
                }
            });
    
            var data = {
                key: dataModelKey,
                dataItems: dataItems
            }
    
            this.nodeLabelChipsRef.current.setData(data);
        }
    }

    sortByProperty = (property) => (a,b) => (a[property] === b[property]) ? 0 : (a[property] > b[property]) ? 1 : -1

    requestRelationshipPopup = (properties, callback) => {
        if (this.modalChipsRef.current) {

            var { startNode, endNode, canvasDimensions, coords } = properties;

            var dataModel = this.state.selectedDataModel;

            var startNodeLabelStrings = startNode.getPropertyValueByKey("nodeLabels");
            var startNodeLabelString = (startNodeLabelStrings && startNodeLabelStrings.length > 0) ? startNodeLabelStrings[0] : '';            

            var outboundRelationships = [];
            var inboundRelationships = [];
            if (dataModel) {
                var startNodeLabels = dataModel.getNodeLabelsByLabel(startNodeLabelString);
                if (startNodeLabels && startNodeLabels.length > 0) {
                    startNodeLabels.map(startNodeLabel => {
                        var rels = dataModel.getRelationshipTypesForNodeLabelByKey(startNodeLabel.key);
                        if (rels && rels.map) {
                            rels.map(rel => {
                                if (!outboundRelationships.includes(rel)) {
                                    outboundRelationships.push(rel);
                                }
                            })
                        }
                    })
                    outboundRelationships.sort(this.sortByProperty('type'));
    
                    outboundRelationships = outboundRelationships
                        // because the function above returns both inbound and outbound, we want outbound
                        .filter(x => startNodeLabels.includes(x.startNodeLabel))   
                        // to reduce the number of relationship, ignore those where the destination is a secondary node label 
                        //.filter(x => !x.endNodeLabel.isOnlySecondaryNodeLabel);

                    if (endNode) {
                        var endNodeLabelStrings = endNode.getPropertyValueByKey("nodeLabels");
                        var endNodeLabelString = (endNodeLabelStrings && endNodeLabelStrings.length > 0) ? endNodeLabelStrings[0] : '';            
                        var endNodeLabels = dataModel.getNodeLabelsByLabel(endNodeLabelString);
                        if (endNodeLabels && endNodeLabels.length > 0) {
                            outboundRelationships = outboundRelationships.filter(x => endNodeLabels.includes(x.endNodeLabel));
                        
                            endNodeLabels.map(endNodeLabel => {
                                var rels = dataModel.getRelationshipTypesForNodeLabelByKey(endNodeLabel.key)
                                    .filter(x => endNodeLabels.includes(x.startNodeLabel) && startNodeLabels.includes(x.endNodeLabel))
                                if (rels && rels.map) {
                                    rels.map(rel => {
                                        if (!inboundRelationships.includes(rel)) {
                                            inboundRelationships.push(rel);
                                        }
                                    })
                                }
                            })
                            inboundRelationships.sort(this.sortByProperty('type'));
                        }
                    }
                }
            }

            var outboundRelationshipsWithDirection = outboundRelationships.map(x => ({
                direction: RELATIONSHIP_DIRECTION.RIGHT,
                relationshipType: x
            }));

            var inboundRelationshipsWithDirection = inboundRelationships.map(x => ({
                direction: RELATIONSHIP_DIRECTION.LEFT,
                relationshipType: x
            }))

            var allRelationships = outboundRelationshipsWithDirection.concat(inboundRelationshipsWithDirection);

            if (allRelationships.length === 0) {
                callback(null);
            } else if (allRelationships.length === 1) {
                callback(allRelationships[0]);
            } else {
                allRelationships.unshift({
                    direction: RELATIONSHIP_DIRECTION.RIGHT,
                    relationshipType: null
                });
                const getText = (relationshipTypeObj) => () => {
                    const { relationshipType, direction } = relationshipTypeObj;                    
                    if (relationshipType) {
                        var text = relationshipType.getText();
                        text = (text) ? text : '';
                        text = (direction === RELATIONSHIP_DIRECTION.RIGHT) 
                            ? `(me)-[${text}]->(${relationshipType.endNodeLabel.label})`
                            : `(me)<-[${text}]-(${relationshipType.startNodeLabel.label})`
                        return text; 
                    } else {
                        return `(me)-[<empty>]->()`;
                    }
                }

                var dataItems = allRelationships.map(relationshipTypeObj => {

                    const { relationshipType, direction } = relationshipTypeObj;
                    const relText = getText(relationshipTypeObj);                    

                    return {
                        key: (relationshipType) ? relationshipType.key : '_blank_',
                        relationshipType: relationshipType,
                        relationshipDirection: direction,
                        clickCallback: callback,
                        getText: () => relText(), 
                        getFontColor: () => 'black',
                        getColor: () => 'white',
                        matches: (searchText) => {
                            if (searchText) {
                                return relText().toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                            } else {
                                return true;
                            }
                        }
                    }
                });

                var data = {
                    key: startNode.key,
                    dataItems: dataItems
                }

                var expectedTextLength = dataItems.reduce((acc, item) => acc + item.getText(), "").length;
                if (expectedTextLength > 550) {
                    expectedTextLength = 550;
                }

                //coords.x += 200;
                //coords.y += 125;
                
                this.modalChipsRef.current.open(canvasDimensions, coords, expectedTextLength, data);
            }
        }
    }

    nodeLabelChipClick = (chip) => {
        //console.log("chip: ", chip);

        if (SecurityRole.canEdit(true)) {
            var displayProperties = { ...chip.data.nodeLabel.display };
            displayProperties.x = 0;
            displayProperties.y = 0;
            var newNode = this.getDataProvider()
                        .createNewNodeFromNodeLabel(chip.data.nodeLabel.label, displayProperties);
            if (newNode) {
                this.getDataProvider().addNode(newNode);
                this.getGraphCanvas().addNewNodeAndRender(newNode);
            }
        }
    }

    // as opposed to addNodePatternFromDataModel this one accepts a nodeLabel directly from an in memory data model
    addNodePatternFromDataModelEx = (nodeLabel, deferRender) => {
        if (SecurityRole.canEdit(true)) {
            var displayProperties = { ...nodeLabel.display };
            displayProperties.x = 0;
            displayProperties.y = 0;
            var newNode = this.getDataProvider()
                        .createNewNodeFromNodeLabel(nodeLabel.label, displayProperties);
            if (newNode) {
                this.getDataProvider().addNode(newNode);
                if (deferRender) {
                    this.getGraphCanvas().setNodePosition(newNode, nodeLabel.display.x, nodeLabel.display.y);
                } else {
                    this.getGraphCanvas().setNewNodePositionInternal(newNode);
                    this.finishAddingNodes(newNode);
                }
                return newNode;
            }
        }
        return null;
    }

    finishAddingNodes = (lastNodeAdded) => {
        const graphCanvas = this.getGraphCanvas();
        graphCanvas.render();
        if (lastNodeAdded) {
            graphCanvas.focusNewNode(lastNodeAdded);
        }
    }

    // to add a relationship from an in memory data model after the nodes have been added via addNodePatternFromDataModelEx
    addRelationshipPatternFromDataModel = (relationshipTypeString, displayStartNode, displayEndNode, deferRender) => {
        this.getGraphCanvas().addRelationship(relationshipTypeString, displayStartNode, displayEndNode, deferRender);
    }

    // as opposed to addNodePatternFromDataModelEx this one accepts a dataModelDisplayNode from a data model displayed inside of a graphCanvas (I think)
    addNodePatternFromDataModel = (dataModelDisplayNode) => {
        if (SecurityRole.canEdit(true)) {
            var node = dataModelDisplayNode.getNode();
            var newDisplayNode = this.getDataProvider()
                        .createNewNodeFromNodeLabel(node.primaryNodeLabel, dataModelDisplayNode);
            if (newDisplayNode) {
                this.getDataProvider().addNode(newDisplayNode);
                this.getGraphCanvas().addNewNodeAndRender(newDisplayNode);
                return newDisplayNode;
            }
        }
        return null;
    }

    // this is added from the a data model display inside of a graphCanvas (I think)
    addNodeRelNodePatternFromDataModel = (dataModelDisplayStartNode, relationshipTypeArray, dataModelDisplayEndNode, deferRender) => {
        if (SecurityRole.canEdit(true)) {
            // find the start and ends nodes first
            var dataModelStartNode = dataModelDisplayStartNode.getNode();
            var dataModelEndNode = dataModelDisplayEndNode.getNode();
            var relationshipType = (relationshipTypeArray && relationshipTypeArray.length > 0) ? relationshipTypeArray[0] : null;
            var relationshipTypeString = (relationshipType) ? relationshipType.type : "";

            var cypherPattern = this.getDataProvider().getCypherPattern();
            var allStartNodeTriples = cypherPattern.findAllNodePatternTriples({nodeLabels: [dataModelStartNode.primaryNodeLabel]});
            var allEndNodeTriples = cypherPattern.findAllNodePatternTriples({nodeLabels: [dataModelEndNode.primaryNodeLabel]});

            var startNode = null;
            var endNode = null;

            // if no start node, add it
            if (allStartNodeTriples.length === 0) {
                startNode = this.addNodePatternFromDataModel(dataModelDisplayStartNode);
            } else {
                // TODO: pick the best one (e.g. are any of them selected?, do any of them already have the relationship being added?)                
                for (var i = 0; i < allStartNodeTriples.length; i++) {
                    var triple = allStartNodeTriples[i];
                    if (triple.startNodePattern && triple.startNodePattern.nodeLabels.includes(dataModelStartNode.primaryNodeLabel)) {
                        startNode = triple.startNodePattern.displayNode;
                        break;
                    } else if (triple.endNodePattern && triple.endNodePattern.nodeLabels.includes(dataModelStartNode.primaryNodeLabel)) {
                        startNode = triple.endNodePattern.displayNode;
                        break;
                    }
                }
            }

            // if no end node, add it
            if (allEndNodeTriples.length === 0) {
                endNode = this.addNodePatternFromDataModel(dataModelDisplayEndNode);
            } else {
                // TODO: pick the best one (e.g. are any of them selected?, do any of them already have the relationship being added?)                
                for (var i = 0; i < allEndNodeTriples.length; i++) {
                    var triple = allEndNodeTriples[i];
                    if (triple.startNodePattern && triple.startNodePattern.nodeLabels.includes(dataModelEndNode.primaryNodeLabel)) {
                        endNode = triple.startNodePattern.displayNode;
                        break;
                    } else if (triple.endNodePattern && triple.endNodePattern.nodeLabels.includes(dataModelEndNode.primaryNodeLabel)) {
                        endNode = triple.endNodePattern.displayNode;
                        break;
                    }
                }
                if (startNode && endNode && startNode.key === endNode.key) {
                    // because adding self-connected relationships can add 
                    //   a node pattern back to itself which is most likely un-intended
                    endNode = this.addNodePatternFromDataModel(dataModelDisplayEndNode);
                }
            }

            if (startNode && endNode) {
                this.getGraphCanvas().addRelationship(relationshipTypeString, startNode, endNode, deferRender);
            }
        }
    }

    relationshipTypeChipClick = (chip) => {
        //console.log("chip: ", chip);

        if (SecurityRole.canEdit(true)) {
            if (this.modalChipsRef.current) {
                this.modalChipsRef.current.close();            
            }
            chip.data.clickCallback({ 
                relationshipType: chip.data.relationshipType, 
                direction: chip.data.relationshipDirection 
            });
        }
    }

    heightDiff = 0;
    resizeGraphCanvasStart = (size) => {
        var currentSize = this.canvasRef.current.getCurrentDimensions();
        this.heightDiff = size.height - currentSize.height;
    }

    resizeGraphCanvas = (size) => {
        /*
            size = {
                width: 100,
                height: 100
            }
        */
        if (this.canvasRef.current) {
            var newHeight = size.height - this.heightDiff;
            this.setState({
                canvasHeight: newHeight
            }, () => {
                const { cypherBlockKey } = this.props;                
                this.viewChanged(GraphDocChangeType.PanelResize, {
                    cypherBlockKey: cypherBlockKey,
                    canvasHeight: newHeight
                });
            })
            console.log('size.width: ', size.width);
            this.canvasRef.current.updateDimensions({
                width: size.width,
                height: newHeight
            });
        }
    }

    resizePanelsOnLoad = () => {
        this.doWhen(
            () => {
                //var boundingRect = this.canvasRef.current.getBoundingClientRect();    
                this.canvasRef.current.updateDimensions({
                    width: this.getCanvasWidth(),
                    height: this.getCanvasHeight()
                });
            },
            () => this.canvasRef.current,
            "Data Mapping Block Resize panels"
        )        
    }

    getCanvasWidth = () => {
        const { widthPercent } = this.props;
        var toolRect = document.getElementById(DomIds.DataMapping).getBoundingClientRect();
        var canvasWidth = toolRect.width * widthPercent/100;
        canvasWidth = (canvasWidth < 200) ? 200 : canvasWidth;
        return canvasWidth;
    }

    getCanvasHeight = () => {
        const { blockId } = this.props;
        var canvasRect = document.getElementById(blockId).getBoundingClientRect();
        var canvasHeight = window.innerHeight - canvasRect.y - Sizes.CanvasMarginBottom;
        canvasHeight = (canvasHeight < 100) ? 100 : canvasHeight;
        return canvasHeight;
    }

    render() {
        var { 
            selectedDataModel,
            canvasHeight,
            editHelper,
            availableMappingDestinations
        } = this.state;

        const { blockId, showDataSourceArea } = this.props;

        return (
            <>
                <div style={{display:'flex'}}>
                    {(showDataSourceArea) &&
                        <div style={{border: '1px dashed lightgray', 
                            width: `${Sizes.SourceDataWidth}px`, marginRight: `${Sizes.SourceMarginRight}px`}}>
                            <DataSource 
                                dataModel={selectedDataModel}
                                getDataProvider={this.props.getDataProvider}
                                availableMappingDestinations={availableMappingDestinations}
                            />
                        </div>
                    }
                    <div>
                        <div style={{display:'flex'}}>
                            <OutlinedStyledButton onClick={this.addNewNodePattern} style={{height:'2em', minWidth: '12em'}} color="primary">
                                <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> Node Pattern
                            </OutlinedStyledButton>

                            {selectedDataModel && 
                            <div style={{marginTop: '-1em'}}>
                                <SearchableChips ref={this.nodeLabelChipsRef} 
                                    additionalStyle={{
                                        marginTop: '1em', 
                                        marginRight: '5px',
                                        height: '2.5em',
                                        overflowY: 'scroll'
                                    }}
                                    displaySearch={true}
                                    onChipClick={this.nodeLabelChipClick}/>
                            </div>
                            }
                        </div>
                        <div>
                            <GraphCanvasControl ref={this.canvasRef} 
                                key={blockId}
                                id={blockId}
                                domId={blockId}
                                dataProvider={this.getDataProvider()}
                                canvasConfig={this.getCanvasConfig()}
                                containerCallback={this.canvasCallback}
                                widthOffset={0}
                                getWidth={this.getCanvasWidth}
                                getHeight={this.getCanvasHeight}
                            />
                        </div>
                    </div>
                </div>
                <ModalChips 
                    ref={this.modalChipsRef}
                    displaySearch={false}
                    onChipClick={this.relationshipTypeChipClick}/>
                <ModalVariableLabelsAndTypes 
                    ref={this.modalVariableLabelAndTypesRef}
                    displayVariable={true}
                    editFirstChip={false}
                    editHelper={editHelper}/>
            </>
      )
    }
}
