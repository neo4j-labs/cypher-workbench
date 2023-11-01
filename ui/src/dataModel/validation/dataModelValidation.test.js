
import { getDataModel } from '../testUtil/testUtil';
import DataTypes from '../DataTypes';
import { 
    findNodeLabelsWithNoProperties, 
    findNodeLabelsWithNoNodeKeys,
    findNodeLabelsWithNoRelationshipTypes,
    findNodeLabelsThatDoNotConformToStyleGuide,
    findRelationshipTypesThatDoNotConformToStyleGuide,
    findPropertiesThatDoNotConformToStyleGuide,
    findNodeLabelsWithNoNames,
    findRelationshipTypesWithNoNames,
    findSecondaryNodeLabelsWithNoNames,
    findPropertiesWithNoNames
 } from './dataModelValidation';

 const createGoodDataModel = () => {
    var dataModel = getDataModel([
        {label: 'Person', properties: [
            {name: 'id', datatype: DataTypes.Integer, isPartOfKey: true },
            {name: 'name'}
        ]},
        {label: 'Address', properties: [
            {name: 'id', isPartOfKey: true },
            {name: 'address1'},
            {name: 'city'},
            {name: 'state'}
        ]},
        { label: 'Company', properties: [
            {name: 'name', isPartOfKey: true }
        ]},
        {startNodeLabel: 'Person', type: 'LIVES_AT', endNodeLabel: 'Address'},
        {startNodeLabel: 'Person', type: 'WORKS_FOR', endNodeLabel: 'Company',
            properties: [
                {name: 'startDate' }
        ]}
    ]);
    return dataModel;
}

const createBadDataModel = () => {
    var dataModel = getDataModel([
        {label: 'person', properties: [
            {name: 'NAME'}
        ]},
        {label: 'ADDRESS', properties: [
            {name: 'id', isPartOfKey: true },
            {name: 'address_1'},
            {name: 'city'},
            {name: 'state'}
        ]},
        { label: 'Company', properties: [
            {name: 'name', isPartOfKey: true }
        ]},
        { label: 'Disconnected' },
        {startNodeLabel: 'person', type: 'livesAt', endNodeLabel: 'ADDRESS'},
        {startNodeLabel: 'person', type: 'WorksFor', endNodeLabel: 'Company',
            properties: [
                {name: 'start_date' }
        ]}
    ]);
    return dataModel;
}

const createModelWithMissingNames = () => {
    var dataModel = getDataModel([
        {label: 'Person'},
        {label: 'Address', properties: [
            {name: 'address_1'},
            {name: ''}
        ]},
        { label: 'Company'},
        { label: ''},
        {startNodeLabel: 'Person', type: '', endNodeLabel: 'Address'},
        {startNodeLabel: 'Person', type: 'WORKS_FOR', endNodeLabel: 'Company',
            properties: [
                {name: '' }
        ]}
    ]);
    return dataModel;
}


test('validate good data model', () => {
    var dataModel = createGoodDataModel();

    expect(findNodeLabelsWithNoProperties(dataModel).length).toBe(0);
    expect(findNodeLabelsWithNoNodeKeys(dataModel).length).toBe(0);
    expect(findNodeLabelsWithNoRelationshipTypes(dataModel).length).toBe(0);

    expect(findNodeLabelsThatDoNotConformToStyleGuide(dataModel).length).toBe(0);    
    expect(findRelationshipTypesThatDoNotConformToStyleGuide(dataModel).length).toBe(0);    
    expect(findPropertiesThatDoNotConformToStyleGuide(dataModel).length).toBe(0);    
});

test('validate bad data model', () => {
    var dataModel = createBadDataModel();

    var nodeLabelsNoProps = findNodeLabelsWithNoProperties(dataModel);
    expect(nodeLabelsNoProps.length).toBe(1);
    expect(nodeLabelsNoProps[0].label).toBe('Disconnected');

    var nodeLabelsNoNodeKeys = findNodeLabelsWithNoNodeKeys(dataModel);
    expect(nodeLabelsNoNodeKeys.length).toBe(2);
    expect(nodeLabelsNoNodeKeys[0].label).toBe('person');
    expect(nodeLabelsNoNodeKeys[1].label).toBe('Disconnected');

    var nodeLabelsNoRelTypes = findNodeLabelsWithNoRelationshipTypes(dataModel);
    expect(nodeLabelsNoRelTypes.length).toBe(1);
    expect(nodeLabelsNoRelTypes[0].label).toBe('Disconnected');

    var nodeLabelsBadStyle = findNodeLabelsThatDoNotConformToStyleGuide(dataModel);
    expect(nodeLabelsBadStyle.length).toBe(2);    
    expect(nodeLabelsBadStyle[0].label).toBe('person');
    expect(nodeLabelsBadStyle[1].label).toBe('ADDRESS');

    var relTypesBadStyle = findRelationshipTypesThatDoNotConformToStyleGuide(dataModel);
    expect(relTypesBadStyle.length).toBe(2);    
    expect(relTypesBadStyle[0].type).toBe('livesAt');
    expect(relTypesBadStyle[1].type).toBe('WorksFor');

    var propsBadStyle = findPropertiesThatDoNotConformToStyleGuide(dataModel);
    expect(propsBadStyle.length).toBe(3);    
    expect(propsBadStyle[0].propertyContainer.label).toBe('person');    
    expect(propsBadStyle[0].property.name).toBe('NAME');    

    expect(propsBadStyle[1].propertyContainer.label).toBe('ADDRESS');    
    expect(propsBadStyle[1].property.name).toBe('address_1');    

    expect(propsBadStyle[2].propertyContainer.type).toBe('WorksFor');    
    expect(propsBadStyle[2].property.name).toBe('start_date');    
});

test("Secondary node labels", () => {
    var dataModel = createGoodDataModel();
    dataModel.getPrimaryNodeLabelAndEnsureSecondaryNodeLabels('Person:Employee', dataModel);

    expect(findNodeLabelsWithNoProperties(dataModel).length).toBe(0);
    expect(findNodeLabelsWithNoNodeKeys(dataModel).length).toBe(0);
    expect(findNodeLabelsWithNoRelationshipTypes(dataModel).length).toBe(0);

});

test('Missing names', () => {
    var dataModel = createModelWithMissingNames();
    dataModel.getPrimaryNodeLabelAndEnsureSecondaryNodeLabels('Person:Employee', dataModel);
    var employee = dataModel.getNodeLabelByLabel('Employee');
    employee.label = '';

    expect(findNodeLabelsWithNoNames(dataModel).length).toBe(1);
    expect(findSecondaryNodeLabelsWithNoNames(dataModel).length).toBe(1);
    expect(findRelationshipTypesWithNoNames(dataModel).length).toBe(1);
    var propsNoNames = findPropertiesWithNoNames(dataModel);
    expect(propsNoNames.length).toBe(2);

    expect(propsNoNames[0].propertyContainer.label).toBe('Address');
    expect(propsNoNames[1].propertyContainer.type).toBe('WORKS_FOR');
})

test('test acceptUniqueIndexedMustExistAsNodeKey', () => {
    var dataModel = getDataModel([
        {label: 'Person', properties: [
            {   
                name: 'id', 
                datatype: DataTypes.Integer, 
                isPartOfKey: false,
                hasUniqueConstraint: true,
                mustExist: true,
                isIndexed: true 
            }
        ]}
    ]);
    var nodeLabelsNoNodeKeys = findNodeLabelsWithNoNodeKeys(dataModel, { acceptUniqueIndexedMustExistAsNodeKey: true });
    expect(nodeLabelsNoNodeKeys.length).toBe(0);
});