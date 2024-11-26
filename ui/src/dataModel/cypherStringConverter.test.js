
import CypherStringConverter, { getCypherStringFromClauses } from './cypherStringConverter';
import {
    RELATIONSHIP_DIRECTION
} from './cypherPattern';
import { ORDER_DIRECTION } from './cypherOrderBy';
import { Pattern } from './cypherPattern';

export function convertCypherAndReturnStrings (cypher) {
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    // console.log('clauses: ', clauses);
    var cypherString = getCypherStringFromClauses(clauses);

    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    cypherString = cypherString.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join('\n');

    return { cypherString, trimmedCypher };
}

export function testConvertCypherAndReturnStrings (cypher) {
    cypher = cypher + '\nRETURN n';
    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
}

export function testConvertCypherAndReturnStringsDontAddReturn (cypher) {
    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
}

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
    expect(pattern.patternParts[0].getPathPattern()).not.toBeNull();
    //console.log('pattern.patternParts[0].getPathPattern(): ', pattern.patternParts[0].getPathPattern());
    expect(pattern.patternParts[0].getPathPattern().nodePattern.variable).toBe('person');
    expect(pattern.patternParts[0].getPathPattern().nodePattern.nodeLabels).toStrictEqual(['Person']);
    expect(pattern.patternParts[0].getPathPattern().nodePattern.propertyMap).toStrictEqual({name: '"Keanu"', age: 40});

    expect(pattern.patternParts[0].getPathPattern().patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.nodeLabels).toStrictEqual(['Movie']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

    expect(clauses[1].keyword).toBe('OPTIONAL MATCH');
    pattern = clauses[1].clauseInfo;
    expect(pattern.patternParts.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern()).not.toBeNull();
    expect(pattern.patternParts[0].getPathPattern().nodePattern.variable).toBe('person');

    expect(pattern.patternParts[0].getPathPattern().patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.types).toStrictEqual(['DIRECTED']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

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
    expect(pattern.patternParts[0].getPathPattern()).not.toBeNull();
    expect(pattern.patternParts[0].getPathPattern().nodePattern.variable).toBe('person');
    expect(pattern.patternParts[0].getPathPattern().nodePattern.nodeLabels).toStrictEqual(['Person']);

    expect(pattern.patternParts[0].getPathPattern().patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.nodeLabels).toStrictEqual(['Movie']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);

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

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
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
            RETURN count(nl) as numNodeLabels
        }
        RETURN dm.key, meta.title, numNodeLabels
        LIMIT 10    
    `;

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);

    // const cypherStringConverter = new CypherStringConverter();
    // var clauses = cypherStringConverter.convertToClauses(cypher);
    // // console.log('clauses: ', clauses);
    // // console.log('clauses[1]: ', clauses[1].clauses);
    // // console.log('clauses[2]: ', clauses[2].clauses);
    // expect(clauses[1].clauses[0].keyword).toEqual('WITH');
    // expect(clauses[1].clauses[1].keyword).toEqual('MATCH');
    // expect(clauses[1].clauses[2].keyword).toEqual('RETURN');
    // expect(clauses[2].clauses[0].keyword).toEqual('WITH');
    // expect(clauses[2].clauses[1].keyword).toEqual('MATCH');
    // expect(clauses[2].clauses[2].keyword).toEqual('RETURN');

})

test('test GDS call', () => {
    var cypher = `
        CALL gds.pageRank.stream('Foo', {}) YIELD nodeId, score
    `;    

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
    //console.log(cypherString);
})

test('test implicit call', () => {
    var cypher = `
        CALL dbms.listQueries
    `;    

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
    //console.log(cypherString);
})

test('test in query call', () => {
    // not optional
    var cypher = `
        MATCH (n)
        CALL apoc.neighbors.tohop(n, "KNOWS>", 1) YIELD node
        RETURN n.name as name, collect(node.name) as connections
    `;    

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);

    // optional
    cypher = `
        MATCH (n)
        OPTIONAL CALL apoc.neighbors.tohop(n, "KNOWS>", 1) YIELD node
        RETURN n.name as name, collect(node.name) as connections
    `; 
    //console.log(cypherString);

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
})

test('test skip / offset', () => {
    // not optional
    var cypher = `
        MATCH (n)
        SKIP 2
        RETURN collect(n.name) as names
    `;    

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);

    // optional
    cypher = `
        MATCH (n)
        OFFSET 2
        RETURN collect(n.name) as names
    `; 
    //console.log(cypherString);

    var { cypherString, trimmedCypher } = convertCypherAndReturnStrings(cypher);
    expect(cypherString).toBe(trimmedCypher);
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

test('node and rel where', () => {
    testConvertCypherAndReturnStrings("MATCH (n WHERE n.foo = 'bar' AND n.bar = 'foo')");
    testConvertCypherAndReturnStrings("MATCH (n)-[r WHERE r.foo = 'bar']->()");
    testConvertCypherAndReturnStrings("MATCH (n)-[r WHERE r.foo = 'bar']->(s:Foo WHERE s:Bar)");
})

test('basic patterns', () => {
    testConvertCypherAndReturnStrings("MATCH (n)-[r*]->()");
    testConvertCypherAndReturnStrings("MATCH (n)-[r*1..2]->()");
    testConvertCypherAndReturnStrings("MATCH (n)-[r:FOO|BAR]->()");
})

test('node label terms', () => {
    testConvertCypherAndReturnStrings("MATCH (n)");
    testConvertCypherAndReturnStrings("MATCH (n:%)");
    testConvertCypherAndReturnStrings("MATCH (n:Foo:Bar)");
    testConvertCypherAndReturnStrings("MATCH (n:Foo&Bar)");
    testConvertCypherAndReturnStrings("MATCH (n:Foo&!Bar)");
    testConvertCypherAndReturnStrings("MATCH (n:Foo|Bar)");
    testConvertCypherAndReturnStrings("MATCH (n:(Foo|Bar)&Baz)");
});

test('General patterns', () => {
    testConvertCypherAndReturnStrings("MATCH (n)-[*]->()");
    testConvertCypherAndReturnStrings("MATCH (x)-[*2]->()");
    testConvertCypherAndReturnStrings("MATCH (x)-[*1..2]->()");
    testConvertCypherAndReturnStrings("MATCH (x)-[*1..]->()");
    testConvertCypherAndReturnStrings("MATCH (x)-[*..2]->()");
    testConvertCypherAndReturnStrings("MATCH (a)-[:KNOWS*3..5]->(b)");
    testConvertCypherAndReturnStrings("MATCH (a)-[r*..5 {name:'Filipa'}]->(b)");
    testConvertCypherAndReturnStrings("MATCH (a)-[]->(b)-[]->(c)-[]->(a)");
    testConvertCypherAndReturnStrings("MATCH (a)-[]->(b)-[]->(c), (b)-[]->(e)");
    testConvertCypherAndReturnStrings("MATCH (a:A)<-[ {p:30}]-(b)-[t WHERE t.q > 0]->(c:C)");
});

test('Relationship quantifier', () => {
    testConvertCypherAndReturnStrings("MATCH ()-[]-+ ()");
    testConvertCypherAndReturnStrings("MATCH (:A)-[:R]->{0,10} (:B)");
});

test('Relationship relationship strings', () => {
    testConvertCypherAndReturnStrings("MATCH ()-[r:FOO|BAR]->()");
    testConvertCypherAndReturnStrings("MATCH ()-[r:%]->()");
    testConvertCypherAndReturnStrings("MATCH ()-[r:FOO|!BAR]->()");
    testConvertCypherAndReturnStrings("MATCH ()-[r:FOO&BAR&BAZ]->()");
});

test ('test QPP', () => {
    testConvertCypherAndReturnStrings("MATCH (:A) ((a)<-[s:X WHERE a.p = s.p]-(b)){,5}");
    testConvertCypherAndReturnStrings("MATCH (n) ((startNode)-[:MY_PATTERN]->()){1,3} (end)");
    testConvertCypherAndReturnStrings("MATCH (:Station {name:'Denmark Hill'})<-[:CALLS_AT]-(d:Stop) ((:Stop)-[:NEXT]->(:Stop)){1,3} (a:Stop)-[:CALLS_AT]->(:Station {name:'Clapham Junction'})");
    testConvertCypherAndReturnStrings(`
        MATCH (a)-[]->(b)-[]->(c), (b) ((d)-[]->(e))+ 
        WHERE any(n in d WHERE n.p = a.p)
    `);
    testConvertCypherAndReturnStrings("MATCH (:A)-[:R]->(:B) ((:X)<-[]-(:Y)){1,2}");
    testConvertCypherAndReturnStrings("MATCH ()-[r WHERE r.q = n.q]-() (()<-[s:X WHERE n.p = s.p]-()){2,3}");
    testConvertCypherAndReturnStrings("MATCH ((x)-[r]->(z WHERE z.p > x.p)){2,3}");
    testConvertCypherAndReturnStrings("MATCH ((x)-[r]->(z) WHERE z.p > x.p){2,3}");
    testConvertCypherAndReturnStrings("MATCH ((:A)-[:R]->(:B)){2}  ((:X)<-[]-(:Y)){1,2}");
    testConvertCypherAndReturnStrings("MATCH ((n:A)-[:R]->( {p:30}) WHERE EXISTS { (n)-->+(:X) }){2,3}");
    testConvertCypherAndReturnStrings("MATCH p = (c:Company) (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company)");    
});

test('test complicated where', () => {
    testConvertCypherAndReturnStrings(`
        MATCH (a)-[]->(b)-[]->(c), (b) ((d)-[]->(e))+ 
        WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} = size([a] + a_i)
    `);
});

test ('Cypher bullet train blog query', () => {
    testConvertCypherAndReturnStrings(`
        MATCH (a:Account)<-[f:FROM]-(first_tx:Transaction)
        MATCH path = (a)<-[f]-(first_tx) ((tx_i:Transaction)-[:TO]->(a_i:Account)<-[:FROM]-(tx_j:Transaction) WHERE tx_i.date < tx_j.date
        AND tx_i.amount >= tx_j.amount >= 0.80 * tx_i.amount)+ (last_tx:Transaction)-[:TO]->(a)
        WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} =
        size([a] + a_i)
    `);
});

test ('Union', () => {
    let cypher = `
        MATCH p = (c:Company) (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company)
        WHERE NOT (:Company)-[:OWNS]->(c)
        AND NOT (leaf)-[:OWNS]->(:Company)
        WITH c, parentOfLeaf, collect(p)[0..3] as pathsToReturn
        UNWIND pathsToReturn AS path
        RETURN path
        UNION
        MATCH p = (c:Company)-[:OWNS]->(:Company)
        WHERE NOT (:Company)-[:OWNS]->(c)
        WITH c, collect(p)[0..3] as pathsToReturn
        UNWIND pathsToReturn AS path
        RETURN path
    `;
    testConvertCypherAndReturnStringsDontAddReturn(cypher);

    // const cypherStringConverter = new CypherStringConverter();
    // var clauses = cypherStringConverter.convertToClauses(cypher);
    //console.log('clauses: ', clauses);
    //console.log(JSON.stringify(clauses, null, 2));

});

test ('Where clause with ORs', () => {
    let cypher = `
        MATCH (p:Person WHERE p.name = 'Keanu Reeves' OR p.name CONTAINS 'Carrie' OR p.name CONTAINS 'Tom')
            -[:ACTED_IN|DIRECTED]->(m:Movie) RETURN p.name, m.title
    `;

    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    let whereItems = clauses[0].clauseInfo.patternParts[0].pathPatterns[0].nodePattern.where.whereItems;
    //console.log('whereItems: ', whereItems);
    expect(whereItems.length).toBe(12);
    let leftHandStrings = whereItems.map(x => x.leftHandSide);
    //console.log(leftHandStrings);
    expect(leftHandStrings).toStrictEqual([
            'p.name ',   '= ',
            "'Keanu ",   "Reeves' ",
            'OR ',       'p.name ',
            'CONTAINS ', "'Carrie' ",
            'OR ',       'p.name ',
            'CONTAINS ', "'Tom'"
    ]);
});

test('test pattern with var and qpp', () => {
    let cypher = "MATCH p = (c:Company) (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company) RETURN p";
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);
    let patternPart = clauses[0].clauseInfo.patternParts[0];
    expect(patternPart.variable).toBe('p');
    expect(patternPart.pathPatterns.length).toBe(1);
    let pathPattern = patternPart.pathPatterns[0];
    let nodePattern = pathPattern.nodePattern;
    let patternElementChain = pathPattern.patternElementChain;
    expect(nodePattern.variable).toBe('c')
    expect(nodePattern.nodeLabels).toStrictEqual(['Company'])
    expect(patternElementChain.length).toBe(2)

    let qpp = patternElementChain[0].relationshipPattern.quantifiedPathPattern;
    let parentOfLeaf = patternElementChain[0].nodePattern;
    let ownsNonQpp = patternElementChain[1].relationshipPattern;
    let leaf = patternElementChain[1].nodePattern;

    expect(parentOfLeaf.variable).toBe('parentOfLeaf');
    expect(ownsNonQpp.types).toStrictEqual(['OWNS']);
    expect(leaf.variable).toBe('leaf');
    
    expect(qpp.pathPatternQuantifier).toBe('+')
    let qppRel = qpp.pathPattern.patternElementChain[0].relationshipPattern;
    expect(qppRel.types).toStrictEqual(['OWNS'])
    //console.log('info: ', qppRel);
});

test('with 1 as x return *', () => {
    let cypher = `with 1 as x return *`;
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    let returnClause = clauses.find(clause => clause.keyword === 'RETURN')
    // console.log('returnClause.clauseInfo: ', returnClause.clauseInfo);
    // console.log('returnClause.clauseInfo.getReturnItems: ', returnClause.clauseInfo.getReturnItems());
    // console.log('returnClause.clauseInfo.toCypherString: ', returnClause.clauseInfo.toCypherString());
    expect(returnClause.clauseInfo.toCypherString()).toBe('RETURN *');
})

test('test pattern with return *', () => {
    let cypher = `
        MATCH (p1:Person)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(p2:Person)
        WHERE p1 <> p2
        RETURN *
        LIMIT 20    
    `;
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    let returnClause = clauses.find(clause => clause.keyword === 'RETURN')
    // console.log('returnClause.clauseInfo: ', returnClause.clauseInfo);
    // console.log('returnClause.clauseInfo.getReturnItems: ', returnClause.clauseInfo.getReturnItems());
    // console.log('returnClause.clauseInfo.toCypherString: ', returnClause.clauseInfo.toCypherString());
    expect(returnClause.clauseInfo.toCypherString()).toBe('RETURN *');
});

test('Cypher runtime=parallel', () => {
    let cypher = `
        CYPHER runtime=parallel
        MATCH (p1:Person)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(p2:Person)
        WHERE p1 <> p2
        RETURN *
        LIMIT 20    
    `;
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    expect(clauses.length).toBe(5);
    expect(clauses[0].toCypherString()).toBe('CYPHER runtime=parallel');
    // console.log('clauses: ', clauses);
});

test('Cypher runtime = parallel', () => {
    let cypher = `
        CYPHER runtime = parallel
        MATCH (p1:Person)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(p2:Person)
        WHERE p1 <> p2
        RETURN *
        LIMIT 20    
    `;
    const cypherStringConverter = new CypherStringConverter();
    var clauses = cypherStringConverter.convertToClauses(cypher);

    expect(clauses.length).toBe(5);
    expect(clauses[0].toCypherString()).toBe('CYPHER runtime = parallel');
    // console.log('clauses: ', clauses);
});

test('Cypher runtime = parallel - clauses and vars', () => {
    let cypher = `
        CYPHER runtime = parallel
        MATCH (p1:Person)-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(p2:Person)
        WHERE p1 <> p2
        RETURN *
        LIMIT 20    
    `;
    const cypherStringConverter = new CypherStringConverter();
    var { returnClauses } = cypherStringConverter.convertToClausesAndVariables(cypher);

    expect(returnClauses.length).toBe(5);
    expect(returnClauses[0].toCypherString()).toBe('CYPHER runtime = parallel');
    // console.log('clauses: ', clauses);
});

test('Station query with WHERE NOT EXISTS (pattern)', () => {
    let cypher = `
        MATCH (:Station {name:'Denmark Hill'})<-[:CALLS_AT]-(s1:Stop)-[:NEXT]->+ (sN:Stop WHERE NOT EXISTS { (sN)-[:NEXT]->(:Stop) })-[:CALLS_AT]->(d:Station)
        RETURN s1.departs as departure, sN.arrives as arrival, d.name as finalDestination    
    `
    testConvertCypherAndReturnStringsDontAddReturn(cypher);
});

// test('Where clause after a pattern', () => {
//     let cypher = "MATCH ((x)-[r]->(z) WHERE z.p > x.p){2,3} RETURN x";

//     const cypherStringConverter = new CypherStringConverter();
//     var clauses = cypherStringConverter.convertToClauses(cypher);
//     let whereItems = clauses[0].clauseInfo.patternParts[0].pathPatterns[0].quantifiedPathPattern.where.whereItems;
//     //console.log('whereItems: ', whereItems);
//     expect(whereItems.length).toBe(3);
//     let leftHandStrings = whereItems.map(x => x.leftHandSide);
//     //console.log(leftHandStrings);
//     expect(leftHandStrings).toStrictEqual([ 'z.p ', '> ', 'x.p' ]);    

//     var cypherString = getCypherStringFromClauses(clauses);    
//     console.log('cypherString: ', cypherString);

//     console.log('(clauses[0].clauseInfo instanceof Pattern): ', (clauses[0].clauseInfo instanceof Pattern))
//     let clauseCypher = clauses[0].clauseInfo.toCypherString();
//     console.log('clauseCypher', clauseCypher);
//     let qppCypher = clauses[0].clauseInfo.patternParts[0].pathPatterns[0].quantifiedPathPattern.toCypherString();
//     console.log('qppCypher', qppCypher);
//     let whereCypher = clauses[0].clauseInfo.patternParts[0].pathPatterns[0].quantifiedPathPattern.where.toCypherString();
//     console.log('whereCypher', whereCypher);
//    // console.log(clauses[0].clauseInfo.patternParts[0].pathPatterns[0].quantifiedPathPattern.where.whereItems);
// });


test('Test count { expression } in WITH', () => {
    let cypher = `
        MATCH (c:Company)
        WITH c, count { (c)-[:SOURCE_RECORD]->() } as numSources
        ORDER BY numSources DESC
        WITH c 
        LIMIT 10
        MATCH p = (c)-[:SOURCE_RECORD]->()
        RETURN p    
    `
    testConvertCypherAndReturnStringsDontAddReturn(cypher);
});

test('Test count { expression } in WHERE', () => {
    let cypher = `
        MATCH (c:Company)
        WHERE count { (c)-[:SOURCE_RECORD]->() } > 0
        WITH c 
        LIMIT 10
        MATCH p = (c)-[:SOURCE_RECORD]->()
        RETURN p    
    `
    testConvertCypherAndReturnStringsDontAddReturn(cypher);
});

test('Test count { expression } and WITH transformations', () => {
    let cypher = `
    MATCH (c:Company)
    WITH c, count { (c)-[:SOURCE_RECORD]->() } as numSources
    ORDER BY numSources DESC
    WITH c, numSources 
    LIMIT 10
    MATCH (c)<-[:GOLDEN_COMPANY]-(sourceCompany)-[]->(attr:!SourceRecord)<-[]-(c)
    WITH c, numSources, labels(attr)[0] as matchingAttr
    WITH c, numSources, matchingAttr, count(matchingAttr) as numTimesUsed
    WITH c, numSources, collect({attr: matchingAttr, count: numTimesUsed}) as stats, sum(numTimesUsed) as totalMatches
    WITH c, numSources, totalMatches, apoc.coll.sortMaps(stats, 'attr') as stats
    RETURN c.companyName, c.uniformityClusterUniformityScore as score, numSources, totalMatches, stats
    ORDER BY totalMatches DESC
    `
    testConvertCypherAndReturnStringsDontAddReturn(cypher);
});

// copied from CypherTests.test.js
test ('Verify Match standalone Order by, Skip, Limit', () => {
    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        ORDER BY n.foo
        SKIP 5
        LIMIT 10
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        ORDER BY n.foo
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        SKIP 5
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        LIMIT 10
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        ORDER BY n.foo        
        SKIP 5
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        ORDER BY n.foo        
        LIMIT 10
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (n)
        SKIP 5
        LIMIT 10
        RETURN n
    `);    
})

