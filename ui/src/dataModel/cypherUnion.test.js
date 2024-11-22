import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import CypherClause from './cypherClause';
import UnionClause from './cypherUnion';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

const trimStatement = (str) => str.split('\n')
    .filter(x => x)    // get rid of empty lines
    .map(x => x.trim())
    .join('\n')

test('make union clause', () => {
    var unionClause = new UnionClause();
    expect(unionClause).not.toBeNull();
});

test('make full union', () => {
    let match1 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'foo'})"
    })
    let return1 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    let match2 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'bar'})"
    })
    let return2 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    var unionClause = new UnionClause({
        keyword: 'UNION',
        firstClauses: [match1, return1],
        secondClauses: [match2, return2]
    });

    var cypher = unionClause.toCypherString();
    var expectedCypher = trimStatement(`
        MATCH (c:Company {name:'foo'})
        RETURN c
        UNION
        MATCH (c:Company {name:'bar'})
        RETURN c`);
    expect(cypher).toBe(expectedCypher);
});

test('get union debug snippets', () => {
    let match1 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'foo'})"
    })
    let return1 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    let match2 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'bar'})"
    })
    let return2 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    var unionClause = new UnionClause({
        keyword: 'UNION',
        firstClauses: [match1, return1],
        secondClauses: [match2, return2]
    });

    var snippetSet = unionClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    //console.log('snippets: ', snippets);

    expect(snippets.length).toBe(4);

    expect(snippets.map(x => trimStatement(x))).toStrictEqual([
        trimStatement(`
        MATCH (c:Company {name:'foo'}) /* 
        RETURN c
        UNION
        MATCH (c:Company {name:'bar'})
        RETURN c */`),
        trimStatement(`
        MATCH (c:Company {name:'foo'})  
        RETURN c /*
        UNION
        MATCH (c:Company {name:'bar'})
        RETURN c */`),
        trimStatement(`
        MATCH (c:Company {name:'foo'})  
        RETURN c 
        UNION
        MATCH (c:Company {name:'bar'}) /*
        RETURN c */`),
        trimStatement(`
        MATCH (c:Company {name:'foo'})  
        RETURN c 
        UNION
        MATCH (c:Company {name:'bar'})
        RETURN c`)
    ])

});

test('debug snippets for pattern within union', () => {
    var node1 = cy.node().var('c').labels(['Company'])
        .prop('name', '"foo"')
        .prop('baz', '"qux1"');

    var node2 = cy.node().var('c').labels(['Company'])
        .prop('name', '"bar"')
        .prop('baz', '"qux2"');

    let path1 = cy.path().node(node1)
    let part1 = cy.part().path(path1);
    let pattern1 = cy.pattern().addPart(part1);    

    let path2 = cy.path().node(node2)
    let part2 = cy.part().path(path2);
    let pattern2 = cy.pattern().addPart(part2);    

    let match1 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern1
    })
    let return1 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    let match2 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: pattern2
    })
    let return2 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })
    
    var unionClause = new UnionClause({
        keyword: 'UNION',
        firstClauses: [match1, return1],
        secondClauses: [match2, return2]
    });

    //console.log(unionClause.toCypherString());
    var snippetSet = unionClause.getDebugCypherSnippetSet();
    var snippets = snippetSet.getSnippets();
    //console.log('snippets: ', snippets);
    
    expect(snippets.length).toBe(8);

    expect(snippets.map(x => trimStatement(x))).toStrictEqual([
        trimStatement(`
            MATCH (c:Company /* { name:"foo", baz:"qux1" } */) /* 
            RETURN c
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" }) 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo" /* , baz:"qux1" */ }) /* 
            RETURN c
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" }) 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" }) /* 
            RETURN c
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" }) 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" })  
            RETURN c /*
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" }) 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" })  
            RETURN c
            UNION
            MATCH (c:Company /* { name:"bar", baz:"qux2" } */) /* 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" }) 
            RETURN c 
            UNION
            MATCH (c:Company { name:"bar" /* , baz:"qux2" */ }) /* 
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" }) 
            RETURN c 
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" }) /*
            RETURN c */`),
        trimStatement(`
            MATCH (c:Company { name:"foo", baz:"qux1" }) 
            RETURN c 
            UNION
            MATCH (c:Company { name:"bar", baz:"qux2" })
            RETURN c`)
        ])
})

test('get Ordered clauses', () => {
    let match1 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'foo'})"
    })
    let return1 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    let match2 = new CypherClause({
        keyword: 'MATCH',
        clauseInfo: "(c:Company {name:'bar'})"
    })
    let return2 = new CypherClause({
        keyword: 'RETURN',
        clauseInfo: 'c'
    })

    var unionClause = new UnionClause({
        keyword: 'UNION',
        firstClauses: [match1, return1],
        secondClauses: [match2, return2]
    });

    let orderedClauses = unionClause.getOrderedClauses();
    //console.log(orderedClauses);

    expect(orderedClauses.map(x => x.keyword)).toStrictEqual([
        'MATCH','RETURN','UNION','MATCH','RETURN'
    ])

    expect(orderedClauses.map(x => x.clauseInfo)).toStrictEqual([
        "(c:Company {name:'foo'})",
        'c',
        '',
        "(c:Company {name:'bar'})",
        'c'
    ])
});

