
import isEqual from 'lodash/isEqual';
import difference from 'lodash/difference';
import { NodeLabels } from './graphDataConstants';
import DataTypes from './DataTypes';
import { GraphData, Node, Relationship, Property } from './graphData';
import { GraphDataView, NodeDisplay, RelationshipDisplay } from './graphDataView';
import { SyncedGraphDataAndView } from './syncedGraphDataAndView';
import { EventEmitter, EventListener } from './eventEmitter';
import { KeyHelper } from './keyHelper';

const DataTypeToApocMetaDataType = {
    [DataTypes.String]: "STRING",
    [DataTypes.Integer]: "INTEGER",
    [DataTypes.Boolean]: "BOOLEAN",
    [DataTypes.Float]: "FLOAT",
    [DataTypes.StringArray]: "String[]"
    // TODO: add more types
}

// Important: make sure each object constructor has the following
/*
    this.myObjectName = '<class name>' 
    e.g. :
    this.myObjectName = 'GraphData' 
    
    there seems to be an issue with React or Chome optimization which will change the object.constructor.name
    so instead of object.constructor.name = 'GraphData', it becomes 't'. Then when deserializing,
    't' is not in the instanceMapper and it can't be deserialized.  Therefore using myObjectName should
    prevent these problems with function names being rewritten during an optimization step
*/
export const DefaultGraphInstanceMapper = {
    GraphData: () => new GraphData(),
    Node: () => new Node(),
    Relationship: () => new Relationship(),
    Property: () => new Property(),
    GraphDataView: () => new GraphDataView(),
    NodeDisplay: () => new NodeDisplay(),
    RelationshipDisplay: () => new RelationshipDisplay(),
    SyncedGraphDataAndView: () => new SyncedGraphDataAndView(),
    KeyHelper: () => new KeyHelper(),
    EventEmitter: () => new EventEmitter(),
    EventListener: () => new EventListener()    
}

export const SubgraphModelKeyConfigPrefixes = {
    keyConfig: 'keyConfig_',
    relKeyConfig: 'relKeyConfig_'
}

var dataTypeMap = {};
Object.keys(DataTypeToApocMetaDataType).map(key => {
    var value = DataTypeToApocMetaDataType[key];
    dataTypeMap[value] = key;
});

const ApocMetaDataTypeToDataType = dataTypeMap;

const ConvertFromApocMetaDataTypes = {
    STRING: (value) => (value) ? value : '',
    INTEGER: (value) => (value === 'undefined') ? undefined : parseInt(value),
    BOOLEAN: (value) => (value === 'undefined') ? undefined : JSON.parse(value),
    FLOAT: (value) => (value === 'undefined') ? undefined : parseFloat(value),
    ["String[]"]: (value) => (value === 'undefined') ? undefined : JSON.parse(value),
    ["LIST OF STRING"]: (value) => (value === 'undefined') ? undefined : JSON.parse(value)
    // TODO: add more types
}

const ConvertToApocMetaDataTypes = {
    [DataTypes.String]: (value) => (value) ? value : '',
    [DataTypes.Integer]: (value) => '' + value,
    [DataTypes.Boolean]: (value) => '' + value,
    [DataTypes.Float]: (value) => '' + value,
    [DataTypes.StringArray]: (value) => JSON.stringify(value)
    // TODO: add more types
}

