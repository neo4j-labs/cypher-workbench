
import {
    ColumnDefinition,
    TableDefinition,
    TableCatalog
} from '../../../../dataModel/dataSource/generalDataSource';

export const getTableCatalogFromDatasetSchemaResponse = (datasetSchemaResponse, datasetId) => {

    /* Example schemaRow
    {
        "table_catalog": "big-query-project-id",
        "table_schema": "TableSchema",
        "table_name": "clients",
        "column_name": "id",
        "ordinal_position": 1,
        "is_nullable": "YES",
        "data_type": "STRING",
        "is_hidden": "NO",
        "is_system_defined": "NO",
        "is_partitioning_column": "NO"
      },
      */
    var tables = {};

    datasetSchemaResponse.map(schemaRow => {

        var table = tables[schemaRow.table_name];
        var columnDefinitions = [];

        if (!table) {
            tables[schemaRow.table_name] = new TableDefinition({
                key: schemaRow.table_name,
                name: schemaRow.table_name,
                columnDefinitions: columnDefinitions,
                //constraints,
                //metadata
            });
        } else {
            columnDefinitions = table.columnDefinitions;
        }

        var newColDefinition = new ColumnDefinition({
            key: schemaRow.column_name,
            name: schemaRow.column_name,
            ordinalPosition: schemaRow.ordinal_position,
            datatype: schemaRow.data_type
            // constraints
            // metadata
        });
        columnDefinitions.push(newColDefinition);
    });

    var tableCatalog = new TableCatalog({
        key: datasetId,
        name: datasetId,
        tableDefinitions: Object.values(tables)
    });
    return tableCatalog;
}