// import uuidv4 from 'uuid/v4';
import JaroWrinker from './JaroWrinker';
import DataTypes from './DataTypes';
import { EventEmitter } from './eventEmitter';
import { KeyHelper } from './keyHelper';
import { 
    convertSingleGraphQLProperty,
    reconstituteLoadedSugraphModel,
    saveNewConfigEntries
 } from './graphUtil';
import { GraphChangeType, NodeLabels } from './graphDataConstants';

export class Property {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            key, 
            value, 
            datatype,
            graphData,
            dataChangedSinceLastSave,
            dataChangeTimestamp
        } = properties;

        this.myObjectName = 'Property';    // because either Chrome or React is changing object.constructor.name
        
        this.key = key;
        this.value = value;
        this.datatype = (datatype) ? datatype : DataTypes.String;
        this.graphData = graphData;
        this.dataChangedSinceLastSave = (typeof(dataChangedSinceLastSave) === 'boolean') ? dataChangedSinceLastSave : false;
        this.dataChangeTimestamp = (typeof(dataChangeTimestamp) === 'number') ? dataChangeTimestamp : undefined;
    }

    getGraphData () {
        return this.graphData;
    }

    setGraphData (graphData) {
        if (this.graphData !== graphData) {
            // we will make the assumption that the data has not been saved
            this.dataChangedSinceLastSave = true;
            this.dataChangeTimestamp = new Date().getTime();
        };
        this.graphData = graphData;
    }

    getString () {
        return this.key + ":" + this.value;
    }

    resetDataChangeFlags (timestamp) {
        if (this.dataChangeTimestamp < timestamp) {
            //console.log("Property resetDataChangeFlags reset key: " + this.key);
            this.dataChangedSinceLastSave = false;
        }
    }
}

export class PropertyContainer {
    constructor (constructorProperties) {
        constructorProperties = (constructorProperties) ? constructorProperties : {};
        var { 
            properties,
            dataChangedSinceLastSave,
            dataChangeTimestamp,
            graphData
        } = constructorProperties;

        this.properties = (properties) ? properties : {};
        this.removedPropertyKeysSinceLastSave = [];
        this.dataChangedSinceLastSave = (typeof(dataChangedSinceLastSave) === 'boolean') ? dataChangedSinceLastSave : false;
        this.dataChangeTimestamp = (typeof(dataChangeTimestamp) === 'number') ? dataChangeTimestamp : undefined;
        this.graphData = graphData;
    }

    getGraphData () {
        return this.graphData;
    }

    setGraphData (graphData) {
        this.graphData = graphData;
        Object.values(this.properties).map(property => property.setGraphData(graphData));
    }

    getChangedProperties (timestamp) {
        timestamp = timestamp || new Date().getTime();
        var changedProperties = [];
        if (this.properties && Object.keys(this.properties).length > 0) {
            changedProperties = Object.values(this.properties)
                                    .filter(property => property.dataChangedSinceLastSave 
                                                    && property.dataChangeTimestamp <= timestamp);
        }
        return changedProperties;
    }

    addOrUpdateProperty (key, value, datatype, dontNotify) {
        if (this.properties === null || this.properties === undefined) {
            this.properties = {};
        }
        datatype = (datatype) ? datatype : DataTypes.String;
        var property = this.properties[key];
        if (property) {
            return this.updateProperty(key, value, datatype, dontNotify);
        } else {
            return this.addProperty(key, value, datatype, dontNotify);
        }
    }
    
    removeProperty (key) {
        if (this.properties !== null && this.properties !== undefined) {
            delete this.properties[key];
            if (this.graphData) {
                this.graphData.dataChanged(GraphChangeType.RemoveProperty, { propertyContainer: this, changedKey: key });
            }
        }
    }
    
    resetDataChangeFlags (timestamp) {
        timestamp = timestamp || new Date().getTime();
        //console.log(this);
        if (this.dataChangeTimestamp < timestamp) {
            this.dataChangedSinceLastSave = false;
            this.removedPropertyKeysSinceLastSave =
                    this.removedPropertyKeysSinceLastSave.filter(x => x.dataChangeTimestamp >= timestamp);
        }

        if (this.properties && Object.keys(this.properties).length > 0) {
            Object.values(this.properties)
                .map(property => property.resetDataChangeFlags(timestamp));
        }
    }
    
    getPropertyByKey (key) {
        return this.properties[key];
    }

    getPropertyValueByKey (key, defaultValue) {
        var property = this.properties[key];
        if (defaultValue === undefined) defaultValue = null;
        return (property !== undefined && property !== null) ? property.value : defaultValue;
    }

    getProperties () {
        return this.properties;
    }

    getPropertyKeyValueMap () {
        var keyValueMap = {};
        Object.keys(this.properties).map(key => keyValueMap[key] = this.properties[key].value);
        return keyValueMap;
    }
    
