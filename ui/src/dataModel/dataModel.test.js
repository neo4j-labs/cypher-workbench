
import DataModel from './dataModel';

test('make new data model', () => {
    var dataModel = DataModel();
    expect(dataModel).not.toBeNull();
});

function resetDataChangeFlags (dataModel) {
    var timestamp = new Date().getTime();
    // the logic right now is that is only clears things < timestamp, so we need to ensure we add 1 millisecond so things will clear
    dataModel.resetDataChangeFlags({
        timestamp: timestamp+1
    });
}

function getDataModelWithNodeLabels (nodeLabelStrings) {
    var dataModel = DataModel();
    nodeLabelStrings.map(str => {
        var nodeLabel = new dataModel.NodeLabel({
            label: str
        });
        dataModel.addNodeLabel(nodeLabel);
    })
    resetDataChangeFlags(dataModel);
    return dataModel;
}

function getDataModelWithRelationshipTypes (relationshipTypeArray) {
    var dataModel = DataModel();
    relationshipTypeArray.map(entry => {
        var startNodeLabel = dataModel.getNodeLabelByLabel(entry.startNodeLabel);
        if (!startNodeLabel) {
            startNodeLabel = new dataModel.NodeLabel({
                label: entry.startNodeLabel
            });
        }
        var endNodeLabel = dataModel.getNodeLabelByLabel(entry.endNodeLabel);
        if (!endNodeLabel) {
            endNodeLabel = new dataModel.NodeLabel({
                label: entry.endNodeLabel
            });
        }
        var properties = {
            type: entry.type,
            startNodeLabel: startNodeLabel,
            endNodeLabel: endNodeLabel,
            description: `${startNodeLabel.label}-${entry.type}->${endNodeLabel.label}`
        }
        var relationshipType = new dataModel.RelationshipType(properties);
        dataModel.addNodeLabel(startNodeLabel);
        dataModel.addNodeLabel(endNodeLabel);
        dataModel.addRelationshipType(relationshipType);
    })
    resetDataChangeFlags(dataModel);
    return dataModel;
}

test('add a NodeLabel', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel).not.toBeNull();
    expect(nodeLabel.label).toBe('Test');
});

test('isInstanceModel', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    expect(dataModel.isInstanceModel()).toBe(false);

    dataModel = getDataModelWithNodeLabels(['Test', 'Test']);
    expect(dataModel.isInstanceModel()).toBe(true);
});

test('add another NodeLabel', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var another = new dataModel.NodeLabel({
        label: 'Another',
        description: 'Another node label'
    });
    dataModel.addNodeLabel(another);

    // confirm that new node label is there
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel = dataModel.getNodeLabelByLabel('Another');
    expect(nodeLabel.label).toBe('Another');
    expect(nodeLabel.description).toBe('Another node label');

    // confirm that we get data change
    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedRelationshipTypes.length).toBe(0);
    expect(changedItems.changedNodeLabels[0]).toBe(another);
});

test('change a NodeLabel', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel).not.toBeNull();

    nodeLabel.update({ label: 'Updated', description: 'Updated node label' });
    expect(nodeLabel.label).toBe('Updated');
    expect(nodeLabel.description).toBe('Updated node label');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedRelationshipTypes.length).toBe(0);

    expect(changedItems.changedNodeLabels[0]).toBe(nodeLabel);
});

test('remove a NodeLabel', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');
    var nodeLabelKey = testNodeLabel.key;
    dataModel.removeNodeLabel(testNodeLabel);

    var nodeLabelMap = dataModel.getNodeLabelMap();
    expect(Object.values(nodeLabelMap).length).toBe(0);

    var deletedItems = dataModel.getDeletedItems();
    expect(deletedItems.deletedNodeLabelKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipTypeKeys.length).toBe(0);
    expect(deletedItems.deletedNodeLabelKeys[0]).toBe(nodeLabelKey);
});

test('add a Node Label property', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(0);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc',
        description: 'this is property 1'
    }
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.name).toBe('prop1');
    expect(property.datatype).toBe('String');
    expect(property.referenceData).toBe('abc');
    expect(property.description).toBe('this is property 1');
    expect(property.isPartOfKey).not.toBe(true);

    changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);
});

