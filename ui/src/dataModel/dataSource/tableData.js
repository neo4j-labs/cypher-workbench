
export class TableData {
    constructor (properties) {
        properties = properties || {};

        var {
            rows,
            dataSource,
            tableCatalog,
            tableDefinition,
            columnDefinitions
        } = properties;

        this.rows = rows || [];
        this.dataSource = dataSource;
        this.tableCatalog = tableCatalog;
        this.tableDefinition = tableDefinition;
        this.columnDefinitions = columnDefinitions;
    }

    addRow = (columns) => {
        this.rows.push(columns);
    }
}

