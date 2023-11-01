export default `
# https://stackoverflow.com/questions/49693928/date-and-json-in-type-definition-for-graphql

type DataModel @exclude {
    key: ID!
    isPrivate: Boolean
    isInstanceModel: Boolean
    excludeValidationSections: [String]
    #relationshipIdCounter: Int
    metadata: DataModelMetadata @relationship(type: "HAS_METADATA", direction: OUT)
    nodeLabels: [NodeLabel!]! @relationship(type: "HAS_NODE_LABEL", direction: OUT)
    relationshipTypes: [RelationshipType!]! @relationship(type: "HAS_RELATIONSHIP_TYPE", direction: OUT)
    dataSources: [DataSource!]! @relationship(type: "HAS_DATA_SOURCE", direction: OUT)
    #users: [UserRole]!
    #newField: @cypher('MATCH (n) RETURN newField')
}

type DataModelMetadata @exclude {
    key: ID!
    cypherWorkbenchVersion: String
    title: String
    description: String
    notes: String
    viewSettings: String
    customers: [Customer!]! @relationship(type:"HAS_CUSTOMER", direction:OUT)
    tags: [Tag!]! @relationship(type:"HAS_TAG", direction:OUT)
    #versionHistory: [VersionHistoryEntry] @relationship(type:"HAS_VERSION_ENTRY", direction:OUT)
    #authors: [Author] @relationship(type:"HAS_AUTHOR", direction:OUT)
    owners: [User!]!
    dateCreated: String
    dateUpdated: String
    #industries: [Industry] @relationship(type:"HAS_INDUSTRY", direction:OUT)
    #useCases: [UseCase] @relationship(type:"HAS_USE_CASE", direction:OUT)
    dataModel: [DataModel!]! @relationship(type: "HAS_METADATA", direction: IN)
    isPublic: Boolean
    isInstanceModel: Boolean
    userRole: String
    userIsCreator: Boolean
}

type UserSettings @exclude {
    email: ID!
    name: String
    canvasSettings: String
}

type Customer @exclude {
    key: ID!
    name: String
}

# [{ versionNumber: 0.1, author(s): [], date: , comments: }]
type VersionHistoryEntry @exclude {
    key: ID!
    versionNumber: String
    authors: [Author!]! @relationship(type:"HAS_AUTHOR", direction:OUT)
    date: String
    comments: String
}

type Author @exclude {
    key: ID!
    name: String
}

type Tag @exclude {
    key: ID!
    tag: String!
}

# <dropdown> [e.g. Financial Services, Retail, Pharma, Life Sciences] (Nav to provide)
type Industry @exclude {
    name: String!
}

# <dropdown> [e.g. Fraud, MDM, Compliance] (Nav to provide)
type UseCase @exclude {
    name: String!
}

interface PropertyContainer @exclude {
    key: ID!
    properties: [PropertyDefinition!]! @relationship(type: "HAS_PROPERTY", direction: OUT)
    referenceData: String
    description: String
    fromDataSources: [DataSource!]! @relationship(type: "FROM_DATA_SOURCE", direction: OUT)
    display: String
    cypherOrigin: String
}

type NodeLabel implements PropertyContainer @exclude {
    key: ID!
    label: String
    display: String
    cypherOrigin: String
    referenceData: String
    indexes: String
    description: String
    fromDataSources: [DataSource!]! @relationship(type: "FROM_DATA_SOURCE", direction: OUT)
    properties: [PropertyDefinition!]! @relationship(type: "HAS_PROPERTY", direction: OUT)
    inboundRelationships: [RelationshipType!]! @relationship(type: "END_NODE_LABEL", direction: IN)
    outboundRelationships: [RelationshipType!]! @relationship(type: "START_NODE_LABEL", direction: IN)
    # TODO: constraints
    # TODO: indexedProperties
}

type RelationshipType implements PropertyContainer @exclude {
    key: ID!
    type: String
    cypherOrigin: String
    referenceData: String
    description: String
    display: String
    properties: [PropertyDefinition!]! @relationship(type: "HAS_PROPERTY", direction: OUT)
    startNodeLabel: NodeLabel @relationship(type: "START_NODE_LABEL", direction: OUT)
    endNodeLabel: NodeLabel @relationship(type: "END_NODE_LABEL", direction: OUT)
    fromDataSources: [DataSource!]! @relationship(type: "FROM_DATA_SOURCE", direction: OUT)
    outMinCardinality: String
    outMaxCardinality: String
    inMinCardinality: String
    inMaxCardinality: String
    # TODO: constraints
}

type PropertyDefinition @exclude {
    key: ID!
    name: String
    datatype: String
    referenceData: String
    description: String
    fromDataSources: [DataSource!]! @relationship(type: "FROM_DATA_SOURCE", direction: OUT)
    usedByPropertyContainer: [PropertyContainer!]! @relationship(type: "HAS_PROPERTY", direction: IN)
    isPartOfKey: Boolean
    isArray: Boolean
    isIndexed: Boolean
    hasUniqueConstraint: Boolean
    mustExist: Boolean
}

type DataSource @exclude {
    key: ID!
    withHeaders: String
    fromExpression: String
    variable: String
    fieldTerminator: String
}

input DataModelInput {
    key: ID!
    #relationshipIdCounter: Int
    isPrivate: Boolean
    isInstanceModel: Boolean
    excludeValidationSections: [String]
    metadata: DataModelMetadataInput
    upsertNodeLabels: [NodeLabelInput]
    removeNodeLabels: [NodeLabelInput]
    upsertRelationshipTypes: [RelationshipTypeInput]
    removeRelationshipTypes: [RelationshipTypeInput]
}

input NodeLabelDisplayInput {
    key: ID!
    display: String
}

input DataModelMetadataInput {
    key: ID!
    cypherWorkbenchVersion: String
    title: String
    description: String
    notes: String
    viewSettings: String
    dateCreated: String
    dateUpdated: String
    isPublic: Boolean
    upsertAuthors: [AuthorInput]
    removeAuthors: [AuthorInput]
    upsertCustomers: [CustomerInput]
    removeCustomers: [CustomerInput]
    upsertIndustries: [IndustryInput]
    removeIndustries: [IndustryInput]
    upsertTags: [TagInput]
    removeTags: [TagInput]
    upsertUseCases: [UseCaseInput]
    removeUseCases: [UseCaseInput]
}

input NodeLabelInput {
    key: ID!
    label: String
    referenceData: String
    indexes: String
    description: String
    display: String
    cypherOrigin: String
    upsertPropertyDefinitions: [PropertyDefinitionInput]
    removePropertyDefinitions: [PropertyDefinitionInput]
}

input RelationshipTypeInput {
    key: ID!
    type: String
    startNodeLabelKey: ID,
    endNodeLabelKey: ID,
    referenceData: String
    description: String
    display: String
    cypherOrigin: String
    outMinCardinality: String
    outMaxCardinality: String
    inMinCardinality: String
    inMaxCardinality: String
    upsertPropertyDefinitions: [PropertyDefinitionInput]
    removePropertyDefinitions: [PropertyDefinitionInput]
}

input PropertyDefinitionInput {
    key: ID!
    name: String
    datatype: String
    referenceData: String
    description: String
    isPartOfKey: Boolean
    isArray: Boolean
    isIndexed: Boolean
    hasUniqueConstraint: Boolean
    mustExist: Boolean
    #fromDataSources: [DataSource!]! @relationship(type: "FROM_DATA_SOURCE", direction: OUT)
    #usedByPropertyContainer: [PropertyContainer!]! @relationship(type: "HAS_PROPERTY", direction: IN)
}

input CustomerInput {
    key: ID!
    name: String
}

input AuthorInput {
    key: ID!
    name: String
}

input TagInput {
    key: ID!
    tag: String!
}

input IndustryInput {
    name: String!
}

input UseCaseInput {
    name: String!
}

type Query {
    loadDataModel(dataModelKey: String, updateLastOpenedModel: Boolean): DataModel
    loadLastOpenedModel : DataModel
    findAuthors(searchText: String): [Author]
    findCustomers(searchText: String): [Customer]
    findIndustries(searchText: String): [Industry]
    findTags(searchText: String): [Tag]
    findUseCases(searchText: String): [UseCase]
    listDataModelsX(myOrderBy: String, orderDirection: String, skip: Int, limit: Int): [DataModel]
    searchDataModelsX(searchText: String, myOrderBy: String, orderDirection: String, skip: Int, limit: Int): [DataModel]
}

type Mutation {
    saveDataModel(dataModel: DataModelInput): Boolean
    grabModelLock(dataModelKey: String): Boolean
    saveDataModelMetadata(dataModelMetadata: DataModelMetadataInput): Boolean
    saveDataModelWithFullMetadata(dataModel: DataModelInput): Boolean
    saveNodeLabelDisplay(nodeLabels: [NodeLabelDisplayInput]): Boolean
    removeDataModel(dataModelKey: String): Boolean
}
`;
