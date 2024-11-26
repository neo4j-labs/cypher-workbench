import antlr4 from 'antlr4/src/antlr4/index';

import CypherLexer from './CypherLexer';
import CypherParser from './CypherParser';
import CypherStatementBuilderListener from './CypherStatementBuilderListener';

import { stringMatches } from './stringIndexFinder';

export function parseStatement (cypherToParse) {
    var statement;
    if (cypherToParse) {
        var chars = new antlr4.InputStream(cypherToParse);
        var lexer = new CypherLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new CypherParser(tokens);
        var tree = parser.oC_Cypher();

        var builder = new CypherStatementBuilderListener();
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);

        statement = builder.getCypherStatement();
    }
    return statement;
}

function parseClause (cypherToParse, clause) {
    var statement;
    if (cypherToParse) {
        var chars = new antlr4.InputStream(cypherToParse);
        var lexer = new CypherLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new CypherParser(tokens);
        var tree = null;
        switch (clause) {
            case 'Match':
                tree = parser.oC_Match();
                break;
            case 'With':
                tree = parser.oC_With();
                break;
            case 'Where':
                tree = parser.oC_Where();
                break;
            default:
                console.log(`Clause: '${clause}' not handled, defaulting to 'Match'`);
                tree = parser.oC_Match();
                break;
        }

        var builder = new CypherStatementBuilderListener(clause);
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);

        statement = builder.getCypherStatement();
    }
    return statement;
}

function verifyMatchParse (cypher) {
    var match = parseClause(cypher, 'Match');
    expect(match).not.toBeNull();
    var generatedCypher = match.toString();
    generatedCypher = generatedCypher.split('\n').join(' ');
    expect(generatedCypher).toBe(cypher);   
    return match; 
}

function verifyStatementParse (cypher) {
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    // console.log(generatedCypher);
    expect(stringMatches(cypher.toLowerCase(), generatedCypher.toLowerCase())).toBe(true);    
}

function getMatchPatternElement (match) {
    return match.pattern.patternPart[0].anonymousPatternPart.patternElements[0];
}

function getMatchRel (match) {
    return match.pattern.patternPart[0].anonymousPatternPart.patternElements[0].patternElementChain[0].relationshipPattern;
}

test('test simple cypher', () => {
    var cypher = 'MATCH (n:Test) RETURN n';
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    expect(statement.myName).toBe('Query')

    var singlePartQuery = statement.regularQuery.singleQuery.singlePartQuery;

    expect(singlePartQuery.myName).toBe('SinglePartQuery');
    expect(singlePartQuery.readingClauses.length).toBe(1);
    expect(singlePartQuery.readingClauses[0].myName).toBe('Match');
    expect(singlePartQuery.readingClauses[0].pattern.myName).toBe('Pattern');
    expect(singlePartQuery.readingClauses[0].pattern.patternPart).not.toBeNull();
    expect(singlePartQuery.readingClauses[0].pattern.patternPart.length).toBe(1);
    //console.log(singlePartQuery.readingClauses[0].pattern.patternPart[0]);
    expect(singlePartQuery.readingClauses[0].pattern.patternPart[0].myName).toBe('PatternPart');

    let anonPart = singlePartQuery.readingClauses[0].pattern.patternPart[0].anonymousPatternPart;
    expect(anonPart.myName).toBe('AnonymousPatternPart');

    expect(anonPart.patternElements[0].myName).toBe('PatternElement');
    expect(anonPart.patternElements[0].nodePattern).not.toBeNull();

    var nodePattern = anonPart.patternElements[0].nodePattern;
    expect(nodePattern.variable).toBe('n');
    expect(nodePattern.nodeLabels.length).toBe(1);
    expect(nodePattern.nodeLabels[0]).toBe('Test');

    expect(singlePartQuery.return.myName).toBe('Return');
    expect(singlePartQuery.return.returnBody.myName).toBe('ReturnBody');
    expect(singlePartQuery.return.returnBody.returnItems.length).toBe(1);
    expect(singlePartQuery.return.returnBody.returnItems[0].myName).toBe('ReturnItem');
    expect(singlePartQuery.return.returnBody.returnItems[0].expression).toBe('n');

    expect(statement.toString()).toBe('MATCH (n:Test)\nRETURN n');
});

