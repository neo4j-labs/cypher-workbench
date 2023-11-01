import React, { Component } from 'react'
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';
import { GraphData } from '../../../../dataModel/graphData';
import { serializeObject, deserializeObject }  from '../../../../dataModel/graphUtil';
import { GraphDocChangeType } from '../../../../dataModel/graphDataConstants';

import { ScenarioDataProvider } from './scenarioDataProvider';

import ScenarioBlock from './scenarioBlock';
//import SlateScenarioEditorBlock from '../scenarioBlocks/SlateScenarioEditorBlock';
import ScenarioBlockDisplay from '../scenarioBlocks/ScenarioBlockDisplay';

const LOCAL_STORAGE_KEY = 'localScenarioSet';
const REMOTE_GRAPH_DOC_TYPE = 'ScenarioSet';

const SubgraphNodeLabels = {
    ScenarioSet: "ScenarioSet",
    Scenario: "Scenario",
    CypherBuilder: "CypherBuilder",
    CypherStatement: "CypherStatement",
    GraphDocMetadata: "GraphDocMetadata",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    NEXT_SCENARIO: {
        name: "NEXT_SCENARIO",
        nodes: [{
            startNode: SubgraphNodeLabels.Scenario,
            endNode: SubgraphNodeLabels.Scenario
        }]
    },
    HAS_SCENARIO: {
        name: "HAS_SCENARIO",
        nodes: [{
            startNode: SubgraphNodeLabels.ScenarioSet,
            endNode: SubgraphNodeLabels.Scenario
        }]
    },
    ASSOCIATED_CYPHER: {
        name: "ASSOCIATED_CYPHER",
        nodes: [{
            startNode: SubgraphNodeLabels.Scenario,
            endNode: SubgraphNodeLabels.Any
        }]
    },
    HAS_METADATA: {
        name: "HAS_METADATA",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBuilder,
            endNode: SubgraphNodeLabels.GraphDocMetadata
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.ScenarioSet, 
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
        {nodeLabel: SubgraphNodeLabels.ScenarioSet, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.Scenario, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherBuilder, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherStatement, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.GraphDocMetadata, propertyKeys: ["key"]}
    ],
    remoteNodeLabels: [
        SubgraphNodeLabels.CypherBuilder,
        SubgraphNodeLabels.CypherStatement
    ]
}  

export class ScenarioBlockDataProvider {

    graphNodeKeyToScenarioBlockMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            scenarioBlocks,
            scenarioSetBuilder
        } = properties;
        this.scenarioSetBuilder = scenarioSetBuilder;
        this.scenarioBlocks = (scenarioBlocks) ? scenarioBlocks : [];

        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });
    }

    data = () => this.graphData;

    getScenarioBlocks = () => this.scenarioBlocks.slice();

    getAssociatedCypherMetrics = () => {
        var totalBlocks = this.scenarioBlocks.length;
        var totalWithAssociatedCypher = this.scenarioBlocks.filter(block => {
            var associatedCypher = block.dataProvider.getAssociatedCypher() || [];
            return associatedCypher.length > 0;
        });
        var metrics = {
            totalBlocks, 
            totalWithAssociatedCypher: (totalWithAssociatedCypher) ? totalWithAssociatedCypher.length : 0
        }
        //console.log('metrics: ', metrics);
        return metrics;
    }

    getSubgraphModel = () => SUBGRAPH_MODEL;
    getRemoteGraphDocType = () => REMOTE_GRAPH_DOC_TYPE;
    getLocalStorageKey = () => LOCAL_STORAGE_KEY;

    dataChanged = (dataChangeType, details) => 
        this.graphData.dataChanged(dataChangeType, details);

    setDataModel = (dataModel) => {
        this.dataModel = dataModel;
    }

    setDataModelKey = (dataModelKey) => {
        var rootNode = this.graphData.getGraphRootNode();
        rootNode.addOrUpdateProperty("dataModelKey", dataModelKey, DataTypes.String);
    }

    getDataModel = () => this.dataModel;

    getDataModelKey = () => {
        var rootNode = this.graphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey("dataModelKey");
    }

    getScenarioBlockByKey = (key) => {
        key = this.graphData.getKeyHelper().getLocalKey(key);
        var block = this.scenarioBlocks.find(block => block.key === key);
        return block;
    }

    addAssociatedCypher = (activeScenarioBlockKey, associatedCypherEntry) => {
        var block = this.getScenarioBlockByKey(activeScenarioBlockKey);
        if (block) {
            block.dataProvider.addAssociatedCypher(associatedCypherEntry);
            if (block.ref && block.ref.current) {
                block.ref.current.reRender();
            }
        }
    }

    fromSaveObject = ({graphDocObj, serializedSaveObject, keepDataChangeFlags}, callback) => {
        console.log("scenarioBlockDataProvider fromSaveObject: ", graphDocObj);
        this.graphNodeKeyToScenarioBlockMap = {};        

        var deserializedSaveObject = null;
        if (serializedSaveObject) {
            deserializedSaveObject = deserializeObject(serializedSaveObject);
            this.scenarioSetBuilder.removeListenerBeforeDeserialize(this);
            this.graphData = deserializedSaveObject.graphData;
            this.scenarioSetBuilder.addListenerAfterDeserialize(this);           
        } else {
            this.graphData.fromSaveObject(graphDocObj);
        }

        this.scenarioBlocks = [];

        this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.Scenario))
            .map((graphNode) => {
                var expanded = graphNode.getPropertyValueByKey('expanded', true);
                var selected = graphNode.getPropertyValueByKey('selected', false);
                var scenarioBlock = this.getNewScenarioBlock({key: graphNode.key, expanded, selected, graphNode});                
                this.addToNodeMap(scenarioBlock, graphNode);
            });

        var startNodeKeys = [];
        var endNodeKeys = [];
        var nextRelationships = this.graphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.NEXT_SCENARIO.name)
            .map(graphRelationship => {
                startNodeKeys.push(graphRelationship.getStartNode().key);
                endNodeKeys.push(graphRelationship.getEndNode().key);
                return graphRelationship;
            });
    
        if (nextRelationships.length > 0) {
            // find start
            var startKeyIndex = startNodeKeys.findIndex(key => !endNodeKeys.includes(key));
            var startKey = startNodeKeys.splice(startKeyIndex,1)[0];
            this.scenarioBlocks.push(this.graphNodeKeyToScenarioBlockMap[startKey]);

            for (var i = 0; i <= startNodeKeys.length; i++) {
                var nextRel = nextRelationships.find(x => x.getStartNode().key === startKey);
                if (nextRel) {
                    var nextKey = nextRel.getEndNode().key;
                    this.scenarioBlocks.push(this.graphNodeKeyToScenarioBlockMap[nextKey]);
                    startKey = nextKey;
                }
            }
        } else {
            var blocks = Object.values(this.graphNodeKeyToScenarioBlockMap);
            if (blocks.length > 1) {
                alert(`Received ${blocks.length} but no NEXT relationships. Data is corrupted. Attempting repair.`);
                blocks.map((block, index) => {
                    this.scenarioBlocks.push(blocks[0]);
                    if (index < blocks.length) {
                        this.addNextRelationship(block, blocks[index + 1]);
                    }
                });
            } else if (blocks.length === 1) {
                this.scenarioBlocks.push(blocks[0]);
            }
        }

        if (callback) {
            callback();
        }
    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.graphData.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.graphData.getEventEmitter();

    getNewSlateScenarioBlock = (key, blockGraphNode) => {
        const ref = React.createRef();

        const keyValue = `scenario_${key}`;

        const dataProvider = new ScenarioDataProvider({
            graphNode: blockGraphNode,
            scenarioBlockDataProvider: this,
            scenarioBlockKey: key,
            scenarioSetBuilder: this.scenarioSetBuilder
        });

        const blockElement =
            //<SlateScenarioEditorBlock 
            <ScenarioBlockDisplay
                key={keyValue}
                ref={ref}
                scenarioBlockKey={key}
                blockId={keyValue}
                dataProvider={dataProvider}
                scenarioSetBuilder={this.scenarioSetBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            ref,
            dataProvider: dataProvider,
            blockElement: blockElement
        };
    }

    dataChangeListener = (id, messageName, messagePayload) => {
        var messageHandled = false;
        if (id === 'viewChanged') {
            if (messageName === GraphDocChangeType.PanelResize) {
                // get match block node
                const { scenarioBlockKey, canvasHeight } = messagePayload;
                var block = this.scenarioBlocks.find(x => x.key === scenarioBlockKey);
                if (block) {
                    block.graphNode.addOrUpdateProperty("displayCanvasHeight", canvasHeight, DataTypes.Float);
                }
                messageHandled = true;
                this.scenarioSetBuilder.calculatePageSize();
            } 
        } 
        if (!messageHandled) {
            this.scenarioSetBuilder.dataChangeListener(id, messageName, messagePayload);            
        }
    }

    getNewScenarioBlock = ({key, expanded, selected, graphNode, position, scrollIntoView}) => {
        var showToggleTool = false;
        var returnObj = this.getNewSlateScenarioBlock(key, graphNode); 
        const { dataProvider, ref, blockElement } = returnObj;

        //console.log("getScenarioBlock expanded: ", expanded);
        const newBlock = new ScenarioBlock({
            key: key,
            title: 'Scenario',
            expanded: expanded,
            selected: selected,
            showToggleTool: showToggleTool,
            scrollIntoView: (scrollIntoView) ? true : false,
            ref: ref,
            blockElement: blockElement,
            graphNode: graphNode,
            dataProvider: dataProvider
        })
        return newBlock;
    }

    setBlockState = ({key, expanded, selected}) => {
        var affectedBlock = this.scenarioBlocks.find(block => block.key === key);
        if (affectedBlock) {
            if (affectedBlock.expanded !== expanded) {
                this.scenarioSetBuilder.calculatePageSize();
            }
            affectedBlock.expanded = expanded;
            affectedBlock.selected = selected;
            affectedBlock.graphNode.addOrUpdateProperty('expanded', expanded, DataTypes.Boolean);
            affectedBlock.graphNode.addOrUpdateProperty('selected', selected, DataTypes.Boolean);
            
        }
    }

    removeBlock = ({ key }) => {
        var blockToRemoveIndex = this.scenarioBlocks.findIndex(block => block.key === key);
        //console.log('removeBlock: blockToRemoveIndex: ', blockToRemoveIndex);
        //console.log('removeBlock: key: ', key);
        if (blockToRemoveIndex >= 0) {
            var blockToRemove = this.scenarioBlocks[blockToRemoveIndex];

            var blockBefore = null;
            var blockAfter = null;
            
            if (blockToRemoveIndex > 0) {
                blockBefore = this.scenarioBlocks[blockToRemoveIndex-1];
            }
            if (blockToRemoveIndex < (this.scenarioBlocks.length-1)) {
                blockAfter = this.scenarioBlocks[blockToRemoveIndex+1];
            }
            if (blockBefore && blockAfter) {
                this.addNextRelationship(blockBefore, blockAfter);
            }

            this.scenarioBlocks.splice(blockToRemoveIndex, 1);

            this.graphData.getRelationshipsForNodeByKey(blockToRemove.graphNode.key)
                .map(relationship => this.graphData.removeRelationship(relationship));

            this.graphData.removeNode(blockToRemove.graphNode);
        }
    }

    getAllSubGraphDocKeys = () => [];
    getAllAssociatedGraphViewKeys = () => [];
    
    handleDataModel = (dataModel, dataModelKey) => {
        this.setDataModel(dataModel);
        this.setDataModelKey(dataModelKey);
        //const blocksWithCurrentRef = this.scenarioBlocks
        //.filter(block => block.ref && block.ref.current && block.ref.current.handleDataModel)
        //console.log("blocksWithCurrentRef: ", blocksWithCurrentRef);

        this.scenarioBlocks
            .filter(block => this.blockHasCurrentRef(block) && block.ref.current.handleDataModel)
            .map(block => block.ref.current.handleDataModel(dataModel, dataModelKey));
    }

    spliceRemove = (draggedBlockIndex, newScenarioBlocks) => {
        const draggedBlock = newScenarioBlocks[draggedBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (draggedBlockIndex > 0) {
            beforeBlock = newScenarioBlocks[draggedBlockIndex-1];
            this.removeNextRelationship(beforeBlock, draggedBlock);
        }
        if (newScenarioBlocks.length > 0 && draggedBlockIndex < (newScenarioBlocks.length - 1)) {
            afterBlock = newScenarioBlocks[draggedBlockIndex+1];
            this.removeNextRelationship(draggedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.addNextRelationship(beforeBlock, afterBlock);
        }

    }

    spliceInsert = (droppedOnBlockIndex, newScenarioBlocks) => {
        const insertedBlock = newScenarioBlocks[droppedOnBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (droppedOnBlockIndex > 0) {
            beforeBlock = newScenarioBlocks[droppedOnBlockIndex-1];
            this.addNextRelationship(beforeBlock, insertedBlock);
        }
        if (newScenarioBlocks.length > 0 && droppedOnBlockIndex < (newScenarioBlocks.length - 1)) {
            afterBlock = newScenarioBlocks[droppedOnBlockIndex+1];
            this.addNextRelationship(insertedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.removeNextRelationship(beforeBlock, afterBlock);
        }
    }

    moveBlock = ({ draggedBlockKey, droppedOnBlockKey, position }) => {
        var draggedBlockIndex = this.scenarioBlocks.findIndex(x => x.key === draggedBlockKey);
        var droppedOnBlockIndex = this.scenarioBlocks.findIndex(x => x.key === droppedOnBlockKey);

        if (draggedBlockIndex >= 0 && droppedOnBlockIndex >= 0) {
            if (draggedBlockIndex === droppedOnBlockIndex ||
               (draggedBlockIndex === (droppedOnBlockIndex - 1) && position === 'before')
            ) {
                return;
            }
            var newScenarioBlocks = this.scenarioBlocks.slice();

            // update graph data - remove dragged block
            const draggedBlock = this.scenarioBlocks[draggedBlockIndex];

            this.spliceRemove(draggedBlockIndex, newScenarioBlocks);

            // update array - remove dragged block
            newScenarioBlocks.splice(draggedBlockIndex, 1);

            // update array - add back dragged block in new position
            if (draggedBlockIndex < droppedOnBlockIndex && position === 'before') {
                droppedOnBlockIndex--;
            }
            newScenarioBlocks.splice(droppedOnBlockIndex, 0, draggedBlock);

            // update graph data - add appropriate NEXT relationships
            this.spliceInsert(droppedOnBlockIndex, newScenarioBlocks);

            this.scenarioBlocks = newScenarioBlocks;

            return this.scenarioBlocks;
        }
        return null;
    }

    getNewBlock = ({ position, scrollIntoView, testScenarioBlock }) => {

        var blockNode = this.graphData.createNode({
            key: (testScenarioBlock) ? testScenarioBlock.key : null,
            primaryNodeLabel: SubgraphNodeLabels.Scenario,
            labels: [SubgraphNodeLabels.Scenario]
        });

        var newBlock = null;
        if (testScenarioBlock) {      // this is to support unit testing
            newBlock = testScenarioBlock;
            newBlock.graphNode = blockNode;
        } else {
            var newBlock = this.getNewScenarioBlock({
                key: blockNode.key, 
                expanded: true, 
                selected: false, 
                scrollIntoView: scrollIntoView,
                graphNode: blockNode,
                position: position    
            });
        }

        blockNode.addProperty('expanded', newBlock.expanded, DataTypes.Boolean);
        blockNode.addProperty('selected', newBlock.selected, DataTypes.Boolean);
        this.addNode(blockNode);
        this.addToNodeMap(newBlock, blockNode);

        if (this.scenarioBlocks.length === 0) {
            this.scenarioBlocks.push(newBlock);
        } else {
            const len = this.scenarioBlocks.length;
            if (position === 'end' || position >= len) {
                const lastBlock = this.scenarioBlocks[len-1];
                this.addNextRelationship(lastBlock, newBlock);
                this.scenarioBlocks.push(newBlock);
            } else {
                var firstBlock = null;
                var secondBlock = this.scenarioBlocks[position];
                if (len >= 2 && position > 0) {
                    // need to remove NEXT where we are going to do the insert
                    firstBlock = this.scenarioBlocks[position-1];
                    this.removeNextRelationship(firstBlock, secondBlock);
                }
                if (firstBlock) {
                    this.addNextRelationship(firstBlock, newBlock);
                }
                this.addNextRelationship(newBlock, secondBlock);
                this.scenarioBlocks.splice(position, 0, newBlock);
            }
        }
        return newBlock;
    }

    addNextRelationship = (startBlock, endBlock, dontNotify) => {
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.NEXT_SCENARIO.name,
            startNode: startBlock.graphNode,
            endNode: endBlock.graphNode
        });
        this.graphData.addRelationship(graphRelationship, dontNotify);
    }

    removeNextRelationship = (startBlock, endBlock) => {
        this.graphData
            .findRelationships(startBlock.graphNode, SubgraphRelationshipTypes.NEXT_SCENARIO.name, endBlock.graphNode)
            .map(relationship => this.graphData.removeRelationship(relationship));
    }

    addToNodeMap = (scenarioBlock, graphNode) => {
        this.graphNodeKeyToScenarioBlockMap[graphNode.key] = scenarioBlock;
    }

    addNode = (graphNode, dontNotify) => {
        this.graphData.addNode(graphNode, dontNotify);    

        // we need to add a relationship between the GraphDoc and the ScenarioBlock
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_SCENARIO.name,
            startNode: this.graphData.getGraphRootNode(),
            endNode: graphNode
        });
        this.graphData.addRelationship(graphRelationship, dontNotify);
    }

    getGraphDataSaveObj = (dataProvider) => {
        const data = dataProvider.data();
        var graphData = (data.getGraphData) ? data.getGraphData() : data;
        var idJoiner = graphData.getKeyHelper().getIdJoiner();

        var timestamp = new Date().getTime();
        var graphDocChanges = (data.getChangedItemsGraphData) ? data.getChangedItemsGraphData(timestamp) : data.getChangedItems(timestamp);
        /*
        var howDidNodesChange = data.getGraphData().howDidNodesChange();    // for debugging
        var howDidNodesChange2 = data.getGraphDataView().getGraphData().howDidNodesChange();    // for debugging
        */
        var graphDocDeletions = data.getDeletedItems(timestamp);
        const resetDataFunc = (timestamp) => () => data.resetDataChangeFlags(timestamp);            

        return {
            idJoiner: idJoiner,
            fromData: data,
            graphDocChanges: graphDocChanges,
            graphDocDeletions: graphDocDeletions,
            resetDataFunc: resetDataFunc(timestamp)
        } 
    }

    getSerializedDataSaveObj = () => {

        var objectToSerialize = {
            graphData: this.graphData
        }

        const serializedObject = serializeObject(objectToSerialize);
        return serializedObject;
    }

    getDataSaveObj = () => {

        var graphDataSaveObj = this.getGraphDataSaveObj(this);
        var { idJoiner, graphDocChanges, graphDocDeletions, fromData } = graphDataSaveObj;

        var saveObjs = this.scenarioBlocks
            .filter(x => x.dataProvider)
            .map(x => x.dataProvider)
            .map(dataProvider => this.getGraphDataSaveObj(dataProvider))
            // for simple blocks like RETURN, we want to save the data using a graphNode from this.graphData
            //   when a returnClauseDataProvider is constructed, it returns the this.graphData of the 
            //   scenarioBlockDataProvider, and the below filter step filters it out
            .filter(saveObj => saveObj.fromData !== fromData)   
            .map(saveObj => {
                graphDocChanges.changedNodes = graphDocChanges.changedNodes.concat(saveObj.graphDocChanges.changedNodes);
                graphDocChanges.changedRelationships = graphDocChanges.changedRelationships.concat(saveObj.graphDocChanges.changedRelationships);
                graphDocDeletions.deletedNodeKeys = graphDocDeletions.deletedNodeKeys.concat(saveObj.graphDocDeletions.deletedNodeKeys);
                graphDocDeletions.deletedRelationshipKeys = graphDocDeletions.deletedRelationshipKeys.concat(saveObj.graphDocDeletions.deletedRelationshipKeys);
                return saveObj;
            });
        
        const resetDataFunc = () => {
            graphDataSaveObj.resetDataFunc();
            saveObjs.map(x => x.resetDataFunc());
        }

        return {
            idJoiner: idJoiner,
            graphDocChanges: graphDocChanges,
            graphDocDeletions: graphDocDeletions,
            resetDataFunc: resetDataFunc
        }
    }

    blockHasCurrentRef = (block) => block && block.ref && block.ref.current;

}
 