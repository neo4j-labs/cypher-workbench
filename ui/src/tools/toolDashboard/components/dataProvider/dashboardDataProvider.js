import React, { Component } from 'react'
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';
import { GraphData } from '../../../../dataModel/graphData';
import { GraphDocChangeType } from '../../../../dataModel/graphDataConstants';

import { DashboardCardDataProvider } from './dashboardCardDataProvider';

import DashboardCard from './dashboardCard';

const LOCAL_STORAGE_KEY = 'localDashboard';
const REMOTE_GRAPH_DOC_TYPE = 'Dashboard';

const SubgraphNodeLabels = {
    Dashboard: "Dashboard",
    DashboardCard: "DashboardCard",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    NEXT: {
        name: "NEXT",
        nodes: [{
            startNode: SubgraphNodeLabels.DashboardCard,
            endNode: SubgraphNodeLabels.DashboardCard
        }]
    },
    HAS_DASHBOARD_CARD: {
        name: "HAS_DASHBOARD_CARD",
        nodes: [{
            startNode: SubgraphNodeLabels.Dashboard,
            endNode: SubgraphNodeLabels.DashboardCard
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.Dashboard, 
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
        {nodeLabel: SubgraphNodeLabels.Dashboard, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DashboardCard, propertyKeys: ["key"]}
    ] 
}  

export class DashboardDataProvider {

    graphNodeKeyToBlockMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            dashboardCards,
            dashboardBuilder
        } = properties;
        this.dashboardBuilder = dashboardBuilder;
        this.dashboardCards = (dashboardCards) ? dashboardCards : [];

        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });
    }

    data = () => this.graphData;

    getDashboardCards = () => this.dashboardCards.slice();

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

    fromSaveObject = (graphDocObj, keepDataChangeFlags, callback) => {
        console.log("dashboardCardDataProvider fromSaveObject: ", graphDocObj);
        this.graphNodeKeyToBlockMap = {};        
        this.graphData.fromSaveObject(graphDocObj);
        this.dashboardCards = [];

        this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.DashboardCard))
            .map((graphNode) => {
                var expanded = graphNode.getPropertyValueByKey('expanded', true);
                var selected = graphNode.getPropertyValueByKey('selected', false);
                var dashboardCard = this.getNewDashboardCard({key: graphNode.key, expanded, selected, graphNode});                
                this.addToNodeMap(dashboardCard, graphNode);
            });

        var startNodeKeys = [];
        var endNodeKeys = [];
        var nextRelationships = this.graphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.NEXT.name)
            .map(graphRelationship => {
                startNodeKeys.push(graphRelationship.getStartNode().key);
                endNodeKeys.push(graphRelationship.getEndNode().key);
                return graphRelationship;
            });
    
        if (nextRelationships.length > 0) {
            // find start
            var startKeyIndex = startNodeKeys.findIndex(key => !endNodeKeys.includes(key));
            var startKey = startNodeKeys.splice(startKeyIndex,1)[0];
            this.dashboardCards.push(this.graphNodeKeyToBlockMap[startKey]);

            for (var i = 0; i <= startNodeKeys.length; i++) {
                var nextRel = nextRelationships.find(x => x.getStartNode().key === startKey);
                if (nextRel) {
                    var nextKey = nextRel.getEndNode().key;
                    this.dashboardCards.push(this.graphNodeKeyToBlockMap[nextKey]);
                    startKey = nextKey;
                }
            }
        } else {
            var blocks = Object.values(this.graphNodeKeyToBlockMap);
            if (blocks.length > 1) {
                alert(`Received ${blocks.length} but no NEXT relationships. Data is corrupted. Attempting repair.`);
                blocks.map((block, index) => {
                    this.dashboardCards.push(blocks[0]);
                    if (index < blocks.length) {
                        this.addNextRelationship(block, blocks[index + 1]);
                    }
                });
            } else if (blocks.length === 1) {
                this.dashboardCards.push(blocks[0]);
            }
        }

        if (callback) {
            callback();
        }
    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.graphData.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.graphData.getEventEmitter();

    dataChangeListener = (id, messageName, messagePayload) => {
        var messageHandled = false;
        if (id === 'viewChanged') {
            if (messageName === GraphDocChangeType.PanelResize) {
                // get match block node
                const { dashboardCardKey, canvasHeight } = messagePayload;
                var block = this.dashboardCards.find(x => x.key === dashboardCardKey);
                if (block) {
                    block.graphNode.addOrUpdateProperty("displayCanvasHeight", canvasHeight, DataTypes.Float);
                }
                messageHandled = true;
                this.dashboardBuilder.calculatePageSize();
            } 
        } 
        if (!messageHandled) {
            this.dashboardBuilder.dataChangeListener(id, messageName, messagePayload);            
        }
    }

    getNewDashboardCard = ({key, expanded, selected, graphNode, position, scrollIntoView}) => {
        /*
        var showToggleTool = false;
        var returnObj = this.getNewSlateDashboardCard(key, graphNode); 
        const { dataProvider, ref, blockElement } = returnObj;

        //console.log("getDashboardCard expanded: ", expanded);
        const newBlock = new DashboardCard({
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
        */
    }

    setBlockState = ({key, expanded, selected}) => {
        var affectedBlock = this.dashboardCards.find(block => block.key === key);
        if (affectedBlock) {
            if (affectedBlock.expanded !== expanded) {
                this.dashboardBuilder.calculatePageSize();
            }
            affectedBlock.expanded = expanded;
            affectedBlock.selected = selected;
            affectedBlock.graphNode.addOrUpdateProperty('expanded', expanded, DataTypes.Boolean);
            affectedBlock.graphNode.addOrUpdateProperty('selected', selected, DataTypes.Boolean);
            
        }
    }

    removeBlock = ({ key }) => {
        var blockToRemoveIndex = this.dashboardCards.findIndex(block => block.key === key);
        //console.log('removeBlock: blockToRemoveIndex: ', blockToRemoveIndex);
        //console.log('removeBlock: key: ', key);
        if (blockToRemoveIndex >= 0) {
            var blockToRemove = this.dashboardCards[blockToRemoveIndex];

            var blockBefore = null;
            var blockAfter = null;
            
            if (blockToRemoveIndex > 0) {
                blockBefore = this.dashboardCards[blockToRemoveIndex-1];
            }
            if (blockToRemoveIndex < (this.dashboardCards.length-1)) {
                blockAfter = this.dashboardCards[blockToRemoveIndex+1];
            }
            if (blockBefore && blockAfter) {
                this.addNextRelationship(blockBefore, blockAfter);
            }

            this.dashboardCards.splice(blockToRemoveIndex, 1);

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
        //const blocksWithCurrentRef = this.dashboardCards
        //.filter(block => block.ref && block.ref.current && block.ref.current.handleDataModel)
        //console.log("blocksWithCurrentRef: ", blocksWithCurrentRef);

        this.dashboardCards
            .filter(block => this.blockHasCurrentRef(block) && block.ref.current.handleDataModel)
            .map(block => block.ref.current.handleDataModel(dataModel, dataModelKey));
    }

    spliceRemove = (draggedBlockIndex, newDashboardCards) => {
        const draggedBlock = newDashboardCards[draggedBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (draggedBlockIndex > 0) {
            beforeBlock = newDashboardCards[draggedBlockIndex-1];
            this.removeNextRelationship(beforeBlock, draggedBlock);
        }
        if (newDashboardCards.length > 0 && draggedBlockIndex < (newDashboardCards.length - 1)) {
            afterBlock = newDashboardCards[draggedBlockIndex+1];
            this.removeNextRelationship(draggedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.addNextRelationship(beforeBlock, afterBlock);
        }

    }

    spliceInsert = (droppedOnBlockIndex, newDashboardCards) => {
        const insertedBlock = newDashboardCards[droppedOnBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (droppedOnBlockIndex > 0) {
            beforeBlock = newDashboardCards[droppedOnBlockIndex-1];
            this.addNextRelationship(beforeBlock, insertedBlock);
        }
        if (newDashboardCards.length > 0 && droppedOnBlockIndex < (newDashboardCards.length - 1)) {
            afterBlock = newDashboardCards[droppedOnBlockIndex+1];
            this.addNextRelationship(insertedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            this.removeNextRelationship(beforeBlock, afterBlock);
        }
    }

    moveBlock = ({ draggedBlockKey, droppedOnBlockKey, position }) => {
        var draggedBlockIndex = this.dashboardCards.findIndex(x => x.key === draggedBlockKey);
        var droppedOnBlockIndex = this.dashboardCards.findIndex(x => x.key === droppedOnBlockKey);

        if (draggedBlockIndex >= 0 && droppedOnBlockIndex >= 0) {
            if (draggedBlockIndex === droppedOnBlockIndex ||
               (draggedBlockIndex === (droppedOnBlockIndex - 1) && position === 'before')
            ) {
                return;
            }
            var newDashboardCards = this.dashboardCards.slice();

            // update graph data - remove dragged block
            const draggedBlock = this.dashboardCards[draggedBlockIndex];

            this.spliceRemove(draggedBlockIndex, newDashboardCards);

            // update array - remove dragged block
            newDashboardCards.splice(draggedBlockIndex, 1);

            // update array - add back dragged block in new position
            if (draggedBlockIndex < droppedOnBlockIndex && position === 'before') {
                droppedOnBlockIndex--;
            }
            newDashboardCards.splice(droppedOnBlockIndex, 0, draggedBlock);

            // update graph data - add appropriate NEXT relationships
            this.spliceInsert(droppedOnBlockIndex, newDashboardCards);

            this.dashboardCards = newDashboardCards;

            return this.dashboardCards;
        }
        return null;
    }

    getNewBlock = ({ position, scrollIntoView, testDashboardCard }) => {

        var blockNode = this.graphData.createNode({
            key: (testDashboardCard) ? testDashboardCard.key : null,
            primaryNodeLabel: SubgraphNodeLabels.DashboardCard,
            labels: [SubgraphNodeLabels.DashboardCard]
        });

        var newBlock = null;
        if (testDashboardCard) {      // this is to support unit testing
            newBlock = testDashboardCard;
            newBlock.graphNode = blockNode;
        } else {
            var newBlock = this.getNewDashboardCard({
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

        if (this.dashboardCards.length === 0) {
            this.dashboardCards.push(newBlock);
        } else {
            const len = this.dashboardCards.length;
            if (position === 'end' || position >= len) {
                const lastBlock = this.dashboardCards[len-1];
                this.addNextRelationship(lastBlock, newBlock);
                this.dashboardCards.push(newBlock);
            } else {
                var firstBlock = null;
                var secondBlock = this.dashboardCards[position];
                if (len >= 2 && position > 0) {
                    // need to remove NEXT where we are going to do the insert
                    firstBlock = this.dashboardCards[position-1];
                    this.removeNextRelationship(firstBlock, secondBlock);
                }
                if (firstBlock) {
                    this.addNextRelationship(firstBlock, newBlock);
                }
                this.addNextRelationship(newBlock, secondBlock);
                this.dashboardCards.splice(position, 0, newBlock);
            }
        }
        return newBlock;
    }

    addNextRelationship = (startBlock, endBlock, dontNotify) => {
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.NEXT.name,
            startNode: startBlock.graphNode,
            endNode: endBlock.graphNode
        });
        this.graphData.addRelationship(graphRelationship, dontNotify);
    }

    removeNextRelationship = (startBlock, endBlock) => {
        this.graphData
            .findRelationships(startBlock.graphNode, SubgraphRelationshipTypes.NEXT.name, endBlock.graphNode)
            .map(relationship => this.graphData.removeRelationship(relationship));
    }

    addToNodeMap = (itemBlock, graphNode) => {
        this.graphNodeKeyToBlockMap[graphNode.key] = itemBlock;
    }

    addNode = (graphNode, dontNotify) => {
        this.graphData.addNode(graphNode, dontNotify);    

        // we need to add a relationship between the GraphDoc and the DashboardCard
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_DASHBOARD_CARD.name,
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

    getDataSaveObj = () => {

        var graphDataSaveObj = this.getGraphDataSaveObj(this);
        var { idJoiner, graphDocChanges, graphDocDeletions, fromData } = graphDataSaveObj;

        var saveObjs = this.dashboardCards
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
 