test('test complex cypher', () => {
    var cypher = `MATCH (nl:NodeLabel)-[r:HAS_PROPERTY]->(p:PropertyDefinition)
                WITH collect({nodeLabel:nl, propDef:p, relationshipType:r}) as nodeLabelProps, nl.label as label
                WITH label, extract(x IN nodeLabelProps | x.propDef.name) as propNames
                RETURN label, propNames`;
    var statement = parseStatement(cypher);
    //console.log(JSON.stringify(statement));
    // TODO: trace back variables
});

test('test order by, skip, limit', () => {
    var cypher = 'MATCH (n:Test) RETURN n ORDER BY n SKIP 0 LIMIT 1';
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();

    var singlePartQuery = statement.regularQuery.singleQuery.singlePartQuery;

    expect(singlePartQuery.return.myName).toBe('Return');
    var returnBody = singlePartQuery.return.returnBody;
    expect(returnBody.myName).toBe('ReturnBody');
    expect(returnBody.returnItems.length).toBe(1);
    expect(returnBody.returnItems[0].myName).toBe('ReturnItem');
    expect(returnBody.returnItems[0].expression).toBe('n');

    expect(returnBody.orderBy.sortItems[0].expression).toBe('n');
    expect(returnBody.skip).toBe('0');
    expect(returnBody.limit).toBe('1');

    expect(statement.toString()).toBe('MATCH (n:Test)\nRETURN n\nORDER BY n\nSKIP 0\nLIMIT 1');

});

test('test order by desc', () => {
    var cypher = 'MATCH (n:Test) RETURN n ORDER BY n DESC';
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();

    var singlePartQuery = statement.regularQuery.singleQuery.singlePartQuery;

    expect(singlePartQuery.return.myName).toBe('Return');
    var returnBody = singlePartQuery.return.returnBody;
    expect(returnBody.myName).toBe('ReturnBody');
    expect(returnBody.returnItems.length).toBe(1);
    expect(returnBody.returnItems[0].myName).toBe('ReturnItem');
    expect(returnBody.returnItems[0].expression).toBe('n');

    expect(returnBody.orderBy.sortItems[0].expression).toBe('n');
    expect(returnBody.orderBy.sortItems[0].ascendingDescending).toBe('DESC');

    expect(statement.toString()).toBe('MATCH (n:Test)\nRETURN n\nORDER BY n DESC');

});

test('test standalone subquery parses', () => {
    var cypher = `
    CALL {
        MATCH (n)-[:HAS_METADATA]->(metadata:DataModelMetadata) RETURN metadata.title as title
      }
      RETURN title    
    `;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(statement.toString());
    expect(generatedCypher).toBe(`CALL {
MATCH (n)-[:HAS_METADATA]->(metadata:DataModelMetadata)
RETURN metadata.title AS title
}
RETURN title`);
    //console.log(statement);

});

test('test subquery parses', () => {
    var cypher = `
        MATCH (n:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
        CALL {
            WITH n
            MATCH (n)-[:HAS_METADATA]->(metadata:DataModelMetadata) RETURN metadata.title as title
        }
        RETURN n.key, title, metadata.title
    `;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    //console.log(statement);
    expect(generatedCypher).toBe(`MATCH (n:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
CALL {
WITH n
MATCH (n)-[:HAS_METADATA]->(metadata:DataModelMetadata)
RETURN metadata.title AS title
}
RETURN n.key, title, metadata.title`);

});

