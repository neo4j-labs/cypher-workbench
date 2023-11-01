
/* cypher snippet to handle formatting of return */
const GraphDocMetadataReturn = `
OPTIONAL MATCH (metadata)-[:HAS_TAG]->(tag:Tag)
WHERE user.primaryOrganization IN labels(tag)
WITH graphDoc, user, metadata, collect(tag) as tags
OPTIONAL MATCH (metadata)-[:HAS_CUSTOMER]->(customer:Customer)
WHERE user.primaryOrganization IN labels(customer)
WITH graphDoc, user, metadata, tags, collect(customer) as customers
/*
OPTIONAL MATCH (metadata)-[:HAS_AUTHOR]->(author:Author)
WHERE user.primaryOrganization IN labels(author)
WITH graphDoc, user, metadata, tags, customers, collect(author) as authors
*/
OPTIONAL MATCH (graphDoc)-[:OWNER]->(owners:User)
WHERE user.primaryOrganization IN labels(owners)
WITH graphDoc, user, metadata, tags, customers, collect(owners) as owners
OPTIONAL MATCH (graphDoc)-[role]->(user)
WITH graphDoc, user, metadata, tags, customers, owners, collect(type(role)) as roles
WITH graphDoc, user, metadata, tags, customers, owners, roles,
    CASE WHEN 'CREATOR' IN roles THEN true ELSE false END as userIsCreator,
    [x IN roles WHERE x <> 'CREATOR'][0] as userRole

RETURN graphDoc.key as key, {
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
      isPublic: not(graphDoc.isPrivate),
      userRole: userRole,
      userIsCreator: userIsCreator
    } as metadata
ORDER BY metadata[$myOrderBy] $DESC
SKIP 0
LIMIT 100
`


export const ListGraphDocs = `
WITH $graphDocType as graphDocType, $email as email
MATCH (user:User {email:email})
MATCH (graphDoc:GraphDoc)-[:HAS_METADATA]->(metadata:GraphDocMetadata)
WHERE user.primaryOrganization IN labels(graphDoc) 
  AND graphDocType IN labels(graphDoc)
  AND user.primaryOrganization IN labels(metadata)
  AND ((graphDoc)-[:OWNER|MEMBER|VIEWER]->(user) OR graphDoc.isPrivate <> true OR user:Admin)
${GraphDocMetadataReturn}
`

export const SearchForGraphDocs = `
WITH $graphDocType as graphDocType, $searchText as searchText, $email as email
MATCH (user:User {email:email})
CALL db.index.fulltext.queryNodes("dataGraphDocMetadata", searchText) YIELD node, score
WITH graphDocType, user, node, score
  WHERE user.primaryOrganization IN labels(node)
WITH graphDocType, user, node, score
ORDER BY score DESC

CALL apoc.when('GraphDocMetadata' IN labels(node),
  /* Full-text search matched a GraphDocMetadata node */
  "
  WITH $node as node, $score as score
  WITH collect(node) as matches, score
  RETURN matches, score
  ",
  /* Full-text search matched a node connected to GraphDocMetadata, like Tag or Author */
  "
  WITH $node as node, $score as score
  MATCH (metadata:GraphDocMetadata)-[]->(node)
  WITH collect(metadata) as matches, score
  RETURN matches, score
  ",
  {
    node: node, 
    score: score
  }
) YIELD value

/* We may have matched the same GraphDocMetdata node more than once, just take the one with the highest score */
WITH user, graphDocType, value.matches as matches, value.score as score
UNWIND matches as metadata
WITH user, graphDocType, metadata, max(score) as score
ORDER BY score DESC, metadata.dateUpdated DESC

/* now take matches, format, and return */
MATCH (graphDoc:GraphDoc)-[:HAS_METADATA]->(metadata)
WHERE graphDocType IN labels(graphDoc) AND user.primaryOrganization IN labels(graphDoc) AND user.primaryOrganization IN labels(metadata)
  AND ((graphDoc)-[:OWNER|MEMBER|VIEWER]->(user) OR graphDoc.isPrivate <> true OR user:Admin)
${GraphDocMetadataReturn}
`
