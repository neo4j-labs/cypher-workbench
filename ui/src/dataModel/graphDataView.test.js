
import { GraphData } from './graphData';
import { GraphDataView } from './graphDataView';
import { getGraphDataWithRelationships } from './graphData.test';
import { deserializeObject, serializeObject } from './graphUtil';

function resetDataChangeFlags (graphDataView) {
    var timestamp = new Date().getTime();
    // the logic right now is that is only clears things < timestamp, so we need to ensure we add 1 millisecond so things will clear
    graphDataView.resetDataChangeFlags(timestamp+1);
}

function getGraphDataViewWithNodes (nodeKeys) {
    var graphDataView = new GraphDataView({ id: 'test_graph_view' });
    nodeKeys.map(key => {
        var displayNode = graphDataView.createNodeDisplay({
            key: key
        });
        graphDataView.addNode(displayNode);
    })
    resetDataChangeFlags(graphDataView);
    return graphDataView;
}

function getGraphDataViewWithRelationships (relationshipArray) {
    var graphDataView = new GraphDataView();
    relationshipArray.map(entry => {
        var startNode = graphDataView.getNodeByKey(entry.startNode);
        if (!startNode) {
            startNode = graphDataView.createNodeDisplay({
                key: entry.startNode
            });
            graphDataView.addNode(startNode);
        }
        var endNode = graphDataView.getNodeByKey(entry.endNode);
        if (!endNode) {
            var endNode = graphDataView.createNodeDisplay({
                key: entry.endNode
            });
            graphDataView.addNode(endNode);
        }
        var properties = {
            key: entry.startNode + '_' + entry.type + '_' + entry.endNode,
            startDisplayNode: startNode,
            endDisplayNode: endNode
        }
        var relationship = graphDataView.getRelationshipByKey(properties.key);
        if (!relationship) {
            relationship = graphDataView.createRelationshipDisplay(properties);
            graphDataView.addRelationship(relationship);
        }
    })
    resetDataChangeFlags(graphDataView);
    return graphDataView;
}

function getGraphDataViewWithRelationshipsBasedOnGraphData (relationshipArray) {
    var graphData = getGraphDataWithRelationships(relationshipArray);

    var graphDataView = new GraphDataView();
    relationshipArray.map(entry => {
        var startNode = graphDataView.getNodeByKey(entry.startNode);
        if (!startNode) {
            startNode = graphDataView.createNodeDisplay({
                key: entry.startNode,
                node: graphData.getNodeByKey(entry.startNode)
            });
            graphDataView.addNode(startNode);
        }
        var endNode = graphDataView.getNodeByKey(entry.endNode);
        if (!endNode) {
            endNode = graphDataView.createNodeDisplay({
                key: entry.endNode,
                node: graphData.getNodeByKey(entry.endNode)
            });
            graphDataView.addNode(endNode);
        }
        var properties = {
            key: (entry.relKey) ? entry.relKey : entry.startNode + '_' + entry.type + '_' + entry.endNode,
            relationship: graphData.getRelationshipByKey(entry.relKey),
            startDisplayNode: startNode,
            endDisplayNode: endNode
        }
        var relationship = graphDataView.getRelationshipByKey(properties.key);
        if (!relationship) {
            relationship = graphDataView.createRelationshipDisplay(properties);
            graphDataView.addRelationship(relationship);
        }
    })
    resetDataChangeFlags(graphDataView);
    return { graphData, graphDataView };
}


test('make new graph data view', () => {
    var graphDataView = new GraphDataView();
    expect(graphDataView).not.toBeNull();
});

test('add a Node', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var nodeArray = graphDataView.getNodeArray();
    expect(nodeArray.length).toBe(1);
    var node = nodeArray[0];
    expect(node).not.toBeNull();
    expect(node.key).toBe('Test');
});

/*
test('before reset ensure root GraphView node is present', () => {
    var graphDataView = new GraphDataView();
    var changedItems = graphDataView.getChangedItemsGraphData();
    expect(changedItems.changedNodes.length).toBe(0);
    expect(changedItems.changedNodes[0].labels).toStrictEqual(["GraphView"]);
    expect(changedItems.changedRelationships.length).toBe(0);
});
*/

