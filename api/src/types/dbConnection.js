export default `

  scalar JSON 

  # Have to rename DBConnection to DBConnectionEx 
  # because things ending in Connection are reserved by the GraphQL Cursor Connections Specification
  # see https://relay.dev/graphql/connections.htm#sec-Reserved-Types
  type DBConnectionEx @exclude {
    id: ID!
    url: String!
    databaseName: String
    encrypted: Boolean
    proxyThroughAppServer: Boolean
    name: String!
    dbInfo: DBInfo
    labels: [String!]
    createdAt: String!
    users: [UserRole]!
    isPrivate: Boolean!
    canCurrentUserEdit: Boolean
    canCurrentUserDelete: Boolean
    propertyNames(label: String!): [String!]
  }

  type DBInfo @exclude {
    hasApoc:Boolean
    license:License
    versions:[String]
    isConnected:Boolean!
  }

  type DBSchemaCallInfo @exclude {
      cypherFunction: String
      jsonSchema: String
  }

  enum License {
    NA
    COMMUNITY
    ENTERPRISE
  }

  input CreateDBConnectionInput {
    url: String!
    databaseName: String
    encrypted: Boolean
    proxyThroughAppServer: Boolean
    name: String!
    user: String!
    password: String!
    isPrivate: Boolean!
  }

  input EditDBConnectionInput {
    url: String
    databaseName: String
    encrypted: Boolean
    proxyThroughAppServer: Boolean
    name: String
    user: String
    password: String
    isPrivate: Boolean!
  }

  input GetSchemaInput {
    url: String
    databaseName: String
    encrypted: Boolean
    encryptedUser: String
    encryptedUserPublicKey: String
    encryptedPassword: String
    encryptedPasswordPublicKey: String
  }

  input DBConnectionInput {
    id: String
    url: String
    databaseName: String
    encrypted: Boolean
    proxyThroughAppServer: Boolean
    encryptedUser: String
    encryptedUserPublicKey: String
    encryptedPassword: String
    encryptedPasswordPublicKey: String
  }

  input CypherQueryInput {
    dbConnection: DBConnectionInput
    cypherQuery: String
    cypherParameters: JSON 
  }

  type CypherExecutionResult @exclude {
    error: String
    headers: [String]
    numRows: Int
    rows: [JSON]
  }

  type Query {
    dbConnection(id: ID!): DBConnectionEx!
    allDBConnectionsForUser: [DBConnectionEx!]!
    getSchema(input: GetSchemaInput): DBSchemaCallInfo
    executeCypherQuery(input: CypherQueryInput): CypherExecutionResult
  }

  type Mutation {
    createDBConnection(input: CreateDBConnectionInput): DBConnectionEx!
    editDBConnection(id: ID!, properties: EditDBConnectionInput): DBConnectionEx!
    deleteDBConnection(id: ID!): DBConnectionEx!
  }
`;
