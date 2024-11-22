
import { 
    Pattern,
    NodePattern, 
    RelationshipPattern, 
    RELATIONSHIP_DIRECTION,
    PatternElementChainLink,
    PathPattern,
    PatternPart
} from '../../../../dataModel/cypherPattern';
import { CypherPatternCanvasDataProvider } from './cypherPatternCanvasDataProviderRefactor';

var getCypherPattern = function () {
    var startNodePattern = new NodePattern({
        key: 'person',
        variable: 'person',
        nodeLabels: ['Person'],
        propertyMap: {
            name: 'Keanu'
        }
    });

    var endNodePattern = new NodePattern({
        key: 'movie',
        variable: 'movie',
        nodeLabels: ['Movie']
    })

    var relationshipPattern = new RelationshipPattern({
        key: 'acted_in',
        types: ['ACTED_IN'],
        direction: RELATIONSHIP_DIRECTION.RIGHT
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
        pathPatterns: [pathPattern]
    })

    var pattern = new Pattern({
        patternParts: [patternPart]
    })
    
    return pattern;
}

test('make pattern', () => {
    var pattern = getCypherPattern();
    var dataProvider = new CypherPatternCanvasDataProvider();
    dataProvider.setCypherPattern(pattern);
    expect(dataProvider.graphData).not.toBeNull();
    expect(dataProvider.graphDataView).not.toBeNull();
});

test('check pattern graph data', () => {
    var pattern = getCypherPattern();
    var dataProvider = new CypherPatternCanvasDataProvider();
    dataProvider.setCypherPattern(pattern);

    var graphData = dataProvider.data().getGraphData();
    var nodes = graphData.getNodeArray();
    expect(nodes.length).toBe(2);
    //console.log('nodes: ', nodes);

    expect(nodes[0].labels).toStrictEqual(['NodePattern']);
    expect(nodes[0].properties.nodeLabels.value).toStrictEqual(['Person']);
    expect(nodes[1].properties.nodeLabels.value).toStrictEqual(['Movie']);
    expect(nodes[0].properties.variable.value).toBe('person');
    expect(nodes[1].properties.variable.value).toBe('movie');

    var relationships = graphData.getRelationshipArray();
    // 3 = 1 for the relationship between Person and Movie, 
    //   2 for attaching Person NodePattern and Movie NodePattern to graph doc
    expect(relationships.length).toBe(3);

    expect(relationships[2].type).toEqual('RELATIONSHIP_PATTERN');
    expect(relationships[2].properties.types.value).toStrictEqual(['ACTED_IN']);
    expect(relationships[2].properties.variable.value).toBeUndefined();
});

test('check pattern graph data view', () => {
    var pattern = getCypherPattern();
    var dataProvider = new CypherPatternCanvasDataProvider();
    dataProvider.setCypherPattern(pattern);

    var graphDataView = dataProvider.data().getGraphDataView();
    var nodes = graphDataView.getNodeArray();
    expect(nodes.length).toBe(2);

    expect(nodes[0].node.labels).toStrictEqual(['NodePattern']);
    expect(nodes[0].node.properties.nodeLabels.value).toStrictEqual(['Person']);
    expect(nodes[1].node.properties.nodeLabels.value).toStrictEqual(['Movie']);
    expect(nodes[0].node.properties.variable.value).toBe('person');
    expect(nodes[1].node.properties.variable.value).toBe('movie');

    var relationships = graphDataView.getRelationshipArray();
    expect(relationships.length).toBe(1);

    expect(relationships[0].relationship.type).toEqual('RELATIONSHIP_PATTERN');
    expect(relationships[0].relationship.properties.types.value).toStrictEqual(['ACTED_IN']);
    expect(relationships[0].relationship.properties.variable.value).toBeUndefined();
});