test('union parses', () => {
    var cypher = `
        MATCH (movie:Movie)
        WHERE movie.title STARTS WITH 'Dog'
        RETURN movie.title as title
        UNION
        MATCH (movie:Movie)
        WHERE movie.title STARTS WITH 'Cat'
        RETURN movie.title as title
    `;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    // console.log('statement.regularQuery.singleQuery.singlePartQuery: ', statement.regularQuery.singleQuery.singlePartQuery);
    // console.log('statement.regularQuery.unions[0]: ', statement.regularQuery.unions[0]);
    // console.log('statement.regularQuery.unions[0].singleQuery.singlePartQuery: ', statement.regularQuery.unions[0].singleQuery.singlePartQuery);
    expect(generatedCypher).toBe(`MATCH (movie:Movie)
WHERE movie.title STARTS WITH 'Dog'
RETURN movie.title AS title
UNION
MATCH (movie:Movie)
WHERE movie.title STARTS WITH 'Cat'
RETURN movie.title AS title`);
});

test('use parses (fabric)', () => {
    var cypher = `
        USE example.graphA
        MATCH (movie:Movie)
        RETURN movie.title as title
        UNION
        USE example.graphB
        MATCH (movie:Movie)
        RETURN movie.title as title
    `;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    expect(generatedCypher).toBe(`USE example.graphA
MATCH (movie:Movie)
RETURN movie.title AS title
UNION
USE example.graphB
MATCH (movie:Movie)
RETURN movie.title AS title`);
    //console.log(statement);
});

test('use parses w/subquery (fabric)', () => {
    var cypher = `
        UNWIND example.graphIds() as graphId
        CALL {
            USE example.graph(graphId)
            MATCH (movie:Movie)
            RETURN movie.title as title
        }
        RETURN title
    `;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    expect(generatedCypher).toBe(`UNWIND example.graphIds() AS graphId
CALL {
USE example.graph(graphId)
MATCH (movie:Movie)
RETURN movie.title AS title
}
RETURN title`);    
    //console.log(statement);
});

test('sub-query IN TRANSACTIONS', () => {
    var cypher = `
        LOAD CSV WITH HEADERS FROM 'https://data.neo4j.com/importing-cypher/persons.csv' AS row
        CALL {
        WITH row
        CREATE (p:Person {tmdbId:row.person_tmdbId})
        SET p.name = row.name, p.born = row.born
        } IN TRANSACTIONS
        RETURN count(*) AS personNodes`;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    expect(generatedCypher).toBe(`LOAD CSV WITH HEADERS FROM 'https://data.neo4j.com/importing-cypher/persons.csv' AS row
CALL {
WITH row
CREATE (p:Person {tmdbId:row.person_tmdbId})
SET p.name = row.name, p.born = row.born
} IN TRANSACTIONS
RETURN count(*) AS personNodes`);    
    //console.log(statement);
});

test('sub-query IN CONCURRENT TRANSACTIONS', () => {
    var cypher = `
        LOAD CSV WITH HEADERS FROM 'https://data.neo4j.com/importing-cypher/persons.csv' AS row
        CALL {
        WITH row
        CREATE (p:Person {tmdbId:row.person_tmdbId})
        SET p.name = row.name, p.born = row.born
        } IN 3 CONCURRENT TRANSACTIONS OF 10 ROWS
        RETURN count(*) AS personNodes`;
    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();
    expect(generatedCypher).toBe(`LOAD CSV WITH HEADERS FROM 'https://data.neo4j.com/importing-cypher/persons.csv' AS row
CALL {
WITH row
CREATE (p:Person {tmdbId:row.person_tmdbId})
SET p.name = row.name, p.born = row.born
} IN 3 CONCURRENT TRANSACTIONS OF 10 ROWS
RETURN count(*) AS personNodes`);    
    //console.log(statement);
});


test('Where clause in NodePattern and RelationshipPattern', () => {
    verifyMatchParse("MATCH (n WHERE n.foo = 'bar' AND n.bar = 'foo')");
    verifyMatchParse("MATCH (n)-[r WHERE r.foo = 'bar']->()");    
    verifyMatchParse("MATCH (n)-[r WHERE r.foo = 'bar']->(s:Foo WHERE s:Bar)");
});

