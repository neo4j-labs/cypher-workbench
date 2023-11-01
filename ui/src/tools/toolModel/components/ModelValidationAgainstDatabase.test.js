
import {
    getConstraintMaps,
    findAndMatchNodeLabelKey,
    findConstraintsNotPresentInDatabase,
    validateNodeKey
} from './ModelValidationAgainstDatabase';
import DataModel from '../../../dataModel/dataModel';

function getNodeLabelWithProperties (def, dataModel) {
    if (!dataModel) {
        dataModel = DataModel();
    }
    var nodeLabel = new dataModel.NodeLabel({
        label: def.label
    });
    const boolKeys = ['isPartOfKey','mustExist', 'hasUniqueConstraint'];
    def.props.map(prop => {
        var propertyMap = { key: prop.name, name: prop.name }
        var boolFlags = {};
        Object.keys(prop)
            .filter(key => boolKeys.includes(key))
            .map(key => boolFlags[key] = prop[key]);

        nodeLabel.addProperty(propertyMap, boolFlags);    
    });
    return nodeLabel;
}

export function getDataModelWithNodeLabelsWithProperties (nodeLabelDefs) {
    // add stuff like 
    /*  [{
            label: 'Person',
            props: [
                {name: 'name', isPartOfKey: true},
                {name: 'dob', isPartOfKey: false}
            ]
        }]
    }      
    */
    var dataModel = DataModel();
    nodeLabelDefs.map(def => {
        var nodeLabel = getNodeLabelWithProperties(def, dataModel);
        dataModel.addNodeLabel(nodeLabel);
    })
    return dataModel;
}

export function getDataModelWithRelationshipTypes (relationshipTypeArray, dataModel) {
    if (!dataModel) {
        dataModel = DataModel();
    }

    const boolKeys = ['isPartOfKey','mustExist', 'hasUniqueConstraint'];
 
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

        if (entry.props) {
            entry.props.map(prop => {        
                var propertyMap = { key: prop.name, name: prop.name }
                var boolFlags = {};
                Object.keys(prop)
                    .filter(key => boolKeys.includes(key))
                    .map(key => boolFlags[key] = prop[key]);
        
                relationshipType.addProperty (propertyMap, boolFlags);    
            });
        }
    })
    return dataModel;
}


test("findAndMatchNodeLabelKey", () => {

    var nodeLabel = getNodeLabelWithProperties({
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    });

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);
    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }
    var properties = Object.values(nodeLabel.properties).filter(property => property.isPartOfKey);

    var result = findAndMatchNodeLabelKey(nodeLabel, nodeLabelConstraintsMap, properties);
    expect(result.foundIt).toBe(true);
    expect(result.badKey).toBeNull();
})

test("validateNodeKey", () => {

    var nodeLabel = getNodeLabelWithProperties({
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    });
    var nodeLabelProperties = Object.values(nodeLabel.properties);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);
    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }
    var result = validateNodeKey(nodeLabel, nodeLabelProperties, nodeLabelConstraintsMap);
    expect(result.length).toBe(0);
});

test("validate node key exists", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(0);
});

test("validate node key mismatch", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'fullName', isPartOfKey: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(1);
    expect(validations[0].validationMessage).toBe('Found mismatched Node Key. Expected (:Person {name}), got (:Person {fullName}).')
    expect(validations[0].nodeLabel).toBe(dataModel.getNodeLabelArray()[0]);
});

test("validate node key not present", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'name', isPartOfKey: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {}

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(1);
    expect(validations[0].validationMessage).toBe('Node Key (:Person {name}) is not in the database.')
    expect(validations[0].nodeLabel).toBe(dataModel.getNodeLabelArray()[0]);
});

test("validate multiple prop node key", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', isPartOfKey: true},
            {name: 'lastName', isPartOfKey: true}
        ]
    }]);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', isPartOfKey: true},
            {name: 'lastName', isPartOfKey: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(0);
});

test("validate node label prop must exist, 1 match, 1 fail", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', mustExist: true},
            {name: 'lastName', mustExist: true}
        ]
    }]);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', mustExist: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(1);
    expect(validations[0].validationMessage).toBe('Must Exist (:Person {lastName}) is not in the database.')
    expect(validations[0].nodeLabel).toBe(dataModel.getNodeLabelArray()[0]);
});

