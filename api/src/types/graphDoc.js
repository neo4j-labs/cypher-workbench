export default `

# Customer and Tag are declared in datamodel.js and should be merged in automatically

type GraphDoc @exclude {
    key: ID!
    isPrivate: Boolean
    primaryNodeLabel: String
    metadata: GraphDocMetadata @relationship(type: "HAS_METADATA", direction: OUT)
    graph: Graph
    lockInfo: LockInfo
}

type LockInfo @exclude {
    lockedByUser: String
    lockTimestamp: String
    lockIsActive: Boolean
}

type GraphDocAndView @exclude {
    graphDoc: GraphDoc
    graphDocView: GraphDoc
}

type Graph @exclude {
    nodes: [NodeEx]
    relationships: [Relationship]
}

type GraphDocMetadata @exclude {
    key: ID!
    cypherWorkbenchVersion: String
    title: String
    description: String
    notes: String
    viewSettings: String
    customers: [Customer!]! @relationship(type:"HAS_CUSTOMER", direction:OUT)
    tags: [Tag!]! @relationship(type:"HAS_TAG", direction:OUT)
    owners: [User]
    dateCreated: String
    dateUpdated: String
    graphDoc: [GraphDoc!]! @relationship(type: "HAS_METADATA", direction: IN)
    isPublic: Boolean
    userRole: String
    userIsCreator: Boolean
}

type Property @exclude {
    key: String
    datatype: String
    value: String
}

type NodeKey @exclude {
    properties: [Property]
    label: String
}

# Have to rename Node to NodeEx
# because Node is reserved by the GraphQL Cursor Connections Specification
# see https://relay.dev/graphql/connections.htm#sec-Reserved-Types
type NodeEx {
    neoInternalId: String   # must be converted to Long before use
    key: NodeKey
    isRootNode: Boolean
    primaryNodeLabel: String
    labels: [String]
    properties: [Property]
}

type Relationship @exclude {
    neoInternalId: String   # must be converted to Long before use
        startNodeKey: NodeKey
        endNodeKey: NodeKey
        keyProperties: [Property]
        type: String
    properties: [Property]
}

input PropertyInput {
    key: String
    datatype: String
    value: String
}

input NodeKeyInput {
    properties: [PropertyInput]
    label: String
}

input NodeInput {
    key: NodeKeyInput
    isRootNode: Boolean
    primaryNodeLabel: String    
    upsertLabels: [String]
    removeLabels: [String]
    upsertProperties: [PropertyInput]
    removeProperties: [String]
}

input RelationshipInput {
    startNodeKey: NodeKeyInput
    endNodeKey: NodeKeyInput
    keyProperties: [PropertyInput]
    type: String
    upsertProperties: [PropertyInput]
    removeProperties: [String]
}

input KeyConfigInput {
    nodeLabel: String
    relationshipType: String
    propertyKeys: [String]
}

input GraphModel {
    primaryNodeLabel: String
    subgraphConfig_labelFilter: String
    subgraphConfig_relationshipFilter: String
    keyConfig: [KeyConfigInput]
    remoteNodeLabels: [String]
}

input GraphDocInput {
    key: ID
    isPrivate: Boolean
    metadata: GraphDocMetadataInput
    subgraphModel: GraphModel
    securityDelegate: ID   # the ID of a GraphDoc to be used for User Role checks
    graph: GraphInput
}

input GraphDocRootsInput {
    graphDocs: [GraphDocInput]
    graphDocInput: GraphDocInput  # to add relationships between GraphDocRoots
}

input GraphInput {
    upsertNodes: [NodeInput]
    removeNodes: [NodeInput]
    upsertRelationships: [RelationshipInput]
    removeRelationships: [RelationshipInput]
}

input GraphDocMetadataInput {
    key: ID!
    cypherWorkbenchVersion: String
    title: String
    description: String
    notes: String
    viewSettings: String
    dateCreated: String
    dateUpdated: String
    isPublic: Boolean
    upsertCustomers: [CustomerInput]
    removeCustomers: [CustomerInput]
    upsertTags: [TagInput]
    removeTags: [TagInput]
}

input SubgraphConfigInput {
    labelFilter: String
    relationshipFilter: String
}

type Query {
    loadGraphDoc(graphDocKey: String): GraphDoc
    loadGraphDocAndDefaultView(graphDocKey: String): GraphDocAndView
    loadLastOpenedGraphDoc(graphDocType: String) : GraphDoc
    loadLastOpenedGraphDocAndDefaultView(graphDocType: String) : GraphDocAndView
    listGraphDocsX(graphDocType: String, myOrderBy: String, orderDirection: String): [GraphDoc]
    searchGraphDocsX(graphDocType: String, searchText: String, myOrderBy: String, orderDirection: String): [GraphDoc]
}

type Mutation {
    saveGraphDoc(graphDoc: GraphDocInput): Boolean
    grabLock(graphDocKey: String): Boolean
    saveGraphDocMetadata(graphDoc: GraphDocInput): Boolean
    saveGraphDocRootsWithMetadata(graphDocRoots: GraphDocRootsInput): Boolean
    saveGraphDocWithFullMetadata(graphDoc: GraphDocInput): Boolean
    removeGraphDoc(graphDocKey: String): Boolean
    removeGraphDocAndDefaultView(graphDocKey: String): Boolean
    removeGraphDocs(graphDocKeys: [String]): Boolean
}
`;
