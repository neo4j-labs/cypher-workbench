
import DataModel from './dataModel';
import { diffDataModels } from './dataModelDiff';

function getDataModelWithNodeLabels (nodeLabelStrings) {
    var dataModel = DataModel();
    nodeLabelStrings.map(str => {
        var nodeLabel = new dataModel.NodeLabel({
            label: str
        });
        dataModel.addNodeLabel(nodeLabel);
    })
    return dataModel;
}

function getDataModelWithNodeLabelsWithProperties (nodeLabelDefs) {
    // add stuff like 
    /*  [{
            label: 'Person',
            props: ['name', 'dob']
        }]
    }      
    */
    var dataModel = DataModel();
    nodeLabelDefs.map(def => {
        var nodeLabel = new dataModel.NodeLabel({
            label: def.label
        });

        def.props.map(prop => {
            var propertyMap = { key: prop, name: prop, datatype: 'String' }
            nodeLabel.addProperty (propertyMap, { isPartOfKey: false });    
        });

        dataModel.addNodeLabel(nodeLabel);
    })
    return dataModel;
}

function getDataModelWithRelationshipTypes (relationshipTypeArray) {
    var dataModel = DataModel();
    relationshipTypeArray.map(entry => {
        var startNodeLabel = new dataModel.NodeLabel({
            label: entry.startNodeLabel
        });
        var endNodeLabel = new dataModel.NodeLabel({
            label: entry.endNodeLabel
        });
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

        if (entry.props) {
            entry.props.map(prop => {
                var propertyMap = { key: prop, name: prop, datatype: 'String' }
                relationshipType.addProperty (propertyMap);    
            });
        }
    })
    return dataModel;
}

test('test diff data model - models are the same', () => {
    var dataModelA = getDataModelWithNodeLabels(['Person', 'Place']);
    var dataModelB = getDataModelWithNodeLabels(['Person', 'Place']);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(false);
});

test('test diff data model - A model has extra node label', () => {
    var dataModelA = getDataModelWithNodeLabels(['Person', 'Place', 'Company']);
    var dataModelB = getDataModelWithNodeLabels(['Person', 'Place']);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.nodeLabelDiff.inAnotB[0].label).toBe('Company');
});

test('test diff data model - B model has extra node label', () => {
    var dataModelA = getDataModelWithNodeLabels(['Person', 'Place']);
    var dataModelB = getDataModelWithNodeLabels(['Person', 'Place', 'Company']);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.nodeLabelDiff.inBnotA[0].label).toBe('Company');
});

test('test diff data model - both have extra node labels', () => {
    var dataModelA = getDataModelWithNodeLabels(['Person', 'Place', 'Industry']);
    var dataModelB = getDataModelWithNodeLabels(['Person', 'Place', 'Company']);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.nodeLabelDiff.inAnotB[0].label).toBe('Industry');
    expect(diff.nodeLabelDiff.inBnotA[0].label).toBe('Company');
});

test('test diff data model - same relationship types', () => {
    var dataModelA = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    var dataModelB = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(false);
});

test('test diff data model - A model has extra rel type', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'FROM', endNodeLabel: 'C'}        
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([{startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'}]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.relationshipTypeDiff.inAnotB[0].type).toBe('FROM');    
});

test('test diff data model - B model has extra rel type', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'FROM', endNodeLabel: 'C'}        
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.relationshipTypeDiff.inBnotA[0].type).toBe('FROM');    
});

test('test diff data model - both models have extra rel types', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'REL', endNodeLabel: 'D'},
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
        {startNodeLabel: 'A', type: 'FROM', endNodeLabel: 'C'}        
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.relationshipTypeDiff.inAnotB[0].type).toBe('REL');    
    expect(diff.relationshipTypeDiff.inBnotA[0].type).toBe('FROM');    
});

test('test diff data model - same rel name different end point', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B'},
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'C'},
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.relationshipTypeDiff.inBnotA[0].type).toBe('TO');    
    expect(diff.relationshipTypeDiff.inBnotA[0].endNodeLabel.label).toBe('C');    
});

test('test diff data model - same node label w/properties', () => {
    
    var dataModelA = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob'] }
    ]);
    var dataModelB = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob'] }
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(false);
});

test('test diff data model - same node label w/ different properties', () => {
    
    var dataModelA = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob', 'foo'] }
    ]);
    var dataModelB = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob'] }
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.nodeLabelDiff.BdiffA.length).toBe(1);
    var nodeDiff = diff.nodeLabelDiff.BdiffA[0];
    var propertyDiff = nodeDiff.propertyDiff;
    expect(propertyDiff).not.toBe(null);

    //console.log(propertyDiff.inAnotB);
    expect(propertyDiff.inAnotB.length).toBe(1);
    expect(propertyDiff.inAnotB[0].name).toBe('foo');
});

test('test diff data model - same node label w/ different properties (2)', () => {
    
    var dataModelA = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob'] }
    ]);
    var dataModelB = getDataModelWithNodeLabelsWithProperties([
        { label: 'Person', props: ['name', 'dob', 'foo'] }
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);
    expect(diff.nodeLabelDiff.BdiffA.length).toBe(1);
    var nodeDiff = diff.nodeLabelDiff.BdiffA[0];
    var propertyDiff = nodeDiff.propertyDiff;
    expect(propertyDiff).not.toBe(null);

    //console.log(propertyDiff.inAnotB);
    expect(propertyDiff.inBnotA.length).toBe(1);
    expect(propertyDiff.inBnotA[0].name).toBe('foo');
});

test('test diff data model - same rel type w/ properties', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob']}
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob']}
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(false);
});

test('test diff data model - same rel type w/ different properties', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob', 'foo']}
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob']}
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);

    expect(diff.relationshipTypeDiff.BdiffA.length).toBe(1);
    var relDiff = diff.relationshipTypeDiff.BdiffA[0];
    var propertyDiff = relDiff.propertyDiff;
    expect(propertyDiff).not.toBe(null);

    expect(propertyDiff.inAnotB.length).toBe(1);
    expect(propertyDiff.inAnotB[0].name).toBe('foo');
});

test('test diff data model - same rel type w/ different properties (2)', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob']}
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'TO', endNodeLabel: 'B', props: ['name', 'dob', 'foo']}
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB)
    expect(diff.anyDifference()).toBe(true);

    expect(diff.relationshipTypeDiff.BdiffA.length).toBe(1);
    var relDiff = diff.relationshipTypeDiff.BdiffA[0];
    var propertyDiff = relDiff.propertyDiff;
    expect(propertyDiff).not.toBe(null);

    expect(propertyDiff.inBnotA.length).toBe(1);
    expect(propertyDiff.inBnotA[0].name).toBe('foo');
});

test('dont remove anons', () => {
    var dataModelA = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'FOO', endNodeLabel: 'B'}
    ]);
    var dataModelB = getDataModelWithRelationshipTypes([
        {startNodeLabel: 'A', type: 'ANON', endNodeLabel: 'B'}
    ]);
    
    var diff = diffDataModels(dataModelA, dataModelB, { removeAnons: false });
    expect(diff.anyDifference()).toBe(true);

    expect(diff.relationshipTypeDiff.BdiffA.length).toBe(0);

    expect(diff.relationshipTypeDiff.inAnotB.length).toBe(1);
    expect(diff.relationshipTypeDiff.inAnotB[0].type).toBe('FOO');    

    expect(diff.relationshipTypeDiff.inBnotA.length).toBe(1);
    expect(diff.relationshipTypeDiff.inBnotA[0].type).toBe('ANON');    
});

