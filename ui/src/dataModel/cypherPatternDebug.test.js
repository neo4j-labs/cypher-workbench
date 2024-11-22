import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import { 
    whereItem,
    WhereClause
} from './cypherWhere';
import { getDebugCypherTypeExpressionStringSnippetParts } from './cypherPattern';
import { ExplanatoryMarker } from './explanations';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

test('test getDebugCypherSnippets node - no variable, labels, props, or where', () => {
    var aNode = cy.node();
    
    // var snippetSet = aNode.getDebugCypherSnippetSet();
    // console.log(snippetSet);
    var snippets = aNode.getDebugCypherSnippets();
    // console.log(snippets);
    expect(snippets.length).toBe(1);

    expect(snippets[0]).toBe('()');
});

test('test getDebugCypherSnippets pattern - no variable, labels, props, or where', () => {
    var aNode = cy.node();
    var path = cy.path().node(aNode);
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getDebugCypherSnippets();

    // there are no snippets because we have a rule that prevents empty node labels from getting added
    //   as their own snippet
    expect(snippets.length).toBe(0);
});

test('test getDebugCypherSnippets - just variable', () => {
    var aNode = cy.node().var('a');
    var path = cy.path().node(aNode);
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getDebugCypherSnippets();
    expect(snippets.length).toBe(1);

    expect(snippets[0]).toBe('(a)');
});

test('test getDebugCypherSnippets - single node pattern', () => {
    var aNode = cy.node().var('a').labels(['A']);
    var path = cy.path().node(aNode);
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getDebugCypherSnippets();
    expect(snippets.length).toBe(1);

    expect(snippets[0]).toBe('(a:A)');
});

