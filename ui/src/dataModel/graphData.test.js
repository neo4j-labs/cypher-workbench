
import { GraphData } from './graphData';
import { deserializeObject, serializeObject } from './graphUtil';

test('make new graph data', () => {
    var graphData = new GraphData();
    expect(graphData).not.toBeNull();
});

function resetDataChangeFlags (graphData) {
    var timestamp = new Date().getTime();
    // the logic right now is that is only clears things < timestamp, so we need to ensure we add 1 millisecond so things will clear
    graphData.resetDataChangeFlags({
        timestamp: timestamp+1
    });
}

function getGraphDataWithNodes (nodeKeys) {
    var graphData = new GraphData();
    nodeKeys.map(key => {
        var node = graphData.createNode({
            key: key
        });
        graphData.addNode(node);
    });
    resetDataChangeFlags(graphData);
    return graphData;
}

function getGraphDataWithRelationships (relationshipArray) {
    var graphData = new GraphData({ id: 'test_graph' });
    relationshipArray.map(entry => {
        var startNode = graphData.createNode({
            key: entry.startNode
        });
        var endNode = graphData.createNode({
            key: entry.endNode
        });
        var properties = {
            key: entry.startNode + '_' + entry.type + '_' + entry.endNode,
            type: entry.type,
            startNode: startNode,
            endNode: endNode
        }
        var relationship = graphData.createRelationship(properties);
        graphData.addNode(startNode);
        graphData.addNode(endNode);
        graphData.addRelationship(relationship);
    })
    resetDataChangeFlags(graphData);
    return graphData;
}

test('add a Node', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var nodeArray = graphData.getNodeArray();
    expect(nodeArray.length).toBe(1);
    var node = nodeArray[0];
    expect(node).not.toBeNull();
    expect(node.key).toBe('Test');
});

test('add another Node', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var another = graphData.createNode({
        key: 'Another'
    });
    graphData.addNode(another);

    // confirm that new node key is there
    var nodeArray = graphData.getNodeArray();
    expect(nodeArray.length).toBe(2);
    var node = graphData.getNodeByKey('Another');
    expect(node.key).toBe('Another');

    // confirm that we get data change
    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedRelationships.length).toBe(0);
    expect(changedItems.changedNodes[0]).toBe(another);
});

test('change a Node', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var nodeArray = graphData.getNodeArray();
    expect(nodeArray.length).toBe(1);
    var node = nodeArray[0];
    expect(node).not.toBeNull();

    node.update({ key: 'Updated' });
    expect(node.key).toBe('Updated');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedRelationships.length).toBe(0);

    expect(changedItems.changedNodes[0]).toBe(node);
});

test('remove a Node', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');
    var nodeKey = {
        isRootNode: false,
        label: null,
        properties: [{key: 'key', value: testNode.key, datatype: 'String'}]
    }
    graphData.removeNode(testNode);

    var nodeArray = graphData.getNodeArray();
    expect(nodeArray.length).toBe(0);

    var deletedItems = graphData.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(0);
    nodeKey.rootNodeKey = deletedItems.deletedNodeKeys[0].rootNodeKey;
    expect(deletedItems.deletedNodeKeys[0]).toStrictEqual(nodeKey);
});

test('add a Node property', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(0);

    testNode.addOrUpdateProperty ('a', 'foo', 'String');
    // 2 properties - a 'key' property is added automatically
    expect(Object.values(testNode.properties).length).toBe(2);

    var property = Object.values(testNode.properties)[0];
    expect(property.value).toBe('Test');
    expect(property.datatype).toBe('String');

    property = Object.values(testNode.properties)[1];
    expect(property.value).toBe('foo');
    expect(property.datatype).toBe('String');

    changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);
});

test('update a Node property', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    testNode.addOrUpdateProperty ('propKey', 'prop1', 'String');
    testNode.resetDataChangeFlags();
    testNode.addOrUpdateProperty ('propKey', 'prop1', 'Integer');

    // 2 because there is an additional 'key' property
    expect(Object.values(testNode.properties).length).toBe(2);
    var property = Object.values(testNode.properties)[1];
    expect(property.key).toBe('propKey');
    expect(property.value).toBe('prop1');
    expect(property.datatype).toBe('Integer');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);

    var changedProperties = testNode.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].datatype).toBe('Integer');
});

test('update a Node property by key lookup', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    testNode.addOrUpdateProperty ('key', 'prop1', 'String');
    testNode.resetDataChangeFlags();

    var matchingProperty = testNode.getPropertyByKey('key');
    var key = (matchingProperty && matchingProperty.key) ? matchingProperty.key : null;

    testNode.addOrUpdateProperty (key, 'prop1', 'Integer');

    expect(Object.values(testNode.properties).length).toBe(1);
    var property = Object.values(testNode.properties)[0];
    expect(property.value).toBe('prop1');
    expect(property.datatype).toBe('Integer');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);

    var changedProperties = testNode.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].datatype).toBe('Integer');
});

