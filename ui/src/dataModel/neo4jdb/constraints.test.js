
import { 
    parseConstraintDescription,
    parseConstraintDetails,
    parseSchema 
} from './constraints';
import { ConstraintTypes } from './constraintIndexTypes';

test('parse constraints description - rel prop exists', () => {
    var constraint = "CONSTRAINT ON ()-[ has_menu_item:HAS_MENU_ITEM ]-() ASSERT exists(has_menu_item.foo)";
    var dataModel = parseConstraintDescription(constraint);

    const rels = dataModel.getRelationshipTypeArray();

    expect(rels.length).toBe(1);
    const rel = rels[0];
    expect(rel.type).toBe('HAS_MENU_ITEM');
    expect(rel.startNodeLabel.label).toBe('');
    expect(rel.endNodeLabel.label).toBe('');

    expect(Object.values(rel.properties).length).toBe(1);
    const prop = Object.values(rel.properties)[0];
    expect(prop.name).toBe('foo');
    expect(prop.datatype).toBe('String');
    expect(prop.isPartOfKey).toBe(false);
    expect(prop.mustExist).toBe(true);        
});

test('parse constraints description - node prop exists', () => {
    var constraint = "CONSTRAINT ON ( menu:Menu ) ASSERT exists(menu.description)";
    var dataModel = parseConstraintDescription(constraint);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Menu');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('description');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(false);
    expect(prop1.mustExist).toBe(true);    
});

test('parse constraints description - unique', () => {
    var constraint = "CONSTRAINT ON ( _bloom_perspective_:_Bloom_Perspective_ ) ASSERT _bloom_perspective_.id IS UNIQUE";
    var dataModel = parseConstraintDescription(constraint);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('_Bloom_Perspective_');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('id');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(false);
    expect(prop1.hasUniqueConstraint).toBe(true);    
});

test('parse constraints description - unique 2', () => {
    var constraint = "CONSTRAINT ON ( propertydefinition:PropertyDefinition ) ASSERT (propertydefinition.key) IS UNIQUE";
    var dataModel = parseConstraintDescription(constraint);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('PropertyDefinition');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('key');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(false);
    expect(prop1.hasUniqueConstraint).toBe(true);    
});

test('parse constraints description - node key', () => {
    var constraint = "CONSTRAINT ON ( menu:Menu ) ASSERT (menu.item, menu.itemNumber) IS NODE KEY";
    var dataModel = parseConstraintDescription(constraint);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Menu');

    expect(Object.values(node.properties).length).toBe(2);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('item');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(true);

    const prop2 = Object.values(node.properties)[1];
    expect(prop2.name).toBe('itemNumber');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isPartOfKey).toBe(true);    
});

test('parse constraints description - node key 2', () => {
    var constraint = "CONSTRAINT ON ( foo bar:Foo Bar ) ASSERT (foo bar.baz qux, foo bar.qoph fiz) IS NODE KEY";
    var dataModel = parseConstraintDescription(constraint);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Foo Bar');

    expect(Object.values(node.properties).length).toBe(2);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('baz qux');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(true);

    const prop2 = Object.values(node.properties)[1];
    expect(prop2.name).toBe('qoph fiz');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isPartOfKey).toBe(true);

});

// NOTE: I was going to primarily use this until I found it earlier versions of Neo4j did not provide a details output
test('parse constraints details', () => {

    const constraints = [
        "Constraint( id=52, name='constraint_edc959a0', type='RELATIONSHIP PROPERTY EXISTENCE', schema=-[:HAS_MENU_ITEM {foo}]- )",
        "Constraint( id=47, name='constraint_fa46c9b7', type='NODE PROPERTY EXISTENCE', schema=(:Pizza {cheese}) )",
        "Constraint( id=66, name='nodekey_menu', type='NODE KEY', schema=(:Menu {itemNumber, item}), ownedIndex=65 )",
        "Constraint( id=63, name='nodekey_person', type='NODE KEY', schema=(:Person {id}), ownedIndex=62 )",
        "Constraint( id=2, name='constraint_f7ecef6a', type='UNIQUENESS', schema=(:DataModel {key}), ownedIndex=1 )"
    ];

    const parsed = constraints.map(x => parseConstraintDetails(x));
    expect(parsed[0]).toStrictEqual({id: 52, name:'constraint_edc959a0', type: ConstraintTypes.RelationshipPropertyExistence, schema: '-[:HAS_MENU_ITEM {foo}]-'})
    expect(parsed[1]).toStrictEqual({id: 47, name:'constraint_fa46c9b7', type: ConstraintTypes.NodePropertyExistence, schema: '(:Pizza {cheese})'})
    expect(parsed[2]).toStrictEqual({id: 66, name:'nodekey_menu', type: ConstraintTypes.NodeKey, schema: '(:Menu {itemNumber, item})'})
    expect(parsed[3]).toStrictEqual({id: 63, name:'nodekey_person', type: ConstraintTypes.NodeKey, schema: '(:Person {id})'})
    expect(parsed[4]).toStrictEqual({id: 2, name:'constraint_f7ecef6a', type: ConstraintTypes.Uniqueness, schema: '(:DataModel {key})'})

});

test('parse schema -[:HAS_MENU_ITEM {foo}]-', () => {
    const dataModel = parseSchema('-[:HAS_MENU_ITEM {foo}]-', ConstraintTypes.RelationshipPropertyExistence);
    const rels = dataModel.getRelationshipTypeArray();

    expect(rels.length).toBe(1);
    const rel = rels[0];
    expect(rel.type).toBe('HAS_MENU_ITEM');
    expect(rel.startNodeLabel.label).toBe('');
    expect(rel.endNodeLabel.label).toBe('');

    expect(Object.values(rel.properties).length).toBe(1);
    const prop = Object.values(rel.properties)[0];
    expect(prop.name).toBe('foo');
    expect(prop.datatype).toBe('String');
    expect(prop.isPartOfKey).toBe(false);
    expect(prop.mustExist).toBe(true);    
});

test('parse schema (:Menu {itemNumber, item})', () => {
    const dataModel = parseSchema('(:Menu {itemNumber, item})', ConstraintTypes.NodeKey);
    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Menu');

    expect(Object.values(node.properties).length).toBe(2);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('itemNumber');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(true);

    const prop2 = Object.values(node.properties)[1];
    expect(prop2.name).toBe('item');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isPartOfKey).toBe(true);
});

test('parse schema (:DataModel {key})', () => {
    const dataModel = parseSchema('(:DataModel {key})', ConstraintTypes.Uniqueness);
    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('DataModel');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('key');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isPartOfKey).toBe(false);
    expect(prop1.hasUniqueConstraint).toBe(true);
});