const JavascriptValueToDataType = [
    {
        typeCheck: (value) => typeof(value) === 'boolean',
        datatype: DataTypes.Boolean
    },
    {
        typeCheck: (value) => typeof(value) === 'string',
        datatype: DataTypes.String
    },
    {
        typeCheck: (value) => typeof(value) === 'number' && parseInt(value) === value,
        datatype: DataTypes.Integer
    },
    {
        typeCheck: (value) => typeof(value) === 'number' && parseFloat(value) === value,
        datatype: DataTypes.Float
    },
    {
        typeCheck: (value) => typeof(value) === 'number' && parseFloat(value) === value,
        datatype: DataTypes.Float
    },
    {
        typeCheck: (value) => typeof(value) === 'object' && value instanceof Array 
                                        && getDataType(value[0]) === DataTypes.String,
        datatype: DataTypes.StringArray,
        arrayCheck: true
    },
    {
        typeCheck: (value) => typeof(value) === 'object' && value instanceof Array 
                                        && getDataType(value[0], true) === DataTypes.Integer,
        datatype: DataTypes.IntegerArray,
        arrayCheck: true
    },
    {
        typeCheck: (value) => typeof(value) === 'object' && value instanceof Array 
                                        && getDataType(value[0], true) === DataTypes.Float,
        datatype: DataTypes.FloatArray,
        arrayCheck: true
    },
    {
        typeCheck: (value) => typeof(value) === 'object' && value instanceof Array 
                                        && getDataType(value[0], true) === DataTypes.Boolean,
        datatype: DataTypes.BooleanArray,
        arrayCheck: true
    }
    // TODO: add more types
];

export function getDataType (value, ignoreArrayCheck) {
    var thingsToCheck = JavascriptValueToDataType.slice();
    if (ignoreArrayCheck) {
        thingsToCheck = thingsToCheck.filter(x => !x.arrayCheck);
    }
    var match = thingsToCheck.find(x => x.typeCheck(value));
    return (match) ? match.datatype : DataTypes.String;
}

export function getConnectedRelationships (node, relationships) {
    //console.log("getConnectedRelationships: ", node, relationships);
    var connections = relationships.filter(relationship => relationship.connectedToNode(node));
    /*
    console.log("connections: ", connections);
    try {
        throw new Error("logging call stack");
    } catch (e) {
        console.log(e);
    }
    */
    return connections;
}

export function getConnectedRelationshipBetweenNodes (node1, node2, relationships) {
    return relationships
        .sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1)
        .filter(relationship => 
            relationship.hasStartAndEndNodes(node1, node2) || relationship.hasStartAndEndNodes(node2, node1));
}

export function getConnectedNodes (node, relationships) {
    var connections = getConnectedRelationships(node, relationships);
    // return the other end of the relationship type
    return connections.map(x => (x.startNodeMatches(node)) ? x.getEndNode() : x.getStartNode());
}

/* look at relationships where the start and end nodes are the same, return the start node */
export function getNodesThatHaveSelfConnectedRelationships (relationships) {
    return relationships
        .filter(relationship => relationship.isSelfConnected())
        .map(relationship => relationship.getStartNode())
}

/* fetch relationships where there are more than 1 relationship between the start and end nodes */
export function getNodePairsThatHaveMoreThanOneRelationshipBetweenThem (relationships) {
    var map = {};
    relationships
        .filter(relationship => relationship.getStartNode() && relationship.getEndNode())
        .map(relationship => {
            // do alphabetic comparison - so that node-pairs are always ordered the same regardless if they are start-end or end-start
            // e.g. A-TO->B and B-FROM->A will result in a key A_B that will count both TO and FROM making the count 2
            var startNodeKey = relationship.getStartNode().key;
            var endNodeKey = relationship.getEndNode().key;
            var mapKey = (startNodeKey < endNodeKey) ? `${startNodeKey}_${endNodeKey}` : `${endNodeKey}_${startNodeKey}`;
            var mapEntry = map[mapKey];
            if (!mapEntry) {
                mapEntry = {
                    node1: relationship.getStartNode(),
                    node2: relationship.getEndNode(),
                    count: 0
                };
                map[mapKey] = mapEntry;
            }
            mapEntry.count++;
        });

    var mapToReturn = {};
    Object.keys(map)
        .filter(mapKey => map[mapKey].count > 1)
        .map(mapKey => mapToReturn[mapKey] = map[mapKey]);
    return mapToReturn;
}

export function convertToGraphNode (graphData, objectToConvert, conversionDefinition) {

    var createNodeProps = {
        key: objectToConvert.key,
        primaryNodeLabel: conversionDefinition.primaryNodeLabel,
        labels: conversionDefinition.labels
    }

    var node = graphData.createNode(createNodeProps);
    node.addProperty("key", objectToConvert.key);

    Object.keys(conversionDefinition.properties).map(dataType => {
        var propertyKeys = conversionDefinition.properties[dataType];
        propertyKeys.map(x => node.addProperty(x, objectToConvert[x], dataType));
    });
    
    return node;
}