test('test getDebugCypherSnippets - test node-rel-node-rel-node pattern', () => {
    var aNode = cy.node().var('a').labels(['A']);
    var bNode = cy.node().var('b').labels(['B']);
    var cNode = cy.node().var('c').labels(['C']);
    var rel_ab = cy.rel().setKey('ab').setTypes(['TO']);
    var rel_bc = cy.rel().setKey('bc').setTypes(['TO']);

    var path = cy.path()
        .node(aNode)
        .link(cy.link().rel(rel_ab).node(bNode))
        .link(cy.link().rel(rel_bc).node(cNode))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getDebugCypherSnippets();
    expect(snippets.length).toBe(5);

    expect(snippets[0]).toBe('(a:A) /* -[:TO]->(b:B)-[:TO]->(c:C) */');
    expect(snippets[1]).toBe('(a:A)-[:TO]->() /* (b:B)-[:TO]->(c:C) */');
    expect(snippets[2]).toBe('(a:A)-[:TO]->(b:B) /* -[:TO]->(c:C) */');
    expect(snippets[3]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->() /* (c:C) */');
    expect(snippets[4]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C)');
});

test('test getDebugCypherStatements - test multiple pathPatterns', () => {
    var nodeB = cy.node().setKey('b').var('b').labels(['B']);
    var nodeD = cy.node().setKey('d').var('d').labels(['D']);

    var path = cy.path()
        .node('a', ['A'])
        .link(cy.link().rel(null, ['TO']).node(nodeB))
        .link(cy.link().rel(null, ['TO']).node('c', ['C']))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var pathD = cy.path().node(nodeD);
    var partD = cy.part().path(pathD);
    pattern.addPart(partD);

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, nodeD, rel, nodeB);

    // var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B)';

    var snippets = pattern.getDebugCypherSnippets();
    expect(snippets.length).toBe(8);

    expect(snippets[0]).toBe('(a:A) /* -[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B) */');
    expect(snippets[1]).toBe('(a:A)-[:TO]->() /* (b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B) */');
    expect(snippets[2]).toBe('(a:A)-[:TO]->(b:B) /* -[:TO]->(c:C), (d:D)-[:TO]->(b:B) */');
    expect(snippets[3]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->() /* (c:C), (d:D)-[:TO]->(b:B) */');
    expect(snippets[4]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C) /* , (d:D)-[:TO]->(b:B) */');
    expect(snippets[5]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D) /* -[:TO]->(b:B) */');
    expect(snippets[6]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->() /* (b:B) */');
    expect(snippets[7]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B)');
});

test('test node string debug', () => {
    var node = cy.node().var('a').nodeString('(A&B)|C');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(node.nodeLabelString);
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('(A');
    expect(parts[1]).toBe('&B)');
    expect(parts[2]).toBe('|C');
});

test('test node string debug %', () => {
    var node = cy.node().var('a').nodeString('%');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(node.nodeLabelString);
    expect(parts.length).toBe(1);
    expect(parts[0]).toBe('%');
});

test('test node string debug !', () => {
    var node = cy.node().var('a').nodeString('A&!B');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(node.nodeLabelString);
    //console.log('parts: ', parts)
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('A');
    expect(parts[1]).toBe('&!B');
});

test('test node string debug paren with !', () => {
    var node = cy.node().var('a').nodeString('A&!(B|C)');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(node.nodeLabelString);
    //console.log('parts: ', parts)
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('A');
    expect(parts[1]).toBe('&!(B');
    expect(parts[2]).toBe('|C)');
});

// rel string
test('test rel string debug', () => {
    var rel = cy.rel().var('a').relString('(A&B)|C');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(rel.relationshipTypeString);
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('(A');
    expect(parts[1]).toBe('&B)');
    expect(parts[2]).toBe('|C');
});

test('test rel string debug %', () => {
    var rel = cy.rel().var('a').relString('%');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(rel.relationshipTypeString);
    expect(parts.length).toBe(1);
    expect(parts[0]).toBe('%');
});

test('test rel string debug !', () => {
    var rel = cy.rel().var('a').relString('A&!B');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(rel.relationshipTypeString);
    //console.log('parts: ', parts)
    expect(parts.length).toBe(2);
    expect(parts[0]).toBe('A');
    expect(parts[1]).toBe('&!B');
});

test('test rel string debug paren with !', () => {
    var rel = cy.rel().var('a').relString('A&!(B|C)');
    var parts = getDebugCypherTypeExpressionStringSnippetParts(rel.relationshipTypeString);
    //console.log('parts: ', parts)
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('A');
    expect(parts[1]).toBe('&!(B');
    expect(parts[2]).toBe('|C)');
});

test('test NodePattern snippetSet', () => {
    var node = cy.node().var('a').labels(['A','B','C']);
    var snippetSet = node.getDebugCypherSnippetSet();
    // console.log('snippetSet: ', snippetSet);
    // console.log('snippetSet.snippets: ', snippetSet.snippets);
    expect(snippetSet.cypherSnippet).toBe('(a:A:B:C)');
    expect(snippetSet.snippets.length).toEqual(1);
    expect(snippetSet.snippets[0].cypherSnippet).toBe('a:A:B:C');

    let snippetStrs = snippetSet.snippets[0].snippets.map(x => x.snippetVal)
    expect(snippetStrs).toStrictEqual([ 'a:A', ':B', ':C' ]);

    var snippets = snippetSet.getSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(3);
    expect(snippets[0]).toBe('(a:A /* :B:C */)');
    expect(snippets[1]).toBe('(a:A:B /* :C */)');
    expect(snippets[2]).toBe('(a:A:B:C)');    
});

test('test NodePattern snippetSet node label string', () => {
    var node = cy.node().var('a').nodeString('A&!(B|C)');
    var snippetSet = node.getDebugCypherSnippetSet();
    // console.log('snippetSet: ', snippetSet);
    // console.log('snippetSet.snippets: ', snippetSet.snippets);
    expect(snippetSet.cypherSnippet).toBe('(a:A&!(B|C))');
    expect(snippetSet.snippets.length).toEqual(1);
    expect(snippetSet.snippets[0].cypherSnippet).toBe('a:A&!(B|C)');

    let snippetStrs = snippetSet.snippets[0].snippets.map(x => x.snippetVal)
    expect(snippetStrs).toStrictEqual([ 'a:A', '&!(B', '|C)' ]);

    var snippets = snippetSet.getSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(3);
    expect(snippets[0]).toBe('(a:A /* &!(B|C) */)');
    expect(snippets[1]).toBe('(a:A&!(B) /* |C) */)');
    expect(snippets[2]).toBe('(a:A&!(B|C))');
});

test('test NodePattern snippetSet props', () => {
    var node = cy.node().var('a')
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');

    var snippetSet = node.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts); 
    expect(parts.length).toBe(4);

    expect(parts).toStrictEqual([
        '(a /* { foo:1, bar:2, baz:"qux" } */)',
        '(a { foo:1 /* , bar:2, baz:"qux" */ })',
        '(a { foo:1, bar:2 /* , baz:"qux" */ })',
        '(a { foo:1, bar:2, baz:"qux" })'
    ])    
});

test('test NodePattern snippetSet where', () => {
    var node = cy.node().var('a')

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    node.where = whereClause;

    var snippetSet = node.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(3);

    expect(parts).toStrictEqual([
            "(a /* WHERE a.x = 'foo' AND a.y = 'bar' */)",
            "(a WHERE a.x = 'foo' /* AND a.y = 'bar' */)",
            "(a WHERE a.x = 'foo' AND a.y = 'bar')"
          ]
    )    
});

test('test NodePattern snippetSet node label string and props', () => {
    var node = cy.node().var('a').nodeString('A&!(B|C)')
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');

    var snippetSet = node.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(6);

    expect(parts).toStrictEqual([
        '(a:A /* &!(B|C) { foo:1, bar:2, baz:"qux" } */)',
        '(a:A&!(B) /* |C) { foo:1, bar:2, baz:"qux" } */)',
        '(a:A&!(B|C) /* { foo:1, bar:2, baz:"qux" } */)',
        '(a:A&!(B|C) { foo:1 /* , bar:2, baz:"qux" */ })',
        '(a:A&!(B|C) { foo:1, bar:2 /* , baz:"qux" */ })',
        '(a:A&!(B|C) { foo:1, bar:2, baz:"qux" })'
    ])    
});

test('test NodePattern propagates associatedCypherObject', () => {
    // TODO: modify this

    var node = cy.node().var('a').nodeString('A&!(B|C)')
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');

    var snippetSet = node.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    // console.log('snippetSet: ', snippetSet);
    // console.log('parts: ', parts)

    expect(snippetSet.associatedCypherObject).toBe(node);
    expect(snippetSet.snippets.length).toBe(2);

    // need to check that the NodePattern 'node' has propagated down the entire tree
    snippetSet.snippets.forEach(x => expect(x.associatedCypherObject).toBe(node));

    let subSnippetSet1 = snippetSet.snippets[0].snippets;
    // console.log(subSnippetSet1);
    subSnippetSet1.forEach(x => expect(x.associatedCypherObject).toBe(node));

    let subSnippetSet2 = snippetSet.snippets[1].snippets;
    // console.log(subSnippetSet2);     
    subSnippetSet2.forEach(x => expect(x.associatedCypherObject).toBe(node));

});

test('test NodePattern snippetSet node label string and where', () => {
    var node = cy.node().var('a').nodeString('A&!(B|C)');

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    node.where = whereClause;

    var snippetSet = node.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(5);

    expect(parts).toStrictEqual([
        "(a:A /* &!(B|C) WHERE a.x = 'foo' AND a.y = 'bar' */)",
        "(a:A&!(B) /* |C) WHERE a.x = 'foo' AND a.y = 'bar' */)",
        "(a:A&!(B|C) /* WHERE a.x = 'foo' AND a.y = 'bar' */)",
        "(a:A&!(B|C) WHERE a.x = 'foo' /* AND a.y = 'bar' */)",
        "(a:A&!(B|C) WHERE a.x = 'foo' AND a.y = 'bar')"
    ])    
});

// rels
test('test RelationshipPattern snippetSet types', () => {
    var rel = cy.rel().var('a').setTypes(['A','B','C']);
    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('-[a:A /* |B|C */]->');
    expect(parts[1]).toBe('-[a:A|B /* |C */]->');
    expect(parts[2]).toBe('-[a:A|B|C]->');
});

test('test RelationshipPattern snippetSet range literal', () => {
    var rel = cy.rel().var('a').setTypes(['A','B','C']);
    rel.rangeLiteral = '*1..2';

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe('-[a:A /* |B|C*1..2 */]->');
    expect(parts[1]).toBe('-[a:A|B /* |C*1..2 */]->');
    expect(parts[2]).toBe('-[a:A|B|C /* *1..2 */]->');
    expect(parts[3]).toBe('-[a:A|B|C*1..2]->');
});

test('test RelationshipPattern snippetSet patternQuantifier', () => {
    var rel = cy.rel().var('a').setTypes(['A','B','C']);
    //var rel = cy.rel().var('a').setTypes(['A']);
    rel.patternQuantifier = '+';

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe('-[a:A /* |B|C */]-> /* + */');
    expect(parts[1]).toBe('-[a:A|B /* |C */]-> /* + */');
    expect(parts[2]).toBe('-[a:A|B|C]-> /* + */');
    expect(parts[3]).toBe('-[a:A|B|C]->+');
});

test('test RelationshipPattern snippetSet props', () => {
    var rel = cy.rel().var('a')
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(4);

    expect(parts).toStrictEqual([
        '-[a /* { foo:1, bar:2, baz:"qux" } */]->',
        '-[a { foo:1 /* , bar:2, baz:"qux" */ }]->',
        '-[a { foo:1, bar:2 /* , baz:"qux" */ }]->',
        '-[a { foo:1, bar:2, baz:"qux" }]->'
    ])    
});

test('test RelationshipPattern snippetSet where', () => {
    var rel = cy.rel().var('a')

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    rel.where = whereClause;

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(3);

    expect(parts).toStrictEqual([
            "-[a /* WHERE a.x = 'foo' AND a.y = 'bar' */]->",
            "-[a WHERE a.x = 'foo' /* AND a.y = 'bar' */]->",
            "-[a WHERE a.x = 'foo' AND a.y = 'bar']->"
          ]
    )    
});

test('test RelationshipPattern snippetSet relationship type string and props', () => {
    var rel = cy.rel().var('a').relString('A&!(B|C)')
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(6);

    expect(parts).toStrictEqual([
        '-[a:A /* &!(B|C) { foo:1, bar:2, baz:"qux" } */]->',
        '-[a:A&!(B) /* |C) { foo:1, bar:2, baz:"qux" } */]->',
        '-[a:A&!(B|C) /* { foo:1, bar:2, baz:"qux" } */]->',
        '-[a:A&!(B|C) { foo:1 /* , bar:2, baz:"qux" */ }]->',
        '-[a:A&!(B|C) { foo:1, bar:2 /* , baz:"qux" */ }]->',
        '-[a:A&!(B|C) { foo:1, bar:2, baz:"qux" }]->'
    ])    
});

test('test RelationshipPattern snippetSet relationship type string and where', () => {
    var rel = cy.rel().var('a').relString('A&!(B|C)');

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    rel.where = whereClause;

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();
    //console.log('parts: ', parts)
    expect(parts.length).toBe(5);

    expect(parts).toStrictEqual([
        "-[a:A /* &!(B|C) WHERE a.x = 'foo' AND a.y = 'bar' */]->",
        "-[a:A&!(B) /* |C) WHERE a.x = 'foo' AND a.y = 'bar' */]->",
        "-[a:A&!(B|C) /* WHERE a.x = 'foo' AND a.y = 'bar' */]->",
        "-[a:A&!(B|C) WHERE a.x = 'foo' /* AND a.y = 'bar' */]->",
        "-[a:A&!(B|C) WHERE a.x = 'foo' AND a.y = 'bar']->"
    ])    
});

test('test patternElementChainLink snippetSet', () => {
    var nodeB = cy.node().var('b').labels(['B']);

    let link = cy.link().rel(null, ['TO']).node(nodeB);

    var snippetSet = link.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts)
    expect(parts.length).toBe(2);

    expect(parts).toStrictEqual([
        "-[:TO]->() /* (b:B) */",
        "-[:TO]->(b:B)",
    ])
});

