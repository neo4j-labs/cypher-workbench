import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import CypherClause from './cypherClause';
import SubQueryClause from './cypherSubQuery';
import { ReturnClause } from './cypherReturn';
import { buildPattern, buildOneNodePattern, buildNodeRelNodePattern } from './debugStatement.test';
import { InjectLimit } from './cypherSubQuery';
import { WhereClause, whereItem, whereToken } from './cypherWhere';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

const trimStatement = (str) => str.split('\n')
    .filter(x => x)    // get rid of empty lines
    .map(x => x.trim())
    .join('\n')

const buildSubQueryWithMatchAndWhere = () => {
    /*
    MATCH (p:Person)
    WITH p
    CALL {
        WITH p
        MATCH (p)-[:ACTED_IN]->(m:Movie)
        WHERE toLower(m.title) CONTAINS 'matrix'
        RETURN m
    }
    RETURN p.name, m.title
    LIMIT 20    
    */    

    let clauses = [];

    var personPath = cy.path().node('p', ['Person']);
    var personPattern = cy.pattern()
        .addPart(
            cy.part().path(personPath)
        );    
    var personMatch = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: personPattern,
        parsedVariables: ['p']
    });
    clauses.push(personMatch);
    var withP = new CypherClause({ keyword: 'WITH', clauseInfo: 'p', parsedVariables: ['p'] });
    clauses.push(withP);

    var subQueryClause = new SubQueryClause()
    clauses.push(subQueryClause);

    var subQueryWith = new CypherClause({ keyword: 'WITH', clauseInfo: 'p', parsedVariables: ['p'] });

    var actedInPath = cy.path()
        .node('p')
        .link(
            cy.link()
                .rel(null, ['ACTED_IN'])
                .node('m', ['Movie'])
        )
    var actedInPattern = cy.pattern()
        .addPart(
            cy.part().path(actedInPath)
        );    
    var actedInMatch = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: actedInPattern,
        parsedVariables: ['p', 'm']
    });

    // this where logic taken from cypherStringConverter
    let whereClauseInfo = new WhereClause();
    let whereExpression = "toLower(m.title) CONTAINS 'matrix'"
    var tokens = whereExpression.split(' ');
    tokens.map((x,i) => {
        var whereTokenText = (i === tokens.length - 1) ? x : `${x} `;
        var whereToken = whereItem(whereTokenText);
        whereClauseInfo.addWhereItem(whereToken);
    });
    var subQueryWhereClause = new CypherClause({
        keyword: 'WHERE',
        clauseInfo: whereClauseInfo 
    });

    var subQueryReturnBody = new ReturnClause().item('m');
    var subQueryReturnClause = new CypherClause({ keyword: 'RETURN', clauseInfo: subQueryReturnBody });
    
    subQueryClause.clauses = [subQueryWith, actedInMatch, subQueryWhereClause, subQueryReturnClause]

    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('p', 'name')
        .item('m', 'title')

    var returnClause = new CypherClause({ keyword: 'RETURN', clauseInfo: returnBody });
    clauses.push(returnClause);

    var limitClause = new CypherClause({ keyword: 'LIMIT', clauseInfo: '20' });
    clauses.push(limitClause);

    return {
        clauses,
        subQueryClause
    };
}

test('make subQuery clause', () => {
    var subQueryClause = new SubQueryClause();
    expect(subQueryClause).not.toBeNull();
});

test('make subQuery', () => {

    var subQueryClause = new SubQueryClause()

    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('person', 'name')
        .item('movie', 'title')

    var returnClause = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: returnBody
    });

    var pattern = buildPattern();
    var cypherMatchClause = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern
    });

    var withClause = new CypherClause({ keyword: 'WITH', clauseInfo: 'person' });
    subQueryClause.clauses = [withClause, cypherMatchClause, returnClause];

    var cypher = subQueryClause.toCypherString();
    // console.log(cypher);
    var trimmedCypher = trimStatement(cypher);
    var expectedCypher = trimStatement(`
        CALL {
            WITH person
            MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)
            RETURN person.name, movie.title
        }`);
    expect(trimmedCypher).toBe(expectedCypher);
});

test('subQuery optional, directive, import vars', () => {

    var clauses = [];

    var topPattern = buildOneNodePattern();
    var topMatch = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: topPattern
    });
    var topWith = new CypherClause({ keyword: 'WITH', clauseInfo: 'person' });

    clauses.push(topMatch);
    clauses.push(topWith);

    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('person', 'name')
        .item('movie', 'title')

    var returnClause = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: returnBody
    });

    var pattern = buildPattern();
    var cypherMatchClause = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern
    });

    var subQueryClause = new SubQueryClause({
        isOptional: true,
        importedVariableString: '(person)',
        subQueryDirective: 'IN TRANSACTIONS'
    })

    subQueryClause.clauses = [cypherMatchClause, returnClause];
    clauses.push(subQueryClause);

    var cypher = clauses.map(clause => clause.toCypherString()).join('\n');
    // console.log(cypher);
    var trimmedCypher = trimStatement(cypher);
    var expectedCypher = trimStatement(`
        MATCH (person:Person)
        WITH person
        OPTIONAL CALL (person) {
            MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)
            RETURN person.name, movie.title
        } IN TRANSACTIONS`);
    expect(trimmedCypher).toBe(expectedCypher);
});