test('reset works', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var changedItems = graphDataView.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(0);
    expect(changedItems.changedRelationships.length).toBe(0);
});

test('add another Node', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var another = graphDataView.createNodeDisplay({
        key: 'Another'
    });
    graphDataView.addNode(another);

    // confirm that new node key is there
    var nodeArray = graphDataView.getNodeArray();
    expect(nodeArray.length).toBe(2);
    var node = graphDataView.getNodeByKey('Another');
    expect(node.key).toBe('Another');

    // confirm that we get data change
    var changedItems = graphDataView.getChangedItems();
    //console.log("changedItems: ", changedItems);
    expect(changedItems.changedNodes.length).toBe(1);

    expect(changedItems.changedRelationships.length).toBe(0);
    expect(changedItems.changedNodes[0]).toBe(another);
});

test('remove a Node', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var testNode = graphDataView.getNodeByKey('Test');
    //var nodeKey = testNode.key;
    var nodeKey = {
        isRootNode: false,
        label: "NodeDisplay", 
        properties: [{key: "key", value: "Test", datatype: "String"}]
    }

    graphDataView.removeNode(testNode);

    var nodeMap = graphDataView.getNodeMap();
    expect(Object.values(nodeMap).length).toBe(0);

    var deletedItems = graphDataView.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(2);    // because of the SUBGRAPH_MODEL
    nodeKey.rootNodeKey = deletedItems.deletedNodeKeys[0].rootNodeKey;
    expect(deletedItems.deletedNodeKeys[0]).toStrictEqual(nodeKey);
});

test('add a Relationship', () => {
    var graphDataView = getGraphDataViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var relationships = graphDataView.getRelationshipArray();
    expect(relationships.length).toBe(1);
    expect(relationships[0].startDisplayNode.key).toBe('A');
    expect(relationships[0].endDisplayNode.key).toBe('B');
});

test('remove a Relationship', () => {
    var graphDataView = getGraphDataViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var relationships = graphDataView.getRelationshipArray();
    var relationship = relationships[0];
    var relationshipKey = relationship.key;
    var persistedRelationshipKey = {
        endNodeKey: {
            isRootNode: false,
            label: "RelationshipDisplay", 
            properties: [
                {key: "key", value: "A_undefined_B", datatype: "String"}
            ]
        }, 
        startNodeKey: {
            isRootNode: true,
            label: "GraphView",
            properties: [
                 {key: "key", value: "bb7f6b2d-8de3-4e90-9a62-fc20ba512d1c", datatype: "String"}
            ]
        }, 
        type: "HAS_VIEW_NODE"
    };

    // check graph data
    var graphData = graphDataView.getGraphData();
    // root node, A, B, RelationshipDisplay
    expect(graphData.getNodeArray().length).toBe(4);            
    // for A, B, RelationshipDisplay, HAS_VIEW_NODE, DISPLAY_FOR, START_DISPLAY_FOR, END_DISPLAY_FOR
    expect(graphData.getRelationshipArray().length).toBe(7);    


    // remove and confirm it's removed
    graphDataView.removeRelationshipByKey(relationshipKey);
    relationships = graphDataView.getRelationshipArray();
    expect(relationships.length).toBe(0);

    // check if in deleted items
    var deletedItems = graphDataView.getDeletedItems();
    //console.log("deletedItems.deletedNodeKeys: ", deletedItems.deletedNodeKeys);
    expect(deletedItems.deletedNodeKeys.length).toBe(1);    // RelationshipDisplay from SUBGRAPH_MODEL
    expect(deletedItems.deletedRelationshipKeys.length).toBe(3);    // HAS_VIEW_NODE, START_DISPLAY_FOR, END_DISPLAY_FOR from SUBGRAPH_MODEL

    // update the GraphView key value to match for StrictEqual deletedRelationshipKeys[0]
    var relKey1 = deletedItems.deletedRelationshipKeys[0];
    persistedRelationshipKey.startNodeKey.properties[0].value = relKey1.startNodeKey.properties[0].value;
    persistedRelationshipKey.startNodeKey.rootNodeKey = relKey1.startNodeKey.rootNodeKey;
    persistedRelationshipKey.endNodeKey.rootNodeKey = relKey1.endNodeKey.rootNodeKey;
    persistedRelationshipKey.rootNodeKey = relKey1.rootNodeKey;

    expect(relKey1).toStrictEqual(persistedRelationshipKey);

    // check graph data
    var graphData = graphDataView.getGraphData();
    expect(graphData.getNodeArray().length).toBe(3);            // root node, A, B
    expect(graphData.getRelationshipArray().length).toBe(4);    // for A, B, HAS_VIEW_NODE, DISPLAY_FOR
});

