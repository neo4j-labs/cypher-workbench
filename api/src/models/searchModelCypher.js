
/* cypher snippet to handle formatting of return */
const ModelMetadataWith = `
OPTIONAL MATCH (metadata)-[:HAS_TAG]->(tag:Tag)
WHERE user.primaryOrganization IN labels(tag)
WITH params, model, user, metadata, collect(tag) as tags
OPTIONAL MATCH (metadata)-[:HAS_CUSTOMER]->(customer:Customer)
WHERE user.primaryOrganization IN labels(customer)
WITH params, model, user, metadata, tags, collect(customer) as customers
/*
OPTIONAL MATCH (metadata)-[:HAS_AUTHOR]->(author:Author)
WHERE user.primaryOrganization IN labels(author)
WITH params, model, user, metadata, tags, customers, collect(author) as authors
*/
OPTIONAL MATCH (model)-[:OWNER]->(owners:User)
WHERE user.primaryOrganization IN labels(owners)
WITH params, model, user, metadata, tags, customers, collect(owners) as owners
OPTIONAL MATCH (model)-[role:CREATOR|OWNER|VIEWER|MEMBER]->(user)
WITH params, model, user, metadata, tags, customers, owners, collect(type(role)) as roles
WITH params, model, user, metadata, tags, customers, owners, roles,
    CASE WHEN 'CREATOR' IN roles THEN true ELSE false END as userIsCreator,
    [x IN roles WHERE x <> 'CREATOR'][0] as userRole

WITH params, model.key as key, {
      key: metadata.key,
      cypherWorkbenchVersion: metadata.cypherWorkbenchVersion,
      title: metadata.title,
      dateCreated: metadata.dateCreated,
      dateUpdated: metadata.dateUpdated,
      description: metadata.description,
      notes: metadata.notes,
      tags: [x IN tags | x {.key, .tag}],
      customers: [x IN customers | x {.key, .name}],
		/* authors: [x IN authors | x {.key, .name}], */
      owners: [x IN owners | x { .email }],
      isPublic: not(model.isPrivate),
      isInstanceModel: CASE WHEN model.isInstanceModel IS NOT NULL
          THEN model.isInstanceModel
          ELSE false
        END,
      userRole: userRole,
      userIsCreator: userIsCreator
    } as metadata
`

export const ListModels = `
WITH {
  email: $email
} as params
MATCH (user:User {email:params.email})
MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
  AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) $INCLUDE_PUBLIC OR user:Admin)
${ModelMetadataWith}
ORDER BY metadata[$myOrderBy] $DESC
SKIP toInteger($skip)
LIMIT toInteger($limit)
RETURN key, metadata
`

export const IncludePublicSnippet = "OR model.isPrivate <> true";

export const ListModelsAndAddExplcitMatches = `
WITH {
  explicitKeysToSearchFor: coalesce($explicitKeysToSearchFor, []),
  email: $email
} as params
MATCH (user:User {email:params.email})
MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
  AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) $INCLUDE_PUBLIC OR user:Admin)
${ModelMetadataWith}
ORDER BY metadata[$myOrderBy] $DESC
SKIP toInteger($skip)
LIMIT toInteger($limit)

// we want to also include explicitKeysToSearchFor if they aren't in the list
WITH params, collect(key) as keyList, collect(metadata) as metadataList
WITH params, keyList, metadataList, 
  apoc.coll.subtract(params.explicitKeysToSearchFor, keyList) as additionalKeysToFetch
CALL apoc.when(size(additionalKeysToFetch) > 0,
  "
    MATCH (user:User {email:params.email})
    OPTIONAL MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
    WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
      AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) $INCLUDE_PUBLIC OR user:Admin)
      AND model.key IN params.explicitKeysToSearchFor
    ${ModelMetadataWith}
    WHERE model.key IS NOT NULL
    RETURN collect(key) as additionalKeys, collect(metadata) as additionalMetadata
  ",
  "RETURN [] as additionalKeys, [] as additionalMetadata",
  {
    params: { email: params.email, explicitKeysToSearchFor: additionalKeysToFetch }
  }
) YIELD value

// combine any explicit matches with the original list
WITH keyList + value.additionalKeys as keyList, metadataList + value.additionalMetadata as metadataList
UNWIND range(0, size(keyList)-1, 1) as index
WITH keyList[index] as key, metadataList[index] as metadata

// final sort
ORDER BY metadata[$myOrderBy] $DESC
RETURN key, metadata
`

