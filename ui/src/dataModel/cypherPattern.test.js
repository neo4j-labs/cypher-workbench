
import { 
    patternsEqualByKey,
    nodeRelNodePatternsEqualByKey,
    nodePatternArrayDifference,
    nodeRelNodePatternArrayDifference,
    Pattern, 
    NodePattern, 
    RelationshipPattern, 
    RELATIONSHIP_DIRECTION,
    PatternElementChainLink,
    PathPattern,
    PatternPart
} from './cypherPattern';

import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

const buildPattern = () => {
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

const makeMovieNodePattern = () => {
    var nodePattern = new NodePattern({
        key: 'movie',
        variable: 'movie',
        nodeLabels: ['Movie']
    })
    return nodePattern;
}

const makePatternElementChain = () => {
    var endNodePattern = makeMovieNodePattern();

    var relationshipPattern = new RelationshipPattern({
        key: 'acted_in',
        types: ['ACTED_IN'],
        direction: RELATIONSHIP_DIRECTION.RIGHT
    });

    var chain = new PatternElementChainLink({
        relationshipPattern: relationshipPattern,
        nodePattern: endNodePattern
    });

    return chain;
}

const makeTestPathPattern = () => {
    var startNodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person'],
        propertyMap: {
            name: '"Keanu"'
        }
    });

    var chain = makePatternElementChain();

    var pathPattern = new PathPattern({
        nodePattern: startNodePattern,
        patternElementChain: [chain]
    })

    return pathPattern;
}

const makeTestPattern = () => {

    var patternPart = new PatternPart({
        pathPatterns: [makeTestPathPattern()]
    })

    var pattern = new Pattern({
        patternParts: [patternPart]
    })

    return pattern;
}

const makePersonNodePattern = () => {
    var nodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person'],
        propertyMap: {
            name: 'Keanu'
        }
    });
    return nodePattern;
}

const makeRelationshipPattern = () => {
    var relationshipPattern = new RelationshipPattern({
        key: 'acted_in',
        types: ['ACTED_IN'],
        direction: RELATIONSHIP_DIRECTION.RIGHT
    });
    return relationshipPattern;
}

const makeMoviePathPattern = () => {
    var moviePattern = makeMovieNodePattern();

    var pathPattern = new PathPattern({
        nodePattern: moviePattern,
        patternElementChain: []
    })
    return pathPattern;
}

const makeMovieTestPatternPart = () => {

    var patternPart = new PatternPart({
        pathPatterns: [makeMoviePathPattern()]
    })

    return patternPart;
}

test('make pattern', () => {
    var pattern = new Pattern();
    expect(pattern).not.toBeNull();
});

test('make simple movie pattern', () => {
    var pattern = makeTestPattern();

    expect(pattern.patternParts.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern()).not.toBeNull();
    expect(pattern.patternParts[0].getPathPattern().nodePattern.variable).toBe('person');
    expect(pattern.patternParts[0].getPathPattern().nodePattern.nodeLabels).toStrictEqual(['Person']);
    expect(pattern.patternParts[0].getPathPattern().nodePattern.propertyMap).toStrictEqual({name: '"Keanu"'});

    expect(pattern.patternParts[0].getPathPattern().patternElementChain.length).toBe(1);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.variable).toBe('movie');
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].nodePattern.nodeLabels).toStrictEqual(['Movie']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);
    expect(pattern.patternParts[0].getPathPattern().patternElementChain[0].relationshipPattern.direction).toBe(RELATIONSHIP_DIRECTION.RIGHT);
});

test('convert simple movie pattern to cypher string', () => {
    var pattern = makeTestPattern();
    var cypherString = pattern.toCypherString();
    var expected = '(person:Person {name:"Keanu"})-[:ACTED_IN]->(movie:Movie)';
    expect(cypherString).toBe(expected);
});

test('node pattern are keys equal', () => {
    var nodePattern1 = makePersonNodePattern();
    var nodePattern2 = makePersonNodePattern();
    expect(nodePattern1.areKeysEqual(nodePattern2)).toBe(true);
});