test('test getConnectedNodes', () => {
    var graphDataView = getGraphDataViewWithRelationships([{startNode: 'A', endNode: 'B'}]);
    var nodeA = graphDataView.getNodeByKey('A');
    var nodeB = graphDataView.getNodeByKey('B');

    var relationships = graphDataView.getConnectedRelationships(nodeA);
    expect(relationships.length).toBe(1);

    var nodeAConnections = graphDataView.getConnectedNodes(nodeA);
    expect(nodeAConnections.length).toBe(1);
    expect(nodeAConnections[0]).toBe(nodeB);

    relationships = graphDataView.getConnectedRelationships(nodeB);
    expect(relationships.length).toBe(1);

    var nodeBConnections = graphDataView.getConnectedNodes(nodeB);
    expect(nodeBConnections.length).toBe(1);
    expect(nodeBConnections[0]).toBe(nodeA);

});

test('test outbound and inbound rel counts', () => {
    var { graphData, graphDataView } = getGraphDataViewWithRelationshipsBasedOnGraphData([
        {startNode: 'A', relKey: 1, type: 'TO', endNode: 'B'},
        {startNode: 'A', relKey: 5, type: 'FOO', endNode: 'B'},
        {startNode: 'A', relKey: 2, type: 'TO', endNode: 'C'},
        {startNode: 'A', relKey: 3, type: 'TO', endNode: 'D'},
        {startNode: 'B', relKey: 4, type: 'TO', endNode: 'D'}
    ]);
    //console.log('graphData: ', graphData);
    //console.log('graphDataView: ', graphDataView);

    var nodeA = graphDataView.getNodeByKey('A');
    var outboundRels = graphDataView.getOutboundRelationshipsForNodeByType(nodeA, 'TO');
    expect(outboundRels.length).toBe(3);
    var inboundRels = graphDataView.getInboundRelationshipsForNodeByType(nodeA, 'TO');
    expect(inboundRels.length).toBe(0);

    var nodeB = graphDataView.getNodeByKey('B');
    outboundRels = graphDataView.getOutboundRelationshipsForNodeByType(nodeB, 'TO');
    expect(outboundRels.length).toBe(1);
    inboundRels = graphDataView.getInboundRelationshipsForNodeByType(nodeB, 'TO');
    expect(inboundRels.length).toBe(1);

    var nodeC = graphDataView.getNodeByKey('C');
    outboundRels = graphDataView.getOutboundRelationshipsForNodeByType(nodeC, 'TO');
    expect(outboundRels.length).toBe(0);
    inboundRels = graphDataView.getInboundRelationshipsForNodeByType(nodeC, 'TO');
    expect(inboundRels.length).toBe(1);

    var nodeD = graphDataView.getNodeByKey('D');
    outboundRels = graphDataView.getOutboundRelationshipsForNodeByType(nodeD, 'TO');
    expect(outboundRels.length).toBe(0);
    inboundRels = graphDataView.getInboundRelationshipsForNodeByType(nodeD, 'TO');
    expect(inboundRels.length).toBe(2);
});

