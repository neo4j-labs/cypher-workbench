
import CypherStringConverter, { getCypherStringFromClauses } from './cypherStringConverter';
import {
    RELATIONSHIP_DIRECTION
} from './cypherPattern';
import { ORDER_DIRECTION } from './cypherOrderBy';

test ('convert MATCH, OPTIONAL MATCH, RETURN, ORDER BY, SKIP, LIMIT', () => {
    var cypher = `
        MATCH (person:Person {name:"Keanu", age: 40})-[acted_in:ACTED_IN]->(movie:Movie) 
        OPTIONAL MATCH (person)-[:DIRECTED]->(movie)
        RETURN person, movie
        ORDER BY person, movie DESC
        SKIP 5
        LIMIT 10
    `;

    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    expect(clauses[0].keyword).toBe('MATCH');
    var pattern = clauses[0].clauseInfo;
    expect(pattern.patternParts.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern).not.toBeNull();
    expect(pattern.patternParts[0].pathPattern.nodePattern.variable).toBe('person');
    expect(pattern.patternParts[0].pathPattern.nodePattern.nodeLabels).toStrictEqual(['Person']);
    expect(pattern.patternParts[0].pathPattern.nodePattern.propertyMap).toStrictEqual({name: 'Keanu', age: 40});

    expect(pattern.patternParts[0].pathPattern.patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].nodePattern.nodeLabels).toStrictEqual(['Movie']);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

    expect(clauses[1].keyword).toBe('OPTIONAL MATCH');
    pattern = clauses[1].clauseInfo;
    expect(pattern.patternParts.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern).not.toBeNull();
    expect(pattern.patternParts[0].pathPattern.nodePattern.variable).toBe('person');

    expect(pattern.patternParts[0].pathPattern.patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.types).toStrictEqual(['DIRECTED']);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

    expect(clauses[2].keyword).toBe('RETURN');
    var returnInfo = clauses[2].clauseInfo;
    var returnItem = returnInfo.returnItems[0];
    var returnItem2 = returnInfo.returnItems[1];
    expect(returnItem.variable).toBe('person');
    expect(returnItem2.variable).toBe('movie');

    expect(clauses[3].keyword).toBe('ORDER BY');
    var orderByInfo = clauses[3].clauseInfo;
    var orderByItem = orderByInfo.orderByItems[0];
    var orderByItem2 = orderByInfo.orderByItems[1];
    expect(orderByItem.expression).toBe('person');
    expect(orderByItem.orderDirection).toBe(ORDER_DIRECTION.ASC);
    expect(orderByItem2.expression).toBe('movie');
    expect(orderByItem2.orderDirection).toBe(ORDER_DIRECTION.DESC);

    expect(clauses[4].keyword).toBe('SKIP');
    expect(clauses[4].clauseInfo).toBe('5');

    expect(clauses[5].keyword).toBe('LIMIT');
    expect(clauses[5].clauseInfo).toBe('10');
});

test ('convert MATCH, WHERE, WITH, CALL, RETURN', () => {
    var cypher = `
        MATCH (person:Person)-[:ACTED_IN]->(movie:Movie) 
        WHERE NOT person IS NULL
        WITH person, movie
        WHERE NOT movie IS NULL
        CALL apoc.foo() YIELD value 
        RETURN person, movie, value
    `;

    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    expect(clauses[0].keyword).toBe('MATCH');
    var pattern = clauses[0].clauseInfo;
    expect(pattern.patternParts.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern).not.toBeNull();
    expect(pattern.patternParts[0].pathPattern.nodePattern.variable).toBe('person');
    expect(pattern.patternParts[0].pathPattern.nodePattern.nodeLabels).toStrictEqual(['Person']);

    expect(pattern.patternParts[0].pathPattern.patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].nodePattern.nodeLabels).toStrictEqual(['Movie']);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);
    expect(pattern.patternParts[0].pathPattern.patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

    expect(clauses[1].keyword).toBe('WHERE');
    expect(clauses[1].clauseInfo.whereItems.length).toBe(4);
    var whereItems = clauses[1].clauseInfo.whereItems;
    expect(whereItems[0].leftHandSide.trim()).toBe('NOT');
    expect(whereItems[1].leftHandSide.trim()).toBe('person');
    expect(whereItems[2].leftHandSide.trim()).toBe('IS');
    expect(whereItems[3].leftHandSide.trim()).toBe('NULL');

    expect(clauses[2].keyword).toBe('WITH');
    expect(clauses[2].clauseInfo).toBe('person, movie');
    
    expect(clauses[3].keyword).toBe('WHERE');
    whereItems = clauses[3].clauseInfo.whereItems;
    expect(whereItems[0].leftHandSide.trim()).toBe('NOT');
    expect(whereItems[1].leftHandSide.trim()).toBe('movie');
    expect(whereItems[2].leftHandSide.trim()).toBe('IS');
    expect(whereItems[3].leftHandSide.trim()).toBe('NULL');

    expect(clauses[4].keyword).toBe('CALL');
    expect(clauses[4].clauseInfo).toBe('apoc.foo() YIELD value');

    expect(clauses[5].keyword).toBe('RETURN');
    var returnInfo = clauses[5].clauseInfo;
    var returnItem = returnInfo.returnItems[0];
    var returnItem2 = returnInfo.returnItems[1];
    var returnItem3 = returnInfo.returnItems[2];
    expect(returnItem.variable).toBe('person');
    expect(returnItem2.variable).toBe('movie');
    expect(returnItem3.variable).toBe('value');
});