test('test patternElementChainLink snippetSet with where and props', () => {
    var nodeB = cy.node().var('b').labels(['B'])
        .prop('foo', 1)
        .prop('bar', 2)
        .prop('baz', '"qux"');
;
    var rel = cy.rel().var('a').relString('A|C');

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    rel.where = whereClause;

    let link = cy.link().rel(rel).node(nodeB);

    var snippetSet = link.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts)
    expect(parts.length).toBe(8);

    expect(parts).toStrictEqual([
        `-[a:A /* |C WHERE a.x = 'foo' AND a.y = 'bar' */]->() /* (b:B { foo:1, bar:2, baz:"qux" }) */`,
        `-[a:A|C /* WHERE a.x = 'foo' AND a.y = 'bar' */]->() /* (b:B { foo:1, bar:2, baz:"qux" }) */`,
        `-[a:A|C WHERE a.x = 'foo' /* AND a.y = 'bar' */]->() /* (b:B { foo:1, bar:2, baz:"qux" }) */`,
        `-[a:A|C WHERE a.x = 'foo' AND a.y = 'bar']->() /* (b:B { foo:1, bar:2, baz:"qux" }) */`,
        `-[a:A|C WHERE a.x = 'foo' AND a.y = 'bar']->(b:B /* { foo:1, bar:2, baz:"qux" } */)`,
        `-[a:A|C WHERE a.x = 'foo' AND a.y = 'bar']->(b:B { foo:1 /* , bar:2, baz:"qux" */ })`,
        `-[a:A|C WHERE a.x = 'foo' AND a.y = 'bar']->(b:B { foo:1, bar:2 /* , baz:"qux" */ })`,
        `-[a:A|C WHERE a.x = 'foo' AND a.y = 'bar']->(b:B { foo:1, bar:2, baz:"qux" })`
    ])
});