export function getGraphQLProperty (property) {
    var apocDatatype = DataTypeToApocMetaDataType[property.datatype];
    var conversionFunc = ConvertToApocMetaDataTypes[property.datatype];

    if (!apocDatatype) {
        console.log(`warning: can't find apoc datatype for ${property.datatype}`);
        apocDatatype = 'STRING';
    }
    if (!conversionFunc) {
        console.log(`warning: can't find apoc conversion func for ${property.datatype}`);
        conversionFunc = (value) => '' + value;
    }

    return {
        key: property.key,
        datatype: apocDatatype,
        value: conversionFunc(property.value)
    }
}

export function convertGraphQLPropertiesToMap (graphQLPropertyArray) {
    /*
    example properties from GraphQL - this function converts them to a javascript map
    "properties": [
        {
            "key": "subgraphConfig_relationshipFilter",
            "datatype": "STRING",
            "value": "HAS_NODE_PATTERN>",
        },
        {
            "key": "subgraphConfig_labelFilter",
            "datatype": "STRING",
            "value": "+NodePattern",
        },
        {
            "key": "primaryNodeLabel",
            "datatype": "STRING",
            "value": "CypherBuilder",
        },
        {
            "key": "key",
            "datatype": "STRING",
            "value": "9b963504-1ba1-4065-a019-c565feba5c16",
        },
        {
            "key": "isPrivate",
            "datatype": "BOOLEAN",
            "value": "true",
        },
    */
    var propertyMap = {};
    graphQLPropertyArray.map(propEntry => {
        var conversionFunc = ConvertFromApocMetaDataTypes[propEntry.datatype];
        if (conversionFunc) {
            propertyMap[propEntry.key] = conversionFunc(propEntry.value);
        } else {
            throw new Error(`Unhandled datatype ${propEntry.datatype}, no conversion function specified`);
        }
    });
    return propertyMap;
}

export function convertSingleGraphQLProperty (property) {
    
    var datatype = ApocMetaDataTypeToDataType[property.datatype];
    var conversionFunc = ConvertFromApocMetaDataTypes[property.datatype];
    if (conversionFunc) {
        return {
            key: property.key,
            datatype: (datatype) ? datatype : DataTypes.String,
            value: conversionFunc(property.value)
        }
    } else {
        throw new Error(`Unhandled datatype ${property.datatype}, no conversion function specified`);
    }
}

export function getGraphRelationships (graphDataView, objectToConvert, graphViewNode, conversionDefinition) {
    var graphData = graphDataView.getGraphData();
    var graphViewRootNode = graphDataView.getGraphViewRootNode();

    return Object.keys(conversionDefinition.relationships).map(relationshipKey => {
        var relationshipDefinition = conversionDefinition.relationships[relationshipKey];
        var graphRelationship = null;
        var props = null;
        if (relationshipKey === NodeLabels.GraphView) {
            props = {
                type: relationshipDefinition.name,
                startNode: graphViewRootNode,
                endNode: graphViewNode
            };
            //console.log('first props: ', props);
        } else {
            var endNode = objectToConvert[relationshipKey];
            /* we need to get the graph node persistence version of the NodeDisplay */
            if (endNode instanceof NodeDisplay) {
                endNode = graphDataView.getCorrespondingGraphNode(endNode);
            }
            props = {
                type: relationshipDefinition.name,
                startNode: graphViewNode,
                endNode: endNode
            };
            //console.log('second props: ', props);
        }
        var startKey = (props.startNode) ? props.startNode.key : null;
        var endKey = (props.endNode) ? props.endNode.key : null;
        props.key = `${startKey}_${props.type}_${endKey}`;
        graphRelationship = graphData.createRelationship(props);

        return graphRelationship;
    });

}