test('relationship pattern are keys equal', () => {
    var relationshipPattern1 = makeRelationshipPattern();
    var relationshipPattern2 = makeRelationshipPattern();
    expect(relationshipPattern1.areKeysEqual(relationshipPattern2)).toBe(true);
});

test('patternElementChain includesNodePattern', () => {
    var patternElementChain = makePatternElementChain();
    var moviePattern = makeMovieNodePattern();

    expect(patternElementChain.includesNodePattern(moviePattern)).toBe(true);
});

test('patternElementChain includesPatternElementChain', () => {
    var patternElementChain1 = makePatternElementChain();
    var patternElementChain2 = makePatternElementChain();

    expect(patternElementChain1.includesPatternElementChain(patternElementChain2)).toBe(true);
});

test('pathPattern includesPathPattern', () => {
    var testPathPattern = makeTestPathPattern();
    var moviePathPattern = makeMoviePathPattern();

    expect(testPathPattern.includesPathPattern(moviePathPattern)).toBe(true);
});

test('convert simple movie pattern to cypher string, but add the movie pattern twice', () => {
    var pattern = makeTestPattern();
    var moviePatternPart = makeMovieTestPatternPart();
    pattern.addPatternPart(moviePatternPart);

    var cypherString = pattern.toCypherString();
    var expected = '(person:Person {name:"Keanu"})-[:ACTED_IN]->(movie:Movie)';
    expect(cypherString).toBe(expected);
});


test('test variable set', () => {

    var pattern = makeTestPattern();

    var varSet = pattern.getVariableSet();
    //console.log("varSet: ", varSet);
    expect(varSet.size).toBe(2);

    expect(varSet.has('person')).toBe(true);
    expect(varSet.has('movie')).toBe(true);

});

test('test findNodePatternPathPatterns', () => {
    var pattern = makeTestPattern();

    var pathPatterns = pattern.findNodePatternPathPatternsByKey('person');
    expect(pathPatterns.length).toBe(1);
    expect(pathPatterns[0].nodePattern.key).toBe('person');
});

test('is start node and is end node', () => {

    var pattern = makeTestPattern();
    var pathPatterns = pattern.findNodePatternPathPatternsByKey('person');
    var pathPattern = pathPatterns[0];    

    //console.log('pathPattern: ', pathPattern);
    expect(pathPattern.isStartNode('person')).toBe(true);
    expect(pathPattern.isStandaloneStartNode('person')).toBe(false);
    expect(pathPattern.isStartNode('movie')).toBe(false);
    expect(pathPattern.isEndNode('person')).toBe(false);
    expect(pathPattern.isEndNode('movie')).toBe(true);

    var newNodePattern = new NodePattern({
        key: 'foo',
        variable: 'foo',
        nodeLabels: ['Foo']
    });

    pattern.addNodePatternPart(newNodePattern);
    pathPatterns = pattern.findNodePatternPathPatternsByKey('foo');
    pathPattern = pathPatterns[0];    
    expect(pathPattern.isStandaloneStartNode('foo')).toBe(true);
});

test('find movie', () => {
    var pattern = buildPattern();
    expect(pattern.patternParts.length).toBe(1);

    var movieNodePattern = pattern.findNodePattern({variable: 'movie'});
    expect(movieNodePattern).not.toBeNull();
    expect(movieNodePattern.nodeLabels).toStrictEqual(['Movie']);
});

test('find movie by Movie label', () => {
    var pattern = buildPattern();
    expect(pattern.patternParts.length).toBe(1);

    var movieNodePattern = pattern.findNodePattern({nodeLabels: ['Movie']});
    expect(movieNodePattern).not.toBeNull();
    expect(movieNodePattern.variable).toStrictEqual('movie');
});

test('find movie by Movie label when Movie has an additional label Film', () => {
    var movieNode = cy.node().var('movie').labels(['Movie','Film']);
    var path = cy.path().node(movieNode);
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var movieNodePattern = pattern.findNodePattern({nodeLabels: ['Movie']});
    expect(movieNodePattern).not.toBeNull();
    expect(movieNodePattern.variable).toBe('movie');

    movieNodePattern = pattern.findNodePattern({nodeLabels: ['Film']});
    expect(movieNodePattern).not.toBeNull();
    expect(movieNodePattern.variable).toBe('movie');
});

