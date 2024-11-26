
const RecordAccessTimeSnippet = `
SET u.lastAccessTime = timestamp()
MERGE (u)-[stats:STATS]->(dataModel)
  ON CREATE SET 
    stats.firstAccessTime = timestamp(),
  	stats.accessTime = timestamp(),
	stats.numAccesses = 1
  ON MATCH SET 
  	stats.previousAccessTimes = 
		([stats.accessTime] + CASE WHEN stats.previousAccessTimes IS NOT NULL THEN stats.previousAccessTimes ELSE [] END)[0..500],
	stats.accessTime = timestamp(),
	stats.numAccesses = stats.numAccesses + 1
`

export const SaveNodeLabelDisplay = `
WITH $nodeLabels as nodeLabels, $email as email
MATCH (u:User {email:email})
WITH u, nodeLabels, email
UNWIND nodeLabels as nodeLabel
MATCH (nl:NodeLabel {key: nodeLabel.key})<-[:HAS_NODE_LABEL]-(dataModel:DataModel)
WITH dataModel, u, email, nodeLabel, nl
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(nl),"permission denied (wrong org)",[0])
WITH dataModel, u, email, collect({ matchedNodeLabel: nl, nodeLabel: nodeLabel }) as nodeLabelPairs
CALL apoc.util.validate(NOT (exists((u)<-[:OWNER|MEMBER]-(dataModel)) OR u:Admin), "permission denied", [0])
CALL apoc.util.validate(
    dataModel.lockedByUser IS NOT NULL              /* model has been locked already */
    AND dataModel.lockedByUser <> email         /* locking user is not the current user */
    AND (timestamp() - dataModel.lockTimestamp) < (2 * 3600 * 1000) /* locking user has edited it within the past 2 hours */
, "locked by user '" + dataModel.lockedByUser + "' at " + dataModel.lockTimestamp, [0])
WITH dataModel, email, nodeLabelPairs
SET dataModel += {
    lockTimestamp: timestamp(),
    lockedByUser: email
}
WITH nodeLabelPairs
UNWIND nodeLabelPairs as nodeLabelPair
WITH nodeLabelPair.matchedNodeLabel as matchedNodeLabel, nodeLabelPair.nodeLabel as nodeLabel, nodeLabelPair
SET matchedNodeLabel.display = nodeLabel.display
WITH count(nodeLabelPair) as numProcessed
RETURN true as success
`

export const GrabModelLock = `
WITH $dataModelKey as dataModelKey, $email as email
MATCH (u:User {email:email})
MATCH (dataModel:DataModel {key: dataModelKey})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(dataModel),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (exists((u)<-[:OWNER|MEMBER]-(dataModel)) OR u:Admin), "permission denied", [0])
WITH dataModel, email
SET dataModel += {
    lockTimestamp: timestamp(),
    lockedByUser: email
}
RETURN true as success
`

