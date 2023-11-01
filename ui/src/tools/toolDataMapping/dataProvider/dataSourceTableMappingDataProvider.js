
import DataTypes from '../../../dataModel/DataTypes';
import { deserializeObject, serializeObject } from '../../../dataModel/graphUtil';
import { GeneralDataSourceInstanceMapper } from '../../../dataModel/dataSource/generalDataSource';
import {
    ColumnSource,
    GraphDestination,
    DataMapping
} from '../../../dataModel/dataSource/dataMapping';

export default class DataSourceTableMappingDataProvider {

    constructor (properties) {
        properties = properties || {};
        const {
            graphNode,
            dataMappingDataProvider,
            dataMappingTableBlockKey,
            parentContainer,
            title,
            tableDefinition,
            getDataModel,     
            getTableCatalog,
            getAvailableMappingDestinations
        } = properties;

        this.graphNode = graphNode;
        this.dataMappingDataProvider = dataMappingDataProvider;
        this.dataMappingTableBlockKey = dataMappingTableBlockKey;
        this.parentContainer = parentContainer;

        this.title = (title) ? title: 'Data Mapping Table';

        this.dataMappings = [];
        this.dataMappingKeysMap = {};

        this.getDataModel = getDataModel;
        this.getTableCatalog = getTableCatalog;
        this.getAvailableMappingDestinations = getAvailableMappingDestinations;

        if (tableDefinition) {
            this.setTableDefinition(tableDefinition);
        } else {
            this.loadTableDefinition();
        }

        if (title) {
            this.setTitle(title);
        } else {
            this.loadTitle();
        }
    }

    reloadSavedMappings = () => {
        const dataMappingKeysJson = this.graphNode.getPropertyValueByKey("dataMappingKeys") || '{}';

        try {
            this.dataMappingKeysMap = JSON.parse(dataMappingKeysJson);
        } catch (e) {
            this.dataMappingKeysMap = {};
            console.log(e);
            alert(`Error loading dataMappingKeys JSON: ${e}`)
        }
 
        this.dataMappings = Object.keys(this.dataMappingKeysMap).map(columnSourceKey => {
            const {
                availableDestinationKey,
                columnDefinitionKey
            } = this.dataMappingKeysMap[columnSourceKey];

            const tableDefinition = this.getTableDefinition();
            const columnDefinitions = tableDefinition.columnDefinitions;
            const columnDefinition = columnDefinitions.find(x => x.key === columnDefinitionKey)

            const { dataMapping } = this.getDataMapping({
                availableMappingDestinationKey: availableDestinationKey,
                columnDefinition
            });

            return dataMapping;
        }).filter(x => x);  // filter out nulls
    }

    getDataMappingKeysMap = () => this.dataMappingKeysMap;

    getColumnSourceKey = ({tableCatalog, tableDefinition, columnDefinition}) => {
        tableCatalog = tableCatalog ? tableCatalog : this.getTableCatalog();
        tableDefinition = tableDefinition ? tableDefinition : this.getTableDefinition();
        var key = (tableCatalog) ? `${tableCatalog.key}_` : '';
        key = `${key}${tableDefinition.key}_${columnDefinition.key}`
        return key;
    }

    getDataMapping = ({
        availableMappingDestinationKey,
        columnDefinition
    }) => {
        const availableMappingDestinations = this.getAvailableMappingDestinations();
        if (availableMappingDestinations.length > 0) {
            var availableDestination = availableMappingDestinations.find(x => x.key === availableMappingDestinationKey);

            const dataModel = this.getDataModel();
            const tableCatalog = this.getTableCatalog();
            const tableDefinition = this.getTableDefinition();
    
            const columnSourceKey = this.getColumnSourceKey({columnDefinition});
    
            const columnSource = new ColumnSource({
                key: columnSourceKey,
                tableCatalog,
                tableDefinition,
                columnDefinition
            });
    
            var graphDestination = new GraphDestination({
                dataModel,
                ...availableDestination
            });
    
            const dataMappingKey = `${columnSourceKey}_${graphDestination.key}`;
            var dataMapping = new DataMapping({
                key: dataMappingKey,
                source: columnSource,
                destination: graphDestination
            });

            return {
                dataMapping,
                dataMappingKey,
                columnSourceKey
            }            
        } else {
            return {
                dataMapping: null,
                dataMappingKey: null,
                columnSourceKey: null
            }
        }
    }    

    getTitle = () => this.title;
    setTitle = (title) => {
        this.title = title;
        this.graphNode.addOrUpdateProperty("title", title, DataTypes.String);
    }
    loadTitle = () => {
        this.title = this.graphNode.getPropertyValueByKey("title") || "Data Mapping Table";
    }

    saveDataMappingKeys = () => {
        const dataMappingsJson = JSON.stringify(this.dataMappingKeysMap);
        this.graphNode.addOrUpdateProperty("dataMappingKeys", dataMappingsJson, DataTypes.String);
    }   
    getAvailableMappingDestinationKey = (columnSourceKey) => this.dataMappingKeysMap[columnSourceKey];

    getTableDefinition = () => {
        return this.tableDefinition;
        //var jsonString = this.graphNode.getPropertyValueByKey("tableDefinition") || '{}';
        //return JSON.parse(jsonString);
    }
    setTableDefinition = (tableDefinition) => {
        this.tableDefinition = tableDefinition;
        var serializedObject = serializeObject(tableDefinition);
        var tableDefinitionJson = JSON.stringify(serializedObject);
        this.graphNode.addOrUpdateProperty("tableDefinition", tableDefinitionJson, DataTypes.String);        
    }
    loadTableDefinition = () => {
        var jsonString = this.graphNode.getPropertyValueByKey("tableDefinition");
        if (jsonString) {
            const serializedObject = JSON.parse(jsonString);
            this.tableDefinition = deserializeObject(serializedObject, GeneralDataSourceInstanceMapper);
        }
    }

    addDataMapping = (dataMapping, { columnSourceKey, columnDefinitionKey, availableDestinationKey }) => {
        // for now, we will maintain 1 dataMapping per columnSource.  This may change in the future
        var currentIndex = this.dataMappings.findIndex(x => x.source.key === dataMapping.source.key);
        if (currentIndex !== -1) {
            this.dataMappings[currentIndex] = dataMapping;
        } else {
            this.dataMappings.push(dataMapping);
        }

        this.dataMappingKeysMap[columnSourceKey] = {
            columnDefinitionKey,
            availableDestinationKey
        };       
        this.saveDataMappingKeys(this.dataMappings);
    }

    removeDataMapping = (columnSourceKey) => {
        var currentIndex = this.dataMappings.findIndex(x => x.source.key === columnSourceKey);
        if (currentIndex !== -1) {
            this.dataMappings.splice(currentIndex, 1);
        }
        delete this.dataMappingKeysMap[columnSourceKey];
        this.saveDataMappingKeys(this.dataMappings);
    }

    getDataMappings = () => this.dataMappings;
}