
import CypherClause from "./cypherClause";

test('make cypher clause', () => {
    var cypherClause = new CypherClause();
    expect(cypherClause).not.toBeNull();
});

test('cypher clause toCypherString', () => {
    var cypherClause = new CypherClause({
        keyword: 'WITH',
        clauseInfo: '1 as number'
    });

    expect(cypherClause.toCypherString()).toBe('WITH 1 as number');
});

test('cypher clause associatedCypherObject', () => {
    var cypherClause = new CypherClause({
        keyword: 'WITH',
        clauseInfo: '1 as number'
    });

    let snippetSet = cypherClause.getDebugCypherSnippetSet();
    // console.log('snippetSet: ', snippetSet)
    expect(snippetSet.associatedCypherObject).toBe(cypherClause);
});