test('getCypherStringFromClauses', () => {
    var cypher = `
        MATCH (person:Person)-[:ACTED_IN]->(movie:Movie) 
        WHERE NOT person IS NULL
        WITH person, movie
        WHERE NOT movie IS NULL
        CALL apoc.foo() YIELD value 
        RETURN person, movie, value
    `;    
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    var cypherString = getCypherStringFromClauses(clauses);

    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    expect(cypherString).toBe(trimmedCypher);
    //console.log(cypherString);
})

test('test SubQuery', () => {
    var cypher = `
        MATCH (dm:DataModel) 
        CALL {
        WITH dm
        MATCH (dm)-[:HAS_METADATA]->(meta:DataModelMetadata)
        RETURN meta
        }
        CALL {
            WITH dm
            MATCH (dm)-[:HAS_NODE_LABEL]->(nl:NodeLabel)
            RETURN count(nl) AS numNodeLabels
        }
        RETURN dm.key, meta.title, numNodeLabels
        LIMIT 10    
    `;
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    var cypherString = getCypherStringFromClauses(clauses);

    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    expect(cypherString).toBe(trimmedCypher);
})

test('test GDS call', () => {
    var cypher = `
        CALL gds.pageRank.stream('Foo', {}) YIELD nodeId, score
    `;    
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    var cypherString = getCypherStringFromClauses(clauses);

    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    expect(cypherString).toBe(trimmedCypher);
    //console.log(cypherString);
})

test('test implicit call', () => {
    var cypher = `
        CALL dbms.listQueries
    `;    
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    var cypherString = getCypherStringFromClauses(clauses);

    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    expect(cypherString).toBe(trimmedCypher);
    //console.log(cypherString);
})

test('get all variables from cypher', () => {
    var cypher = `
        MATCH (person:Person)-[:ACTED_IN]->(movie:Movie) 
        WHERE NOT person IS NULL
        WITH person, movie
        WHERE NOT movie IS NULL
        CALL apoc.foo() YIELD value 
        RETURN person, movie, value
    `

    const cypherStringConverter = new CypherStringConverter();
    var variables = cypherStringConverter.getAllVariables(cypher);
    expect(variables).toStrictEqual(['person','movie','value']);
})

test('get all variables from cypher 2', () => {
    var cypher = `
        MATCH (person:Person)-[rel1:ACTED_IN]->(movie:Movie) 
        WHERE NOT person IS NULL
        WITH person, movie, {} as newVar
        WHERE NOT movie IS NULL
        CALL apoc.foo() YIELD value 
        RETURN person, movie, value
    `

    const cypherStringConverter = new CypherStringConverter();
    var variables = cypherStringConverter.getAllVariables(cypher);
    expect(variables).toStrictEqual(['person','rel1', 'movie','newVar','value']);
})

test('get all variables from convertToClausesAndVariables', () => {
    var cypher = `
        MATCH (person:Person)-[rel1:ACTED_IN]->(movie:Movie) 
        WHERE NOT person IS NULL
        WITH person, movie, {} as newVar
        WHERE NOT movie IS NULL
        CALL apoc.foo() YIELD value 
        RETURN person, movie, value
    `

    const cypherStringConverter = new CypherStringConverter();
    var { returnVariables } = cypherStringConverter.convertToClausesAndVariables(cypher);
    expect(returnVariables).toStrictEqual(['person','rel1', 'movie','newVar','value']);
})
