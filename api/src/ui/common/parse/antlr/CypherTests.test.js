import antlr4 from 'antlr4/src/antlr4/index';

import CypherLexer from './CypherLexer';
import CypherParser from './CypherParser';
import CypherStatementBuilderListener from './CypherStatementBuilderListener';

function parseStatement (cypherToParse) {
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
    expect(singlePartQuery.readingClauses[0].pattern.patternPart[0].anonymousPatternPart.myName).toBe('AnonymousPatternPart');

    expect(singlePartQuery.readingClauses[0].pattern.patternPart[0].anonymousPatternPart.patternElement.myName).toBe('PatternElement');
    expect(singlePartQuery.readingClauses[0].pattern.patternPart[0].anonymousPatternPart.patternElement.nodePattern).not.toBeNull();

    var nodePattern = singlePartQuery.readingClauses[0].pattern.patternPart[0].anonymousPatternPart.patternElement.nodePattern;
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
    //console.log(statement);
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