export const SaveDataModel = `
/* data model */
WITH $modelInfo as modelInfo, $email as email
MATCH (u:User {email:email})
MATCH (dataModel:DataModel {key: modelInfo.key})
WITH u, dataModel, email, modelInfo
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(dataModel),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER]-(dataModel)) OR u:Admin),"permission denied",[0])
CALL apoc.util.validate(
    dataModel.lockedByUser IS NOT NULL              /* model has been locked already */
    AND dataModel.lockedByUser <> email         /* locking user is not the current user */
    AND (timestamp() - dataModel.lockTimestamp) < (2 * 3600 * 1000) /* locking user has edited it within the past 2 hours */
, "locked by user '" + dataModel.lockedByUser + "' at " + dataModel.lockTimestamp, [0])

WITH u, dataModel, email, modelInfo
SET dataModel += {
    lockTimestamp: timestamp(),
    lockedByUser: email,
    isInstanceModel: modelInfo.isInstanceModel,
    excludeValidationSections: modelInfo.excludeValidationSections
}
${RecordAccessTimeSnippet}
WITH u, dataModel, modelInfo

/* data model metadata */
CALL apoc.do.when(NOT modelInfo.metadata IS NULL,
"MATCH (dataModelMetadata:DataModelMetadata {key: metadata.key})
SET dataModelMetadata += apoc.map.submap(metadata, apoc.coll.intersection(keys(metadata),
													['cypherWorkbenchVersion','title','description','notes','viewSettings']), [], false)
SET dataModelMetadata.dateCreated = CASE WHEN NOT metadata.dateCreated IS NULL
    THEN metadata.dateCreated ELSE null END
SET dataModelMetadata.dateUpdated = CASE WHEN NOT metadata.dateUpdated IS NULL
    THEN metadata.dateUpdated ELSE null END

// this is only here to ensure the relationship exists in case somehow it gets deleted
MERGE (dataModel)-[:HAS_METADATA]->(dataModelMetadata)
RETURN 1
","RETURN 0",
{user: u, dataModel: dataModel, metadata: modelInfo.metadata}) YIELD value

WITH u, dataModel, modelInfo,
  CASE WHEN modelInfo.upsertNodeLabels IS NULL THEN []
    ELSE modelInfo.upsertNodeLabels END as upsertNodeLabels,
  CASE WHEN modelInfo.removeNodeLabels IS NULL THEN []
    ELSE modelInfo.removeNodeLabels END as removeNodeLabels,
  CASE WHEN modelInfo.upsertRelationshipTypes IS NULL THEN []
    ELSE modelInfo.upsertRelationshipTypes END as upsertRelationshipTypes,
  CASE WHEN modelInfo.removeRelationshipTypes IS NULL THEN []
    ELSE modelInfo.removeRelationshipTypes END as removeRelationshipTypes

/* upsert node labels */
CALL apoc.do.when(size(upsertNodeLabels) > 0,
"UNWIND upsertNodeLabels as nodeLabel
MERGE (nl:NodeLabel {key: nodeLabel.key})
SET nl += apoc.map.submap(nodeLabel, apoc.coll.intersection(keys(nodeLabel),
									['label','referenceData','indexes','description','display','cypherOrigin']), [], false)
WITH *
CALL apoc.create.addLabels([nl], [user.primaryOrganization]) YIELD node
MERGE (dataModel)-[:HAS_NODE_LABEL]->(nl)
WITH user, dataModel, nl,
	CASE WHEN nodeLabel.upsertPropertyDefinitions IS NULL THEN []
  	  ELSE nodeLabel.upsertPropertyDefinitions END as upsertPropertyDefinitions,
	CASE WHEN nodeLabel.removePropertyDefinitions IS NULL THEN []
  	  ELSE nodeLabel.removePropertyDefinitions END as removePropertyDefinitions

/* upsert node label properties */
FOREACH (propDef IN upsertPropertyDefinitions |
	MERGE (pd:PropertyDefinition {key: propDef.key})
	SET pd += apoc.map.submap(propDef, apoc.coll.intersection(keys(propDef),
										['name','datatype','referenceData','description','isPartOfKey',
										'isArray','isIndexed','hasUniqueConstraint','mustExist']), [], false)
	MERGE (nl)-[:HAS_PROPERTY]->(pd)
)
// I would do this in FOREACH, but FOREACH won't allow procedures to be called inside of it
WITH *
CALL apoc.do.when(size(upsertPropertyDefinitions) > 0,
   'UNWIND upsertPropertyDefinitions as propDef
    MATCH (n:PropertyDefinition {key: propDef.key})
    WITH n, user
    CALL apoc.create.addLabels([n], [user.primaryOrganization]) YIELD node
    WITH collect(node) as _
    RETURN 1',
    'RETURN 0',
    {user: user, upsertPropertyDefinitions: upsertPropertyDefinitions}) YIELD value

WITH *
UNWIND removePropertyDefinitions as propDef
MATCH (pd:PropertyDefinition {key: propDef.key})
DETACH DELETE pd
WITH collect(pd) as deletedProperties
RETURN 1
","RETURN 0",
{user: u, dataModel: dataModel, upsertNodeLabels: upsertNodeLabels}) YIELD value

WITH u, dataModel, removeNodeLabels, upsertRelationshipTypes, removeRelationshipTypes

/* remove node labels */
CALL apoc.do.when(size(removeNodeLabels) > 0,
"UNWIND removeNodeLabels as nodeLabel
MATCH (nl:NodeLabel {key: nodeLabel.key})
OPTIONAL MATCH (nl)-[:HAS_PROPERTY]->(pd)
WITH nl, collect(pd) as propDefsToDelete
OPTIONAL MATCH (nl)<-[:START_NODE_LABEL|:END_NODE_LABEL]-(relationshipType)
WITH nl, propDefsToDelete, collect(relationshipType.key) as relationshipTypeKeysToDelete
DETACH DELETE nl
WITH nl, propDefsToDelete, relationshipTypeKeysToDelete
UNWIND propDefsToDelete as propDefToDelete
DETACH DELETE propDefToDelete
WITH collect(distinct(relationshipTypeKeysToDelete)) as relationshipTypeKeysToDeleteList
WITH apoc.coll.flatten(relationshipTypeKeysToDeleteList) as relationshipTypeKeysToDelete
RETURN relationshipTypeKeysToDelete
", "RETURN [] as relationshipTypeKeysToDelete",
{user: u, dataModel: dataModel, removeNodeLabels: removeNodeLabels}) YIELD value

WITH u, dataModel, upsertRelationshipTypes,
	[rt IN removeRelationshipTypes | rt.key] as rtKeySet1, value.relationshipTypeKeysToDelete as rtKeySet2
WITH u, dataModel, upsertRelationshipTypes, apoc.coll.union(rtKeySet1, rtKeySet2) as relationshipTypeKeysToDelete

/* upsert relationship types */
CALL apoc.do.when(size(upsertRelationshipTypes) > 0,
"UNWIND upsertRelationshipTypes as relationshipType
MERGE (rt:RelationshipType {key: relationshipType.key})
SET rt += apoc.map.submap(relationshipType, apoc.coll.intersection(keys(relationshipType),
									['type','referenceData','description','display','cypherOrigin',
                                     'outMinCardinality','outMaxCardinality','inMinCardinality','inMaxCardinality']), [], false)
WITH *
CALL apoc.create.addLabels([rt], [user.primaryOrganization]) YIELD node
MERGE (dataModel)-[:HAS_RELATIONSHIP_TYPE]->(rt)
MERGE (startNodeLabel:NodeLabel {key: relationshipType.startNodeLabelKey})
MERGE (endNodeLabel:NodeLabel {key: relationshipType.endNodeLabelKey})
MERGE (rt)-[:START_NODE_LABEL]->(startNodeLabel)
MERGE (rt)-[:END_NODE_LABEL]->(endNodeLabel)

WITH user, dataModel, rt, relationshipType, endNodeLabel, startNodeLabel
OPTIONAL MATCH (rt)-[r1:START_NODE_LABEL]->(endNodeLabel)
WHERE startNodeLabel <> endNodeLabel
OPTIONAL MATCH (rt)-[r2:END_NODE_LABEL]->(startNodeLabel)
WHERE startNodeLabel <> endNodeLabel
DELETE r1, r2

WITH user, dataModel, rt,
	CASE WHEN relationshipType.upsertPropertyDefinitions IS NULL THEN []
  	  ELSE relationshipType.upsertPropertyDefinitions END as upsertPropertyDefinitions,
	CASE WHEN relationshipType.removePropertyDefinitions IS NULL THEN []
  	  ELSE relationshipType.removePropertyDefinitions END as removePropertyDefinitions

/* upsert node label properties */
FOREACH (propDef IN upsertPropertyDefinitions |
	MERGE (pd:PropertyDefinition {key: propDef.key})
	SET pd += apoc.map.submap(propDef, apoc.coll.intersection(keys(propDef),
										['name','datatype','referenceData','description','isArray','mustExist']), [], false)
	MERGE (rt)-[:HAS_PROPERTY]->(pd)
)
// I would do this in FOREACH, but FOREACH won't allow procedures to be called inside of it
WITH *
CALL apoc.do.when(size(upsertPropertyDefinitions) > 0,
   'UNWIND upsertPropertyDefinitions as propDef
    MATCH (n:PropertyDefinition {key: propDef.key})
    WITH n, user
    CALL apoc.create.addLabels([n], [user.primaryOrganization]) YIELD node
    WITH collect(node) as _
    RETURN 1',
    'RETURN 0',
    {user: user, upsertPropertyDefinitions: upsertPropertyDefinitions}) YIELD value

WITH *
UNWIND removePropertyDefinitions as propDef
MATCH (pd:PropertyDefinition {key: propDef.key})
DETACH DELETE pd
WITH collect(pd) as deletedProperties
RETURN 1
","RETURN 0",
{user: u, dataModel: dataModel, upsertRelationshipTypes: upsertRelationshipTypes}) YIELD value

WITH u, dataModel, relationshipTypeKeysToDelete

/* remove relationship types */
CALL apoc.do.when(size(relationshipTypeKeysToDelete) > 0,
"UNWIND relationshipTypeKeysToDelete as relationshipTypeKey
MATCH (rt:RelationshipType {key: relationshipTypeKey})
OPTIONAL MATCH (rt)-[:HAS_PROPERTY]->(pd)
WITH rt, collect(pd) as propDefsToDelete
DETACH DELETE rt
WITH rt, propDefsToDelete
UNWIND propDefsToDelete as propDefToDelete
DETACH DELETE propDefToDelete
WITH collect(distinct(rt)) as deletedRelationshipTypes
RETURN 1
", "RETURN 0",
{user: u, dataModel: dataModel, relationshipTypeKeysToDelete: relationshipTypeKeysToDelete}) YIELD value
RETURN dataModel.key as key
`