/* 
    subgraphModel - a defined model in the code, e.g. the SUBGRAPH_MODEL of cypherPatternCanvasDataProvider
    properties - a key/value map of properties read from the database graph root node (of a graph doc)

    This will compare the in-code SUBGRAPH_MODEL with the stored subgraph model in properties
    If there is anything missing in properties, it will get added
*/
export function reconstituteLoadedSugraphModel (subgraphModel, properties) {
    // make a deep copy - so we don't inadvertently modify the defined copy
    var modifiedSubgraphModel = JSON.parse(JSON.stringify(subgraphModel));

    // grab keyConfig properties from properties
    var keyConfig = Object.keys(properties)
        .filter(propKey => propKey.startsWith(SubgraphModelKeyConfigPrefixes.keyConfig))
        .map(propKey => {
            var nodeLabel = propKey.replace(new RegExp(SubgraphModelKeyConfigPrefixes.keyConfig), '');
            return {
                nodeLabel: nodeLabel, 
                propertyKeys: properties[propKey]
            }
        });

    // grab relKeyConfig properties from properties
    var relKeyConfig = Object.keys(properties)
        .filter(propKey => propKey.startsWith(SubgraphModelKeyConfigPrefixes.relKeyConfig))
        .map(propKey => {
            var relationshipType = propKey.replace(new RegExp(SubgraphModelKeyConfigPrefixes.relKeyConfig), '');
            return {
                relationshipType: relationshipType, 
                propertyKeys: properties[propKey]
            }
        });

    // with both keyConfig and relKeyConfig from properties, see if they exist in the subgraph model
    keyConfig = keyConfig.concat(relKeyConfig);
    var newConfigEntries = subgraphModel.keyConfig
        .filter(x => {
            var existsInLoadedConfig = keyConfig.find(y => isEqual(x, y));
            return !existsInLoadedConfig;
        });
    newConfigEntries.map(x => keyConfig.push(x));

    modifiedSubgraphModel.keyConfig = keyConfig;

    // compare subgraphConfig_labelFilter
    var storedLabelFilterTokens = (properties.subgraphConfig_labelFilter) 
                    ? properties.subgraphConfig_labelFilter.split('|') : [];
    var codeLabelFilterTokens = (subgraphModel.subgraphConfig_labelFilter) 
                    ? subgraphModel.subgraphConfig_labelFilter.split('|') : [];
    
    var labelFilterResult = codeLabelFilterTokens
        .filter(x => !storedLabelFilterTokens.includes(x))
        .map(x => storedLabelFilterTokens.push(x));
    
    // compare subgraphConfig_relationshipFilter
    var storedRelationshipFilterTokens = (properties.subgraphConfig_relationshipFilter) 
                    ? properties.subgraphConfig_relationshipFilter.split('|') : [];
    var codeRelationshipFilterTokens = (subgraphModel.subgraphConfig_relationshipFilter) 
                    ? subgraphModel.subgraphConfig_relationshipFilter.split('|') : [];
    
    var relationshipFilterResult = codeRelationshipFilterTokens
        .filter(x => !storedRelationshipFilterTokens.includes(x))
        .map(x => storedRelationshipFilterTokens.push(x));

    var codeRemoteNodeLabels = modifiedSubgraphModel.remoteNodeLabels || [];
    var graphDocRemoteNodeLabels = properties['remoteNodeLabels'] || [];
    var delta = difference(codeRemoteNodeLabels, graphDocRemoteNodeLabels);
    const newRemoteNodeLabels = (delta.length > 0) ? codeRemoteNodeLabels : null;

    return {
        modifiedSubgraphModel: modifiedSubgraphModel,
        newRemoteNodeLabels: newRemoteNodeLabels,
        newConfigEntries: newConfigEntries,
        newLabelFilter: (labelFilterResult.length > 0) 
                ? storedLabelFilterTokens.join('|') : null,
        newRelationshipFilter: (relationshipFilterResult.length > 0) 
                ? storedRelationshipFilterTokens.join('|') : null
    }
}