test('Basic patterns', () => {
    verifyMatchParse('MATCH (n)-[r*]->()');
    verifyMatchParse('MATCH (n)-[r*1..2]->()');
    verifyMatchParse('MATCH (n)-[r:FOO|BAR]->()');
});

test('Node labels terms', () => {
    let match = verifyMatchParse('MATCH (n)');
    //console.log(match.myName);
    var nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.variable).toBe('n');

    match = verifyMatchParse('MATCH (n:%)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('%');

    match = verifyMatchParse('MATCH (n:Foo:Bar)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('Foo:Bar');
    expect(nodePattern.nodeLabels).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH (n:Foo&Bar)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('Foo&Bar');
    expect(nodePattern.nodeLabels).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH (n:Foo&!Bar)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('Foo&!Bar');
    expect(nodePattern.nodeLabels).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH (n:Foo|Bar)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('Foo|Bar');
    expect(nodePattern.nodeLabels).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH (n:(Foo|Bar)&Baz)');
    nodePattern = getMatchPatternElement(match).nodePattern;
    expect(nodePattern.nodeLabelString).toBe('(Foo|Bar)&Baz');
    expect(nodePattern.nodeLabels).toStrictEqual(['Foo','Bar','Baz']);
});

test('Relationship type terms', () => {
    let match = verifyMatchParse('MATCH ()-[r]->()');
    //console.log(match.myName);
    var relPattern = getMatchRel(match);
    expect(relPattern.variable).toBe('r');

    match = verifyMatchParse('MATCH ()-[r:%]->()');
    var relPattern = getMatchRel(match);
    expect(relPattern.relationshipTypeString).toBe('%');

    match = verifyMatchParse('MATCH ()-[r:Foo|Bar]->()');
    var relPattern = getMatchRel(match);
    expect(relPattern.relationshipTypeString).toBe('Foo|Bar');
    expect(relPattern.relationshipTypes).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH ()-[r:Foo&Bar]->()');
    var relPattern = getMatchRel(match);
    expect(relPattern.relationshipTypeString).toBe('Foo&Bar');
    expect(relPattern.relationshipTypes).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH ()-[r:Foo&!Bar]->()');
    var relPattern = getMatchRel(match);
    expect(relPattern.relationshipTypeString).toBe('Foo&!Bar');
    expect(relPattern.relationshipTypes).toStrictEqual(['Foo','Bar']);

    match = verifyMatchParse('MATCH ()-[r:(Foo|Bar)&Baz]->()');
    var relPattern = getMatchRel(match);
    expect(relPattern.relationshipTypeString).toBe('(Foo|Bar)&Baz');
    expect(relPattern.relationshipTypes).toStrictEqual(['Foo','Bar','Baz']);
});

test('General patterns', () => {
    verifyMatchParse("MATCH (n)-[*]->()");
    verifyMatchParse("MATCH (x)-[*2]->()");
    verifyMatchParse("MATCH (x)-[*1..2]->()");
    verifyMatchParse("MATCH (x)-[*1..]->()");
    verifyMatchParse("MATCH (x)-[*..2]->()");
    verifyMatchParse("MATCH (a)-[:KNOWS*3..5]->(b)");
    verifyMatchParse("MATCH (a)-[r*..5 {name:'Filipa'}]->(b)");
    verifyMatchParse("MATCH (a)-[]->(b)-[]->(c)-[]->(a)");
    verifyMatchParse("MATCH (a)-[]->(b)-[]->(c), (b)-[]->(e)");
    verifyMatchParse("MATCH (a:A)<-[ {p:30}]-(b)-[t WHERE t.q > 0]->(c:C)");
});

test('Relationship quantifier', () => {
    verifyMatchParse("MATCH ()-[]-+()");
    verifyMatchParse("MATCH (:A)-[:R]->{0,10} (:B)");
});

test ('test QPP', () => {
    verifyMatchParse("MATCH (:A) ((a)<-[s:X WHERE a.p = s.p]-(b)){,5}");
    verifyMatchParse("MATCH (n) ((startNode)-[:MY_PATTERN]->()){1,3} (end)");
    verifyMatchParse("MATCH (:Station {name:'Denmark Hill'})<-[:CALLS_AT]-(d:Stop) ((:Stop)-[:NEXT]->(:Stop)){1,3} (a:Stop)-[:CALLS_AT]->(:Station {name:'Clapham Junction'})");
    verifyMatchParse("MATCH (a)-[]->(b)-[]->(c), (b) ((d)-[]->(e))+ WHERE any(n in d WHERE n.p = a.p)");
    verifyMatchParse("MATCH (:A)-[:R]->(:B) ((:X)<-[]-(:Y)){1,2}");
    verifyMatchParse("MATCH ()-[r WHERE r.q = n.q]-() (()<-[s:X WHERE n.p = s.p]-()){2,3}");
    verifyMatchParse("MATCH ((x)-[r]->(z WHERE z.p > x.p)){2,3}");
    verifyMatchParse("MATCH ((x)-[r]->(z) WHERE z.p > x.p){2,3}");
    verifyMatchParse("MATCH ((:A)-[:R]->(:B)){2} ((:X)<-[]-(:Y)){1,2}");
    verifyMatchParse("MATCH ((n:A)-[:R]->( {p:30}) WHERE EXISTS { (n)-->+(:X) }){2,3}");
});

test('test WITH *', () => {
    verifyStatementParse(`
        MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
        WITH *
        RETURN *
    `);
})

test ('Shortest Path', () => {
    verifyMatchParse("MATCH p = shortestpath((wos:Station)-[:LINK]-+(bmv:Station))");
    verifyMatchParse("MATCH p = allshortestpaths((wos:Station)-[:LINK]-+(bmv:Station))");
    verifyMatchParse("MATCH p = SHORTEST 1 (wos:Station)-[:LINK]-+(bmv:Station)");
    verifyMatchParse("MATCH p = ALL SHORTEST (wos:Station)-[:LINK]-+(bmv:Station)");
    verifyMatchParse("MATCH p = SHORTEST 2 GROUPS (wos:Station)-[:LINK]-+(bmv:Station)");
    verifyMatchParse("MATCH p = ANY SHORTEST (:Station {name:'Pershore'})-[l:LINK WHERE l.distance < 10]-+(b:Station {name:'Bromsgrove'})");
    verifyMatchParse("MATCH p = ANY (:Station {name:'Pershore'})-[l:LINK WHERE l.distance < 10]-+(b:Station {name:'Bromsgrove'})");
})

test ('Shortest Path docs examples', () => {
    verifyStatementParse(`
    MATCH p = SHORTEST 1 (wos:Station)-[:LINK]-+(bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN length(p) AS result
    `);

    verifyStatementParse(`
    MATCH p = ALL SHORTEST (wos:Station)-[:LINK]-+(bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN [n in nodes(p) | n.name] AS stops
    `);

    verifyStatementParse(`
    MATCH p = SHORTEST 2 GROUPS (wos:Station)-[:LINK]-+(bmv:Station)
    WHERE wos.name = "Worcester Shrub Hill" AND bmv.name = "Bromsgrove"
    RETURN [n in nodes(p) | n.name] AS stops, length(p) AS pathLength
    `);

    verifyStatementParse(`
    MATCH path = ANY
      (:Station {name: 'Pershore'})-[l:LINK WHERE l.distance < 10]-+(b:Station {name: 'Bromsgrove'})
    RETURN [r IN relationships(path) | r.distance] AS distances    
    `);
})

test ('Verify Match standalone Order by, Skip, Limit', () => {
    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.foo
        SKIP 5
        LIMIT 10
        RETURN n
    `);

    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.foo
        RETURN n
    `);    

    verifyStatementParse(`
        MATCH (n)
        SKIP 5
        RETURN n
    `);

    verifyStatementParse(`
        MATCH (n)
        LIMIT 10
        RETURN n
    `);

    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.foo        
        SKIP 5
        RETURN n
    `);    

    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.foo        
        LIMIT 10
        RETURN n
    `);    

    verifyStatementParse(`
        MATCH (n)
        SKIP 5
        LIMIT 10
        RETURN n
    `);    
})

