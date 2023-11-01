
import { SyncedEventTypes, SyncedGraphDataAndView } from './syncedGraphDataAndView';
import { listenTo } from './eventEmitter';
import { deserializeObject, serializeObject } from './graphUtil';

function resetDataChangeFlags (syncedGraphDataAndView) {
    var timestamp = new Date().getTime();
    // the logic right now is that is only clears things < timestamp, so we need to ensure we add 1 millisecond so things will clear
    syncedGraphDataAndView.resetDataChangeFlags(timestamp+1);

    /*
    syncedGraphDataAndView.getGraphData().getNodeArray().map(node => {
        console.log("node key: " + node.key);
        console.log("changed properties: ", node.getChangedProperties());
    });
    syncedGraphDataAndView.getGraphDataView().getNodeArray().map(node => {
        console.log("node key: " + node.key);
        console.log("changed properties: ", node.getNode().getChangedProperties());
    });
    */
}

function getSyncedGraphDataAndViewWithNodes (nodeKeys) {
    var syncedGraphDataAndView = new SyncedGraphDataAndView();
    nodeKeys.map(key => {
        var displayNode = syncedGraphDataAndView.createNode({
            key: key
        },{
            key: key
        });
        syncedGraphDataAndView.addNode(displayNode);
    })
    resetDataChangeFlags(syncedGraphDataAndView);
    return syncedGraphDataAndView;
}

function getSyncedGraphDataAndViewWithRelationships (relationshipArray) {
    var syncedGraphDataAndView = new SyncedGraphDataAndView();
    relationshipArray.map(entry => {
        var startDisplayNode = syncedGraphDataAndView.createNode({
            key: entry.startNode
        },{
            key: entry.startNode
        });
        var endDisplayNode = syncedGraphDataAndView.createNode({
            key: entry.endNode
        },{
            key: entry.endNode
        });

        var relationshipProperties = {
            key: entry.startNode + '_' + entry.type + '_' + entry.endNode,
            startNode: startDisplayNode.getNode(),
            endNode: endDisplayNode.getNode()
        };

        var displayProperties = {
            key: entry.startNode + '_' + entry.type + '_' + entry.endNode,
            startDisplayNode: startDisplayNode,
            endDisplayNode: endDisplayNode
        }
        var relationship = syncedGraphDataAndView.createRelationship(relationshipProperties, displayProperties);
        syncedGraphDataAndView.addNode(startDisplayNode);
        syncedGraphDataAndView.addNode(endDisplayNode);
        syncedGraphDataAndView.addRelationship(relationship);
    })
    resetDataChangeFlags(syncedGraphDataAndView);
    return syncedGraphDataAndView;
}

test('make new graph data view', () => {
    var syncedGraphDataAndView = new SyncedGraphDataAndView();
    expect(syncedGraphDataAndView).not.toBeNull();
});

test('add a Node', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var nodeArray = syncedGraphDataAndView.getNodeArray();
    expect(nodeArray.length).toBe(1);
    var node = nodeArray[0];
    expect(node).not.toBeNull();
    expect(node.key).toBe('Test');
});

test('reset works', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var timestamp = new Date().getTime();
    var changedItems = syncedGraphDataAndView.getChangedItems(timestamp);
    //console.log("reset works changedItems: ", changedItems);
    expect(changedItems.changedNodes.length).toBe(0);
    expect(changedItems.changedRelationships.length).toBe(0);
});

test('add another Node', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var another = syncedGraphDataAndView.createNode({
        key: 'Another'
    },{
        key: 'Another'
    });
    syncedGraphDataAndView.addNode(another);

    // confirm that new node key is there
    var nodeArray = syncedGraphDataAndView.getNodeArray();
    expect(nodeArray.length).toBe(2);
    var node = syncedGraphDataAndView.getNodeByKey('Another');
    expect(node.key).toBe('Another');

    // confirm that we get data change
    var timestamp = new Date().getTime();
    var changedItems = syncedGraphDataAndView.getChangedItems(timestamp);
    
    // why 2? because we are adding a Node to GraphData and a NodeDisplay to GraphDataView, 
    expect(changedItems.changedNodes.length).toBe(2);

    // why 2? because in the Synced View, it renders a model like this:
    //   GraphDataView -> HAS_VIEW_NODE -> NodeDisplay -> HAS_VIEW_NODE -> Node
    //   where NodeDisplay is from GraphDataView and Node is from GraphData
    expect(changedItems.changedRelationships.length).toBe(2);

    expect(changedItems.changedNodes.includes(another.getNode())).toBe(true);
});

test('reset works after adding a property', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var testDisplayNode = syncedGraphDataAndView.getNodeByKey('Test');
    var testNode = testDisplayNode.getNode();
    testNode.addProperty('variable', 'foo');

    var timestamp = new Date().getTime();
    var changedItems = syncedGraphDataAndView.getChangedItems(timestamp);
    expect(changedItems.changedNodes.length).toBe(1);

    resetDataChangeFlags(syncedGraphDataAndView);
    timestamp = new Date().getTime();
    changedItems = syncedGraphDataAndView.getChangedItems(timestamp);

    expect(changedItems.changedNodes.length).toBe(0);
});

