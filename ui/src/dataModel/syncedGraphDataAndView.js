
import { KeyHelper } from './keyHelper';
import { GraphData } from './graphData';
import { GraphDataView } from './graphDataView';
import { EventEmitter, listenTo } from './eventEmitter';

export const SyncedEventTypes = {
    GraphDataEvent: "GraphDataEvent",
    GraphDataViewEvent: "GraphDataViewEvent"
}

export class SyncedGraphDataAndView {

    graphDataListener = (id, messageName, messagePayload) => {
        this.me.notifyListeners(SyncedEventTypes.GraphDataEvent, {
            id: id, 
            messageName: messageName,
            messagePayload: messagePayload
        });                    
    }

    graphDataViewListener = (id, messageName, messagePayload) => {
        this.me.notifyListeners(SyncedEventTypes.GraphDataViewEvent, {
            id: id, 
            messageName: messageName,
            messagePayload: messagePayload
        });                    
    }

    getEventEmitter = () => this.me;

    constructor (properties) {
        properties = (properties) ? properties : {};

        var { 
            id,
            graphData,
            graphDataView,
            SUBGRAPH_MODEL
        } = properties;

        this.graphData = (graphData) ? graphData : new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL,
            keyHelper: new KeyHelper({
                id: id,
                SUBGRAPH_MODEL: SUBGRAPH_MODEL
            })
        });

        this.myObjectName = 'SyncedGraphDataAndView';    // because either Chrome or React is changing object.constructor.name

        this.graphDataView = (graphDataView) ? graphDataView: new GraphDataView();
        this.me = new EventEmitter(id);
        this.setupListeners();
    }

    setupListeners = () => {
        listenTo(this.graphData, this.graphData.id, this.graphDataListener, true);
        listenTo(this.graphDataView, this.graphData.id, this.graphDataViewListener, true);
    }

    // function to re-wire anything that isn't setup after deserialization
    afterDeserialize = () => {
        this.setupListeners();
    }

    clearData = () => {
        this.graphData.clearData();
        this.graphDataView.clearData();
    }

    getGraphData = () => this.graphData;
    getGraphDataView = () => this.graphDataView;

    getChangedItemsGraphData = (timestamp) => {
        var graphDataChangedGraphData = this.graphData.getChangedItems(timestamp);
        var graphDataViewChangedGraphData = this.graphDataView.getChangedItemsGraphData(timestamp);

        return {
            changedNodes: graphDataChangedGraphData.changedNodes.concat(graphDataViewChangedGraphData.changedNodes),
            changedRelationships: graphDataChangedGraphData.changedRelationships.concat(graphDataViewChangedGraphData.changedRelationships)
        }
    }

    createNode (nodeProperties, displayProperties) {
        var node = this.graphData.createNode(nodeProperties);
        displayProperties = (displayProperties) ? displayProperties : {};

        var displayNode = this.graphDataView.createNodeDisplay({
            ...displayProperties,
            node: node
        });
        return displayNode;
    }

    createRelationship = (relationshipProperties, displayProperties) => {
        var relationship = this.graphData.createRelationship(relationshipProperties);
        displayProperties = (displayProperties) ? displayProperties : {};

        var displayRelationship = this.graphDataView.createRelationshipDisplay({
            ...displayProperties,
            relationship: relationship
        });
        return displayRelationship;
    }

    addNode (displayNode, dontNotify) {
        //console.log('graph data view add node, nodeInstance: ', nodeInstance);
        this.graphData.addNode(displayNode.getNode(), dontNotify);
        this.graphDataView.addNode(displayNode, dontNotify);
    }
    
    removeNode (displayNodeInstance) {
        this.graphData.removeNode(displayNodeInstance.getNode());
        this.graphDataView.removeNode(displayNodeInstance);
    }
    
    getNodeByKey = (key) => this.graphDataView.getNodeByKey(key);
    getNodeMap = () => this.graphDataView.getNodeMap();
    getNodeArray = () => this.graphDataView.getNodeArray();
    
    addRelationship (displayRelationshipInstance, dontNotify) {
        this.graphData.addRelationship(displayRelationshipInstance.getRelationship(), dontNotify);
        this.graphDataView.addRelationship(displayRelationshipInstance, dontNotify);
    }
    
    getRelationshipByKey = (key) => this.graphDataView.getRelationshipByKey(key);
    getRelationshipMap = () => this.graphDataView.getRelationshipMap();
    getRelationshipArray = () => this.graphDataView.getRelationshipArray();

    getRelationshipsForNodeByKey = (nodeInstanceKey) => this.graphDataView.getRelationshipsForNodeByKey(nodeInstanceKey);

    removeRelationshipByKey = (relationshipInstanceKey) => {
        var displayRelationship = this.graphDataView.getRelationshipByKey(relationshipInstanceKey);
        this.graphData.removeRelationship(displayRelationship.getRelationship());
        this.graphDataView.removeRelationshipByKey(relationshipInstanceKey);
    }
    
    removeRelationship = (relationshipInstance) => {
        this.graphData.removeRelationship(relationshipInstance.getRelationship());
        this.graphDataView.removeRelationship(relationshipInstance);
    }

    resetDataChangeFlags = (timestamp, dontResetGraphData) => {
        // this first one expects an object, the second does not
        this.graphData.resetDataChangeFlags({timestamp: timestamp});
        this.graphDataView.resetDataChangeFlags(timestamp, dontResetGraphData);
    }

    getChangedItems (timestamp) {
        var graphDataChanges = this.graphData.getChangedItems(timestamp);
        //console.log("graphDataChanges: ", graphDataChanges);
        var graphDataViewChanges = this.graphDataView.getChangedItemsGraphData(timestamp);
        //console.log("graphDataViewChanges: ", graphDataViewChanges);

        return {
            changedNodes: graphDataChanges.changedNodes.concat(graphDataViewChanges.changedNodes),
            changedRelationships: graphDataChanges.changedRelationships.concat(graphDataViewChanges.changedRelationships)
        }
    }

    getDeletedItems (timestamp) {
        var graphDataDeletions = this.graphData.getDeletedItems(timestamp);
        var graphDataViewDeletions = this.graphDataView.getDeletedItems(timestamp);

        return {
            deletedNodeKeys: graphDataDeletions.deletedNodeKeys.concat(graphDataViewDeletions.deletedNodeKeys),
            deletedRelationshipKeys: graphDataDeletions.deletedRelationshipKeys.concat(graphDataViewDeletions.deletedRelationshipKeys)
        }
    }

    getConnectedRelationships = (node) => this.graphDataView.getConnectedRelationships(node);
    getConnectedRelationshipBetweenNodes = (node1, node2) => this.graphDataView.getConnectedRelationshipBetweenNodes(node1, node2);
    getConnectedNodes = (node) => this.graphDataView.getConnectedNodes(node);
    getNodesThatHaveSelfConnectedRelationships = () => this.graphDataView.getNodesThatHaveSelfConnectedRelationships();
    getNodePairsThatHaveMoreThanOneRelationshipBetweenThem = () => this.graphDataView.getNodePairsThatHaveMoreThanOneRelationshipBetweenThem();

    fromSaveObject = (graphDocJson, graphDocViewJson, keepDataChangeFlags) => {
        this.graphData.fromSaveObject(graphDocJson, keepDataChangeFlags);
        this.graphDataView.fromSaveObject(graphDocViewJson, this.graphData, keepDataChangeFlags);
    }

    getIsRemotelyPersisted = () => this.graphData.getIsRemotelyPersisted();
    setIsRemotelyPersisted = (isRemotelyPersisted) => this.graphData.setIsRemotelyPersisted(isRemotelyPersisted);

    dataChanged = (dataChangeType, details) => {
        //this.me.notifyListeners(dataChangeType, details);
        //this.graphData.dataChanged(dataChangeType, details);
        this.graphDataView.dataChanged(dataChangeType, details);
    }
}