test ('Verify With standalone Order by, Skip, Limit', () => {
    verifyStatementParse(`
        WITH n
        ORDER BY n.foo
        SKIP 5
        LIMIT 10
        RETURN n
    `);

    verifyStatementParse(`
        WITH n
        ORDER BY n.foo
        RETURN n
    `);    

    verifyStatementParse(`
        WITH n
        SKIP 5
        RETURN n
    `);

    verifyStatementParse(`
        WITH n
        LIMIT 10
        RETURN n
    `);

    verifyStatementParse(`
        WITH n
        ORDER BY n.foo        
        SKIP 5
        RETURN n
    `);    

    verifyStatementParse(`
        WITH n
        ORDER BY n.foo        
        LIMIT 10
        RETURN n
    `);    

    verifyStatementParse(`
        WITH n
        SKIP 5
        LIMIT 10
        RETURN n
    `);    
})

test('Match docs examples', () => {
    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.name
        RETURN collect(n.name) AS names
    `);    

    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.name DESC
        SKIP 1
        LIMIT 1
        RETURN n.name AS name
    `);    

    verifyStatementParse(`
        MATCH (n)
        SKIP 2
        RETURN collect(n.name) AS names
    `);    

    verifyStatementParse(`
        MATCH (n)
        ORDER BY n.name
        OFFSET 2
        LIMIT 2
        RETURN collect(n.name) AS names
    `);    

    verifyStatementParse(`
        MATCH (n)
        LIMIT 2
        RETURN collect(n.name) AS names
    `)
});

