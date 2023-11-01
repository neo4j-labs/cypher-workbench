
import DataTypes from '../DataTypes';

export const GeneralDataSourceInstanceMapper = {
    GeneralDataSource: () => new GeneralDataSource(),
    TableCatalog: () => new TableCatalog(),
    TableDefinition: () => new TableDefinition(),    
    ColumnDefinition: () => new ColumnDefinition()
}

// defines a generalized data source
export class GeneralDataSource {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            key,
            name,
            // a data source will probably have one or the other of tableCatalogs or tableDefinitions
            tableCatalogs, 
            tableDefinitions    
        } = properties;

        this.myObjectName = 'GeneralDataSource';

        this.key = key;
        this.name = name;
        this.tableCatalogs = tableCatalogs || [];
        this.tableDefinitions = tableDefinitions || [];
    }

    getSerializedId = () => this.key;
    getTableDefinitionByKey = (key) => this.tableDefinitions.find(x => x.key === key);
    getTableDefinitionByName = (name) => this.tableDefinitions.find(x => x.name === name);
}

// defines a collection of tables
export class TableCatalog {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            key,
            name,
            tableDefinitions,
            metadata
        } = properties;

        this.myObjectName = 'TableCatalog';

        this.key = key;
        this.name = name;
        this.tableDefinitions = tableDefinitions || {};
        this.metadata = metadata || {};
    }

    getSerializedId = () => this.key;
    getTableDefinitionByKey = (key) => this.tableDefinitions.find(x => x.key === key);
    getTableDefinitionByName = (name) => this.tableDefinitions.find(x => x.name === name);

}

// defines a table
export class TableDefinition {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            key,
            name,
            columnDefinitions,
            constraints,
            metadata
        } = properties;

        this.myObjectName = 'TableDefinition';

        this.key = key;
        this.name = name;
        this.columnDefinitions = columnDefinitions || [];
        this.constraints = constraints || {};
        this.metadata = metadata || {};
    }

    getSerializedId = () => this.key;
    getColumnDefinitionByKey = (key) => this.columnDefinitions.find(x => x.key === key);
    getColumnDefinitionByName = (name) => this.columnDefinitions.find(x => x.name === name);
}

// defines a column in a table
export class ColumnDefinition {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            key,
            name,
            datatype, 
            ordinalPosition,
            constraints,    
            metadata
        } = properties;

        this.myObjectName = 'ColumnDefinition';

        this.key = key;
        this.name = name;
        this.datatype = (datatype) ? datatype : DataTypes.String;
        this.ordinalPosition = ordinalPosition;
        this.constraints = constraints || {};
        this.metadata = metadata || {};
    }
    
    getSerializedId = () => this.key;
}

