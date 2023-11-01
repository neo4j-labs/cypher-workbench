import { doTransform } from "./DataModelMetadataTransform";

var dataModelMetadataDoc = `
{ 
    "dataModelMetadata": {
        "key": "222",
        "title": "Arrows import",
        "description": "",
        "notes": "",
        "dateCreated": "1588193382680",
        "dateUpdated": "1590246440018",
        "isPublic": false,
        "upsertTags": [
            {
                "key": "333",
                "tag": "Sports"
            }
        ],
        "removeTags": [

        ],
        "upsertCustomers": [
            {
                "key": "444",
                "name": "Neo4j"
            }
        ],
        "removeCustomers": [

        ]
    }
}
`
var expected = {
    graph: {
        upsertNodes: [
            {
                key: {
                  properties: { key: '222' },
                  labels: ['DataModelMetadata']
                },
                organizationLabels: [],
                upsertLabels: [],
                upsertProperties: {
                    title: "Arrows import",
                    description: "",
                    notes: "",
                    dateCreated: "1588193382680",
                    dateUpdated: "1590246440018"
                },
                removeProperties: ['viewSettings']
            },
            {
                key: {
                  properties: { key: '222' },
                  labels: ['DataModel']
                },
                organizationLabels: [],
                upsertLabels: [],
                upsertProperties: {
                    isPrivate: true
                },
                removeProperties: []
            },
            {
                key: {
                  properties: { key: '333' },
                  labels: ['Tag']
                },
                organizationLabels: [],
                upsertLabels: [],
                upsertProperties: {
                    tag: "Sports"
                },
                removeProperties: []
            },
            {
                key: {
                  properties: { key: '444' },
                  labels: ['Customer']
                },
                organizationLabels: [],
                upsertLabels: [],
                upsertProperties: {
                    name: "Neo4j"
                },
                removeProperties: []
            }
        ],  
        removeNodes: [
        ],
        upsertRelationships: [
            {
                startNodeKey: {
                    properties: { key: '222' },
                    labels: ['DataModelMetadata']
                },
                endNodeKey: {
                    properties: { key: '333' },
                    labels: ['Tag']
                },
                type: "HAS_TAG",
                upsertProperties: {
                },
                removeProperties: []
            },
            {
                startNodeKey: {
                    properties: { key: '222' },
                    labels: ['DataModelMetadata']
                },
                endNodeKey: {
                    properties: { key: '444' },
                    labels: ['Customer']
                },
                type: "HAS_CUSTOMER",
                upsertProperties: {
                },
                removeProperties: []
            }
        ],
        removeRelationships: [
        ]
    }
}

test('test DataModelMetadataTransform', () => {
    var dataModelMetadataDocJSON = JSON.parse(dataModelMetadataDoc);
    //console.log(dataModelMetadataDocJSON);
    var result = doTransform(dataModelMetadataDocJSON);
    //console.log(JSON.stringify(result.graph.upsertNodes));
    result.graph.upsertNodes.map(x => {
        var label = x.key.labels[0];
        var expectNode = expected.graph.upsertNodes.find(x2 => x2.key.labels.includes(label));
        expect(x).toEqual(expectNode);
    });
    result.graph.upsertRelationships.map(x => {
        var expectNode = expected.graph.upsertRelationships.find(x2 => x2.type === x.type);
        expect(x).toEqual(expectNode);
    });
});


