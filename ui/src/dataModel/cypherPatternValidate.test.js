import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

test('test getValidationCypherSnippets - test multiple pathPatterns', () => {
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

    var snippets = pattern.getValidationCypherSnippets();
    expect(snippets.length).toBe(8);

    expect(snippets[0]).toBe('(a:A)');
    expect(snippets[1]).toBe('(a:A)-[:TO]->()');
    expect(snippets[2]).toBe('(a:A)-[:TO]->(b:B)');
    expect(snippets[3]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->()');
    expect(snippets[4]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C)');
    expect(snippets[5]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)');
    expect(snippets[6]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->()');
    expect(snippets[7]).toBe('(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B)');
});


test('test getValidationCypherSnippets with node property key/values', () => {

    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu'})
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'])
            .node('movie', ['Movie'])
    )
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getValidationCypherSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(6);

    expect(snippets).toStrictEqual(
    [ '(person:Person)',
      '(person:Person) \nWHERE person.name IS NOT NULL',
      '(person:Person)-[acted_in:ACTED_IN]->()',
      '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE person.name IS NOT NULL',
      '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie)',
      '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE person.name IS NOT NULL' ]
    );

});

test('test getValidationCypherSnippets with node/rel property key/values', () => {

    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu'})
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'], { role: 'Neo'})
            .node('movie', ['Movie'])
    )
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getValidationCypherSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(8);

    expect(snippets).toStrictEqual(
        [ '(person:Person)',
        '(person:Person) \nWHERE person.name IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->()',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE person.name IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE acted_in.role IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie)',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE person.name IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE acted_in.role IS NOT NULL' ]
        );

});

test('test getValidationCypherSnippets with node/rel multiple property key/values', () => {

    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu', age: 40})
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'], { role: 'Neo', theOne: true})
            .node('movie', ['Movie'])
    )
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getValidationCypherSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(13);

    expect(snippets).toStrictEqual(
        [ '(person:Person)',
        '(person:Person) \nWHERE person.name IS NOT NULL',
        '(person:Person) \nWHERE person.name IS NOT NULL AND person.age IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->()',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE person.name IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE person.name IS NOT NULL AND person.age IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE acted_in.role IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->() \nWHERE acted_in.role IS NOT NULL AND acted_in.theOne IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie)',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE person.name IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE person.name IS NOT NULL AND person.age IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE acted_in.role IS NOT NULL',
        '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie) \nWHERE acted_in.role IS NOT NULL AND acted_in.theOne IS NOT NULL' ]
        );

});

test('test getValidationCypherSnippets with node/rel property key/values - no variable', () => {

    var path = cy.path()
    .node('', ['Person'], { name: 'Keanu', age: 40})
    .link(
        cy.link()
            .rel('', ['ACTED_IN'], { role: 'Neo'})
            .node('movie', ['Movie'])
    )
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getValidationCypherSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(11);

    expect(snippets).toStrictEqual(
        [ '(v1:Person)',
        '(v1:Person) \nWHERE v1.name IS NOT NULL',
        '(v1:Person) \nWHERE v1.name IS NOT NULL AND v1.age IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->()',
        '(v1:Person)-[v2:ACTED_IN]->() \nWHERE v1.name IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->() \nWHERE v1.name IS NOT NULL AND v1.age IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->() \nWHERE v2.role IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->(movie:Movie)',
        '(v1:Person)-[v2:ACTED_IN]->(movie:Movie) \nWHERE v1.name IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->(movie:Movie) \nWHERE v1.name IS NOT NULL AND v1.age IS NOT NULL',
        '(v1:Person)-[v2:ACTED_IN]->(movie:Movie) \nWHERE v2.role IS NOT NULL' ]
      );

});

test('test prop key in end node ', () => {

    // (graphDocView:GraphView)-[:DEFAULT_GRAPH_VIEW_FOR]->(graphDoc:GraphDoc {key:graphDocKey})
    var path = cy.path()
    .node('graphDocView', ['GraphView'])
    .link(
        cy.link()
            .rel('', ['DEFAULT_GRAPH_VIEW_FOR'])
            .node('graphDoc', ['Movie'], {key: 'graphDocKey'})
    )
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var snippets = pattern.getValidationCypherSnippets();
    //console.log('snippets: ', snippets);
    expect(snippets.length).toBe(4);
    expect(snippets).toStrictEqual([ '(graphDocView:GraphView)',
        '(graphDocView:GraphView)-[:DEFAULT_GRAPH_VIEW_FOR]->()',
        '(graphDocView:GraphView)-[:DEFAULT_GRAPH_VIEW_FOR]->(graphDoc:Movie)',
        '(graphDocView:GraphView)-[:DEFAULT_GRAPH_VIEW_FOR]->(graphDoc:Movie) \nWHERE graphDoc.key IS NOT NULL' ]
    );

});

/*
// TODO: fix the includePathPattern stuff so that it does a deep value comparison instead of comparing by keys
test('test paysim print cypher', () => {

    var client = cy.node().var('client1').labels(['Client']);
    var transaction = cy.node().var('transaction1').labels(['Transaction']);
    var email = cy.node().var('email1').labels(['Email']);
    //var ssn = cy.node().var('ssn1').labels(['SSN']);
    //var phone = cy.node().var('phone1').labels(['Phone']);

    // MATCH (client1:Client)-[:PERFORMED]->(transaction1:Transaction), 
    //   (client1:Client)-[:HAS_EMAIL]->(email1:Email), 
    //   (client1:Client)-[:HAS_SSN]->(ssn1:SSN), 
    //   (client1:Client)-[:HAS_PHONE]->(phone1:Phone)
    var clientPerformedTransaction = cy.path().node(client).link(cy.link().rel('', ['PERFORMED']).node(transaction));
    var clientPerformedTransaction2 = cy.path().node(client).link(cy.link().rel('', ['PERFORMED']).node(cy.node().var('transaction1').labels(['Transaction'])));
    //var clientHasEmail = cy.path().node(client).link(cy.link().rel('', ['HAS_EMAIL']).node(email));
    //var clientHasSsn = cy.path().node(client).link(cy.link().rel('', ['HAS_SSN']).node(ssn));
    //var clientHasPhone = cy.path().node(client).link(cy.link().rel('', ['HAS_PHONE']).node(phone));

    var pattern = cy.pattern();
    var part1 = cy.part().path(clientPerformedTransaction);
    var part2 = cy.part().path(clientPerformedTransaction2);
    //var part2 = cy.part().path(clientHasEmail);
    pattern.addPart(part1);
    pattern.addPart(part2);
    //pattern.addPart(cy.part().path(clientHasSsn));
    //pattern.addPart(cy.part().path(clientHasPhone));

    //console.log(part1.includesPatternPart(part2));
    //console.log(part1.getPathPattern().includesPathPattern(part2.getPathPattern()));
    console.log(clientPerformedTransaction.includesPathPattern(clientPerformedTransaction2));
    console.log(pattern.toCypherString());
});

*/