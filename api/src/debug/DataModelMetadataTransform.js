
var dataModelTransform = {
	rootNode: 'dataModelMetadata',
	definitions: {
		dataModelMetadata: {
			key: {
				labels: ['DataModelMetadata'],
				properties: ['key']
			},
			additionalProcessing: {
                upsertNodes: [{
                    key: {
                        labels: ['DataModel'],
                        properties: ['key']
                    },
                    properties: [{from:'isPublic',operation:'!',to:'isPrivate'}]
                }]
            },
			properties: ['title','description','notes','viewSettings','dateCreated','dateUpdated'],
			relationships: {
				customers: {
					type: 'HAS_CUSTOMER',
					endNode: 'customer'
				},
				tags: {
					type: 'HAS_TAG',
					endNode: 'tag'
				}
			}
		},
		customer: {
			key: {
				labels: ['Customer'],
				properties: ['key']
			},
			properties: ['name']
		},
		tag: {
			key: {
				labels: ['Customer'],
				properties: ['key']
			},
			properties: ['tag']
		}
	}
}

function getKey (json, keyDefinition) {
    var keyProperties = {};
    keyDefinition.properties.map(x => {
        if (typeof(x) === 'object') {
            keyProperties[x.to] = json[x.from];
        } else {
            keyProperties[x] = json[x]
        }
    });

    return {
        properties: keyProperties,
        labels: keyDefinition.labels.slice(0)
    }
}

function getNode (json, definition) {

    var upsertProperties = {};
    var removeProperties = [];
    definition.properties.map(x => {
        if (typeof(x) === 'object') {
            if (x.operation === '!') {
                upsertProperties[x.to] = !json[x.from];
            } else {
                upsertProperties[x.to] = json[x.from];
            }
        } else {
            if (json.hasOwnProperty(x)) {
                upsertProperties[x] = json[x];
            } else {
                removeProperties.push(x);
            }        
        }
    });

    return {
        key: getKey(json, definition.key),
        organizationLabels: [],
        upsertLabels: [],
        upsertProperties: upsertProperties,
        removeProperties: removeProperties
    };
}

function processNode (json, definition, graphDoc, transform) {

    var node = getNode(json, definition);
    graphDoc.graph.upsertNodes.push(node);
    if (definition.additionalProcessing) {
        if (definition.additionalProcessing.upsertNodes) {
            definition.additionalProcessing.upsertNodes.map(x => {
                var additionalNode = getNode(json, x)
                graphDoc.graph.upsertNodes.push(additionalNode);
            });
        }
    }

    Object.keys(definition.relationships).map(relationshipKey => {
        var relationshipDefinition = definition.relationships[relationshipKey];
        // check for upserts - transform the relationshipKey into upsertRelationshipKey
        var upsertJsonKey = 'upsert' + relationshipKey.substring(0,1).toUpperCase() + relationshipKey.substring(1);
        var upsertJsonValues = json[upsertJsonKey];
        var endNodeDefinition = transform.definitions[relationshipDefinition.endNode];
        // for each entry in json the array, need to process with the transform[endNode] definition
        upsertJsonValues.map(arrayValue => {
            var additionalNode = getNode(arrayValue, endNodeDefinition, graphDoc, transform);
            graphDoc.graph.upsertNodes.push(additionalNode);

            var relationship = {
                startNodeKey: {
                    ...node.key
                },
                endNodeKey: {
                    ...additionalNode.key
                },
                type: relationshipDefinition.type,
                upsertProperties: {},
                removeProperties: []
            }
            graphDoc.graph.upsertRelationships.push(relationship);
        });

        var removeJsonKey = 'remove' + relationshipKey.substring(0,1).toUpperCase() + relationshipKey.substring(1);
        console.log('TODO: handle removeJsonKey');
    });
}

export function doTransform (jsonDoc) {
    var expected = {
        graph: {
            upsertNodes: [
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

    var graphDoc = {
        graph: {
            upsertNodes: [],
            removeNodes: [],
            upsertRelationships: [],
            removeRelationships: []
        }
    }

    var transform = dataModelTransform;
    var rootJson = jsonDoc[transform.rootNode];
    var rootDefinition = transform.definitions[transform.rootNode];
    processNode(rootJson, rootDefinition, graphDoc, transform);
    //console.log('graphDoc', graphDoc);

    return graphDoc;    
}
