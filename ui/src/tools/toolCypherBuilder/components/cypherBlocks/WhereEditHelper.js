
import { ALERT_TYPES } from '../../../../common/Constants';
import { getCurrentConnectionInfo, runCypher } from '../../../../common/Cypher';
import { PROPERTY_DEFINITION_TYPES } from './DataModelUtil';

export default class WhereEditHelper {

    constructor (properties) {
        properties = properties || {};
        this.whereClauseComponent = properties.whereClauseComponent;
    }

    comboBoxActive = () => {
        return true;
    }

    performSearch = (searchText, callback) => {
        var possibleWhereItems = this.whereClauseComponent.getPossibleWhereItems();
        console.log('performSearch called, possibleWhereItems: ', possibleWhereItems);

        var matches = possibleWhereItems
                .filter(whereItem => whereItem.text.toLowerCase().indexOf(searchText.toLowerCase()) !== -1)
                .map(whereItem => {
                    return {
                        label: whereItem.text,
                        data: whereItem
                    }
                })

        callback({success: true, data: matches});
    }

    performCypherSearch = (searchText, cypherConfig, callback) => {
        var { type } = cypherConfig;
        var cypherQuery = '';
        if (type === PROPERTY_DEFINITION_TYPES.NODE_LABEL) {
            var { nodeLabelString, propertyExpression } = cypherConfig;
            nodeLabelString = (nodeLabelString) ? `:${nodeLabelString}` : '';
            cypherQuery = `
                WITH $searchText as searchText 
                MATCH (n${nodeLabelString}) 
                WHERE toLower(toString(n.${propertyExpression})) CONTAINS toLower(searchText)
                RETURN DISTINCT n.${propertyExpression} as value, apoc.meta.type(n.${propertyExpression}) as datatype
                ORDER BY value
                LIMIT 15
            `
        } else if (type === PROPERTY_DEFINITION_TYPES.NODE_LABEL_RELATIONSHIP_TYPE_NODE_LABEL) {
            var { startNodeLabelString, relationshipTypeString, endNodeLabelString, propertyExpression } = cypherConfig;
            startNodeLabelString = (startNodeLabelString) ? `:${startNodeLabelString}` : '';
            relationshipTypeString = (relationshipTypeString) ? `:${relationshipTypeString}` : '';
            endNodeLabelString = (endNodeLabelString) ? `:${endNodeLabelString}` : '';

            cypherQuery = `
                WITH $searchText as searchText 
                MATCH (n${startNodeLabelString})-[r${relationshipTypeString}]->(m${endNodeLabelString}) 
                WHERE toLower(toString(r.${propertyExpression})) CONTAINS toLower(searchText)
                RETURN DISTINCT r.${propertyExpression} as value, apoc.meta.type(r.${propertyExpression}) as datatype
                ORDER BY value
                LIMIT 15
            `
        }
        
        if (getCurrentConnectionInfo()) {   // we have an active connection
            var args = {searchText: searchText};
            console.log('Running cypherQuery: ', cypherQuery);
            console.log('args: ', args);
            runCypher(cypherQuery, args, (results) => {
                //console.log('results: ', cypherQuery, results);
                var matches = results.rows.map(row => {
                    var value = row['value'];
                    var datatype = row['datatype'];
                    value = (datatype === 'STRING') ? `'${value}'` : value;
                    return {
                        label: value,
                        data: value
                    }
                })
                callback({success: true, data: matches});
            }, (error) => {
                //console.log('error runningCypher:', cypherQuery, error);
                callback({success: false, data: [{
                    label: [error.message],
                    data: error.message
                }]});
            });                      
        } else {
            callback({success: true, data: []});
        }
    }

    findWhereItem = (text) => null;

    getNewWhereItem = (text) => {
       return null;
    } 

    validateEditedText = (dataItem, newText) => {
        return true;
    }

    getConfig = () => {
        return {
            leftDisplayLabel: 'Left Item',
            rightDisplayLabel: 'Right Item'
        }
    }
}