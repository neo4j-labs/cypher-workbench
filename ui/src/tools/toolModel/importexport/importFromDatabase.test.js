
import DataModel from '../../../dataModel/dataModel';
import { runSecondaryNodeLabelPostProcessing } from './importFromDatabase';

test('runSecondaryNodeLabelPostProcessing', () => {
    var dataModel = DataModel();

    var foo = new dataModel.NodeLabel({ label: 'Foo' });
    var bar = new dataModel.NodeLabel({ label: 'Bar' });
    var baz = new dataModel.NodeLabel({ label: 'Baz' });

    var fooDup = new dataModel.NodeLabel({ label: 'FooDup' });    

    dataModel.addNodeLabel(foo);
    dataModel.addNodeLabel(fooDup);
    dataModel.addNodeLabel(bar);
    dataModel.addNodeLabel(baz);

    foo.addProperty({ name: 'prop1' }, { isPartOfKey: true });    
    foo.addProperty({ name: 'prop2' });    

    fooDup.addProperty({ name: 'prop1' });    
    fooDup.addProperty({ name: 'prop2' });    

    bar.addProperty({ name: 'prop3' });    
    bar.addProperty({ name: 'prop4' });    

    baz.addProperty({ name: 'prop5' });    
    baz.addProperty({ name: 'prop6' });    

    var relationshipType = new dataModel.RelationshipType({
        type: 'FOO_BAR',
        startNodeLabel: foo,
        endNodeLabel: bar
    });
    dataModel.addRelationshipType(relationshipType);

    relationshipType = new dataModel.RelationshipType({
        type: 'FOO_BAZ',
        startNodeLabel: foo,
        endNodeLabel: baz
    });
    dataModel.addRelationshipType(relationshipType);

    relationshipType = new dataModel.RelationshipType({
        type: 'FOO_BAR',
        startNodeLabel: fooDup,
        endNodeLabel: bar
    });
    dataModel.addRelationshipType(relationshipType);

    relationshipType = new dataModel.RelationshipType({
        type: 'FOO_BAZ',
        startNodeLabel: fooDup,
        endNodeLabel: baz
    });
    dataModel.addRelationshipType(relationshipType);

    expect(dataModel.getNodeLabelArray().length).toBe(4);
    expect(dataModel.getRelationshipTypeArray().length).toBe(4);
    expect(fooDup.isOnlySecondaryNodeLabel).toBe(false);
    runSecondaryNodeLabelPostProcessing(dataModel);
    expect(fooDup.isOnlySecondaryNodeLabel).toBe(true);
    expect(dataModel.getRelationshipTypeArray().length).toBe(2);

})