test('find person by property ', () => {

    var path = cy.path().node('person', ['Person'], { name: 'Keanu', profession: 'actor'})
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);
    
    var personPattern = pattern.findNodePattern({propertyMap: {profession:'actor'}});
    expect(personPattern).not.toBeNull();
    expect(personPattern.variable).toBe('person');

    personPattern = pattern.findNodePattern({propertyMap: {name:'Bill'}});
    expect(personPattern).toBeNull();
});

test('find all movie triples', () => {
    var pattern = buildPattern();
    expect(pattern.patternParts.length).toBe(1);

    var allTriples = pattern.findAllNodePatternTriples({variable: 'movie'});
    expect(allTriples.length).toBe(2);

    expect(allTriples[0].startNodePattern).not.toBeNull();
    expect(allTriples[0].startNodePattern.nodeLabels).toStrictEqual(['Person']);

    expect(allTriples[0].endNodePattern).not.toBeNull();
    expect(allTriples[0].endNodePattern.nodeLabels).toStrictEqual(['Movie']);

    expect(allTriples[1].startNodePattern).not.toBeNull();
    expect(allTriples[1].startNodePattern.nodeLabels).toStrictEqual(['Movie']);

    expect(allTriples[1].endNodePattern).not.toBeNull();
    expect(allTriples[1].endNodePattern.nodeLabels).toStrictEqual(['Director']);

});

test('find all movie triple from a single node pattern path ', () => {

    var moviePatternPart = makeMovieTestPatternPart();
    var pattern = cy.pattern().addPart(moviePatternPart);

    var allTriples = pattern.findAllNodePatternTriples({variable: 'movie'});
    expect(allTriples.length).toBe(1);

    expect(allTriples[0].startNodePattern).not.toBeNull();
    expect(allTriples[0].startNodePattern.nodeLabels).toStrictEqual(['Movie']);

    expect(allTriples[0].endNodePattern).toBeNull();

});

test('test getNodeRelNodePattern', () => {
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

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)';
    expect(cypher).toEqual(expectedCypher);

    var nodeRelNode = pattern.getNodeRelNodePattern(rel_bc);
    //console.log('nodeRelNode: ', nodeRelNode);
    expect(nodeRelNode.startNodePattern).toEqual(bNode);
    expect(nodeRelNode.relationshipPattern).toEqual(rel_bc);
    expect(nodeRelNode.endNodePattern).toEqual(cNode);
});

test('remove movie', () => {

    var pattern = buildPattern();
    expect(pattern.patternParts.length).toBe(1);

    var movieNodePattern = pattern.findNodePattern({variable: 'movie'});
    pattern.removeNodePattern(movieNodePattern);
    
    expect(pattern.patternParts.length).toBe(2);

    var cypher = pattern.toCypherString();
    //console.log('cypher: ' + cypher);
    //console.log("path", path);
    var expectedCypher = '(person:Person {name:"Keanu"}), (director:Director)';
    expect(cypher).toEqual(expectedCypher);

});

test('remove acted in', () => {
    var person = cy.node().setKey('person').var('person').labels(['Person']);
    var movie = cy.node().setKey('movie').var('movie').labels(['Movie']);
    var director = cy.node().setKey('director').var('director').labels(['Director']);

    var actedIn = cy.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']);
    var directed = cy.rel().setKey('directed').var('directed')
        .setTypes(['DIRECTED']).dir(RELATIONSHIP_DIRECTION.LEFT);

    var path = cy.path()
        .node(person)
        .link(cy.link().rel(actedIn).node(movie))
        .link(cy.link().rel(directed).node(director));

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    expect(pattern.patternParts.length).toBe(1);

    var cypher = pattern.toCypherString();
    //console.log('cypher: ' + cypher);
    //console.log("path", path);
    var expectedCypher = '(person:Person)-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)';
    expect(cypher).toEqual(expectedCypher);

    pattern.removeRelationshipPattern(actedIn);
    
    expect(pattern.patternParts.length).toBe(2);

    var cypher = pattern.toCypherString();
    //console.log('cypher: ' + cypher);
    //console.log("path", path);
    var expectedCypher = '(person:Person), (movie:Movie)<-[directed:DIRECTED]-(director:Director)';
    expect(cypher).toEqual(expectedCypher);

});


