
import DataTypes from '../DataTypes';
import {
    createSampleData,
    createSampleDataDefinition,
    createSampleDataModel
} from './testHelper';

test('make sample data', () => {
    var sampleData = createSampleData();
    expect(sampleData.rows.length).toBe(2);

    var colIndex = 5;
    expect(sampleData.rows[1][colIndex]).toBe('Chipotle');
    var tableDef = sampleData.tableDefinition;
    var companyDef = tableDef.columnDefinitions[colIndex];

    expect(companyDef).not.toBeNull();
    expect(companyDef.datatype).toBe(DataTypes.String);
});

test('make table definition', () => {
    var dataDef = createSampleDataDefinition();
    var tableDef = dataDef.getTableDefinitionByKey('table1');

    expect(tableDef).not.toBeNull();

    var companyDef = tableDef.getColumnDefinitionByName('company');
    expect(companyDef).not.toBeNull();

    expect(companyDef.datatype).toBe(DataTypes.String);
});

test('make sample data model', () => {
    var dataModel = createSampleDataModel();

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(2);

    expect(relationshipTypes[0].type).toBe('LIVES_AT');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Person');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Address');

    expect(relationshipTypes[1].type).toBe('WORKS_FOR');
    expect(relationshipTypes[1].startNodeLabel.label).toBe('Person');
    expect(relationshipTypes[1].endNodeLabel.label).toBe('Company');
});

