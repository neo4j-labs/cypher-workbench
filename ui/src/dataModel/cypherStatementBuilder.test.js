
import { CypherStatementBuilder } from './cypherStatementBuilder';
import { whereItem } from './cypherWhere';
import { RELATIONSHIP_DIRECTION } from './cypherPattern';

const cy = new CypherStatementBuilder();

const buildPath = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: '"Keanu"'})
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'])
            .node('movie', ['Movie'])
    )
    .link(
        cy.link()
            .rel('directed', ['DIRECTED']).left()
            .node('director', ['Director'])
    )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    return pattern;
}

const buildQPP = () => {
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
    return qpp;
}

test ('build path', () => {

    var pattern = buildPath();
    expect(pattern.patternParts.length).toBe(1);

    var cypher = pattern.toCypherString();
    //console.log('cypher: ' + cypher);
    //console.log("path", path);
    var expectedCypher = '(person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)';
    expect(cypher).toEqual(expectedCypher);
});

test ('qpp', () => {
    var qpp = buildQPP();
    var cypher = qpp.toCypherString();
    //console.log('cypher: ' + cypher);
    var expectedCypher = ' ((person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)) ';
    expect(cypher).toEqual(expectedCypher);
});

test ('qpp quantifier', () => {
    var qpp = buildQPP();
    qpp.pathPatternQuantifier = '{1,2}';
    var cypher = qpp.toCypherString();
    //console.log('cypher: ' + cypher);
    var expectedCypher = ' ((person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)){1,2} ';
    expect(cypher).toEqual(expectedCypher);
});


// test ('path qpp', () => {
//     console.log('cy.path(): ' + cy.path().constructor.name);
//     console.log('cy.path().qpp(): ' + cy.path().qpp().constructor.name);
//     console.log('cy.qpp(): ' + cy.qpp().constructor.name);
// });

test ('path qpp', () => {
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

    // console.log('qpp cypher: ' + qpp.toCypherString());
    // console.log('path cypher: ' + path.toCypherString());
    // console.log('part cypher: ' + part.toCypherString());
    // console.log('pattern cypher: ' + pattern.toCypherString());
    var cypher = pattern.toCypherString();
    var expectedCypher = ' ((person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)) ';
    expect(cypher).toEqual(expectedCypher);
});

test('node where', () => {
    let node = cy.node()
        .var('person')
        .labels(['Person']);
    node.where = cy.where().item(whereItem('person.name', '=','"Keanu"'));
    //console.log(node.toCypherString());
    var cypher = node.toCypherString();
    var expectedCypher = '(person:Person WHERE person.name = "Keanu")';
    expect(cypher).toEqual(expectedCypher);
})

test('rel where', () => {
    let rel = cy.rel()
        .var('acted_in')
        .dir(RELATIONSHIP_DIRECTION.RIGHT)
        .setTypes(['ACTED_IN']);
        rel.where = cy.where().item(whereItem('acted_in.role', '','"Neo"'));
    //console.log(rel.toCypherString());
    var cypher = rel.toCypherString();
    var expectedCypher = '-[acted_in:ACTED_IN WHERE acted_in.role"Neo"]->';
    expect(cypher).toEqual(expectedCypher);
});

test('qpp where', () => {
    var qpp = buildQPP();
    qpp.where = cy.where().item(whereItem('acted_in.role', '','"Neo"'));
    //console.log('qpp.where cypher: ' + qpp.where.toCypherString());

    var cypher = qpp.toCypherString();
    //console.log('cypher: ' + cypher);
    var expectedCypher = ' ((person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie) WHERE acted_in.role"Neo") ';
    expect(cypher).toEqual(expectedCypher);
})

test('node + path > rel > qpp pattern', () => {
    // qpp path pattern
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

    var rel = cy.rel();
    rel.quantifiedPathPattern = qpp;

    var path = cy.path()
        .node('foo', ['Foo'], {})
        .link(
            cy.link().rel(rel)
        )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    // console.log('qpp cypher: ' + qpp.toCypherString());
    // console.log('rel cypher: ' + rel.toCypherString());
    // console.log('path cypher: ' + path.toCypherString());
    // console.log('part cypher: ' + part.toCypherString());
    // console.log('pattern cypher: ' + pattern.toCypherString());
    var cypher = pattern.toCypherString();
    var expectedCypher = '(foo:Foo) ((person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)) ';
    expect(cypher).toEqual(expectedCypher);

})

