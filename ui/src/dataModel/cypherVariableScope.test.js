
import { Pattern, 
    NodePattern, 
    RelationshipPattern, 
    RELATIONSHIP_DIRECTION,
    PatternElementChainLink,
    PathPattern,
    PatternPart
} from './cypherPattern';

import { CypherStatementBuilder } from './cypherStatementBuilder';
import { CypherVariableScope } from './cypherVariableScope';
import { WithVariable } from '../common/parse/antlr/withVariable';

const makeTestPattern = (variableScope) => {
    var startNodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person'],
        variableScope: variableScope,
        propertyMap: {
            name: 'Keanu'
        }
    });

    var endNodePattern = new NodePattern({
        key: 'movie',
        variable: 'movie',
        nodeLabels: ['Movie'],
        variableScope: variableScope
    })

    var relationshipPattern = new RelationshipPattern({
        key: 'acted_in',
        types: ['ACTED_IN'],
        direction: RELATIONSHIP_DIRECTION.RIGHT,
        variableScope: variableScope
    });

    var chain = new PatternElementChainLink({
        relationshipPattern: relationshipPattern,
        nodePattern: endNodePattern
    });

    var pathPattern = new PathPattern({
        nodePattern: startNodePattern,
        patternElementChain: [chain]
    })

    var patternPart = new PatternPart({
        pathPattern: pathPattern,
        variableScope: variableScope
    })

    var pattern = new Pattern({
        patternParts: [patternPart]
    })

    return pattern;
}

test('test variable scope', () => {

    var variableScope = new CypherVariableScope();
    makeTestPattern(variableScope);

    var variableSet = variableScope.getVariableSet();
    //console.log("variableSet: ", variableSet);
    expect(variableSet.size).toBe(2);
    expect(variableSet.has("person")).toBe(true);
    expect(variableSet.has("movie")).toBe(true);

    /*
    var personVarSet = variableScope.getVariableSetForNodeLabel("Person");
    expect(personVarSet.size).toBe(1);
    expect(personVarSet.has("person")).toBe(true);

    var movieVarSet = variableScope.getVariableSetForNodeLabel("Movie");
    expect(movieVarSet.size).toBe(1);
    expect(movieVarSet.has("movie")).toBe(true);
    */
});

test('test new variable', () => {
    var variableScope = new CypherVariableScope();
    makeTestPattern(variableScope);

    var newPersonVar = variableScope.getCandidateNodePatternVariable("Person");
    expect(newPersonVar).toBe("person1");

    var newMovieVar = variableScope.getCandidateNodePatternVariable("Movie");
    expect(newMovieVar).toBe("movie1");

    var newDirectorVar = variableScope.getCandidateNodePatternVariable("Director");
    expect(newDirectorVar).toBe("director1");

    var newActedInVar = variableScope.getCandidateRelationshipPatternVariable("ACTED_IN");
    expect(newActedInVar).toBe("actedIn1");
});

test('test several new variables', () => {
    var variableScope = new CypherVariableScope();
    makeTestPattern(variableScope);

    var newPersonVar = variableScope.getCandidateNodePatternVariable("Person");
    new NodePattern({
        variable: newPersonVar,
        nodeLabels: ['Person'],
        variableScope: variableScope
    });

    newPersonVar = variableScope.getCandidateNodePatternVariable("Person");
    expect(newPersonVar).toBe("person2");

    var newActedInVar = variableScope.getCandidateRelationshipPatternVariable("ACTED_IN");
    new RelationshipPattern({
        types: ['ACTED_IN'],
        variable: newActedInVar,
        direction: RELATIONSHIP_DIRECTION.RIGHT,
        variableScope: variableScope
    });

    newActedInVar = variableScope.getCandidateRelationshipPatternVariable("ACTED_IN");
    expect(newActedInVar).toBe("actedIn2");
});