test('test pathPattern snippetSet', () => {
    var pathPattern = cy.path()
        .node('a', ['A'])
        .link(cy.link().rel(null, ['TO']).node('b', ['B']))
        .link(cy.link().rel(null, ['TO']).node('c', ['C']))

    var snippetSet = pathPattern.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    // console.log('parts: ', parts)
    expect(parts.length).toBe(5);

    expect(parts).toStrictEqual([
        '(a:A) /* -[:TO]->(b:B)-[:TO]->(c:C) */',
        '(a:A)-[:TO]->() /* (b:B)-[:TO]->(c:C) */',
        '(a:A)-[:TO]->(b:B) /* -[:TO]->(c:C) */',
        '(a:A)-[:TO]->(b:B)-[:TO]->() /* (c:C) */',
        '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)'
    ]) 
});

test('test pathPattern snippetSet with where and props', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    whereClause
        .item(whereItem1)

    let rel = cy.rel().setTypes(['TO']);
    rel.where = whereClause;

    let link = cy.link().rel(rel).node('b', ['B']);

    let endNode = cy.node().var('c').nodeString('C&(D|E)');

    var pathPattern = cy.path()
        .node(cy.node()
            .var('a').labels(['A'])
            .prop('foo', 1)
            .prop('bar', 2)
        )
        .link(link)
        .link(cy.link().rel(null, ['TO']).node(endNode))

    var snippetSet = pathPattern.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    // console.log('parts: ', parts)
    expect(parts.length).toBe(10);

    expect(parts).toStrictEqual([
        "(a:A /* { foo:1, bar:2 } */) /* -[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1 /* , bar:2 */ }) /* -[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 }) /* -[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 })-[:TO /* WHERE a.x = 'foo' */]->() /* (b:B)-[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->() /* (b:B)-[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->(b:B) /* -[:TO]->(c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->() /* (c:C&(D|E)) */",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C /* &(D|E) */)",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C&(D) /* |E) */)",
        "(a:A { foo:1, bar:2 })-[:TO WHERE a.x = 'foo']->(b:B)-[:TO]->(c:C&(D|E))"    
    ])
});

