
import { parseStatement } from "./CypherTests.test";

function stripWhitespace (string) {
    return string.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n')
}

test ('test disconnected nodes query', () => {
    let cypher = `
        WITH {
            disconnectedNodesQuery: "
                MATCH (n:\`$nodeType\`)
                WHERE count {(n)-[]-()} = 0
                WITH labelKeyMap, n 
                LIMIT 10000
                RETURN '$nodeType' AS nodeLabel, count(n) AS numDisconnected, collect(properties(n)[labelKeyMap['$nodeType']])[0..20] AS someDisconnectedKeyValues
                ORDER BY numDisconnected DESC",
            labelKeyMap: "
            CALL apoc.schema.nodes() YIELD label, properties
            WITH collect(CASE WHEN apoc.meta.cypher.isType(label, 'String') THEN label ELSE head(label) END) AS labels, collect(head(properties)) AS properties
        RETURN apoc.map.fromLists(labels, properties) AS labelKeyMap"
        } AS cypherQueries 
        CALL apoc.cypher.run(cypherQueries.labelKeyMap, {}) YIELD value
        WITH cypherQueries, value.labelKeyMap AS labelKeyMap
        CALL db.labels() YIELD label AS nodeTypes
        WITH cypherQueries, labelKeyMap, collect(nodeTypes) AS nodeTypes
        UNWIND nodeTypes AS nodeType
        WITH labelKeyMap, replace(cypherQueries.disconnectedNodesQuery, '$nodeType', nodeType) AS disconnectedNodesQuery
        CALL apoc.cypher.run(disconnectedNodesQuery, {labelKeyMap: labelKeyMap}) YIELD value
        RETURN value.nodeLabel AS label, value.numDisconnected AS numDisconnected, value.someDisconnectedKeyValues AS someDisconnectedKeyValues
        ORDER BY numDisconnected DESC, label
    `;

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test print out supernodes query', () => {
    let cypher = `
        WITH { 
            supernodeThreshold: 10000
        } AS params, {
            superNodesQuery: "
                MATCH (n:$nodeType)
                WHERE count{ (n)-[]-() } > supernodeThreshold
                WITH labelKeyMap, n 
                LIMIT 10000
                RETURN '$nodeType' AS nodeLabel, count(n) AS numSupernodes, 
                    collect(count {(n)-[]-()}) AS someDegreeValues,
                    collect(properties(n)[labelKeyMap['$nodeType']])[0..20] AS someSupernodeKeyValues
                ORDER BY numSupernodes DESC",
            labelKeyMap: "
            CALL apoc.schema.nodes() YIELD label, properties
            WITH collect(CASE WHEN apoc.meta.cypher.isType(label, 'String') THEN label ELSE head(label) END) AS labels, collect(head(properties)) AS properties
                        RETURN apoc.map.fromLists(labels, properties) AS labelKeyMap"
        } AS cypherQueries 
        CALL apoc.cypher.run(cypherQueries.labelKeyMap, {}) YIELD value
        WITH params, cypherQueries, value.labelKeyMap AS labelKeyMap
        CALL db.labels() YIELD label AS nodeTypes
        WITH params, cypherQueries, labelKeyMap, collect(nodeTypes) AS nodeTypes
        UNWIND nodeTypes AS nodeType
        WITH params, labelKeyMap, replace(cypherQueries.superNodesQuery, '$nodeType', nodeType) AS superNodesQuery
        CALL apoc.cypher.run(superNodesQuery, apoc.map.merge(params, { labelKeyMap: labelKeyMap })) YIELD value
        RETURN value.nodeLabel AS label, value.numSupernodes AS numSupernodes, value.someDegreeValues AS someDegreeValues, value.someSupernodeKeyValues AS someSupernodeKeyValues
        ORDER BY numSupernodes DESC, label
    `

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test Look for Node Labels that have different sets of property keys', () => {
    let cypher = `
        WITH "MATCH (n:$nodeType)
        WITH n LIMIT 10000
        UNWIND keys(n) AS key
        WITH n, key
        ORDER BY key
        WITH n, collect(key) AS keys
        RETURN '$nodeType' AS nodeType, count(n) AS nodeCount, size(keys) AS keyLen, keys
        ORDER BY keyLen" AS keyCheckQuery
        CALL db.labels() YIELD label AS nodeTypes
        WITH collect(nodeTypes) AS nodeTypes, keyCheckQuery
        UNWIND nodeTypes AS nodeType
        WITH replace(keyCheckQuery, '$nodeType', nodeType) AS nodeTypeKeyCheckQuery
        CALL apoc.cypher.run(nodeTypeKeyCheckQuery, null) YIELD value
        WITH value.nodeType AS nodeType, collect({
        nodeCount: value.nodeCount,
        keyLen: value.keyLen,
        keys: value.keys}) AS nodeInfoList
        WHERE size(nodeInfoList) > 1
        UNWIND nodeInfoList AS nodeInfo
        RETURN nodeType, nodeInfo.nodeCount AS nodeCount, nodeInfo.keyLen AS keyLen, nodeInfo.keys AS keys
        ORDER BY nodeType, keyLen
    `

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test Find nodes that may not have the correct relationships - source node (just looks for differences in the data', () => {
    let cypher = `
        WITH "MATCH (src:$srcNodeLabel)
        WITH src
        LIMIT 1000
        OPTIONAL MATCH (src)-[:$relationshipType]->(dest:$destNodeLabel)
        WITH src, count(dest) AS destCount
        WITH src, CASE WHEN (destCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(src) AS srcCount, sum(flag) AS destCount
        RETURN srcCount, destCount AS numPresent, (srcCount - destCount) AS numMissing" AS checkMissingRelationshipsQuery, "MATCH (src)-[:$relationshipType]->(dest)
        WITH src, dest
        LIMIT 1
        RETURN {relationshipType:'$relationshipType',
        srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
        destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap" AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.srcNodeLabel + ' missing ' + relInfo.relationshipType + '->' + relInfo.destNodeLabel AS srcPath, value.srcCount AS srcCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, srcPath
    `

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test Find nodes that may not have the correct relationships - dest node', () => {
    let cypher = `
        WITH "MATCH (dest:$destNodeLabel)
        WITH dest
        LIMIT 1000
        OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
        WITH count(src) AS srcCount, dest
        WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(dest) AS destCount, sum(flag) AS srcCount
        RETURN destCount, srcCount AS numPresent, (destCount - srcCount) AS numMissing" AS checkMissingRelationshipsQuery, "MATCH (src)-[:$relationshipType]->(dest)
        WITH src, dest
        LIMIT 1
        RETURN {relationshipType:'$relationshipType',
        srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
        destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap" AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, destPath    
    `;

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test Find nodes that may not have the correct relationships - source node - apoc version', () => {
    let cypher = `
        WITH {
            checkMissingRelationshipsQueryTemplate: '
                MATCH (src:$srcNodeLabel)
                WITH src
                LIMIT 1000
                OPTIONAL MATCH (src)-[:$relationshipType]->(dest:$destNodeLabel)
                WITH src, count(dest) AS destCount
                WITH src, CASE WHEN (destCount = 0) THEN 0 ELSE 1 END AS flag
                WITH count(src) AS srcCount, sum(flag) AS destCount
                RETURN srcCount, destCount AS numPresent, (srcCount - destCount) AS numMissing',    
            relationshipCypherQueryTemplate: '
                // params: sampleSize
                CALL apoc.meta.schema({sample:sampleSize,maxRels:sampleSize}) YIELD value
                WITH value
                UNWIND keys(value) AS label
                WITH label, value[label] AS item
                WHERE item.type = "node"
                WITH [
                        x IN keys(item.relationships) WHERE item.relationships[x]["direction"] = "out" | 
                            {
                                srcNodeLabel: label, 
                                relationshipType: x, 
                                destNodeLabel: apoc.text.join(item.relationships[x]["labels"],":")
                            } 
                    ] AS returnMapList
                UNWIND returnMapList AS returnMap
                RETURN returnMap
            '
        } AS cypherStatements

        CALL apoc.cypher.run(cypherStatements.relationshipCypherQueryTemplate, {sampleSize: 500}) YIELD value
        WITH reduce(s = cypherStatements.checkMissingRelationshipsQueryTemplate, aKey IN keys(value.returnMap) | replace(s, '$' + aKey, '' + value.returnMap[aKey])) AS newCheckMissingRelationshipsQuery, value.returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.srcNodeLabel + ' missing ' + relInfo.relationshipType + '->' + relInfo.destNodeLabel AS srcPath, value.srcCount AS srcCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, srcPath
    `

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});

test ('test Find nodes that may not have the correct relationships - dest node - apoc version', () => {
    let cypher = `
        WITH {
            checkMissingRelationshipsQueryTemplate: '
                MATCH (dest:$destNodeLabel)
                WITH dest
                LIMIT 1000
                OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
                WITH count(src) AS srcCount, dest
                WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
                WITH count(dest) AS destCount, sum(flag) AS srcCount
                RETURN destCount, srcCount AS numPresent, (destCount - srcCount) AS numMissing',    
            relationshipCypherQueryTemplate: '
                // params: sampleSize, direction
                CALL apoc.meta.schema({sample:sampleSize,maxRels:sampleSize}) YIELD value
                WITH value
                UNWIND keys(value) AS label
                WITH label, value[label] AS item
                WHERE item.type = "node"
                WITH [
                        x IN keys(item.relationships) WHERE item.relationships[x]["direction"] = "in" | 
                            {
                                srcNodeLabel: apoc.text.join(item.relationships[x]["labels"],":"), 
                                relationshipType: x, 
                                destNodeLabel: label
                            } 
                    ] AS returnMapList
                UNWIND returnMapList AS returnMap
                RETURN returnMap
            '
        } AS cypherStatements

        CALL apoc.cypher.run(cypherStatements.relationshipCypherQueryTemplate, {sampleSize: 500}) YIELD value
        WITH reduce(s = cypherStatements.checkMissingRelationshipsQueryTemplate, aKey IN keys(value.returnMap) | replace(s, '$' + aKey, '' + value.returnMap[aKey])) AS newCheckMissingRelationshipsQuery, value.returnMap AS relInfo

        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, {}) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, destPath
    `

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(generatedCypher);

    expect(stripWhitespace(generatedCypher)).toEqual(stripWhitespace(cypher))

});
