
export const GrabLock = `
WITH $graphDocKey as graphDocKey, $email as email
MATCH (u:User {email:email})
MATCH (graphDoc:GraphDoc {key: graphDocKey})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(graphDoc),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (exists((u)<-[:OWNER|MEMBER|KM_OWNER|KM_MEMBER]-(graphDoc)) OR u:Admin), "permission denied", [0])
WITH graphDoc, email
SET graphDoc += {
    lockTimestamp: timestamp(),
    lockedByUser: email
}
RETURN true as success
`

export const FindGraphDoc = `
WITH $graphDoc as graphDocInfo, $email as email
MATCH (u:User {email:email})
MATCH (graphDoc:GraphDoc {key:graphDocInfo.key})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(graphDoc),"permission denied (wrong org)",[0])
RETURN count(graphDoc)=0 as noDM
`

export const GetDefaultGraphViewKeyForGraphDoc = `
WITH $graphDocKey as graphDocKey, $email as email
MATCH (u:User {email:email})
MATCH (graphDocView:GraphView)-[:DEFAULT_GRAPH_VIEW_FOR]->(graphDoc:GraphDoc {key:graphDocKey})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(graphDoc),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(graphDocView),"permission denied - view (wrong org)",[0])
RETURN graphDocView.key as graphDocViewKey
`

export const CreateGraphDoc = `
WITH $graphDoc as graphDocInfo, $email as email, 
  $maxNumberOfGraphDocs as maxNumberOfGraphDocs, $isCloud as isCloud
CALL apoc.util.validate(graphDocInfo.subgraphModel.primaryNodeLabel IS NULL,"graphDoc.subgraphModel.primaryNodeLabel must be specified",[0])
//CALL apoc.util.validate(graphDocInfo.subgraphModel.subgraphConfig_labelFilter IS NULL,"graphDoc.subgraphModel.subgraphConfig_labelFilter must be specified",[0])
CALL apoc.util.validate(graphDocInfo.subgraphModel.subgraphConfig_relationshipFilter IS NULL,"graphDoc.subgraphModel.subgraphConfig_relationshipFilter must be specified",[0])
CALL apoc.util.validate(graphDocInfo.subgraphModel.keyConfig IS NULL,"graphDoc.subgraphModel.keyConfig must be specified",[0])
WITH graphDocInfo, graphDocInfo.subgraphModel as subgraphModel, maxNumberOfGraphDocs, isCloud,
    email, "lastOpened" + graphDocInfo.subgraphModel.primaryNodeLabel as lastOpenedProperty
WITH graphDocInfo, subgraphModel, email, lastOpenedProperty, maxNumberOfGraphDocs, isCloud,
    apoc.map.fromPairs(
        [x IN keys(subgraphModel) WHERE x STARTS WITH 'subgraphConfig_' | [x, subgraphModel[x]]]
    ) as subgraphConfig,
    apoc.map.fromPairs(
        [x IN subgraphModel.keyConfig | [
              CASE WHEN coalesce(x.relationshipType, '') <> '' 
                THEN 'relKeyConfig_' + x.relationshipType
                ELSE 'keyConfig_' + x.nodeLabel
              END, 
            x.propertyKeys
          ]
        ]
    ) as keyConfigProperties

MATCH (u:User {email:email})

CALL apoc.do.when(isCloud, 
  'MATCH (u)-[:MEMBER]->(s:SecurityOrganization)-[:LICENSED_FOR]->(l:SoftwareEdition)
  WHERE u.primaryOrganization = s.name
  WITH u, l, graphDocInfo,
    coalesce(split(u.email, "@")[1],"") as emailDomain, coalesce(s.enterpriseDomains,[]) as enterpriseDomains
  RETURN 
    CASE WHEN emailDomain IN enterpriseDomains
      THEN 999999999999
      ELSE l["maxNumberOfGraphDocs_" + graphDocInfo.subgraphModel.primaryNodeLabel]
    END as maxNumberOfGraphDocs',
  'RETURN coalesce(maxNumberOfGraphDocs,999999999999) as maxNumberOfGraphDocs, {} as softwareEdition', 
  {u: u, maxNumberOfGraphDocs: maxNumberOfGraphDocs, graphDocInfo: graphDocInfo}
) YIELD value as licenseInfo

WITH u, graphDocInfo, subgraphModel, email, lastOpenedProperty, subgraphConfig, keyConfigProperties,
  coalesce(licenseInfo.maxNumberOfGraphDocs,999999999999) as maxNumberOfGraphDocs

OPTIONAL MATCH (u)<-[:CREATOR]-(existing:GraphDoc)
WHERE graphDocInfo.subgraphModel.primaryNodeLabel IN labels(existing)
WITH u, graphDocInfo, subgraphModel, email, lastOpenedProperty, subgraphConfig, keyConfigProperties,
    maxNumberOfGraphDocs, count(existing) as numExistingGraphDocs
SET u.lastAccessTime = timestamp()
WITH *
CALL apoc.util.validate(NOT (u.primaryOrganization IS NOT NULL),"permission denied",[0])
//CALL apoc.util.validate(true,"numExistingGraphDocs " + numExistingGraphDocs,[0])
//CALL apoc.util.validate(true,"maxNumberOfGraphDocs " + maxNumberOfGraphDocs,[0])
CALL apoc.util.validate(coalesce(numExistingGraphDocs,0) >= maxNumberOfGraphDocs,"Max number of licensed documents reached",[0])
WITH *
MERGE (graphDoc:GraphDoc {key:graphDocInfo.key})
WITH *
CALL apoc.create.addLabels([graphDoc], [u.primaryOrganization, graphDocInfo.subgraphModel.primaryNodeLabel]) YIELD node
MERGE (graphDoc)-[:CREATOR]->(u)
MERGE (graphDoc)-[:OWNER]->(u)
WITH *
CALL apoc.create.setProperties(u, [lastOpenedProperty], [graphDocInfo.key]) YIELD node as setPropertiesResult

SET graphDoc += apoc.map.mergeList([{
    primaryNodeLabel: graphDocInfo.subgraphModel.primaryNodeLabel,
    remoteNodeLabels: graphDocInfo.subgraphModel.remoteNodeLabels,
    isPrivate: not(graphDocInfo.metadata.isPublic),
    securityDelegate: graphDocInfo.securityDelegate,
    isRootNode: true,
    lockTimestamp: timestamp(),
    lockedByUser: email
}, subgraphConfig, keyConfigProperties])

RETURN count(graphDoc)>0 as success
`

