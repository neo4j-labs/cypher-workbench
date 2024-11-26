export default `

  type Phase @exclude {
    id: ID!
    name: String!
    description: String!
    phaseType: String!
    active: Boolean!
    showCypher: Boolean
    cypherQuery: String!
    cypherWorkbenchCypherBuilderKey: ID
  }

  input EditPhaseInput {
    name: String
    description: String
    active: Boolean
    showCypher: Boolean
    cypherQuery: String
    inverted: Boolean
    maxAmount: Int
    cypherWorkbenchCypherBuilderKey: ID
  }

  type Mutation {
    editPhase(id: ID!, input: EditPhaseInput!): Phase
  }
`;