test('qpp snippet set', () => {
    var qpp = cy.qpp()
        .path(
            cy.path()
                .node('person', ['Person'], { name: '"Keanu"'})
                .link(
                    cy.link()
                        .rel('acted_in', ['ACTED_IN'])
                        .node('movie', ['Movie'])
                )
        );

    var snippetSet = qpp.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts)

    expect(parts.length).toBe(4);

    expect(parts).toStrictEqual([
      '((person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie) */)',
      '((person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie) */)',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie) */)',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie))'
    ]);

})

test('rel qpp snippet set', () => {
    var rel = cy.rel()
        .qpp(
            cy.qpp()
            .path(
                cy.path()
                    .node('person', ['Person'], { name: '"Keanu"'})
                    .link(
                        cy.link()
                            .rel('acted_in', ['ACTED_IN'])
                            .node('movie', ['Movie'])
                    )
            )
        );

    var snippetSet = rel.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts)

    expect(parts.length).toBe(4);

    expect(parts).toStrictEqual([
      '((person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie) */) ',
      '((person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie) */) ',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie) */) ',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie)) '
    ]);

})

test('pattern qpp snippet set', () => {
    var qpp = cy.qpp()
    .path(
        cy.path()
            .node('person', ['Person'], { name: '"Keanu"'})
            .link(
                cy.link()
                    .rel('acted_in', ['ACTED_IN'])
                    .node('movie', ['Movie'])
            )
    );

    var path = cy.path().qpp(qpp);
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippetSet = pattern.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    //console.log('parts: ', parts)

    expect(parts.length).toBe(4);

    expect(parts).toStrictEqual([
      '((person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie) */)',
      '((person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie) */)',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie) */)',
      '((person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie))'
    ]);

});  

