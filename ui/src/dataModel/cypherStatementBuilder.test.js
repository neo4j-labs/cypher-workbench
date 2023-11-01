
import { CypherStatementBuilder } from './cypherStatementBuilder';

const cy = new CypherStatementBuilder();

const buildPath = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu'})
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

test ('build path', () => {

    var pattern = buildPath();
    expect(pattern.patternParts.length).toBe(1);

    var cypher = pattern.toCypherString();
    //console.log('cypher: ' + cypher);
    //console.log("path", path);
    var expectedCypher = '(person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)';
    expect(cypher).toEqual(expectedCypher);
});