test("validate node label prop uniqueness, 1 match, 1 fail", () => {
    
    var dataModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', hasUniqueConstraint: true},
            {name: 'lastName', hasUniqueConstraint: true}
        ]
    }]);

    var sampleConstraintModel = getDataModelWithNodeLabelsWithProperties([{
        label: 'Person',
        props: [
            {name: 'firstName', hasUniqueConstraint: true}
        ]
    }]);

    var nodeLabelConstraintsMap = {
        Person: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        nodeLabelConstraintsMap, {}
    );

    //console.log(validations);
    expect(validations.length).toBe(1);
    expect(validations[0].validationMessage).toBe('Uniqueness Constraint (:Person {lastName}) is not in the database.')
    expect(validations[0].nodeLabel).toBe(dataModel.getNodeLabelArray()[0]);
});

test("validate relationship type prop must exist, 1 match, 1 fail", () => {
    
    var dataModel = getDataModelWithRelationshipTypes([
        {
            startNodeLabel: 'A', 
            type: 'TO', 
            endNodeLabel: 'B', 
            props: [
                {name: 'firstName', mustExist: true},
                {name: 'lastName', mustExist: true}
            ]
        } 
    ]);

    var sampleConstraintModel = getDataModelWithRelationshipTypes([{
        startNodeLabel: 'A', 
        type: 'TO', 
        endNodeLabel: 'B', 
        props: [
            {name: 'firstName', mustExist: true}
        ]
    }]);

    var relationshipTypeConstraintsMap = {
        TO: [sampleConstraintModel]
    }

    var validations = findConstraintsNotPresentInDatabase(dataModel, 
        {}, relationshipTypeConstraintsMap
    );

    //console.log(validations);
    expect(validations.length).toBe(1);
    expect(validations[0].validationMessage).toBe('Must Exist -[:TO {lastName}]- is not in the database.')
    expect(validations[0].relationshipType).toBe(dataModel.getRelationshipTypeArray()[0]);
});

test("getConstraintMaps", () => {
    /*
    const constraints = [
        "Constraint( id=52, name='constraint_edc959a0', type='RELATIONSHIP PROPERTY EXISTENCE', schema=-[:HAS_MENU_ITEM {foo}]- )",
        "Constraint( id=47, name='constraint_fa46c9b7', type='NODE PROPERTY EXISTENCE', schema=(:Pizza {cheese}) )",
        "Constraint( id=66, name='nodekey_menu', type='NODE KEY', schema=(:Menu {itemNumber, item}), ownedIndex=65 )",
        "Constraint( id=67, name='constraint_foo', type='UNIQUENESS', schema=(:Menu {sku}), ownedIndex=100 )",
        "Constraint( id=63, name='nodekey_person', type='NODE KEY', schema=(:Person {id}), ownedIndex=62 )",
        "Constraint( id=2, name='constraint_f7ecef6a', type='UNIQUENESS', schema=(:DataModel {key}), ownedIndex=1 )"
    ];
    */
    // switching to output from description instead of details
    const constraints = [
        "CONSTRAINT ON ()-[ has_menu_item:HAS_MENU_ITEM ]-() ASSERT exists(has_menu_item.foo)",
        "CONSTRAINT ON ( menu:Pizza ) ASSERT exists(menu.cheese)",
        "CONSTRAINT ON ( menu:Menu ) ASSERT (menu.itemNumber, menu.item) IS NODE KEY",
        "CONSTRAINT ON ( menu:Menu ) ASSERT (menu.sku) IS UNIQUE",
        "CONSTRAINT ON ( person:Person ) ASSERT (person.id) IS NODE KEY",
        "CONSTRAINT ON ( dataModel:DataModel ) ASSERT (dataModel.key) IS UNIQUE"
    ];

    var { nodeLabelConstraintsMap, relationshipTypeConstraintsMap } = getConstraintMaps(constraints);

    //console.log(Object.keys(nodeLabelConstraintsMap));
    expect(Object.keys(nodeLabelConstraintsMap).length).toBe(4);
    expect(nodeLabelConstraintsMap['Menu'].length).toBe(2);
    expect(Object.keys(relationshipTypeConstraintsMap).length).toBe(1);

    var nodeKeyMenuConstraintModel = nodeLabelConstraintsMap['Menu'][0];
    var nodes = nodeKeyMenuConstraintModel.getNodeLabelArray();
    expect(nodes.length).toBe(1);
    expect(nodes[0].label).toBe('Menu');

    var keyProperties = Object.values(nodes[0].properties);
    expect(keyProperties.length).toBe(2);
    expect(keyProperties[0].name).toBe('itemNumber');
    expect(keyProperties[1].name).toBe('item');
});