test('update a Node Label property', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc',
        description: 'desc1'
    }    
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    testNodeLabel.resetDataChangeFlags();

    propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'Integer', 
        referenceData: 123,
        description: 'desc2'
    }    
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: true });

    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.name).toBe('prop1');
    expect(property.datatype).toBe('Integer');
    expect(property.referenceData).toBe('123');
    expect(property.description).toBe('desc2');
    expect(property.isPartOfKey).toBe(true);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);

    var changedProperties = testNodeLabel.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].datatype).toBe('Integer');
    expect(changedProperties[0].referenceData).toBe('123');
});

test('update a Node Label property by key lookup', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var propertyMap = {
        key: null, 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    testNodeLabel.resetDataChangeFlags();

    var matchingProperty = testNodeLabel.getPropertyByName('prop1');
    var key = (matchingProperty && matchingProperty.key) ? matchingProperty.key : null;

    propertyMap = {
        key: key, 
        name: 'prop1', 
        datatype: 'Integer', 
        referenceData: 123
    }
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: true });

    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.name).toBe('prop1');
    expect(property.datatype).toBe('Integer');
    expect(property.referenceData).toBe('123');
    expect(property.isPartOfKey).toBe(true);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);

    var changedProperties = testNodeLabel.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].datatype).toBe('Integer');
    expect(changedProperties[0].referenceData).toBe('123');
});

test('add a Node Label property after simulated save - check to see if it is in getChangedItems()', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }  
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    // simulated save
    resetDataChangeFlags(dataModel);

    propertyMap = {
        key: 'propKey2', 
        name: 'prop2', 
        datatype: 'String', 
        referenceData: 'def'
    }      
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: true });

    expect(Object.values(testNodeLabel.properties).length).toBe(2);
    var property = Object.values(testNodeLabel.properties)[1];
    expect(property.name).toBe('prop2');
    expect(property.datatype).toBe('String');
    expect(property.referenceData).toBe('def');
    expect(property.isPartOfKey).toBe(true);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);

    var changedProperties = testNodeLabel.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].name).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
    expect(changedProperties[0].referenceData).toBe('def');
});

test('remove a Node Label property', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    // add the property and confirm it's there
    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    testNodeLabel.resetDataChangeFlags();
    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.name).toBe('prop1');

    // remove the property
    testNodeLabel.removeProperty('propKey');
    expect(Object.values(testNodeLabel.properties).length).toBe(0);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);
    expect(testNodeLabel.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(testNodeLabel.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');
});

test('add a RelationshipType', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('TO');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('A');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('B');
    expect(relationshipTypes[0].description).toBe(`A-TO->B`)
});

test('update a RelationshipType', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    relationshipType.update({ type: 'FROM', description: 'Updated to FROM' });
    expect(relationshipType.type).toBe('FROM');
    expect(relationshipType.description).toBe('Updated to FROM');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(0);
    expect(changedItems.changedRelationshipTypes.length).toBe(1);

    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);
});

test('remove a RelationshipType', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];
    var relationshipTypeKey = relationshipType.key;

    // remove and confirm it's removed
    dataModel.removeRelationshipTypeByKey(relationshipTypeKey);
    relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(0);

    // check if in deleted items
    var deletedItems = dataModel.getDeletedItems();
    expect(deletedItems.deletedNodeLabelKeys.length).toBe(0);
    expect(deletedItems.deletedRelationshipTypeKeys.length).toBe(1);
    expect(deletedItems.deletedRelationshipTypeKeys[0]).toBe(relationshipTypeKey);
});

test('add a Relationship Type property', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(0);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);
    expect(Object.values(relationshipType.properties).length).toBe(1);
    var property = Object.values(relationshipType.properties)[0];
    expect(property.name).toBe('prop1');
    expect(property.datatype).toBe('String');
    expect(property.referenceData).toBe('abc');

    changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);
});

test('add a Relationship Type property after simulated save', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);
    resetDataChangeFlags(dataModel);

    propertyMap = {
        key: 'propKey2', 
        name: 'prop2', 
        datatype: 'String', 
        referenceData: 'def'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);

    expect(Object.values(relationshipType.properties).length).toBe(2);
    var property = Object.values(relationshipType.properties)[1];
    expect(property.name).toBe('prop2');
    expect(property.datatype).toBe('String');
    expect(property.referenceData).toBe('def');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);

    changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);

    var changedProperties = relationshipType.getChangedProperties();
    expect(changedProperties.length).toBe(1);
    expect(changedProperties[0].name).toBe('prop2');
    expect(changedProperties[0].datatype).toBe('String');
    expect(changedProperties[0].referenceData).toBe('def');
});

