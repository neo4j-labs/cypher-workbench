
import { 
    PathPattern, 
    PatternPart, 
    PatternElementChainLink,
    NodePattern, 
    RelationshipPattern,
    VariableValue,
    RELATIONSHIP_DIRECTION,
    getValueCypherString
} from '../cypherPattern';
import { 
    ColumnSource, 
    GraphDestination
} from './dataMapping';
import {
    SetItem
} from './cypherDataInstructions';

export const renderCypher = ({cypherDataSource, transformationSteps, dataInstructions }) => {

    // get source
    var cypher = cypherDataSource.toCypher();

    // do transformations next
    if (transformationSteps && transformationSteps.length > 0) {
        cypher += '\n' + transformationSteps.map(x => x.toCypher()).join('\n');
    }

    // do dataInstructions
    if (dataInstructions && dataInstructions.length > 0) {
        cypher += '\n' + dataInstructions.map(x => x.toCypher()).join('\n');
    }
    return cypher;
}

export const getSetItem = ({sourceVariable, destinationVariable, dataMapping}) => {
    const { key, value } = getSetKeyValue({
        mapping: dataMapping,
        sourceVariable: null, // we will handle it in this function instead
        destinationVariable});

    //console.log('value: ', value);
    var valueStr = getValueCypherString(value);
    //console.log('valueStr: ', valueStr);
    const leftExpr = (destinationVariable) ? `${destinationVariable}.${valueStr}` : valueStr;
    const rightExpr = (sourceVariable) ? `${sourceVariable}.${key}` : key;
    var setItem = new SetItem({
        leftExpr,
        operator: '=',
        rightExpr 
    });
    return setItem;
}

const getSetKeyValue = ({mapping, sourceVariable}) => {
    var key = mapping.destination;
    var value = mapping.source;

    //console.log('value: ', value);

    if (mapping.destination instanceof GraphDestination) {
        key = mapping.destination.propertyDefinition.name
    } 

    if (mapping.source instanceof ColumnSource) {
        value = (sourceVariable) 
            ? `${sourceVariable}.${mapping.source.columnDefinition.name}`
            : `${mapping.source.columnDefinition.name}`;
        value = new VariableValue({ value });
    } 
    return { key, value };
}

export const getNodePatternPart = ({sourceVariable, destinationVariable, nodeLabel, dataMappings}) => {

    var propertyMap = {}
    dataMappings.map(mapping => {
        const { key, value } = getSetKeyValue({mapping, sourceVariable, destinationVariable});
        if (key) {
            propertyMap[key] = value;
        }
    });
    
    var startNodePattern = new NodePattern({
        key: destinationVariable,
        variable: destinationVariable,
        nodeLabels: [nodeLabel],
        propertyMap
    });

    var pathPattern = new PathPattern({
        nodePattern: startNodePattern
    });

    var patternPart = new PatternPart({
        pathPatterns: [pathPattern]
    });

    return patternPart;
}

export const getRelationshipPatternPart = ({sourceVariable, destinationVariable, relationshipType}) => {
    var startNodePattern = new NodePattern({
        key: sourceVariable,
        variable: sourceVariable
    });

    var endNodePattern = new NodePattern({
        key: destinationVariable,
        variable: destinationVariable
    });

    var relationshipPattern = new RelationshipPattern({
        key: relationshipType,
        types: [relationshipType],
        direction: RELATIONSHIP_DIRECTION.RIGHT
    });

    var chain = new PatternElementChainLink({
        relationshipPattern: relationshipPattern,
        nodePattern: endNodePattern
    });

    var pathPattern = new PathPattern({
        nodePattern: startNodePattern,
        patternElementChain: [chain]        
    });

    var patternPart = new PatternPart({
        pathPatterns: [pathPattern]
    });

    return patternPart;
}
