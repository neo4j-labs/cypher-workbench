export default `

type CypherStatementResult @exclude {
    key: ID!
    subKey: ID
    cypherWorkbenchVersion: String
    title: String
    description: String
    customers: [Customer!]! @relationship(type:"HAS_CUSTOMER", direction:OUT)
    tags: [Tag!]! @relationship(type:"HAS_TAG", direction:OUT)
    owners: [User]
    dateCreated: String
    dateUpdated: String
    isPublic: Boolean
    userRole: String
    userIsCreator: Boolean
    isVisualCypher: Boolean
    cypher: String
}

type Query {
    listCypherStatementsX(myOrderBy: String, orderDirection: String): [CypherStatementResult]
    searchCypherStatementsX(searchText: String, myOrderBy: String, orderDirection: String): [CypherStatementResult]
}

type Mutation {
    associateScenarioToCypher(scenarioGraphDocKey: String, scenarioKey: String, cypherGraphDocKey: String, cypherKey: String, isVisualCypher: Boolean): Boolean
    removeScenarioToCypherAssociation(scenarioGraphDocKey: String, scenarioKey: String, cypherGraphDocKey: String, cypherKey: String): Boolean
}
`;