test ('remove node referenced twice in one long path', () => {
    var path = cy.path()
        .node('a', ['A'])
        .link(cy.link().rel(null, ['TO']).node('b', ['B']))
        .link(cy.link().rel(null, ['TO']).node('c', ['C']))
        .link(cy.link().rel(null, ['TO']).node('d', ['D']))
        .link(cy.link().rel(null, ['TO']).node('b', ['B']))
        .link(cy.link().rel(null, ['TO']).node('e', ['E']))
        .link(cy.link().rel(null, ['TO']).node('f', ['F']))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    expect(pattern.patternParts.length).toBe(1);

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)-[:TO]->(d:D)-[:TO]->(b:B)-[:TO]->(e:E)-[:TO]->(f:F)';
    expect(cypher).toEqual(expectedCypher);

    var b = pattern.findNodePattern({variable: 'b', nodeLabels: ['B']});
    pattern.removeNodePattern(b);

    expect(pattern.patternParts.length).toBe(3);

    cypher = pattern.toCypherString();
    expectedCypher = '(a:A), (c:C)-[:TO]->(d:D), (e:E)-[:TO]->(f:F)';
    expect(cypher).toEqual(expectedCypher);
});

test ('add relationship between two nodes', () => {
    var startNode = cy.node().setKey('a').var('a').labels(['A']);
    var pathA = cy.path().node(startNode);
    var partA = cy.part().path(pathA);
    var pattern = cy.pattern().addPart(partA);

    var endNode = cy.node().setKey('b').var('b').labels(['B']);
    var pathB = cy.path().node(endNode);
    var partB = cy.part().path(pathB);
    var pattern = pattern.addPart(partB);

    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, startNode, rel, endNode);

    // since B is joined to A, B should be removed as an independent pathPattern
    expect(pattern.patternParts.length).toBe(1);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)';
    expect(cypher).toEqual(expectedCypher);
});

test ('add relationship between an existing pattern and another node as a start node', () => {
    var middleNode = cy.node().setKey('b').var('b').labels(['B']);
    var path = cy.path()
        .node(middleNode)
        .link(cy.link().rel(null, ['TO']).node('c', ['C']))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var startNode = cy.node().setKey('a').var('a').labels(['A']);
    var pathA = cy.path().node(startNode);
    var partA = cy.part().path(pathA);
    var pattern = pattern.addPart(partA);

    //console.log("pattern.patternParts: ", JSON.stringify(pattern.patternParts));
    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    //console.log("adding start node to beginning of chain");
    pattern.addPatternElementChain(null, startNode, rel, middleNode);

    // since A is joined to B->C, it should be removed as an independent pathPattern
    expect(pattern.patternParts.length).toBe(1);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)';
    expect(cypher).toEqual(expectedCypher);
});

test ('add relationship between an existing pattern and another node as an end node', () => {
    var middleNode = cy.node().setKey('b').var('b').labels(['B']);
    var path = cy.path()
        .node('a', ['A'])
        .link(cy.link().rel(null, ['TO']).node(middleNode))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    var endNode = cy.node().setKey('c').var('c').labels(['C']);
    var pathC = cy.path().node(endNode);
    var partC = cy.part().path(pathC);
    var pattern = pattern.addPart(partC);

    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, middleNode, rel, endNode);

    // since C is joined to A->B, it should be removed as an independent pathPattern
    expect(pattern.patternParts.length).toBe(1);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)';
    expect(cypher).toEqual(expectedCypher);

});