    addProperty (key, value, datatype, dontNotify) {
        if (this.properties === null) {
            this.properties = {};
        }
        var config = {
            key: key,
            value: value,
            datatype: (datatype) ? datatype : DataTypes.String
        }
        var property = new Property(config);
        property.setGraphData(this.graphData);
        this.properties[property.key] = property;
        if (!dontNotify) {
            if (this.graphData) {
                this.graphData.dataChanged(GraphChangeType.AddOrUpdateProperty, { propertyContainer: this, changedObject: property });
            }
        }
        return property;
    }
    
    updateProperty (key, value, datatype, dontNotify) {
        if (this.properties) {
            var property = this.properties[key];
            if (property) {
                property.key = key;
                property.value = value;
                property.datatype = datatype;
                if (!dontNotify) {
                    if (this.graphData) {
                        this.graphData.dataChanged(GraphChangeType.AddOrUpdateProperty, { propertyContainer: this, changedObject: property });
                    }
                }
                return property;
            } else {
                throw new Error("Could not find property '" + key + "' to update");
            }
        } else {
            throw new Error("Could not find property '" + key + "' to update");
        }
    }
    
    getRemovedPropertyKeysSinceLastSave () {
        return this.removedPropertyKeysSinceLastSave.slice(0).map(x => x.changedKey);
    }

    getPropertiesString () {
        var propertyString = '';
        if (this.properties !== null) {
            Object.values(this.properties).map(property => {
                if (propertyString) {
                    propertyString += ', ';
                }
                propertyString += property.getString();
            });
        }
        return propertyString;
    }
}

export var createNode = (properties, keyHelper) => {
    var newNode = new Node(properties);
    if (newNode.key === undefined || newNode.key === null) {
        newNode.key = keyHelper.getNewNodeKey();
    }
    newNode.addProperty("key", newNode.key);
    return newNode;
}

export class Node extends PropertyContainer {
    constructor (constructorProperties) {
        super(constructorProperties);
        constructorProperties = (constructorProperties) ? constructorProperties : {};
        var {
            neoInternalId, key, isRootNode, degree, primaryNodeLabel, labels
        } = constructorProperties;

        this.myObjectName = 'Node';    // because either Chrome or React is changing object.constructor.name

        this.classType = "Node";   /* because d3 will make a copy and destroy the original type */
        this.neoInternalId = (neoInternalId !== null && neoInternalId !== undefined) ? neoInternalId : null;
        this.key = (key) ? key : null;
        this.isRootNode = (isRootNode) ? isRootNode : false;
        this.degree = (degree) ? degree : null;
        this.primaryNodeLabel = (primaryNodeLabel) ? primaryNodeLabel : null;
        // this includes the primaryNodeLabel
        this.labels = (labels) ? labels : [];
    }

    update = (obj) => {
        obj = (obj) ? obj : {};
        Object.keys(obj).map(key => {
            this[key] = obj[key];
        })
        super.getGraphData().dataChanged(GraphChangeType.AddOrUpdateNode, { changedObject: this });
    }
}

export var createRelationship = (properties, keyHelper) => {
    var newRelationship = new Relationship(properties);
    if (newRelationship.key === undefined || newRelationship.key === null) {
        newRelationship.key = keyHelper.getNewRelationshipKey();
    }
    return newRelationship;
}

export class Relationship extends PropertyContainer {
    constructor (constructorProperties) {
        super(constructorProperties);
        constructorProperties = (constructorProperties) ? constructorProperties : {};
        var {
            neoInternalId, key, type, startNode, endNode
        } = constructorProperties;

        this.myObjectName = 'Relationship';    // because either Chrome or React is changing object.constructor.name

        this.classType = "Relationship";   /* because d3 will make a copy and destroy the original type */
        this.neoInternalId = (neoInternalId) ? neoInternalId : null;
        this.key = (key) ? key : null;
        this.type = (type) ? type : null;
        this.startNode = (startNode) ? startNode : null;
        this.endNode = (endNode) ? endNode : null;
    }

    getText = () => this.type;

    getStartNode = () => this.startNode;
    getEndNode = () => this.endNode;

    reverseNodes = () => {
        // we need to remove it
        super.getGraphData().removeRelationship(this);

        // reverse the nodes
        var startNode = this.startNode;
        this.startNode = this.endNode;
        this.endNode = startNode;

        // then re-add it
        super.getGraphData().addRelationship(this);
    }

    isSelfConnected = () => this.startNode === this.endNode;
    startNodeMatches = (node) => this.startNode === node;
    connectedToNode = (node) => this.startNode === node || this.endNode === node;
    hasStartAndEndNodes = (start, end) => this.startNode === start && this.endNode === end;