test('update a Relationship Type property', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);
    relationshipType.resetDataChangeFlags();

    propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'Integer', 
        referenceData: 123
    }      
    relationshipType.addOrUpdateProperty (propertyMap);

    expect(Object.values(relationshipType.properties).length).toBe(1);
    var property = Object.values(relationshipType.properties)[0];
    expect(property.name).toBe('prop1');
    expect(property.datatype).toBe('Integer');
    expect(property.referenceData).toBe('123');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);
});

test('remove a Relationship Type property', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    // add the property and confirm it's there
    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);
    relationshipType.resetDataChangeFlags();
    expect(Object.values(relationshipType.properties).length).toBe(1);
    var property = Object.values(relationshipType.properties)[0];
    expect(property.name).toBe('prop1');

    // remove the property
    relationshipType.removeProperty('propKey');
    expect(Object.values(relationshipType.properties).length).toBe(0);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);
    expect(relationshipType.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(relationshipType.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');
});

test('test getConnectedNodeLabels', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var nodeLabelA = dataModel.getNodeLabelByLabel('A');
    var nodeLabelB = dataModel.getNodeLabelByLabel('B');

    var relationshipTypes = dataModel.getConnectedRelationshipTypes(nodeLabelA);
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('TO');

    var nodeLabelAConnections = dataModel.getConnectedNodeLabels(nodeLabelA);
    expect(nodeLabelAConnections.length).toBe(1);
    expect(nodeLabelAConnections[0]).toBe(nodeLabelB);
});

test('test getConstraintStatements', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var propertyMap = {
        key: null, 
        name: 'prop1', 
        datatype: 'Integer', 
        referenceData: 123
    }  
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: true });
    //console.log("dataModel.getConstraintStatements(): ", dataModel.getConstraintStatements());

    var match = dataModel.getConstraintStatements().match(/CREATE CONSTRAINT IF NOT EXISTS FOR \(n\:Test\) REQUIRE \(n\.prop1\) IS NODE KEY/)
    expect(match).not.toBeNull();
});

test('test getPrimaryNodeLabelAndEnsureSecondaryNodeLabels', () => {
    var dataModel = getDataModelWithNodeLabels(['Cow']);
    var cow = dataModel.getPrimaryNodeLabelAndEnsureSecondaryNodeLabels('Cow:Mammal:Animal', dataModel);
    var mammal = dataModel.getNodeLabelByLabel('Mammal');
    var animal = dataModel.getNodeLabelByLabel('Animal');

    expect(cow.secondaryNodeLabelKeys.includes(mammal.key)).toBe(true);
    expect(cow.secondaryNodeLabelKeys.includes(animal.key)).toBe(true);
    expect(cow.isOnlySecondaryNodeLabel).toBe(false);

    expect(mammal.secondaryNodeLabelKeys.length).toBe(0);
    expect(mammal.isOnlySecondaryNodeLabel).toBe(true);

    expect(animal.secondaryNodeLabelKeys.length).toBe(0);
    expect(animal.isOnlySecondaryNodeLabel).toBe(true);
});

test('test createPrimaryNodeLabelWithSecondaryNodeLabels', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Mammal:Animal', dataModel);
    dataModel.addNodeLabel(cow);
    var mammal = dataModel.getNodeLabelByLabel('Mammal');
    var animal = dataModel.getNodeLabelByLabel('Animal');

    expect(cow.secondaryNodeLabelKeys.includes(mammal.key)).toBe(true);
    expect(cow.secondaryNodeLabelKeys.includes(animal.key)).toBe(true);
    expect(cow.isOnlySecondaryNodeLabel).toBe(false);

    expect(mammal.secondaryNodeLabelKeys.length).toBe(0);
    expect(mammal.isOnlySecondaryNodeLabel).toBe(true);

    expect(animal.secondaryNodeLabelKeys.length).toBe(0);
    expect(animal.isOnlySecondaryNodeLabel).toBe(true);
});

test('remove node label with secondary node label', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Mammal:Animal', dataModel);
    dataModel.addNodeLabel(cow);

    expect(dataModel.getNodeLabelArray().length).toBe(3);

    dataModel.removeNodeLabelByKey(cow.key);

    expect(dataModel.getNodeLabelArray().length).toBe(0);
});

