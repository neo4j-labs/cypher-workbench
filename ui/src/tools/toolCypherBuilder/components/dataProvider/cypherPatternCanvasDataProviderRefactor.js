
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';

import { RELATIONSHIP_DISPLAY } from '../../../common/toolConstants';
import { SyncedGraphDataAndView } from '../../../../dataModel/syncedGraphDataAndView';

import { 
    Pattern,
    NodePattern, 
    RelationshipPattern, 
    RELATIONSHIP_DIRECTION
} from '../../../../dataModel/cypherPattern';

import Timer from '../../../../common/util/timerUtil';
import BlockUpdateType from './blockUpdateTypes';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';
import SecurityRole from '../../../common/SecurityRole';

const NEW_NODE_VARIABLE_SCOPE_LABEL = 'Node';

const LOCAL_STORAGE_KEY = 'localCypherBuilder';
//const REMOTE_GRAPH_DOC_TYPE = 'CypherBuilder';
const REMOTE_GRAPH_DOC_TYPE = 'CypherPattern';

const SubgraphNodeLabels = {
    //CypherBuilder: "CypherBuilder",
    CypherPattern: "CypherPattern",
    NodePattern: "NodePattern",
    RelationshipPattern: "RelationshipPattern",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    HAS_NODE_PATTERN: {
        name: "HAS_NODE_PATTERN",
        nodes: [{
            //startNode: SubgraphNodeLabels.CypherBuilder,
            startNode: SubgraphNodeLabels.CypherPattern,
            endNode: SubgraphNodeLabels.NodePattern
        }]
    },
    RELATIONSHIP_PATTERN: {
        name: "RELATIONSHIP_PATTERN",
        nodes: [{
            startNode: SubgraphNodeLabels.NodePattern,
            endNode: SubgraphNodeLabels.NodePattern
        }]
    }
};

const SUBGRAPH_MODEL = { 
    //primaryNodeLabel: SubgraphNodeLabels.CypherBuilder, 
    primaryNodeLabel: SubgraphNodeLabels.CypherPattern, 
    subgraphConfig_labelFilter: 
        // produces +NodePattern|etc using constants
        Object.keys(SubgraphNodeLabels).map(node => `+${node}`).join('|')
    ,
    subgraphConfig_relationshipFilter: 
        // produces HAS_NODE_PATTERN>|etc using constants
        Object.keys(SubgraphRelationshipTypes).map(relationship => `${relationship}>`).join('|')
    , 
    keyConfig: [
        {nodeLabel: NodeLabels.GraphDoc, propertyKeys: ["key"]},
        //{nodeLabel: SubgraphNodeLabels.CypherBuilder, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherPattern, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.NodePattern, propertyKeys: ["key"]},
        {relationshipType: SubgraphRelationshipTypes.RELATIONSHIP_PATTERN.name, propertyKeys: ["key"]}
    ] 
}    

export class CypherPatternCanvasDataProvider {

