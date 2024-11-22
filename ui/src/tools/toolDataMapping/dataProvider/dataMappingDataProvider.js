import React from "react";
import DataTypes from '../../../dataModel/DataTypes';
import { deserializeObject, serializeObject } from '../../../dataModel/graphUtil';
import { GeneralDataSourceInstanceMapper } from '../../../dataModel/dataSource/generalDataSource';

import { NodeLabels, RelationshipTypes } from '../../../dataModel/graphDataConstants';

import { RELATIONSHIP_DISPLAY } from '../../common/toolConstants';
import { GraphData } from '../../../dataModel/graphData';
import { SyncedGraphDataAndView } from '../../../dataModel/syncedGraphDataAndView';

import { 
    Pattern,
    NodePattern, 
    RelationshipPattern, 
    RELATIONSHIP_DIRECTION
} from '../../../dataModel/cypherPattern';

import { CypherVariableScope } from "../../../dataModel/cypherVariableScope";
import { CypherParameterDataSource } from '../../../dataModel/dataSource/cypherDataSource';
import { 
    renderCypher,
    getNodePatternPart,
    getRelationshipPatternPart,
    getSetItem
} from '../../../dataModel/dataSource/cypherTextOutput'
import { 
    MergeInstruction, 
    SetItems,
    SetItem
} from '../../../dataModel/dataSource/cypherDataInstructions';
import { ValidationStatus } from '../../common/validation/ValidationStatus';
import {
    loadRemoteGraphDocAndDefaultView
} from '../../../persistence/graphql/GraphQLGraphDoc';

import { EventEmitter, stopListeningTo, listenTo } from "../../../dataModel/eventEmitter";

import UpdateType from './updateTypes';
import SecurityRole from '../../common/SecurityRole';
import DataSourceTableBlock from '../../common/mapping/dataSourceTableBlock';
import DataSourceTableMapping from '../../common/mapping/DataSourceTableMapping';
import DataSourceTableMappingDataProvider from './dataSourceTableMappingDataProvider';
import { ALERT_TYPES } from "../../../common/Constants";
import { DataSourceTypes } from "../../common/mapping/DataSource";

export const GraphEventNames = {
    MappingGraph: "MappingGraph",
    PatternAndViewGraph: "PatternAndViewGraph"
}

const BigQueryNodeProperties = {
    projectId: "projectId",
    datasetId: "datasetId",
    datasets: "datasets",
    tableCatalog: "tableCatalog",
    selectedTableKey: "selectedTableKey",
    mappingJson: "mappingJson"
}

const Neo4jSourceNodeProperties = {
    neo4jSourceDatabase: "neo4jSourceDatabase",
    cypherStatementJson: "cypherStatementJson"
}

const PipelineOptionsProperties = {
    parallelRelationships: "parallelRelationships"
}

const Neo4jDestNodeProperties = {
    neo4jDestDatabase: "neo4jDestDatabase",
}

const OtherRootNodeProperties = {
    dataSourceType: "dataSourceType",
    dataModelKey: "dataModelKey"
}

const NEW_NODE_VARIABLE_SCOPE_LABEL = 'Node';

export const LOCAL_STORAGE_KEY = 'localDataMapping';
export const REMOTE_GRAPH_DOC_TYPE = 'DataMapping';

const SubgraphNodeLabels = {
    DataMapping: "DataMapping",
    DataMappingPattern: "DataMappingPattern",
    DataSourceTableMapping: "DataSourceTableMapping",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    DATA_MAPPING_PATTERN: {
        name: "DATA_MAPPING_PATTERN",
        nodes: [{
            startNode: SubgraphNodeLabels.DataMapping,
            endNode: SubgraphNodeLabels.DataMappingPattern
        }]
    },
    NEXT_DATA_SOURCE_MAPPING: {
        name: "NEXT_DATA_SOURCE_MAPPING",
        nodes: [{
            startNode: SubgraphNodeLabels.DataSourceTableMapping,
            endNode: SubgraphNodeLabels.DataSourceTableMapping
        }]
    },
    HAS_DATA_SOURCE_MAPPING: {
        name: "HAS_DATA_SOURCE_MAPPING",
        nodes: [{
            startNode: SubgraphNodeLabels.DataMapping,
            endNode: SubgraphNodeLabels.DataSourceTableMapping
        }]
    },

};

export const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.DataMapping, 
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
        {nodeLabel: SubgraphNodeLabels.DataMapping, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DataMappingPattern, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DataSourceTableMapping, propertyKeys: ["key"]},
    ] 
}    

const PatternNodeLabels = {
    DataMappingPattern: "DataMappingPattern",
    NodePattern: "NodePattern",
    RelationshipPattern: "RelationshipPattern"
};

const PatternRelationshipTypes = {
    HAS_NODE_PATTERN: {
        name: "HAS_NODE_PATTERN",
        nodes: [{
            startNode: PatternNodeLabels.DataMappingPattern,
            endNode: PatternNodeLabels.NodePattern
        }]
    },
    RELATIONSHIP_PATTERN: {
        name: "RELATIONSHIP_PATTERN",
        nodes: [{
            startNode: PatternNodeLabels.NodePattern,
            endNode: PatternNodeLabels.NodePattern
        }]
    }
};

const PATTERN_MODEL = { 
    primaryNodeLabel: PatternNodeLabels.DataMappingPattern, 
    subgraphConfig_labelFilter: 
        // produces +NodePattern|etc using constants
        Object.keys(PatternNodeLabels).map(node => `+${node}`).join('|')
    ,
    subgraphConfig_relationshipFilter: 
        // produces HAS_NODE_PATTERN>|etc using constants
        Object.keys(PatternRelationshipTypes).map(relationship => `${relationship}>`).join('|')
    , 
    keyConfig: [
        {nodeLabel: NodeLabels.GraphDoc, propertyKeys: ["key"]},
        {nodeLabel: PatternNodeLabels.DataMappingPattern, propertyKeys: ["key"]},
        {nodeLabel: PatternNodeLabels.NodePattern, propertyKeys: ["key"]},
        {relationshipType: PatternRelationshipTypes.RELATIONSHIP_PATTERN.name, propertyKeys: ["key"]}
    ] 
}    

export default class DataMappingDataProvider {

    // for patterns
    graphNodeKeyToNodePatternMap = {};
    graphRelationshipKeyToRelationshipPatternMap = {};

    // for mapping blocks
    graphNodeKeyToDataMappingMap = {};    

