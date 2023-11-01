
import { getNodeLabelDataModel } from './dataModelHelper';
import { IndexTypes } from './constraintIndexTypes';

export const getIndexDataModel = (info) => {
    const { indexName, nodeLabelString, propertyNameArray } = info;
    if (propertyNameArray.length > 1) {
        // its a composite index
        var dataModel = getNodeLabelDataModel(nodeLabelString, propertyNameArray, IndexTypes.CompositePropertyIndex);
        var nodeLabel = dataModel.getNodeLabelArray()[0];
        nodeLabel.addIndex({
            indexName: indexName,
            propertyDefinitionKeys: propertyNameArray
        });
        return dataModel;
    } else {
        return getNodeLabelDataModel(nodeLabelString, propertyNameArray, IndexTypes.SinglePropertyIndex);
    }
}

export const handleNeo3XRow = (row) => {
    if (row.type === 'node_label_property') {
        return getIndexDataModel({
            indexName: row.indexName,
            nodeLabelString: row.tokenNames[0],
            propertyNameArray: row.properties
        });
    } else {
        return null;
    }
}

export const handleNeo4XRow = (row) => {
    if (row.type !== 'FULLTEXT' && row.uniqueness === 'NONUNIQUE') {
        return getIndexDataModel({
            indexName: row.name,
            nodeLabelString: row.labelsOrTypes[0],
            propertyNameArray: row.properties
        });
    } else {
        return null;
    }
}

export const processDbIndexesRow = (row) => (row.tokenNames) ? handleNeo3XRow(row) : handleNeo4XRow(row);

export const processDbIndexesResult = (dbIndexesRows) => {

    var dataModels = [];
    if (Array.isArray(dbIndexesRows)) {
        dataModels = dbIndexesRows
            .map(row => processDbIndexesRow(row))
            .filter(dataModel => dataModel);    // get rid of nulls
    }
    return dataModels;
} 