export const LoadDataModel = `
WITH $dataModelKey as dataModelKey, $updateLastOpenedModel as updateLastOpenedModel
MATCH (u:User {email:$email})
MATCH (model:DataModel {key:dataModelKey})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(model),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|VIEWER|KM_OWNER|KM_MEMBER|KM_VIEWER]-(model)) OR model.isPrivate <> true OR u:Admin),"permission denied",[0])
CALL apoc.do.when(updateLastOpenedModel = true,
  "SET u.lastOpenedModel = dataModelKey
  ${RecordAccessTimeSnippet}
  RETURN 1",
  "RETURN 0", { u: u, dataModelKey: dataModelKey, dataModel: model }
) YIELD value as updateLastOpenedModelResult

WITH u, model
OPTIONAL MATCH (model)-[role:OWNER|VIEWER|MEMBER]->(u)
WITH u, model, collect(type(role)) as roles

/* node labels */
OPTIONAL MATCH (model)-[:HAS_NODE_LABEL]->(nodeLabel)
 WHERE u.primaryOrganization IN labels(nodeLabel)
WITH u, model, roles, nodeLabel
OPTIONAL MATCH (nodeLabel)-[:HAS_PROPERTY]->(property)
  WHERE u.primaryOrganization IN labels(property)
  
WITH u, model, roles, nodeLabel, {
  key: property.key,
  name: property.name,
  datatype: property.datatype,
  referenceData: property.referenceData,
  description: property.description,
  isPartOfKey: property.isPartOfKey,
  isArray: property.isArray,
  isIndexed: property.isIndexed,
  hasUniqueConstraint: property.hasUniqueConstraint,
  mustExist: property.mustExist
} as propertyOutput
WITH u, model, roles, nodeLabel, collect(propertyOutput) as properties
WITH u, model, roles, nodeLabel, [x IN properties WHERE x.key IS NOT NULL] as properties
WITH u, model, roles, {
  key: nodeLabel.key,
  label: nodeLabel.label,
  display: nodeLabel.display,
  referenceData: nodeLabel.referenceData,
  indexes: nodeLabel.indexes,
  description: nodeLabel.description,
  properties: properties
} as nodeLabel
WITH u, model, roles, collect(nodeLabel) as nodeLabels
WITH u, model, roles, [x IN nodeLabels WHERE x.key IS NOT NULL] as nodeLabels

/* relationship types */
OPTIONAL MATCH (model)-[:HAS_RELATIONSHIP_TYPE]->(relationshipType),
    (relationshipType)-[:START_NODE_LABEL]->(startNodeLabel),
    (relationshipType)-[:END_NODE_LABEL]->(endNodeLabel)
  WHERE u.primaryOrganization IN labels(relationshipType)
    AND u.primaryOrganization IN labels(startNodeLabel)
    AND u.primaryOrganization IN labels(endNodeLabel)
WITH u, model, roles, nodeLabels, relationshipType, startNodeLabel, endNodeLabel
OPTIONAL MATCH (relationshipType)-[:HAS_PROPERTY]->(property)
  WHERE u.primaryOrganization IN labels(property)
WITH u, model, roles, nodeLabels, relationshipType, startNodeLabel, endNodeLabel, {
  key: property.key,
  name: property.name,
  datatype: property.datatype,
  referenceData: property.referenceData,
  description: property.description,
  isArray: property.isArray,
  mustExist: property.mustExist
} as propertyOutput
WITH u, model, roles, nodeLabels, relationshipType, startNodeLabel, endNodeLabel, collect(propertyOutput) as properties
WITH u, model, roles, nodeLabels, relationshipType, startNodeLabel, endNodeLabel, [x IN properties WHERE x.key IS NOT NULL] as properties
WITH u, model, roles, nodeLabels, {
  key: relationshipType.key,
  startNodeLabel: {
    key: startNodeLabel.key
  },
  endNodeLabel: {
    key: endNodeLabel.key
  },
  type: relationshipType.type,
  display: relationshipType.display,
  referenceData: relationshipType.referenceData,
  description: relationshipType.description,
  outMinCardinality: relationshipType.outMinCardinality,
  outMaxCardinality: relationshipType.outMaxCardinality,
  inMinCardinality: relationshipType.inMinCardinality,
  inMaxCardinality: relationshipType.inMaxCardinality,
  properties: properties
} as relationshipType
WITH u, model, roles, nodeLabels, collect(relationshipType) as relationshipTypes
WITH u, model, roles, nodeLabels, [x IN relationshipTypes WHERE x.key IS NOT NULL] as relationshipTypes
OPTIONAL MATCH (model)-[:HAS_METADATA]->(metadata)
  WHERE u.primaryOrganization IN labels(metadata)

/* return info */
RETURN {
	key: model.key,
  excludeValidationSections: model.excludeValidationSections,
    isPrivate: model.isPrivate,
    metadata: {
        key: metadata.key,
        title: metadata.title,
        isPublic: not(model.isPrivate),
        userRole: roles[0],
        viewSettings: metadata.viewSettings
    },
    nodeLabels: nodeLabels,
	relationshipTypes: relationshipTypes
} as dataModel
`