export const SaveGraphDoc = `
WITH $graphDocInfo as graphDocInfo, $email as email,
{
  getKeyProperties: 'WITH
            keyProperties    /* e.g. [{ key: "key", value: "123_Node0", datatype: "STRING" }] */
            WITH CASE WHEN keyProperties IS NOT NULL AND size(keyProperties) > 0 
              THEN
                " {" +
                  apoc.text.join([x IN keyProperties | x.key + ":" + 
                    CASE WHEN toUpper(x.datatype) = "STRING"
                    THEN \\'"\\' + x.value + \\'"\\' 
                    ELSE x.value
                    END
                  ], ",") + " }"
              ELSE ""
              END as clause
            RETURN clause'
  ,
  getMatchOrMerge: 'WITH 
            command,      /* e.g. MERGE or MATCH */
            nodeVariable, /* e.g. node_1 */
            key           /* e.g. { properties: [{ key: "key", value: "123_Node0", datatype: "STRING" }], labels: ["NodeLabel"] } */
            WITH command + " (" + nodeVariable + ":" + key.label + " {" +
            apoc.text.join([x IN key.properties | x.key + ":" + 
              CASE WHEN toUpper(x.datatype) = "STRING"
              THEN \\'"\\' + x.value + \\'"\\' 
              ELSE x.value
              END
            ], ",") + " })" as clause
            RETURN clause'
} as functions

MATCH (u:User {email:email})
SET u.lastAccessTime = timestamp()
WITH u, email, graphDocInfo, functions
MATCH (graphDoc:GraphDoc {key: graphDocInfo.key})
WITH u, graphDoc, email, graphDocInfo, functions
//WITH u, graphDoc, graphDoc as securityDelegate, email, graphDocInfo, functions
// security delegate logic for GraphDocs that are Sub-Documents of other GraphDocs

MATCH (securityDelegate:GraphDoc {key: coalesce(graphDoc.securityDelegate, graphDoc.key)})
WITH u, graphDoc, securityDelegate, email, graphDocInfo, functions
/*
CALL apoc.when(graphDoc.securityDelegate IS NOT NULL,
  'OPTIONAL MATCH (securityDelegate:GraphDoc {key: graphDoc.securityDelegate})
  RETURN coalesce(securityDelegate, graphDoc) as graphDoc',
  'RETURN graphDoc', {graphDoc: graphDoc}
) YIELD value
WITH u, graphDoc, value.graphDoc as securityDelegate, email, graphDocInfo, functions
*/

CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(securityDelegate),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|KM_OWNER|KM_MEMBER]-(securityDelegate)) OR u:Admin),"permission denied",[0])
CALL apoc.util.validate(graphDocInfo.graph IS NULL, "graphDocInfo.graph must exist",[0])
CALL apoc.util.validate(
    securityDelegate.lockedByUser IS NOT NULL              /* model has been locked already */
    AND securityDelegate.lockedByUser <> email         /* locking user is not the current user */
    AND (timestamp() - securityDelegate.lockTimestamp) < (2 * 3600 * 1000) /* locking user has edited it within the past 2 hours */
, "locked by user '" + securityDelegate.lockedByUser + "' at " + securityDelegate.lockTimestamp, [0])

WITH u, graphDoc, securityDelegate, email, graphDocInfo, functions
SET securityDelegate += {
    lockTimestamp: timestamp(),
    lockedByUser: email
}
WITH u, graphDoc, graphDocInfo, functions

/* metadata */
CALL apoc.do.when(NOT graphDocInfo.metadata IS NULL,
"MATCH (graphDocMetadata:GraphDocMetadata {key: metadata.key})
SET graphDocMetadata += apoc.map.submap(metadata, apoc.coll.intersection(keys(metadata),
													['cypherWorkbenchVersion','title','description','notes','viewSettings']), [], false)
SET graphDocMetadata.dateCreated = CASE WHEN NOT metadata.dateCreated IS NULL
    THEN metadata.dateCreated ELSE null END
SET graphDocMetadata.dateUpdated = CASE WHEN NOT metadata.dateUpdated IS NULL
    THEN metadata.dateUpdated ELSE null END

// this is only here to ensure the relationship exists in case somehow it gets deleted
MERGE (graphDoc)-[:HAS_METADATA]->(graphDocMetadata)
RETURN 1
","RETURN 0",
{user: u, graphDoc: graphDoc, metadata: graphDocInfo.metadata}) YIELD value

// remove nodes
CALL apoc.do.when(graphDocInfo.graph.removeNodes IS NOT NULL AND size(graphDocInfo.graph.removeNodes) > 0, 
  'UNWIND removeNodes as removeNode
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
      command: "MATCH", 
      nodeVariable: "n", 
      key: removeNode.key}
    ) YIELD value as functionResult
  WITH functionResult.clause + "\\nRETURN n as nodeToRemove" as findNodeToRemoveCypher
  //CALL apoc.util.validate(true, findNodeToRemoveCypher,[0]) // uncomment for debugging
  CALL apoc.cypher.run(findNodeToRemoveCypher, {}) YIELD value as findNodeToRemoveCypherResult
  //CALL apoc.util.validate(true, findNodeToRemoveCypher + " after run",[0]) // uncomment for debugging
  //WITH collect(findNodeToRemoveCypherResult.id) as idsToRemove
  WITH collect(findNodeToRemoveCypherResult.nodeToRemove) as nodesToRemove
  //CALL apoc.util.validate(true, reduce(s = "ids to remove: ", x IN idsToRemove | s + " " + x),[0]) // uncomment for debugging
  // ** apoc.nodes.delete is hanging, we will use a different approach **
  //CALL apoc.nodes.delete(idsToRemove, 100) YIELD value
  //CALL apoc.util.validate(true, "after apoc.nodes.delete",[0]) // uncomment for debugging
  RETURN nodesToRemove', 
  'RETURN [] as nodesToRemove', 
  {
    removeNodes: graphDocInfo.graph.removeNodes, 
    functions: functions
  }
) YIELD value as findNodesToRemoveResult
//CALL apoc.util.validate(true, "Done removing",[0]) // uncomment for debugging

CALL apoc.do.when(size(findNodesToRemoveResult.nodesToRemove) > 0,
  'UNWIND nodesToRemove as nodeToRemove
  DETACH DELETE nodeToRemove
  WITH collect(id(nodeToRemove)) as removedNodeIds
  RETURN removedNodeIds', 'RETURN [] as removedNodeIds', {
    nodesToRemove: findNodesToRemoveResult.nodesToRemove
}) YIELD value as removeNodesResult

// upsert nodes
//WITH *, graphDocInfo.graph.upsertNodes as upsertNodes, u.primaryOrganization as organizationLabel
CALL apoc.do.when(graphDocInfo.graph.upsertNodes IS NOT NULL AND size(graphDocInfo.graph.upsertNodes) > 0, 
'
  UNWIND upsertNodes as upsertNode
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
    command: "MERGE", 
    nodeVariable: "n", 
    key: upsertNode.key}
  ) YIELD value as functionResult
  
  WITH upsertNode, organizationLabel, functionResult.clause + "\\nRETURN n" as mergeNodeCypher
  //CALL apoc.util.validate(true,mergeNodeCypher,[0])    // for debugging
  CALL apoc.cypher.doIt(mergeNodeCypher, {}) YIELD value
  WITH upsertNode, organizationLabel, value.n as mergedNode
  CALL apoc.create.addLabels([mergedNode], apoc.coll.union(coalesce(upsertNode.upsertLabels,[]), [organizationLabel])) YIELD node as addLabelResult
  CALL apoc.create.removeLabels([mergedNode], coalesce(upsertNode.removeLabels,[])) YIELD node as removeLabelsResult
  CALL apoc.create.setProperties([mergedNode],
		[x IN upsertNode.upsertProperties | x.key], // keys
    [x IN upsertNode.upsertProperties | 
      // if you add something here, make sure you also add it to relationships below
			CASE toUpper(x.datatype)
				WHEN "FLOAT" THEN toFloat(x.value)
				WHEN "INTEGER" THEN toInteger(x.value)
        WHEN "BOOLEAN" THEN toBoolean(x.value)
        WHEN "STRING[]" THEN apoc.convert.fromJsonList(x.value)
        WHEN "LIST OF STRING" THEN apoc.convert.fromJsonList(x.value)
				ELSE x.value // STRING and everything else
			END
		]	// values
  ) YIELD node as setPropertiesResult
  CALL apoc.create.removeProperties([mergedNode], coalesce(upsertNode.removeProperties,[])) YIELD node as removePropertiesResult
  WITH collect(id(mergedNode)) as mergedNodeIds  
  RETURN mergedNodeIds
  ', 
  'RETURN [] as mergedNodeIds', 
  {
    upsertNodes: graphDocInfo.graph.upsertNodes,
    organizationLabel: u.primaryOrganization,
	functions: functions
}) YIELD value as upsertNodesResult

// remove relationships
CALL apoc.do.when(graphDocInfo.graph.removeRelationships IS NOT NULL AND size(graphDocInfo.graph.removeRelationships) > 0, 
  'UNWIND removeRelationships as removeRelationship
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
      command: "MATCH", 
      nodeVariable: "startRel", 
      key: removeRelationship.startNodeKey}
    ) YIELD value as startResult
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
      command: "MATCH", 
      nodeVariable: "endRel", 
      key: removeRelationship.endNodeKey}
    ) YIELD value as endResult
  CALL apoc.cypher.run(functions.getKeyProperties, { 
      keyProperties: removeRelationship.keyProperties}
    ) YIELD value as relationshipKeyProperties    

  WITH removeRelationship, startResult.clause + "\\n" + endResult.clause + "\\n" + 
    "MATCH (startRel)-[r:" + removeRelationship.type + relationshipKeyProperties.clause + "]->(endRel)
    RETURN r" as relationshipsToRemoveCypher
  //CALL apoc.util.validate(true, relationshipsToRemoveCypher,[0]) // uncomment for debugging    
  CALL apoc.cypher.run(relationshipsToRemoveCypher, {}) YIELD value as relationshipsToRemoveCypherResult
  WITH collect(relationshipsToRemoveCypherResult.r) as relationshipsToRemove
  RETURN relationshipsToRemove', 
  'RETURN [] as relationshipsToRemove', 
  {
    removeRelationships: graphDocInfo.graph.removeRelationships, 
    functions: functions
  }) YIELD value as findRemoveRelationshipsResult

CALL apoc.do.when(size(findRemoveRelationshipsResult.relationshipsToRemove) > 0,
  'UNWIND relationshipsToRemove as relationshipToRemove
  DELETE relationshipToRemove
  WITH collect(id(relationshipToRemove)) as removedRelationshipIds
  RETURN removedRelationshipIds', 'RETURN [] as removedRelationshipIds', {relationshipsToRemove: findRemoveRelationshipsResult.relationshipsToRemove}) YIELD value as removeRelationshipsResult

// upsert relationships
//WITH *, graphDocInfo.graph.upsertRelationships as upsertRelationships
CALL apoc.do.when(graphDocInfo.graph.upsertRelationships IS NOT NULL AND size(graphDocInfo.graph.upsertRelationships) > 0, 
  '
  UNWIND upsertRelationships as upsertRelationship
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
      command: "MATCH", 
      nodeVariable: "startRel", 
      key: upsertRelationship.startNodeKey}
    ) YIELD value as startResult
  CALL apoc.cypher.run(functions.getMatchOrMerge, { 
      command: "MATCH", 
      nodeVariable: "endRel", 
      key: upsertRelationship.endNodeKey}
    ) YIELD value as endResult
  CALL apoc.cypher.run(functions.getKeyProperties, { 
      keyProperties: upsertRelationship.keyProperties}
    ) YIELD value as relationshipKeyProperties

//CALL apoc.util.validate(true,relationshipKeyProperties.clause,[0])    // for debugging
  WITH upsertRelationship, startResult.clause + "\\n" + endResult.clause + "\\n" + 
    "MERGE (startRel)-[r:" + upsertRelationship.type + relationshipKeyProperties.clause + "]->(endRel)
    RETURN r" as mergeRelationshipCypher
  //CALL apoc.util.validate(true,mergeRelationshipCypher,[0])    // for debugging
  CALL apoc.cypher.doIt(mergeRelationshipCypher, {}) YIELD value as mergeRelationshipCypherResult
  WITH upsertRelationship, mergeRelationshipCypherResult.r as r
  CALL apoc.create.setRelProperties([r],
		[x IN coalesce(upsertRelationship.upsertProperties,[]) | x.key], // keys
    [x IN coalesce(upsertRelationship.upsertProperties,[]) | 
      // if you add something here, make sure you also add it to nodes above
			CASE toUpper(x.datatype)
				WHEN "FLOAT" THEN toFloat(x.value)
				WHEN "INTEGER" THEN toInteger(x.value)
        WHEN "BOOLEAN" THEN toBoolean(x.value)
        WHEN "STRING[]" THEN apoc.convert.fromJsonList(x.value)
        WHEN "LIST OF STRING" THEN apoc.convert.fromJsonList(x.value)
				ELSE x.value // STRING and everything else
			END
		]	// values
  ) YIELD rel as setPropertiesResult
  CALL apoc.create.removeRelProperties([r], coalesce(upsertRelationship.removeProperties,[])) YIELD rel as removePropertiesResult
  WITH collect(id(r)) as mergedRelationshipIds
  RETURN mergedRelationshipIds
  '
  , 
  'RETURN [] as mergedRelationshipIds', 
  {
  	upsertRelationships: graphDocInfo.graph.upsertRelationships, 
	functions: functions
  }
) YIELD value as upsertRelationshipsResult

RETURN graphDoc.key as key;
`