export function saveNewConfigEntries (graphRootNode, newConfigEntries, newLabelFilter, newRelationshipFilter, newRemoteNodeLabels) {
    // persist any new config entries
    newConfigEntries.map(newConfigEntry => {
        var key = (newConfigEntry.nodeLabel) 
            ? `${SubgraphModelKeyConfigPrefixes.keyConfig}${newConfigEntry.nodeLabel}`
            : `${SubgraphModelKeyConfigPrefixes.relKeyConfig}${newConfigEntry.relationshipType}`
        graphRootNode.addProperty(key, newConfigEntry.propertyKeys, DataTypes.StringArray);
    });

    // if we have a new LabelFilter persist it
    if (newLabelFilter) {
        graphRootNode.addOrUpdateProperty("subgraphConfig_labelFilter", newLabelFilter, DataTypes.String);
    }

    // if we have a new RelationshipFilter persist it
    if (newRelationshipFilter) {
        graphRootNode.addOrUpdateProperty("subgraphConfig_relationshipFilter", newRelationshipFilter, DataTypes.String);
    }

    // we have a new value for remoteNodeLabels, persist it
    if (newRemoteNodeLabels) {
        graphRootNode.addOrUpdateProperty("remoteNodeLabels", newRemoteNodeLabels, DataTypes.StringArray);
    }
}

const ID_SEPARATOR = '_$$_';
const REG_EX_ID_SEPARATOR = ID_SEPARATOR.replace(/\$/g,'\\$');
const REG_EX_STR = `^([^${REG_EX_ID_SEPARATOR}]*)${REG_EX_ID_SEPARATOR}(.*)$`;
const ID_SEPARATOR_REG_EX_EXPR = new RegExp(REG_EX_STR);

export const getSerializableObjectId = (object, objectIdMap) => {
    if (object && typeof(object) === 'object') {
        var objectName = (object.myObjectName) 
                                ? object.myObjectName
                                : (object.constructor && object.constructor.name) 
                                    ? object.constructor.name 
                                    : 'Object';
        var id = '';
        var objectIdMapKeys = Object.keys(objectIdMap);
        var existingObjectKey = objectIdMapKeys.find(key => objectIdMap[key] === object);
        if (existingObjectKey) {
            id = existingObjectKey;
        } else {
            id = objectIdMapKeys.length + 1;
            objectIdMap[id] = object;
        }
        return `${objectName}${ID_SEPARATOR}${id}`;
    } else {
        return null;
    }
}

const serializeValue = (value, objectKeyMap, objectIdMap, maxDepth, currentDepth) => {
    if (typeof(value) === 'function') {
        return { skip: true };
    } else if (Array.isArray(value)) {
        //console.log('we have an array');
        var array = value
            .map(x => serializeValue(x, objectKeyMap, objectIdMap, maxDepth, currentDepth + 1))
            .filter(result => !result.skip)
            .map(result => result.value)
        //console.log('array is: ', array);
        return { skip: false, value: array };
    } else if (typeof(value) === 'object') {
        var serializedValue;
        if (value === null) {   // yes, typeof(null) === 'object'
            serializedValue = null;
        } else {
            var result = serializeObject(value, objectKeyMap, objectIdMap, {maxDepth, currentDepth: currentDepth + 1});
            const { serializedObject } = result;
            serializedValue = (serializedObject) ? serializedObject : { objectSerializedId: result.objectSerializedId }
        }
        return { 
            skip: false,
            value: serializedValue
        };
    } else {
        return { skip: false, value: value };
    }
}