export const RemoveDataModel = `
WITH $dataModelKey as dataModelKey, $email as email
MATCH (u:User{email:email})
MATCH (dataModel:DataModel {key:dataModelKey})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(dataModel),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER]-(dataModel)) OR u:Admin),"permission denied",[0])
CALL apoc.util.validate(
    dataModel.lockedByUser IS NOT NULL              /* model has been locked already */
    AND dataModel.lockedByUser <> email         /* locking user is not the current user */
    AND (timestamp() - dataModel.lockTimestamp) < (2 * 3600 * 1000) /* locking user has edited it within the past 2 hours */
, "locked by user '" + dataModel.lockedByUser + "' at " + dataModel.lockTimestamp, [0])
OPTIONAL MATCH (dataModel:DataModel {key:dataModelKey})-[:HAS_METADATA]->(metadata)
DETACH DELETE metadata
WITH dataModel, dataModelKey
OPTIONAL MATCH (dataModel:DataModel {key:dataModelKey})-[:HAS_NODE_LABEL]->(nodeLabel)
WITH dataModel, dataModelKey, nodeLabel
OPTIONAL MATCH (nodeLabel)-[:HAS_PROPERTY]->(nodeProperty)
DETACH DELETE nodeProperty
WITH dataModel, dataModelKey, nodeLabel, collect(nodeProperty) as deletedProperties
DETACH DELETE nodeLabel
WITH dataModel, dataModelKey, collect(nodeLabel) as deletedNodeLabels
OPTIONAL MATCH (dataModel:DataModel {key:dataModelKey})-[:HAS_RELATIONSHIP_TYPE]->(relationshipType)
WITH dataModel, dataModelKey, relationshipType
OPTIONAL MATCH (relationshipType)-[:HAS_PROPERTY]->(relationshipProperty)
DETACH DELETE relationshipProperty
WITH dataModel, dataModelKey, relationshipType, collect(relationshipProperty) as deletedProperties
DETACH DELETE relationshipType
WITH dataModel, dataModelKey, collect(relationshipType) as deletedRelationshipTypes
DETACH DELETE dataModel
RETURN true as success
`

