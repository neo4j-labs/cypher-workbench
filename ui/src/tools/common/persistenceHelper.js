
import {
    getUserSettings,
    NETWORK_STATUS
} from '../../persistence/graphql/GraphQLPersistence';

import {
    grabLock,
    searchRemoteGraphDocMetadata,
    saveRemoteGraphDocMetadata,
    saveRemoteGraphDocWithView,
    saveRemoteGraphDocMetadataWithView,
    saveRemoteGraphDocWithChildGraphDocWithView,    
    listRemoteGraphDocMetadata,
    loadRemoteGraphDoc,
    loadRemoteGraphDocAndDefaultView,
    deleteRemoteGraphDocs,
    deleteRemoteGraphDocAndDefaultView,
    loadRemoteGraphDocMetadata,
    loadLastOpenedGraphDoc,
    loadLastOpenedGraphDocAndDefaultView,
    saveGraphDocChanges
} from '../../persistence/graphql/GraphQLGraphDoc';

import { 
    associateScenarioToCypher,
    removeScenarioToCypherAssociation,
    listCypherStatements,
    searchForCypherStatements
} from '../../persistence/graphql/GraphQLCypherAssociations';

import { ensureProperties } from './util';
import { ALERT_TYPES } from '../../common/Constants';

export class PersistenceHelper {

    retryTimer = null;
    props = {};

    constructor (properties) {

        var requiredProperties = [
            'graphDocContainer',
            'getNetworkStatus',
            'LOCAL_STORAGE_KEY',
            'REMOTE_GRAPH_DOC_TYPE',
            'SUBGRAPH_MODEL'
        ];
        requiredProperties.map(prop => {
            ensureProperties('PersistenceHelper', properties, prop);
        });
        this.props = properties;
    }

    getUserSettings = (email, callback) => getUserSettings(email, callback);

    removeGraphDocFromLocalStorage = () => {
        // new
        const activeKey = this.props.graphDocContainer.getActiveKey();
        if (activeKey) {
            localStorage.removeItem(`${this.props.LOCAL_STORAGE_KEY}_${activeKey}`);
            var localGraphDocKeysString = localStorage.getItem(this.getLocalKeysName());
            if (localGraphDocKeysString) {
                var localGraphDocKeys = JSON.parse(localGraphDocKeysString);
                var index = localGraphDocKeys.indexOf(activeKey);
                if (index >= 0) {
                    localGraphDocKeys.splice(index,1);
                    if (localGraphDocKeys.length === 0) {
                        localStorage.removeItem(this.getLocalKeysName());
                    } else {
                        localStorage.setItem(this.getLocalKeysName(), JSON.stringify(localGraphDocKeys));
                    }
                }
            }
        }
    }

    getLocalStorageGraphDocString = () => {
        var localGraphDocString = null;
        var localGraphDocKeysString = localStorage.getItem(this.getLocalKeysName());
        if (localGraphDocKeysString) {
            var localGraphDocKeys = JSON.parse(localGraphDocKeysString);
            if (localGraphDocKeys.length > 0) {
                var lastKey = localGraphDocKeys[localGraphDocKeys.length - 1];
                localGraphDocString = localStorage.getItem(`${this.props.LOCAL_STORAGE_KEY}_${lastKey}`);
            }
        }
        return localGraphDocString;
    }

    storeLocallyAndScheduleRetry = (messageName, messagePayload, graphDocMetadata, cypherBlockDataProvider) => {
        this.saveChangesLocally(messageName, messagePayload, graphDocMetadata, cypherBlockDataProvider);
        if (this.props.getNetworkStatus() === NETWORK_STATUS.ONLINE || this.props.getNetworkStatus() === NETWORK_STATUS.NETWORK_RETRY) {
            this.scheduleRetry(messageName, messagePayload, graphDocMetadata, cypherBlockDataProvider, 15);
        }
    }
    
    scheduleRetry = (messageName, messagePayload, graphDocMetadata, cypherBlockDataProvider, numSeconds) => {
        console.log('scheduleRetry called');
        if (this.retryTimer) { clearTimeout(this.retryTimer); }
        this.retryTimer = setTimeout(() => 
            this.props.graphDocContainer.saveChanges(
                messageName,
                messagePayload,
                graphDocMetadata,
                cypherBlockDataProvider
            ), numSeconds * 1000);
    }

    clearRetryTimer = () => {
        if (this.retryTimer) { clearTimeout(this.retryTimer); } 
    }    

    saveChangesLocally = (messageName, messagePayload, graphDocMetadata, dataProvider) => {

        if (dataProvider.getSerializedDataSaveObj) {
            var serializedDataSaveObj = dataProvider.getSerializedDataSaveObj();

            var saveKey = `${this.props.LOCAL_STORAGE_KEY}_${graphDocMetadata.key}`;
            localStorage.setItem(saveKey, JSON.stringify({
                messageName,
                messagePayload: {}, // Not storing for now, current implementation does not use it for saving
                graphDocMetadata,
                serializedDataSaveObj
            }));
            this.addLocalGraphDocKey(graphDocMetadata.key);
        } else {
            console.log("Local storage not implemented");
            alert("Local storage not implemented", ALERT_TYPES.WARNING);
        }
    }