test('Optional call docs examples', () => {
    verifyStatementParse(`
        MATCH (n)
        OPTIONAL CALL apoc.neighbors.tohop(n, "KNOWS>", 1)
        YIELD node
        RETURN n.name AS name, collect(node.name) AS connections
        `);        
});

test('Subquery docs examples', () => {
    verifyStatementParse(`    
    MATCH (p:Player), (t:Team)
    CALL (*) {
      SET p.lastUpdated = timestamp()
      SET t.lastUpdated = timestamp()
    }
    RETURN p.name AS playerName,
           p.lastUpdated AS playerUpdated,
           t.name AS teamName,
           t.lastUpdated AS teamUpdated
    LIMIT 1
    `);    

    verifyStatementParse(`
    MATCH (t:Team)
    CALL () {
      MATCH (p:Player)
      RETURN count(p) AS totalPlayers
    }
    RETURN count(t) AS totalTeams, totalPlayers
    `);    

    verifyStatementParse(`
    MATCH (t:Team)
    CALL {
      MATCH (p:Player)
      RETURN count(p) AS totalPlayers
    }
    RETURN count(t) AS totalTeams, totalPlayers
    `);    

    verifyStatementParse(`
    MATCH (p:Player)
    OPTIONAL CALL (p) {
        MATCH (p)-[:FRIEND_OF]->(friend:Player)
        RETURN friend
    }
    RETURN p.name AS playerName, count(friend) AS numberOfFriends
    ORDER BY numberOfFriends
    `);    

    verifyStatementParse(`
    CALL () {
      MATCH (p:Player)
      RETURN p
      ORDER BY p.age ASC
      LIMIT 1
    UNION
      MATCH (p:Player)
      RETURN p
      ORDER BY p.age DESC
      LIMIT 1
    }
    RETURN p.name AS name, p.age AS age
    `);    

    verifyStatementParse(`
    MATCH (t:Team)
    CALL (t) {
      OPTIONAL MATCH (t)-[o:OWES]->(other:Team)
      RETURN o.dollars * -1 AS moneyOwed
      UNION ALL
      OPTIONAL MATCH (other)-[o:OWES]->(t)
      RETURN o.dollars AS moneyOwed
    }
    RETURN t.name AS team, sum(moneyOwed) AS amountOwed
    ORDER BY amountOwed DESC
    `);    

    verifyStatementParse(`
    MATCH (p:Player), (t:Team)
    CALL (p, t) {
      WITH rand() AS random
      SET p.rating = random
      RETURN p.name AS playerName, p.rating AS rating
    }
    RETURN playerName, rating, t AS team
    ORDER BY rating
    LIMIT 1
    `);    
});