test ('Verify With standalone Order by, Skip, Limit', () => {
    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        ORDER BY n.foo
        SKIP 5
        LIMIT 10
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        ORDER BY n.foo
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        SKIP 5
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        LIMIT 10
        RETURN n
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        ORDER BY n.foo        
        SKIP 5
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        ORDER BY n.foo        
        LIMIT 10
        RETURN n
    `);    

    testConvertCypherAndReturnStringsDontAddReturn(`
        WITH n
        SKIP 5
        LIMIT 10
        RETURN n
    `);    
})

test ('Shortest Path docs examples', () => {
    testConvertCypherAndReturnStringsDontAddReturn(`
    MATCH p = SHORTEST 1 (wos:Station)-[:LINK]-+ (bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN length(p) as result
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
    MATCH p = ALL SHORTEST (wos:Station)-[:LINK]-+ (bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN [n in nodes(p) | n.name] as stops
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
    MATCH p = SHORTEST 2 GROUPS (wos:Station)-[:LINK]-+ (bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN [n in nodes(p) | n.name] as stops, length(p) as pathLength
    `);

    testConvertCypherAndReturnStringsDontAddReturn(`
    MATCH path = ANY SHORTEST (:Station {name:'Pershore'})-[l:LINK WHERE l.distance < 10]-+ (b:Station {name:'Bromsgrove'})
    RETURN [r IN relationships(path) | r.distance] as distances    
    `);
    
    testConvertCypherAndReturnStringsDontAddReturn(`
    MATCH path = ANY (:Station {name:'Pershore'})-[l:LINK WHERE l.distance < 10]-+ (b:Station {name:'Bromsgrove'})
    RETURN [r IN relationships(path) | r.distance] as distances    
    `);
})

test('test WITH *', () => {
    testConvertCypherAndReturnStringsDontAddReturn(`
        MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
        WITH *
        RETURN true
    `);
})