export const LoadGraphDoc = `
WITH $graphDocKey as graphDocKey
MATCH (u:User {email:$email})
MATCH (graphDoc:GraphDoc {key:graphDocKey})
WITH u, graphDoc, graphDocKey, 
  [[graphDoc.primaryNodeLabel, ['key']]] +
  [x IN keys(graphDoc) WHERE x STARTS WITH 'keyConfig_' | [substring(x, size('keyConfig_')), graphDoc[x]]] as keyConfigPairs,
  [x IN keys(graphDoc) WHERE x STARTS WITH 'relKeyConfig_' | [substring(x, size('relKeyConfig_')), graphDoc[x]]] as relKeyConfigPairs

//CALL apoc.util.validate('CypherBuilder' IN labels(graphDoc),
//  reduce(s = '', x IN relKeyConfigPairs | s + x[0] + reduce(val = '', y IN x[1] | val + ' ' + y))
//,[0]) // uncomment for debugging debugging

WITH u, graphDoc, graphDocKey, 
	apoc.map.fromPairs(
		[x IN keys(graphDoc) WHERE x STARTS WITH 'subgraphConfig_' | [substring(x, size('subgraphConfig_')), graphDoc[x]]]
	) as subgraphConfig,
  apoc.map.fromPairs(keyConfigPairs) as keyConfigMap,
  apoc.map.fromPairs(relKeyConfigPairs) as relKeyConfigMap,
	"lastOpened" + graphDoc.primaryNodeLabel as lastOpenedProperty

// security delegate logic for GraphDocs that are Sub-Documents of other GraphDocs
MATCH (securityDelegate:GraphDoc {key: coalesce(graphDoc.securityDelegate, graphDoc.key)})
WITH u, graphDoc, securityDelegate, graphDocKey, subgraphConfig, keyConfigMap, relKeyConfigMap, lastOpenedProperty
/*
CALL apoc.when(graphDoc.securityDelegate IS NOT NULL,
  'OPTIONAL MATCH (securityDelegate:GraphDoc {key: graphDoc.securityDelegate})
  RETURN coalesce(securityDelegate, graphDoc) as graphDoc',
  'RETURN graphDoc', {graphDoc: graphDoc}
) YIELD value
WITH u, graphDoc, value.graphDoc as securityDelegate, graphDocKey, 
  subgraphConfig, keyConfigMap, relKeyConfigMap, lastOpenedProperty
*/
    
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(securityDelegate),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|VIEWER|KM_OWNER|KM_MEMBER|KM_VIEWER]-(securityDelegate)) OR graphDoc.isPrivate <> true OR u:Admin),"permission denied",[0])
CALL apoc.create.setProperties(u, [lastOpenedProperty], [graphDocKey]) YIELD node as setPropertiesResult
WITH u, graphDoc, subgraphConfig, keyConfigMap, relKeyConfigMap
CALL apoc.path.subgraphAll(graphDoc, subgraphConfig) YIELD nodes, relationships

UNWIND nodes as node
WITH *, CASE WHEN node.primaryNodeLabel IS NOT NULL 
    THEN node.primaryNodeLabel
    ELSE head(apoc.coll.subtract(labels(node), [u.primaryOrganization]))
  END as primaryNodeLabel
WITH *, keyConfigMap[primaryNodeLabel] as nodeLabelKeyProperties
WITH *,   
  [key IN nodeLabelKeyProperties | { key: key, datatype: apoc.meta.cypher.type(node[key]), value: node[key]}] as nodeKeyProperties,
  [key IN keys(node) | { 
    key: key, 
    datatype: apoc.meta.cypher.type(node[key]), 
    value: CASE apoc.meta.cypher.type(node[key])
        WHEN "String[]" THEN apoc.convert.toJson(node[key])
        WHEN "LIST OF STRING" THEN apoc.convert.toJson(node[key])
        ELSE toString(node[key])
      END
  }] as nodeProperties
WITH *, {
  neoInternalId: toString(id(node)),
  key: {
    properties: nodeKeyProperties,
    label: primaryNodeLabel
  },
  //isRootNode: CASE WHEN node IS NOT NULL AND node.isRootNode IS NOT NULL THEN node.isRootNode ELSE false END,
  isRootNode: node.isRootNode,
  //isRootNode: false,
  primaryNodeLabel: primaryNodeLabel,
  labels: labels(node),
  properties: nodeProperties  
} as nodeValue
WITH u, keyConfigMap, relKeyConfigMap, graphDoc, relationships, collect(nodeValue) as nodeValues

CALL apoc.do.when(size(relationships) > 0,
	'
	UNWIND relationships as relationship
  WITH u, keyConfigMap, relKeyConfigMap,
    relationship, startNode(relationship) as startNode, endNode(relationship) as endNode
	WITH *, 
	  CASE WHEN startNode.primaryNodeLabel IS NOT NULL 
	    THEN startNode.primaryNodeLabel
	    ELSE head(apoc.coll.subtract(labels(startNode), [u.primaryOrganization]))
	  END as primaryStartNodeLabel,
	  CASE WHEN endNode.primaryNodeLabel IS NOT NULL 
	    THEN endNode.primaryNodeLabel
	    ELSE head(apoc.coll.subtract(labels(endNode), [u.primaryOrganization]))
	  END as primaryEndNodeLabel
	WITH *, 
	  keyConfigMap[primaryStartNodeLabel] as startNodeLabelKeyProperties,
    keyConfigMap[primaryEndNodeLabel] as endNodeLabelKeyProperties,
    coalesce(relKeyConfigMap[type(relationship)], []) as relKeyProperties
//CALL apoc.util.validate(type(relationship) = "RELATIONSHIP_PATTERN",
//  "relKeyProperties = " + reduce(s = "", x IN relKeyProperties | s + " " + x)
//  ,[0]) // uncomment for debugging debugging
    
	WITH *, 
	  [key IN startNodeLabelKeyProperties | { key: key, datatype: apoc.meta.cypher.type(startNode[key]), value: startNode[key]}] as startNodeKeyProperties,
    [key IN endNodeLabelKeyProperties | { key: key, datatype: apoc.meta.cypher.type(endNode[key]), value: endNode[key]}] as endNodeKeyProperties,  
	  [key IN keys(relationship) WHERE key IN relKeyProperties | { 
      key: key, 
      datatype: apoc.meta.cypher.type(relationship[key]), 
      value: CASE apoc.meta.cypher.type(relationship[key])
        WHEN "String[]" THEN apoc.convert.toJson(relationship[key])
        WHEN "LIST OF STRING" THEN apoc.convert.toJson(relationship[key])
        ELSE toString(relationship[key])
      END
    }] as keyProperties,
	  [key IN keys(relationship) WHERE NOT key IN relKeyProperties | { 
	        key: key, 
	        datatype: apoc.meta.cypher.type(relationship[key]), 
	        value: CASE apoc.meta.cypher.type(relationship[key])
	          WHEN "String[]" THEN apoc.convert.toJson(relationship[key])
            WHEN "LIST OF STRING" THEN apoc.convert.toJson(relationship[key])
	          ELSE toString(relationship[key])
	        END
    }] as relationshipProperties
    
//CALL apoc.util.validate(type(relationship) = "RELATIONSHIP_PATTERN",
//  "keyProperties = " + reduce(s = "", x IN keyProperties | s + " " + x.key + ":" + x.value)
//  ,[0]) // uncomment for debugging debugging
    
	WITH *, {
	  neoInternalId: toString(id(relationship)),
	  startNodeKey: {
	    properties: startNodeKeyProperties,
	    label: primaryStartNodeLabel
	  },
	  endNodeKey: {
	    properties: endNodeKeyProperties,
	    label: primaryEndNodeLabel
    },
    keyProperties: keyProperties,
	  type: type(relationship),
	  properties: relationshipProperties
	} as relationshipValue
	WITH collect(relationshipValue) as relationshipValues
	RETURN relationshipValues'
	, 'RETURN [] as relationshipValues', {
		u: u, 
    keyConfigMap: keyConfigMap,
    relKeyConfigMap: relKeyConfigMap,
		relationships: relationships
	}
) YIELD value
WITH u, graphDoc, nodeValues, value.relationshipValues as relationshipValues

OPTIONAL MATCH (graphDoc)-[:HAS_METADATA]->(metadata)
  WHERE u.primaryOrganization IN labels(metadata)
RETURN {
  key: graphDoc.key,
  isPrivate: graphDoc.isPrivate,
  primaryNodeLabel: graphDoc.primaryNodeLabel,
  lockInfo: {
      lockedByUser: graphDoc.lockedByUser,
      lockTimestamp: toString(graphDoc.lockTimestamp),
      lockIsActive: 
        /* locking user is different from current user */
        graphDoc.lockedByUser <> u.email AND
        /* locking user has edited it within the past 2 hours */
        (
          timestamp() - coalesce(graphDoc.lockTimestamp, timestamp()-(3 * 3600 * 1000))
        ) < (2 * 3600 * 1000) 
  },
  metadata: {
      key: metadata.key,
      title: metadata.title,
      viewSettings: metadata.viewSettings
  },
  graph: {
      nodes: nodeValues,
      relationships: relationshipValues
  }
} as graphDoc  
`