test("Test full model", () => {
    var dataModel = getDataModelWithNodeLabelsWithProperties([
        {
            label: 'Person',
            props: [
                {name: 'id', isPartOfKey: true},
                {name: 'name', mustExist: true},
                {name: 'externalId', hasUniqueConstraint: true},
                {name: 'dob'}
            ]
        },
        {
            label: 'Movie',
            props: [
                {name: 'id', isPartOfKey: true},
                {name: 'title', mustExist: true},
                {name: 'releaseDate'}
            ]
        },
    ]);
    dataModel = getDataModelWithRelationshipTypes([{
        startNodeLabel: 'Person', 
        type: 'ACTED_IN', 
        endNodeLabel: 'Movie', 
        props: [
            {name: 'role', mustExist: true}
        ]
    }], dataModel);    

    //console.log(dataModel.getNodeLabelArray());
    //console.log(dataModel.getRelationshipTypeArray())

    /*
    const constraints = [
        "Constraint( id=3, name='nodekey_menu', type='NODE KEY', schema=(:Movie {id}) )",
        "Constraint( id=5, name='nodekey_person', type='NODE KEY', schema=(:Person {id}) )",
        "Constraint( id=4, name='constraint_foo', type='UNIQUENESS', schema=(:Person {externalId}) )",
        "Constraint( id=2, name='constraint_fa46c9b7', type='NODE PROPERTY EXISTENCE', schema=(:Person {name}) )",
        "Constraint( id=6, name='constraint_f7ecef6a', type='NODE PROPERTY EXISTENCE', schema=(:Movie {title}) )",
        "Constraint( id=1, name='constraint_edc959a0', type='RELATIONSHIP PROPERTY EXISTENCE', schema=-[:ACTED_IN {role}]- )"
    ];
    */
    // switching to output from description instead of details
    const constraints = [
        "CONSTRAINT ON ( movie:Movie ) ASSERT (movie.id) IS NODE KEY",
        "CONSTRAINT ON ( person:Person ) ASSERT (person.id) IS NODE KEY",
        "CONSTRAINT ON ( person:Person ) ASSERT (person.externalId) IS UNIQUE",
        "CONSTRAINT ON ( person:Person ) ASSERT exists(person.name)",
        "CONSTRAINT ON ( movie:Movie ) ASSERT exists(movie.title)",
        "CONSTRAINT ON ()-[ acted_in:ACTED_IN ]-() ASSERT exists(acted_in.role)"
    ];

    var { nodeLabelConstraintsMap, relationshipTypeConstraintsMap } = getConstraintMaps(constraints);
    //console.log('nodeLabelConstraintsMap: ', nodeLabelConstraintsMap)
    /*
    Object.keys(nodeLabelConstraintsMap).map(key => {
        console.log(key);
        var dmArray = nodeLabelConstraintsMap[key];
        console.log('dmArray len: ', dmArray.length);

        dmArray.map(dm => {
            dm.getNodeLabelArray().map(nl => {
                console.log(nl.label);
                var props = Object.values(nl.properties);
                props.map(prop => {
                    console.log(`prop.name: ${prop.name}, isPartOfKey: ${prop.isPartOfKey}, mustExist: ${prop.mustExist}, hasUniqueConstraint: ${prop.hasUniqueConstraint}`)
                });
            })
        });
    })
    */
    var constraintDatabaseValidations = findConstraintsNotPresentInDatabase(dataModel, nodeLabelConstraintsMap, relationshipTypeConstraintsMap);
    //console.log(constraintDatabaseValidations);
    expect(constraintDatabaseValidations.length).toBe(0);
});

test('test with backticks / spaces', () => {

    var dataModel = getDataModelWithNodeLabelsWithProperties([
        {
            label: 'Foo Bar',
            props: [
                {name: 'baz qux', isPartOfKey: true},
                {name: 'qoph fiz', isPartOfKey: true},
            ]
        }
    ]);

    /*
    const constraints = [
        "Constraint( id=75, name='constraint_910c679', type='NODE KEY', schema=(:Foo Bar {baz qux, qoph fiz}), ownedIndex=73 )"
    ];*/
    // switching to output from description instead of details
    const constraints = [
        "CONSTRAINT ON ( foo bar:Foo Bar ) ASSERT (foo bar.baz qux, foo bar.qoph fiz) IS NODE KEY",
    ];

    var { nodeLabelConstraintsMap, relationshipTypeConstraintsMap } = getConstraintMaps(constraints);

    var constraintDatabaseValidations = findConstraintsNotPresentInDatabase(dataModel, nodeLabelConstraintsMap, relationshipTypeConstraintsMap);
    //console.log(constraintDatabaseValidations);
    expect(constraintDatabaseValidations.length).toBe(0);    
});
