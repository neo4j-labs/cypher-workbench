import {
    associateScenarioToCypher,
    removeScenarioToCypherAssociation,
    listCypherStatements,
    searchCypherStatements
} from "../models/cypherAssociations";

export default {
    Query: {
        listCypherStatementsX: (obj, args, context, resolveInfo) => {
            return listCypherStatements(args.myOrderBy, args.orderDirection, context);
        },
        searchCypherStatementsX: (obj, args, context, resolveInfo) => {
            return searchCypherStatements(args.searchText, args.myOrderBy, args.orderDirection, context);
        }
    },
    Mutation: {
        associateScenarioToCypher: async (obj, args, context, resolveInfo) => {
            const {
                scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher
            } = args;
            return await associateScenarioToCypher(scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, context);
        },
        removeScenarioToCypherAssociation: async (obj, args, context, resolveInfo) => {
            const {
                scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey
            } = args;
            return await removeScenarioToCypherAssociation(scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, context);
        }
    }
}
