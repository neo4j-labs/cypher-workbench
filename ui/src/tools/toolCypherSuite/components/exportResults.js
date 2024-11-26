import { getCypherQueryInfo } from "../../common/cypher/processCypher";
import { runNeo4jToBigQuery } from "../../../persistence/graphql/GraphQLDataTransfer";

export const getExportPayload = ({cypherQuery, neoConnectionInfo, bigQueryExportInfo}) => {
    /*
        {
            "neoConnectionInfo": {
                ...
            },
            "queryInfo": {
                "cypher": "MATCH (n) RETURN n.prop1 as prop1, n.prop2 as prop2",
                "outputFields": [
                    {
                        name: "prop1",
                        type: "String"
                    },
                    {
                        name: "prop2",
                        type: "String"
                    }
                ]
            },
            "bigQueryOutput": {
                "projectId": "neo4j-solutions-workbench",
                "datasetId": "Paysim",
                "tableName": "cypherOutput"
            }
        }
    */

    const queryInfo = getCypherQueryInfo(cypherQuery);
    if (!queryInfo) {
        return null;
    };
    
    var { outputFields, cypher } = queryInfo;
    cypher = cypher || '';
    // replace embedded newlines in cypher with spaces
    cypher = cypher.replace(/\n/g, ' ');

    var exportInfo = {
        neoConnectionInfo,
        queryInfo: {
            cypher,
            outputFields
        },
        bigQueryOutput: bigQueryExportInfo
    }
    return exportInfo;
}

export const exportResults = ({cypherQuery, neoConnectionInfo, bigQueryExportInfo}, callback) => {
    const exportInfo = getExportPayload({cypherQuery, neoConnectionInfo, bigQueryExportInfo});
    const exportInfoJson = JSON.stringify(exportInfo);
    const serviceID = "neo4j-to-bigquery"
    //console.log('exportInfo: ', exportInfo);
    if (exportInfo) {
        runNeo4jToBigQuery(serviceID, exportInfoJson, (response) => {
            //console.log('Run export job response: ', response);
            if (callback) {
                callback(response);
            }
        });
    }
}