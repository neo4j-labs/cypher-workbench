import uuidv4 from 'uuid/v4';
import chroma from 'chroma-js';
import { EventEmitter } from './eventEmitter';
import DataTypes from './DataTypes';
import {
    getConnectedNodes,
    getConnectedRelationships,
    getConnectedRelationshipBetweenNodes,
    getNodesThatHaveSelfConnectedRelationships,
    getNodePairsThatHaveMoreThanOneRelationshipBetweenThem,
    getGraphNodeKey,
    convertToGraphNode,
    convertGraphQLPropertiesToMap,
    convertSingleGraphQLProperty,
    getGraphRelationships,
    reconstituteLoadedSugraphModel,
    saveNewConfigEntries, getDataType
} from './graphUtil';
import { KeyHelper } from './keyHelper';
import { GraphData } from './graphData';
import { NodeLabels } from './graphDataConstants';
import { GraphViewChangeType } from './graphDataConstants';
import { dedentBlockStringValue } from 'graphql/language/blockString';

const SubgraphNodeLabels = {
    GraphView: NodeLabels.GraphView,
    NodeDisplay: "NodeDisplay",
    RelationshipDisplay: "RelationshipDisplay",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    HAS_VIEW_NODE: {
        name: "HAS_VIEW_NODE",
        nodes: [{
            startNode: SubgraphNodeLabels.GraphView,
            endNode: SubgraphNodeLabels.NodeDisplay
        },{
            startNode: SubgraphNodeLabels.GraphView,
            endNode: SubgraphNodeLabels.RelationshipDisplay
        }]
    },
    DISPLAY_FOR: {
        name: "DISPLAY_FOR",
        nodes: [{
            startNode: SubgraphNodeLabels.NodeDisplay,
            endNode: SubgraphNodeLabels.Any
        }]
    },
    START_DISPLAY_FOR: {
        name: "START_DISPLAY_FOR",
        nodes: [{
            startNode: SubgraphNodeLabels.RelationshipDisplay,
            endNode: SubgraphNodeLabels.Any
        }]
    },
    END_DISPLAY_FOR: {
        name: "END_DISPLAY_FOR",
        nodes: [{
            startNode: SubgraphNodeLabels.RelationshipDisplay,
            endNode: SubgraphNodeLabels.Any
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.GraphView, 
    subgraphConfig_relationshipFilter: 
        // produces HAS_VIEW_NODE>|DISPLAY_FOR>|etc using constants
        Object.keys(SubgraphRelationshipTypes).map(relationship => `${relationship}>`).join('|')
    , 
    keyConfig: [
        {nodeLabel: SubgraphNodeLabels.GraphView, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.NodeDisplay, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.RelationshipDisplay, propertyKeys: ["key"]}
    ] 
}    

const GraphConversionConfig = {
    NodeDisplay: {
        primaryNodeLabel: SubgraphNodeLabels.NodeDisplay,
        labels: [SubgraphNodeLabels.NodeDisplay],
        properties: {
            [DataTypes.String]: ['color','stroke','strokeDashArray','size','fontColor','textLocation'],
            [DataTypes.Float]: ['strokeWidth','fontOpacity','fillOpacity','strokeOpacity','x','y','fontSize'],
            [DataTypes.Boolean]: ['isLocked']
        },
        relationships: {
            [SubgraphNodeLabels.GraphView]: SubgraphRelationshipTypes.HAS_VIEW_NODE,
            node: SubgraphRelationshipTypes.DISPLAY_FOR
        }
    },
    RelationshipDisplay: {
        primaryNodeLabel: SubgraphNodeLabels.RelationshipDisplay,
        labels: [SubgraphNodeLabels.RelationshipDisplay],
        properties: {
            [DataTypes.String]: ['color','relationshipType','strokeDashArray'],
            [DataTypes.Float]: ['strokeWidth','strokeOpacity','fontSize','offset']
        },
        relationships: {
            [SubgraphNodeLabels.GraphView]: SubgraphRelationshipTypes.HAS_VIEW_NODE,
            startDisplayNode: SubgraphRelationshipTypes.START_DISPLAY_FOR,
            endDisplayNode: SubgraphRelationshipTypes.END_DISPLAY_FOR
        }
    }
}

export class GraphDataItem {
    updateGraphData (graphDataView, item, conversionDefinition) {
        var graphData = graphDataView.getGraphData();
        var graphNode = convertToGraphNode(graphData, item, conversionDefinition);
        var graphRelationships = getGraphRelationships(graphDataView, item, graphNode, conversionDefinition);
        return {
            node: graphNode,
            relationships: graphRelationships
        }
    }
}

export class NodeDisplay extends GraphDataItem {
    constructor(properties) {
        super(properties);
        properties = (properties) ? properties : {};
        var { 
            key, node, color, fillOpacity, x, y, 
            stroke, strokeWidth, strokeOpacity, strokeDashArray, 
            size, fontSize, fontColor, fontOpacity,
            textLocation, isLocked, displayChangedSinceLastSave, displayChangeTimestamp 
        } = properties;

        this.myObjectName = 'NodeDisplay';    // because either Chrome or React is changing object.constructor.name

        this.classType = "NodeDisplay";   /* because d3 will make a copy and destroy the original type */
        this.key = key;
        this.node = node;
        this.color = (color) ? color : "white";
        this.fillOpacity = (fillOpacity) ? fillOpacity : 1;
        this.stroke = (stroke) ? stroke : "black";
        this.strokeWidth = (strokeWidth) ? strokeWidth : 4;
        this.strokeOpacity = (strokeOpacity) ? strokeOpacity : 1;        
        this.strokeDashArray = (strokeDashArray) ? strokeDashArray : '1,0';
        this.x = (typeof(x) === 'number') ? x : 0; // TODO: get these defaults from somewhere else
        this.y = (typeof(y) === 'number') ? y : 0;
        this.size = (size) ? size : 'md';
        this.fontSize = (typeof(fontSize) === 'number') ? fontSize : 14;
        this.fontColor = (fontColor) ? fontColor : 'black';
        this.fontOpacity = (fontOpacity) ? fontOpacity : 1;
        this.textLocation = (textLocation) ? textLocation : "middle"; // middle or below
        this.isLocked = (typeof(isLocked) === 'boolean') ? isLocked : false;
        this.displayChangedSinceLastSave = (typeof(properties.displayChangedSinceLastSave) === 'boolean') ? displayChangedSinceLastSave : false;
        this.displayChangeTimestamp = (typeof(properties.displayChangeTimestamp) === 'number') ? displayChangeTimestamp : undefined;
        this.graphDataView = undefined;

        // These are set by setSize
        //this.radius = (typeof(radius) === 'number') ? radius : 40;
        //this.width = this.radius * 2;
        //this.height = this.radius * 2;
        this.setSize(this.size);
    }

    setX = (x) => {
        this.x = x;
        this.notifyChange();        
    }
    setY = (y) => {
        this.y = y;
        this.notifyChange();
    }

    getPropertiesString () {
        return this.node.getPropertiesString();
    }

    setIsLocked = (isLockedVar) => {
        this.isLocked = isLockedVar;
        this.notifyChange();        
    }

    getIsLocked = () => {
        return this.isLocked;
    }

    getNode = () => {
        return this.node;
    }

    getGraphDataView () {
        return this.graphDataView;
    }

    setGraphDataView (graphDataView) {
        this.graphDataView = graphDataView;
    }

    setColor = (hexColor) => {
        this.color = hexColor;
        hexColor = (hexColor && hexColor.toLowerCase) ? hexColor.toLowerCase() : hexColor;
        if (hexColor == '#000000' || hexColor == '#ffffff') {
            this.stroke = 'black';
        }
        else {
            this.stroke = chroma(hexColor).darken(1.6).hex();
        }
        var luminance = chroma(hexColor).luminance();
        if (luminance <= 0.45) {
            this.fontColor = 'white';
        }
        else {
            this.fontColor = 'black';
        }
        this.notifyChange();
    };

    notifyChange = () => {
        if (this.graphDataView) {
            this.graphDataView.dataChanged(GraphViewChangeType.NodeDisplayUpdate, { changedObject: this });
        }
    }

    setSize = (size) => {
        switch (size) {
            case 'x_sm':
                this.radius = 14;
                break;
            case 'sm':
                this.radius = 28;
                break;
            case 'md':
                this.radius = 40;
                break;
            case 'lg':
                this.radius = 60;
                break;
            case 'x_lg':
                this.radius = 80;
                break;
            default:
                this.radius = 40;
                break;

        }
        this.size = size;
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.notifyChange();
    };

    updateGraphData (graphDataView) {
        return super.updateGraphData (graphDataView, this, GraphConversionConfig.NodeDisplay);
    }
}

export class RelationshipDisplay extends GraphDataItem {
    constructor(properties) {
        super(properties);
        properties = (properties) ? properties : {};
        var {
            key, relationship, relationshipType, color, fontSize, 
            strokeWidth, strokeOpacity, strokeDashArray, offset,
            startDisplayNode, endDisplayNode, displayChangedSinceLastSave, displayChangeTimestamp 
        } = properties;

        this.myObjectName = 'RelationshipDisplay';    // because either Chrome or React is changing object.constructor.name

        this.classType = "RelationshipDisplay";   /* because d3 will make a copy and destroy the original type */
        this.key = key;

        this.startDisplayNode = startDisplayNode;
        this.endDisplayNode = endDisplayNode;

        // this is the Relationship graph object
        this.relationship = relationship;           
        // this is the name of the relationship, e.g. HAS_NODE
        this.relationshipType = this.getRelationshipType();   

        this.color = (color) ? color : "black";
        this.fontSize = (fontSize) ? fontSize : 14;
        this.strokeWidth = (strokeWidth) ? strokeWidth : 3;
        this.strokeOpacity = (strokeOpacity) ? strokeOpacity : 1;        
        this.strokeDashArray = (strokeDashArray) ? strokeDashArray : '1,0'
        this.offset = (offset) ? offset : 0;
        // this is just for relationships created directly in the model without being drawn
        if (relationship && relationship.selfConnected) {
            this.offset = this.startDisplayNode.radius;
        }

        this.displayChangedSinceLastSave = (typeof(properties.displayChangedSinceLastSave) === 'boolean') ? displayChangedSinceLastSave : false;
        this.displayChangeTimestamp = (typeof(properties.displayChangeTimestamp) === 'number') ? displayChangeTimestamp : undefined;

        this.graphDataView = undefined;
    }

    getRelationship = () => this.relationship;
    getRelationshipType = () => (this.relationship) ? this.relationship.type : null;
    getStartNode = () => this.startDisplayNode;
    getEndNode = () => this.endDisplayNode;

    reverseNodes = () => {
        // we need to trigger a deletion of underlying graphData relationships
        this.graphDataView.removeRelationship(this);

        // reverse the nodes
        var startDisplayNode = this.startDisplayNode;
        this.startDisplayNode = this.endDisplayNode;
        this.endDisplayNode = startDisplayNode;
        this.relationship.reverseNodes();

        // and then re-add it
        this.graphDataView.addRelationship(this);
    }

    isSelfConnected = () => this.startDisplayNode === this.endDisplayNode;
    startNodeMatches = (displayNode) => this.startDisplayNode === displayNode;
    connectedToNode = (displayNode) => this.startDisplayNode === displayNode
                                    || this.endDisplayNode === displayNode;
    hasStartAndEndNodes = (startDisplayNode, endDisplayNode) => 
                                this.startDisplayNode === startDisplayNode
                                && this.endDisplayNode === endDisplayNode;

    getPropertiesString () {
        return this.relationship.getPropertiesString();
    }
                            
    getGraphDataView () {
        return this.graphDataView;
    }

    setGraphDataView (graphDataView) {
        this.graphDataView = graphDataView;
    }

    setDisplayOffset (value) {
        var currentValue = this.offset;
        if (currentValue !== value) {
            this.offset = value;
            this.graphDataView.dataChanged(GraphViewChangeType.AddOrUpdateRelationship, { changedObject: this });
        }
    };

    updateGraphData (graphDataView) {
        return super.updateGraphData (graphDataView, this, GraphConversionConfig.RelationshipDisplay);        
    }

}

export class GraphDataView {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            id, keyHelper, nodes, relationships
        } = properties;

        id = (id) ? id : uuidv4();

        this.SUBGRAPH_MODEL = SUBGRAPH_MODEL;

        this.keyHelper = (keyHelper) ? keyHelper : new KeyHelper({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL,
            ID_JOINER: '_cwid_'  // 2020/09/02, right now if change this, things will break
        });

        this.myObjectName = 'GraphDataView';    // because either Chrome or React is changing object.constructor.name

        this.me = new EventEmitter();

        this.init(id, nodes, relationships, {createRootNode: true});
    }

    init = (id, nodes, relationships, options) => {
        options = (options) ? options : {};
        this.id = id;
        this.me.setId(id);
        this.nodes = (nodes) ? nodes : {};
        this.relationships = (relationships) ? relationships : {};

        this.hasDataChanged = false;
    
        this.deletedNodeKeysSinceLastSave = [];
        this.deletedRelationshipKeysSinceLastSave = [];

        // backing graphData to persist this view to the backend
        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL,
            keyHelper: this.keyHelper
        });

        var { createRootNode } = options;
        if (createRootNode) {
            this.createGraphViewRootNode(id);
        }

        this.nodeGraphDataMap = {};
        this.relationshipGraphDataMap = {};
    }

    // function to re-wire anything that isn't setup after deserialization
    afterDeserialize = () => {
        //this.me.setId(this.id);
    }

    clearData = () => {
        this.init(this.id);
        this.keyHelper.clearUsedKeys();
    }

    createGraphViewRootNode = (id) => {
        this.graphViewRootNode = this.graphData.createNode({
            key: id,
            isRootNode: true,
            primaryNodeLabel: SubgraphNodeLabels.GraphView,
            labels: [SubgraphNodeLabels.GraphView],
            dataChangedSinceLastSave: false,
            dataChangeTimestamp: 0
        });
        this.graphViewRootNode.addProperty("key", id);
        this.graphData.addNode(this.graphViewRootNode);
    }

    setSubgraphModel = (subgraphModel) => {
        this.SUBGRAPH_MODEL = subgraphModel;
        this.keyHelper.setSubgraphModel(subgraphModel);
        this.graphData.setSubgraphModel(subgraphModel);
    };
    getSubgraphModel = () => this.SUBGRAPH_MODEL;
    getKeyHelper = () => this.keyHelper;
    getEventEmitter = () => this.me;
    getGraphData = () => this.graphData;

    getGraphViewRootNode = () => this.graphViewRootNode;
    getAssociatedNodeDisplayGraphData = (nodeDisplay) => this.nodeGraphDataMap[nodeDisplay.key];

    updateGraphData = (graphViewItem) => {
        // result of updateGraphData (below) is something like this:
        //   it transforms the graphViewItem (NodeDisplay/RelationshipDisplay) into
        //   appropriate Nodes/Relationships for storage in the database
        /*
            {
                node: graphNode,
                relationships: graphRelationships
            }
        */
        var result = graphViewItem.updateGraphData(this);

        this.graphData.addNode(result.node);
        result.relationships.map(relationship => this.graphData.addRelationship(relationship));

        if (graphViewItem instanceof NodeDisplay) {
            this.nodeGraphDataMap[graphViewItem.key] = result;
        } else if (graphViewItem instanceof RelationshipDisplay) {
            this.relationshipGraphDataMap[graphViewItem.key] = result;
        }
    }

    removeFromGraphData = (graphViewItem, timestamp) => {
        var associatedGraphData = {};
        if (graphViewItem instanceof NodeDisplay) {
            associatedGraphData = this.nodeGraphDataMap[graphViewItem.key];
        } else if (graphViewItem instanceof RelationshipDisplay) {
            associatedGraphData = this.relationshipGraphDataMap[graphViewItem.key];
        }

        // associatedGraphData looks like:
        /*
            {
                node: graphNode,
                relationships: graphRelationships
            }
        */
        // this updates the in-memory copy
        //console.log('removing graphViewItem: ', graphViewItem);
        //console.log('graphViewItem associatedGraphData: ', associatedGraphData);
        this.graphData.removeNode(associatedGraphData.node);
        associatedGraphData.relationships.map(x => this.graphData.removeRelationship(x));

        this.deletedNodeKeysSinceLastSave.push({
            displayChangeTimestamp: timestamp,
            changedKey: {        
                isRootNode: associatedGraphData.node.isRootNode,
                rootNodeKey: associatedGraphData.node.getGraphData().getGraphRootNode().key,                            
                label: associatedGraphData.node.primaryNodeLabel,
                properties: [{key: 'key', value: associatedGraphData.node.key, datatype: DataTypes.String}]
            }
        });

        associatedGraphData.relationships.map(rel => {
            this.deletedRelationshipKeysSinceLastSave.push({
                displayChangeTimestamp: timestamp,
                changedKey: {
                    startNodeKey: (rel.getStartNode()) 
                        ? {
                            isRootNode: rel.getStartNode().isRootNode,
                            rootNodeKey: rel.getStartNode().getGraphData().getGraphRootNode().key,                            
                            label: rel.getStartNode().primaryNodeLabel,
                            properties: [{key: 'key', value: rel.getStartNode().key, datatype: DataTypes.String}],
                        } 
                        : {
                            isRootNode: false,
                            rootNodeKey: null,                            
                            label: null,
                            properties: []
                        }
                    ,
                    endNodeKey: (rel.getEndNode()) 
                        ? {
                            isRootNode: rel.getEndNode().isRootNode,
                            rootNodeKey: rel.getEndNode().getGraphData().getGraphRootNode().key,                            
                            label: rel.getEndNode().primaryNodeLabel,
                            properties: [{key: 'key', value: rel.getEndNode().key, datatype: DataTypes.String}],
                        } 
                        : {
                            isRootNode: false,
                            rootNodeKey: null,                            
                            label: null,
                            properties: []
                        }
                    ,
                    type: rel.type,
                    rootNodeKey: this.getGraphViewRootNode().key
                }
            });
        });
    }

    getCorrespondingGraphNode = (graphViewItem) => {
        var associatedGraphData;
        if (graphViewItem instanceof NodeDisplay) {
            associatedGraphData = this.nodeGraphDataMap[graphViewItem.key];
        } else if (graphViewItem instanceof RelationshipDisplay) {
            associatedGraphData = this.relationshipGraphDataMap[graphViewItem.key];
        }
        return (associatedGraphData) ? associatedGraphData.node : null;
    }

    createNodeDisplay = (properties) => {
        var newNodeDisplay = new NodeDisplay(properties);
        if (newNodeDisplay.key === undefined || newNodeDisplay.key === null) {
            newNodeDisplay.key = this.keyHelper.getNewNodeKey();
        }
        return newNodeDisplay;
    } 

    createRelationshipDisplay = (properties) => {
        var newRelationshipDisplay = new RelationshipDisplay(properties);
        if (newRelationshipDisplay.key === undefined || newRelationshipDisplay.key === null) {
            newRelationshipDisplay.key = this.keyHelper.getNewRelationshipKey();
        }
        return newRelationshipDisplay;
    }

    addNode (nodeInstance, dontNotify) {
        //console.log('graph data view add node, nodeInstance: ', nodeInstance);
        if (nodeInstance && nodeInstance.key !== null && nodeInstance.key !== undefined) {
            nodeInstance.setGraphDataView(this);

            //console.log(`graph data view, setting nodeInstance with key ${nodeInstance.key}, nodeInstance`, nodeInstance);
            this.nodes[nodeInstance.key] = nodeInstance;
            if (!dontNotify) {
                this.dataChanged(GraphViewChangeType.AddOrUpdateNode, { changedObject: nodeInstance });
            }
        } else {
            console.log("no key in nodeInstance ", nodeInstance);
            throw new Error("nodes must have a key");
        }
    }

    getNodeKey (nodeInstance) {
        var keyConfig = this.SUBGRAPH_MODEL.keyConfig.find(x => x.nodeLabel === nodeInstance.primaryNodeLabel);
        var keyPropertyKeys = (keyConfig) ? keyConfig.propertyKeys : ['key'];
        var nodeKeyProperties = keyPropertyKeys.map(key => {
            var graphNode = nodeInstance.getNode();
            if (graphNode) {
                return graphNode.getPropertyByKey(key)
            } else {
                return {
                    key: key,
                    value: nodeInstance[key],
                    datatype: getDataType(nodeInstance[key])
                }
            }
            
        });
        return { 
            label: nodeInstance.primaryNodeLabel,
            properties: nodeKeyProperties
        }
    }
    
    removeNode (nodeInstance) {
        if (nodeInstance) {
            delete this.nodes[nodeInstance.key];
            this.dataChanged(GraphViewChangeType.RemoveNode, nodeInstance);
        }
    }
    
    getNodeByKey (key) {
        return this.nodes[key];
    }
    
    getNodeMap () {
        return this.nodes;
    }
    
    getNodeArray () {
        return Object.values(this.nodes);
    }
    
    addRelationship (relationshipInstance, dontNotify) {
        if (relationshipInstance && relationshipInstance.key !== null && relationshipInstance.key !== undefined) {
            relationshipInstance.setGraphDataView(this);
            this.relationships[relationshipInstance.key] = relationshipInstance;

            if (!dontNotify) {
                this.dataChanged(GraphViewChangeType.AddOrUpdateRelationship, { changedObject: relationshipInstance });
            }
        } else {
            console.log("no key in relationshipInstance ", relationshipInstance);
            throw new Error("relationships must have a key");
        }
    }
    
    getRelationshipByKey (key) {
        return this.relationships[key];
    }

    getRelationshipMap () {
        return this.relationships;
    }
    
    getRelationshipArray () {
        return Object.values(this.relationships);
    }

    getRelationshipsForNodeByKey (nodeInstanceKey) {
        return Object.values(this.relationships).filter(relationship =>
                                (relationship.getStartNode().key === nodeInstanceKey
                                || relationship.getEndNode().key === nodeInstanceKey));
    }

    removeRelationshipByKey (relationshipInstanceKey) {
        if (relationshipInstanceKey) {
            var relationshipInstance = this.relationships[relationshipInstanceKey];
            this.removeRelationship(relationshipInstance);
        }
    }
    
    removeRelationship (relationshipInstance) {
        if (relationshipInstance) {
            delete this.relationships[relationshipInstance.key];
            this.dataChanged(GraphViewChangeType.RemoveRelationship, relationshipInstance);
        }
    }

    dataChanged = (dataChangeType, details) => {
        this.hasDataChanged = true;
        this.me.notifyListeners(dataChangeType, details);
        switch (dataChangeType) {
            case GraphViewChangeType.AddOrUpdateNode:
            case GraphViewChangeType.AddOrUpdateRelationship:
            case GraphViewChangeType.NodeDisplayUpdate:
                details.changedObject.displayChangedSinceLastSave = true;
                details.changedObject.displayChangeTimestamp = new Date().getTime();
                this.updateGraphData(details.changedObject);
                //console.log('setting timestamp to: ', details.changedObject.displayChangeTimestamp);
                break;
            case GraphViewChangeType.RemoveNode:
            case GraphViewChangeType.RemoveRelationship:
                this.removeFromGraphData(details, new Date().getTime());
                break;
            case GraphViewChangeType.CanvasTransformUpdate:
                // TODO: do something here
                break;
        }
    }

    resetDataChangeFlags (timestamp, dontResetGraphData) {
        timestamp = (timestamp) ? timestamp : new Date().getTime();
        if (!dontResetGraphData) {
            this.graphData.resetDataChangeFlags({timestamp: timestamp});
        }
        
        Object.values(this.nodes)
            .filter(node => node.displayChangeTimestamp < timestamp)
            .map(node => node.displayChangedSinceLastSave = false);

        Object.values(this.relationships)
            .filter(relationship => relationship.displayChangeTimestamp < timestamp)
            .map(relationship => relationship.displayChangedSinceLastSave = false);

        this.deletedNodeKeysSinceLastSave = this.deletedNodeKeysSinceLastSave
            .filter(x => x.dataChangeTimestamp >= timestamp);

        this.deletedRelationshipKeysSinceLastSave = this.deletedRelationshipKeysSinceLastSave
            .filter(x => x.dataChangeTimestamp >= timestamp);

    }

    getChangedItems (timestamp) {
        timestamp = timestamp || new Date().getTime();
        var changedNodes = Object.values(this.nodes)
                .filter(node => node.displayChangedSinceLastSave
                                && node.displayChangeTimestamp <= timestamp)

        var changedRelationships = Object.values(this.relationships)
                .filter(relationship => relationship.displayChangedSinceLastSave
                                        && relationship.displayChangeTimestamp <= timestamp)

        return {
            changedNodes: changedNodes,
            changedRelationships: changedRelationships
        }
    }

    getDeletedItems (timestamp) {
        timestamp = timestamp || new Date().getTime();
        const deletedNodeKeys = this.deletedNodeKeysSinceLastSave
                                            .filter(x => x.displayChangeTimestamp <= timestamp)
                                            .map(x => x.changedKey);
        const deletedRelationshipKeys = this.deletedRelationshipKeysSinceLastSave
                                            .filter(x => x.displayChangeTimestamp <= timestamp)
                                            .map(x => x.changedKey);

        return {
            deletedNodeKeys: deletedNodeKeys,
            deletedRelationshipKeys: deletedRelationshipKeys
        }
    }

    getConnectedRelationships = (node) => getConnectedRelationships(node, this.getRelationshipArray());
    getConnectedRelationshipBetweenNodes = (node1, node2) => getConnectedRelationshipBetweenNodes(node1, node2, this.getRelationshipArray());
    getConnectedNodes = (node) => getConnectedNodes(node, this.getRelationshipArray());
    getNodesThatHaveSelfConnectedRelationships = () => getNodesThatHaveSelfConnectedRelationships(this.getRelationshipArray());
    getNodePairsThatHaveMoreThanOneRelationshipBetweenThem = () => getNodePairsThatHaveMoreThanOneRelationshipBetweenThem(this.getRelationshipArray());

    getChangedItemsGraphData = () => this.graphData.getChangedItems();
    getViewGraphData = () => this.graphData;

    fromSaveObject = (graphDocView, graphData, keepDataChangeFlags) => {
        this.keyHelper.clearUsedKeys();
        //console.log("graphDataView: fromSaveObject: graphDocView.key = " + graphDocView.key);
        var key = graphDocView.key;
        this.init(key);

        // reconstitute the subgraph model, because it may not be the default one
        var graphViewNode = graphDocView.graph.nodes.find(node => node.primaryNodeLabel === NodeLabels.GraphView);
        var properties = convertGraphQLPropertiesToMap(graphViewNode.properties);

        // ensure submodel is synced
        var reconstituteResult = reconstituteLoadedSugraphModel(this.getSubgraphModel(), properties);        
        this.setSubgraphModel(reconstituteResult.modifiedSubgraphModel);

        // re-build root node
        this.graphViewRootNode = this.graphData.createNode({
            key: key,
            neoInternalId: graphViewNode.neoInternalId,
            isRootNode: graphViewNode.isRootNode,
            primaryNodeLabel: graphViewNode.primaryNodeLabel,
            labels: graphViewNode.labels,
            dataChangedSinceLastSave: false,
            dataChangeTimestamp: 0
        });
        graphViewNode.properties.map(property => {
            var result = convertSingleGraphQLProperty(property);
            this.graphViewRootNode.addProperty(result.key, result.value, result.datatype, true);
        });
        this.graphData.addNode(this.graphViewRootNode);
        this.graphViewRootNode.resetDataChangeFlags(new Date().getTime() + 1);

        // now re-build nodes
        var nodes = graphDocView.graph.nodes.filter(node => 
            // we don't want to include the graph view node
            node.primaryNodeLabel !== NodeLabels.GraphView
            // only allow a valid SubgraphNodeLabel for this SubgraphModel
            && SubgraphNodeLabels[node.primaryNodeLabel]
        )

        var nodeDisplayToGraphNodeMap = {};
        graphDocView.graph.relationships
            .filter(relationship => relationship.type === SubgraphRelationshipTypes.DISPLAY_FOR.name)
            .map(relationship => {
                //console.log("relationship.startNodeKey: ", relationship.startNodeKey);
                //console.log("relationship.endNodeKey: ", relationship.endNodeKey);
                var startNodeKey = this.keyHelper.getKeyAndAddIt(relationship.startNodeKey);
                // we are not going to add it, because anything we are pointing to is in a different key-space 
                //  (e.g. it's not a NodeDisplay or RelationshipDisplay) 

                var endNodeKey = this.keyHelper.getLocalKey(relationship.endNodeKey);
                nodeDisplayToGraphNodeMap[startNodeKey] = endNodeKey;

                // Eric 06/02/2021: we no longer want to convert to local keys
                //var endNodeKey = this.keyHelper.getLocalKey(relationship.endNodeKey);
                //nodeDisplayToGraphNodeMap[startNodeKey] = relationship.endNodeKey;
            });

        var startNodeDisplayToGraphNodeMap = {};
        var endNodeDisplayToGraphNodeMap = {};
        graphDocView.graph.relationships
            .filter(relationship => relationship.type === SubgraphRelationshipTypes.START_DISPLAY_FOR.name
                                 || relationship.type === SubgraphRelationshipTypes.END_DISPLAY_FOR.name)
            .map(relationship => {
                var startNodeKey = this.keyHelper.getKeyAndAddIt(relationship.startNodeKey);
                var endNodeKey = this.keyHelper.getKeyAndAddIt(relationship.endNodeKey);
                if (relationship.type === SubgraphRelationshipTypes.START_DISPLAY_FOR.name) {
                    startNodeDisplayToGraphNodeMap[startNodeKey] = endNodeKey;
                } else {
                    endNodeDisplayToGraphNodeMap[startNodeKey] = endNodeKey;
                }
            })

        nodes
            .filter(nodeObj => nodeObj.primaryNodeLabel === SubgraphNodeLabels.NodeDisplay)
            .map(nodeObj => {
                var properties = convertGraphQLPropertiesToMap(nodeObj.properties);
                //console.log("properties.key: ", properties.key);
                properties.key = this.keyHelper.getKeyAndAddIt(properties.key);
                // need properties.node before creating it
                var graphNodeKey = nodeDisplayToGraphNodeMap[properties.key];
                if (graphNodeKey) {
                    properties.node = graphData.getNodeByKey(graphNodeKey);
                }
                var node = new NodeDisplay(properties);
                this.addNode(node, true);
                this.updateGraphData(node);
            });

        nodes
            .filter(nodeObj => nodeObj.primaryNodeLabel === SubgraphNodeLabels.RelationshipDisplay)
            .map(nodeObj => {
                var properties = convertGraphQLPropertiesToMap(nodeObj.properties);
                properties.key = this.keyHelper.getKeyAndAddIt(properties.key);
                var startGraphNodeKey = startNodeDisplayToGraphNodeMap[properties.key];
                var endGraphNodeKey = endNodeDisplayToGraphNodeMap[properties.key];
                var startNode, endNode;
                if (startGraphNodeKey) {
                    properties.startDisplayNode = this.getNodeByKey(startGraphNodeKey);
                    startNode = properties.startDisplayNode.getNode();
                }
                if (endGraphNodeKey) {
                    properties.endDisplayNode = this.getNodeByKey(endGraphNodeKey);
                    endNode = properties.endDisplayNode.getNode();
                }
                var relationships = graphData.findRelationships(startNode, 
                    properties.relationshipType, endNode, {key: properties.key});
                
                if (relationships.length > 1) {
                    console.log("warning: found too many relationships in model, using first one");
                } else if (relationships.length === 0) {
                    console.log("warning: did not find any matching relationships");
                }
                properties.relationship = relationships[0];

                var relationship = new RelationshipDisplay(properties);
                this.addRelationship(relationship, true);
                this.updateGraphData(relationship);
            });

        if (!keepDataChangeFlags) {
            this.resetDataChangeFlags();
        }

        if (reconstituteResult) {
            saveNewConfigEntries(this.graphViewRootNode, reconstituteResult.newConfigEntries,
                reconstituteResult.newLabelFilter, reconstituteResult.newRelationshipFilter);
        }
    }
}