// export const SearchForModel = `
// WITH $searchText as searchText, $email as email
// MATCH (user:User {email:email})
// CALL db.index.fulltext.queryNodes("dataModelMetadata", searchText) YIELD node, score
// WITH user, node, score
//   WHERE user.primaryOrganization IN labels(node)
// WITH user, node, score
// ORDER BY score DESC
// CALL apoc.when('DataModelMetadata' IN labels(node),
// /* Full-text search matched a DataModelMetadata node */
// "WITH $node as node, $score as score
// WITH collect(node) as matches, score
// RETURN matches, score",
// /* Full-text search matched a node connected to DataModelMetadata, like Tag or Author */
// "WITH $node as node, $score as score
// MATCH (metadata:DataModelMetadata)-[]->(node)
// WITH collect(metadata) as matches, score
// RETURN matches, score",
// {node: node, score: score}) YIELD value
// /* We may have matched the same DataModelMetdata node more than once, just take the one with the highest score */
// WITH user, value.matches as matches, value.score as score
// UNWIND matches as metadata
// WITH user, metadata, max(score) as score
// ORDER BY score DESC, metadata.dateUpdated DESC
// /* now take matches, format, and return */
// MATCH (model:DataModel)-[:HAS_METADATA]->(metadata)
// WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
//   AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) OR model.isPrivate <> true OR user:Admin)
// ${ModelMetadataWith}
// `


export const SearchForModel = `
WITH coalesce($searchText,'') as searchText, {
  email: $email
} as params
MATCH (user:User {email: params.email})
OPTIONAL MATCH (node:DataModelMetadata) 
  WHERE toLower(node.title) =~ '(?i).*'+searchText+'.*'
    AND user.primaryOrganization IN labels(node)
WITH searchText, params, user, [x IN collect({
  node: node,
  score: (15.0 * size(searchText)) / size(node.title)
}) WHERE x.node IS NOT NULL]  as regexModelMatches
CALL {
  WITH user, searchText
  CALL apoc.when(size(searchText) > 0,
    'CALL db.index.fulltext.queryNodes("dataModelMetadata", searchText) YIELD node, score
    WITH node, score
    WHERE user.primaryOrganization IN labels(node)
    WITH collect({ node: node, score: score }) as fullTextMatches
    RETURN fullTextMatches',
    'RETURN [] as fullTextMatches',
    { user: user, searchText: searchText }) YIELD value
  RETURN value.fullTextMatches as fullTextMatches
}
WITH params, user, regexModelMatches + fullTextMatches as allMatches
UNWIND allMatches as match
WITH params, user, match.node as node, match.score as score
ORDER BY score DESC
CALL apoc.when('DataModelMetadata' IN labels(node),
/* Full-text search matched a DataModelMetadata node */
"WITH $node as node, $score as score
WITH collect(node) as matches, score
RETURN matches, score",
/* Full-text search matched a node connected to DataModelMetadata, like Tag or Author */
"WITH $node as node, $score as score
MATCH (metadata:DataModelMetadata)-[]->(node)
WITH collect(metadata) as matches, score
RETURN matches, score",
{node: node, score: score}) YIELD value
/* We may have matched the same DataModelMetdata node more than once, just take the one with the highest score */
WITH params, user, value.matches as matches, value.score as score
UNWIND matches as metadata
WITH params, user, metadata, max(score) as score
ORDER BY score DESC, metadata.dateUpdated DESC
/* now take matches, format, and return */
MATCH (model:DataModel)-[:HAS_METADATA]->(metadata)
WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
  AND (model)-[:OWNER|MEMBER|VIEWER]->(user) $INCLUDE_PUBLIC OR user:Admin
${ModelMetadataWith}
ORDER BY metadata[$myOrderBy] $DESC
SKIP toInteger($skip)
LIMIT toInteger($limit)
RETURN key, metadata
`