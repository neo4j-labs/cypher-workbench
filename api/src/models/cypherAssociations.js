import {
    CreateCypherAssociation,
    RemoveCypherAssociation,
    ListCypherStatements,
    SearchForCypherStatements
} from './cypherAssociationCypherStatements';
import { processResult, getFirstRowValue } from './resultHelper';
import { runQuery } from "../util/run";

export const associateScenarioToCypher = async (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, context) => {
    const args={scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, email: context.email};
    //console.log('associateScenarioToCypher args: ', args);
    var result=await runQuery(CreateCypherAssociation, args)
    result = processResult(result);
    return getFirstRowValue(result, "success", 
        `Some of these keys ${scenarioGraphDocKey} ${scenarioKey} ${cypherGraphDocKey} ${cypherKey} not found`);
};

export const removeScenarioToCypherAssociation = async (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, context) => {
    const args={scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, email: context.email};
    //console.log('removeScenarioToCypherAssociation args: ', args);
    var result=await runQuery(RemoveCypherAssociation, args)
    result = processResult(result);
    return getFirstRowValue(result, "success", 
        `Some of these keys ${scenarioGraphDocKey} ${scenarioKey} ${cypherGraphDocKey} ${cypherKey} not found`);
};

export const listCypherStatements = async (myOrderBy, orderDirection, context) => {
    //console.log('myOrderBy: ', myOrderBy)
    //console.log('orderDirection: ', orderDirection)
    var replacement = (orderDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
    var args = {myOrderBy: myOrderBy, email: context.email};
    //var args = {myOrderBy: myOrderBy, email: 'jim@jim.com'};
    //console.log('listGraphDocs: ', args);
    var query = ListCypherStatements.replace(/\$DESC/, replacement)
    //console.log('query: ', query);
    var result = await runQuery(query, args)
    //console.log('listGraphDocs result: ', result);
    result = processResult(result);
    //console.log("result.rows",result.rows);
    return result.rows;
}

export const searchCypherStatements = async (searchText, myOrderBy, orderDirection, context) => {
    //console.log('search data graphDocs called');
    //console.log(`orderDirection: ${orderDirection}`)
    var replacement = (orderDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
    var query = SearchForCypherStatements.replace(/\$DESC/, replacement);
    var args = {searchText: searchText, myOrderBy: myOrderBy, email: context.email};
    var result = await runQuery(query, args);
    result = processResult(result);
    return result.rows;
}