test ('Where clause', () => {
    let cypher = `WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} = size([a] + a_i)`;
    var where = parseClause(cypher, 'Where');
    expect(where).not.toBeNull();
    var generatedCypher = where.toString();
    expect(generatedCypher).toBe(cypher);   
    //console.log(generatedCypher);
});

test ('Cypher bullet train blog query', () => {

    let cypher = `// Anchoring the following QPP to a first transaction
MATCH (a:Account)<-[f:FROM]-(first_tx:Transaction)

// matching a Neo4j 5.9+ QPP with + cardinality (1 or more)
MATCH path=(a)<-[f]-(first_tx)
	(
	(tx_i:Transaction)-[:TO]->(a_i:Account)<-[:FROM]-(tx_j:Transaction)
	// inner-qpp locally-defined rules filtering
	WHERE tx_i.date < tx_j.date
	AND tx_i.amount >= tx_j.amount >= 0.80 * tx_i.amount
  	)+
  // Right-anchoring to a last transaction 
  (last_tx:Transaction)-[:TO]->(a)

// APOC-free filtering with Neo4j 5.x COUNT {<subquery>}
WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} =
	size([a] + a_i)
RETURN path    
    `;

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();

    let expectedCypher = `MATCH (a:Account)<-[f:FROM]-(first_tx:Transaction)
MATCH path=(a)<-[f]-(first_tx) ((tx_i:Transaction)-[:TO]->(a_i:Account)<-[:FROM]-(tx_j:Transaction) WHERE tx_i.date < tx_j.date
AND tx_i.amount >= tx_j.amount >= 0.80 * tx_i.amount)+ (last_tx:Transaction)-[:TO]->(a)
WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} =
size([a] + a_i)
RETURN path`

    generatedCypher = generatedCypher.split('\n').map(x => x.trim()).join('\n');

    expect(generatedCypher).toBe(expectedCypher);

    //console.log(generatedCypher);
});

test ('Cypher bullet train blog query', () => {

    let cypher = `// Anchoring the following QPP to a first transaction
MATCH (a:Account)<-[f:FROM]-(first_tx:Transaction)

// matching a Neo4j 5.9+ QPP with + cardinality (1 or more)
MATCH path=(a)<-[f]-(first_tx)
	(
	(tx_i:Transaction)-[:TO]->(a_i:Account)<-[:FROM]-(tx_j:Transaction)
	// inner-qpp locally-defined rules filtering
	WHERE tx_i.date < tx_j.date
	AND tx_i.amount >= tx_j.amount >= 0.80 * tx_i.amount
  	)+
  // Right-anchoring to a last transaction 
  (last_tx:Transaction)-[:TO]->(a)

// APOC-free filtering with Neo4j 5.x COUNT {<subquery>}
WHERE COUNT {WITH a, a_i UNWIND [a] + a_i AS b RETURN DISTINCT b} =
	size([a] + a_i)
RETURN path    
    `;

    var statement = parseStatement(cypher);
    expect(statement).not.toBeNull();
    var generatedCypher = statement.toString();

    //console.log('generatedCypher: ', generatedCypher);
    expect(stringMatches(cypher.toLowerCase(), generatedCypher.toLowerCase())).toBe(true);
});
