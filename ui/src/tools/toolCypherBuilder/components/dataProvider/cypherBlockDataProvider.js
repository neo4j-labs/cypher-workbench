import React, { Component } from 'react'
import uuidv4 from 'uuid/v4';
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';
import { GraphData } from '../../../../dataModel/graphData';
import { serializeObject, deserializeObject }  from '../../../../dataModel/graphUtil';
import { SyncedEventTypes } from '../../../../dataModel/syncedGraphDataAndView';
import { stopListeningTo, listenTo } from '../../../../dataModel/eventEmitter';
import { GraphDocChangeType, GraphViewChangeType } from '../../../../dataModel/graphDataConstants';

import { CypherBlockKeywords } from '../../CypherBuilderRefactor';
import { PersistenceHelper } from '../../../common/persistenceHelper';
import { CanvasConfig } from '../../../common/graphCanvas/canvasConfig';

import { DataMappingDataProvider } from '../../components/dataProvider/dataMappingDataProvider';
import { CypherPatternCanvasDataProvider } from '../../components/dataProvider/cypherPatternCanvasDataProviderRefactor';
import { CypherSnippetDataProvider } from './cypherSnippetDataProvider';
import { WhereClauseDataProvider } from '../../components/dataProvider/whereClauseDataProvider';
import { ReturnClauseDataProvider } from '../../components/dataProvider/returnClauseDataProvider';
import { OrderByClauseDataProvider } from '../../components/dataProvider/orderByClauseDataProvider';
import { SkipClauseDataProvider } from '../../components/dataProvider/skipClauseDataProvider';
import { LimitClauseDataProvider } from '../../components/dataProvider/limitClauseDataProvider';

import DataMappingBlock from '../../../common/mapping/DataMappingBlock';
import CypherPatternBlock from '../cypherBlocks/CypherPatternBlock';
import WhereClauseBlock from '../cypherBlocks/WhereClauseBlock';
import ReturnOrOrderByClauseBlock from '../cypherBlocks/ReturnOrOrderByClauseBlock';
import SkipOrLimitClauseBlock from '../cypherBlocks/SkipOrLimitClauseBlock';

import { getBlocksAffectedByWithInsert, getBlocksAffectedByWithRemove } from './blockHelper';

import {
    loadRemoteGraphDocAndDefaultView,
    deleteRemoteGraphDocAndDefaultView
} from '../../../../persistence/graphql/GraphQLGraphDoc';
import { ALERT_TYPES } from '../../../../common/Constants';
import ScopedBlockProvider from './scopedBlockProvider';
import CypherBlock from './cypherBlock';
import SlateCypherEditorBlock from '../cypherBlocks/SlateCypherEditorBlock';
import BlockUpdateType from './blockUpdateTypes';
import { CypherKeywords } from '../../../../common/parse/cypherKeywords';

const LOCAL_STORAGE_KEY = 'localCypherBuilder';
const REMOTE_GRAPH_DOC_TYPE = 'CypherBuilder';

export const HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE = {
    Init: "Init",
    NewBlock: "NewBlock",
    RemovedBlock: "RemovedBlock",
    InsertWith: "InsertWith",
    RemoveWith: "RemoveWith",
    ConvertBlockInsertWith: "ConvertBlockInsertWith",
    ConvertBlockRemoveWith: "ConvertBlockRemoveWith"
}

const SubgraphNodeLabels = {
    CypherBuilder: "CypherBuilder",
    CypherBlock: "CypherBlock",
    CypherPattern: "CypherPattern",
    DataMapping: "DataMapping",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    NEXT: {
        name: "NEXT",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBlock,
            endNode: SubgraphNodeLabels.CypherBlock
        }]
    },
    CYPHER_PATTERN: {
        name: "CYPHER_PATTERN",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBlock,
            endNode: SubgraphNodeLabels.CypherPattern
        }]
    },
    DATA_MAPPING: {
        name: "DATA_MAPPING",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBlock,
            endNode: SubgraphNodeLabels.DataMapping
        }]
    },
    HAS_CYPHER_BLOCK: {
        name: "HAS_CYPHER_BLOCK",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBuilder,
            endNode: SubgraphNodeLabels.CypherBlock
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.CypherBuilder, 
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
        {nodeLabel: SubgraphNodeLabels.CypherBuilder, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherBlock, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherPattern, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DataMapping, propertyKeys: ["key"]}
    ] 
}  

export class CypherBlockDataProvider {

    graphNodeKeyToCypherBlockMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            //variableScope,
            cypherBlocks,
            //whereClause,
            //returnClause,
            cypherBuilder
        } = properties;
        //this.variableScope = variableScope;
        this.cypherBuilder = cypherBuilder;

        this.scopedBlockProviders = [];

        this.cypherBlocks = (cypherBlocks) ? cypherBlocks : [];
        //this.whereClause = (whereClause) ? whereClause : new WhereClause();
        //this.returnClause = (returnClause) ? returnClause : new ReturnClause();

        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });

        this.handleScopedBlockProviders({
            callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.Init
        });
    }

    data = () => this.graphData;

    getCypherBlocks = () => this.cypherBlocks.slice();

    //getVariableScope = () => this.variableScope;
    //getWhereClause = () => this.whereClause;
    //getReturnClause = () => this.returnClause;

    getLastReturnClause = () => {
        var returnClauses = this.cypherBlocks.filter(block => block.keyword === CypherBlockKeywords.RETURN)
        if (returnClauses.length > 0) {
            var lastReturnClause = returnClauses[returnClauses.length - 1];
            return lastReturnClause.dataProvider.getReturnClause();
        } else {
            return null;
        }
    }

    getLastReturnBlock = () => {
        var returnClauses = this.cypherBlocks.filter(block => block.keyword === CypherBlockKeywords.RETURN)
        if (returnClauses.length > 0) {
            var lastReturnClause = returnClauses[returnClauses.length - 1];
            return lastReturnClause;
        } else {
            return null;
        }
    }

    getSubgraphModel = () => SUBGRAPH_MODEL;
    getRemoteGraphDocType = () => REMOTE_GRAPH_DOC_TYPE;
    getLocalStorageKey = () => LOCAL_STORAGE_KEY;

    dataChanged = (dataChangeType, details) => 
        this.graphData.dataChanged(dataChangeType, details);

    getBlockCypherKeyword = (cypherBlock) => 
        (cypherBlock.dataProvider && cypherBlock.dataProvider.getCypherKeyword) 
        ? cypherBlock.dataProvider.getCypherKeyword() : null;

    createPreviousNextLinks = () => {
        for (var i = 0; i < this.scopedBlockProviders.length; i++) {
            var previous = (i > 0) ? this.scopedBlockProviders[i-1] : null;
            var next = (i < this.scopedBlockProviders.length - 1) ? this.scopedBlockProviders[i+1] : null;
            this.scopedBlockProviders[i].setPreviousScopedBlockProvider(previous);
            this.scopedBlockProviders[i].setNextScopedBlockProvider(next);
        }
    }

    initScopedBlockProviders = (initialArray) => {
        this.scopedBlockProviders = initialArray;
        this.createPreviousNextLinks();
    }

    spliceScopedBlockProviders = (insertIndex, numToRemove, scopedBlockProviderToInsert) => {
        if (scopedBlockProviderToInsert) {
            this.scopedBlockProviders.splice(insertIndex, numToRemove, scopedBlockProviderToInsert);
        } else {
            this.scopedBlockProviders.splice(insertIndex, numToRemove);
        }
        this.createPreviousNextLinks();
    }

    pushScopedBlockProviders = (scopedBlockProvider) => {
        this.scopedBlockProviders.push(scopedBlockProvider);
        this.createPreviousNextLinks();
    }

    handleScopedBlockProviders = (args) => {

        // what do we want to accomplish?
        //   we want to break up the cypherBlocks into scopedBlockProviders such that 
        //   variable scopes are handled properly.  There should be an initial scope, and a scope
        //   for each WITH. If the first block is a WITH then it uses the initial scope.
        
        // We would like to affect as little as possible, so if a change doesn't affect a scope, then 
        //   we shouldn't mess with that scope

        const { cypherBlockKey, callMode } = args;

        const affectedBlockIndex = this.cypherBlocks.findIndex(block => block.key === cypherBlockKey);
        //console.log('affectedBlockIndex: ', affectedBlockIndex);
        if (affectedBlockIndex === -1 || callMode === HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.Init) {
            // affects all blocks
            this.handleInitBlocks();
        } else {
            var blockGroups = this.scopedBlockProviders.map(x => x.cypherBlocks);
            switch (callMode) {
                case HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.ConvertBlockInsertWith:
                    this.handleConvertBlockInsertWith(blockGroups, affectedBlockIndex);
                    break;
                case HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.ConvertBlockRemoveWith:
                    this.handleConvertBlockRemoveWith(blockGroups, affectedBlockIndex);
                    break;
                case HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.RemovedBlock:
                    this.handleRemovedBlock(blockGroups, args);
                    break;
                case HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.NewBlock:
                    this.handleNewBlock(blockGroups, args);
                    break;
            }
        }

        // need the check for this.cypherBuilder.updateCypher, because this can get called before
        //   this.cypherBuilder is fully constructed, meaning it is not null, but doesn't have
        //   all of its methods yet
        if (this.cypherBuilder && this.cypherBuilder.updateCypher) {
            this.cypherBuilder.updateCypher();
        }
    }

    getDataMappingInfo = () => {
        var projectId;
        var dataMappingBlocks = [];
        const createMergeBlocks = this.getCreateMergeBlocks();
        if (createMergeBlocks.length >= 0) {
            createMergeBlocks
                .map(x => x.dataProvider)
                .map(dataProvider => {
                    const providerProjectId = dataProvider.getProjectId();
                    if (providerProjectId) {
                        projectId = providerProjectId;
                    }
                    dataMappingBlocks.push({
                        datasetId: dataProvider.getDatasetId(), 
                        tableDefinition: dataProvider.getTableDefinition(), 
                        dataMappings: dataProvider.getDataMappings(),
                        cypherPattern: dataProvider.getCypherPattern()
                    });
                });
        }
        dataMappingBlocks = dataMappingBlocks.filter(x => x.datasetId 
                && x.tableDefinition
                && x.dataMappings
                && x.dataMappings.length > 0);

        return {
            projectId,
            dataMappingBlocks
        }
    }

    getCreateMergeBlocks = () => this.cypherBlocks.filter(block => 
                block.keyword === CypherBlockKeywords.MERGE
                || block.keyword === CypherBlockKeywords.CREATE);

    getNewScopedBlockProvider = (args) => {
        args = args || {};
        args = { 
            cypherBuilder: this.cypherBuilder,
            cypherBlockDataProvider: this,
            ...args
        }
        return new ScopedBlockProvider(args);                
    }

    handleInitBlocks = () => {
        // first break up cypher blocks into scopedBlockProviders
        var blockGroup = null;
        var blockGroups = [];

        // create a new block for every WITH
        this.cypherBlocks.map((cypherBlock, i) => {
            if (i === 0) {
                blockGroup = [];
                blockGroups.push(blockGroup);
                blockGroup.push(cypherBlock);
            } else {
                if (this.getBlockCypherKeyword(cypherBlock) === 'WITH') {
                    blockGroup = [];
                    blockGroups.push(blockGroup);
                } 
                blockGroup.push(cypherBlock);
            }
        });
        //console.log('blockGroups: ', blockGroups);

        // add ScopedBlockProviders as necessary
        blockGroups.map((blockGroup, i) => {
            var scopedBlockProvider = this.scopedBlockProviders[i];
            if (!scopedBlockProvider) {
                scopedBlockProvider = this.getNewScopedBlockProvider();
                this.pushScopedBlockProviders(scopedBlockProvider);
            }
            //scopedBlockProvider.setCypherBlocks(blockGroup, { skipUpdate: true });
            scopedBlockProvider.setCypherBlocks(blockGroup);
        });

        // if too many, delete extra ScopedBlockProviders
        if (this.scopedBlockProviders.length > blockGroups.length) {
            this.spliceScopedBlockProviders(blockGroups.length, this.scopedBlockProviders.length - blockGroups.length);
        }
    }

    amInsertingAtFirstGroupFirstBlock = (resultObj) => {
        const { affectedBlockGroupIndex, indexWithinBlock } = resultObj;
        return affectedBlockGroupIndex === 0 && indexWithinBlock === 0;
    }

    isFirstGroupFirstBlockWith = () => {
        if (this.scopedBlockProviders.length > 0) {
            const cypherBlocks = this.scopedBlockProviders[0].getCypherBlocks();
            if (cypherBlocks.length > 0) {
                return cypherBlocks[0].isWith();
            }
        }
        return false;
    }

    handleInsertWith = (blockGroups, newBlock, affectedBlockIndex) => {
        var affectedBlocks = [];
        var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
        //console.log('handleInsertWith blockGroups: ', blockGroups)
        var resultObj = getBlocksAffectedByWithInsert(blockGroups, affectedBlockIndex);
        //console.log('resultObj: ', resultObj);
        affectedBlocks = resultObj.affectedBlocks;
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        if (affectedBlockGroupIndex === -1) {
            //console.log(" >> AA")
            if (this.scopedBlockProviders.length > 1) {
                console.log("WARNING: Couldn't find scopedBlock to update scope");
            }
            var scopedBlockProvider = this.getNewScopedBlockProvider();
            this.initScopedBlockProviders([scopedBlockProvider]);
            scopedBlockProvider.setCypherBlocks(this.cypherBlocks);
        } else {
            //console.log(" >> BB")
            if (this.amInsertingAtFirstGroupFirstBlock(resultObj) && !this.isFirstGroupFirstBlockWith()) {
                //console.log(" >> CC")
                //  we need to assume the main scope and not create a new scope
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.setCypherBlocks([newBlock].concat(affectedBlocks));
            } else {
                //console.log(" >> DD")
                // do normally
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.setCypherBlocks(affectedScopedBlockProvider.getCypherBlocks().slice(0,indexWithinBlock));
                var newScopedBlockProvider = this.getNewScopedBlockProvider();
                // Note: must splice into this.scopedBlockProviders first, otherwise 
                //   subsequent updates from setCypherBlocks won't find the new scope
                this.spliceScopedBlockProviders(affectedBlockGroupIndex + 1, 0, newScopedBlockProvider);
                newScopedBlockProvider.setCypherBlocks([newBlock].concat(affectedBlocks));
            }
        }
    }

    handleConvertBlockInsertWith = (blockGroups, affectedBlockIndex) => {
        //console.log('blockGroups: ', blockGroups);
        //console.log('affectedBlockIndex: ', affectedBlockIndex);

        var affectedBlocks = [];
        var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
        var resultObj = getBlocksAffectedByWithInsert(blockGroups, affectedBlockIndex, true);
        //console.log('resultObj: ', resultObj);
        affectedBlocks = resultObj.affectedBlocks;
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        if (affectedBlockGroupIndex === -1) {
            if (this.scopedBlockProviders.length > 1) {
                console.log("WARNING: Couldn't find scopedBlock to update scope");
            }
            var scopedBlockProvider = this.getNewScopedBlockProvider();
            this.initScopedBlockProviders([scopedBlockProvider]);
            scopedBlockProvider.setCypherBlocks(this.cypherBlocks);
        } else {
            if (this.amInsertingAtFirstGroupFirstBlock(resultObj)) {
                // since we are converting the first existing block to a WITH, 
                //  we need to assume the main scope and not create a new scope
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.setCypherBlocks(affectedBlocks);
            } else {
                // do normally
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.setCypherBlocks(affectedScopedBlockProvider.getCypherBlocks().slice(0,indexWithinBlock));
                var newScopedBlockProvider = this.getNewScopedBlockProvider();
                // Note: must splice into this.scopedBlockProviders first, otherwise 
                //   subsequent updates from setCypherBlocks won't find the new scope
                this.spliceScopedBlockProviders(affectedBlockGroupIndex + 1, 0, newScopedBlockProvider);
                newScopedBlockProvider.setCypherBlocks(affectedBlocks);
            }
        }
    }

    // when this gets called, this.cypherBlocks still contains blockToRemove
    handleRemoveWith = (blockGroups, blockToRemove, affectedBlockIndex) => {
        var affectedBlocks = [];
        var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
        var resultObj = getBlocksAffectedByWithRemove(blockGroups, affectedBlockIndex);
        //console.log('resultObj: ', resultObj);
        affectedBlocks = resultObj.affectedBlocks;
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        if (affectedBlockGroupIndex === -1) {
            //console.log(" >> AA")
            if (this.scopedBlockProviders.length > 1) {
                console.log("WARNING: Couldn't find scopedBlock to update scope");
            }
            var scopedBlockProvider = this.getNewScopedBlockProvider();
            this.initScopedBlockProviders([scopedBlockProvider]);
            var newBlocks = this.cypherBlocks.filter(block => block.key !== blockToRemove.key);
            scopedBlockProvider.setCypherBlocks(newBlocks);
        } else {
            if (affectedBlockGroupIndex !== 0) {
                //console.log(" >> BB")
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex-1];
                this.spliceScopedBlockProviders(affectedBlockGroupIndex, 1); 
                affectedScopedBlockProvider.setCypherBlocks(affectedScopedBlockProvider.getCypherBlocks().concat(affectedBlocks));
            } else {
                //console.log(" >> CC")
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.removeBlockByIndex(indexWithinBlock);
                if (affectedScopedBlockProvider.getCypherBlocks().length === 0) {
                    this.spliceScopedBlockProviders(affectedBlockGroupIndex, 1);
                }
            }
        }
    }

    handleConvertBlockRemoveWith = (blockGroups, affectedBlockIndex) => {
        var affectedBlocks = [];
        var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
        var resultObj = getBlocksAffectedByWithRemove(blockGroups, affectedBlockIndex, true);
        affectedBlocks = resultObj.affectedBlocks;
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        if (affectedBlockGroupIndex === -1) {
            if (this.scopedBlockProviders.length > 1) {
                console.log("WARNING: Couldn't find scopedBlock to update scope");
            }
            var scopedBlockProvider = this.getNewScopedBlockProvider();
            this.initScopedBlockProviders([scopedBlockProvider]);
            scopedBlockProvider.setCypherBlocks(this.cypherBlocks);
        } else {
            if (affectedBlockGroupIndex !== 0) {
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex-1];
                // Note: must splice remove this.scopedBlockProviders first, otherwise 
                //   subsequent updates from setCypherBlocks may find the wrong scope
                this.spliceScopedBlockProviders(affectedBlockGroupIndex, 1);
                affectedScopedBlockProvider.setCypherBlocks(affectedScopedBlockProvider.getCypherBlocks().concat(affectedBlocks));
            } else {
                // nothing to do: the scope remains the same because its the first block
            }
        }
    }

    // this should be called before removing from this.cypherBlocks
    handleRemovedBlock = (blockGroups, args) => {
        const { blockToRemove, removeIndex } = args || {};

        //console.log('handleRemovedBlock args: ', args);
        if (blockToRemove.isWith()) {
            //console.log('isWith: true');
            this.handleRemoveWith(blockGroups, blockToRemove, removeIndex);
        } else {
            //console.log('isWith: false');
            var { affectedBlockGroupIndex, indexWithinBlock } = getBlocksAffectedByWithRemove(blockGroups, removeIndex, true);
            if (affectedBlockGroupIndex !== -1) {
                //console.log('affectedBlockGroupIndex: ', affectedBlockGroupIndex);
                var affectedScopedBlockProvider = this.scopedBlockProviders[affectedBlockGroupIndex];
                affectedScopedBlockProvider.removeBlockByIndex(indexWithinBlock);
                if (affectedScopedBlockProvider.getCypherBlocks().length === 0 && this.scopedBlockProviders.length === 1) {
                    this.initScopedBlockProviders([]);
                }
            } else {
                throw new Error("handleRemovedBlock: can't find scopedBlock");
            }
        }
    }

    // calling this assumes the block has already been inserted into this.cypherBlocks
    handleNewBlock = (blockGroups, args) => {
        const { newBlock, insertIndex } = args || {};
        if (newBlock.isWith()) {
            //console.log('new block is with, insertIndex: ', insertIndex);
            this.handleInsertWith(blockGroups, newBlock, insertIndex);
        } else {
            //console.log('new block is not with, insertIndex: ', insertIndex);
            var { affectedBlockGroupIndex, indexWithinBlock } = getBlocksAffectedByWithInsert(blockGroups, insertIndex);
            if (affectedBlockGroupIndex === -1) {
                if (this.scopedBlockProviders.length > 1) {
                    console.log("WARNING: Couldn't find scopedBlock to update scope");
                }
                var scopedBlockProvider = this.getNewScopedBlockProvider();
                this.initScopedBlockProviders([scopedBlockProvider]);
                scopedBlockProvider.setCypherBlocks(this.cypherBlocks);
            } else {
                this.scopedBlockProviders[affectedBlockGroupIndex].addBlockAtIndex(indexWithinBlock, newBlock);
            }
        }
    }

    setDataModel = (dataModel) => {
        this.dataModel = dataModel;
    }

    setDataModelKey = (dataModelKey) => {
        var rootNode = this.graphData.getGraphRootNode();
        rootNode.addOrUpdateProperty("dataModelKey", dataModelKey, DataTypes.String);
    }

    setCypherSnippetOnRootNode = () => {
        var rootNode = this.graphData.getGraphRootNode();
        var cypher = this.getCypher() || '';
        cypher = cypher.substring(0,512);   // limit saves in case of large cypher statements 
        var existingCypher = rootNode.getPropertyValueByKey("cypherStatement");
        if (cypher !== existingCypher) {
            rootNode.addOrUpdateProperty("cypherStatement", cypher, DataTypes.String);
            const cypherSearchText = cypher.replace(/\W+/g, ' ');
            rootNode.addOrUpdateProperty("cypherStatementSearchText", cypherSearchText, DataTypes.String);
        }
    }

    getDataModel = () => this.dataModel;

    getDataModelKey = () => {
        var rootNode = this.graphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey("dataModelKey");
    }

    loadDataMapping = ({graphNode, dataMappingNode, 
        deserializedSyncedGraphDataAndView, passThroughData
    }) => {
        return new Promise((resolve, reject) => {
            if (deserializedSyncedGraphDataAndView) {
                this.cypherBuilder.setStatus('', false);
                resolve({
                    patternReturnObj: this.getLoadedCreateMergeBlock({
                        createMergeBlockGraphNode: graphNode,
                        cypherKeyword: passThroughData.keyword,
                        dataMappingNode: dataMappingNode,
                        deserializedSyncedGraphDataAndView
                    }),
                    passThroughData
                });
            } else {
                loadRemoteGraphDocAndDefaultView(dataMappingNode.key, (response) => {
                    //console.log(response);
                    if (response.success === false) {
                        var message = "Error loading data mapping: " + response.error;
                        this.cypherBuilder.setStatus(message, false);
                        alert(message);
                        reject(message);
                    } else {
                        this.cypherBuilder.setStatus('', false);
                        resolve({
                            patternReturnObj: this.getLoadedCreateMergeBlock({
                                createMergeBlockGraphNode: graphNode,
                                cypherKeyword: passThroughData.keyword,
                                dataMappingNode: dataMappingNode,
                                graphDocAndViewResponse: response,
                            }),
                            passThroughData
                        });
                    }
                });
            }
        });
    }

    loadCypherPattern = ({graphNode, cypherPatternNode, 
        deserializedSyncedGraphDataAndView, passThroughData
    }) => {
        return new Promise((resolve, reject) => {
            if (deserializedSyncedGraphDataAndView) {
                this.cypherBuilder.setStatus('', false);
                resolve({
                    patternReturnObj: this.getLoadedMatchBlock({
                        matchBlockGraphNode: graphNode,
                        cypherKeyword: passThroughData.keyword,
                        cypherPatternNode: cypherPatternNode,
                        deserializedSyncedGraphDataAndView
                    }),
                    passThroughData
                });
            } else {
                loadRemoteGraphDocAndDefaultView(cypherPatternNode.key, (response) => {
                    //console.log(response);
                    if (response.success === false) {
                        var message = "Error loading cypher pattern: " + response.error;
                        this.cypherBuilder.setStatus(message, false);
                        alert(message);
                        reject(message);
                    } else {
                        this.cypherBuilder.setStatus('', false);
                        resolve({
                            patternReturnObj: this.getLoadedMatchBlock({
                                matchBlockGraphNode: graphNode,
                                cypherKeyword: passThroughData.keyword,
                                cypherPatternNode: cypherPatternNode,
                                graphDocAndViewResponse: response,
                            }),
                            passThroughData
                        });
                    }
                });
            }
        });
    }

    fromSaveObject = ({graphDocObj, serializedSaveObject, keepDataChangeFlags}, callback) => {
        //console.log("cypherBlockDataProvider fromSaveObject: ", graphDocObj);
        this.graphNodeKeyToCypherBlockMap = {};       
        
        var deserializedSaveObject = null;
        if (serializedSaveObject) {
            deserializedSaveObject = deserializeObject(serializedSaveObject);
            this.cypherBuilder.removeListenerBeforeDeserialize(this);
            this.graphData = deserializedSaveObject.graphData;
            this.cypherBuilder.addListenerAfterDeserialize(this);           
        } else {
            this.graphData.fromSaveObject(graphDocObj);
        }

        //this.variableScope.clearVariables();
        this.cypherBlocks = [];

        // get SubgraphNodeLabels.CypherPattern nodes
        // get SubgraphRelationshipTypes.CYPHER_PATTERN relationships
        // use these to re-fetch/re-build cypherPatternCanvasDataProvider
        var cypherPatternNodes = this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.CypherPattern))

        var cypherPatternRelationships = this.graphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.CYPHER_PATTERN.name)

        // get SubgraphNodeLabels.DataMapping nodes
        // get SubgraphRelationshipTypes.DATA_MAPPING relationships
        // use these to re-fetch/re-build dataMappingDataProvider
        var dataMappingNodes = this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.DataMapping))

        var dataMappingRelationships = this.graphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.DATA_MAPPING.name)

        var promises = this.graphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.CypherBlock))
            .map((graphNode) => {
                var expanded = graphNode.getPropertyValueByKey('expanded', true);
                var selected = graphNode.getPropertyValueByKey('selected', false);
                var keyword = graphNode.getPropertyValueByKey('keyword');

                var returnObjPromise = null;

                var cypherPatternRelationship = cypherPatternRelationships.find(x => x.getStartNode().key === graphNode.key);
                if (cypherPatternRelationship) {
                    var cypherPatternNode = cypherPatternNodes.find(x => x.key === cypherPatternRelationship.getEndNode().key);
                    //console.log('cypherPatternNode: ', cypherPatternNode);
                    if (cypherPatternNode) {
                        var deserializedSyncedGraphDataAndView = null;
                        if (deserializedSaveObject) {
                            deserializedSyncedGraphDataAndView = deserializedSaveObject.blockGraphs[cypherPatternRelationship.getStartNode().key];
                        }
                        returnObjPromise = this.loadCypherPattern({
                            graphNode, 
                            cypherPatternNode, 
                            deserializedSyncedGraphDataAndView,
                            passThroughData: {
                                graphNode: graphNode,
                                expanded: expanded,
                                selected: selected,
                                keyword: keyword
                            }
                        });
                        // TODO: get error block
                    } 
                } else {
                    var dataMappingRelationship = dataMappingRelationships.find(x => x.getStartNode().key === graphNode.key);
                    if (dataMappingRelationship) {
                        var dataMappingNode = dataMappingNodes.find(x => x.key === dataMappingRelationship.getEndNode().key);
                        if (dataMappingNode) {
                            var deserializedSyncedGraphDataAndView = null;
                            if (deserializedSaveObject) {
                                deserializedSyncedGraphDataAndView = deserializedSaveObject.blockGraphs[dataMappingRelationship.getStartNode().key];
                            }
                            returnObjPromise = this.loadDataMapping({
                                graphNode, 
                                dataMappingNode, 
                                deserializedSyncedGraphDataAndView,
                                passThroughData: {
                                    graphNode: graphNode,
                                    expanded: expanded,
                                    selected: selected,
                                    keyword: keyword
                                }
                            });
                        }
                    }
                }
                if (!returnObjPromise) {
                    returnObjPromise = new Promise((resolve, reject) => resolve({
                        passThroughData: {
                            graphNode: graphNode,
                            expanded: expanded,
                            selected: selected,
                            keyword: keyword
                        }
                    }));   
                }
                return returnObjPromise;
            });

        Promise.all(promises).then((responses) => {
            //console.log('responses: ', responses);

            responses.map(response => {
                var { patternReturnObj, passThroughData } = response;
                var { graphNode, expanded, selected, keyword } = passThroughData;

                var dataProvider = null, blockElement = null, ref = null;
                if (patternReturnObj) {
                    dataProvider = patternReturnObj.dataProvider;
                    ref = patternReturnObj.ref;
                    blockElement = patternReturnObj.blockElement;
                }
    
                var cypherBlock = null;
                if (blockElement) {
                    cypherBlock = new CypherBlock({
                        key: graphNode.key,
                        title: keyword,
                        expanded: expanded,
                        selected: selected,
                        showToggleTool: true,
                        keyword: keyword,
                        ref: ref,
                        blockElement: blockElement,
                        graphNode: graphNode,
                        dataProvider: dataProvider,
                    });        
                } else {
                    cypherBlock = this.getNewCypherBlock({key: graphNode.key, keyword, expanded, selected, graphNode});                
                }
                this.addToNodeMap(cypherBlock, graphNode);
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
                this.cypherBlocks.push(this.graphNodeKeyToCypherBlockMap[startKey]);
    
                for (var i = 0; i <= startNodeKeys.length; i++) {
                    var nextRel = nextRelationships.find(x => x.getStartNode().key === startKey);
                    if (nextRel) {
                        var nextKey = nextRel.getEndNode().key;
                        this.cypherBlocks.push(this.graphNodeKeyToCypherBlockMap[nextKey]);
                        startKey = nextKey;
                    }
                }
            } else {
                var blocks = Object.values(this.graphNodeKeyToCypherBlockMap);
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
            this.handleScopedBlockProviders({
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.Init
            });

            if (callback) {
                callback();
            }
        });
    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.graphData.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.graphData.getEventEmitter();

    getNewDataMappingDataProvider = ({key, cypherKeyword, cypherBlockKey, createMergeRef }) => {
        var dataMappingDataProvider = new DataMappingDataProvider({
            id: (key) ? key : uuidv4(),
            cypherBlockKey: cypherBlockKey,
            cypherKeyword: cypherKeyword,
            dataMappingBlockRef: createMergeRef,
            cypherBuilder: this.cypherBuilder,
            cypherBlockDataProvider: this
        });
        listenTo(dataMappingDataProvider, dataMappingDataProvider.id, this.dataChangeListener);
        return dataMappingDataProvider;
    }

    getNewCypherPatternCanvasDataProvider = ({ key, cypherKeyword, cypherBlockKey, matchRef }) => {
        var cypherPatternCanvasDataProvider = new CypherPatternCanvasDataProvider({
            id: (key) ? key : uuidv4(),
            cypherBlockKey: cypherBlockKey,
            cypherKeyword: cypherKeyword,
            cypherPatternBlockRef: matchRef,
            cypherBuilder: this.cypherBuilder,
            cypherBlockDataProvider: this
        });
        listenTo(cypherPatternCanvasDataProvider, cypherPatternCanvasDataProvider.id, this.dataChangeListener);
        return cypherPatternCanvasDataProvider;
    }

    removeListenerBeforeDeserialize = (cypherBlockDataProvider) =>
        stopListeningTo(cypherBlockDataProvider, cypherBlockDataProvider.id);

    addListenerAfterDeserialize = (cypherBlockDataProvider) => 
        listenTo(cypherBlockDataProvider, cypherBlockDataProvider.id, this.dataChangeListener, true);

    getNewCreateMergeBlock = (key, keyword, createMergeBlockGraphNode) => {
        const createMergeRef = React.createRef();

        var dataMappingDataProvider = this.getNewDataMappingDataProvider({
            cypherKeyword: keyword,
            cypherBlockKey: createMergeBlockGraphNode.key,
            createMergeRef : createMergeRef 
        });        
        var graphDataView = dataMappingDataProvider.data().getGraphDataView();

        var canvasConfig = new CanvasConfig({
            dataProvider: dataMappingDataProvider
        });

        var persistenceHelper = new PersistenceHelper({
            graphDocContainer: this.cypherBuilder,
            getNetworkStatus: this.cypherBuilder.props.getNetworkStatus,
            LOCAL_STORAGE_KEY: dataMappingDataProvider.getLocalStorageKey(),
            REMOTE_GRAPH_DOC_TYPE: dataMappingDataProvider.getRemoteGraphDocType(),
            SUBGRAPH_MODEL: dataMappingDataProvider.getSubgraphModel()
        });

        persistenceHelper.saveRemoteGraphDocWithView (dataMappingDataProvider.id, graphDataView, this.graphData.id, (response) => {
            if (response.success) {
                //console.log("getNewMatchBlock: saveRemoteGraphDocWithView: ", response);
                const cypherPatternRootNode = dataMappingDataProvider.data().getGraphData().getGraphRootNode();
                var graphRelationship = this.graphData.createRelationship({
                    type: SubgraphRelationshipTypes.DATA_MAPPING.name,
                    startNode: createMergeBlockGraphNode,
                    endNode: cypherPatternRootNode
                });
                this.graphData.addRelationship(graphRelationship);
            } else {
                const errorMessage = (response.error && response.error.message) ? response.error.message : `${response.error}`;
                alert(`Error getting new ${keyword} block: ${errorMessage}`);
                return null;
            }
        });

        const keyValue = `create_merge_${key}`;
        
        const blockElement =
            <DataMappingBlock
                key={keyValue}
                ref={createMergeRef}
                cypherBlockKey={key}
                blockId={keyValue}
                showDataSourceArea={true}
                viewSettings={{}}
                getDataProvider={() => dataMappingDataProvider}
                dataChangeListener={this.dataChangeListener}
                canvasConfig={canvasConfig}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: dataMappingDataProvider,
            ref: createMergeRef,
            blockElement: blockElement
        };
    }
    
    getNewMatchBlock = (key, keyword, matchBlockGraphNode) => {
        const matchRef = React.createRef();

        var cypherPatternCanvasDataProvider = this.getNewCypherPatternCanvasDataProvider({
            cypherKeyword: keyword,
            cypherBlockKey: matchBlockGraphNode.key,
            matchRef : matchRef 
        });        
        var graphDataView = cypherPatternCanvasDataProvider.data().getGraphDataView();

        var canvasConfig = new CanvasConfig({
            dataProvider: cypherPatternCanvasDataProvider,
            // This will be set when CypherPatternBlock loads
            //containerCallback: this.cypherBuilder.canvasCallback
        });

        var persistenceHelper = new PersistenceHelper({
            graphDocContainer: this.cypherBuilder,
            getNetworkStatus: this.cypherBuilder.props.getNetworkStatus,
            LOCAL_STORAGE_KEY: cypherPatternCanvasDataProvider.getLocalStorageKey(),
            REMOTE_GRAPH_DOC_TYPE: cypherPatternCanvasDataProvider.getRemoteGraphDocType(),
            SUBGRAPH_MODEL: cypherPatternCanvasDataProvider.getSubgraphModel()
        });

        persistenceHelper.saveRemoteGraphDocWithView (cypherPatternCanvasDataProvider.id, graphDataView, this.graphData.id, (response) => {
            if (response.success) {
                //console.log("getNewMatchBlock: saveRemoteGraphDocWithView: ", response);
                const cypherPatternRootNode = cypherPatternCanvasDataProvider.data().getGraphData().getGraphRootNode();
                var graphRelationship = this.graphData.createRelationship({
                    type: SubgraphRelationshipTypes.CYPHER_PATTERN.name,
                    startNode: matchBlockGraphNode,
                    endNode: cypherPatternRootNode
                });
                this.graphData.addRelationship(graphRelationship);
            } else {
                const errorMessage = (response.error && response.error.message) ? response.error.message : `${response.error}`;
                alert(`Error getting new ${keyword} block: ${errorMessage}`);
                return null;
            }
        });

        const keyValue = `match_${key}`;
        
        const blockElement =
            <CypherPatternBlock
                key={keyValue}
                ref={matchRef}
                cypherBlockKey={key}
                blockId={keyValue}
                viewSettings={{}}
                dataProvider={cypherPatternCanvasDataProvider}
                dataChangeListener={this.dataChangeListener}
                canvasConfig={canvasConfig}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: cypherPatternCanvasDataProvider,
            ref: matchRef,
            blockElement: blockElement
        };
    }

    getScopedBlockProviders = () => this.scopedBlockProviders;        

    getScopedBlockProvider = (cypherBlockKey) => 
        this.scopedBlockProviders.find(scopedProvider => scopedProvider.containsCypherBlock(cypherBlockKey));

    getNewCypherSnippetBlock = (key, blockGraphNode) => {
        const ref = React.createRef();

        const keyValue = `cypher_${key}`;

        const dataProvider = new CypherSnippetDataProvider({
            graphNode: blockGraphNode,
            cypherBlockDataProvider: this,
            cypherBlockKey: key,
            cypherBuilder: this.cypherBuilder
        });

        const blockElement =
            <SlateCypherEditorBlock 
                key={keyValue}
                cypherBlockKey={key}
                blockId={keyValue}
                dataProvider={dataProvider}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: dataProvider,
            blockElement: blockElement
        };
    }

    getNewWhereBlock = (key, blockGraphNode) => {
        const ref = React.createRef();

        const keyValue = `where_${key}`;

        const dataProvider = new WhereClauseDataProvider({
            graphNode: blockGraphNode,
            cypherBlockDataProvider: this,
            cypherBlockKey: key,
            cypherBuilder: this.cypherBuilder,
            ref: ref
        });

        const blockElement =
            <WhereClauseBlock 
                key={keyValue}
                cypherBlockKey={key}
                blockId={keyValue}
                ref={ref} 
                dataProvider={dataProvider}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: dataProvider,
            ref: ref,
            blockElement: blockElement
        };
    }

    getNewSkipOrLimitBlock = (key, blockKeyword, blockGraphNode) => {
        const ref = React.createRef();

        const keyValuePrefix = blockKeyword.toLowerCase();
        const keyValue = `${keyValuePrefix}_${key}`;

        const dataProviderArgs = {
            graphNode: blockGraphNode,
            cypherBlockDataProvider: this,
            cypherBlockKey: key,
            cypherBuilder: this.cypherBuilder,
            ref: ref
        };

        const dataProvider = (blockKeyword === CypherBlockKeywords.SKIP)
                        ? new SkipClauseDataProvider(dataProviderArgs)
                        : new LimitClauseDataProvider(dataProviderArgs);

        const blockElement =
            <SkipOrLimitClauseBlock 
                key={keyValue}
                cypherBlockKey={key}
                blockId={keyValue}
                blockKeyword={blockKeyword}
                ref={ref} 
                dataProvider={dataProvider}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: dataProvider,
            ref: ref,
            blockElement: blockElement
        };
    }

    getNewReturnOrOrderByBlock = (key, blockKeyword, blockGraphNode) => {
        const ref = React.createRef();

        const keyValuePrefix = blockKeyword.toLowerCase().replace(/ /,'_');
        const keyValue = `${keyValuePrefix}_${key}`;

        const dataProviderArgs = {
            graphNode: blockGraphNode,
            cypherBlockDataProvider: this,
            cypherBlockKey: key,
            cypherBuilder: this.cypherBuilder,
            ref: ref
        };

        const dataProvider = (blockKeyword === CypherBlockKeywords.RETURN)
                        ? new ReturnClauseDataProvider(dataProviderArgs)
                        : new OrderByClauseDataProvider(dataProviderArgs);

        const blockElement =
            <ReturnOrOrderByClauseBlock 
                key={keyValue}
                cypherBlockKey={key}
                blockId={keyValue}
                blockKeyword={blockKeyword}
                ref={ref} 
                dataProvider={dataProvider}
                cypherBuilder={this.cypherBuilder}
                dataModelKey={this.getDataModelKey()}
                dataModel={this.getDataModel()}
            />

        return {
            dataProvider: dataProvider,
            ref: ref,
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
                this.cypherBuilder.calculatePageSize();
            } 
        } else if (messageName === SyncedEventTypes.GraphDataViewEvent) {
            if (messagePayload.messageName === GraphViewChangeType.CanvasTransformUpdate) {
                // messagePayload.id is graphViewRootNode key
                var block = this.cypherBlocks
                    .filter(x => x.dataProvider instanceof CypherPatternCanvasDataProvider
                              || x.dataProvider instanceof DataMappingDataProvider) 
                    .find(x => x.dataProvider.data().getGraphDataView().getGraphViewRootNode().key === messagePayload.id)

                if (this.blockHasCurrentRef(block)) {
                    const viewSettings = block.ref.current.getGraphCanvas().getViewSettings();
                    const viewSettingsJson = JSON.stringify(viewSettings);
                    block.graphNode.addOrUpdateProperty("displayCanvasViewSettings", viewSettingsJson, DataTypes.String);
                }
                messageHandled = true;
            }            
        } 
        if (!messageHandled) {
            this.cypherBuilder.dataChangeListener(id, messageName, messagePayload);            
        }
    }

    getLoadedCreateMergeBlock = ({graphDocAndViewResponse, 
        deserializedSyncedGraphDataAndView,
        cypherKeyword, dataMappingNode, createMergeBlockGraphNode
    }) => {
        const createMergeRef = React.createRef();

        var dataMappingDataProvider = this.getNewDataMappingDataProvider({
            key: dataMappingNode.key, 
            cypherKeyword: cypherKeyword,
            cypherBlockKey: createMergeBlockGraphNode.key,
            createMergeRef: createMergeRef 
        });        
        dataMappingDataProvider.fromSaveObject({
            graphDocObj: graphDocAndViewResponse,
            deserializedSyncedGraphDataAndView
        });
        dataMappingDataProvider.setIsRemotelyPersisted(true);

        const canvasHeight = createMergeBlockGraphNode.getPropertyValueByKey("displayCanvasHeight");
        const viewSettingsString = createMergeBlockGraphNode.getPropertyValueByKey("displayCanvasViewSettings");
        const canvasViewSettings = (viewSettingsString) ? JSON.parse(viewSettingsString) : {};
        const viewSettings = { 
            cypherViewSettings: { canvasHeight: canvasHeight },
            canvasViewSettings: canvasViewSettings
        };

        var canvasConfig = new CanvasConfig({
            dataProvider: dataMappingDataProvider
        });

        const keyValue = `create_merge_${createMergeBlockGraphNode.key}`;
        
        const blockElement =
            <DataMappingBlock
                key={keyValue}
                ref={createMergeRef}
                cypherBlockKey={createMergeBlockGraphNode.key}
                blockId={keyValue}
                showDataSourceArea={true}                
                viewSettings={viewSettings}
                dataProvider={dataMappingDataProvider}
                dataChangeListener={this.dataChangeListener}
                canvasConfig={canvasConfig}
                parentContainer={this.cypherBuilder}
            />

        return {
            dataProvider: dataMappingDataProvider,
            ref: createMergeRef,
            blockElement: blockElement
        };
    }

    getLoadedMatchBlock = ({graphDocAndViewResponse, 
        deserializedSyncedGraphDataAndView,
        cypherKeyword, cypherPatternNode, matchBlockGraphNode
    }) => {
        const matchRef = React.createRef();

        var cypherPatternCanvasDataProvider = this.getNewCypherPatternCanvasDataProvider({
            key: cypherPatternNode.key, 
            cypherKeyword: cypherKeyword,
            cypherBlockKey: matchBlockGraphNode.key,
            matchRef: matchRef 
        });        
        cypherPatternCanvasDataProvider.fromSaveObject({
            graphDocObj: graphDocAndViewResponse,
            deserializedSyncedGraphDataAndView
        });
        cypherPatternCanvasDataProvider.setIsRemotelyPersisted(true);

        const canvasHeight = matchBlockGraphNode.getPropertyValueByKey("displayCanvasHeight");
        const viewSettingsString = matchBlockGraphNode.getPropertyValueByKey("displayCanvasViewSettings");
        const canvasViewSettings = (viewSettingsString) ? JSON.parse(viewSettingsString) : {};
        const viewSettings = { 
            cypherViewSettings: { canvasHeight: canvasHeight },
            canvasViewSettings: canvasViewSettings
        };

        var canvasConfig = new CanvasConfig({
            dataProvider: cypherPatternCanvasDataProvider,
            // This will be set when CypherPatternBlock loads
            //containerCallback: this.cypherBuilder.canvasCallback
        });

        const keyValue = `match_${matchBlockGraphNode.key}`;
        
        const blockElement =
            <CypherPatternBlock
                key={keyValue}
                ref={matchRef}
                cypherBlockKey={matchBlockGraphNode.key}
                blockId={keyValue}
                viewSettings={viewSettings}
                dataProvider={cypherPatternCanvasDataProvider}
                dataChangeListener={this.dataChangeListener}
                canvasConfig={canvasConfig}
                parentContainer={this.cypherBuilder}
            />

        return {
            dataProvider: cypherPatternCanvasDataProvider,
            ref: matchRef,
            blockElement: blockElement
        };
    }

    getNewCypherBlock = ({key, keyword, expanded, selected, graphNode, position, scrollIntoView}) => {
        var returnObj = null;
        var showToggleTool = false;
        switch (keyword) {
            case CypherBlockKeywords.CYPHER:
                returnObj = this.getNewCypherSnippetBlock(key, graphNode); 
                break;
            case CypherBlockKeywords.CREATE:
                returnObj = this.getNewCreateMergeBlock(key, keyword, graphNode); 
                showToggleTool = true;
                break;
            case CypherBlockKeywords.MERGE:
                returnObj = this.getNewCreateMergeBlock(key, keyword, graphNode); 
                showToggleTool = true;
                break;
            case CypherBlockKeywords.MATCH:
                returnObj = this.getNewMatchBlock(key, keyword, graphNode); 
                showToggleTool = true;
                break;
            case CypherBlockKeywords.OPTIONAL_MATCH:
                returnObj = this.getNewMatchBlock(key, keyword, graphNode); 
                showToggleTool = true;
                break;
            case CypherBlockKeywords.WHERE:
                returnObj = this.getNewWhereBlock(key, graphNode); 
                break;
            case CypherBlockKeywords.RETURN:
                returnObj = this.getNewReturnOrOrderByBlock(key, keyword, graphNode); 
                break;
            case CypherBlockKeywords.ORDER_BY:
                returnObj = this.getNewReturnOrOrderByBlock(key, keyword, graphNode); 
                break;    
            case CypherBlockKeywords.SKIP:
                returnObj = this.getNewSkipOrLimitBlock(key, keyword, graphNode); 
                break;    
            case CypherBlockKeywords.LIMIT:
                returnObj = this.getNewSkipOrLimitBlock(key, keyword, graphNode); 
                break;    
            default:
                returnObj = {
                    dataProvider: null,
                    ref: null,
                    blockElement: <div>{`${keyword} stuff goes here (key: ${key}), time: ${new Date().toLocaleTimeString()}`}</div>
                } 
        }
        if (returnObj !== null) {
            const { dataProvider, ref, blockElement } = returnObj;

            //console.log("getCypherBlock expanded: ", expanded);
            const newBlock = new CypherBlock({
                key: key,
                title: keyword,
                expanded: expanded,
                selected: selected,
                keyword: keyword,
                showToggleTool: showToggleTool,
                scrollIntoView: (scrollIntoView) ? true : false,
                ref: ref,
                blockElement: blockElement,
                graphNode: graphNode,
                dataProvider: dataProvider
            })
            return newBlock;
        } else {
            return {
                dataProvider: null,
                ref: null,
                blockElement: <div>{`${keyword} block could not be loaded`}</div>
            };
        }
    }

    //getBlockCypher = (block) => block.getCypher();

    setBlockState = ({key, expanded, selected}) => {
        var affectedBlock = this.cypherBlocks.find(block => block.key === key);
        if (affectedBlock) {
            if (affectedBlock.expanded !== expanded) {
                this.cypherBuilder.calculatePageSize();
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

            //console.log('calling handleScopedBlockProviders');

            this.handleScopedBlockProviders({
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.RemovedBlock,
                cypherBlockKey: blockToRemove.key,                
                removeIndex: blockToRemoveIndex,
                blockToRemove: blockToRemove
            });
            //var scopedBlockProvider = this.getScopedBlockProvider(key);                    

            this.cypherBlocks.splice(blockToRemoveIndex, 1);

            this.graphData.getRelationshipsForNodeByKey(blockToRemove.graphNode.key)
                .map(relationship => this.graphData.removeRelationship(relationship));

            this.graphData.removeNode(blockToRemove.graphNode);

            if (blockToRemove.dataProvider && blockToRemove.dataProvider.removeEverythingFromVariableScope) {
                blockToRemove.dataProvider.removeEverythingFromVariableScope();
            }

            if (blockToRemove.dataProvider instanceof CypherPatternCanvasDataProvider) {
                this.cypherBuilder.updateCypherPattern();
                var cypherPatternKey = blockToRemove.dataProvider.data().getGraphData().getGraphRootNode().key;
                deleteRemoteGraphDocAndDefaultView(cypherPatternKey, (response) => {
                    if (!response.success) {
                        console.log(`deleteRemoteGraphDocAndDefaultView response.error: `, response.error);
                        const errorMessage = (response.error && response.error.toString()) ? response.error.toString() : '';
                        alert(`error deleting cypher pattern ${cypherPatternKey}: ${errorMessage}`);
                    }
                });
            } else if (blockToRemove.dataProvider instanceof DataMappingDataProvider) {
                this.cypherBuilder.updateCypherPattern();
                var cypherPatternKey = blockToRemove.dataProvider.data().getGraphData().getGraphRootNode().key;
                deleteRemoteGraphDocAndDefaultView(cypherPatternKey, (response) => {
                    if (!response.success) {
                        console.log(`deleteRemoteGraphDocAndDefaultView response.error: `, response.error);
                        const errorMessage = (response.error && response.error.toString()) ? response.error.toString() : '';
                        alert(`error deleting cypher pattern ${cypherPatternKey}: ${errorMessage}`);
                    }
                });
            } else {
                this.cypherBuilder.updateCypher();
            }
        }
    }

    getAllSubGraphDocKeys = () => 
        this.cypherBlocks
            .filter(block => block.dataProvider && 
                (block.dataProvider instanceof CypherPatternCanvasDataProvider
                || block.dataProvider instanceof DataMappingDataProvider)
            )        
            .map(block => block.dataProvider.data())
            .reduce((allKeys, syncedGraphDataAndView) => {
                const graphDocKeys = [
                    syncedGraphDataAndView.getGraphData().getGraphRootNode().key,
                    syncedGraphDataAndView.getGraphDataView().getGraphViewRootNode().key
                ]
                return allKeys.concat(graphDocKeys);
            }, []);

    getAllAssociatedGraphViewKeys = () => 
        this.cypherBlocks
            .filter(block => block.dataProvider && 
                (block.dataProvider instanceof CypherPatternCanvasDataProvider
                || block.dataProvider instanceof DataMappingDataProvider))        
            .map(block => block.dataProvider.data())
            .reduce((allKeys, syncedGraphDataAndView) => {
                const graphDocKeys = [
                    syncedGraphDataAndView.getGraphDataView().getGraphViewRootNode().key
                ]
                return allKeys.concat(graphDocKeys);
            }, []);
    
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
            //console.log('spliceRemove beforeBlock: ', beforeBlock);
            this.removeNextRelationship(beforeBlock, draggedBlock);
        }
        if (newCypherBlocks.length > 0 && draggedBlockIndex < (newCypherBlocks.length - 1)) {
            afterBlock = newCypherBlocks[draggedBlockIndex+1];
            //console.log('spliceRemove afterBlock: ', afterBlock);
            this.removeNextRelationship(draggedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            //console.log('spliceRemove addNextRelationship: ', beforeBlock, afterBlock);
            this.addNextRelationship(beforeBlock, afterBlock);
        }

    }

    spliceInsert = (droppedOnBlockIndex, newCypherBlocks) => {
        const insertedBlock = newCypherBlocks[droppedOnBlockIndex];
        var beforeBlock = null;
        var afterBlock = null;

        if (droppedOnBlockIndex > 0) {
            beforeBlock = newCypherBlocks[droppedOnBlockIndex-1];
            //console.log('spliceInsert beforeBlock: ', beforeBlock);
            this.addNextRelationship(beforeBlock, insertedBlock);
        }
        if (newCypherBlocks.length > 0 && droppedOnBlockIndex < (newCypherBlocks.length - 1)) {
            afterBlock = newCypherBlocks[droppedOnBlockIndex+1];
            //console.log('spliceInsert afterBlock: ', afterBlock);
            this.addNextRelationship(insertedBlock, afterBlock);
        }
        if (beforeBlock && afterBlock) {
            //console.log('spliceInseret removeNextRelationship: ', beforeBlock, afterBlock);
            this.removeNextRelationship(beforeBlock, afterBlock);
        }
    }

    moveBlock = ({ draggedBlockKey, droppedOnBlockKey, position }) => {
        //console.log('draggedBlockKey: ', draggedBlockKey);
        //console.log('droppedOnBlockKey: ', droppedOnBlockKey);
        //console.log('position: ', position);

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

            this.handleScopedBlockProviders({
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.RemovedBlock,
                cypherBlockKey: draggedBlock.key,                
                removeIndex: draggedBlockIndex,
                blockToRemove: draggedBlock
            });
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

            const params = {
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.NewBlock,
                cypherBlockKey: draggedBlock.key,
                insertIndex: droppedOnBlockIndex,
                newBlock: draggedBlock
            };
            this.handleScopedBlockProviders(params);

            return this.cypherBlocks;
        }
        return null;
    }

    getNewBlock = ({ keyword, position, scrollIntoView, testCypherBlock }) => {

        var blockNode = this.graphData.createNode({
            key: (testCypherBlock) ? testCypherBlock.key : null,
            primaryNodeLabel: SubgraphNodeLabels.CypherBlock,
            labels: [SubgraphNodeLabels.CypherBlock]
        });

        var newBlock = null;
        if (testCypherBlock) {      // this is to support unit testing
            newBlock = testCypherBlock;
            newBlock.graphNode = blockNode;
        } else {
            var newBlock = this.getNewCypherBlock({
                key: blockNode.key, 
                keyword: keyword, 
                expanded: true, 
                selected: false, 
                scrollIntoView: scrollIntoView,
                graphNode: blockNode,
                position: position    
            });
        }
        //newBlock.getCypher = this.getBlockCypher(newBlock);

        blockNode.addProperty('expanded', newBlock.expanded, DataTypes.Boolean);
        blockNode.addProperty('selected', newBlock.selected, DataTypes.Boolean);
        blockNode.addProperty('keyword', newBlock.keyword, DataTypes.String);
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
        const params = {
            callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.NewBlock,
            cypherBlockKey: newBlock.key,
            insertIndex: (position === 'end') ? this.cypherBlocks.length - 1 : position,
            newBlock: newBlock
        };
        //console.log('getNewBlock handleScopedBlockProviders params: ', params);
        this.handleScopedBlockProviders(params);

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
        //console.log('removeNextRelationship: startBlock, endBlock: ', startBlock, endBlock);
        var relationshipsToRemove = this.graphData
            .findRelationships(startBlock.graphNode, SubgraphRelationshipTypes.NEXT.name, endBlock.graphNode)
        //console.log('removeNextRelationship relationshipsToRemove: ', relationshipsToRemove);
        relationshipsToRemove.map(relationship => this.graphData.removeRelationship(relationship));
    }

    addToNodeMap = (cypherBlock, graphNode) => {
        this.graphNodeKeyToCypherBlockMap[graphNode.key] = cypherBlock;
    }

    addNode = (graphNode, dontNotify) => {
        this.graphData.addNode(graphNode, dontNotify);    

        // we need to add a relationship between the GraphDoc and the CypherBlock
        var graphRelationship = this.graphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_CYPHER_BLOCK.name,
            startNode: this.graphData.getGraphRootNode(),
            endNode: graphNode
        });
        this.graphData.addRelationship(graphRelationship, dontNotify);
    }

    getAllCypherPatterns = () => {
        return this.cypherBlocks
            .filter(block => (block.dataProvider instanceof CypherPatternCanvasDataProvider
                            || block.dataProvider instanceof DataMappingDataProvider))
            .map(block => block.dataProvider.getCypherPattern());
    }

    getGraphDataSaveObj = (dataProvider) => {
        this.setCypherSnippetOnRootNode();   // generates a cypher string of the current cypher blocks to store as a property
        
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
        var blockGraphs = {};

        this.cypherBlocks
            // for simple blocks like RETURN, we want to save the data using a graphNode from this.graphData
            //   when a returnClauseDataProvider is constructed, it returns the this.graphData of the 
            //   cypherBlockDataProvider, and the below filter step filters it out
            .filter(block => block.dataProvider && this.graphData !== block.dataProvider.data())   
            .map(block => {
                blockGraphs[block.graphNode.key] = block.dataProvider.data();
            });

        var objectToSerialize = {
            graphData: this.graphData,
            blockGraphs: blockGraphs
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
            //   cypherBlockDataProvider, and the below filter step filters it out
            .filter(saveObj => saveObj.fromData !== fromData)   
            .map(saveObj => {
                graphDocChanges.changedNodes = graphDocChanges.changedNodes.concat(saveObj.graphDocChanges.changedNodes);
                graphDocChanges.changedRelationships = graphDocChanges.changedRelationships.concat(saveObj.graphDocChanges.changedRelationships);
                graphDocDeletions.deletedNodeKeys = graphDocDeletions.deletedNodeKeys.concat(saveObj.graphDocDeletions.deletedNodeKeys);
                graphDocDeletions.deletedRelationshipKeys = graphDocDeletions.deletedRelationshipKeys.concat(saveObj.graphDocDeletions.deletedRelationshipKeys);
                return saveObj;
            });
        
        const resetDataFunc = () => () => {
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

    getSelectedPatternBlock = () => {
        var patternBlocks = this.cypherBlocks
            .filter(block => (block.dataProvider instanceof CypherPatternCanvasDataProvider
                            || block.dataProvider instanceof DataMappingDataProvider)
                            && this.blockHasCurrentRef(block))

        var selectedBlock = null;
        if (patternBlocks.length > 0) {
            selectedBlock = patternBlocks.find(block => block.selected);
            if (!selectedBlock) {
                selectedBlock = patternBlocks[patternBlocks.length-1];
            }
        }
        return selectedBlock;
    }

    addNodePatternFromDataModel = (dataModelDisplayNode) => {
        const selectedBlock = this.getSelectedPatternBlock();
        if (selectedBlock) {
            selectedBlock.ref.current.addNodePatternFromDataModel(dataModelDisplayNode);
        } else {
            alert('You need a MATCH block to add this', ALERT_TYPES.WARNING);
        }
    }

    addNodeRelNodePatternFromDataModel = (dataModelDisplayStartNode, relationshipTypeArray, dataModelDisplayEndNode) => {
        const selectedBlock = this.getSelectedPatternBlock();
        if (selectedBlock) {
            selectedBlock.ref.current.addNodeRelNodePatternFromDataModel(dataModelDisplayStartNode, relationshipTypeArray, dataModelDisplayEndNode);
        } else {
            alert('You need a MATCH block to add this', ALERT_TYPES.WARNING);
        }
    }

    getCypher = () => {
        return this.cypherBlocks
            .map(x => x.getCypher())
            .join('\n');

    }

    setCypherSnippetKeyword = ({ cypherBlockKey, newKeyword, oldKeyword }) => {
        if (newKeyword === 'WITH') {
            this.handleScopedBlockProviders({
                cypherBlockKey: cypherBlockKey,
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.ConvertBlockInsertWith
            });
        } else if (oldKeyword === 'WITH') {
            this.handleScopedBlockProviders({
                cypherBlockKey: cypherBlockKey,
                callMode: HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE.ConvertBlockRemoveWith
            });
        }
    }
}
 