test('subQuery parse import var string', () => {
    var subQueryClause = new SubQueryClause({ importedVariableString: '(person)' })
    expect(subQueryClause.subQueryImportVariables).toStrictEqual(['person']);
    expect(subQueryClause.subQueryImportAllVariables).toBe(false);

    subQueryClause = new SubQueryClause({ importedVariableString: '( person, movie )' })
    expect(subQueryClause.subQueryImportVariables).toStrictEqual(['person', 'movie']);
    expect(subQueryClause.subQueryImportAllVariables).toBe(false);

    subQueryClause = new SubQueryClause({ importedVariableString: '(*)' })
    expect(subQueryClause.subQueryImportVariables).toStrictEqual([]);
    expect(subQueryClause.subQueryImportAllVariables).toBe(true);

    subQueryClause = new SubQueryClause({ importedVariableString: '()' })
    expect(subQueryClause.subQueryImportVariables).toStrictEqual([]);
    expect(subQueryClause.subQueryImportAllVariables).toBe(false);
})

test('get subQuery debug snippets', () => {
    var subQueryClause = new SubQueryClause()
    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('person', 'name', 'name')

    var returnClause = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: returnBody
    });

    // var pattern = buildOneNodePattern();
    var pattern = buildNodeRelNodePattern();
    var cypherMatchClause = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern,
        parsedVariables: ['person', 'acted_in', 'movie']
    });

    var withClause = new CypherClause({ keyword: 'WITH', clauseInfo: 'person', parsedVariables: ['person'] });
    subQueryClause.clauses = [withClause, cypherMatchClause, returnClause];

    var snippetSet = subQueryClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    // console.log('snippets: ', snippets);
    // snippets.forEach(snippet => {
    //     console.log('snippet: ', snippet)
    // })    

    expect(snippets.length).toBe(5);

    expect(snippets.map(x => trimStatement(x))).toStrictEqual([
        trimStatement(`
        CALL {
            WITH person 
            MATCH (person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name */
            RETURN "'person' defined in parent scope" as _gd_message
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH person 
            MATCH (person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name */
            RETURN "'person' defined in parent scope" as _gd_message
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH person 
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie)
            RETURN person.name as name */
            RETURN acted_in
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH person 
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie) /*
            RETURN person.name as name */
            RETURN acted_in, movie
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH person 
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name
            ${InjectLimit}
        }`)        
    ])
});

test('get subQuery only return', () => {
    var subQueryClause = new SubQueryClause()
    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('true', null, 'value')

    var returnClause = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: returnBody
    });

    subQueryClause.clauses = [returnClause];

    var snippetSet = subQueryClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    // console.log('snippets: ', snippets);

    expect(snippets.length).toBe(1);

    expect(trimStatement(snippets[0])).toStrictEqual(trimStatement(`
        CALL {
            RETURN true as value
            ${InjectLimit}
        }`
    ))
});

test('get subQuery match and return - no with', () => {
    var subQueryClause = new SubQueryClause()
    var returnBody = new ReturnClause({ limit: ''});
    returnBody
        .item('person', 'name', 'name')

    var returnClause = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: returnBody
    });

    // var pattern = buildOneNodePattern();
    var pattern = buildNodeRelNodePattern();
    var cypherMatchClause = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern,
        parsedVariables: ['person', 'acted_in', 'movie']
    });

    subQueryClause.clauses = [cypherMatchClause, returnClause];

    var snippetSet = subQueryClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    // console.log('snippets: ', snippets);

    expect(snippets.length).toBe(5);

    expect(snippets.map(x => trimStatement(x))).toStrictEqual([
        trimStatement(`
        CALL {
            MATCH (person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name */
            RETURN person
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            MATCH (person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name */
            RETURN person
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie)
            RETURN person.name as name */
            RETURN person, acted_in
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie) /*
            RETURN person.name as name */
            RETURN person, acted_in, movie
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie)
            RETURN person.name as name
            ${InjectLimit}
        }`)        
    ])
});


test('get subQuery debug snippets - troubleshoot: adding where drops generated return', () => {
    let expectedCypher = `
        MATCH (p:Person)
        WITH p
        CALL {
            WITH p
            MATCH (p)-[:ACTED_IN]->(m:Movie)
            WHERE toLower(m.title) CONTAINS 'matrix'
            RETURN m
        }
        RETURN p.name, m.title
        LIMIT 20`

    let { clauses, subQueryClause } = buildSubQueryWithMatchAndWhere();        
    let generatedCypher = clauses.map(x => x.toCypherString()).join('\n');
    expect(trimStatement(expectedCypher)).toEqual(trimStatement(generatedCypher));

    var snippetSet = subQueryClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    // console.log('snippets: ', snippets);
    // snippets.forEach(snippet => {
    //     console.log('snippet: ', snippet)
    // })

    expect(snippets.length).toBe(4);

    expect(snippets.map(x => trimStatement(x))).toStrictEqual([
        trimStatement(`
        CALL {
            WITH p
            MATCH (p) /* -[:ACTED_IN]->(m:Movie)
            WHERE toLower(m.title) CONTAINS 'matrix'
            RETURN m */
            RETURN "'p' defined in parent scope" as _gd_message
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH p
            MATCH (p)-[:ACTED_IN]->() /* (m:Movie)
            WHERE toLower(m.title) CONTAINS 'matrix'
            RETURN m */
            RETURN "'p' defined in parent scope" as _gd_message
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH p
            MATCH (p)-[:ACTED_IN]->(m:Movie) /*
            WHERE toLower(m.title) CONTAINS 'matrix'
            RETURN m */
            RETURN m
            ${InjectLimit}
        }`),
        trimStatement(`
        CALL {
            WITH p
            MATCH (p)-[:ACTED_IN]->(m:Movie)
            WHERE toLower(m.title) CONTAINS 'matrix'
            RETURN m
            ${InjectLimit}
        }`)        
    ])
});