    getLocalKeysName = () => `${this.props.LOCAL_STORAGE_KEY}Keys`;

    addLocalGraphDocKey = (key) => {
        var localGraphDocKeysString = localStorage.getItem(this.getLocalKeysName());
        var localGraphDocKeys = [];
        if (localGraphDocKeysString) {
            localGraphDocKeys = JSON.parse(localGraphDocKeysString);
        }
        if (!localGraphDocKeys.includes(key)) {
            localGraphDocKeys.push(key);
            localStorage.setItem(this.getLocalKeysName(), JSON.stringify(localGraphDocKeys));
        }
    }

    grabLock = (graphDocKey, callback) => {
        grabLock(graphDocKey, callback);
    }

    saveRemoteGraphDoc = (graphDocMetadata, idJoiner, graphDocChanges, graphDocDeletions, resetDataFunc, callback) => {
        //var now = new Date().getTime();

        saveGraphDocChanges (graphDocMetadata, idJoiner, graphDocChanges, graphDocDeletions, (response) => {
            if (response.success) {
                //resetDataFunc(now);
                resetDataFunc();
                //var howDidNodesChange = data.getGraphData().howDidNodesChange();    // for debugging
                //var howDidNodesChange2 = data.getGraphDataView().getGraphData().howDidNodesChange();    // for debugging
                //console.log('how did nodes change: ', howDidNodesChange);
            }
            callback(response);
        });
    }

    loadLastOpenedGraphDocAndDefaultView = (callback) => {
        loadLastOpenedGraphDocAndDefaultView(this.props.REMOTE_GRAPH_DOC_TYPE, callback);
    }

    loadLastOpenedGraphDoc = (callback) => {
        loadLastOpenedGraphDoc(this.props.REMOTE_GRAPH_DOC_TYPE, callback);
    }

    loadRemoteGraphDocAndDefaultView = (graphDocKey, callback) => {
        loadRemoteGraphDocAndDefaultView(graphDocKey, callback);
    }

    deleteRemoteGraphDocAndDefaultView = (graphDocKey, callback) => {
        deleteRemoteGraphDocAndDefaultView(graphDocKey, callback);
    }

    deleteRemoteGraphDocs = (graphDocKeys, callback) => {
        deleteRemoteGraphDocs(graphDocKeys, callback);
    }

    loadRemoteGraphDoc = (graphDocKey, callback) => {
        loadRemoteGraphDoc(graphDocKey, callback);
    }

    saveRemoteGraphDocMetadata = (graphDocMetadata, previousState, callback) => {
        saveRemoteGraphDocMetadata(graphDocMetadata, this.props.SUBGRAPH_MODEL, previousState, callback);
    }
    
    saveRemoteGraphDocWithView = (graphDocKey, graphDataView, securityDelegate, callback) => {
        saveRemoteGraphDocWithView(graphDocKey, graphDataView, this.props.SUBGRAPH_MODEL, securityDelegate, callback);
    }
    
    saveRemoteGraphDocMetadataWithView = (graphDocMetadata, graphDataView, previousState, callback) => {
        saveRemoteGraphDocMetadataWithView(graphDocMetadata, graphDataView, this.props.SUBGRAPH_MODEL, previousState, callback);
    }

    saveRemoteGraphDocWithChildGraphDocWithView = (mainGraphDoc, mainGraphDocKeyHelper, mainSubRelationshipType, subGraphDoc, subGraphDataView, subGraphModel, callback) => {
        saveRemoteGraphDocWithChildGraphDocWithView(mainGraphDoc, mainGraphDocKeyHelper, mainSubRelationshipType, subGraphDoc, subGraphDataView, subGraphModel, callback);        
    }    

    searchRemoteGraphDocMetadata = (searchText, myOrderBy, orderDirection, callback) => {
        searchRemoteGraphDocMetadata(this.props.REMOTE_GRAPH_DOC_TYPE, searchText, myOrderBy, orderDirection, callback);
    }

    listRemoteGraphDocMetadata = (myOrderBy, orderDirection, callback) => {
        listRemoteGraphDocMetadata(this.props.REMOTE_GRAPH_DOC_TYPE, myOrderBy, orderDirection, callback);
    }

    searchRemoteCypherStatements = (searchText, myOrderBy, orderDirection, callback) => {
        searchForCypherStatements(searchText, myOrderBy, orderDirection, callback);
    }

    listRemoteCypherStatements = (myOrderBy, orderDirection, callback) => {
        listCypherStatements(myOrderBy, orderDirection, callback);
    }

    associateScenarioToCypher = (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, callback) => {
        associateScenarioToCypher(scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, callback);
    }

    removeScenarioToCypherAssociation = (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, callback) => {
        removeScenarioToCypherAssociation (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, callback);
    }
}