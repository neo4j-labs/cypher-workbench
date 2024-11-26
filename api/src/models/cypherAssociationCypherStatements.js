
const CypherMetadataReturn = `
OPTIONAL MATCH (metadata)-[:HAS_TAG]->(tag:Tag)
WHERE user.primaryOrganization IN labels(tag)
WITH graphDoc, user, metadata, cypher, collect(tag) as tags
OPTIONAL MATCH (metadata)-[:HAS_CUSTOMER]->(customer:Customer)
WHERE user.primaryOrganization IN labels(customer)
WITH graphDoc, user, metadata, cypher, tags, collect(customer) as customers

OPTIONAL MATCH (graphDoc)-[:OWNER]->(owners:User)
WHERE user.primaryOrganization IN labels(owners)
WITH graphDoc, user, metadata, cypher, tags, customers, collect(owners) as owners
OPTIONAL MATCH (graphDoc)-[role]->(user)
WITH graphDoc, user, metadata, cypher, tags, customers, owners, collect(type(role)) as roles
WITH graphDoc, user, metadata, cypher, tags, customers, owners, roles,
    CASE WHEN 'CREATOR' IN roles THEN true ELSE false END as userIsCreator,
    [x IN roles WHERE x <> 'CREATOR'][0] as userRole

RETURN 
    metadata.key as key,
    CASE WHEN 'CypherSuite' IN labels(graphDoc) THEN cypher.key ELSE null END as subKey,
    metadata.cypherWorkbenchVersion as cypherWorkbenchVersion,
    CASE WHEN 'CypherSuite' IN labels(graphDoc) THEN cypher.cypherTitle ELSE metadata.title END as title,
    metadata.dateCreated as dateCreated,
    metadata.dateUpdated as dateUpdated,
    metadata.description as description,
    CASE WHEN 'CypherBuilder' IN labels(graphDoc) THEN true ELSE false END as isVisualCypher,
    CASE WHEN 'CypherSuite' IN labels(graphDoc) 
      THEN apoc.text.join([x in apoc.convert.fromJsonList(coalesce(cypher.cypherStatement,'[]'), '.children[*].text') WHERE x <> '' | x], '\n')
      ELSE graphDoc.cypherStatement
    END as cypher,
    [x IN tags | x {.key, .tag}] as tags,
    [x IN customers | x {.key, .name}] as customers,
    [x IN owners | x { .email }] as owners,
    not(graphDoc.isPrivate) as isPublic,
    userRole as userRole,
    userIsCreator as userIsCreator

ORDER BY metadata[$myOrderBy] $DESC
SKIP 0
LIMIT 100
`

export const CreateCypherAssociation = `
WITH $scenarioGraphDocKey as scenarioGraphDocKey, $scenarioKey as scenarioKey, 
    $cypherGraphDocKey as cypherGraphDocKey, $cypherKey as cypherKey, 
    $isVisualCypher as isVisualCypher
MATCH (u:User {email:$email})

MATCH (scenarioGraphDoc:GraphDoc {key:scenarioGraphDocKey})-[:HAS_SCENARIO]->(scenario:Scenario {key:scenarioKey})
MATCH (cypherGraphDoc:GraphDoc {key:cypherGraphDocKey})
OPTIONAL MATCH (cypherGraphDoc)-[:HAS_CYPHER_STATEMENT]->(cypherStatement:CypherStatement {key:cypherKey})

// need write permission on scenarioGraphDoc
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(scenarioGraphDoc),"scenario permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER]-(scenarioGraphDoc)) OR u:Admin),"scenario permission denied",[0])

// need read permission on cypherStatement
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(cypherGraphDoc),"cypher statement permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|VIEWER]-(cypherGraphDoc)) OR cypherGraphDoc.isPrivate <> true OR u:Admin),"cypher statement permission denied",[0])

WITH scenario, cypherGraphDocKey, isVisualCypher,
    coalesce(cypherStatement, cypherGraphDoc) as cypherStatement

MERGE (scenario)-[r:ASSOCIATED_CYPHER]->(cypherStatement)
SET r += {
    cypherGraphDocKey: cypherGraphDocKey,    
    isVisualCypher: isVisualCypher
}
WITH r
RETURN true as success
`