test ('add relationship between an two patterns', () => {
    var nodeB = cy.node().setKey('b').var('b').labels(['B']);
    var nodeC = cy.node().setKey('c').var('c').labels(['C']);

    var pathAB = cy.path()
        .node('a', ['A'])
        .link(cy.link().rel(null, ['TO']).node(nodeB));

    var partAB = cy.part().path(pathAB);
    var pattern = cy.pattern().addPart(partAB);

    var pathCD = cy.path()
        .node(nodeC)
        .link(cy.link().rel(null, ['TO']).node('d', ['D']));

    var partCD = cy.part().path(pathCD);
    pattern.addPart(partCD);

    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, nodeB, rel, nodeC);

    // since C->D is joined to A->B, it should be removed as an independent pathPattern
    expect(pattern.patternParts.length).toBe(1);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)-[:TO]->(d:D)';
    expect(cypher).toEqual(expectedCypher);

});

test ('Add B->D, in existing pattern A->B->C', () => {

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

    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, nodeB, rel, nodeD);

    // still have 2 pattern parts, original A->B->C and B->D
    expect(pattern.patternParts.length).toBe(2);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (b:B)-[:TO]->(d:D)';
    expect(cypher).toEqual(expectedCypher);

});

test ('Add D->B, in existing pattern A->B->C', () => {

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

    expect(pattern.patternParts.length).toBe(2);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, nodeD, rel, nodeB);

    // still have 2 pattern parts, original A->B->C and D->B
    expect(pattern.patternParts.length).toBe(2);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C), (d:D)-[:TO]->(b:B)';
    expect(cypher).toEqual(expectedCypher);

});

test ('Using A->B->C, connect C->A', () => {

    var nodeA = cy.node().setKey('a').var('a').labels(['A']);
    var nodeC = cy.node().setKey('c').var('c').labels(['C']);

    var path = cy.path()
        .node(nodeA)
        .link(cy.link().rel(null, ['TO']).node('b', ['B']))
        .link(cy.link().rel(null, ['TO']).node(nodeC))

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    expect(pattern.patternParts.length).toBe(1);    

    var rel = cy.rel().setTypes(['TO']);

    pattern.addPatternElementChain(null, nodeC, rel, nodeA);

    // still have 1 pattern part, original A->B->C->A
    expect(pattern.patternParts.length).toBe(1);    

    var cypher = pattern.toCypherString();
    var expectedCypher = '(a:A)-[:TO]->(b:B)-[:TO]->(c:C)-[:TO]->(a:A)';
    expect(cypher).toEqual(expectedCypher);

});

test ('Get variables set', () => {
    var pattern = buildPattern(); 
    var variables = pattern.getVariableSet();

    expect(variables.size).toBe(5);
    expect(variables.has('person')).toBe(true);
    expect(variables.has('acted_in')).toBe(true);
    expect(variables.has('movie')).toBe(true);
    expect(variables.has('directed')).toBe(true);
    expect(variables.has('director')).toBe(true);
});

test('Get all node patterns', () => {
    var pattern = buildPattern(); 
    var allNodePatterns = pattern.getAllNodePatterns();
    expect(allNodePatterns.length).toBe(3);

    expect(allNodePatterns[0].variable).toStrictEqual('person');
    expect(allNodePatterns[0].nodeLabels).toStrictEqual(['Person']);

    expect(allNodePatterns[1].variable).toStrictEqual('movie');
    expect(allNodePatterns[1].nodeLabels).toStrictEqual(['Movie']);

    expect(allNodePatterns[2].variable).toStrictEqual('director');
    expect(allNodePatterns[2].nodeLabels).toStrictEqual(['Director']);

});

test('Get all relationship patterns', () => {
    var pattern = buildPattern(); 
    var allRelationshipPatterns = pattern.getAllRelationshipPatterns();
    expect(allRelationshipPatterns.length).toBe(2);

    expect(allRelationshipPatterns[0].variable).toStrictEqual('acted_in');
    expect(allRelationshipPatterns[0].types).toStrictEqual(['ACTED_IN']);

    expect(allRelationshipPatterns[1].variable).toStrictEqual('directed');
    expect(allRelationshipPatterns[1].types).toStrictEqual(['DIRECTED']);
});