test('remove transposed multi-node label', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Horse', dataModel);
    dataModel.addNodeLabel(cow);
    var horse = dataModel.getPrimaryNodeLabelAndEnsureSecondaryNodeLabels('Horse:Cow', dataModel);
    dataModel.addNodeLabel(horse);

    expect(dataModel.getNodeLabelArray().length).toBe(2);

    dataModel.removeNodeLabelByKey(horse.key);

    expect(dataModel.getNodeLabelArray().length).toBe(2);

    horse = dataModel.getNodeLabelByKey(horse.key);
    expect(horse.secondaryNodeLabelKeys.length).toBe(0);
});

test('toSaveObject / fromSaveObject add a NodeLabel property', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(0);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc',
        description: 'this is property 1'
    }
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.dataChangedSinceLastSave).toBe(true);
    var now = new Date().getTime();
    var diff = Math.abs(property.dataChangeTimestamp - now);
    expect(diff).toBeLessThan(1000);

    var saveObject = dataModel.toSaveObject();
    //console.log(saveObject.nodeLabels.Node0.properties);
    var reloadedDataModel = DataModel();
    reloadedDataModel.fromSaveObject(saveObject, true);

    var testNodeLabel = reloadedDataModel.getNodeLabelByLabel('Test');
    property = Object.values(testNodeLabel.properties)[0];
    expect(property.dataChangedSinceLastSave).toBe(true);
    now = new Date().getTime();
    diff = Math.abs(property.dataChangeTimestamp - now);
    expect(diff).toBeLessThan(1000);

    var changedItems = reloadedDataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
});

test('toSaveObject / fromSaveObject remove a NodeLabel property', () => {

    var dataModel = getDataModelWithNodeLabels(['Test']);
    var testNodeLabel = dataModel.getNodeLabelByLabel('Test');

    // add the property and confirm it's there
    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    testNodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: false });
    testNodeLabel.resetDataChangeFlags();
    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property = Object.values(testNodeLabel.properties)[0];
    expect(property.name).toBe('prop1');

    // remove the property
    testNodeLabel.removeProperty('propKey');
    expect(Object.values(testNodeLabel.properties).length).toBe(0);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(changedItems.changedNodeLabels[0]).toBe(testNodeLabel);
    expect(testNodeLabel.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(testNodeLabel.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');

    var saveObject = dataModel.toSaveObject();
    //console.log(saveObject.nodeLabels.Node0.properties);
    var reloadedDataModel = DataModel();
    reloadedDataModel.fromSaveObject(saveObject, true); 

    var changedItems = reloadedDataModel.getChangedItems();
    expect(changedItems.changedNodeLabels.length).toBe(1);
    expect(testNodeLabel.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(testNodeLabel.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');

});

test('toSaveObject / fromSaveObject remove a Relationship Type property', () => {
    var dataModel = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType = relationshipTypes[0];

    // add the property and confirm it's there
    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType.addOrUpdateProperty (propertyMap);
    relationshipType.resetDataChangeFlags();
    expect(Object.values(relationshipType.properties).length).toBe(1);
    var property = Object.values(relationshipType.properties)[0];
    expect(property.name).toBe('prop1');

    // remove the property
    relationshipType.removeProperty('propKey');
    expect(Object.values(relationshipType.properties).length).toBe(0);

    var changedItems = dataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(changedItems.changedRelationshipTypes[0]).toBe(relationshipType);
    expect(relationshipType.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(relationshipType.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');

    var saveObject = dataModel.toSaveObject();
    var reloadedDataModel = DataModel();
    reloadedDataModel.fromSaveObject(saveObject, true); 

    var changedItems = reloadedDataModel.getChangedItems();
    expect(changedItems.changedRelationshipTypes.length).toBe(1);
    expect(relationshipType.removedPropertyKeysSinceLastSave.length).toBe(1);
    expect(relationshipType.getRemovedPropertyKeysSinceLastSave()[0]).toBe('propKey');

});

test ('test getOutboundNodeLabelStringRelationshipTypeStringMap', () => {
    var dataModel = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO_B', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'TO_C', endNodeLabel: 'C'},
        {startNodeLabel: 'B', type: 'TO_D', endNodeLabel: 'D'},
        {startNodeLabel: 'D', type: 'TO_E', endNodeLabel: 'E'},
        {startNodeLabel: 'C', type: 'TO_SELF', endNodeLabel: 'C'}
    ]);
    var nodeLabelRelTypeMap = dataModel.getOutboundNodeLabelStringRelationshipTypeStringMap();
    expect(nodeLabelRelTypeMap).toStrictEqual({
        "A": ["TO_B", "TO_C"],
        "B": ["TO_D"],
        "D": ["TO_E"],
        "C": ["TO_SELF"],
        "E": []
    })
});

test ('test getOutboundRelationshipsByNodeLabelAndRelationshipType', () => {
    var dataModel = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'C'},
        {startNodeLabel: 'B', type: 'TO', endNodeLabel: 'D'},
        {startNodeLabel: 'D', type: 'TO', endNodeLabel: 'E'},
        {startNodeLabel: 'C', type: 'TO', endNodeLabel: 'C'}
    ]);
    var rels = dataModel.getOutboundRelationshipsByNodeLabelAndRelationshipType('A','TO');
    expect(rels.length).toBe(2);
    expect(rels[0].endNodeLabel.label).toBe('B');
    expect(rels[1].endNodeLabel.label).toBe('C');

    rels = dataModel.getOutboundRelationshipsByNodeLabelAndRelationshipType('B','TO');
    expect(rels.length).toBe(1);
    expect(rels[0].endNodeLabel.label).toBe('D');

    rels = dataModel.getOutboundRelationshipsByNodeLabelAndRelationshipType('E','TO');
    expect(rels.length).toBe(0);

});

