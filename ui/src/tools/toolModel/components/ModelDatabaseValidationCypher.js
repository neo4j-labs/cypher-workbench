
// export const GetConstraintsDescription = `
// CALL db.constraints() YIELD description
// RETURN description
// `;

// TODO: change enhanceDataModelWithConstraintsAndIndexes to use this new format
export const GetConstraintsDescription = `SHOW CONSTRAINTS`;

// different versions of Neo4j respond with different columns, so we will need to figure stuff out during results processing
// export const GetIndexes = `
// CALL db.indexes()
// `

// TODO: change enhanceDataModelWithConstraintsAndIndexes to use this new format
export const GetIndexes = `SHOW INDEXES`;

export const CountNodesByLabel = `
WITH {
    countQuery: "
	    MATCH (n:\`$nodeType\`)
	    RETURN '$nodeType' as nodeLabel, count(n) as numNodes
	"
} as cypherQueries 
CALL db.labels() YIELD label AS nodeType
WITH replace(cypherQueries.countQuery, '$nodeType', nodeType) as countQuery
CALL apoc.cypher.run(countQuery, {}) YIELD value
RETURN value.nodeLabel as nodeLabel, value.numNodes as numNodes
`;

export const CountRelationshipTypesSpecifyDataModel = `
/* Specify data model and estimate relationships */
WITH $dataModel as dataModel, {
    countQuery: "
	    MATCH (n:\`$nodeType\`)
	    RETURN '$nodeType' as nodeLabel, count(n) as numNodes
	",
    getSampleNodes: "
	    MATCH (n:\`$nodeType\`) 
		RETURN n
		LIMIT toInteger($limit)
	",
	getOutboundRelationshipCount: "
	    RETURN count { (n)-[:\`$relType\`]->() } as numRels
	",
	checkForAnyRelationships: "
		MATCH (n:\`$nodeType\`)-[:\`$relType\`]->()
		RETURN n
		LIMIT 1
	"
} as cypherQueries, $limit as limit

// get node counts as a map
CALL db.labels() YIELD label AS nodeType
WITH cypherQueries, limit, dataModel,
	replace(cypherQueries.countQuery, '$nodeType', nodeType) as countQuery
CALL apoc.cypher.run(countQuery, {}) YIELD value
WITH cypherQueries, limit, dataModel, 
	collect(value.nodeLabel) as nodeLabels,
	collect([value.nodeLabel, value.numNodes]) as countsArray
WITH cypherQueries, limit, dataModel, nodeLabels,
	apoc.map.fromPairs(countsArray) as nodeCountsMap

// get sample nodes and for each relationship type check to see if there are relationships
UNWIND nodeLabels as nodeLabel
WITH cypherQueries, limit, dataModel[nodeLabel] as relationshipTypes, nodeLabel, nodeCountsMap, 
	replace(cypherQueries.getSampleNodes, '$nodeType', nodeLabel) as sampleNodesQuery
	
CALL apoc.cypher.run(sampleNodesQuery, {limit: limit}) YIELD value
WITH cypherQueries, limit, relationshipTypes, nodeLabel, nodeCountsMap, collect(value.n) as sampleNodes

UNWIND sampleNodes as sampleNode
UNWIND relationshipTypes as relationshipType
WITH cypherQueries, sampleNodes, relationshipType, nodeLabel, nodeCountsMap, sampleNode,
	replace(cypherQueries.getOutboundRelationshipCount, '$relType', relationshipType) as countOutboundQuery,
	reduce(s = cypherQueries.checkForAnyRelationships, 
		x IN [
				{ strVar:'$relType', strVal: relationshipType },
				{ strVar:'$nodeType', strVal: nodeLabel }
	  		] 
		| replace(s, x.strVar, x.strVal)) as checkForAnyRelationshipsQuery
CALL apoc.cypher.run(countOutboundQuery, {n: sampleNode}) YIELD value

WITH cypherQueries, sampleNodes, relationshipType, nodeLabel, nodeCountsMap, checkForAnyRelationshipsQuery,
	sum(value.numRels) as totalRels
CALL apoc.when(totalRels = 0, 
	"CALL apoc.cypher.run($checkRelQuery, {}) YIELD value
	RETURN CASE WHEN value.n IS NULL THEN 0 ELSE 1 END as totalRels",
	"RETURN $totalRels as totalRels",
	{ checkRelQuery: checkForAnyRelationshipsQuery, totalRels: totalRels }	
) YIELD value
WITH cypherQueries, sampleNodes, relationshipType, nodeLabel, nodeCountsMap, value.totalRels as totalRels
WHERE totalRels > 0
WITH nodeLabel, relationshipType, 
	toInteger((1.0*totalRels/size(sampleNodes)) * nodeCountsMap[nodeLabel]) as estimatedRelationships
WITH nodeLabel, apoc.map.fromPairs(collect([relationshipType,estimatedRelationships])) as estimatedRelCounts
RETURN nodeLabel, estimatedRelCounts
`;

