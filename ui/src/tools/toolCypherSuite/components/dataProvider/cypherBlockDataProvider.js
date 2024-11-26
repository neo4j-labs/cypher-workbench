import React, { Component } from 'react'
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';
import { GraphData } from '../../../../dataModel/graphData';
import { serializeObject, deserializeObject }  from '../../../../dataModel/graphUtil';
import { GraphDocChangeType } from '../../../../dataModel/graphDataConstants';

import { CypherDataProvider } from './cypherDataProvider';

import CypherBlock from './cypherBlock';
import SlateCypherEditorBlock from '../cypherBlocks/SlateCypherEditorBlock';

const LOCAL_STORAGE_KEY = 'localCypherSuite';
const REMOTE_GRAPH_DOC_TYPE = 'CypherSuite';

const SubgraphNodeLabels = {
    CypherSuite: "CypherSuite",
    CypherStatement: "CypherStatement",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    NEXT_CYPHER_STATEMENT: {
        name: "NEXT_CYPHER_STATEMENT",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherStatement,
            endNode: SubgraphNodeLabels.CypherStatement
        }]
    },
    HAS_CYPHER_STATEMENT: {
        name: "HAS_CYPHER_STATEMENT",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherSuite,
            endNode: SubgraphNodeLabels.CypherStatement
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.CypherSuite, 
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
        {nodeLabel: SubgraphNodeLabels.CypherSuite, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherStatement, propertyKeys: ["key"]}
    ] 
}  

export class CypherBlockDataProvider {

    graphNodeKeyToBlockMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            cypherBlocks,
            cypherSuiteBuilder
        } = properties;
        this.cypherSuiteBuilder = cypherSuiteBuilder;
        this.cypherBlocks = (cypherBlocks) ? cypherBlocks : [];

        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });
    }

    data = () => this.graphData;

    getCypherBlocks = () => this.cypherBlocks.slice();

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

    fromSaveObject = ({graphDocObj, serializedSaveObject, keepDataChangeFlags}, callback) => {
        console.log("cypherBlockDataProvider fromSaveObject: ", graphDocObj);
        this.graphNodeKeyToBlockMap = {};        

        var deserializedSaveObject = null;
        if (serializedSaveObject) {
            deserializedSaveObject = deserializeObject(serializedSaveObject);
            this.cypherSuiteBuilder.removeListenerBeforeDeserialize(this);
            this.graphData = deserializedSaveObject.graphData;
            this.cypherSuiteBuilder.addListenerAfterDeserialize(this);           
        } else {
            this.graphData.fromSaveObject(graphDocObj);
        }

        this.cypherBlocks = [];

        this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.CypherStatement))
            .map((graphNode) => {
                var expanded = graphNode.getPropertyValueByKey('expanded', true);
                var selected = graphNode.getPropertyValueByKey('selected', false);
                var cypherBlock = this.getNewCypherBlock({key: graphNode.key, expanded, selected, graphNode});                
                this.addToNodeMap(cypherBlock, graphNode);
            });

        var startNodeKeys = [];
        var endNodeKeys = [];
        var nextRelationships = this.graphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.NEXT_CYPHER_STATEMENT.name)
            .map(graphRelationship => {
                startNodeKeys.push(graphRelationship.getStartNode().key);
                endNodeKeys.push(graphRelationship.getEndNode().key);
                return graphRelationship;
            });
    
        if (nextRelationships.length > 0) {
            // find start
            var startKeyIndex = startNodeKeys.findIndex(key => !endNodeKeys.includes(key));
            var startKey = startNodeKeys.splice(startKeyIndex,1)[0];
            this.cypherBlocks.push(this.graphNodeKeyToBlockMap[startKey]);

            for (var i = 0; i <= startNodeKeys.length; i++) {
                var nextRel = nextRelationships.find(x => x.getStartNode().key === startKey);
                if (nextRel) {
                    var nextKey = nextRel.getEndNode().key;
                    this.cypherBlocks.push(this.graphNodeKeyToBlockMap[nextKey]);
                    startKey = nextKey;
                }
            }
        } else {
            var blocks = Object.values(this.graphNodeKeyToBlockMap);
            if (blocks.length > 1) {
                alert(`Received ${blocks.length} but no NEXT relationships. Data is corrupted. Attempting repair.`);
                blocks.map((block, index) => {
                    this.cypherBlocks.push(blocks[0]);
                    if (index < blocks.length) {
                        this.addNextRelationship(block, blocks[index + 1]);
                    }
                });
            } else if (blocks.length === 1) {
                this.cypherBlocks.push(blocks[0]);
            }
        }

        if (callback) {
            callback();
        }
    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.graphData.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.graphData.getEventEmitter();

    getNewSlateCypherBlock = (key, blockGraphNode) => {
        const ref = React.createRef();

        const keyValue = `cypher_${key}`;

        const dataProvider = new CypherDataProvider({
            graphNode: blockGraphNode,
            cypherBlockDataProvider: this,
            cypherBlockKey: key,
            cypherSuiteBuilder: this.cypherSuiteBuilder
        });

        const blockElement =
            <SlateCypherEditorBlock 
                key={keyValue}
                cypherBlockKey={key}
                blockId={keyValue}
                dataProvider={dataProvider}
                cypherSuiteBuilder={this.cypherSuiteBuilder}
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
                const { cypherBlockKey, canvasHeight } = messagePayload;
                var block = this.cypherBlocks.find(x => x.key === cypherBlockKey);
                if (block) {
                    block.graphNode.addOrUpdateProperty("displayCanvasHeight", canvasHeight, DataTypes.Float);
                }
                messageHandled = true;
                this.cypherSuiteBuilder.calculatePageSize();
            } 
        } 
        if (!messageHandled) {
            this.cypherSuiteBuilder.dataChangeListener(id, messageName, messagePayload);            
        }
    }

    getNewCypherBlock = ({key, expanded, selected, graphNode, position, scrollIntoView}) => {
        var showToggleTool = false;
        var returnObj = this.getNewSlateCypherBlock(key, graphNode); 
        const { dataProvider, ref, blockElement } = returnObj;

        //console.log("getCypherBlock expanded: ", expanded);
        const newBlock = new CypherBlock({
            key: key,
            title: 'Cypher',
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
        var affectedBlock = this.cypherBlocks.find(block => block.key === key);
        if (affectedBlock) {
            if (affectedBlock.expanded !== expanded) {
                this.cypherSuiteBuilder.calculatePageSize();
            }
            affectedBlock.expanded = expanded;
            affectedBlock.selected = selected;
            affectedBlock.graphNode.addOrUpdateProperty('expanded', expanded, DataTypes.Boolean);
            affectedBlock.graphNode.addOrUpdateProperty('selected', selected, DataTypes.Boolean);
            
        }
    }

    removeBlock = ({ key }) => {
        var blockToRemoveIndex = this.cypherBlocks.findIndex(block => block.key === key);
        //console.log('removeBlock: blockToRemoveIndex: ', blockToRemoveIndex);
        //console.log('removeBlock: key: ', key);
        if (blockToRemoveIndex >= 0) {
            var blockToRemove = this.cypherBlocks[blockToRemoveIndex];

            var blockBefore = null;
            var blockAfter = null;
            
            if (blockToRemoveIndex > 0) {
                blockBefore = this.cypherBlocks[blockToRemoveIndex-1];
            }
            if (blockToRemoveIndex < (this.cypherBlocks.length-1)) {
                blockAfter = this.cypherBlocks[blockToRemoveIndex+1];
            }
            if (blockBefore && blockAfter) {
                this.addNextRelationship(blockBefore, blockAfter);
            }

            this.cypherBlocks.splice(blockToRemoveIndex, 1);

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
        //const blocksWithCurrentRef = this.cypherBlocks
        //.filter(block => block.ref && block.ref.current && block.ref.current.handleDataModel)
        //console.log("blocksWithCurrentRef: ", blocksWithCurrentRef);

        this.cypherBlocks
            .filter(block => this.blockHasCurrentRef(block) && block.ref.current.handleDataModel)
            .map(block => block.ref.current.handleDataModel(dataModel, dataModelKey));
    }

    spliceRemove = (draggedBlockIndex, newCypherBlocks) => {
        const draggedBlock = newCypherBlocks[draggedBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (draggedBlockIndex > 0) {
            beforeBlock = newCypherBlocks[draggedBlockIndex-1];
            this.removeNextRelationship(beforeBlock, draggedBlock);
        }
        if (newCypherBlocks.length > 0 && draggedBlockIndex < (newCypherBlocks.length - 1)) {
            afterBlock = newCypherBlocks[draggedBlockIndex+1];
            this.removeNextRelationship(draggedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.addNextRelationship(beforeBlock, afterBlock);
        }

    }

    spliceInsert = (droppedOnBlockIndex, newCypherBlocks) => {
        const insertedBlock = newCypherBlocks[droppedOnBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (droppedOnBlockIndex > 0) {
            beforeBlock = newCypherBlocks[droppedOnBlockIndex-1];
            this.addNextRelationship(beforeBlock, insertedBlock);
        }
        if (newCypherBlocks.length > 0 && droppedOnBlockIndex < (newCypherBlocks.length - 1)) {
            afterBlock = newCypherBlocks[droppedOnBlockIndex+1];
            this.addNextRelationship(insertedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.removeNextRelationship(beforeBlock, afterBlock);
        }
    }

    moveBlock = ({ draggedBlockKey, droppedOnBlockKey, position }) => {
        var draggedBlockIndex = this.cypherBlocks.findIndex(x => x.key === draggedBlockKey);
        var droppedOnBlockIndex = this.cypherBlocks.findIndex(x => x.key === droppedOnBlockKey);

        if (draggedBlockIndex >= 0 && droppedOnBlockIndex >= 0) {
            if (draggedBlockIndex === droppedOnBlockIndex ||
               (draggedBlockIndex === (droppedOnBlockIndex - 1) && position === 'before')
            ) {
                return;
            }
            var newCypherBlocks = this.cypherBlocks.slice();

            // update graph data - remove dragged block
            const draggedBlock = this.cypherBlocks[draggedBlockIndex];

            this.spliceRemove(draggedBlockIndex, newCypherBlocks);

            // update array - remove dragged block
            newCypherBlocks.splice(draggedBlockIndex, 1);

            // update array - add back dragged block in new position
            if (draggedBlockIndex < droppedOnBlockIndex && position === 'before') {
                droppedOnBlockIndex--;
            }
            newCypherBlocks.splice(droppedOnBlockIndex, 0, draggedBlock);

            // update graph data - add appropriate NEXT relationships
            this.spliceInsert(droppedOnBlockIndex, newCypherBlocks);

            this.cypherBlocks = newCypherBlocks;

            return this.cypherBlocks;
        }
        return null;
    }

    getNewBlock = ({ position, scrollIntoView, testCypherBlock }) => {

        var blockNode = this.graphData.createNode({
            key: (testCypherBlock) ? testCypherBlock.key : null,
            primaryNodeLabel: SubgraphNodeLabels.CypherStatement,
            labels: [SubgraphNodeLabels.CypherStatement]
        });

        var newBlock = null;
        if (testCypherBlock) {      // this is to support unit testing
            newBlock = testCypherBlock;
            newBlock.graphNode = blockNode;
        } else {
            var newBlock = this.getNewCypherBlock({
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

        if (this.cypherBlocks.length === 0) {
            this.cypherBlocks.push(newBlock);
        } else {
            const len = this.cypherBlocks.length;
            if (position === 'end' || position >= len) {
                const lastBlock = this.cypherBlocks[len-1];
                this.addNextRelationship(lastBlock, newBlock);
                this.cypherBlocks.push(newBlock);
            } else {
                var firstBlock = null;
                var secondBlock = this.cypherBlocks[position];
                if (len >= 2 && position > 0) {
                    // need to remove NEXT where we are going to do the insert
                    firstBlock = this.cypherBlocks[position-1];
                    this.removeNextRelationship(firstBlock, secondBlock);
                }
                if (firstBlock) {
                    this.addNextRelationship(firstBlock, newBlock);
                }
                this.addNextRelationship(newBlock, secondBlock);
                this.cypherBlocks.splice(position, 0, newBlock);
            }
        }
        return newBlock;
    }

    addNextRelationship = (startBlock, endBlock, dontNotify) => {
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.NEXT_CYPHER_STATEMENT.name,
            startNode: startBlock.graphNode,
            endNode: endBlock.graphNode
        });
        this.graphData.addRelationship(graphRelationship, dontNotify);
    }

    removeNextRelationship = (startBlock, endBlock) => {
        this.graphData
            .findRelationships(startBlock.graphNode, SubgraphRelationshipTypes.NEXT_CYPHER_STATEMENT.name, endBlock.graphNode)
            .map(relationship => this.graphData.removeRelationship(relationship));
    }

    addToNodeMap = (itemBlock, graphNode) => {
        this.graphNodeKeyToBlockMap[graphNode.key] = itemBlock;
    }

    addNode = (graphNode, dontNotify) => {
        this.graphData.addNode(graphNode, dontNotify);    

        // we need to add a relationship between the GraphDoc and the CypherBlock
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_CYPHER_STATEMENT.name,
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

        var saveObjs = this.cypherBlocks
            .filter(x => x.dataProvider)
            .map(x => x.dataProvider)
            .map(dataProvider => this.getGraphDataSaveObj(dataProvider))
            // for simple blocks like RETURN, we want to save the data using a graphNode from this.graphData
            //   when a returnClauseDataProvider is constructed, it returns the this.graphData of the 
            //   itemBlockDataProvider, and the below filter step filters it out
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
 