test('test PatternPart with variable and qpp', () => {
    // MATCH p = (c:Company) (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company)

    var qpp = cy.qpp()
        .path(
            cy.path()
                .node()
                .link(
                    cy.link()
                        .rel(null, ['OWNS'])
                        .node()
                )
        );
    qpp.pathPatternQuantifier = '+';

    let link1 = cy.link()
        .rel(cy.rel().qpp(qpp))
        .node('parentOfLeaf', ['Company']);

    let link2 = cy.link()
        .rel(null, ['OWNS'])
        .node('leaf', ['Company']);

    let path = cy.path()
        .node('c', ['Company'])
        .link(link1)
        .link(link2);

    let part = cy.part().var('p').path(path);
    let pattern = cy.pattern().addPart(part);    

    //console.log('pattern cypher: ', pattern.toCypherString());
    let expectedCypher = 'p = (c:Company) (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company)'
    expect(pattern.toCypherString(expectedCypher));


    // var snippetSet = qpp.getDebugCypherSnippetSet();
    // var parts = snippetSet.getSnippets();

    var snippetSet = pattern.getDebugCypherSnippetSet();
    var parts = snippetSet.getSnippets();

    // console.log('parts: ', parts)

    expect(parts.length).toBe(5);

    expect(parts).toStrictEqual([
        'p = (c:Company) /* (()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company) */',
        'p = (c:Company)(()-[:OWNS]->())+  /* (parentOfLeaf:Company)-[:OWNS]->(leaf:Company) */',
        'p = (c:Company)(()-[:OWNS]->())+ (parentOfLeaf:Company) /* -[:OWNS]->(leaf:Company) */',
        'p = (c:Company)(()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->() /* (leaf:Company) */',
        'p = (c:Company)(()-[:OWNS]->())+ (parentOfLeaf:Company)-[:OWNS]->(leaf:Company)'
    ]);
})

// Working on this
test('pattern snippet set - get individual cypher pieces', () => {
    let path = cy.path()
            .node('person', ['Person'], { name: '"Keanu"'})
            .link(
                cy.link()
                    .rel('acted_in', ['ACTED_IN'])
                    .node('movie', ['Movie'])
            )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippetSet = pattern.getDebugCypherSnippetSet();
    var snippetStringPairs = snippetSet.getSnippetsAsSnippetStringPairs();
    // console.log('snippetStringPairs: ', snippetStringPairs);

    expect(snippetStringPairs.length).toBe(4);
    var individualStrings = snippetStringPairs.map(x => x.snippet.snippetVal);
    // console.log('individualStrings: ', individualStrings);

    expect(individualStrings).toStrictEqual([ 
        'person:Person', 
        'name:"Keanu"', 
        'acted_in:ACTED_IN', 
        'movie:Movie' 
    ]);

    var explanatoryMarkers = snippetStringPairs.map(x => x.explanatoryMarker);    
    expect(explanatoryMarkers).toStrictEqual([ 
        ExplanatoryMarker.TypeExpression, 
        ExplanatoryMarker.PropertyMap, 
        ExplanatoryMarker.TypeExpression, 
        ExplanatoryMarker.TypeExpression 
    ]);
});  

test('test NodePattern snippetSet type expression string pairs', () => {
    var node = cy.node().var('a').nodeString('A&!(B|C)');

    var snippetSet = node.getDebugCypherSnippetSet();
    var snippetStringPairs = snippetSet.getSnippetsAsSnippetStringPairs();
    // console.log('snippetStringPairs: ', snippetStringPairs);

    var explanatoryMarkers = snippetStringPairs.map(x => x.explanatoryMarker);    
    expect(explanatoryMarkers).toStrictEqual([ 
        ExplanatoryMarker.TypeExpression, 
        ExplanatoryMarker.TypeExpression, 
        ExplanatoryMarker.TypeExpression 
    ]);
});

test('test NodePattern snippetSet where string pairs', () => {
    var node = cy.node().var('a')

    var whereClause = new WhereClause();
    var whereItem1 = whereItem('a.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('a.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    node.where = whereClause;

    var snippetSet = node.getDebugCypherSnippetSet();
    var snippetStringPairs = snippetSet.getSnippetsAsSnippetStringPairs();
    // console.log('snippetStringPairs: ', snippetStringPairs);

    var explanatoryMarkers = snippetStringPairs.map(x => x.explanatoryMarker);    
    expect(explanatoryMarkers).toStrictEqual([ 
        ExplanatoryMarker.TypeExpression, 
        ExplanatoryMarker.PatternWhereClause, 
        ExplanatoryMarker.PatternWhereClause
    ]);    

});