test('getAllSecondaryNodeLabelProperties', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Horse', dataModel);
    dataModel.addNodeLabel(cow);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    cow.addOrUpdateProperty(propertyMap);

    expect(dataModel.getNodeLabelArray().length).toBe(2);

    var horse = dataModel.getNodeLabelByLabel('Horse');
    expect(horse).not.toBeNull();

    var props = dataModel.getAllSecondaryNodeLabelProperties(horse);
    expect(props.length).toBe(1);
    expect(props[0].name).toBe('prop1');
});

test('getAllSecondaryNodeLabelProperties 2', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Horse', dataModel);
    dataModel.addNodeLabel(cow);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    cow.addOrUpdateProperty(propertyMap);

    expect(dataModel.getNodeLabelArray().length).toBe(2);

    var horse = dataModel.getNodeLabelByLabel('Horse');
    var propertyMap = {
        key: 'propKey2', 
        name: 'prop2', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    horse.addOrUpdateProperty(propertyMap);

    var props = dataModel.getAllSecondaryNodeLabelProperties(horse);
    expect(props.length).toBe(2);
    expect(props[0].name).toBe('prop2');
    expect(props[1].name).toBe('prop1');
});

test('getAllSecondaryNodeLabelProperties 3', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Horse:Mammal', dataModel);
    dataModel.addNodeLabel(cow);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    cow.addOrUpdateProperty(propertyMap);

    expect(dataModel.getNodeLabelArray().length).toBe(3);

    var horse = dataModel.getNodeLabelByLabel('Horse');
    var propertyMap = {
        key: 'propKey2', 
        name: 'prop2', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    horse.addOrUpdateProperty(propertyMap);

    var mammal = dataModel.getNodeLabelByLabel('Mammal');
    var props = dataModel.getAllSecondaryNodeLabelProperties(mammal);
    expect(props.length).toBe(1);
    expect(props[0].name).toBe('prop1');
});