test('test convert to graphData', () => {    
    var key = 'foo';
    var graphData = new GraphData();
    var node = graphData.createNode({
        key: key
    });
    graphData.addNode(node);

    var graphDataView = new GraphDataView();
    resetDataChangeFlags(graphDataView);
    var displayNode = graphDataView.createNodeDisplay({
        key: `display_${key}`,
        node: node
    });
    graphDataView.addNode(displayNode);

    var changedGraphData = graphDataView.getChangedItemsGraphData();

    //console.log("changedGraphData.changedNodes: ", changedGraphData.changedNodes);
    expect(changedGraphData.changedNodes.length).toBe(1);
    expect(changedGraphData.changedRelationships.length).toBe(2);

    var fooDisplayNode = changedGraphData.changedNodes.find(x => x.key === `display_${key}`);
    expect(fooDisplayNode).not.toBe(null);

    var hasViewNodeRel = changedGraphData.changedRelationships.find(rel => rel.type === 'HAS_VIEW_NODE');
    var displayForRel = changedGraphData.changedRelationships.find(rel => rel.type === 'DISPLAY_FOR');

    var graphData = graphDataView.getAssociatedNodeDisplayGraphData(fooDisplayNode);
    expect(hasViewNodeRel.startNode).toBe(graphDataView.getGraphViewRootNode());
    expect(hasViewNodeRel.endNode).toBe(graphData.node);

    expect(displayForRel.startNode).toBe(graphData.node);
    expect(displayForRel.endNode).toBe(node)
    //console.log("changedGraphData: ", changedGraphData);
})

test('add another Node - then serialize/deserialize', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var another = graphDataView.createNodeDisplay({
        key: 'Another'
    });
    graphDataView.addNode(another);

    // confirm root node exists
    expect(graphDataView.graphViewRootNode.key).toBe('test_graph_view');
    expect(graphDataView.graphViewRootNode.isRootNode).toBe(true);
    expect(graphDataView.graphData.nodes['test_graph_view']).not.toBeNull();

    var serializedGraphDataView = serializeObject(graphDataView);
    var json = JSON.stringify(serializedGraphDataView);

    var deserializedGraphDataView = deserializeObject(JSON.parse(json));

    // confirm that new node key is there
    var nodeArray = deserializedGraphDataView.getNodeArray();
    expect(nodeArray.length).toBe(2);
    var node = deserializedGraphDataView.getNodeByKey('Another');
    expect(node.key).toBe('Another');


    // confirm that we get data change
    var changedItems = deserializedGraphDataView.getChangedItems();
    //console.log("changedItems: ", changedItems);
    expect(changedItems.changedNodes.length).toBe(1);

    expect(changedItems.changedRelationships.length).toBe(0);
    //console.log(json);
    expect(changedItems.changedNodes[0].key).toBe(another.key);

    // re-confirm root node exists
    expect(deserializedGraphDataView.graphViewRootNode.key).toBe('test_graph_view');
    expect(deserializedGraphDataView.graphViewRootNode.isRootNode).toBe(true);
    expect(deserializedGraphDataView.graphData.nodes['test_graph_view']).not.toBeNull();

});

test('remove a Node - then serialize/deserialize', () => {
    var graphDataView = getGraphDataViewWithNodes(['Test']);
    var testNode = graphDataView.getNodeByKey('Test');
    //var nodeKey = testNode.key;
    var nodeKey = {
        isRootNode: false,
        label: "NodeDisplay", 
        properties: [{key: "key", value: "Test", datatype: "String"}]
    }

    graphDataView.removeNode(testNode);

    var nodeMap = graphDataView.getNodeMap();
    expect(Object.values(nodeMap).length).toBe(0);

    var serializedGraphDataView = serializeObject(graphDataView);
    var json = JSON.stringify(serializedGraphDataView);

    var deserializedGraphDataView = deserializeObject(JSON.parse(json));

    var deletedItems = deserializedGraphDataView.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(2);    // because of the SUBGRAPH_MODEL
    nodeKey.rootNodeKey = deletedItems.deletedNodeKeys[0].rootNodeKey;
    expect(deletedItems.deletedNodeKeys[0]).toStrictEqual(nodeKey);
});