    update = (obj) => {
        obj = (obj) ? obj : {};
        Object.keys(obj).map(key => {
            this[key] = obj[key];
        })
        super.getGraphData().dataChanged(GraphChangeType.AddOrUpdateRelationship, { changedObject: this });
    }

    getDescription = function () {
        return this.startNode.label + " " + this.type + " " + this.endNode.label;
    }

    getRelationshipDisplayText = function () {
        var displayText = (this.type) ? this.type : '';
        return displayText;
    }

    /* prevents serialization of startNode and endNode */
    getPersistVersion = function () {
        var persistObject = {};

        persistObject.classType = this.classType;
        persistObject.key = this.key;
        persistObject.type = this.type;
        persistObject.startNodeKey = this.startNode.key;
        persistObject.endNodeKey = this.endNode.key;
        persistObject.properties = this.properties;
        persistObject.dataChangedSinceLastSave = this.dataChangedSinceLastSave;
        persistObject.dataChangeTimestamp = this.dataChangeTimestamp;
        persistObject.getChangedProperties = () => this.getChangedProperties();
        persistObject.getRemovedPropertyKeysSinceLastSave = () => this.removedPropertyKeysSinceLastSave.slice(0)
                                                                                            .map(x => x.changedKey);
        return persistObject;
    }

    toString = () => {
        var str = '';
        if (this.startNode) {
            str += '(' + this.startNode.label + ')';
            str += '-';
        }
        str += '[:' + this.type + ']';
        if (this.endNode) {
            str += '->';
            str += '(' + this.endNode.label + ')';
        }
        return str;
    }
}

