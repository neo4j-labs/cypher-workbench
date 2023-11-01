
import DataTypes from '../DataTypes';
import { getDataModel } from '../testUtil/testUtil';
import { GeneralDataSource, TableDefinition, ColumnDefinition } from './generalDataSource';
import { TableData } from './tableData';

export const createSampleDataDefinition = () => {
    var columnDefinitions = [
        new ColumnDefinition({
            key: 'col1', 
            name: 'id', 
            datatype: DataTypes.String
        }),
        new ColumnDefinition({
            key: 'col2', 
            name: 'name', 
            datatype: DataTypes.String
        }),
        new ColumnDefinition({
            key: 'col3', 
            name: 'address1', 
            datatype: DataTypes.String
        }),
        new ColumnDefinition({
            key: 'col4', 
            name: 'city', 
            datatype: DataTypes.String
        }),
        new ColumnDefinition({
            key: 'col5', 
            name: 'state', 
            datatype: DataTypes.String
        }),
        new ColumnDefinition({
            key: 'col6', 
            name: 'company', 
            datatype: DataTypes.String
        })
    ];

    var tableDefinition = new TableDefinition({
        key: 'table1',
        name: 'Sample Data',
        columnDefinitions: columnDefinitions
    });

    var generalDataSource = new GeneralDataSource({
        key: 'ds1',
        name: 'Sample DS',
        tableDefinitions: [tableDefinition]
    });

    return generalDataSource;
}

export const createSampleData = () => {
    var dataDef = createSampleDataDefinition();
    var tableDef = dataDef.getTableDefinitionByKey('table1');
    var columnDefinitions = tableDef.columnDefinitions;
    var tableData = new TableData({
        dataSource: dataDef,
        tableDefinition: tableDef,
        columnDefinitions: columnDefinitions
    });
    tableData.addRow([1, 'Joe', '123', 'Frederick', 'MD', 'Starbucks']);
    tableData.addRow([1, 'Jim', '234', 'Germantown', 'MD', 'Chipotle']);
    return tableData;
}

export const createSampleDataModel = () => {
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
        {startNodeLabel: 'Person', type: 'WORKS_FOR', endNodeLabel: 'Company'}
    ]);
    return dataModel;
}