test('getAllSecondaryNodeLabelProperties 4', () => {
    var dataModel = getDataModelWithNodeLabels([]);
    var cow = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Cow:Mammal', dataModel);
    var horse = dataModel.createPrimaryNodeLabelWithSecondaryNodeLabels('Horse:Mammal', dataModel);
    dataModel.addNodeLabel(cow);
    dataModel.addNodeLabel(horse);

    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    cow.addOrUpdateProperty(propertyMap);

    expect(dataModel.getNodeLabelArray().length).toBe(3);

    var propertyMap = {
        key: 'propKey2', 
        name: 'prop2', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    horse.addOrUpdateProperty(propertyMap);

    var mammal = dataModel.getNodeLabelByLabel('Mammal');
    var props = dataModel.getAllSecondaryNodeLabelProperties(mammal);
    expect(props.length).toBe(2);
    expect(props[0].name).toBe('prop1');
    expect(props[1].name).toBe('prop2');
});

test('llm generated string', () => {
    var dataModel = getDataModelWithNodeLabels(['Farm']);
    var dataModel = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'Cow', type: 'LIVES_ON', endNodeLabel: 'Farm'},
        {startNodeLabel: 'Horse', type: 'LIVES_ON', endNodeLabel: 'Farm'},
        {startNodeLabel: 'Mammal', type: 'EATS', endNodeLabel: 'Food'}
    ]);
    var cow = dataModel.getNodeLabelByLabel('Cow');
    var horse = dataModel.getNodeLabelByLabel('Horse');
    var food = dataModel.getNodeLabelByLabel('Food');
    var mammal = dataModel.getNodeLabelByLabel('Mammal');
    dataModel.addSecondaryNodeLabel(cow, mammal);
    dataModel.addSecondaryNodeLabel(horse, mammal);

    var propertyMap1 = {
        key: 'propKey1', 
        name: 'wears', 
        datatype: 'String', 
        referenceData: 'bell'
    }     

    var propertyMap2 = {
        key: 'propKey2', 
        name: 'name', 
        datatype: 'String', 
        referenceData: 'name'
    }     
    cow.addOrUpdateProperty(propertyMap1);
    cow.addOrUpdateProperty(propertyMap2);
    horse.addOrUpdateProperty(propertyMap1);
    horse.addOrUpdateProperty(propertyMap2);
    food.addOrUpdateProperty(propertyMap2);

    var mammalRels = dataModel.getOutboundRelationshipsByNodeLabelAndRelationshipType('Mammal','EATS');
    var eats = mammalRels[0];

    var relPropertyMap = {
        key: 'relPropKey', 
        name: 'quantity', 
        datatype: 'Integer', 
        referenceData: 'a lot'
    }      
    eats.addOrUpdateProperty(relPropertyMap);

    var llmString = dataModel.toLLMModelText(dataModel);
    //console.log(llmString);
    //expect(true).toBe(true);
    
    let llmLines = llmString.split('\n').map(x => x.trim());
    expect(llmLines).toContain("(:Cow:Mammal): [wears:'String',name:'String']");
    expect(llmLines).toContain("(:Farm):");
    expect(llmLines).toContain("(:Horse:Mammal): [wears:'String',name:'String']");
    expect(llmLines).toContain("(:Mammal):");
    expect(llmLines).toContain("(:Food): [name:'String']");
    expect(llmLines).toContain("(:Cow:Mammal)-[:LIVES_ON]->(:Farm)");
    expect(llmLines).toContain("(:Horse:Mammal)-[:LIVES_ON]->(:Farm)");
    expect(llmLines).toContain("(:Mammal)-[:EATS {quantity:'Integer'}]->(:Food)");
});


test('matchesPropertyDefinition', () => {
    var dataModel = DataModel();
    
    var props = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'Integer', 
        referenceData: 123,
        description: 'desc2',
        isPartOfKey: false
    }    

    var props3 = {
        key: 'propKey', 
        name: 'prop3', 
        datatype: 'Integer', 
        referenceData: 123,
        description: 'desc2',
        isPartOfKey: false
    }

    var prop1 = new dataModel.PropertyDefinition(props);
    var prop2 = new dataModel.PropertyDefinition(props);
    var prop3 = new dataModel.PropertyDefinition(props3);

    expect(prop1.matchesPropertyDefinition(prop2)).toBe(true);
    expect(prop1.matchesPropertyDefinition(prop3)).toBe(false);
});

test('typeAndPropsAndEndNodeLabelMatch', () => {
    var dataModel = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'C', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'C'},
        {startNodeLabel: 'D', type: 'TO', endNodeLabel: 'C'},                                        
    ]);
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var relationshipType1 = relationshipTypes[0];
    var relationshipType2 = relationshipTypes[1];
    var relationshipType3 = relationshipTypes[2];
    var relationshipType4 = relationshipTypes[3];

    // add the property and confirm it's there
    var propertyMap = {
        key: 'propKey', 
        name: 'prop1', 
        datatype: 'String', 
        referenceData: 'abc'
    }      
    relationshipType1.addOrUpdateProperty (propertyMap);
    relationshipType2.addOrUpdateProperty (propertyMap);

    expect(relationshipType1.typeAndPropsAndEndNodeLabelMatch(relationshipType2)).toBe(true);
    expect(relationshipType1.typeAndPropsAndEndNodeLabelMatch(relationshipType3)).toBe(false);

    relationshipType3.addOrUpdateProperty (propertyMap);
    expect(relationshipType3.typeAndPropsAndEndNodeLabelMatch(relationshipType4)).toBe(false);

    relationshipType4.addOrUpdateProperty (propertyMap);
    expect(relationshipType3.typeAndPropsAndEndNodeLabelMatch(relationshipType4)).toBe(true);
});