export const RemoveGraphDoc = `
// slotted, pipelined throw errors, therefore have to use interpreted
CYPHER runtime=interpreted
WITH $graphDocKey as graphDocKey, $email as email
MATCH (u:User {email:email})
SET u.lastAccessTime = timestamp()
WITH u, graphDocKey, email
MATCH (graphDoc:GraphDoc {key:graphDocKey})
WITH u, email, graphDoc, graphDocKey, 
	apoc.map.fromPairs(
		[x IN keys(graphDoc) WHERE x STARTS WITH 'subgraphConfig_' | [substring(x, size('subgraphConfig_')), graphDoc[x]]]
	) as subgraphConfig,
  coalesce(graphDoc.remoteNodeLabels, []) as remoteNodeLabels

WITH u, email, graphDoc, graphDocKey, subgraphConfig, remoteNodeLabels

WITH u, email, graphDoc, graphDocKey, subgraphConfig,
  split(coalesce(subgraphConfig.labelFilter, ''), '|') as nodeLabels, remoteNodeLabels
WITH u, email, graphDoc, graphDocKey, subgraphConfig,
  [x IN nodeLabels WHERE not(any(y IN remoteNodeLabels WHERE x =~ '[+-/>]?' + y)) | x] as filteredNodeLabels
WITH u, email, graphDoc, graphDocKey, subgraphConfig,
  apoc.text.join(filteredNodeLabels, '|') as labelFilter
WITH u, email, graphDoc, graphDocKey, {
  labelFilter: CASE WHEN labelFilter <> '' THEN labelFilter ELSE null END,
  relationshipFilter: subgraphConfig.relationshipFilter
} as subgraphConfig

// security delegate logic for GraphDocs that are Sub-Documents of other GraphDocs
OPTIONAL MATCH (securityDelegate:GraphDoc {key: coalesce(graphDoc.securityDelegate, graphDoc.key)})
WITH u, email, graphDoc, coalesce(securityDelegate, graphDoc) as securityDelegate, graphDocKey, subgraphConfig
/*
CALL apoc.when(graphDoc.securityDelegate IS NOT NULL,
  'OPTIONAL MATCH (securityDelegate:GraphDoc {key: graphDoc.securityDelegate})
  RETURN coalesce(securityDelegate, graphDoc) as graphDoc',
  'RETURN graphDoc', {graphDoc: graphDoc}
) YIELD value
WITH u, email, graphDoc, value.graphDoc as securityDelegate, graphDocKey, subgraphConfig
*/
  
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(securityDelegate),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|KM_OWNER]-(securityDelegate)) OR u:Admin),"permission denied",[0])
CALL apoc.util.validate(
  securityDelegate.lockedByUser IS NOT NULL              /* graphDoc has been locked already */
  AND securityDelegate.lockedByUser <> email         /* locking user is not the current user */
  AND (timestamp() - securityDelegate.lockTimestamp) < (2 * 3600 * 1000) /* locking user has edited it within the past 2 hours */
, "locked by user '" + securityDelegate.lockedByUser + "' at " + securityDelegate.lockTimestamp, [0])

WITH u, graphDoc, subgraphConfig
CALL apoc.path.subgraphAll(graphDoc, subgraphConfig) YIELD nodes, relationships

OPTIONAL MATCH (graphDoc)-[:HAS_METADATA]->(metadata)
DETACH DELETE metadata
WITH graphDoc, nodes
UNWIND nodes as node
DETACH DELETE node
WITH graphDoc, collect(node) as deletedNodes
DETACH DELETE graphDoc
RETURN true as success
`