test('add a Node property after simulated save - check to see if it is in getChangedItems()', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    testNode.addOrUpdateProperty ('propKey', 'prop1', 'String');
    // simulated save
    resetDataChangeFlags(graphData);
    testNode.addOrUpdateProperty ('propKey2', 'prop2', 'String');

    // 3 because of the additional 'key' property
    expect(Object.values(testNode.properties).length).toBe(3);
    var property = Object.values(testNode.properties)[2];
    expect(property.value).toBe('prop2');
    expect(property.datatype).toBe('String');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);

    var changedProperties = testNode.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].value).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
});

test('remove a Node property', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    // add the property and confirm it's there
    testNode.addOrUpdateProperty ('propKey', 'prop1', 'String');
    testNode.resetDataChangeFlags();
    // 2 because of the additional 'key' property
    expect(Object.values(testNode.properties).length).toBe(2);
    var property = Object.values(testNode.properties)[1];
    expect(property.value).toBe('prop1');

    // remove the property
    testNode.removeProperty('propKey');
    // 1 because we still have the 'key' property
    expect(Object.values(testNode.properties).length).toBe(1);

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);
    expect(testNode.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(testNode.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');
});

test('add a Relationship', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    expect(relationships.length).toBe(1);
    expect(relationships[0].type).toBe('TO');
    expect(relationships[0].startNode.key).toBe('A');
    expect(relationships[0].endNode.key).toBe('B');
});

test('update a Relationship', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    relationship.update({ type: 'FROM' });
    expect(relationship.type).toBe('FROM');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(0);
    expect(changedItems.changedRelationships.length).toBe(1);

    expect(changedItems.changedRelationships[0]).toBe(relationship);
});

test('remove a Relationship', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);

    var relationships = graphData.getRelationshipArray();
    var relationshipInternalKey = relationships[0].key;

    var relationshipKey = {
        startNodeKey: {
            isRootNode: false,
            label: null,
            properties: [{key: 'key', value: 'A', datatype: 'String'}],
        },
        endNodeKey: {
            isRootNode: false,
            label: null,
            properties: [{key: 'key', value: 'B', datatype: 'String'}]
        },
        type: 'TO'
    }

    // remove and confirm it's removed
    graphData.removeRelationshipByKey(relationshipInternalKey);
    relationships = graphData.getRelationshipArray();
    expect(relationships.length).toBe(0);

    // check if in deleted items
    var deletedItems = graphData.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(0);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(1);
    relationshipKey.startNodeKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    relationshipKey.endNodeKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    relationshipKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    expect(deletedItems.deletedRelationshipKeys[0]).toStrictEqual(relationshipKey);
});

test('add a Relationship property', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(0);

    relationship.addOrUpdateProperty ('propKey', 'prop1', 'String', 'abc');
    expect(Object.values(relationship.properties).length).toBe(1);
    var property = Object.values(relationship.properties)[0];
    expect(property.value).toBe('prop1');
    expect(property.datatype).toBe('String');

    changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);
});

test('add a Relationship property after simulated save', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    relationship.addOrUpdateProperty ('propKey', 'prop1', 'String', 'abc');
    resetDataChangeFlags(graphData);
    relationship.addOrUpdateProperty ('propKey2', 'prop2', 'String', 'def');

    expect(Object.values(relationship.properties).length).toBe(2);
    var property = Object.values(relationship.properties)[1];
    expect(property.value).toBe('prop2');
    expect(property.datatype).toBe('String');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);

    changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);

    var changedProperties = relationship.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].value).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
});

test('update a Relationship property', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    relationship.addOrUpdateProperty ('propKey', 'prop1', 'String', 'abc');
    relationship.resetDataChangeFlags();
    relationship.addOrUpdateProperty ('propKey', 'prop1', 'Integer', 123);

    expect(Object.values(relationship.properties).length).toBe(1);
    var property = Object.values(relationship.properties)[0];
    expect(property.value).toBe('prop1');
    expect(property.datatype).toBe('Integer');

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);
});

test('remove a Relationship property', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    // add the property and confirm it's there
    relationship.addOrUpdateProperty ('propKey', 'prop1', 'String', 'abc');
    relationship.resetDataChangeFlags();
    expect(Object.values(relationship.properties).length).toBe(1);
    var property = Object.values(relationship.properties)[0];
    expect(property.value).toBe('prop1');

    // remove the property
    relationship.removeProperty('propKey');
    expect(Object.values(relationship.properties).length).toBe(0);

    var changedItems = graphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);
    expect(relationship.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(relationship.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');
});

test('test getConnectedNodes', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var nodeA = graphData.getNodeByKey('A');
    var nodeB = graphData.getNodeByKey('B');

    var relationships = graphData.getConnectedRelationships(nodeA);
    expect(relationships.length).toBe(1);
    expect(relationships[0].type).toBe('TO');

    var nodeAConnections = graphData.getConnectedNodes(nodeA);
    expect(nodeAConnections.length).toBe(1);
    expect(nodeAConnections[0]).toBe(nodeB);
});