    graphNodeKeyToNodePatternMap = {};
    graphRelationshipKeyToRelationshipPatternMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            cypherKeyword,
            cypherPattern,
            cypherBlockKey,
            cypherBuilder,
            cypherPatternBlockRef,   
            cypherBlockDataProvider
        } = properties;

        this.cypherKeyword = cypherKeyword;
        this.cypherPattern = (cypherPattern) ? cypherPattern : new Pattern({ 
            key: id
        });
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.cypherPatternBlockRef = cypherPatternBlockRef;
        this.cypherBlockDataProvider = cypherBlockDataProvider;

        this.syncedGraphDataAndView = new SyncedGraphDataAndView({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });

        this.id = id;

        this.buildSyncedData();
    }

    /*
    getTestReturnItems = () => {
        return [
            returnItem('foo'),
            returnItem('bar'),
            returnItem('baz')
        ]
    }*/

    data = () => this.syncedGraphDataAndView;
    
    getParentBlock = () => {
        const current = this.cypherPatternBlockRef.current;
        if (current) {
            return current;
        } else {
            alert('Could not get parent component reference. Please try again or reload the page.');
        }
    };

    setVariableScope = (variableScope) => {
        this.variableScope = variableScope;
        this.cypherPattern.setVariableScope(variableScope);
    }
    getVariableScope = () => this.variableScope;

    getCypherPattern = () => this.cypherPattern;

    getDebugCypherSnippets = () => {
        return this.getCypherPattern().getDebugCypherSnippets().map(snippet => `MATCH ${snippet}`);
    }

    getDataModel = () => this.cypherBuilder.getDataModel();

    getSubgraphModel = () => SUBGRAPH_MODEL;
    getRemoteGraphDocType = () => REMOTE_GRAPH_DOC_TYPE;
    getLocalStorageKey = () => LOCAL_STORAGE_KEY;

    dataChanged = (dataChangeType, details) => 
        this.syncedGraphDataAndView.dataChanged(dataChangeType, details);

    setDataModelKey = (dataModelKey) => {
        var rootNode = this.syncedGraphDataAndView.getGraphData().getGraphRootNode();
        rootNode.addOrUpdateProperty("dataModelKey", dataModelKey, DataTypes.String);
    }

    getDataModelKey = () => {
        var rootNode = this.syncedGraphDataAndView.getGraphData().getGraphRootNode();
        return rootNode.getPropertyValueByKey("dataModelKey");
    }

    fromSaveObject = ({graphDocObj, deserializedSyncedGraphDataAndView, keepDataChangeFlags}) => {
        if (deserializedSyncedGraphDataAndView) {
            this.cypherBlockDataProvider.removeListenerBeforeDeserialize(this);
            this.syncedGraphDataAndView = deserializedSyncedGraphDataAndView;
            this.cypherBlockDataProvider.addListenerAfterDeserialize(this);            
        } else {
            this.syncedGraphDataAndView.fromSaveObject(graphDocObj.graphDoc, 
                graphDocObj.graphDocView, keepDataChangeFlags);
        }

        //console.log('graphDocObj.key: ', (graphDocObj) ? graphDocObj.key : '');
        //console.log('this.syncedGraphDataAndView.graphData.graphRootNode.key', this.syncedGraphDataAndView.graphData.graphRootNode.key);
        this.cypherPattern = new Pattern({ 
            //key: graphDocObj.key,
            key: this.syncedGraphDataAndView.graphData.graphRootNode.key,
            variableScope: this.variableScope
        });        

        var graphData = this.syncedGraphDataAndView.getGraphDataView();
        graphData.getNodeArray()
            //.sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1)
            .filter(displayNode => displayNode.getNode().labels.includes(SubgraphNodeLabels.NodePattern))
            .map(displayNode => {
                var node = displayNode.getNode();
                var variable = node.getPropertyValueByKey('variable');
                var nodePattern = new NodePattern({
                    key: node.key,
                    variable: variable,
                    nodeLabels: node.getPropertyValueByKey('nodeLabels'),
                    // TODO: propertyMap
                    variableScope: this.variableScope,
                    displayNode: displayNode
                });
                this.cypherPattern.addNodePatternPart(nodePattern, this.variableScope);
                this.addToNodeMap(nodePattern, node);
            });

        graphData.getRelationshipArray()
            //.sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1)
            .filter(displayRelationship => displayRelationship.getRelationship() && displayRelationship.getRelationship().type === SubgraphRelationshipTypes.RELATIONSHIP_PATTERN.name)
            .map(displayRelationship => {
                var relationship = displayRelationship.getRelationship();
                var variable = relationship.getPropertyValueByKey('variable');
                //console.log(relationship);
                var relationshipPattern = new RelationshipPattern({
                    //key: relationship.key,
                    key: relationship.getPropertyValueByKey('key'),
                    variable: variable,                    
                    types: relationship.getPropertyValueByKey('types'),
                    direction: relationship.getPropertyValueByKey('direction'),
                    // TODO: propertyMap
                    variableLength: relationship.getPropertyValueByKey('variableLength'),
                    variableLengthStart: relationship.getPropertyValueByKey('variableLengthStart'),
                    variableLengthEnd: relationship.getPropertyValueByKey('variableLengthEnd'),
                    variableScope: this.variableScope,
                    displayRelationship: displayRelationship
                });
                this.addToRelationshipMap(relationshipPattern, relationship);

                var startNodePattern = this.graphNodeKeyToNodePatternMap[relationship.getStartNode().key];
                var endNodePattern = this.graphNodeKeyToNodePatternMap[relationship.getEndNode().key];

                this.cypherPattern.addPatternElementChain(relationship.key, startNodePattern, relationshipPattern, endNodePattern, this.variableScope);
            });

        this.updateCurrentCypherAndPattern({
            updateType: BlockUpdateType.SaveObjectReloaded
        });
    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.syncedGraphDataAndView.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.syncedGraphDataAndView.getEventEmitter();
    getCypherPattern = () => this.cypherPattern;

    convertNodePatternToDisplayNode (syncedView, nodePattern, displayProperties) {
        var {
            key, nodeLabels, variable, propertyMap
        } = nodePattern;

        var displayNode = syncedView.createNode({
            key: key,
            primaryNodeLabel: SubgraphNodeLabels.NodePattern,
            labels: [SubgraphNodeLabels.NodePattern]
        }, displayProperties);

        var graphNode = displayNode.getNode();
        graphNode.addProperty('variable', variable);
        graphNode.addProperty('nodeLabels', nodeLabels, DataTypes.StringArray);
        Object.keys(propertyMap).map(key => {
            // TODO: get data type            
            graphNode.addProperty(`prop_${key}`, propertyMap[key], DataTypes.String);
        })
        nodePattern.setDisplayNode(displayNode);

        return displayNode;
    }

    convertRelationshipPatternToDisplayRelationship (syncedView, relationshipPattern, displayStartNode, displayEndNode) {
        var { 
            key, variable, direction, types, 
            propertyMap, variableLength, 
            variableLengthStart, variableLengthEnd 
        } = relationshipPattern;

        var displayRelationship = syncedView.createRelationship({
            key: key,
            type: SubgraphRelationshipTypes.RELATIONSHIP_PATTERN.name,
            startNode: displayStartNode.getNode(),
            endNode: displayEndNode.getNode()
        }, {
            //key: key,
            startDisplayNode: displayStartNode,
            endDisplayNode: displayEndNode
        });

        var relationship = displayRelationship.getRelationship();
        relationship.addProperty('key', displayRelationship.key)
        relationship.addProperty('variable', variable);
        Object.keys(propertyMap).map(key => {
            // TODO: get data type            
            relationship.addProperty(`prop_${key}`, propertyMap[key], DataTypes.String);
        })
        relationship.addProperty('direction', direction);
        relationship.addProperty('types', types, DataTypes.StringArray);
        relationship.addProperty('variableLengthStart', variableLengthStart, DataTypes.String);
        relationship.addProperty('variableLengthEnd', variableLengthEnd, DataTypes.String);
        relationshipPattern.setDisplayRelationship(displayRelationship);

        return displayRelationship;
    }

    buildSyncedData () {
        if (this.cypherPattern) {
            this.cypherPattern.patternParts
            .filter(patternPart => patternPart.getPathPattern())
            .map(patternPart => {
                var pathPattern = patternPart.getPathPattern();
                var nodePattern = pathPattern.nodePattern;
                var startNode = null;
                var endNode = null;

                if (nodePattern) {
                    startNode = this.convertNodePatternToDisplayNode(this.syncedGraphDataAndView, nodePattern);
                    this.addNode(startNode, true);
                }

                var patternElementChain = pathPattern.patternElementChain;
                if (patternElementChain) {
                    patternElementChain.map(chainPart => {
                        endNode = this.convertNodePatternToDisplayNode(this.syncedGraphDataAndView, chainPart.nodePattern)
                        this.addNode(endNode, true);

                        var relationshipPattern = chainPart.relationshipPattern;
                        switch (relationshipPattern) {
                            case RELATIONSHIP_DISPLAY.LEFT:
                                var temp = startNode;
                                startNode = endNode;
                                endNode = temp;
                                break;
                            case RELATIONSHIP_DISPLAY.RIGHT:
                                break;
                            case RELATIONSHIP_DISPLAY.NONE:
                                break;
                            default:
                                break;
                        }

                        var relationship = this.convertRelationshipPatternToDisplayRelationship(this.syncedGraphDataAndView, relationshipPattern, startNode, endNode);
                        this.addRelationship(relationship, true);
                        startNode = endNode;
                    })
                }
            })        
        }
    }

    setCypherPattern (cypherPattern) {
        this.cypherPattern = cypherPattern;
        this.buildSyncedData();
    }

    removeRelationshipsForNode (displayNodeKey, skipReRender) {
        var displayNode = this.syncedGraphDataAndView.getNodeByKey(displayNodeKey);
        if (displayNode) {
            var graphNode = displayNode.getNode();
            var nodePattern = this.graphNodeKeyToNodePatternMap[graphNode.key];
    
            var triples = this.cypherPattern.findAllNodePatternTriples({key: nodePattern.key});
            if (triples) {
                triples
                    .filter(triple => triple.relationshipPattern) // get rid of null relationshipPatterns
                    .map(triple => triple.relationshipPattern.displayRelationship)
                    .filter(displayRelationship => displayRelationship)
                    .map(displayRelationship => this.removeRelationship(displayRelationship.key, true))
            }
    
            if (!skipReRender) {
                this.reRenderAfterDelete({
                    updateType: BlockUpdateType.RelationshipPatternRemoved
                });
            }
        }
    }

    removeNode (displayNodeKey, skipReRender) {
        var displayNode = this.syncedGraphDataAndView.getNodeByKey(displayNodeKey);
        var parentBlock = this.getParentBlock();
        if (displayNode && parentBlock) {
            var graphNode = displayNode.getNode();

            // need to remove stuff from cypherPattern
            var nodePatternToRemove = this.graphNodeKeyToNodePatternMap[graphNode.key];
            if (nodePatternToRemove) {
                this.cypherPattern.removeNodePattern(nodePatternToRemove, this.variableScope);        
            }
    
            //this.whereClause.removeAssociatedWhereItems(nodePatternToRemove.key);
            //this.returnClause.removeAssociatedItems(nodePatternToRemove.key);
    
            //this.setWhereItems(this.whereClause.getWhereItems(), false, true);
            //this.setReturnItems(this.returnClause.getReturnItems(), false, true);
    
            // need to remove stuff from syncedGraphDataAndView
            this.syncedGraphDataAndView.removeNode(displayNode);
            
            parentBlock.getGraphCanvas().nodeRemoved(displayNode);    
    
            if (!skipReRender) {
                this.reRenderAfterDelete({
                    updateType: BlockUpdateType.NodePatternRemoved
                });
            }
        }
    }

    reRenderAfterDelete (args) {
        // need to ensure canvas is updated
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            parentBlock.getGraphCanvas().render();

            // need to ensure cypher is updated
            this.updateCurrentCypherAndPattern(args);
        }
    }    

    removeRelationship (displayRelationshipKey, skipReRender) {
        var displayRelationship = this.syncedGraphDataAndView.getRelationshipByKey(displayRelationshipKey);
        var parentBlock = this.getParentBlock();
        if (displayRelationship && parentBlock) {
            var graphRelationship = displayRelationship.getRelationship();

            // also need to remove stuff from cypherPattern
            var relationshipPatternToRemove = this.graphRelationshipKeyToRelationshipPatternMap[graphRelationship.key];
            if (relationshipPatternToRemove) {
                this.cypherPattern.removeRelationshipPattern(relationshipPatternToRemove, this.variableScope);        
            }
    
            //this.whereClause.removeAssociatedWhereItems(relationshipPatternToRemove.key);
            //this.returnClause.removeAssociatedItems(relationshipPatternToRemove.key);
    
            //this.setWhereItems(this.whereClause.getWhereItems(), false, true);
            //this.setReturnItems(this.returnClause.getReturnItems(), false, true);
    
            // need to remove stuff from syncedGraphDataAndView
            this.syncedGraphDataAndView.removeRelationship(displayRelationship);
            parentBlock.getGraphCanvas().relationshipRemoved(displayRelationship);

            if (!skipReRender) {
                this.reRenderAfterDelete({
                    updateType: BlockUpdateType.RelationshipPatternRemoved
                });
            }
        }
    }

    getConnectedRelationshipBetweenNodes = (node1, node2) => this.syncedGraphDataAndView.getConnectedRelationshipBetweenNodes(node1, node2);

    addRelationship (graphRelationship, dontNotify) {
        this.syncedGraphDataAndView.addRelationship(graphRelationship, dontNotify);
    }

    addNode = (displayNode, dontNotify) => {
        this.syncedGraphDataAndView.addNode(displayNode, dontNotify);    
        var graphNode = displayNode.getNode();

        // we need to add a relationship between the GraphDoc and the NodePattern
        //  but we only need to add it to the underlying graphData, not to the graphDataView
        var graphData = this.syncedGraphDataAndView.getGraphData();
        var graphRelationship = graphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_NODE_PATTERN.name,
            startNode: graphData.getGraphRootNode(),
            endNode: graphNode
        });
        graphData.addRelationship(graphRelationship, dontNotify);
    }

    reverseRelationship = (displayRelationship, skipReRender) => {
        var graphRelationship = displayRelationship.getRelationship();
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            var relationshipPattern = this.graphRelationshipKeyToRelationshipPatternMap[graphRelationship.key];
            if (relationshipPattern) {
                relationshipPattern.reverse();        
            }
    
            // this will trigger a save
            displayRelationship.reverseNodes();
    
            // this will re-render
            parentBlock.getGraphCanvas().reverseRelationship(displayRelationship);
    
            if (!skipReRender) {
                this.updateCurrentCypherAndPattern({
                    updateType: BlockUpdateType.ReverseRelationshipPattern
                });
            }
        }
    }

    getCanvasDimensions = (graphCanvas) => {
        return {
            x: 0,
            y: 0, 
            width: graphCanvas.getCanvasWidth() * 2,
            height: graphCanvas.getCanvasHeight() * 2
        }
    }

    getDocumentRect = () => {
        var boundingRect = document.body.getBoundingClientRect();
        return boundingRect
    }

    newRelationshipBetweenExistingNodes (properties) {
        /* properties
        {
            startNode: endNode,
            endNode: endNode,
            graphCanvas: this
        }        
        */
        var { startNode, startNodeCoords, endNode, endNodeCoords, graphCanvas } = properties;

        var canvasRect = graphCanvas.getCanvasRect();
        const canvasDimensions = this.getDocumentRect();
        const coords = {
            x: (startNodeCoords.x + endNodeCoords.x) / 2,
            y: (startNodeCoords.y + endNodeCoords.y) / 2
        }
        var parentBlock = this.getParentBlock();
        /*
        console.log(`startNode.x ${startNodeCoords.x}, startNode.y ${startNodeCoords.y}`);
        console.log(`endNode.x ${endNodeCoords.x}, endNode.y ${endNodeCoords.y}`);
        console.log('canvasDimensions (document rect): ', canvasDimensions);
        console.log('canvasRect: ', canvasRect);
        */

        if (parentBlock) {
            parentBlock.requestRelationshipPopup({
                startNode: startNode.getNode(),
                endNode: endNode.getNode(),
                //canvasDimensions: this.getCanvasDimensions(graphCanvas),            
                canvasDimensions: canvasDimensions,            
                coords: coords
            }, (relationshipTypeObj) => {
                var relationshipTypeString = '';
                var direction = RELATIONSHIP_DIRECTION.RIGHT;
    
                if (relationshipTypeObj) {
                    var relationshipType = relationshipTypeObj.relationshipType;
                    direction = relationshipTypeObj.direction;
                    //graphCanvas.connectNodes(connectorSourceId, connectorEndId);
                    relationshipTypeString = (relationshipType) ? relationshipType.type : "";
                }
                var startNodeToUse = (direction === RELATIONSHIP_DIRECTION.RIGHT) ? startNode : endNode;
                var endNodeToUse = (direction === RELATIONSHIP_DIRECTION.RIGHT) ? endNode : startNode;
                graphCanvas.addRelationship(relationshipTypeString, startNodeToUse, endNodeToUse);
            });
        }
    }

    newRelationshipToEmptyNode (properties) {
        /* properties
        {
            coords: coords, 
            startNode: startNode,
            graphCanvas: graphCanvas
        }        
        */
        var { coords, startNode, popupCoords, startNodeCoords, graphCanvas } = properties;
        var parentBlock = this.getParentBlock();
        console.log("coords: ", coords);
    
        if (parentBlock && SecurityRole.canEdit()) {
            parentBlock.requestRelationshipPopup({
                startNode: startNode.getNode(),
                //canvasDimensions: this.getCanvasDimensions(graphCanvas),            
                canvasDimensions: this.getDocumentRect(),
                coords: {
                    x: (startNodeCoords.x + popupCoords.x) / 2,
                    y: (startNodeCoords.y + popupCoords.y) / 2
                }
            }, (relationshipTypeObj) => {
                var relationshipType = (relationshipTypeObj) ? relationshipTypeObj.relationshipType : null;
                var displayProperties = {};
                if (startNode) {
                    var endNodeProps = ['color','fontColor','stroke','strokeWidth'];
                    var propsToCopy = ['color','fontColor','fontSize','height',
                        'radius','size','stroke','strokeWidth','textLocation','width'];
                    propsToCopy.map(prop => {
                        var startNodePropValue = startNode[prop];
                        var endNodePropValue = (relationshipType) ? relationshipType.endNodeLabel.display[prop] : null
                        if (endNodeProps.includes(prop)) {
                            displayProperties[prop] = (endNodePropValue) ? endNodePropValue : startNodePropValue;
                        } else {
                            displayProperties[prop] = startNodePropValue;
                        }
                    });
                }
        
                //var newNode = this.createNewNode(coords.x, coords.y, true, displayProperties);
                var endNodeLabelString = (relationshipType) ? relationshipType.endNodeLabel.label : NEW_NODE_VARIABLE_SCOPE_LABEL;
                var relationshipTypeString = (relationshipType) ? relationshipType.type : "";
    
                var newNode = this.createNewNodeFromNodeLabel(endNodeLabelString, displayProperties, true);
                if (newNode) {
                    newNode.setX(coords.x);
                    newNode.setY(coords.y);
                    this.addNode(newNode);

                    // this will cause a render
                    //graphCanvas.connectNodes(connectorSourceId, nodeIdPrefix + newNode.key);
                    graphCanvas.addRelationship(relationshipTypeString, startNode, newNode);        
                }
            });
        }
    }    

    createNewNodeFromNodeLabel (nodeLabelString, displayProperties, skipUpdateCypher) {
        if (SecurityRole.canEdit(true)) {
            var newNodeLabel = nodeLabelString;
            var nodeLabels = (newNodeLabel === NEW_NODE_VARIABLE_SCOPE_LABEL) ? [] : [newNodeLabel];
            var newVar = this.variableScope.getCandidateNodePatternVariable(newNodeLabel);
            var newNodePattern = new NodePattern({
                variable: newVar,
                nodeLabels: nodeLabels,
                variableScope: this.variableScope
            });
            var displayNode = this.convertNodePatternToDisplayNode(this.syncedGraphDataAndView, newNodePattern, displayProperties);
            var graphNode = displayNode.getNode();
            newNodePattern.key = graphNode.key;
    
            this.addToNodeMap(newNodePattern, graphNode);
    
            // TODO: this really shouldn't be added until addNode is called
            this.cypherPattern.addNodePatternPart(newNodePattern, this.variableScope);
            if (!skipUpdateCypher) {
                this.updateCurrentCypherAndPattern({
                    addedItem: newNodePattern,
                    updateType: BlockUpdateType.NodePatternAdded
                });    
            }
    
            return displayNode;
        } 
    }

    createNewNode (displayProperties) {
        return this.createNewNodeFromNodeLabel(NEW_NODE_VARIABLE_SCOPE_LABEL, displayProperties);
    }

    addToNodeMap = (nodePattern, graphNode) => {
        this.graphNodeKeyToNodePatternMap[graphNode.key] = nodePattern;
    }

    getNodePatternByGraphNodeKey = (graphNodeKey) => this.graphNodeKeyToNodePatternMap[graphNodeKey];
    getRelationshipPatternByGraphRelationshipKey = (graphRelationshipKey) => this.graphRelationshipKeyToRelationshipPatternMap[graphRelationshipKey];

    updateNodePatternNodeLabels = (updateProperties) => {
        var { nodePattern, nodeLabels } = updateProperties;
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            nodePattern.setNodeLabels(nodeLabels);

            var graphNode = nodePattern.displayNode.getNode();
            graphNode.updateProperty('nodeLabels', nodePattern.nodeLabels, DataTypes.StringArray);
    
            // re-render node
            parentBlock.getGraphCanvas().reRenderNode(nodePattern.displayNode);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.NodePatternUpdateNodeLabels
            });
        }
    }  

    updateRelationshipPatternTypes = (updateProperties) => {
        var { relationshipPattern, types } = updateProperties;
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            relationshipPattern.setTypes(types);

            var graphRelationship = relationshipPattern.displayRelationship.getRelationship();
            graphRelationship.updateProperty('types', relationshipPattern.types, DataTypes.StringArray);
    
            // re-render node
            parentBlock.getGraphCanvas().reRenderRelationship(relationshipPattern.displayRelationship);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.RelationshipPatternUpdateTypes
            });
        }
    }  

    updateNodePatternVariable = (updateProperties) => {
        var { nodePattern, variable, variablePreviousValue } = updateProperties;
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            nodePattern.variable = variable;
            var graphNode = nodePattern.displayNode.getNode();
            graphNode.updateProperty('variable', nodePattern.variable, DataTypes.String);
    
            var scopedProvider = this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);        
            if (scopedProvider) {
                scopedProvider.renameVariable({
                    cypherBlockKey: this.cypherBlockKey,
                    variablePreviousValue, 
                    variable, 
                    item: nodePattern
                });
            }
    
            //this.whereClause.renameVariable(variablePreviousValue, variable, nodePattern.key);
            //this.returnClause.renameVariable(variablePreviousValue, variable, nodePattern.key);
    
            //this.setWhereItems(this.whereClause.getWhereItems(), false, true);
            //this.setReturnItems(this.returnClause.getReturnItems(), false, true);
    
            // re-render node
            parentBlock.getGraphCanvas().reRenderNode(nodePattern.displayNode);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.NodePatternUpdateVariable
            });
        }
    }  

    updateRelationshipPatternVariable = (updateProperties) => {
        var { relationshipPattern, variable, variablePreviousValue } = updateProperties;
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            relationshipPattern.variable = variable;
            var graphRelationship = relationshipPattern.displayRelationship.getRelationship();
            graphRelationship.updateProperty('variable', relationshipPattern.variable, DataTypes.String);
    
            var scopedProvider = this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);        
            if (scopedProvider) {
                scopedProvider.renameVariable({
                    cypherBlockKey: this.cypherBlockKey,
                    variablePreviousValue, 
                    variable, 
                    item: relationshipPattern
                });
            }
    
            //this.whereClause.renameVariable(variablePreviousValue, variable, relationshipPattern.key);
            //this.returnClause.renameVariable(variablePreviousValue, variable, relationshipPattern.key);
    
            //this.setWhereItems(this.whereClause.getWhereItems(), false, true);
            //this.setReturnItems(this.returnClause.getReturnItems(), false, true);
    
            // re-render node
            parentBlock.getGraphCanvas().reRenderRelationship(relationshipPattern.displayRelationship);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.RelationshipPatternUpdateVariable
            });
        }
    }  

    updateRelationshipPatternRange = (updateProperties) => {
        var { relationshipPattern, variableLengthStart, variableLengthEnd } = updateProperties;
        var parentBlock = this.getParentBlock();
        if (parentBlock) {
            relationshipPattern.variableLengthStart = variableLengthStart;
            relationshipPattern.variableLengthEnd = variableLengthEnd;
            var graphRelationship = relationshipPattern.displayRelationship.getRelationship();
            graphRelationship.addOrUpdateProperty('variableLengthStart', variableLengthStart, DataTypes.String);
            graphRelationship.addOrUpdateProperty('variableLengthEnd', variableLengthEnd, DataTypes.String);
    
            // re-render node
            parentBlock.getGraphCanvas().reRenderRelationship(relationshipPattern.displayRelationship);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.RelationshipPatternUpdateRange
            });
        }
    }  

    addToRelationshipMap = (relationshipPattern, graphRelationship) => {
        this.graphRelationshipKeyToRelationshipPatternMap[graphRelationship.key] = relationshipPattern;
    }

    getNewRelationship (properties) {
        /*
        var properties = {
            type: type,
            startNode: startNode,
            endNode: endNode
        }
        */
        // startNode and endNode are graphNodes - we need to look up the associated NodePatterns
        if (SecurityRole.canEdit()) {
            var startDisplayNode = properties.startNode;
            var endDisplayNode = properties.endNode;
            var startGraphNode = startDisplayNode.getNode();
            var endGraphNode = endDisplayNode.getNode();
    
            var startNodePattern = this.graphNodeKeyToNodePatternMap[startGraphNode.key];
            var endNodePattern = this.graphNodeKeyToNodePatternMap[endGraphNode.key];
    
            // get new relationship pattern
            var relationshipPattern = new RelationshipPattern({
                types: [properties.type],
                direction: RELATIONSHIP_DIRECTION.RIGHT,
                variableScope: this.variableScope,
            });
            // also sync it to syncedGraphDataAndView
    
            // TODO: this below section really shouldn't be added until addRelationship is called
            var displayRelationship = this.convertRelationshipPatternToDisplayRelationship(
                this.syncedGraphDataAndView, relationshipPattern, startDisplayNode, endDisplayNode);
            var graphRelationship = displayRelationship.getRelationship();
            relationshipPattern.key = graphRelationship.key;
    
            this.addToRelationshipMap(relationshipPattern, graphRelationship);
    
            this.cypherPattern.addPatternElementChain(graphRelationship.key, startNodePattern, relationshipPattern, endNodePattern, this.variableScope);
            this.updateCurrentCypherAndPattern({
                updateType: BlockUpdateType.RelationshipPatternAdded
            });
        
            return displayRelationship;
        }
    }

    search = (text) => {}
    
    getNodeDisplayText (displayNode) {
        if (displayNode && displayNode.node) {
            var variable = displayNode.node.getPropertyByKey('variable');
            var nodeLabels = displayNode.node.getPropertyByKey('nodeLabels');
            var str = (variable && variable.value) ? variable.value : '';
            str += (nodeLabels && nodeLabels.value && nodeLabels.value.length > 0) ? `:${nodeLabels.value.join(':')}` : '';
            return str;
        } else {
            return '';
        }
    }

    getPropertiesAnnotationText (propertyContainer) {
        if (propertyContainer && propertyContainer.getProperties) {
            return Object.values(propertyContainer.getProperties())
                .filter(property => property.key.match(/^prop_/))
                .map(property => {
                    var key = property.key.replace(/^prop_/, '');
                    // smartQuote
                    var value = property.value;
                    return `${key}:${value}`;
                })
                .join(', ')
        } else {
            return '';
        }
    }

    getNodeDisplayAnnotationText (displayNode) {
        return this.getPropertiesAnnotationText(displayNode.node);
    }

    getRelationshipDisplayText (displayRelationship) {
        if (displayRelationship && displayRelationship.relationship) {
            var variable = displayRelationship.relationship.getPropertyByKey('variable');
            var types = displayRelationship.relationship.getPropertyByKey('types');
            var str = (variable && variable.value) ? variable.value : '';
            var typesValue = (types && types.value && types.value.length) ? types.value.filter(x => x) : [];
                
            str += (typesValue.length > 0)
                    ? `:${types.value.join('|:')}` 
                    : '';

            var variableLengthStart = displayRelationship.relationship.getPropertyByKey('variableLengthStart');
            var variableLengthEnd = displayRelationship.relationship.getPropertyByKey('variableLengthEnd');
            str += (variableLengthStart && variableLengthStart.value) ? variableLengthStart.value : '';
            str += (variableLengthEnd && variableLengthEnd.value) ? `..${variableLengthEnd.value}` : '';
            return str;
        } else {
            return '';
        }
    }

    getRelationshipDisplayAnnotationText (displayRelationship) {
        return this.getPropertiesAnnotationText(displayRelationship.relationship);
    }

    updateCurrentCypherAndPattern = (args) => {
        args = args || {};
        args = {
            cypherBlockKey: this.cypherBlockKey,
            ...args
        }
        var scopedProvider = this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);        
        if (scopedProvider) {
            scopedProvider.handleBlockUpdated(args);
        }
    }

    removeEverythingFromVariableScope = () => {
        this.cypherPattern.removeFromVariableScope();
    }

    getCypher = () => `${this.cypherKeyword} ${this.cypherPattern.toCypherString()}`;
    getCypherKeyword = () => this.cypherKeyword;

    handleBlockUpdated = (args) => {
        args = args || {};
        const { cypherBlockKey } = args;
        if (cypherBlockKey !== this.cypherBlockKey) {
            // TODO: find out if the update was before my block
            // TODO: do something if needed
        }
    }

}