/* recurses through objects and arrays and does the following
    everywhere there is an object that has a getSerializedId() function it adds
    it to the objectKeyMap.  Then when it is encountered again, during recursion
    it just returns the key of the object already in the map

    this way, an object that forms recursive references to itself can be serialized
    as JSON
*/  
export const serializeObject = (object, objectKeyMap, objectIdMap, config) => {
    config = config || {};
    var {maxDepth, currentDepth} = config;

    currentDepth = (currentDepth === undefined || currentDepth === null) ? 0 : currentDepth;
    if (maxDepth !== undefined) {
        if (currentDepth >= maxDepth) {
            return {
                objectSerializedId: 'max_depth_exceeded',
                objectKeyMap: objectKeyMap
            }
        }
    }

    objectKeyMap = objectKeyMap || {};
    objectIdMap = objectIdMap || {};
    const objectSerializedId = getSerializableObjectId(object, objectIdMap);
    
    if (objectKeyMap[objectSerializedId]) {
        //console.log('returning');
        return { objectSerializedId };
    }

    if (object && typeof(object) === 'object') {
        var serializedObject = {};
        if (objectSerializedId !== null) {
            objectKeyMap[objectSerializedId] = serializedObject;
        }
        Object.keys(object).map(key => {
            var value = object[key];
            //console.log('serializing key: ', key);
            //console.log('value: ', value);
            var serializeValueResult = serializeValue(value, objectKeyMap, objectIdMap, maxDepth, currentDepth + 1);
            if (!serializeValueResult.skip) {
                serializedObject[key] = serializeValueResult.value;
            }
        });
    }
    if (objectSerializedId !== null) {
        return {
            objectSerializedId: objectSerializedId,
            objectKeyMap: objectKeyMap
        };
    } else {
        return { serializedObject }
    }
}

/** 
 * serializedObject: the object returned from serializeObject()
 * instanceMapper: a map of Object name to functions that will construct those objects
 * */ 
export const deserializeObject = (serializedObject, instanceMapper, deserializedObjects) => {

    deserializedObjects = deserializedObjects || {};
    instanceMapper = instanceMapper || DefaultGraphInstanceMapper;
    const { objectSerializedId, objectKeyMap, objectValue } = serializedObject;
    var objectName = 'Object';
    if (objectSerializedId) {
        var match = objectSerializedId.match(ID_SEPARATOR_REG_EX_EXPR);
        objectName = match[1];
    }

    if (objectSerializedId && deserializedObjects[objectSerializedId]) {
        return deserializedObjects[objectSerializedId];
    }

    var objectToWorkOn = (objectSerializedId) ? objectKeyMap[objectSerializedId] : objectValue;

    var objectToInstantiate;
    if (objectName === 'Object') {
        objectToInstantiate = {};
    } else {
        var objectMakerFunc = instanceMapper[objectName];
        if (!objectMakerFunc) {
            throw new Error(`Deserialization error. No instanceMapper for '${objectName}' found`);
        }
        objectToInstantiate = objectMakerFunc();
    }
    if (objectSerializedId) {
        deserializedObjects[objectSerializedId] = objectToInstantiate;
    }
    if (typeof(objectToWorkOn) === 'object') {
        Object.keys(objectToWorkOn).map(key => {
            //console.log('deserializing key: ', key);
            var deserializeValueResult = deserializeValue(objectToWorkOn[key], objectKeyMap, instanceMapper, deserializedObjects);
            if (!deserializeValueResult.skip) {
                objectToInstantiate[key] = deserializeValueResult.value;
            }
        });
        if (typeof(objectToInstantiate.afterDeserialize) === 'function') {
            objectToInstantiate.afterDeserialize();
        }
        return objectToInstantiate;
    } else {
        return objectToWorkOn;
    }
}

export const deserializeValue = (value, objectKeyMap, instanceMapper, deserializedObjects) => {
    if (typeof(value) === 'function') {
        return { skip: true }
    } else if (Array.isArray(value)) {
        var array = value
            .map(x => deserializeValue(x, objectKeyMap, instanceMapper, deserializedObjects))
            .filter(result => !result.skip)
            .map(result => result.value);
        return { skip: false, value: array };
    } else if (typeof(value) === 'object') {
        var deserializedValue;
        if (value === null) {   // yes, typeof(null) === 'object'
            deserializedValue = null;
        } else {
            const objectToDeserialize = {
                objectSerializedId: value.objectSerializedId,
                objectKeyMap: objectKeyMap,
                objectValue: value
            }
            deserializedValue = deserializeObject(objectToDeserialize, instanceMapper, deserializedObjects);
        }
        return { 
            skip: false,
            value: deserializedValue
        };
    } else {
        return { skip: false, value: value };
    }
}

