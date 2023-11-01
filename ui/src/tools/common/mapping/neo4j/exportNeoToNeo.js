
import { ALERT_TYPES } from '../../../../common/Constants';
import { 
    getConnectionInfoWithEncryptedUsernameAndPassword 
} from '../../../../common/Cypher';
import { TOOL_NAMES } from '../../../../common/LicensedFeatures';
import { runNeo4jToNeo4j } from '../../../../persistence/graphql/GraphQLDataTransfer';
import { serializeModelExportToJson } from './dataExportJson';

const isEmptyObject = (obj) => { 
    obj = obj || {};
    return Object.keys(obj).length === 0; 
}

export const getNeoConnection = async (neo4jDatabaseConnection) => {
    const neoConnectionInfo = await getConnectionInfoWithEncryptedUsernameAndPassword({
        driverId: neo4jDatabaseConnection.id,
        connectionInfo: {
            databaseName: neo4jDatabaseConnection.databaseName,
            encrypted: neo4jDatabaseConnection.encrypted,
            id: neo4jDatabaseConnection.id,
            name: neo4jDatabaseConnection.name,
            url: neo4jDatabaseConnection.url
        }
    });
    return neoConnectionInfo;
};

export const getNeoConnections = async ({
    sourceNeo4jDatabaseConnection,
    destNeo4jDatabaseConnection,
    sourceNeo4jDatabaseLabel,
    destNeo4jDatabaseLabel
}) => {

    if (isEmptyObject(sourceNeo4jDatabaseConnection)) {
        alert(`You must select a ${sourceNeo4jDatabaseLabel}`, ALERT_TYPES.WARNING);
        return;
    }
    if (isEmptyObject(destNeo4jDatabaseConnection)) {
        alert(`You must select a ${destNeo4jDatabaseLabel}`, ALERT_TYPES.WARNING);
        return;
    }

    const sourceNeoConnectionInfo = await getConnectionInfoWithEncryptedUsernameAndPassword({
        driverId: sourceNeo4jDatabaseConnection.id,
        connectionInfo: {
            databaseName: sourceNeo4jDatabaseConnection.databaseName,
            encrypted: sourceNeo4jDatabaseConnection.encrypted,
            id: sourceNeo4jDatabaseConnection.id,
            name: sourceNeo4jDatabaseConnection.name,
            url: sourceNeo4jDatabaseConnection.url
        }
    });

    const destNeoConnectionInfo = await getConnectionInfoWithEncryptedUsernameAndPassword({
        driverId: destNeo4jDatabaseConnection.id,
        connectionInfo: {
            databaseName: destNeo4jDatabaseConnection.databaseName,
            encrypted: destNeo4jDatabaseConnection.encrypted,
            id: destNeo4jDatabaseConnection.id,
            name: destNeo4jDatabaseConnection.name,
            url: destNeo4jDatabaseConnection.url
        }
    });

    return {
        sourceNeoConnectionInfo,
        destNeoConnectionInfo
    }    
}

export const getExportDataJson = async ({
    pipelineOptions,
    nodeLabelKeysChecked,
    relationshipTypeKeysChecked,
    dataModel,
    dataModelMetadata,
    sourceNeo4jDatabaseConnection,
    destNeo4jDatabaseConnection,
    sourceNeo4jDatabaseLabel,
    destNeo4jDatabaseLabel
}) => {
    var neoConnections = await getNeoConnections({
        sourceNeo4jDatabaseConnection,
        destNeo4jDatabaseConnection,
        sourceNeo4jDatabaseLabel,
        destNeo4jDatabaseLabel
    });
    if (!neoConnections) { 
        return;
    }
    const { 
        sourceNeoConnectionInfo,
        destNeoConnectionInfo
    } = neoConnections;

    const nodeLabelsToExport = Object.keys(nodeLabelKeysChecked)
        .filter(key => nodeLabelKeysChecked[key])   // if checked, include it
        .map(key => dataModel.getNodeLabelByKey(key))   // get the node label
        .filter(nodeLabel => nodeLabel); // get rid of nulls

    const relationshipTypesToExport = Object.keys(relationshipTypeKeysChecked)
        .filter(key => relationshipTypeKeysChecked[key])   // if checked, include it
        .map(key => dataModel.getRelationshipTypeByKey(key))   // get the node label
        .filter(relationshipType => relationshipType); // get rid of nulls

    if (nodeLabelsToExport.length === 0 && relationshipTypesToExport.length === 0 ) {
        alert('You must select at least 1 item to export', ALERT_TYPES.WARNING)
        return;
    }

    var json = serializeModelExportToJson({
        pipelineOptions,
        dataModel, 
        dataModelMetadata, 
        nodeLabelsToExport, 
        relationshipTypesToExport,
        sourceNeoConnectionInfo, 
        destNeoConnectionInfo
    })

    //console.log(json);
    //console.log(JSON.stringify(json));

    return json;
};

export const exportData = async ({  
    pipelineOptions,
    nodeLabelKeysChecked,
    relationshipTypeKeysChecked,
    dataModel,
    dataModelMetadata,
    sourceNeo4jDatabaseConnection,
    destNeo4jDatabaseConnection,
    sourceNeo4jDatabaseLabel,
    destNeo4jDatabaseLabel,
    activateTool
}) => {
    const json = await getExportDataJson({
        pipelineOptions,
        nodeLabelKeysChecked,
        relationshipTypeKeysChecked,
        dataModel,
        dataModelMetadata,
        sourceNeo4jDatabaseConnection,
        destNeo4jDatabaseConnection,
        sourceNeo4jDatabaseLabel,
        destNeo4jDatabaseLabel,
    });

    callExportService(json, activateTool);
}

export const callExportService = (json, activateTool) => {
    const transferInfo = JSON.stringify(json);
    const serviceID = "neo4j-to-neo4j"
    //console.log('exportInfo: ', exportInfo);
    runNeo4jToNeo4j(serviceID, transferInfo, (response) => {
        console.log('Run neo4j-to-neo4j response: ', response);
        var customButton = null;
        if (activateTool) {
            customButton = {
                onClick: () => activateTool(TOOL_NAMES.DATA_SCIENCE_DASHBOARD),
                text: 'Monitor Job'
            }
        }
        alert('The Neo4j to Neo4j job has been submitted', ALERT_TYPES.INFO, {}, customButton);
    });
}