export const CountRelationshipTypesUseApocMetaSchema = `
/* Estimate relationship counts via relationship types using apoc.meta.schema */
WITH {
    countQuery: "
	    MATCH (n:\`$nodeType\`)
	    RETURN '$nodeType' as nodeLabel, count(n) as numNodes
	",
    getSampleNodes: "
	    MATCH (n:\`$nodeType\`) 
		RETURN n
		LIMIT toInteger($limit)
	",
	getOutboundRelationshipCount: "
	    RETURN size((n)-[:\`$relType\`]->()) as numRels
	"
} as cypherQueries, $limit as limit

CALL apoc.meta.schema() YIELD value 
WITH cypherQueries, limit, 
	value as apocDataModel
UNWIND keys(apocDataModel) as key
WITH cypherQueries, limit, 
	apocDataModel, key
WHERE apocDataModel[key].type = 'node'
WITH cypherQueries, limit, 
	 apoc.map.fromPairs(collect([key, keys(apocDataModel[key].relationships)])) as dataModel

// get node counts as a map
CALL db.labels() YIELD label AS nodeType
WITH cypherQueries, limit, dataModel,
	replace(cypherQueries.countQuery, '$nodeType', nodeType) as countQuery
CALL apoc.cypher.run(countQuery, {}) YIELD value
WITH cypherQueries, limit, dataModel, 
	collect(value.nodeLabel) as nodeLabels,
	collect([value.nodeLabel, value.numNodes]) as countsArray
WITH cypherQueries, limit, dataModel, nodeLabels,
	apoc.map.fromPairs(countsArray) as nodeCountsMap

// get sample nodes and for each relationship type check to see if there are relationships
UNWIND nodeLabels as nodeLabel
WITH cypherQueries, limit, dataModel[nodeLabel] as relationshipTypes, nodeLabel, nodeCountsMap, 
	replace(cypherQueries.getSampleNodes, '$nodeType', nodeLabel) as sampleNodesQuery
	
CALL apoc.cypher.run(sampleNodesQuery, {limit: limit}) YIELD value
WITH cypherQueries, limit, relationshipTypes, nodeLabel, nodeCountsMap, collect(value.n) as sampleNodes

UNWIND sampleNodes as sampleNode
UNWIND relationshipTypes as relationshipType
WITH cypherQueries, sampleNodes, relationshipType, nodeLabel, nodeCountsMap, sampleNode,
	replace(cypherQueries.getOutboundRelationshipCount, '$relType', relationshipType) as countOutboundQuery
CALL apoc.cypher.run(countOutboundQuery, {n: sampleNode}) YIELD value

WITH cypherQueries, sampleNodes, relationshipType, nodeLabel, nodeCountsMap, sum(value.numRels) as totalRels
WHERE totalRels > 0
WITH nodeLabel, relationshipType, 
	toInteger((1.0*totalRels/size(sampleNodes)) * nodeCountsMap[nodeLabel]) as estimatedRelationships
WITH nodeLabel, apoc.map.fromPairs(collect([relationshipType,estimatedRelationships])) as estimatedRelCounts
RETURN nodeLabel, estimatedRelCounts
`;