    constructor (properties) {
        properties = (properties) ? properties : {};
        this.mappingsReloaded = false;

        var {
            id,
            patternId,
            cypherPattern,
            dataMappings,
            projectId,
            datasetId,
            dataSourceTableBlocks,
            parentContainer
        } = properties;

        this.cypherPattern = (cypherPattern) ? cypherPattern : new Pattern({ 
            key: id
        });
        this.dataMappings = (dataMappings) ? dataMappings: [];
        this.dataSourceTableBlocks = (dataSourceTableBlocks) ? dataSourceTableBlocks : [];

        this.projectId = projectId;
        this.datasetId = datasetId;

        this.mappingGraphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });

        this.patternGraphDataAndView = new SyncedGraphDataAndView({
            id: patternId,
            SUBGRAPH_MODEL: PATTERN_MODEL
        });

        this.id = id;
        this.patternId = patternId;
        this.parentContainer = parentContainer;

        this.variableScope = new CypherVariableScope();        

        this.buildSyncedData();

        this.me = new EventEmitter(id);     
        this.setupListeners(); 
    }

    //data = () => this.mappingGraphData;
    // Setting data to the patternGraphDataAndView because that is what the GraphCanvasControl / graphCanvas expects
    data = () => this.patternGraphDataAndView;

    getDataSourceTableBlocks = () => this.dataSourceTableBlocks;
    
    getParentContainer = () => this.parentContainer;

    clearBigQueryFields = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        Object.values(BigQueryNodeProperties)
            .filter(x => x !== BigQueryNodeProperties.projectId)
            .map(value => {
                rootNode.removeProperty(value);
            });

        this.tableCatalog = null;

        this.removeAllBlocks();        
    }

    clearNeo4jSourceFields = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        Object.values(Neo4jSourceNodeProperties).map(value => {
            rootNode.removeProperty(value);
        });
        this.removeAllBlocks();
    }

    getProjectId = () => {
        //this.projectId;
        var rootNode = this.mappingGraphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey(BigQueryNodeProperties.projectId);
    }
    setProjectId = (projectId) => {
        //this.projectId = projectId;
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.projectId, projectId, DataTypes.String);
    }

    writeMappingJson = (mappingJson) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.mappingJson, mappingJson, DataTypes.String);
    }

    getParallelRelationships = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey(PipelineOptionsProperties.parallelRelationships, true);
    }

    setParallelRelationships = (parallelRelationships) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(PipelineOptionsProperties.parallelRelationships, parallelRelationships, DataTypes.Boolean);
    }

    getDatasetId = () => {
        //this.datasetId;
        var rootNode = this.mappingGraphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey(BigQueryNodeProperties.datasetId);
    }
    setDatasetId = (datasetId) => {
        //this.datasetId = datasetId;
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.datasetId, datasetId, DataTypes.String);        
    }

    getDatasets = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        const datasetsJson = rootNode.getPropertyValueByKey(BigQueryNodeProperties.datasets) || '[]';
        return JSON.parse(datasetsJson);
    }
    setDatasets = (datasets) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        const datasetsJson = JSON.stringify(datasets);
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.datasets, datasetsJson, DataTypes.String);        
    }

    getSelectedTableKey = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey(BigQueryNodeProperties.selectedTableKey);
    }
    setSelectedTableKey = (selectedTableKey) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.selectedTableKey, selectedTableKey, DataTypes.String);        
    }

    getNeo4jSourceDatabase = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        var jsonString = rootNode.getPropertyValueByKey(Neo4jSourceNodeProperties.neo4jSourceDatabase);
        return JSON.parse(jsonString);
    }
    setNeo4jSourceDatabase = (neo4jSourceDatabase) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        const jsonString = JSON.stringify(neo4jSourceDatabase);
        rootNode.addOrUpdateProperty(Neo4jSourceNodeProperties.neo4jSourceDatabase, jsonString, DataTypes.String);        
    }    

    getNeo4jDestDatabase = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        var jsonString = rootNode.getPropertyValueByKey(Neo4jDestNodeProperties.neo4jDestDatabase);
        return JSON.parse(jsonString);
    }
    setNeo4jDestDatabase = (neo4jDestDatabase) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        const jsonString = JSON.stringify(neo4jDestDatabase);
        rootNode.addOrUpdateProperty(Neo4jDestNodeProperties.neo4jDestDatabase, jsonString, DataTypes.String);        
    }    

    getCypherStatement = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        var jsonString = rootNode.getPropertyValueByKey(Neo4jSourceNodeProperties.cypherStatementJson);
        return JSON.parse(jsonString);
    }
    setCypherStatement = (cypherStatement) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        const jsonString = JSON.stringify(cypherStatement);
        rootNode.addOrUpdateProperty(Neo4jSourceNodeProperties.cypherStatementJson, jsonString, DataTypes.String);        
    }    

    getTableDefinition = () => {
        var selectedTableKey = this.getSelectedTableKey();
        var tableCatalog = this.getTableCatalog();
        var tableDefinitions = (tableCatalog && tableCatalog.tableDefinitions) ? tableCatalog.tableDefinitions : [];
        var selectedTableDefinition = tableDefinitions.find(x => x.key === selectedTableKey);
        return selectedTableDefinition;
    }

    loadTableCatalog = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        var jsonString = rootNode.getPropertyValueByKey(BigQueryNodeProperties.tableCatalog);
        if (jsonString) {
            const serializedObject = JSON.parse(jsonString);
            this.tableCatalog = deserializeObject(serializedObject, GeneralDataSourceInstanceMapper);
        }
    }

    getTableCatalog = () => {
        return this.tableCatalog;
        //var rootNode = this.mappingGraphData.getGraphRootNode();
        //var jsonString = rootNode.getPropertyValueByKey(BigQueryNodeProperties.tableCatalog) || '{}';
        //return JSON.parse(jsonString);
    }
    setTableCatalog = (tableCatalog) => {
        this.tableCatalog = tableCatalog;
        var rootNode = this.mappingGraphData.getGraphRootNode();
        //const tableCatalogJson = JSON.stringify(tableCatalog);
        var serializedObject = serializeObject(tableCatalog);
        var tableCatalogJson = JSON.stringify(serializedObject);
        rootNode.addOrUpdateProperty(BigQueryNodeProperties.tableCatalog, tableCatalogJson, DataTypes.String);        
    }

    getDataMappings = () => this.dataMappings;

    getCypherPattern = () => this.cypherPattern;

    getDebugCypherSnippets = () => {
        return this.getCypherPattern().getDebugCypherSnippets().map(snippet => `MATCH ${snippet}`);
    }

    getDataModel = () => this.parentContainer.getSelectedDataModel();

    getSubgraphModel = () => SUBGRAPH_MODEL;
    getRemoteGraphDocType = () => REMOTE_GRAPH_DOC_TYPE;
    getLocalStorageKey = () => LOCAL_STORAGE_KEY;

    // will be called from graphCanvas when nodes get moved around and the like (I think)
    dataChanged = (dataChangeType, details) => {
        //console.log('dataChangeType: ', dataChangeType);
        //console.log('details: ', details);
        this.patternGraphDataAndView.dataChanged(dataChangeType, details);
    }

    mappingGraphDataListener = (id, messageName, messagePayload) => {
        this.me.notifyListeners(GraphEventNames.MappingGraph, {
            id: id, 
            messageName: messageName,
            messagePayload: messagePayload
        });                    
    }

    patternGraphDataAndViewListener = (id, messageName, messagePayload) => {
        this.me.notifyListeners(GraphEventNames.PatternAndViewGraph, {
            id: id, 
            messageName: messageName,
            messagePayload: messagePayload
        });                    
    }

    setupListeners = () => {
        listenTo(this.mappingGraphData, this.mappingGraphData.id, this.mappingGraphDataListener, true);
        listenTo(this.patternGraphDataAndView, this.patternGraphDataAndView.id, this.patternGraphDataAndViewListener, true);
    }

    getInitialGraphDocSaveInfo = (metadata) => {

      const mainGraphDoc = {
        key: metadata.key,
        subgraphModel: SUBGRAPH_MODEL,
        metadata
      };

      const subGraphDoc = {
          key: this.patternId,
          subgraphModel: PATTERN_MODEL
      }

      const subGraphDataView = this.patternGraphDataAndView.getGraphDataView();

      return {
          mainGraphDoc,
          mainGraphDocKeyHelper: this.mappingGraphData.getKeyHelper(),
          mainSubRelationshipType: SubgraphRelationshipTypes.DATA_MAPPING_PATTERN.name,
          subGraphDoc, 
          subGraphDataView, 
          subGraphModel: PATTERN_MODEL
      }
    }

    getDataMappingInfo = () => {

        var projectId = this.getProjectId();
        var datasetId = this.getDatasetId();    // TODO: move to dataSourceTableMappingDataProvider?
        var dataMappingBlocks = [];

        this.dataSourceTableBlocks.map(dataSourceTableBlock => {
            var obj = {};
            if (datasetId) {
                obj.datasetId = datasetId;
            }
            obj = {
                ...obj,
                tableDefinition: dataSourceTableBlock.dataProvider.getTableDefinition(),
                cypherPattern: this.getCypherPattern(),
                dataMappings: dataSourceTableBlock.dataProvider.getDataMappings()
            }            
            dataMappingBlocks.push(obj);
        });

        dataMappingBlocks = dataMappingBlocks.filter(x => x.tableDefinition
                && x.dataMappings
                && x.dataMappings.length > 0);

        return {
            projectId,
            dataMappingBlocks
        }
    }

    getDataSaveObj = () => {

        var graphDataSaveObj = this.getGraphDataSaveObj(this.mappingGraphData);
        var { idJoiner, graphDocChanges, graphDocDeletions } = graphDataSaveObj;

        var patternSaveObj = this.getGraphDataSaveObj(this.patternGraphDataAndView);

        graphDocChanges.changedNodes = graphDocChanges.changedNodes.concat(patternSaveObj.graphDocChanges.changedNodes);
        graphDocChanges.changedRelationships = graphDocChanges.changedRelationships.concat(patternSaveObj.graphDocChanges.changedRelationships);
        graphDocDeletions.deletedNodeKeys = graphDocDeletions.deletedNodeKeys.concat(patternSaveObj.graphDocDeletions.deletedNodeKeys);
        graphDocDeletions.deletedRelationshipKeys = graphDocDeletions.deletedRelationshipKeys.concat(patternSaveObj.graphDocDeletions.deletedRelationshipKeys);
        
        const resetDataFunc = () => () => {
            graphDataSaveObj.resetDataFunc();
            patternSaveObj.resetDataFunc();
        }

        return {
            idJoiner: idJoiner,
            graphDocChanges: graphDocChanges,
            graphDocDeletions: graphDocDeletions,
            resetDataFunc: resetDataFunc
        }
    }

    getSubGraphViewKey = () => this.patternGraphDataAndView.getGraphDataView().getGraphViewRootNode().key;

    getGraphDataSaveObj = (graphData) => {
        const data = graphData;

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
            graphDocChanges: graphDocChanges,
            graphDocDeletions: graphDocDeletions,
            resetDataFunc: resetDataFunc(timestamp)
        }
    }

    getSerializedDataSaveObj = () => {
        // TODO
        return {};
    }

    fromSaveObject = ({graphDocObj, deserializedSyncedGraphDataAndView, keepDataChangeFlags}, callback) => {

        this.graphNodeKeyToNodePatternMap = {};
        this.graphRelationshipKeyToRelationshipPatternMap = {};
    
        if (deserializedSyncedGraphDataAndView) {
            // TODO: ensure we fix the unlisten/listen
            //this.cypherBlockDataProvider.removeListenerBeforeDeserialize(this);
            //this.patternGraphDataAndView = deserializedSyncedGraphDataAndView;
            //this.cypherBlockDataProvider.addListenerAfterDeserialize(this);            
        } else {
            this.mappingGraphData.fromSaveObject(graphDocObj);
        }
        this.loadTableCatalog();          

        // Data Source Mapping Stuff
        this.dataSourceTableBlocks = [];        
        var dataSourceTableMappings = this.mappingGraphData.getNodeArray()
            .filter(graphNode => graphNode.labels.includes(SubgraphNodeLabels.DataSourceTableMapping));
        this.loadDataSourceTableMappings(dataSourceTableMappings);

        var nextRelationships = this.mappingGraphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.NEXT_DATA_SOURCE_MAPPING.name);
        this.fixOrderOfBlocks(nextRelationships);

        // Graph Pattern Stuff
        var dataMappingPatternRelationship = this.mappingGraphData.getRelationshipArray()
            .filter(graphRelationship => graphRelationship.type === SubgraphRelationshipTypes.DATA_MAPPING_PATTERN.name)[0]

        const patternGraphDocKey = dataMappingPatternRelationship.getEndNode().key;

        var deserializedSyncedGraphDataAndView = null;
        /*
        if (deserializedSaveObject) {
            deserializedSyncedGraphDataAndView = deserializedSaveObject[dataMappingPatternRelationship.getStartNode().key];
        }*/
        var promise = this.loadDataMappingPattern({
            patternGraphDocKey, 
            deserializedSyncedGraphDataAndView,
            keepDataChangeFlags
        });

        promise.then((result) => {
            if (result === true && callback) {
                callback();
            }
        });

        // the finishLoadingFromSaveObject will do remaining tasks after the dataModel is loaded
    }

    finishLoadingFromSaveObject = () => {
        var dataModel = this.getDataModel();        
        var availableMappingDestinations = this.parentContainer.getAvailableMappingDestinations();
        if (!this.mappingsReloaded && dataModel && 
            availableMappingDestinations && availableMappingDestinations.length > 0) {
            // at this point the data model should be loaded (if available)
            // also, the availableMappingDestinations should be populated
            this.reloadSavedMappings();
        }
    }

    reloadSavedMappings = () => {
        this.mappingsReloaded = true;
        this.dataSourceTableBlocks.map(dataSourceTableBlock => {
            dataSourceTableBlock.dataProvider.reloadSavedMappings();
            if (dataSourceTableBlock.ref.current) {
                dataSourceTableBlock.ref.current.reloadSavedMappings();
            }
        });      
    }

    loadDataSourceTableMappings = (dataSourceTableMappings) => {
        dataSourceTableMappings.map(blockNode => {
            const ref = React.createRef();

            const key = blockNode.key;
            const keyValue = this.getPrefixedBlockKey(key);
    
            //alert('setting title to: ' + title, ALERT_TYPES.INFO);
            const dataProvider = new DataSourceTableMappingDataProvider({
                graphNode: blockNode,
                // tableDefinition:  does not need to be set because blockNode already has the saved info
                // title: does not need to be set because blockNode already has the saved info
                dataMappingDataProvider: this,
                dataMappingTableBlockKey: key,
                parentContainer: this.parentContainer,
                getDataModel: this.getDataModel,
                getTableCatalog: this.getTableCatalog,
                getAvailableMappingDestinations: this.parentContainer.getAvailableMappingDestinations
            });

            var blockElement = <DataSourceTableMapping
                ref={ref}
                getTableCatalog={this.getTableCatalog}
                tableDefinition={dataProvider.getTableDefinition()}
                dataProvider={dataProvider}
                getAvailableMappingDestinations={this.parentContainer.getAvailableMappingDestinations}
            />
    
            var newBlock = this.getDataSourceTableBlock({
                key: keyValue, 
                title: dataProvider.getTitle(),
                expanded: blockNode.getPropertyValueByKey('expanded'), 
                selected: blockNode.getPropertyValueByKey('selected'), 
                scrollIntoView: false,
                graphNode: blockNode,
                ref: ref,
                blockElement: blockElement,
                dataProvider: dataProvider
            });
    
            this.addToDataMappingNodeMap(newBlock, blockNode);
            this.addDataSourceTableBlock(newBlock);
        });
    }

    getPrefixedBlockKey = (key) => `dataMappingBlock_${key}`;

    fixOrderOfBlocks = (nextRelationships) => {
        if (nextRelationships.length > 0) {
            var blockMap = {};
            var relMap = {};
            var orderedBlockArray = [];

            this.dataSourceTableBlocks.map(x => blockMap[x.key] = x);
            const endNodes = nextRelationships.map(x => x.endNode);
            nextRelationships.map(x => relMap[x.startNode.key] = x);    // there should be at most 1 NEXT from each node
            var startRel = nextRelationships.find(x => !endNodes.includes(x.startNode));
            orderedBlockArray.push(blockMap[this.getPrefixedBlockKey(startRel.startNode.key)]);

            var currentRel = startRel;
            for (var i = 0; i < nextRelationships.length; i++) {
                var nextKey = currentRel.endNode.key;
                var nextBlock = blockMap[this.getPrefixedBlockKey(nextKey)];
                orderedBlockArray.push(nextBlock);
                currentRel = relMap[nextKey];
            }
            this.dataSourceTableBlocks = orderedBlockArray;
        }
    }

    loadDataMappingPattern = ({patternGraphDocKey, deserializedSyncedGraphDataAndView, keepDataChangeFlags }) => {
        return new Promise((resolve, reject) => {
            if (deserializedSyncedGraphDataAndView) {
                this.parentContainer.setStatus('', false);
                this.loadPatternFromJson({
                    deserializedSyncedGraphDataAndView,
                    keepDataChangeFlags
                });
                resolve(true);
            } else {
                loadRemoteGraphDocAndDefaultView(patternGraphDocKey, (response) => {
                    //console.log(response);
                    if (response.success === false) {
                        var message = "Error loading data mapping: " + response.error;
                        this.parentContainer.setStatus(message, false);
                        alert(message);
                        reject(message);
                    } else {
                        this.parentContainer.setStatus('', false);
                        this.loadPatternFromJson({
                            graphDocAndViewResponse: response,
                            keepDataChangeFlags
                        });                        
                        resolve(true);
                    }
                });
            }
        });
    }

    loadPatternFromJson = ({graphDocAndViewResponse, deserializedSyncedGraphDataAndView, keepDataChangeFlags }) => {
        /*
        const canvasHeight = createMergeBlockGraphNode.getPropertyValueByKey("displayCanvasHeight");
        const viewSettingsString = createMergeBlockGraphNode.getPropertyValueByKey("displayCanvasViewSettings");
        const canvasViewSettings = (viewSettingsString) ? JSON.parse(viewSettingsString) : {};
        const viewSettings = { 
            cypherViewSettings: { canvasHeight: canvasHeight },
            canvasViewSettings: canvasViewSettings
        };
        */

        this.patternGraphDataAndView.fromSaveObject(graphDocAndViewResponse.graphDoc, 
            graphDocAndViewResponse.graphDocView, keepDataChangeFlags);

        this.variableScope.clearVariables();

        this.cypherPattern = new Pattern({ 
            //key: graphDocObj.key,
            key: this.patternGraphDataAndView.graphData.graphRootNode.key,
            variableScope: this.variableScope
        });        

        var graphData = this.patternGraphDataAndView.getGraphDataView();
        graphData.getNodeArray()
            //.sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1)
            .filter(displayNode => displayNode.getNode().labels.includes(PatternNodeLabels.NodePattern))
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
                this.addToPatternNodeMap(nodePattern, node);
            });

        graphData.getRelationshipArray()
            //.sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1)
            .filter(displayRelationship => displayRelationship.getRelationship() && displayRelationship.getRelationship().type === PatternRelationshipTypes.RELATIONSHIP_PATTERN.name)
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
                this.addToPatternRelationshipMap(relationshipPattern, relationship);

                var startNodePattern = this.graphNodeKeyToNodePatternMap[relationship.getStartNode().key];
                var endNodePattern = this.graphNodeKeyToNodePatternMap[relationship.getEndNode().key];

                this.cypherPattern.addPatternElementChain(relationship.key, startNodePattern, relationshipPattern, endNodePattern, this.variableScope);
            });

        // right now this will set up the availableMappingDestinations needed by many of the components
        this.updateCurrentCypherAndPattern({
            updateType: UpdateType.SaveObjectReloaded
        });

    }

    setIsRemotelyPersisted = (isRemotelyPersisted) => 
        this.patternGraphDataAndView.setIsRemotelyPersisted(isRemotelyPersisted);
    
    getEventEmitter = () => this.me;
    getCypherPattern = () => this.cypherPattern;

    convertNodePatternToDisplayNode (syncedView, nodePattern, displayProperties) {
        var {
            key, nodeLabels, variable, propertyMap
        } = nodePattern;

        var displayNode = syncedView.createNode({
            key: key,
            primaryNodeLabel: PatternNodeLabels.NodePattern,
            labels: [PatternNodeLabels.NodePattern]
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
            key, variable, direction, types, propertyMap
        } = relationshipPattern;

        var displayRelationship = syncedView.createRelationship({
            key: key,
            type: PatternRelationshipTypes.RELATIONSHIP_PATTERN.name,
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
                    startNode = this.convertNodePatternToDisplayNode(this.patternGraphDataAndView, nodePattern);
                    this.addPatternNode(startNode, true);
                }

                var patternElementChain = pathPattern.patternElementChain;
                if (patternElementChain) {
                    patternElementChain.map(chainPart => {
                        endNode = this.convertNodePatternToDisplayNode(this.patternGraphDataAndView, chainPart.nodePattern)
                        this.addPatternNode(endNode, true);

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

                        var relationship = this.convertRelationshipPatternToDisplayRelationship(this.patternGraphDataAndView, relationshipPattern, startNode, endNode);
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
        var displayNode = this.patternGraphDataAndView.getNodeByKey(displayNodeKey);
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
                    updateType: UpdateType.RelationshipPatternRemoved
                });
            }
        }
    }

    removeNode (displayNodeKey, skipReRender) {
        var displayNode = this.patternGraphDataAndView.getNodeByKey(displayNodeKey);
        var parentContainer = this.getParentContainer();
        if (displayNode && parentContainer) {
            var graphNode = displayNode.getNode();

            // need to remove stuff from cypherPattern
            var nodePatternToRemove = this.graphNodeKeyToNodePatternMap[graphNode.key];
            if (nodePatternToRemove) {
                this.cypherPattern.removeNodePattern(nodePatternToRemove, this.variableScope);        
            }
    
            // need to remove stuff from patternGraphDataAndView
            this.patternGraphDataAndView.removeNode(displayNode);
            
            parentContainer.getGraphCanvas().nodeRemoved(displayNode);    
    
            if (!skipReRender) {
                this.reRenderAfterDelete({
                    updateType: UpdateType.NodePatternRemoved
                });
            }
        }
    }

    reRenderAfterDelete (args) {
        // need to ensure canvas is updated
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            parentContainer.getGraphCanvas().render();

            // need to ensure cypher is updated
            this.updateCurrentCypherAndPattern(args);
        }
    }    

    removeRelationship (displayRelationshipKey, skipReRender) {
        var displayRelationship = this.patternGraphDataAndView.getRelationshipByKey(displayRelationshipKey);
        var parentContainer = this.getParentContainer();
        if (displayRelationship && parentContainer) {
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
    
            // need to remove stuff from patternGraphDataAndView
            this.patternGraphDataAndView.removeRelationship(displayRelationship);
            parentContainer.getGraphCanvas().relationshipRemoved(displayRelationship);

            if (!skipReRender) {
                this.reRenderAfterDelete({
                    updateType: UpdateType.RelationshipPatternRemoved
                });
            }
        }
    }

    handleDataModel = (dataModel, dataModelKey) => {
        this.setDataModel(dataModel);
        this.setDataModelKey(dataModelKey);
    }

    setDataModel = (dataModel) => {
        this.dataModel = dataModel;
    }

    setDataModelKey = (dataModelKey) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        //var rootNode = this.patternGraphDataAndView.getGraphData().getGraphRootNode();
        rootNode.addOrUpdateProperty(OtherRootNodeProperties.dataModelKey, dataModelKey, DataTypes.String);
    }    

    getDataSourceType = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        return rootNode.getPropertyValueByKey(OtherRootNodeProperties.dataSourceType);
    }
    setDataSourceType = (dataSourceType) => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        rootNode.addOrUpdateProperty(OtherRootNodeProperties.dataSourceType, dataSourceType, DataTypes.String);
    }    

    getDataModelKey = () => {
        var rootNode = this.mappingGraphData.getGraphRootNode();
        //var rootNode = this.patternGraphDataAndView.getGraphData().getGraphRootNode();        
        return rootNode.getPropertyValueByKey(OtherRootNodeProperties.dataModelKey);
    }


    getConnectedRelationshipBetweenNodes = (node1, node2) => this.patternGraphDataAndView.getConnectedRelationshipBetweenNodes(node1, node2);

    addRelationship (graphRelationship, dontNotify) {
        this.patternGraphDataAndView.addRelationship(graphRelationship, dontNotify);
    }

    addNode = (displayNode, dontNotify) => this.addPatternNode(displayNode, dontNotify);

    addPatternNode = (displayNode, dontNotify) => {
        this.patternGraphDataAndView.addNode(displayNode, dontNotify);    
        var graphNode = displayNode.getNode();

        // we need to add a relationship between the GraphDoc and the NodePattern
        //  but we only need to add it to the underlying graphData, not to the graphDataView
        var graphData = this.patternGraphDataAndView.getGraphData();
        var graphRelationship = graphData.createRelationship({
            type: PatternRelationshipTypes.HAS_NODE_PATTERN.name,
            startNode: graphData.getGraphRootNode(),
            endNode: graphNode
        });
        graphData.addRelationship(graphRelationship, dontNotify);
    }

    addDataMappingNode = (graphNode, dontNotify) => {
        this.mappingGraphData.addNode(graphNode, dontNotify);    

        // we need to add a relationship between the GraphDoc and the DataSourceMapping
        var graphRelationship = this.mappingGraphData.createRelationship({
            type: SubgraphRelationshipTypes.HAS_DATA_SOURCE_MAPPING.name,
            startNode: this.mappingGraphData.getGraphRootNode(),
            endNode: graphNode
        });
        this.mappingGraphData.addRelationship(graphRelationship, dontNotify);
    }

    reverseRelationship = (displayRelationship, skipReRender) => {
        var graphRelationship = displayRelationship.getRelationship();
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            var relationshipPattern = this.graphRelationshipKeyToRelationshipPatternMap[graphRelationship.key];
            if (relationshipPattern) {
                relationshipPattern.reverse();        
            }
    
            // this will trigger a save
            displayRelationship.reverseNodes();
    
            // this will re-render
            parentContainer.getGraphCanvas().reverseRelationship(displayRelationship);
    
            if (!skipReRender) {
                this.updateCurrentCypherAndPattern({
                    updateType: UpdateType.ReverseRelationshipPattern
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
        var parentContainer = this.getParentContainer();
        /*
        console.log(`startNode.x ${startNodeCoords.x}, startNode.y ${startNodeCoords.y}`);
        console.log(`endNode.x ${endNodeCoords.x}, endNode.y ${endNodeCoords.y}`);
        console.log('canvasDimensions (document rect): ', canvasDimensions);
        console.log('canvasRect: ', canvasRect);
        */

        if (parentContainer) {
            parentContainer.requestRelationshipPopup({
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
        var parentContainer = this.getParentContainer();
        console.log("coords: ", coords);
    
        if (parentContainer && SecurityRole.canEdit()) {
            parentContainer.requestRelationshipPopup({
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
                    this.addPatternNode(newNode);

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
            var displayNode = this.convertNodePatternToDisplayNode(this.patternGraphDataAndView, newNodePattern, displayProperties);
            var graphNode = displayNode.getNode();
            newNodePattern.key = graphNode.key;
    
            this.addToPatternNodeMap(newNodePattern, graphNode);
    
            // TODO: this really shouldn't be added until addNode is called
            this.cypherPattern.addNodePatternPart(newNodePattern, this.variableScope);
            if (!skipUpdateCypher) {
                this.updateCurrentCypherAndPattern({
                    addedItem: newNodePattern,
                    updateType: UpdateType.NodePatternAdded
                });    
            }
    
            return displayNode;
        } 
    }

    createNewNode (displayProperties) {
        return this.createNewNodeFromNodeLabel(NEW_NODE_VARIABLE_SCOPE_LABEL, displayProperties);
    }

    addToPatternNodeMap = (nodePattern, graphNode) => {
        this.graphNodeKeyToNodePatternMap[graphNode.key] = nodePattern;
    }

    addToDataMappingNodeMap = (mappingBlock, graphNode) => {
        this.graphNodeKeyToDataMappingMap[graphNode.key] = mappingBlock;
    }

    getNodePatternByGraphNodeKey = (graphNodeKey) => this.graphNodeKeyToNodePatternMap[graphNodeKey];
    getRelationshipPatternByGraphRelationshipKey = (graphRelationshipKey) => this.graphRelationshipKeyToRelationshipPatternMap[graphRelationshipKey];

    updateNodePatternNodeLabels = (updateProperties) => {
        var { nodePattern, nodeLabels } = updateProperties;
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            nodePattern.setNodeLabels(nodeLabels);

            var graphNode = nodePattern.displayNode.getNode();
            graphNode.updateProperty('nodeLabels', nodePattern.nodeLabels, DataTypes.StringArray);
    
            // re-render node
            parentContainer.getGraphCanvas().reRenderNode(nodePattern.displayNode);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: UpdateType.NodePatternUpdateNodeLabels
            });
        }
    }  

    updateRelationshipPatternTypes = (updateProperties) => {
        var { relationshipPattern, types } = updateProperties;
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            relationshipPattern.setTypes(types);

            var graphRelationship = relationshipPattern.displayRelationship.getRelationship();
            graphRelationship.updateProperty('types', relationshipPattern.types, DataTypes.StringArray);
    
            // re-render node
            parentContainer.getGraphCanvas().reRenderRelationship(relationshipPattern.displayRelationship);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: UpdateType.RelationshipPatternUpdateTypes
            });
        }
    }  

    updateNodePatternVariable = (updateProperties) => {
        var { nodePattern, variable, variablePreviousValue } = updateProperties;
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            nodePattern.variable = variable;
            var graphNode = nodePattern.displayNode.getNode();
            graphNode.updateProperty('variable', nodePattern.variable, DataTypes.String);
    
            // re-render node
            parentContainer.getGraphCanvas().reRenderNode(nodePattern.displayNode);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: UpdateType.NodePatternUpdateVariable
            });
        }
    }  

    updateRelationshipPatternVariable = (updateProperties) => {
        var { relationshipPattern, variable, variablePreviousValue } = updateProperties;
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            relationshipPattern.variable = variable;
            var graphRelationship = relationshipPattern.displayRelationship.getRelationship();
            graphRelationship.updateProperty('variable', relationshipPattern.variable, DataTypes.String);
    
            // re-render node
            parentContainer.getGraphCanvas().reRenderRelationship(relationshipPattern.displayRelationship);
    
            // re-render cypher
            this.updateCurrentCypherAndPattern({
                updateType: UpdateType.RelationshipPatternUpdateVariable
            });
        }
    }  

    addToPatternRelationshipMap = (relationshipPattern, graphRelationship) => {
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
            // also sync it to patternGraphDataAndView
    
            // TODO: this below section really shouldn't be added until addRelationship is called
            var displayRelationship = this.convertRelationshipPatternToDisplayRelationship(
                this.patternGraphDataAndView, relationshipPattern, startDisplayNode, endDisplayNode);
            var graphRelationship = displayRelationship.getRelationship();
            relationshipPattern.key = graphRelationship.key;
    
            this.addToPatternRelationshipMap(relationshipPattern, graphRelationship);
    
            this.cypherPattern.addPatternElementChain(graphRelationship.key, startNodePattern, relationshipPattern, endNodePattern, this.variableScope);
            this.updateCurrentCypherAndPattern({
                updateType: UpdateType.RelationshipPatternAdded
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
        var parentContainer = this.getParentContainer();
        if (parentContainer) {
            parentContainer.refreshAvailableMappingDestinations(this.getCypherPattern());
        }
    }

    removeEverythingFromVariableScope = () => {
        this.cypherPattern.removeFromVariableScope();
    }

    getCypher = () => `${this.cypherKeyword} ${this.cypherPattern.toCypherString()}`;

    getNewVariable = (prefix, existingVariableMap) => {
        for (var i = 1; i < 100000; i++) {
            var candidateVar = `${prefix}${i}`;
            if (!existingVariableMap[candidateVar]) {
                existingVariableMap[candidateVar] = candidateVar;
                return candidateVar;
            }
        }
        throw new Error(`New variable search space has been exhausted for prefix: '${prefix}'`);
    }

    setBlockState = ({key, expanded, selected}) => {
        var affectedBlock = this.dataSourceTableBlocks.find(block => block.key === key);
        if (affectedBlock) {
            if (affectedBlock.expanded !== expanded) {
                console.log('TODO: dataMappingDataProvider - calculate page size?');
                //this.scenarioSetBuilder.calculatePageSize();
            }
            affectedBlock.expanded = expanded;
            affectedBlock.selected = selected;
            affectedBlock.graphNode.addOrUpdateProperty('expanded', expanded, DataTypes.Boolean);
            affectedBlock.graphNode.addOrUpdateProperty('selected', selected, DataTypes.Boolean);
        }
    }

    removeAllBlocks = () => {
        this.dataSourceTableBlocks.map(blockToRemove => {
            this.mappingGraphData.getRelationshipsForNodeByKey(blockToRemove.graphNode.key)
                .map(relationship => this.mappingGraphData.removeRelationship(relationship));
        
            this.mappingGraphData.removeNode(blockToRemove.graphNode);
        })
        this.dataSourceTableBlocks = [];        
    }

    removeBlock = ({ key }) => {
        var blockToRemoveIndex = this.dataSourceTableBlocks.findIndex(block => block.key === key);
        //console.log('removeBlock: blockToRemoveIndex: ', blockToRemoveIndex);
        //console.log('removeBlock: key: ', key);
        if (blockToRemoveIndex >= 0) {
            var blockToRemove = this.dataSourceTableBlocks[blockToRemoveIndex];

            var blockBefore = null;
            var blockAfter = null;
            
            if (blockToRemoveIndex > 0) {
                blockBefore = this.dataSourceTableBlocks[blockToRemoveIndex-1];
            }
            if (blockToRemoveIndex < (this.dataSourceTableBlocks.length-1)) {
                blockAfter = this.dataSourceTableBlocks[blockToRemoveIndex+1];
            }
            if (blockBefore && blockAfter) {
                this.addNextRelationship(blockBefore, blockAfter);
            }

            this.dataSourceTableBlocks.splice(blockToRemoveIndex, 1);

            this.mappingGraphData.getRelationshipsForNodeByKey(blockToRemove.graphNode.key)
                .map(relationship => this.mappingGraphData.removeRelationship(relationship));

            this.mappingGraphData.removeNode(blockToRemove.graphNode);
        }
    }

    getBlockTitle = (tableDefinition) => {
        const dataSourceType = this.getDataSourceType() || DataSourceTypes.BigQuery;
        var title = '';
        if (dataSourceType === DataSourceTypes.BigQuery) {
            title = `${this.getProjectId()} > ${this.getDatasetId()} > ${tableDefinition.name}`;        
        } else if (dataSourceType === DataSourceTypes.Neo4j) {
            title = `Cypher > ${tableDefinition.name}`;        
        }
        return title        
    }

    getNewDataSourceTable = ({tableDefinition}) => {
        var blockNode = this.mappingGraphData.createNode({
            key: null,  // will be created automatically
            primaryNodeLabel: SubgraphNodeLabels.DataSourceTableMapping,
            labels: [SubgraphNodeLabels.DataSourceTableMapping]
        });

        const ref = React.createRef();

        const key = blockNode.key;
        const keyValue = this.getPrefixedBlockKey(key);

        const title = this.getBlockTitle(tableDefinition);
        //alert('setting title to: ' + title, ALERT_TYPES.INFO);
        const dataProvider = new DataSourceTableMappingDataProvider({
            graphNode: blockNode,
            tableDefinition: tableDefinition,
            dataMappingDataProvider: this,
            dataMappingTableBlockKey: key,
            parentContainer: this.parentContainer,
            title: title,
            getDataModel: this.getDataModel,
            getTableCatalog: this.getTableCatalog,
            getAvailableMappingDestinations: this.parentContainer.getAvailableMappingDestinations
        });

        var blockElement = <DataSourceTableMapping
            ref={ref}
            getTableCatalog={this.getTableCatalog}
            tableDefinition={tableDefinition}
            dataProvider={dataProvider}
            getAvailableMappingDestinations={this.parentContainer.getAvailableMappingDestinations}
        />

        var newBlock = this.getDataSourceTableBlock({
            key: keyValue, 
            title: 'Data Mapping',
            expanded: true, 
            selected: false, 
            scrollIntoView: true,
            graphNode: blockNode,
            ref: ref,
            blockElement: blockElement,
            dataProvider: dataProvider
        });

        blockNode.addProperty('expanded', newBlock.expanded, DataTypes.Boolean);
        blockNode.addProperty('selected', newBlock.selected, DataTypes.Boolean);

        this.addDataMappingNode(blockNode);
        this.addToDataMappingNodeMap(newBlock, blockNode);

        if (this.dataSourceTableBlocks.length !== 0) {
            const len = this.dataSourceTableBlocks.length;
            const lastBlock = this.dataSourceTableBlocks[len-1];
            this.addNextRelationship(lastBlock, newBlock);
        }
        this.addDataSourceTableBlock(newBlock);

        return newBlock;
    }   

    addDataSourceTableBlock = (dataSourceTableBlock) => {
        const currentIndex = this.dataSourceTableBlocks.findIndex(block => block.key === dataSourceTableBlock.key);
        if (currentIndex === -1) {
            this.dataSourceTableBlocks.push(dataSourceTableBlock);
        } else {
            try { 
                throw new Error('`Warning: dataSourceTableBlock with key ${dataSourceTableBlock.key} is already in the array`');
            } catch (e) {
                console.log(e);
            }
        }
    }
    
    getDataSourceTableBlock = ({key, ref, title, blockElement, dataProvider,
            expanded, selected, graphNode, scrollIntoView}) => {

        var showToggleTool = false;

        //console.log("getScenarioBlock expanded: ", expanded);
        const newBlock = new DataSourceTableBlock({
            key: key,
            title: title,
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

    addNextRelationship = (startBlock, endBlock, dontNotify) => {
        var graphRelationship = this.mappingGraphData.createRelationship({
            type: SubgraphRelationshipTypes.NEXT_DATA_SOURCE_MAPPING.name,
            startNode: startBlock.graphNode,
            endNode: endBlock.graphNode
        });
        this.mappingGraphData.addRelationship(graphRelationship, dontNotify);
    }    

    // NOTE: this is code is not currently being used, 
    // but leaving here temporarily (10/27/2021) in case there are things that need to be pulled out
    getDataMappingCypher = () => {
        const { dataMappings } = this.state;

        const rowVariable = 'row';
        const parameterVariable = 'rows';

        var cypherParameterDataSource = new CypherParameterDataSource({
            rowVariable: rowVariable,
            parameterVariable: parameterVariable
        });        
        /*
        dataMapping has format: 
        {
            key
            source
            destination
        }
        */

        /*
        dataMapping.destination has format: 
            {
                key
                propertyDefinition
                nodePattern (optional)
                nodeRelNodePattern (optional)
            }
        */

        // get all variables
        // look through all dataMappings - separate into nodePattern and nodeRelNodePattern arrays
        var allVariables = {};
        var nodePatternMappings = dataMappings
            .filter(x => x.destination.nodePattern);
        var relPatternMappings = dataMappings
            .filter(x => x.destination.nodeRelNodePattern);

        nodePatternMappings
            .filter(x => x.destination.nodePattern.variable)
            .map(x => allVariables[x.destination.nodePattern.variable] = x.destination.nodePattern.variable);

        relPatternMappings
            .filter(x => x.destination.nodeRelNodePattern.relationshipPattern.variable)
            .map(x => allVariables[x.destination.nodeRelNodePattern.relationshipPattern.variable]
                         = x.destination.nodeRelNodePattern.relationshipPattern.variable);

        // ensure each has a variable, if not present - assign one
        nodePatternMappings
            .filter(x => !x.destination.nodePattern.variable)
            .map(x => x.destination.nodePattern.variable = this.getNewVariable('n', allVariables));

        relPatternMappings
            .filter(x => !x.destination.nodeRelNodePattern.relationshipPattern.variable)
            .map(x => x.destination.nodeRelNodePattern.relationshipPattern.variable
                         = this.getNewVariable('r', allVariables));

        //  then group all of these by their variable
        var nodePatternVariableToDataMappingMap = {};
        nodePatternMappings.map(x => {
            const nodeVar = x.destination.nodePattern.variable;
            var varNodeMappings = nodePatternVariableToDataMappingMap[nodeVar];
            if (!varNodeMappings) {
                varNodeMappings = [];
                nodePatternVariableToDataMappingMap[nodeVar] = varNodeMappings;
            }
            varNodeMappings.push(x);
        });

        var relPatternVariableToDataMappingMap = {};
        relPatternVariableToDataMappingMap.map(x => {
            const relVar = x.destination.nodeRelNodePattern.relationshipPattern.variable;
            var varRelMappings = relPatternVariableToDataMappingMap[relVar];
            if (!varRelMappings) {
                varRelMappings = [];
                relPatternVariableToDataMappingMap[relVar] = varRelMappings;
            }
            varRelMappings.push(x);
        });

        //  for each node variable, find all dataMappings where there 
        //    is a GraphDestination that has the property isPartOfKey
        //    these will be used to make MERGE (n:NodeLabel {keyProp1: row.col1, keyProp2: row.col2, ...})
        var nodeMergeResults = Object.keys(nodePatternVariableToDataMappingMap).map(nodeVariable => {
            const nodeDataMappings = nodePatternVariableToDataMappingMap[nodeVariable];
            const nodeLabel = nodeDataMappings[0].destination.nodePattern.nodeLabels[0];
            if (!nodeLabel) {
                return {
                    validationError: {
                        validationStatus: ValidationStatus.Invalid,
                        validationMessage: `Node Variable ${nodeVariable} has not associated Node Label`,
                        nodeVariable
                    }
                }
            } else {
                var mappingsWithKeyProps = nodeDataMappings.filter(x => x.destination.propertyDefinition.isPartOfKey);
                if (mappingsWithKeyProps.length > 0) {
                    var patternPart = getNodePatternPart({
                        sourceVariable: rowVariable,
                        destinationVariable: nodeVariable, 
                        nodeLabel: nodeLabel, 
                        dataMappings: mappingsWithKeyProps
                    });
                    var nodeMergeInstruction = new MergeInstruction({
                        patternPart
                    });
                    return {
                        nodeMergeInstruction: nodeMergeInstruction
                    };
                } else {
                    return {
                        validationError: {
                            validationStatus: ValidationStatus.Invalid,
                            validationMessage: `NodeLabel ${nodeLabel} has no defined NodeKey properties`,
                            nodeVariable
                        }
                    }
                }
            }
        });

        // TODO: finish this

        // generate this:
        /*

        // for all properties that do not have isPartOfKey
        var setItem = getSetItem({
            sourceVariable: rowVariable, 
            destinationVariable: graphDestination.nodePattern.variable, 
            dataMapping: dataMapping
        })

        var setItems = new SetItems({ setItems: [
            setItem,
            ...
        ]});

        // analyze the cypherPattern - get all nodeRelNodePatterns
        //  for each nodeRelNodePattern - create a getRelationshipPatternPart
        var relationshipPatternPart = getRelationshipPatternPart({
            sourceVariable: nodeRelNodePattern.startNodePattern.variable,
            destinationVariable: nodeRelNodePattern.endNodePattern.variable, 
            relationshipType: nodeRelNodePattern.relationshipPattern.types[0]
        });
        var relationshipMergeInstruction = new MergeInstruction({ patternPart: personToAddressPatternPart });    

        var cypher = renderCypher({
            cypherDataSource: cypherParameterDataSource,
            dataInstructions: [
                nodeMergeInstruction, 
                setItems, 
                relationshipMergeInstruction
            ]
        });
        */
    }

    addDataMapping = (dataMapping) => {
        // for now, we will maintain 1 dataMapping per columnSource.  This may change in the future
        var currentIndex = this.dataMappings.indexOf(x => x.source.key === dataMapping.source.key);
        if (currentIndex !== -1) {
            this.dataMappings[currentIndex] = dataMapping;
        } else {
            this.dataMappings.push(dataMapping);
        }
    }

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
