export const data =
{
    "neoConnectionInfo": {
        "database": "neo4j"
    },
    "queryInfo": {
        "cypher": "CALL gds.graph.streamNodeProperties('ClientsAndTransactions', ['amount']) YIELD nodeId, nodeProperty, propertyValue RETURN gds.util.asNode(nodeId).id AS name, nodeProperty, propertyValue ORDER BY name, nodeProperty",
        "outputFields": [
            {
                "name": "name",
                "type": "String"
            },
            {
                "name": "nodeProperty",
                "type": "String"
            },
            {
                "name": "propertyValue",
                "type": "Float"
            }
        ]
    },
    "bigQueryOutput": {
        "projectId": "big-query-project-id",
        "datasetId": "dataset-id",
        "tableName": "TableNameToTransfer"
    }
};