test('Get all node rel node patterns', () => {
    var pattern = buildPattern(); 
    var allNodeRelNodePatterns = pattern.getAllNodeRelNodePatterns();
    expect(allNodeRelNodePatterns.length).toBe(2);

    // 1
    expect(allNodeRelNodePatterns[0].startNodePattern.variable).toStrictEqual('person');
    expect(allNodeRelNodePatterns[0].startNodePattern.nodeLabels).toStrictEqual(['Person']);

    expect(allNodeRelNodePatterns[0].relationshipPattern.variable).toStrictEqual('acted_in');
    expect(allNodeRelNodePatterns[0].relationshipPattern.types).toStrictEqual(['ACTED_IN']);

    expect(allNodeRelNodePatterns[0].endNodePattern.variable).toStrictEqual('movie');
    expect(allNodeRelNodePatterns[0].endNodePattern.nodeLabels).toStrictEqual(['Movie']);

    // 2
    expect(allNodeRelNodePatterns[1].startNodePattern.variable).toStrictEqual('movie');
    expect(allNodeRelNodePatterns[1].startNodePattern.nodeLabels).toStrictEqual(['Movie']);

    expect(allNodeRelNodePatterns[1].relationshipPattern.variable).toStrictEqual('directed');
    expect(allNodeRelNodePatterns[1].relationshipPattern.types).toStrictEqual(['DIRECTED']);

    expect(allNodeRelNodePatterns[1].endNodePattern.variable).toStrictEqual('director');
    expect(allNodeRelNodePatterns[1].endNodePattern.nodeLabels).toStrictEqual(['Director']);
});