/*
test('remove a Node', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var testNode = syncedGraphDataAndView.getNodeByKey('Test');
    var nodeKey = testNode.key;
    syncedGraphDataAndView.removeNode(testNode);

    var nodeMap = syncedGraphDataAndView.getNodeMap();
    expect(Object.values(nodeMap).length).toBe(0);

    var deletedItems = syncedGraphDataAndView.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(2);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(2);
    expect(deletedItems.deletedNodeKeys.includes(nodeKey)).toBe(true);
});

test('add a Relationship', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var relationships = syncedGraphDataAndView.getRelationshipArray();
    expect(relationships.length).toBe(1);
    expect(relationships[0].startDisplayNode.key).toBe('A');
    expect(relationships[0].endDisplayNode.key).toBe('B');
});

test('remove a Relationship', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var relationships = syncedGraphDataAndView.getRelationshipArray();
    var relationship = relationships[0];
    var relationshipKey = relationship.key;

    // remove and confirm it's removed
    syncedGraphDataAndView.removeRelationshipByKey(relationshipKey);
    relationships = syncedGraphDataAndView.getRelationshipArray();
    expect(relationships.length).toBe(0);

    // check if in deleted items
    var deletedItems = syncedGraphDataAndView.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(0);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipKeys[0]).toBe(relationshipKey);
});
*/

test('test getConnectedNodes', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var nodeA = syncedGraphDataAndView.getNodeByKey('A');
    var nodeB = syncedGraphDataAndView.getNodeByKey('B');

    var relationships = syncedGraphDataAndView.getConnectedRelationships(nodeA);
    expect(relationships.length).toBe(1);

    var nodeAConnections = syncedGraphDataAndView.getConnectedNodes(nodeA);
    expect(nodeAConnections.length).toBe(1);
    expect(nodeAConnections[0]).toBe(nodeB);

    relationships = syncedGraphDataAndView.getConnectedRelationships(nodeB);
    expect(relationships.length).toBe(1);

    var nodeBConnections = syncedGraphDataAndView.getConnectedNodes(nodeB);
    expect(nodeBConnections.length).toBe(1);
    expect(nodeBConnections[0]).toBe(nodeA);

});

test('test getConnectedNodes that underlying graph relationship exists', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var nodeA = syncedGraphDataAndView.getNodeByKey('A');
    var nodeB = syncedGraphDataAndView.getNodeByKey('B');

    var graphData = syncedGraphDataAndView.getGraphData();
    var gNodeA = graphData.getNodeByKey('A');
    var gNodeB = graphData.getNodeByKey('B');

    expect(nodeA.getNode()).toBe(gNodeA);
    expect(nodeB.getNode()).toBe(gNodeB);

    var relationships = graphData.getConnectedRelationships(gNodeA);
    expect(relationships.length).toBe(1);

    var nodeAConnections = graphData.getConnectedNodes(gNodeA);
    expect(nodeAConnections.length).toBe(1);
    expect(nodeAConnections[0]).toBe(gNodeB);

    relationships = graphData.getConnectedRelationships(gNodeB);
    expect(relationships.length).toBe(1);

    var nodeBConnections = graphData.getConnectedNodes(gNodeB);
    expect(nodeBConnections.length).toBe(1);
    expect(nodeBConnections[0]).toBe(gNodeA);
});

test('listen to changes', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    //console.log("listen to changes");
    listenTo(syncedGraphDataAndView, "testListener", (id, messageName, messagePayload) => {
        expect(Object.values(SyncedEventTypes).includes(messageName)).toBe(true);
    });

    var another = syncedGraphDataAndView.createNode({
        key: 'Another'
    },{
        key: 'Another'
    });
    syncedGraphDataAndView.addNode(another);

});

test('add another Node - serialize/deserialize', () => {
    var syncedGraphDataAndView = getSyncedGraphDataAndViewWithNodes(['Test']);
    var another = syncedGraphDataAndView.createNode({
        key: 'Another'
    },{
        key: 'Another'
    });
    syncedGraphDataAndView.addNode(another);

    // confirm that new node key is there
    var nodeArray = syncedGraphDataAndView.getNodeArray();
    expect(nodeArray.length).toBe(2);
    var node = syncedGraphDataAndView.getNodeByKey('Another');
    expect(node.key).toBe('Another');

    var serializedSyncedGraphDataAndView = serializeObject(syncedGraphDataAndView);
    var json = JSON.stringify(serializedSyncedGraphDataAndView);

    var deserializedSyncedGraphDataAndView = deserializeObject(JSON.parse(json));

    // confirm that we get data change
    var timestamp = new Date().getTime();
    var changedItems = deserializedSyncedGraphDataAndView.getChangedItems(timestamp);

    // why 2? because we are adding a Node to GraphData and a NodeDisplay to GraphDataView, 
    expect(changedItems.changedNodes.length).toBe(2);

    // why 2? because in the Synced View, it renders a model like this:
    //   GraphDataView -> HAS_VIEW_NODE -> NodeDisplay -> HAS_VIEW_NODE -> Node
    //   where NodeDisplay is from GraphDataView and Node is from GraphData
    expect(changedItems.changedRelationships.length).toBe(2);

    var deserializedAnotherNode = changedItems.changedNodes.find(x => x.key === another.getNode().key);
    expect(deserializedAnotherNode).not.toBeNull();
});



