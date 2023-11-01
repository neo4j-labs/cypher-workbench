
/* cypher snippet to handle formatting of return */
const ModelMetadataReturn = `
OPTIONAL MATCH (metadata)-[:HAS_TAG]->(tag:Tag)
WHERE user.primaryOrganization IN labels(tag)
WITH model, user, metadata, collect(tag) as tags
OPTIONAL MATCH (metadata)-[:HAS_CUSTOMER]->(customer:Customer)
WHERE user.primaryOrganization IN labels(customer)
WITH model, user, metadata, tags, collect(customer) as customers
/*
OPTIONAL MATCH (metadata)-[:HAS_AUTHOR]->(author:Author)
WHERE user.primaryOrganization IN labels(author)
WITH model, user, metadata, tags, customers, collect(author) as authors
*/
OPTIONAL MATCH (model)-[:OWNER]->(owners:User)
WHERE user.primaryOrganization IN labels(owners)
WITH model, user, metadata, tags, customers, collect(owners) as owners
OPTIONAL MATCH (model)-[role:CREATOR|OWNER|VIEWER|MEMBER]->(user)
WITH model, user, metadata, tags, customers, owners, collect(type(role)) as roles
WITH model, user, metadata, tags, customers, owners, roles,
    CASE WHEN 'CREATOR' IN roles THEN true ELSE false END as userIsCreator,
    [x IN roles WHERE x <> 'CREATOR'][0] as userRole

RETURN model.key as key, {
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
ORDER BY metadata[$myOrderBy] $DESC
SKIP toInteger($skip)
LIMIT toInteger($limit)
`

export const ListModels = `
WITH $email as email
MATCH (user:User {email:email})
MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
  AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) OR model.isPrivate <> true OR user:Admin)
${ModelMetadataReturn}
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
// ${ModelMetadataReturn}
// `


export const SearchForModel = `
WITH $searchText as searchText, $email as email
MATCH(user:User {email: email})
MATCH (node:DataModelMetadata) WHERE toLower(node.title) =~ '(?i).*'+searchText+'.*'
WITH user, node
WHERE user.primaryOrganization IN labels(node)
WITH user, node
CALL apoc.when('DataModelMetadata' IN labels(node),
/* Full-text search matched a node connected to DataModelMetadata, like Tag or Author */
"WITH $node as node
WITH collect(node) as matches
RETURN matches",
/* Full-text search matched a node connected to DataModelMetadata, like Tag or Author */
"WITH $node as node,
MATCH (metadata:DataModelMetadata)-[]->(node)
WITH collect(metadata) as matches
RETURN matches",
{node: node}) YIELD value
/* We may have matched the same DataModelMetdata node more than once, just take the one with the highest score */
WITH user, value.matches as matches
UNWIND matches as metadata
WITH user, metadata
ORDER BY metadata.dateUpdated DESC
MATCH (model:DataModel)-[:HAS_METADATA]->(metadata)
WHERE user.primaryOrganization IN labels(model) AND user.primaryOrganization IN labels(metadata)
  AND ((model)-[:OWNER|MEMBER|VIEWER]->(user) OR model.isPrivate <> true OR user:Admin)
${ModelMetadataReturn}
`