export class GraphData {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            id, nodes, relationships, isRemotelyPersisted, keyHelper, SUBGRAPH_MODEL
        } = properties;

        this.keyHelper = (keyHelper) ? keyHelper : new KeyHelper({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });

        this.myObjectName = 'GraphData';    // because either Chrome or React is changing object.constructor.name

        this.SUBGRAPH_MODEL = SUBGRAPH_MODEL;
        isRemotelyPersisted = (typeof(isRemotelyPersisted) === 'boolean') ? isRemotelyPersisted : false;
    
        this.me = new EventEmitter(id);
    
        this.init(id, nodes, relationships, isRemotelyPersisted);
    }

    init = (id, nodes, relationships, isRemotelyPersisted) => {

        this.id = id;

        this.nodes = (nodes) ? nodes : {};
        this.relationships = (relationships) ?  relationships : {};

        this.isRemotelyPersisted = isRemotelyPersisted;
        this.hasDataChanged = false;

        this.deletedNodeKeysSinceLastSave = [];
        this.deletedRelationshipKeysSinceLastSave = [];

        this.createGraphRootNode(id);
    }

    clearData = () => {
        this.init(this.id, {}, {}, this.isRemotelyPersisted);
        this.keyHelper.clearUsedKeys();
    }

    createGraphRootNode = (id) => {
        // right now making assumptions this is for a graph doc, which has a root node 
        //   this may change in the future
        this.graphRootNode = this.createNode({
            key: id,
            isRootNode: true,
            primaryNodeLabel: NodeLabels.GraphDoc,
            labels: [NodeLabels.GraphDoc],
            dataChangedSinceLastSave: false,
            dataChangeTimestamp: 0
        });
        this.graphRootNode.addProperty("key", this.id);
        this.addNode(this.graphRootNode, true);
    }

    getKeyHelper = () => this.keyHelper;
    setSubgraphModel = (subgraphModel) => {
        this.SUBGRAPH_MODEL = subgraphModel;
        this.keyHelper.setSubgraphModel(subgraphModel);
    }
    getSubgraphModel = () => this.SUBGRAPH_MODEL;
    getGraphRootNode = () => this.graphRootNode;

    dataChanged = (dataChangeType, details) => {
        this.hasDataChanged = true;
        this.me.notifyListeners(dataChangeType, details);
        switch (dataChangeType) {
            case GraphChangeType.AddOrUpdateNode:
            case GraphChangeType.AddOrUpdateRelationship:
            case GraphChangeType.AddOrUpdateProperty:
                details.changedObject.dataChangedSinceLastSave = true;
                //console.log("dataChanged: ", details.changedObject);
                details.changedObject.dataChangeTimestamp = new Date().getTime();
                break;
            case GraphChangeType.RemoveNode:
                this.deletedNodeKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details
                });
                break;
            case GraphChangeType.RemoveRelationship:
                var deletedRelationshipKeyInfo = {
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details
                }
                //console.log('graphData deletedRelationshipKeyInfo: ', deletedRelationshipKeyInfo)
                this.deletedRelationshipKeysSinceLastSave.push(deletedRelationshipKeyInfo);
                break;
            case GraphChangeType.RemoveProperty:
                details.propertyContainer.removedPropertyKeysSinceLastSave.push({
                    dataChangeTimestamp: new Date().getTime(),
                    changedKey: details.changedKey
                });
                break;
        }
    }

    createNode = (properties) => createNode(properties, this.keyHelper);
    createRelationship = (properties) => createRelationship(properties, this.keyHelper);

    getEventEmitter = () => this.me;
    
    getIsRemotelyPersisted = () => this.isRemotelyPersisted;
    setIsRemotelyPersisted = (isRemotelyPersisted) => this.isRemotelyPersisted = isRemotelyPersisted;

    getPropertiesString (item) {
        var propertyString = '';
        if (item.properties !== null) {
            Object.values(item.properties).map(property => {
                if (propertyString) {
                    propertyString += ', ';
                }
                propertyString += property.getString();
            });
        }
        return propertyString;
    }

    setDataChanged (value) {
        this.hasDataChanged = value;
    }
    
    resetDataChangeFlags (saveObject) {
        var timestamp;
        if (saveObject) {
            timestamp = saveObject.timestamp;
        } else {
            timestamp = new Date().getTime();
        }
    
        Object.values(this.nodes).map(node => node.resetDataChangeFlags(timestamp));
        Object.values(this.relationships).map(relationship => relationship.resetDataChangeFlags(timestamp));
    
        this.deletedNodeKeysSinceLastSave = this.deletedNodeKeysSinceLastSave
                                                    .filter(x => x.dataChangeTimestamp >= timestamp);
        //console.log('this.deletedRelationshipKeysSinceLastSave before: ', this.deletedRelationshipKeysSinceLastSave.slice())                                                    
        this.deletedRelationshipKeysSinceLastSave = this.deletedRelationshipKeysSinceLastSave
                                                    .filter(x => x.dataChangeTimestamp >= timestamp);
        //console.log('this.deletedRelationshipKeysSinceLastSave after: ', this.deletedRelationshipKeysSinceLastSave.slice())                                                    
    }
    
    getChangedItems (timestamp) {
        timestamp = timestamp || new Date().getTime();
        var changedNodes = Object.values(this.nodes)
            .filter(node => (
                              (node.dataChangedSinceLastSave 
                                && node.dataChangeTimestamp <= timestamp
                              )
                              || node.getChangedProperties(timestamp).length > 0
                              || node.removedPropertyKeysSinceLastSave
                                    .find(removedPropKey => 
                                        removedPropKey.dataChangeTimestamp <= timestamp)
                            )
                            //&& !node.isRootNode
                            );
        var changedRelationships = Object.values(this.relationships)
            .filter(relationship => (
                                    (relationship.dataChangedSinceLastSave 
                                        && relationship.dataChangeTimestamp <= timestamp) 
                                    || relationship.getChangedProperties(timestamp).length > 0
                                    || relationship.removedPropertyKeysSinceLastSave
                                        .find(removedPropKey => 
                                            removedPropKey.dataChangeTimestamp <= timestamp)
                                    )
                                    );
    
        return {
            changedNodes: (changedNodes) ? changedNodes : [],
            changedRelationships: (changedRelationships) ? changedRelationships : []
        }
    }

    // for debugging
    howDidNodesChange (timestamp) {
        var changedNodes = Object.values(this.nodes)
            .filter(node => ((node.dataChangedSinceLastSave
                || node.getChangedProperties(timestamp).length > 0
                || node.removedPropertyKeysSinceLastSave.length > 0))
                //&& !node.isRootNode
                )
            .map(node => { return {
                nodeKey: node.key,
                dataChangedSinceLastSave: node.dataChangedSinceLastSave,
                changedPropertyKeys: node.getChangedProperties(timestamp).map(x => x.key),
                removedProperties: node.removedPropertyKeysSinceLastSave.length > 0
            }});

        return changedNodes;
    }

    
    getDeletedItems (timestamp) {
        timestamp = timestamp || new Date().getTime();
        const deletedNodeKeys = this.deletedNodeKeysSinceLastSave
                                                .filter(x => x.dataChangeTimestamp <= timestamp)
                                                .map(x => x.changedKey);
        const deletedRelationshipKeys = this.deletedRelationshipKeysSinceLastSave
                                                .filter(x => x.dataChangeTimestamp <= timestamp)
                                                .map(x => x.changedKey);

        return {
            deletedNodeKeys: deletedNodeKeys,
            deletedRelationshipKeys: deletedRelationshipKeys
        }
    }

    // there is a special case where GraphDocMetadata has the same key as the GraphDoc
    //   I'm putting in a work-around such that the metadata key will be prefixed
    handleGraphDocMetadataKey = (nodeInstanceKey, isGraphDocMetadata) => 
        (isGraphDocMetadata) ? `GraphDocMetadata_${nodeInstanceKey}` : nodeInstanceKey

    addNode (nodeInstance, dontNotify) {
        nodeInstance.setGraphData(this);
        if (nodeInstance && nodeInstance.key !== null && nodeInstance.key !== undefined) {
            const isGraphDocMetadata = nodeInstance.primaryNodeLabel === 'GraphDocMetadata';            
            const mapKey = this.handleGraphDocMetadataKey(nodeInstance.key, isGraphDocMetadata);
            this.nodes[mapKey] = nodeInstance;
            this.keyHelper.addUsedKey(mapKey);
            if (!dontNotify) {
                this.dataChanged(GraphChangeType.AddOrUpdateNode, { changedObject: nodeInstance });
            }
        } else {
            console.log("no key in nodeInstance ", nodeInstance);
            throw new Error("nodes must have a key");
        }
    }
    
    getRelationshipsForNodeByKey (nodeInstanceKey) {
        return Object.values(this.relationships).filter(relationship =>
                                (relationship.startNode.key === nodeInstanceKey
                                || relationship.endNode.key === nodeInstanceKey));
    }
    
    getNodeKey (nodeInstance) {
        if (nodeInstance) {
            var keyConfig = null;
            if (this.SUBGRAPH_MODEL && this.SUBGRAPH_MODEL.keyConfig) {
                keyConfig = this.SUBGRAPH_MODEL.keyConfig.find(x => x.nodeLabel === nodeInstance.primaryNodeLabel);
            }
            var keyPropertyKeys = (keyConfig) ? keyConfig.propertyKeys : ['key'];
            var nodeKeyProperties = keyPropertyKeys
                .map(key => nodeInstance.getPropertyByKey(key))
                .map(property => ({
                    key: property.key,
                    value: property.value,
                    datatype: property.datatype    
                }));
            return { 
                isRootNode: nodeInstance.isRootNode,
                rootNodeKey: this.getGraphRootNode().key,
                label: nodeInstance.primaryNodeLabel,
                properties: nodeKeyProperties
            }
        } else {
            return null;
        }
    }

    removeNode (nodeInstance) {
        if (nodeInstance) {
            const isGraphDocMetadata = nodeInstance.primaryNodeLabel === 'GraphDocMetadata';
            const mapKey = this.handleGraphDocMetadataKey(nodeInstance.key, isGraphDocMetadata);        
            delete this.nodes[mapKey];
            this.dataChanged(GraphChangeType.RemoveNode, this.getNodeKey(nodeInstance));
        }
    }
    
    getNodeByKey (key, isGraphDocMetadata) {
        var mapKey = this.handleGraphDocMetadataKey(key, isGraphDocMetadata);        
        return this.nodes[mapKey];
    }
    
    getNodeMap () {
        return this.nodes;
    }
    
    getNodeArray () {
        return Object.values(this.nodes).filter(node => node !== this.graphRootNode);
    }
    
    addRelationship (relationshipInstance, dontNotify) {
        relationshipInstance.setGraphData(this);
        if (relationshipInstance && relationshipInstance.key !== null && relationshipInstance.key !== undefined) {
            this.relationships[relationshipInstance.key] = relationshipInstance;
            this.keyHelper.addUsedKey(relationshipInstance.key);
            if (!dontNotify) {
                this.dataChanged(GraphChangeType.AddOrUpdateRelationship, { changedObject: relationshipInstance });
            }
        } else {
            console.log("no key in relationshipInstance ", relationshipInstance);
            throw new Error("relationships must have a key");
        }
    }
    
    getRelationshipByKey (key) {
        return this.relationships[key];
    }
    
    removeRelationshipByKey (relationshipInstanceKey) {
        if (relationshipInstanceKey) {
            this.removeRelationship(this.relationships[relationshipInstanceKey]);
        }
    }
    
    removeRelationship (relationshipInstance) {
        if (relationshipInstance) {
            delete this.relationships[relationshipInstance.key];
            var keyConfig = null;
            if (this.SUBGRAPH_MODEL && this.SUBGRAPH_MODEL.keyConfig) {
                keyConfig = this.SUBGRAPH_MODEL.keyConfig.find(x => x.relationshipType === relationshipInstance.type);
            }
            // don't default to 'key' if nothing defined.  Some relationships do not have keys defined
            var relKeyPropertyKeys = (keyConfig) ? keyConfig.propertyKeys : [];
            var relKeyProperties = relKeyPropertyKeys
                .map(key => relationshipInstance.getPropertyByKey(key))
                .map(property => ({
                    key: property.key,
                    value: property.value,
                    datatype: property.datatype    
                }));
    
            var changeObject = { 
                startNodeKey: this.getNodeKey(relationshipInstance.startNode),
                endNodeKey: this.getNodeKey(relationshipInstance.endNode),
                type: relationshipInstance.type,
                rootNodeKey: this.getGraphRootNode().key,
            };
            if (relKeyProperties.length > 0) {
                changeObject.keyProperties = relKeyProperties;
            }
            this.dataChanged(GraphChangeType.RemoveRelationship, changeObject);
        }
    }
    
    getRelationshipMap () {
        return this.relationships;
    }
    
    getRelationshipArray () {
        return Object.values(this.relationships);
    }
    
    getConnectedRelationships (node) {
        //console.log("getConnectedRelationships: ", getConnectedRelationships);
        var array = this.getRelationshipArray();
        //console.log("array: ", array);
        array = array.filter(relationship => (relationship.startNode === node
                                                || relationship.endNode === node));
        //console.log("filtered array: ", array);
        return array;
    }

    findRelationships (startNode, relationshipType, endNode, properties) {
        var array = this.getRelationshipArray();
        var matchingRelationships = array.filter(relationship => 
                            relationship.startNode === startNode
                         && relationship.type === relationshipType
                         && relationship.endNode === endNode);
        if (properties) {
            var propertyKeys = Object.keys(properties);
            var numMatchesRequired = propertyKeys.length;
            matchingRelationships = matchingRelationships.filter(relationship => {
                 var numMatches = propertyKeys.reduce((acc,propertyKey) => 
                    (relationship.getPropertyValueByKey(propertyKey) === properties[propertyKey]) ?
                        acc + 1 : acc 
                , 0);
                return numMatches === numMatchesRequired;
            });
        }
        return matchingRelationships;
    }
    
    getConnectedRelationshipBetweenNodes (node1, node2) {
        var connections = [];
        var array = this.getRelationshipArray().sort((a,b) => (a.key === b.key) ? 0 : (a.key > b.key) ? -1 : 1);
        for (var i = 0; i < array.length; i++) {
            var relationship = array[i];
            if ((relationship.startNode === node1 && relationship.endNode === node2)
                || (relationship.startNode === node2 && relationship.endNode === node1)) {
                connections.push(relationship);
            }
        }
        return connections;
    }
    
    getConnectedNodes (node) {
        //console.log("getConnectedNodes node: ", node);
        var connections = this.getConnectedRelationships(node);
        // return the other end of the relationship type
        var connectedNodes = connections.map(x => (x.startNode === node) ? x.endNode : x.startNode);
        //console.log("getConnectedNodes connectedNodes: ", connectedNodes);
        return connectedNodes;
    }

    getOutboundRelationshipsForNodeByType (node, relType) {
        var array = this.getRelationshipArray();
        array = array.filter(relationship => (relationship.startNode === node
                                                && relationship.type === relType));
        return array;                                 
    }
    
    /* fetch relationships where the start and end nodes are the same */
    getNodesThatHaveSelfConnectedRelationships () {
        var nodes = [];
        var array = this.getRelationshipArray();
        for (var i = 0; i < array.length; i++) {
            var relationship = array[i];
            if (relationship.startNode === relationship.endNode) {
                nodes.push(relationship.startNode);
            }
        }
        return nodes;
    }
    
    /* fetch relationships where there are more than 1 relationship between the start and end nodes */
    getNodePairsThatHaveMoreThanOneRelationshipBetweenThem () {
        var map = {};
        var array = this.getRelationshipArray();
        for (var i = 0; i < array.length; i++) {
            var mapKey = null;
            var relationship = array[i];
            if (relationship.startNode && relationship.endNode) {
                // do alphabetic comparison - so that node-pairs are always ordered the same regardless if they are start-end or end-start
                // e.g. A-TO->B and B-FROM->A will result in a key A_B that will count both TO and FROM making the count 2
                if (relationship.startNode.key < relationship.endNode.key) {
                    mapKey = relationship.startNode.key + "_" + relationship.endNode.key;
                } else {
                    mapKey = relationship.endNode.key + "_" + relationship.startNode.key;
                }
                var mapEntry = map[mapKey];
                if (!mapEntry) {
                    mapEntry = {
                        node1: relationship.startNode,
                        node2: relationship.endNode,
                        count: 0
                    };
                    map[mapKey] = mapEntry;
                }
                mapEntry.count++;
            }
        }
    
        var mapToReturn = {};
        Object.keys(map)
            .filter(mapKey => map[mapKey].count > 1)
            .map(mapKey => mapToReturn[mapKey] = map[mapKey]);
        return mapToReturn;
    }
    
    getRelationship (relationshipString, startNodeString, endNodeString) {
        var array = this.getRelationshipArray();
        for (var i = 0; i < array.length; i++) {
            var relationship = array[i];
            if (relationship.startNode.label === startNodeString
                 && relationship.endNode.label === endNodeString
                 && relationship.type === relationshipString) {
                return relationship;
            }
        }
        return null;
    }
    
    doesMatchingRelationshipExist (relationshipToMatch) {
        var array = this.getRelationshipArray();
        for (var i = 0; i < array.length; i++) {
            var relationship = array[i];
            if (relationship.startNode.label === relationshipToMatch.startNode.label
                 && relationship.endNode.label === relationshipToMatch.endNode.label
                 && relationship.type === relationshipToMatch.type) {
                return true;
            }
        }
        return false;
    }
    
    getMatchingSubgraph (subgraph) {
        var currentNodes = this.getNodeArray();
        var currentRelationships = this.getRelationshipArray();
        var subgraphNodes = subgraph.getNodeArray();
        var subgraphRelationships = subgraph.getRelationshipArray();
    
        var matchingNodes = [];
        for (var i = 0; i < currentNodes.length; i++) {
            for (var j = 0; j < subgraphNodes.length; j++) {
                if (currentNodes[i].label === subgraphNodes[j].label) {
                    matchingNodes.push(currentNodes[i]);
                }
            }
        }
    
        var matchingRelationships = [];
        for (i = 0; i < currentRelationships.length; i++) {
            for (j = 0; j < subgraphRelationships.length; j++) {
                if (currentRelationships[i].type === subgraphRelationships[j].type
                    && currentRelationships[i].startNode.label === subgraphRelationships[j].startNode.label
                    && currentRelationships[i].endNode.label === subgraphRelationships[j].endNode.label) {
                    matchingRelationships.push(currentRelationships[i]);
                }
            }
        }
    
        return {
            nodes: matchingNodes,
            relationships: matchingRelationships
        }
    }
    
    findItemsByText (searchText) {
        var items = [];
        if (searchText) {
            searchText = searchText.toLowerCase();
            // TODO: add search support for property definitions
            var nodeScores = this.getNodeArray().map(node => {
                var score = JaroWrinker(searchText, node.label.toLowerCase());
                return {
                    matchingItem: node,
                    matchType: 'Node',
                    score: score
                }
            }).filter(x => x.score > 0);
    
            var relationshipScores = this.getRelationshipArray().map(relationship => {
                var score = JaroWrinker(searchText, relationship.type.toLowerCase());
                return {
                    matchingItem: relationship,
                    matchType: 'Relationship',
                    score: score
                }
            }).filter(x => x.score > 0);
    
            items = nodeScores.concat(relationshipScores);
            items.sort((a,b) => b.score-a.score);
        }
        return items;
    }

    fromJSON = (jsonString) => {
        var jsonObject = JSON.parse(jsonString);
        this.fromSaveObject(jsonObject);
    }

    fromSaveObject = (graphDoc, keepDataChangeFlags) => {
        var graph = graphDoc.graph;
        this.keyHelper.clearUsedKeys();
        this.init(graphDoc.key, {}, {}, true);        

        Object.values(graph.nodes)
            .map(nodeObj => {
                //console.log('nodeObj.key: ', nodeObj.key);
                nodeObj.key = this.keyHelper.getKeyAndAddIt(nodeObj.key);

                var propertiesMap = {};
                nodeObj.properties.map(property => {
                    property = convertSingleGraphQLProperty(property);
                    // TODO: don't hard code this
                    if (property.key === 'key') { 
                        property.value = this.keyHelper.getKeyAndAddIt(property.value);
                    }
                    var aProperty = new Property({
                        ...property,
                        graphData: this
                    });
                    propertiesMap[aProperty.key] = aProperty;
                });
                nodeObj.properties = propertiesMap;
                var node = new Node(nodeObj);
                this.addNode(node, true);
            });

        var rootNode = Object.values(this.nodes).find(node => node.isRootNode);
        var reconstituteResult = null;
        if (rootNode) {
            this.graphRootNode = rootNode;
            var rootNodeProperties = this.graphRootNode.getPropertyKeyValueMap();
            reconstituteResult = reconstituteLoadedSugraphModel(this.getSubgraphModel(), rootNodeProperties);        
            this.setSubgraphModel(reconstituteResult.modifiedSubgraphModel);
        }

        // we need to sort relationships with well-defined keys first,
        // otherwise, later on, if we grab transient keys for non-keyed relationships, the keys will overlap
        graph.relationships.sort((a,b) => {
            if (a.keyProperties.length === 0 && b.keyProperties.length === 0) {
                return 0;
            } else if (!a.keyProperties.length === 0 && b.keyProperties.length === 0) {
                return 1;
            } else {
                return -1;
            }
        })

        Object.values(graph.relationships)
            .map(relationshipObj => {
                var isStartGraphDocMetadata = (relationshipObj.startNodeKey.label === 'GraphDocMetadata');
                var startMapKey = this.keyHelper.getKeyAndAddIt(relationshipObj.startNodeKey);
                startMapKey = this.handleGraphDocMetadataKey(startMapKey, isStartGraphDocMetadata);
                delete relationshipObj.startNodeKey; 

                var isEndGraphDocMetadata = (relationshipObj.endNodeKey.label === 'GraphDocMetadata');
                var endMapKey = this.keyHelper.getKeyAndAddIt(relationshipObj.endNodeKey);
                endMapKey = this.handleGraphDocMetadataKey(endMapKey, isEndGraphDocMetadata);
                delete relationshipObj.endNodeKey;

                relationshipObj.startNode = this.nodes[startMapKey];
                relationshipObj.endNode = this.nodes[endMapKey];

                var propertiesMap = {};
                var keyPropertiesArray = (relationshipObj.keyProperties) ? relationshipObj.keyProperties : [];
                var relationshipKey = '';
                if (keyPropertiesArray.length > 0) {
                    //relationshipKey = this.keyHelper.getLocalRelKeyAndAddIt(relationshipObj.type, relationshipObj.keyProperties);
                    relationshipKey = this.keyHelper.getRelKeyAndAddIt(relationshipObj.type, relationshipObj.keyProperties);
                } else {
                    relationshipKey = this.keyHelper.getNewRelationshipKey();
                }
 
                var propertiesArray = (relationshipObj.properties) ? relationshipObj.properties : [];
                var allProperties = keyPropertiesArray.concat(propertiesArray);

                allProperties.map(property => {
                    property = convertSingleGraphQLProperty(property);

                    // TODO: don't hard code this
                    if (property.key === 'key') { 
                        property.value = this.keyHelper.getKeyAndAddIt(property.value);
                    }

                    var aProperty = new Property({
                        ...property,
                        graphData: this
                    });
                    propertiesMap[aProperty.key] = aProperty;
                });
                relationshipObj.key = relationshipKey;
                relationshipObj.properties = propertiesMap;

                var relationship = new Relationship(relationshipObj);
                this.addRelationship(relationship, true);
            });

        if (!keepDataChangeFlags) {
            this.resetDataChangeFlags();
        }

        if (reconstituteResult) {
            saveNewConfigEntries(this.graphRootNode, reconstituteResult.newConfigEntries, 
                reconstituteResult.newLabelFilter, reconstituteResult.newRelationshipFilter,
                reconstituteResult.newRemoteNodeLabels);
        }
    }

    toSaveObject = () => {
        var relationshipsToPersist = {};
        Object.keys(this.relationships).map(key => relationshipsToPersist[key] = this.relationships[key].getPersistVersion());

        var obj = {
            isRemotelyPersisted: this.isRemotelyPersisted,
            nodes: this.nodes,  // TODO: should probably copy this
            relationships: relationshipsToPersist,
            timestamp: new Date().getTime()
        }
        return obj;
    }

    toExportObject = (combineRels) => {
        var nodesToExport = {};
        Object.keys(this.nodes)
            .map(key => {
                var exportVersion = { ...this.nodes[key] };
                delete exportVersion.removedPropertyKeysSinceLastSave;
                delete exportVersion.dataChangedSinceLastSave;
                delete exportVersion.dataChangeTimestamp;
                delete exportVersion.displayChangedSinceLastSave;
                delete exportVersion.displayChangeTimestamp;
                nodesToExport[key] = exportVersion;
            });

        var relationshipsToExport = {};
        Object.keys(this.relationships)
            .map(key => {
                var exportVersion = this.relationships[key].getPersistVersion();
                delete exportVersion.removedPropertyKeysSinceLastSave;
                delete exportVersion.dataChangedSinceLastSave;
                delete exportVersion.dataChangeTimestamp;
                delete exportVersion.displayChangedSinceLastSave;
                delete exportVersion.displayChangeTimestamp;
                relationshipsToExport[key] = exportVersion;
            });

        if (combineRels) {
            var newRelMap = {};
            Object.values(relationshipsToExport).map(rel => {
                var newKey = rel.startNodeKey + '_' + rel.endNodeKey;
                var existingRel = newRelMap[newKey];
                if (!existingRel) {
                    newRelMap[newKey] = rel;
                } else {
                    existingRel.type += '|' + rel.type;
                }
            });
            relationshipsToExport = newRelMap;
        }

        var obj = {
            nodes: nodesToExport,
            relationships: relationshipsToExport
        }
        return obj;
    }

    toJSON = (prettyPrint) => {
        var obj = this.toSaveObject();

        if (prettyPrint) {
            return JSON.stringify(obj, null, 2);
        } else {
            return JSON.stringify(obj);
        }
    }
};