export const SaveDataModelMetadata = `
WITH $dataModelMetadata as metadata,$email as e
MATCH (u:User {email:e})
MATCH (dataModel:DataModel {key:metadata.key})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(dataModel),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER]-(dataModel)) OR u:Admin),"permission denied",[0])
${RecordAccessTimeSnippet}
MERGE (dataModelMetadata:DataModelMetadata {key: metadata.key})
  WITH *
  CALL apoc.create.addLabels([dataModelMetadata], [u.primaryOrganization]) YIELD node
WITH *
MERGE (dataModelMetadata)<-[:HAS_METADATA]-(dataModel)
SET dataModel.isPrivate = not(metadata.isPublic)
SET dataModelMetadata += apoc.map.submap(metadata, apoc.coll.intersection(keys(metadata),
													['cypherWorkbenchVersion','title','description','notes','viewSettings']), [], false)
SET dataModelMetadata.dateCreated = CASE WHEN NOT metadata.dateCreated IS NULL
    THEN metadata.dateCreated ELSE null END
SET dataModelMetadata.dateUpdated = CASE WHEN NOT metadata.dateUpdated IS NULL
    THEN metadata.dateUpdated ELSE null END
WITH u, metadata, dataModelMetadata,
    CASE WHEN metadata.upsertAuthors IS NULL THEN [] ELSE metadata.upsertAuthors END as upsertAuthors,
    CASE WHEN metadata.removeAuthors IS NULL THEN [] ELSE metadata.removeAuthors END as removeAuthors,
    CASE WHEN metadata.upsertCustomers IS NULL THEN [] ELSE metadata.upsertCustomers END as upsertCustomers,
    CASE WHEN metadata.removeCustomers IS NULL THEN [] ELSE metadata.removeCustomers END as removeCustomers,
    CASE WHEN metadata.upsertIndustries IS NULL THEN [] ELSE metadata.upsertIndustries END as upsertIndustries,
    CASE WHEN metadata.removeIndustries IS NULL THEN [] ELSE metadata.removeIndustries END as removeIndustries,
    CASE WHEN metadata.upsertTags IS NULL THEN [] ELSE metadata.upsertTags END as upsertTags,
    CASE WHEN metadata.removeTags IS NULL THEN [] ELSE metadata.removeTags END as removeTags,
    CASE WHEN metadata.upsertUseCases IS NULL THEN [] ELSE metadata.upsertUseCases END as upsertUseCases,
    CASE WHEN metadata.removeUseCases IS NULL THEN [] ELSE metadata.removeUseCases END as removeUseCases
WITH u, dataModelMetadata, [
{ upsert: upsertAuthors, nodeLabel: 'Author', relationshipType: 'HAS_AUTHOR', keyProperty: 'key', setProperties: ['name'] },
{ upsert: upsertCustomers, nodeLabel: 'Customer', relationshipType: 'HAS_CUSTOMER', keyProperty: 'key', setProperties: ['name'] },
{ upsert: upsertIndustries, nodeLabel: 'Industry', relationshipType: 'HAS_INDUSTRY', keyProperty: 'name', setProperties: [] },
{ upsert: upsertTags, nodeLabel: 'Tag', relationshipType: 'HAS_TAG', keyProperty: 'key', setProperties: ['tag'] },
{ upsert: upsertUseCases, nodeLabel: 'UseCase', relationshipType: 'HAS_USE_CASE', keyProperty: 'name', setProperties: [] }
] as upserts, [
{ remove: removeAuthors, nodeLabel: 'Author', relationshipType: 'HAS_AUTHOR', keyProperty: 'key' },
{ remove: removeCustomers, nodeLabel: 'Customer', relationshipType: 'HAS_CUSTOMER', keyProperty: 'key' },
{ remove: removeIndustries, nodeLabel: 'Industry', relationshipType: 'HAS_INDUSTRY', keyProperty: 'name' },
{ remove: removeTags, nodeLabel: 'Tag', relationshipType: 'HAS_TAG', keyProperty: 'key' },
{ remove: removeUseCases, nodeLabel: 'UseCase', relationshipType: 'HAS_USE_CASE', keyProperty: 'name' }
] as removes, {
    upsertCypher:
        "UNWIND collection as item
        MERGE (n:$nodeLabel {$keyProperty: item.$keyProperty}) $SET_STMTS
        MERGE (dataModelMetadata)-[:$relationshipType]->(n)
        WITH *
        CALL apoc.create.addLabels([n], [user.primaryOrganization]) YIELD node
        WITH collect(n) as _
        RETURN 1 as result",
    removeCypher:
        "UNWIND collection as item
        MATCH (dataModelMetadata)-[r:$relationshipType]->(n:$nodeLabel {$keyProperty: item.$keyProperty})
        DELETE r
        WITH collect(n) as _
        RETURN 1 as result"
} as templates

/* process upserts */
UNWIND upserts as upsertItem
WITH u, dataModelMetadata, removes, templates, upsertItem,
  reduce(s = templates.upsertCypher, x IN ['nodeLabel','keyProperty','relationshipType'] | replace(s, '$' + x, upsertItem[x])) as upsertCypher,
  reduce(s = '', x IN upsertItem.setProperties | s + '\nSET n.' + x + ' = item.' + x) as setStatements
WITH u, dataModelMetadata, removes, templates, upsertItem, replace(upsertCypher, '$SET_STMTS', setStatements) as upsertCypher
/* RETURN upsertCypher */
CALL apoc.do.when(size(upsertItem.upsert) > 0, upsertCypher, "RETURN 0 as result",
    {dataModelMetadata: dataModelMetadata, collection: upsertItem.upsert, user: u}) YIELD value
WITH u, dataModelMetadata, removes, templates, collect(value) as upsertReturnValues

/* process removes */
UNWIND removes as removeItem
WITH u, dataModelMetadata, removeItem, upsertReturnValues,
  reduce(s = templates.removeCypher, x IN ['nodeLabel','keyProperty','relationshipType'] | replace(s, '$' + x, removeItem[x])) as removeCypher
/* RETURN removeCypher */
CALL apoc.do.when(size(removeItem.remove) > 0, removeCypher, "RETURN 0 as result",
    {dataModelMetadata: dataModelMetadata, collection: removeItem.remove}) YIELD value
WITH dataModelMetadata, upsertReturnValues, collect(value) as removeReturnValues
RETURN dataModelMetadata.key as key
`