export const SaveGraphDocMetadata = `
WITH $graphDocMetadata as metadata,$email as e
MATCH (u:User {email:e})
MATCH (graphDoc:GraphDoc {key:metadata.key})
CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(graphDoc),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER|KM_OWNER|KM_MEMBER]-(graphDoc)) OR u:Admin),"permission denied",[0])
MERGE (graphDocMetadata:GraphDocMetadata {key: metadata.key})
  WITH *
  CALL apoc.create.addLabels([graphDocMetadata], [u.primaryOrganization]) YIELD node
WITH *
MERGE (graphDocMetadata)<-[:HAS_METADATA]-(graphDoc)
SET graphDoc.isPrivate = not(metadata.isPublic)
SET graphDocMetadata += apoc.map.submap(metadata, apoc.coll.intersection(keys(metadata),
													['cypherWorkbenchVersion','title','description','notes','viewSettings']), [], false)
SET graphDocMetadata.dateCreated = CASE WHEN NOT metadata.dateCreated IS NULL
    THEN metadata.dateCreated ELSE null END
SET graphDocMetadata.dateUpdated = CASE WHEN NOT metadata.dateUpdated IS NULL
    THEN metadata.dateUpdated ELSE null END
WITH u, metadata, graphDocMetadata,
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
WITH u, graphDocMetadata, [
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
        MERGE (graphDocMetadata)-[:$relationshipType]->(n)
        WITH *
        CALL apoc.create.addLabels([n], [user.primaryOrganization]) YIELD node
        WITH collect(n) as _
        RETURN 1 as result",
    removeCypher:
        "UNWIND collection as item
        MATCH (graphDocMetadata)-[r:$relationshipType]->(n:$nodeLabel {$keyProperty: item.$keyProperty})
        DELETE r
        WITH collect(n) as _
        RETURN 1 as result"
} as templates

/* process upserts */
UNWIND upserts as upsertItem
WITH u, graphDocMetadata, removes, templates, upsertItem,
  reduce(s = templates.upsertCypher, x IN ['nodeLabel','keyProperty','relationshipType'] | replace(s, '$' + x, upsertItem[x])) as upsertCypher,
  reduce(s = '', x IN upsertItem.setProperties | s + '\\nSET n.' + x + ' = item.' + x) as setStatements
WITH u, graphDocMetadata, removes, templates, upsertItem, replace(upsertCypher, '$SET_STMTS', setStatements) as upsertCypher
/* RETURN upsertCypher */
CALL apoc.do.when(size(upsertItem.upsert) > 0, upsertCypher, "RETURN 0 as result",
    {graphDocMetadata: graphDocMetadata, collection: upsertItem.upsert, user: u}) YIELD value
WITH u, graphDocMetadata, removes, templates, collect(value) as upsertReturnValues

/* process removes */
UNWIND removes as removeItem
WITH u, graphDocMetadata, removeItem, upsertReturnValues,
  reduce(s = templates.removeCypher, x IN ['nodeLabel','keyProperty','relationshipType'] | replace(s, '$' + x, removeItem[x])) as removeCypher
/* RETURN removeCypher */
CALL apoc.do.when(size(removeItem.remove) > 0, removeCypher, "RETURN 0 as result",
    {graphDocMetadata: graphDocMetadata, collection: removeItem.remove}) YIELD value
WITH graphDocMetadata, upsertReturnValues, collect(value) as removeReturnValues
RETURN graphDocMetadata.key as key
`