test('test several new variables with multiple node label', () => {
    var variableScope = new CypherVariableScope();
    makeTestPattern(variableScope);

    var newPersonVar = variableScope.getCandidateNodePatternVariable("Person");
    new NodePattern({
        variable: newPersonVar,
        nodeLabels: ['Person', 'Foo'],
        variableScope: variableScope
    });

    /*
    var personVarSet = variableScope.getVariableSetForNodeLabel("Person");
    expect(personVarSet.size).toBe(2);
    expect(personVarSet.has("person")).toBe(true);
    expect(personVarSet.has("person1")).toBe(true);

    var fooVarSet = variableScope.getVariableSetForNodeLabel("Foo");
    expect(fooVarSet.size).toBe(1);
    expect(fooVarSet.has("person1")).toBe(true);
    */

    var newFooVar = variableScope.getCandidateNodePatternVariable("Foo");
    new NodePattern({
        variable: newFooVar,
        nodeLabels: ['Foo'],
        variableScope: variableScope
    });

    /*
    var fooVarSet = variableScope.getVariableSetForNodeLabel("Foo");
    expect(fooVarSet.size).toBe(2);
    expect(fooVarSet.has("person1")).toBe(true);
    expect(fooVarSet.has("foo1")).toBe(true);
    */
});

test('renameVariable', () => {
    var variableScope = new CypherVariableScope();
    makeTestPattern(variableScope);

    variableScope.renameVariable('person', 'actor');

    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(2);

    expect(variableSet.has("person")).toBe(false);
    expect(variableSet.has("actor")).toBe(true);
    expect(variableSet.has("movie")).toBe(true);
});

test('removeVariable', () => {
    var variableScope = new CypherVariableScope();
    const cy = new CypherStatementBuilder({
        variableScope: variableScope
    });
    
    var aNode = cy.node().var('a').labels(['A']);
    var bNode = cy.node().var('b').labels(['B']);
    var rel_ab = cy.rel().setKey('ab').var('r').setTypes(['TO']);

    var path = cy.path()
        .node(aNode)
        .link(cy.link().rel(rel_ab).node(bNode))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);
    
    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[r:TO]->(b:B)';
    expect(cypher).toEqual(expectedCypher);
    
    // confirm variables
    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(3);

    expect(variableSet.has("a")).toBe(true);
    expect(variableSet.has("r")).toBe(true);
    expect(variableSet.has("b")).toBe(true);

    // remove variable
    variableScope.removeItem(aNode);

    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(2);

    expect(variableSet.has("a")).toBe(false);
    expect(variableSet.has("r")).toBe(true);
    expect(variableSet.has("b")).toBe(true);

});

test('rename then remove variable', () => {
    var variableScope = new CypherVariableScope();
    const cy = new CypherStatementBuilder({
        variableScope: variableScope
    });
    
    var aNode = cy.node().var('a').labels(['A']).setKey('node1');
    var bNode = cy.node().var('b').labels(['B']).setKey('node2');
    var rel_ab = cy.rel().setKey('ab').var('r').setTypes(['TO']);

    var path = cy.path()
        .node(aNode)
        .link(cy.link().rel(rel_ab).node(bNode))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);
    
    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[r:TO]->(b:B)';
    expect(cypher).toEqual(expectedCypher);
    
    // rename variable
    variableScope.renameVariable('a', 'b', aNode);

    // confirm variables
    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(2);

    expect(variableSet.has("a")).toBe(false);
    expect(variableSet.has("r")).toBe(true);
    expect(variableSet.has("b")).toBe(true);

    // remove variable - b still exists because a (node1) was renamed to b
    variableScope.removeItem(bNode);

    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(2);

    expect(variableSet.has("r")).toBe(true);
    expect(variableSet.has("b")).toBe(true);

});

test ('clear WithVariables', () => {
    var variableScope = new CypherVariableScope();
    const cy = new CypherStatementBuilder({
        variableScope: variableScope
    });
    
    cy.node().var('a').labels(['A']);

    var foo = new WithVariable({ key: 'b', variable: 'foo'});
    variableScope.addVariable(foo.variable, foo);

    var variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(2);

    expect(variableSet.has("a")).toBe(true);
    expect(variableSet.has("foo")).toBe(true);

    variableScope.clearWithVariables();

    variableSet = variableScope.getVariableSet();
    expect(variableSet.size).toBe(1);

    expect(variableSet.has("a")).toBe(true);
    expect(variableSet.has("foo")).toBe(false);
});