export const RemoveCypherAssociation = `
WITH $scenarioGraphDocKey as scenarioGraphDocKey, $scenarioKey as scenarioKey, 
$cypherGraphDocKey as cypherGraphDocKey, $cypherKey as cypherKey
MATCH (u:User {email:$email})

MATCH (scenarioGraphDoc:GraphDoc {key:scenarioGraphDocKey})-[:HAS_SCENARIO]->(scenario:Scenario {key:scenarioKey})
MATCH (cypherGraphDoc:GraphDoc {key:cypherGraphDocKey})
OPTIONAL MATCH (cypherGraphDoc)-[:HAS_CYPHER_STATEMENT]->(cypherStatement:CypherStatement {key:cypherKey})

// need write permission on scenarioGraphDoc
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(scenarioGraphDoc),"scenario permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER]-(scenarioGraphDoc)) OR u:Admin),"scenario permission denied",[0])

// need read permission on cypherStatement
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(cypherGraphDoc),"cypher statement permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|VIEWER]-(cypherGraphDoc)) OR cypherGraphDoc.isPrivate <> true OR u:Admin),"cypher statement permission denied",[0])

WITH scenario, cypherGraphDocKey,
    coalesce(cypherStatement, cypherGraphDoc) as cypherStatement

MATCH (scenario)-[r:ASSOCIATED_CYPHER]->(cypherStatement)
DELETE r
WITH r
RETURN true as success
`

export const ListCypherStatements = `
WITH $email as email
MATCH (user:User {email:email})
OPTIONAL MATCH (graphDoc:CypherBuilder)-[:HAS_METADATA]->(metadata:GraphDocMetadata)
WHERE user.primaryOrganization IN labels(graphDoc) 
  AND user.primaryOrganization IN labels(metadata)
  AND ((graphDoc)-[:OWNER|MEMBER|VIEWER]->(user) OR graphDoc.isPrivate <> true OR user:Admin)
WITH user, collect({ graphDoc: graphDoc, metadata: metadata, cypher: null }) as cypherBuilders
OPTIONAL MATCH (graphDoc:CypherSuite)-[:HAS_METADATA]->(metadata:GraphDocMetadata),
  (graphDoc)-[:HAS_CYPHER_STATEMENT]->(cypher:CypherStatement)
WHERE user.primaryOrganization IN labels(graphDoc) 
  AND user.primaryOrganization IN labels(metadata)
  AND ((graphDoc)-[:OWNER|MEMBER|VIEWER]->(user) OR graphDoc.isPrivate <> true OR user:Admin)
WITH user, cypherBuilders, collect({ graphDoc: graphDoc, metadata: metadata, cypher: cypher }) as cypherStatements
WITH user, [x in cypherBuilders + cypherStatements WHERE x.metadata.key IS NOT NULL | x] as allCypher
UNWIND allCypher as cypherInfo
WITH user, cypherInfo.graphDoc as graphDoc, cypherInfo.metadata as metadata, cypherInfo.cypher as cypher

${CypherMetadataReturn}
`

export const SearchForCypherStatements = `
WITH $searchText as searchText, $email as email
MATCH (user:User {email:email})
CALL db.index.fulltext.queryNodes("graphDocCypherSearch", searchText) YIELD node, score
WITH user, node, score
  WHERE user.primaryOrganization IN labels(node)
WITH user, node, score
ORDER BY score DESC

WITH user, score, 
  CASE 
	  WHEN 'GraphDocMetadata' IN labels(node) THEN [(graphDoc:GraphDoc)-[:HAS_METADATA]->(node) | 
	  	{ metadata: node, graphDoc: graphDoc, cypher: null }][0]
	  WHEN 'CypherBuilder' IN labels(node) THEN [(node)-[:HAS_METADATA]->(metadata:GraphDocMetadata) | 
	  	{ metadata: metadata, graphDoc: node, cypher: null }][0]
	  WHEN 'CypherStatement' IN labels(node) THEN [(node)<-[:HAS_CYPHER_STATEMENT]-(graphDoc:GraphDoc)-[:HAS_METADATA]->(metadata:GraphDocMetadata) | 
	  	{ metadata: metadata, graphDoc: graphDoc, cypher: node }][0]
	  // Tag or Customer
	  ELSE [(node)<--(metadata:GraphDocMetadata)<-[:HAS_METADATA]-(graphDoc:GraphDoc) | 
	  	{ metadata: metadata, graphDoc: graphDoc, cypher: null }][0]
	  END as matchResult
WHERE matchResult.metadata IS NOT NULL
  AND ('CypherBuilder' IN labels(matchResult.graphDoc) OR 'CypherSuite' IN labels(matchResult.graphDoc)) 
  AND user.primaryOrganization IN labels(matchResult.graphDoc) 
  AND user.primaryOrganization IN labels(matchResult.metadata)
WITH user, score, matchResult, matchResult.graphDoc as graphDoc
  WHERE ((graphDoc)-[:OWNER|MEMBER|VIEWER]->(user) OR graphDoc.isPrivate <> true OR user:Admin)

WITH user, collect(matchResult) as matches, score

/* We may have matched the same GraphDocMetdata node more than once, just take the one with the highest score */
UNWIND matches as matchResult
WITH user, matchResult.graphDoc as graphDoc, matchResult.metadata as metadata, matchResult.cypher as cypher, max(score) as score
ORDER BY score DESC, metadata.dateUpdated DESC

/* now take matches, format, and return */
${CypherMetadataReturn}
`