test('serialize/deserialize graphData to JSON and back', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);

    var serializedGraphData = serializeObject(graphData);
    var json = JSON.stringify(serializedGraphData);
    //console.log('serializedGraphData: ', serializedGraphData);

    var deserializedGraphData = deserializeObject(JSON.parse(json));
    var nodeA = deserializedGraphData.getNodeByKey('A');
    var nodeB = deserializedGraphData.getNodeByKey('B');

    var relationships = deserializedGraphData.getConnectedRelationships(nodeA);
    expect(relationships.length).toBe(1);
    expect(relationships[0].type).toBe('TO');

    var nodeAConnections = deserializedGraphData.getConnectedNodes(nodeA);
    expect(nodeAConnections.length).toBe(1);
    expect(nodeAConnections[0]).toBe(nodeB);
});

test('add a Node property after simulated save, then serialize/deserialize - check to see if it is in getChangedItems()', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');

    testNode.addOrUpdateProperty ('propKey', 'prop1', 'String');
    // simulated save
    resetDataChangeFlags(graphData);
    testNode.addOrUpdateProperty ('propKey2', 'prop2', 'String');

    var serializedGraphData = serializeObject(graphData);
    var json = JSON.stringify(serializedGraphData);

    var deserializedGraphData = deserializeObject(JSON.parse(json));
    testNode = deserializedGraphData.getNodeByKey('Test');

    // 3 because of the additional 'key' property
    expect(Object.values(testNode.properties).length).toBe(3);
    var property = Object.values(testNode.properties)[2];
    expect(property.value).toBe('prop2');
    expect(property.datatype).toBe('String');

    var changedItems = deserializedGraphData.getChangedItems();
    expect(changedItems.changedNodes.length).toBe(1);
    expect(changedItems.changedNodes[0]).toBe(testNode);

    var changedProperties = testNode.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].value).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
});

test('add a Relationship property after simulated save - then serialize/deserialize', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);
    var relationships = graphData.getRelationshipArray();
    var relationship = relationships[0];

    relationship.addOrUpdateProperty ('propKey', 'prop1', 'String', 'abc');
    resetDataChangeFlags(graphData);
    relationship.addOrUpdateProperty ('propKey2', 'prop2', 'String', 'def');

    var serializedGraphData = serializeObject(graphData);
    var json = JSON.stringify(serializedGraphData);

    var deserializedGraphData = deserializeObject(JSON.parse(json));
    relationships = deserializedGraphData.getRelationshipArray();
    relationship = relationships[0];

    expect(Object.values(relationship.properties).length).toBe(2);
    var property = Object.values(relationship.properties)[1];
    expect(property.value).toBe('prop2');
    expect(property.datatype).toBe('String');

    var changedItems = deserializedGraphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);

    changedItems = deserializedGraphData.getChangedItems();
    expect(changedItems.changedRelationships.length).toBe(1);
    expect(changedItems.changedRelationships[0]).toBe(relationship);

    var changedProperties = relationship.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].value).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
});

test('remove a Node - then serialize/deserialize', () => {
    var graphData = getGraphDataWithNodes(['Test']);
    var testNode = graphData.getNodeByKey('Test');
    var nodeKey = {
        isRootNode: false,
        label: null,
        properties: [{key: 'key', value: testNode.key, datatype: 'String'}]
    }
    graphData.removeNode(testNode);

    var nodeArray = graphData.getNodeArray();
    expect(nodeArray.length).toBe(0);

    var serializedGraphData = serializeObject(graphData);
    var json = JSON.stringify(serializedGraphData);

    var deserializedGraphData = deserializeObject(JSON.parse(json));

    var deletedItems = deserializedGraphData.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(0);
    nodeKey.rootNodeKey = deletedItems.deletedNodeKeys[0].rootNodeKey;
    expect(deletedItems.deletedNodeKeys[0]).toStrictEqual(nodeKey);
});


test('remove a Relationship - then serialize/deserialize', () => {
    var graphData = getGraphDataWithRelationships([{startNode: 'A', type: 'TO', endNode: 'B'}]);

    var relationships = graphData.getRelationshipArray();
    var relationshipInternalKey = relationships[0].key;

    var relationshipKey = {
        startNodeKey: {
            isRootNode: false,
            label: null,
            properties: [{key: 'key', value: 'A', datatype: 'String'}],
        },
        endNodeKey: {
            isRootNode: false,
            label: null,
            properties: [{key: 'key', value: 'B', datatype: 'String'}]
        },
        type: 'TO'
    }

    // remove and confirm it's removed
    graphData.removeRelationshipByKey(relationshipInternalKey);
    relationships = graphData.getRelationshipArray();
    expect(relationships.length).toBe(0);

    var serializedGraphData = serializeObject(graphData);
    var json = JSON.stringify(serializedGraphData);

    var deserializedGraphData = deserializeObject(JSON.parse(json));

    // check if in deleted items
    var deletedItems = deserializedGraphData.getDeletedItems();
    expect(deletedItems.deletedNodeKeys.length).toBe(0);
    expect(deletedItems.deletedRelationshipKeys.length).toBe(1);
    relationshipKey.startNodeKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    relationshipKey.endNodeKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    relationshipKey.rootNodeKey = deletedItems.deletedRelationshipKeys[0].rootNodeKey;
    expect(deletedItems.deletedRelationshipKeys[0]).toStrictEqual(relationshipKey);
});
