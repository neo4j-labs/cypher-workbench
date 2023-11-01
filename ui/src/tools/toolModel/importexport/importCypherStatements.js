
export const DbSchema = `
CALL db.schema.visualization() YIELD nodes, relationships
UNWIND nodes as nodeType
WITH apoc.convert.toMap(nodeType) as nodeType, relationships
UNWIND nodeType.constraints as constraint

WITH nodeType, relationships, constraint, CASE
 WHEN constraint CONTAINS 'IS UNIQUE' THEN { type: 'isUnique', replaceTokens: ['CONSTRAINT ON ( ',' ) ASSERT ',' IS UNIQUE'] }
 WHEN constraint CONTAINS 'IS NODE KEY' THEN { type: 'isNodeKey', replaceTokens: ['CONSTRAINT ON ( ',' ) ASSERT (',',',') IS NODE KEY'] }
 WHEN constraint CONTAINS 'ASSERT exists' THEN { type: 'assertExists', replaceTokens: ['CONSTRAINT ON ( ',' ) ASSERT exists(', ')'] }
END as constraintParseInfo

WITH nodeType, relationships, constraintParseInfo,
    reduce(s = constraint, phrase IN constraintParseInfo.replaceTokens | replace(s, phrase, ' ')) as constraintParts
WITH nodeType, relationships, constraintParseInfo, split(constraintParts, ' ') as constraintTokens
WITH nodeType, relationships, constraintParseInfo, tail([x IN constraintTokens WHERE x <> '']) as constraintTokens
WITH nodeType, relationships, constraintParseInfo, extract(x IN constraintTokens | split(x, '.')[1]) as propertyName
WITH relationships, nodeType.name as name, collect({ type: constraintParseInfo.type, properties: propertyName}) as constraints
WITH relationships, collect({ name: name, constraints: constraints }) as nodes
UNWIND relationships as relationship
WITH nodes, {
    startNode: apoc.convert.toMap(startNode(relationship)).name,
    relationshipType: type(relationship),
    endNode: apoc.convert.toMap(endNode(relationship)).name
} as relationshipMap
WITH nodes, collect(relationshipMap) as relationships
RETURN { nodes: nodes, relationships: relationships } as dataModel
`;