test('Testing nodePattern difference', () => {
    
    var personNode = cy.node().setKey('person').var('person').labels(['Person']);
    var movieNode = cy.node().setKey('movie').var('movie').labels(['Movie']);

    expect(patternsEqualByKey(personNode, personNode)).toBe(true);

    var path1 = cy.path().node(personNode);
    var path2 = cy.path().node(personNode)
        .link(
            cy.link()
                .rel(cy.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']))
                .node(movieNode)
        );

    var pattern1 = cy.pattern().addPart(
                        cy.part().path(path1)
                    );

    var pattern2 = cy.pattern().addPart(
                        cy.part().path(path2)
                    );

    var diff = nodePatternArrayDifference(pattern1.getAllNodePatterns(), pattern2.getAllNodePatterns());
    expect(diff.inLeftOnly.length).toBe(0);    
    expect(diff.inRightOnly.length).toBe(1);
    expect(diff.inRightOnly[0].variable).toBe('movie');
});

test('Testing nodeRelNodePattern difference', () => {
    
    var personNode = cy.node().setKey('person').var('person').labels(['Person']);
    var movieNode = cy.node().setKey('movie').var('movie').labels(['Movie']);

    var path1 = cy.path().node(personNode);
    var path2 = cy.path().node(personNode)
        .link(
            cy.link()
                .rel(cy.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']))
                .node(movieNode)
        );

    var pattern1 = cy.pattern().addPart(
                        cy.part().path(path1)
                    );

    var pattern2 = cy.pattern().addPart(
                        cy.part().path(path2)
                    );

    expect(nodeRelNodePatternsEqualByKey(pattern2,pattern2)).toBe(true);

    var diff = nodeRelNodePatternArrayDifference(pattern1.getAllNodeRelNodePatterns(), pattern2.getAllNodeRelNodePatterns());
    expect(diff.inLeftOnly.length).toBe(0);
    expect(diff.inRightOnly.length).toBe(1);
    //console.log('diff: ', diff);

    expect(diff.inRightOnly[0].startNodePattern.variable).toBe('person');
    expect(diff.inRightOnly[0].relationshipPattern.variable).toBe('acted_in');
    expect(diff.inRightOnly[0].endNodePattern.variable).toBe('movie');
});

test('Remove from variable scope', () => {

    var scope = new CypherVariableScope();
    const cy1 = new CypherStatementBuilder({
        variableScope: scope
    });
    
    var personNode1 = cy1.node().setKey('person').var('person').labels(['Person']);
    var personNode2 = cy1.node().setKey('person').var('person').labels(['Person']);
    var movieNode = cy1.node().setKey('movie').var('movie').labels(['Movie']);

    var path1 = cy1.path().node(personNode1)
    var path2 = cy1.path().node(personNode2)
        .link(
            cy1.link()
                .rel(cy1.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']))
                .node(movieNode)
        );

    var pattern1 = cy1.pattern().addPart(
                        cy1.part().path(path1)
                    );

    var pattern2 = cy1.pattern().addPart(
                        cy1.part().path(path2)
                    );

    var variables = scope.getVariableSet();
    expect(variables.has('person')).toBe(true);
    expect(variables.has('movie')).toBe(true);
    expect(variables.has('acted_in')).toBe(true);

    pattern2.removeFromVariableScope();

    variables = scope.getVariableSet();
    expect(variables.has('person')).toBe(true);
    expect(variables.has('movie')).toBe(false);
    expect(variables.has('acted_in')).toBe(false);

});

test('Set variable scope', () => {

    var scope1 = new CypherVariableScope();
    var scope2 = new CypherVariableScope();
    const cy1 = new CypherStatementBuilder({
        variableScope: scope1
    });
    
    var personNode = cy1.node().setKey('person').var('person').labels(['Person']);
    var movieNode = cy1.node().setKey('movie').var('movie').labels(['Movie']);

    var path = cy1.path().node(personNode)
        .link(
            cy1.link()
                .rel(cy1.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']))
                .node(movieNode)
        );

    var pattern = cy1.pattern().addPart(cy1.part().path(path));

    var variables = scope1.getVariableSet();
    expect(variables.has('person')).toBe(true);
    expect(variables.has('movie')).toBe(true);
    expect(variables.has('acted_in')).toBe(true);

    pattern.setVariableScope(scope2);
    variables = scope2.getVariableSet();
    expect(variables.has('person')).toBe(true);
    expect(variables.has('movie')).toBe(true);
    expect(variables.has('acted_in')).toBe(true);

    expect(scope1.getVariableSet().size).toBe(0);

});

test('Set variable scope - no initial variable scope', () => {

    var scope1 = new CypherVariableScope();
    const cy1 = new CypherStatementBuilder();
    
    var personNode = cy1.node().setKey('person').var('person').labels(['Person']);
    var movieNode = cy1.node().setKey('movie').var('movie').labels(['Movie']);

    var path = cy1.path().node(personNode)
        .link(
            cy1.link()
                .rel(cy1.rel().setKey('acted_in').var('acted_in').setTypes(['ACTED_IN']))
                .node(movieNode)
        );

    var pattern = cy1.pattern().addPart(cy1.part().path(path));

    pattern.setVariableScope(scope1);
    var variables = scope1.getVariableSet();
    expect(variables.has('person')).toBe(true);
    expect(variables.has('movie')).toBe(true);
    expect(variables.has('acted_in')).toBe(true);

});

test('shortest path in pattern part', () => {

    var path = cy.path()
    .node('person', ['Person'])
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'])
            .node('movie', ['Movie'])
    )

    var patternPart = new PatternPart({
        shortestPath: 'ANY',
        shortestPathIsFunction: false,
        pathPatterns: [path]
    })

    let cypher = patternPart.toCypherString();
    // console.log('cypher: ', cypher);
    expect(cypher).toEqual('ANY (person:Person)-[acted_in:ACTED_IN]->(movie:Movie)')

    patternPart = new PatternPart({
        shortestPath: 'shortestpath',
        shortestPathIsFunction: true,
        pathPatterns: [path]
    })

    cypher = patternPart.toCypherString();
    // console.log('cypher: ', cypher);
    expect(cypher).toEqual('shortestpath((person:Person)-[acted_in:ACTED_IN]->(movie:Movie))')

});
