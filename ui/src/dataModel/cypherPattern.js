
import isEqual from 'lodash/isEqual';
import differenceWith from 'lodash/differenceWith';
import difference from 'lodash/difference';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import { smartQuote } from './helper';

export const RELATIONSHIP_DIRECTION = {
    NONE: 'none',
    RIGHT: 'right',
    LEFT: 'left'
}

export const DEBUG_VAR_PREFIX = '_gd_';

// modified from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
// creates a new set that is the union of setA and setB
const union = (setA, setB) => {
    if (setA && setB) {
        let _union = new Set(setA)
        for (let elem of setB) {
            _union.add(elem)
        }
        return _union;
    } else if (setA) {
        return setA;
    } else if (setB) {
        return setB;
    } else {
        return new Set();
    }
}

const tail = (array) => (array && array.length && array.length > 0) ? array[array.length-1] : null;

// adds setB to setA, modifying setA in the process
const addSets = (setA, setB) => {
    if (!setA) {
        setA = new Set();
    }    
    if (setB) {
        for (let elem of setB) {
            setA.add(elem)
        }
    }
    return setA;
}

const nonNullSet = (item) => {
    if (item !== undefined && item !== null) {
        return new Set([item]);
    } else {
        return new Set();
    }
}

const getPropertyMapCypherString = (propertyMap) => {
    var str = '';
    if (propertyMap) {
        var keys = Object.keys(propertyMap);
        if (keys.length > 0) {
            var keyValuePairs = keys.map(key => {
                var value = propertyMap[key];
                var valueStr = getValueCypherString(value);
                var key = (key && key.indexOf(' ') !== -1) ? `\`${key}\`` : key;
                return `${key}:${valueStr}`;
            });
            str += keyValuePairs.join(', ');
            str = ` {${str}}`;
        }
    }
    return str;
}

export const getValueCypherString = (value) => {
    var valueStr;
    if (value instanceof VariableValue) {
        valueStr = value.value;
    } else {
        valueStr = (typeof(value) === 'string') ? `"${value}"`: value;
    }
    return valueStr;
}

export const patternsEqualByKey = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;
    return (a.key === b.key);
}

export const patternsEqualByKeyAndNodeLabels = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;
    return (a.key === b.key
        && isEqual(a.getNodeLabels().sort(), b.getNodeLabels().sort()));
}

export const patternsEqualByKeyAndRelTypes = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;
    return (a.key === b.key
        && isEqual(a.getRelationshipTypes().sort(), b.getRelationshipTypes().sort()));
}

export const nodeRelNodePatternsEqualByKey = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;

    var startResult = patternsEqualByKey(a.startNodePattern, b.startNodePattern);
    var relResult = patternsEqualByKey(a.relationshipPattern, b.relationshipPattern);
    var endResult = patternsEqualByKey(a.endNodePattern, b.endNodePattern);

    return (startResult && relResult && endResult);
}

export const nodeRelNodePatternsEqualByKeyNodeLabelsAndRelTypes = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;

    var startResult = patternsEqualByKeyAndNodeLabels(a.startNodePattern, b.startNodePattern);
    var relResult = patternsEqualByKeyAndRelTypes(a.relationshipPattern, b.relationshipPattern);
    var endResult = patternsEqualByKeyAndNodeLabels(a.endNodePattern, b.endNodePattern);

    return (startResult && relResult && endResult);
}

export const nodePatternArrayDifference = (array1, array2) => {
    return {
        inLeftOnly: differenceWith(array1, array2, patternsEqualByKeyAndNodeLabels),
        inRightOnly: differenceWith(array2, array1, patternsEqualByKeyAndNodeLabels)
    }        
}

export const nodeRelNodePatternArrayDifference = (array1, array2) => {
    return {
        inLeftOnly: differenceWith(array1, array2, nodeRelNodePatternsEqualByKeyNodeLabelsAndRelTypes),
        inRightOnly: differenceWith(array2, array1, nodeRelNodePatternsEqualByKeyNodeLabelsAndRelTypes)
    }
}

export const cloneNodePattern = (nodePattern) => {
    if (nodePattern) {
        return new NodePattern({
            ...nodePattern,
            nodeLabels: (nodePattern.nodeLabels) ? nodePattern.nodeLabels.slice() : [],
            propertyMap: (nodePattern.propertyMap) ? { ...nodePattern.propertyMap } : {}
            // ignore displayNode
        })
    } else {
        return null;
    }
}

export const cloneRelationshipPattern = (relationshipPattern) => {
    if (relationshipPattern) {
        return new RelationshipPattern({
            ...relationshipPattern,
            types: (relationshipPattern.types) ? relationshipPattern.types.slice() : [],
            propertyMap: (relationshipPattern.propertyMap) ? { ...relationshipPattern.propertyMap } : {}
            // ignore the rest
        })
    } else {
        return null;
    }
}

// we are going to keep it simple and just add a new variable based on array length
const generateVariable = (generatedVariables) => {
    var variable = `v${generatedVariables.length + 1}`;
    generatedVariables.push(variable);
    return variable;
}

export class KeyedItem {
    constructor (properties) {
        properties = properties || {};
        var { key } = properties;
        this.key = key;
    }

    setKey = (key) => {
        this.key = key;
        return this;
    }

    areKeysEqual = (item) => {
        if (item && this.key && item.key) {
            return this.key === item.key;
        } else {
            return false;
        }
    }    
}

export class VariableValue {
    constructor (properties) {
        properties = properties || {};
        var { value } = properties;
        this.value = value;
    }
}

export class VariableContainer extends KeyedItem {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { variable, variableScope } = properties;
        this.variable = variable;
        this.variableScope = variableScope;

        this.addToVariableScope();
    }

    var = (variable) => {
        this.setVariable(variable);
        return this;
    }

    getVariable () { return this.variable; }

    setVariable (variable) {
        this.removeFromVariableScope();
        this.variable = variable;
        this.addToVariableScope();
    }

    addToVariableScope () {
        if (this.variableScope && this.variable) {
            this.variableScope.addVariable(this.variable, this);
        }
    }

    setVariableScope (variableScope) {
        this.removeFromVariableScope();
        this.variableScope = variableScope;
        this.addToVariableScope();
    }

    removeFromVariableScope () {
        if (this.variableScope) {
            this.variableScope.removeItem(this);
        }
    }

    getVariableSet () { return nonNullSet(this.variable); }
}

export class NodePattern extends VariableContainer {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { nodeLabels, propertyMap, displayNode } = properties;
        this.nodeLabels = (nodeLabels) ? nodeLabels : [];
        this.propertyMap = (propertyMap) ? propertyMap : {};
        this.displayNode = displayNode;
    }

    labels = (nodeLabels) => {
        this.nodeLabels = nodeLabels;
        return this;
    }

    getPropertyKeys = () => Object.keys(this.propertyMap);

    setDisplayNode = (displayNode) => this.displayNode = displayNode;

    matches = (nodePatternProperties) => {
        if (nodePatternProperties) {
            var matchKeys = Object.keys(nodePatternProperties);
            var numMatchesRequired = matchKeys.length;
            var numMatches = matchKeys.filter(key => {
                if (key === 'key' || key === 'variable') {
                    return nodePatternProperties[key] === this[key]
                } else if (key === 'nodeLabels') {
                    var diff = difference(nodePatternProperties[key], this[key]);
                    return diff.length === 0;
                } else if (key === 'propertyMap') {
                    var propKeys = Object.keys(nodePatternProperties[key]);
                    var numPropMatchesRequired = propKeys.length;
                    var numPropMatches = propKeys.filter(propKey => {
                        return isEqual(nodePatternProperties[key][propKey], this.propertyMap[propKey]);
                    }).length;
                    return numPropMatchesRequired === numPropMatches;
                } else {
                    return isEqual(nodePatternProperties[key], this[key]);
                }
            }).length;
            return numMatchesRequired === numMatches;
        }
        return false;
    }

    toCypherString = (config) => {
        config = config || {};

        const validationMode = (config.validationMode) ? true : false;
        const { addMissingVars, variableScope } = config;

        var str = '';
        var variable = this.getVariable();
        if (config.overrideNodePatternVariable) {
            variable = config.overrideNodePatternVariable;
        } else if (!variable && addMissingVars && variableScope) {
            var associatedVariable = variableScope.getAssociatedItemVariable(this);
            if (associatedVariable) {
                variable = associatedVariable;
            } else {
                variable = variableScope.getNextVar(DEBUG_VAR_PREFIX);
                variableScope.addVariable(variable, this);
            }
        }

        if (variable) {
            variable = (variable && variable.indexOf && variable.indexOf(' ') !== -1) ? `\`${variable}\`` : variable;
            str += variable;
        }
        if (this.nodeLabels && this.nodeLabels.length > 0) {
            var nodeLabelStrings = this.nodeLabels.map(x => 
                (x && x.indexOf && x.indexOf(' ') !== -1) ? `\`${x}\`` : x
            )
            str += `:${nodeLabelStrings.join(':')}`;
        }
        if (!validationMode) {
            str += getPropertyMapCypherString(this.propertyMap);
        }
        return `(${str})`;
    }

    getNodeLabels = () => (this.nodeLabels) ? this.nodeLabels.slice(0) : [];
    setNodeLabels = (nodeLabels) => {
        if (nodeLabels && nodeLabels.filter) {
            this.nodeLabels = nodeLabels.filter(x => x); // get rid of all null of blank node labels
        } else {
            this.nodeLabels = [];
        }
    }
} 

export class RelationshipPattern extends VariableContainer {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { types, direction, propertyMap,
                variableLengthStart, variableLengthEnd,
                displayRelationship } = properties;
        this.types = (types) ? types : [];
        this.direction = (direction) ? direction : RELATIONSHIP_DIRECTION.RIGHT;
        this.propertyMap = (propertyMap) ? propertyMap : {};
        this.variableLengthStart = variableLengthStart;
        this.variableLengthEnd = variableLengthEnd;
        this.displayRelationship = displayRelationship;
    }

    getPropertyKeys = () => Object.keys(this.propertyMap);

    dir = (direction) => {
        this.direction = direction;
        return this;
    }

    setTypes = (types) => {
        this.types = types;
        return this;
    }

    setDisplayRelationship = (displayRelationship) => this.displayRelationship = displayRelationship;

    reverse = () => {
        if (this.direction !== RELATIONSHIP_DIRECTION.NONE) {
            this.direction = (this.direction === RELATIONSHIP_DIRECTION.RIGHT) 
                ? RELATIONSHIP_DIRECTION.LEFT
                : RELATIONSHIP_DIRECTION.RIGHT;
        }
    }

    toCypherString = (config) => {
        config = config || {};
        const validationMode = (config.validationMode) ? true : false;
        const { addMissingVars, variableScope } = config;

        var str = '';

        var variable = this.getVariable();
        if (config.overrideRelationshipPatternVariable) {
            variable = config.overrideRelationshipPatternVariable;
        } else if (!variable && addMissingVars && variableScope) {
            var associatedVariable = variableScope.getAssociatedItemVariable(this);
            if (associatedVariable) {
                variable = associatedVariable;
            } else {
                variable = variableScope.getNextVar(DEBUG_VAR_PREFIX);
                variableScope.addVariable(variable, this);
            }
        }

        if (variable) {
            variable = (variable && variable.indexOf && variable.indexOf(' ') !== -1) ? `\`${variable}\`` : variable;
            str += variable;
        }
        if (this.types) {
            var types = this.types.filter(type => type);
            if (types.length > 0) {
                types = this.types.map(x => 
                    (x && x.indexOf && x.indexOf(' ') !== -1) ? `\`${x}\`` : x
                )
                str += `:${types.join('|')}`;
            }
        }

        if (this.variableLengthStart) {
            str += this.variableLengthStart;
        }
        if (this.variableLengthEnd) {
            str += `..${this.variableLengthEnd}`;
        }

        if (!validationMode) {
            str += getPropertyMapCypherString(this.propertyMap);
        }

        if (this.direction === RELATIONSHIP_DIRECTION.LEFT) {
            str = `<-[${str}]-`;
        } else if (this.direction === RELATIONSHIP_DIRECTION.RIGHT) {
            str = `-[${str}]->`;
        } else {
            str = `-[${str}]-`;
        }
        return str;
    }

    getRelationshipTypes = () => (this.types) ? this.types.slice(0) : [];
}

export class PatternElementChainLink extends KeyedItem {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { relationshipPattern, nodePattern } = properties;
        this.relationshipPattern = relationshipPattern;
        this.nodePattern = nodePattern;
    }

    rel = (relationshipPatternOrVariable, types, propertyMap) => {
        if (relationshipPatternOrVariable instanceof RelationshipPattern) {
            this.relationshipPattern = relationshipPatternOrVariable;
        } else {
            this.relationshipPattern = new RelationshipPattern({key: relationshipPatternOrVariable, variable: relationshipPatternOrVariable, types, propertyMap});
        }
        return this;
    }

    node = (nodePatternOrVariable, nodeLabels, propertyMap) => {
        if (nodePatternOrVariable instanceof NodePattern) {
            this.nodePattern = nodePatternOrVariable;
        } else {
            this.nodePattern = new NodePattern({key: nodePatternOrVariable, variable: nodePatternOrVariable, nodeLabels, propertyMap});
        }
        return this;
    }

    left = () => {
        this.relationshipPattern.direction = RELATIONSHIP_DIRECTION.LEFT;
        return this;
    }

    getVariableAndPropertyKeys = (config) => {

        var nodePattern = { variable: null, propertyKeys: [] };
        var relationshipPattern = { variable: null, propertyKeys: [] };
        if (this.nodePattern) {
            var nodePatternVariable = this.nodePattern.getVariable();
            var overrideNodePatternVariable = null;
            var nodePatternPropertyKeys = this.nodePattern.getPropertyKeys();
            if (!nodePatternVariable && nodePatternPropertyKeys.length > 0) {
                overrideNodePatternVariable = generateVariable(config.generatedVariables);
                nodePatternVariable = overrideNodePatternVariable;
            }
            nodePattern = {
                variable: nodePatternVariable,
                overrideNodePatternVariable,
                propertyKeys: nodePatternPropertyKeys
            }
        }

        if (this.relationshipPattern) {
            var relationshipPatternVariable = this.relationshipPattern.getVariable();
            var overrideRelationshipPatternVariable = null;
            var relationshipPatternPropertyKeys = this.relationshipPattern.getPropertyKeys();
            if (!relationshipPatternVariable && relationshipPatternPropertyKeys.length > 0) {
                overrideRelationshipPatternVariable = generateVariable(config.generatedVariables);
                relationshipPatternVariable = overrideRelationshipPatternVariable;
            }
            relationshipPattern = {
                variable: relationshipPatternVariable,
                overrideRelationshipPatternVariable,
                propertyKeys: relationshipPatternPropertyKeys
            }
        }

        return {
            nodePattern,
            relationshipPattern
        }
    }

    setVariableScope = (variableScope) => {
        if (this.nodePattern) {
            this.nodePattern.setVariableScope(variableScope);
        }
        if (this.relationshipPattern) {
            this.relationshipPattern.setVariableScope(variableScope);    
        }
    }

    removeFromVariableScope = () => {
        if (this.nodePattern) {
            this.nodePattern.removeFromVariableScope();
        }
        if (this.relationshipPattern) {
            this.relationshipPattern.removeFromVariableScope();    
        }
    }

    findNodePattern = (nodePatternProperties) => {
        if (this.nodePattern && this.nodePattern.matches(nodePatternProperties)) {
            return this.nodePattern;
        } else {
            return null;
        }
    }

    includesNodePattern = (nodePattern) => {
        var nodePatternResult = true;
        if (this.nodePattern) {
            nodePatternResult = this.nodePattern.areKeysEqual(nodePattern);
        } else if (nodePattern) {
            nodePatternResult = false;
        }
        return nodePatternResult;
    }

    includesPatternElementChain = (patternElementChain) => {
        var nodePatternResult = true;
        var relationshipPatternResult = true;

        if (patternElementChain) {
            if (this.relationshipPattern) {
                relationshipPatternResult = this.relationshipPattern.areKeysEqual(patternElementChain.relationshipPattern)                
            } else if (patternElementChain.relationshipPattern) {
                relationshipPatternResult = false;
            }
            nodePatternResult = this.includesNodePattern(patternElementChain.nodePattern);

            return nodePatternResult && relationshipPatternResult;
        } else {
            return false;
        }
    }

    toCypherString = (config) => {
        var str = '';
        if (this.relationshipPattern) {
            str += this.relationshipPattern.toCypherString(config);
        }
        if (this.nodePattern) {
            str += this.nodePattern.toCypherString(config);
        }
        return str;
    }

    getVariableSet = () => {
        var relVars = (this.relationshipPattern) ? this.relationshipPattern.getVariableSet() : new Set();
        var nodeVars = (this.nodePattern) ? this.nodePattern.getVariableSet() : new Set();
        return union(relVars, nodeVars);
    }
}

export class PathPattern extends KeyedItem {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { nodePattern, patternElementChain } = properties;
        this.nodePattern = nodePattern;
        this.patternElementChain = (patternElementChain) ? patternElementChain : [];
    }

    node (nodePatternOrVariable, nodeLabels, propertyMap) {
        if (nodePatternOrVariable instanceof NodePattern) {
            this.nodePattern = nodePatternOrVariable;    
        } else {
            this.nodePattern = new NodePattern({key: nodePatternOrVariable, variable: nodePatternOrVariable, nodeLabels, propertyMap});
        }
        return this;
    }

    addStartLink (patternElementChainLink) {
        this.patternElementChain.unshift(patternElementChainLink);
        return this;
    }

    mergeLinks (pathPattern) {
        pathPattern.patternElementChain.map(chainLink => this.link(chainLink));
    }

    link (patternElementChainLink) {
        this.patternElementChain.push(patternElementChainLink);
        return this;
    }

    setVariableScope = (variableScope) => {
        if (this.nodePattern) {
            this.nodePattern.setVariableScope(variableScope);
        }
        if (this.patternElementChain) {
            this.patternElementChain.map(chainLink => chainLink.setVariableScope(variableScope));
        }
    }

    removeFromVariableScope = () => {
        if (this.nodePattern) {
            this.nodePattern.removeFromVariableScope();
        }
        if (this.patternElementChain) {
            this.patternElementChain.map(chainLink => chainLink.removeFromVariableScope());    
        }
    }

    isEmpty = () => this.nodePattern === null && (this.patternElementChain === null || this.patternElementChain.length === 0)

    includesPathPattern = (pathPattern) => {
        if (pathPattern) {
            var match;
            var nodePatternResult = true;
            var patternElementChainResult = true;
            if (this.nodePattern) {
                var result1 = this.nodePattern.areKeysEqual(pathPattern.nodePattern);
                var result2 = true;
                if (pathPattern.patternElementChain) {
                    match = this.patternElementChain.find(x => 
                        x.includesNodePattern(pathPattern.nodePattern));
                    result2 = (match !== undefined);
                }
                //console.log("result1: " + result1);
                //console.log("result2: " + result2);
                nodePatternResult = result1 || result2;
            }
            if (this.patternElementChain) {
                //console.log("this.patternElementChain is not null");
                if (pathPattern.patternElementChain) {
                    //console.log("pathPattern.patternElementChain is not null");
                    if (pathPattern.patternElementChain.length > 0) {
                        match = pathPattern.patternElementChain.find(x => {
                            //console.log("x: ", x);
                            return this.patternElementChain.find(y => {
                                //console.log("y: ", y);
                                return x.includesPatternElementChain(y);
                            });
                        });
                        //console.log('match: ', match);
                        patternElementChainResult = (match !== undefined);
                    }
                } 
            } else {
                if (pathPattern.patternElementChain) {
                    patternElementChainResult = false;
                }
            }
            //console.log("nodePatternResult: " + nodePatternResult);
            //console.log("patternElementChainResult: " + patternElementChainResult);
            return nodePatternResult && patternElementChainResult;
        } else {
            return false;
        }
    }

    findNodePattern = (nodePatternProperties) => {
        if (this.nodePattern && this.nodePattern.matches(nodePatternProperties)) {
            return this.nodePattern;
        } else if (this.patternElementChain && this.patternElementChain.length > 0) {
            for (var i = 0; i < this.patternElementChain.length; i++) {
                var chainLink = this.patternElementChain[i];
                var nodePattern = chainLink.findNodePattern(nodePatternProperties);
                if (nodePattern) {
                    return nodePattern;
                }
            }
        }
        return null;
    }

    findAllNodePatternTriples = (nodePatternProperties) => {
        var allTriples = [];
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            var startNodePattern = this.nodePattern;

            this.patternElementChain.map(chainLink => {
                var startMatches = startNodePattern.matches(nodePatternProperties);
                var nodePattern = chainLink.findNodePattern(nodePatternProperties);
                if (startMatches || nodePattern) {
                    allTriples.push({
                        startNodePattern: startNodePattern,
                        relationshipPattern: chainLink.relationshipPattern,
                        endNodePattern: chainLink.nodePattern
                    });
                }
                startNodePattern = chainLink.nodePattern;
            });

        } else if (this.nodePattern && this.nodePattern.matches(nodePatternProperties)) {
            allTriples.push({
                startNodePattern: this.nodePattern,
                relationshipPattern: null,
                endNodePattern: null
            });
        }

        return allTriples;
    }

    removeNodePattern (nodePattern, variableScope) {
        var captureStrandedChain = false;

        if (this.nodePattern && this.nodePattern.key === nodePattern.key) {
            this.nodePattern = null;
            if (variableScope) {
                variableScope.removeItem(nodePattern);
            }

            if (this.patternElementChain && this.patternElementChain.length > 0) {
                var chainLink = this.patternElementChain.splice(0,1)[0];
                //console.log('chainLink: ', chainLink);
                this.nodePattern = chainLink.nodePattern;
                captureStrandedChain = true;
            } 
        }

        // say we have A->B->C->D->B->E->F and we delete B, then we need to collect
        //   C->D and E->F as stranded chains
        var strandedChain = [];        
        var strandedChains = [];
        //console.log("this.patternElementChain: ", this.patternElementChain);
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            for (var index = 0; index < this.patternElementChain.length; index++) {
                var chainPart = this.patternElementChain[index];
                //console.log('chainPart.nodePattern: ', chainPart.nodePattern);
                if (chainPart.nodePattern.key === nodePattern.key) {
                    //console.log('match nodePattern key');
                    if (strandedChain.length > 0) {
                        strandedChains.push(strandedChain);
                        strandedChain = [];
                    }

                    captureStrandedChain = true;
                    this.patternElementChain.splice(index,1);
                    index--;
                    if (variableScope) {
                        variableScope.removeItem(chainPart.relationshipPattern);
                        variableScope.removeItem(chainPart.nodePattern);
                    }
                } else if (captureStrandedChain) {
                    strandedChain.push(chainPart);

                    // after we get the first match, we need to remove everything else from the current chain
                    //  however, these will be re-built into patterns later, so we don't want to remove them 
                    //  from the variableScope
                    this.patternElementChain.splice(index,1);
                    index--;
                }
            }
            if (strandedChain.length > 0) {
                strandedChains.push(strandedChain);
            }
        }
        //console.log("strandedChains: ", strandedChains);
        return strandedChains;
    }

    removeRelationshipPattern (relationshipPattern, variableScope) {
        var captureStrandedChain = false;

        // say we have A-[R]->B-[X]->C-[R]->D-[R]->B-[X]->E-[R]->F and we delete [X], then we need to collect
        //   C-[R]->D and E-[R]->F as stranded chains
        var strandedChain = [];        
        var strandedChains = [];
        //console.log("this.patternElementChain: ", this.patternElementChain);
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            for (var index = 0; index < this.patternElementChain.length; index++) {
                var chainPart = this.patternElementChain[index];
                //console.log('chainPart.relationshipPattern: ', chainPart.relationshipPattern);
                if (chainPart.relationshipPattern.key === relationshipPattern.key) {
                    //console.log('match relationshipPattern key');
                    if (strandedChain.length > 0) {
                        strandedChains.push(strandedChain);
                    }
                    // need to push the current chainPart as the first item to the strandedChain
                    //   later in handleStrandedChainsAndCleanupPatternParts the nodePattern of the 
                    //   chainPart will be used as the startNode in a new chain -and-
                    //   the relationshipPattern will be thrown away
                    //console.log('pushing chainPart: ', chainPart);
                    strandedChain = [chainPart];   

                    captureStrandedChain = true;
                    this.patternElementChain.splice(index,1);
                    index--;
                    if (variableScope) {
                        variableScope.removeItem(chainPart.relationshipPattern);
                    }
                } else if (captureStrandedChain) {
                    strandedChain.push(chainPart);

                    // after we get the first match, we need to remove everything else from the current chain
                    //  however, these will be re-built into patterns later, so we don't want to remove them 
                    //  from the variableScope
                    this.patternElementChain.splice(index,1);
                    index--;
                }
            }
            if (strandedChain.length > 0) {
                strandedChains.push(strandedChain);
            }
        }
        //console.log("strandedChains: ", strandedChains);
        return strandedChains;
    }

    getAllNodePatterns = () => {
        var allNodePatterns = [];
        if (this.nodePattern) {
            allNodePatterns.push(this.nodePattern);
        }        
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            this.patternElementChain.map(chainLink => {
                if (chainLink.nodePattern) {
                    allNodePatterns.push(chainLink.nodePattern);
                }
            })
        }
        return allNodePatterns;
    }

    getNodeRelNodePattern = (relationshipPattern) => 
        this.getAllNodeRelNodePatterns().find(x => x.relationshipPattern.key === relationshipPattern.key)        

    getAllNodeRelNodePatterns = () => {
        var allNodeRelNodePatterns = [];
        var startNodePattern = (this.nodePattern) ? this.nodePattern : null;

        if (this.patternElementChain && this.patternElementChain.length > 0) {
            this.patternElementChain.map(chainLink => {
                if (chainLink.relationshipPattern && chainLink.nodePattern) {
                    allNodeRelNodePatterns.push({
                        startNodePattern: startNodePattern,
                        relationshipPattern: chainLink.relationshipPattern,
                        endNodePattern: chainLink.nodePattern
                    });
                    startNodePattern = chainLink.nodePattern;
                }
            });
        }
        return allNodeRelNodePatterns;
    }

    getAllRelationshipPatterns = () => {
        var allRelationshipPatterns = [];
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            this.patternElementChain.forEach(chainLink => {
                if (chainLink.relationshipPattern) {
                    allRelationshipPatterns.push(chainLink.relationshipPattern);
                }
            })
        }
        return allRelationshipPatterns;
    }
        
    toCypherString = (config) => {
        var str = '';
        if (this.nodePattern) {
            str += this.nodePattern.toCypherString(config);
        }
        if (this.patternElementChain) {
            str += this.patternElementChain.map(chainLink => chainLink.toCypherString(config)).join('');
        }
        //console.log('pathPattern: ', str);
        return str;
    }

    getDebugCypherSnippets = (options) => {
        //console.log('getDebugCypherSnippets: ', options);
        var snippets = [];

        var firstSnippet = '';
        var nodePattern = '()';
        if (this.nodePattern) {
            nodePattern = this.nodePattern.toCypherString(options);
            firstSnippet = nodePattern;
        }
        if (this.patternElementChain && this.patternElementChain.length > 0) {
            firstSnippet += ' // ';
            firstSnippet += this.patternElementChain.map(chainLink => chainLink.toCypherString(options)).join('');
        }
        snippets.push(firstSnippet);

        if (this.patternElementChain && this.patternElementChain.length > 0) {
            for (var i = 0; i < this.patternElementChain.length; i++) {
                var beforeSnippet = this.patternElementChain.slice(0, i)
                    .map(chainLink => chainLink.toCypherString(options)).join('');

                var afterSnippet = this.patternElementChain.slice(i + 1)
                    .map(chainLink => chainLink.toCypherString(options)).join('');

                var current = this.patternElementChain[i];
                var relSnippet = (current.relationshipPattern) ? current.relationshipPattern.toCypherString(options) : '-[]->'
                var nodeSnippet = (current.nodePattern) ? current.nodePattern.toCypherString(options) : '()';
                var currentSnippet1 = `${relSnippet}()`;
                var currentSnippet2 = `${relSnippet}${nodeSnippet}`;

                var snippet1 = `${nodePattern}${beforeSnippet}${currentSnippet1} // ${nodeSnippet}${afterSnippet}`
                    
                var snippet2 = (afterSnippet) 
                    ? `${nodePattern}${beforeSnippet}${currentSnippet2} // ${afterSnippet}`
                    : `${nodePattern}${beforeSnippet}${currentSnippet2}`;

                snippets.push(snippet1);
                snippets.push(snippet2);
            }
        }
        return snippets;
    }

    getValidationCypherSnippets = (config) => {
        config = config || {};
        var snippets = [];
        var variable = null;
        var propertyKeys = [];

        var firstSnippet = '';
        var nodePatternString = '()';
        if (this.nodePattern) {
            variable = this.nodePattern.getVariable();
            propertyKeys = this.nodePattern.getPropertyKeys();
            if (!variable) {
                variable = generateVariable(config.generatedVariables);
                config = { ...config, overrideNodePatternVariable: variable }
            }
            nodePatternString = this.nodePattern.toCypherString(config);
            firstSnippet = nodePatternString;
        }
        var variableAndPropertyKeys = [];
        if (propertyKeys.length > 0) {
            variableAndPropertyKeys.push({
                variable,
                propertyKeys
            });
        }
        snippets.push({
            snippet: firstSnippet,
            variableAndPropertyKeys: variableAndPropertyKeys.slice()    // need to make a copy, otherwise value gets modified later
        });

        if (this.patternElementChain && this.patternElementChain.length > 0) {
            for (var i = 0; i < this.patternElementChain.length; i++) {
                var beforeSnippet = this.patternElementChain.slice(0, i)
                    .map(chainLink => {
                        var response = chainLink.getVariableAndPropertyKeys(config);
                        const { nodePattern, relationshipPattern } = response;
                        var modifiedConfig = {
                            ...config,
                            overrideNodePatternVariable: nodePattern.overrideNodePatternVariable,
                            overrideRelationshipPatternVariable: relationshipPattern.overrideRelationshipPatternVariable
                        }
                        if (nodePattern.propertyKeys.length > 0) {
                            variableAndPropertyKeys.push({
                                variable: nodePattern.variable,
                                propertyKeys: nodePattern.propertyKeys
                            })
                        }
                        if (relationshipPattern.propertyKeys.length > 0) {
                            variableAndPropertyKeys.push({
                                variable: relationshipPattern.variable,
                                propertyKeys: relationshipPattern.propertyKeys
                            });
                        }
                        return chainLink.toCypherString(modifiedConfig);
                    }).join('');

                var current = this.patternElementChain[i];
                var response = current.getVariableAndPropertyKeys(config);

                const { nodePattern, relationshipPattern } = response;
                var modifiedConfig = {
                    ...config,
                    overrideNodePatternVariable: nodePattern.overrideNodePatternVariable,
                    overrideRelationshipPatternVariable: relationshipPattern.overrideRelationshipPatternVariable
                }

                var snippet1VariableAndPropertyKeys = variableAndPropertyKeys.slice();
                var snippet2VariableAndPropertyKeys = variableAndPropertyKeys.slice();

                if (nodePattern.propertyKeys.length > 0) {
                    snippet2VariableAndPropertyKeys.push({
                        variable: nodePattern.variable,
                        propertyKeys: nodePattern.propertyKeys
                    })
                }
                if (relationshipPattern.propertyKeys.length > 0) {
                    snippet1VariableAndPropertyKeys.push({
                        variable: relationshipPattern.variable,
                        propertyKeys: relationshipPattern.propertyKeys
                    });
                    snippet2VariableAndPropertyKeys.push({
                        variable: relationshipPattern.variable,
                        propertyKeys: relationshipPattern.propertyKeys
                    });
                }

                var relSnippet = (current.relationshipPattern) ? current.relationshipPattern.toCypherString(modifiedConfig) : '-[]->'
                var nodeSnippet = (current.nodePattern) ? current.nodePattern.toCypherString(modifiedConfig) : '()';
                var currentSnippet1 = `${relSnippet}()`;
                var currentSnippet2 = `${relSnippet}${nodeSnippet}`;

                var snippet1 = `${nodePatternString}${beforeSnippet}${currentSnippet1}`
                var snippet2 = `${nodePatternString}${beforeSnippet}${currentSnippet2}`;

                snippets.push({
                    snippet: snippet1,
                    variableAndPropertyKeys: snippet1VariableAndPropertyKeys
                });
                snippets.push({
                    snippet: snippet2,
                    variableAndPropertyKeys: snippet2VariableAndPropertyKeys
                });
            }
        }
        return snippets;
    }

    isStartNode = (nodePatternKey) => this.nodePattern.key === nodePatternKey;
    isStandaloneStartNode = (nodePatternKey) => this.isStartNode(nodePatternKey) && this.patternElementChain.length === 0;
    isEndNode = (nodePatternKey) => {
        var end = tail(this.patternElementChain);
        return (end) ? end.nodePattern.key === nodePatternKey : false;
    }

    getLength = () => this.patternElementChain.length + 1;

    addPatternElementChain = (patternElementChain) => {
        this.patternElementChain.push(patternElementChain);
    }

    containsNodePatternKey = (nodePatternKey) => {
        var matches = this.patternElementChain.filter(x => x.nodePattern.key === nodePatternKey);
        return (matches.length > 0 || this.nodePattern.key === nodePatternKey); 
    }

    getVariableSet = () => {
        var nodeVars = (this.nodePattern) ? this.nodePattern.getVariableSet() : new Set();
        this.patternElementChain.map(x => addSets(nodeVars, x.getVariableSet()));
        return nodeVars;
    }
}

export class PatternPart extends VariableContainer {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { pathFunction, pathPattern } = properties;
        this.pathFunction = pathFunction;
        this.pathPattern = pathPattern;  
    }

    function = (pathFunction) => {
        this.pathFunction = pathFunction;
        return pathFunction;
    }

    path = (pathPattern) => {
        this.pathPattern = pathPattern;
        return this;
    }

    setVariableScope = (variableScope) => {
        super.setVariableScope(variableScope);
        if (this.pathPattern) {
            this.pathPattern.setVariableScope(variableScope);
        }
    }

    removeFromVariableScope = () => {
        super.removeFromVariableScope();
        if (this.pathPattern) {
            this.pathPattern.removeFromVariableScope();
        }
    }

    includesPatternPart = (patternPart) => {
        if (patternPart) {
            return (
                this.variable === patternPart.variable &&
                this.pathFunction === patternPart.pathFunction &&
                this.pathPattern &&
                this.pathPattern.includesPathPattern(patternPart.pathPattern)
            );
        } else {
            return false;
        }
    }

    isEmpty = () => !this.pathPattern || this.pathPattern.isEmpty();

    findNodePattern = (nodePatternProperties) => {
        if (this.pathPattern) {
            return this.pathPattern.findNodePattern(nodePatternProperties);
        } else {
            return null;
        }
    }

    findAllNodePatternTriples = (nodePatternProperties) => {
        if (this.pathPattern) {
            return this.pathPattern.findAllNodePatternTriples(nodePatternProperties);
        } else {
            return [];
        }
    }

    getNodeRelNodePattern = (relationshipPattern) => 
        (this.pathPattern) ? this.pathPattern.getNodeRelNodePattern(relationshipPattern) : null;

    removeNodePattern = (nodePattern, variableScope) => {
        if (this.pathPattern) {
            return this.pathPattern.removeNodePattern(nodePattern, variableScope);
        } else {
            return null;
        }
    }

    removeRelationshipPattern = (relationshipPattern, variableScope) => {
        if (this.pathPattern) {
            return this.pathPattern.removeRelationshipPattern(relationshipPattern, variableScope);
        } else {
            return null;
        }
    }

    getLength = () => this.pathPattern.getLength();

    toCypherString = (config) => {
        var str = '';
        if (this.variable) {
            str += `${this.variable} = `;
        }
        if (this.pathFunction) {
            str += `(${this.pathFunction})`;
        }
        if (this.pathPattern) {
            str += this.pathPattern.toCypherString(config);
        }
        //console.log('patternPart: ', str);
        return str;
    }

    getDebugCypherSnippets = (config) => 
        (this.pathPattern) ? this.pathPattern.getDebugCypherSnippets(config) : [];

    getValidationCypherSnippets = (config) => 
        (this.pathPattern) ? this.pathPattern.getValidationCypherSnippets(config) : [];

    getVariableSet = () => {
        var varSet = nonNullSet(this.variable);
        if (this.pathPattern) {
            addSets(varSet, this.pathPattern.getVariableSet());
        }
        return varSet;
    }
}

export class Pattern extends KeyedItem {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { patternParts, variableScope } = properties;
        this.patternParts = (patternParts) ? patternParts : [];
        this.variableScope = variableScope;
        this.cy = new CypherStatementBuilder({
            variableScope: variableScope
        });
    }

    getPatternPartsToPrint = () => {
        var patternPartsToPrint = [];
        if (this.patternParts.length > 1) {
            this.patternParts.forEach(patternPart => {
                // look to see if another pattern part includes the entirety of another pattern part
                //console.log("checking patternPart ", patternPart);
                var isIncluded = this.patternParts
                    .filter(x => x !== patternPart)
                    .some(x => x.includesPatternPart(patternPart))                
                if (!isIncluded) {
                    //console.log('patternPartsToPrint pushing ', patternPart);
                    patternPartsToPrint.push(patternPart);
                }
            })
        } else {
            patternPartsToPrint = this.patternParts;
        }
        return patternPartsToPrint;
    }

    toCypherString = (config) => this.getPatternPartsToPrint()
            .map(patternPart => patternPart.toCypherString(config)).join(', ');

    getDebugCypherSnippets = (config) => {
        var snippets = [];
        const patternParts = this.getPatternPartsToPrint();
        patternParts.forEach((_, i) => {
            var beforeSnippet = patternParts.slice(0, i)
                .map(patternPart => patternPart.toCypherString(config)).join(', ');

            var afterSnippet = patternParts.slice(i + 1)
                .map(patternPart => patternPart.toCypherString(config)).join(', ');

            //console.log('before snippet: ', beforeSnippet);
            //console.log('after snippet: ', afterSnippet);

            var currentPatternSnippets = patternParts[i].getDebugCypherSnippets(config);
            //console.log('currentPatternSnippets: ', currentPatternSnippets);
            currentPatternSnippets.forEach(patternSnippet => {
                //console.log('pattern snippet: ', patternSnippet);
                const before = (beforeSnippet) ? `${beforeSnippet}, ` : '';
                const snippetHasComment = (patternSnippet.match(/\/\//) !== null);
                const after = (afterSnippet) 
                    ? (snippetHasComment) 
                        ? `, ${afterSnippet}` 
                        : ` // , ${afterSnippet}` 
                    : '';

                const snippetToAdd = `${before}${patternSnippet}${after}`;
                snippets.push(snippetToAdd);
            });
        })

        return snippets;
    }

    // this is for getting progressively built path patterns that can be executed against a 
    //   Neo4j database to see if data exists
    getValidationCypherSnippets = () => {
        var snippets = [];
        const patternParts = this.getPatternPartsToPrint();
        const config = {
            validationMode: true,
            generatedVariables: []
        }
        patternParts.forEach((_, i) => {
            var beforeSnippet = patternParts.slice(0, i)
                .map(patternPart => patternPart.toCypherString()).join(', ');

            var currentPatternSnippets = patternParts[i].getValidationCypherSnippets(config);
            //console.log('currentPatternSnippets: ', currentPatternSnippets);
            currentPatternSnippets.forEach(patternSnippet => {
                var { snippet, variableAndPropertyKeys } = patternSnippet;
                //console.log('pattern snippet: ', patternSnippet);
                //console.log('variableAndPropertyKeys : ', variableAndPropertyKeys);
                var before = (beforeSnippet) ? `${beforeSnippet}, ` : '';
                const snippetToAdd = `${before}${snippet}`;
                snippets.push(snippetToAdd);
                variableAndPropertyKeys.forEach(variableAndPropertyKeysItem => {
                    var { variable, propertyKeys } = variableAndPropertyKeysItem;
                    for (var j = 0; j < propertyKeys.length; j++) {
                        var whereCriteria = propertyKeys.slice(0,j+1)
                            .map(propertyKey => `exists(${smartQuote(variable)}.${smartQuote(propertyKey)})`)
                            .join(' AND ');
                        var whereSnippet = `${snippetToAdd} \nWHERE ${whereCriteria}`;
                        snippets.push(whereSnippet);
                    }
                });
            });
        })

        return snippets;
    }

    addNodePatternPart = (nodePattern, variableScope) => {
        var pathPattern = new PathPattern({
            key: nodePattern.key,
            nodePattern: nodePattern
        });

        var patternPart = new PatternPart({
            key: nodePattern.key,
            pathPattern: pathPattern,
            variableScope: variableScope
        });

        this.patternParts.push(patternPart);
    }

    addPathPatternPart = (nodePattern, patternElementChain, variableScope) => {
        var pathPattern = new PathPattern({
            key: nodePattern.key,
            nodePattern: nodePattern,
            patternElementChain: patternElementChain
        });

        var patternPart = new PatternPart({
            key: nodePattern.key,
            pathPattern: pathPattern,
            variableScope: variableScope
        });

        this.patternParts.push(patternPart);
    }

    removeNodePattern = (nodePattern, variableScope) => {
        var strandedChains = [];
        if (this.patternParts && this.patternParts.length > 0) {
            strandedChains = this.patternParts
                .map(patternPart => patternPart.removeNodePattern(nodePattern, variableScope))
                .filter(strandedChains => strandedChains && strandedChains.length > 0)
                .reduce((acc, strandedChains) => acc.concat(strandedChains), []);

        }
        this.handleStrandedChainsAndCleanupPatternParts(strandedChains, variableScope);
    }

    removeRelationshipPattern = (relationshipPattern, variableScope) => {
        var strandedChains = [];
        if (this.patternParts && this.patternParts.length > 0) {
            strandedChains = this.patternParts
                .map(patternPart => patternPart.removeRelationshipPattern(relationshipPattern, variableScope))
                .filter(strandedChains => strandedChains && strandedChains.length > 0)
                .reduce((acc, strandedChains) => acc.concat(strandedChains), []);
        }
        /*
        console.log('removeRelationshipPattern strandedChains: ');
        strandedChains.map(strandedChain => {
            console.log('strandedChain: ');
            strandedChain.map(chainLink => {
                console.log('relationship: ', chainLink.relationshipPattern);
                console.log('node: ', chainLink.nodePattern);
            })
        })
        */
        this.handleStrandedChainsAndCleanupPatternParts(strandedChains, variableScope);
    }

    handleStrandedChainsAndCleanupPatternParts = (strandedChains, variableScope) => {
        // for each stranded chain, need to promote it to a PathPattern
        strandedChains.forEach(strandedChain => {
            // pop off the first item of the stranded chain - it becomes the nodePattern, 
            //   and the rest is the patternElementChain
            //console.log("strandedChain: ", strandedChain);
            var chainLink = strandedChain.splice(0,1)[0];
            //console.log("strandedChain after splice: ", strandedChain);
            //console.log("chainLink: ", chainLink);
            var startNodePattern = chainLink.nodePattern;
            //console.log("startNodePattern: ", startNodePattern);
            this.addPathPatternPart(startNodePattern, strandedChain, variableScope);
        });

        for (var i = 0; i < this.patternParts.length; i++) {
            var patternPart = this.patternParts[i];
            if (patternPart.isEmpty()) {
                var removedPatternPart = this.patternParts.splice(i,1)[0];
                variableScope.removeItem(removedPatternPart);
                i--;
            }
        }
    }

    findNodePattern = (nodePatternProperties) => {
        if (this.patternParts && this.patternParts.length > 0) {
            // can't use patternParts.find here because I would just be returning a patternPart and I need to return a nodePattern
            for (var i = 0; i < this.patternParts.length; i++) {
                var part = this.patternParts[i];
                var nodePattern = part.findNodePattern(nodePatternProperties);
                if (nodePattern) {
                    return nodePattern;
                }
            }
        }
        return null;
    }

    findAllNodePatternTriples = (nodePatternProperties) => {
        if (this.patternParts && this.patternParts.length > 0) {
            return this.patternParts
                .map(part => part.findAllNodePatternTriples(nodePatternProperties))
                .reduce((acc,allTriples) => acc.concat(allTriples),[]);
        }
        return [];
    }

    getNodeRelNodePattern = (relationshipPattern) => {
        for (var i = 0; i < this.patternParts.length; i++) {
            var patternPart = this.patternParts[i];
            var nodeRelNode = patternPart.getNodeRelNodePattern(relationshipPattern);
            if (nodeRelNode) {
                return nodeRelNode;
            }
        }
        return null;
    }

    addPatternPart = (patternPart) => {
        this.patternParts.push(patternPart);
    }

    // flow style api for addPatternPart
    addPart = (patternPart) => {
        this.addPatternPart(patternPart);
        return this;
    }

    removePatternPart = (patternPart) => {
        var index = this.patternParts.indexOf(patternPart);
        if (index !== -1) {
            this.patternParts.splice(index,1);
        }
    }

    getPatternParts = () => {
        return this.patternParts;
    }

    setPatternParts = (patternParts) => {
        this.patternParts = (Array.isArray(patternParts)) ? patternParts : [];
    }

    findNodePatternPathPatternsByKey = (nodePatternKey) => {
        /*
        var matchingPathPatterns = [];
        this.patternParts.map(patternPart => {
            var pathPattern = patternPart.pathPattern;
            if (pathPattern.containsNodePatternKey(nodePatternKey)) {
                matchingPathPatterns.push(pathPattern);
            }
        });
        return matchingPathPatterns;
        */
       return this.findNodePatternPatternPartsByKey(nodePatternKey).map(x => x.pathPattern);
    }

    findNodePatternPatternPartsByKey = (nodePatternKey) => {
        return this.patternParts.filter(patternPart => {
            var pathPattern = patternPart.pathPattern;
            return (pathPattern.containsNodePatternKey(nodePatternKey));
        })
    }

    removeStandaloneNodePathPattern = (nodePatternKey) => {
        var patternParts = this.findNodePatternPatternPartsByKey(nodePatternKey);
        patternParts = patternParts
            .filter(x => x.pathPattern.isStandaloneStartNode(nodePatternKey));
        
        patternParts.forEach((patternPart) => {
            var index = this.patternParts.indexOf(patternPart);
            if (index !== -1) {
                this.patternParts.splice(index,1);
            }
        });
    }

    getVariableSet = () => {   
        var varSet = new Set();
        if (this.patternParts) {
            this.patternParts.forEach(x => {
                addSets(varSet, x.getVariableSet());
            });
        }
        return varSet;
    }

    sortByLength = (a,b) => {
        var aLen = a.getLength();
        var bLen = b.getLength();
        if (aLen === bLen) {
            return 0;
        } else if (aLen > bLen) {
            return 1;
        } else {
            return -1;
        }
    }

    addPatternElementChain = (key, startNodePattern, relationshipPattern, endNodePattern, variableScope) => {
        // construct a PatternElementChainLink
        var chain = new PatternElementChainLink({
            key: key,
            relationshipPattern: relationshipPattern,
            nodePattern: endNodePattern,
            variableScope: variableScope
        });

        var startNodePatternKey = (startNodePattern) ? startNodePattern.key : null;
        var endNodePatternKey = (endNodePattern) ? endNodePattern.key : null;

        // add to an existing PathPattern or construct a new PathPattern
        var matchingStartPatternParts = this.findNodePatternPatternPartsByKey(startNodePatternKey)
                    .filter(x => x.pathPattern.isStandaloneStartNode(startNodePatternKey)
                        || x.pathPattern.isEndNode(startNodePatternKey));
        matchingStartPatternParts.sort(this.sortByLength);
        var matchingEndPatternParts = this.findNodePatternPatternPartsByKey(endNodePatternKey)
                    .filter(x => x.pathPattern.isStartNode(endNodePatternKey));

        matchingEndPatternParts.sort(this.sortByLength);

        var startPatternPart = matchingStartPatternParts[0];
        var endPatternPart = matchingEndPatternParts[0];

        if (!startPatternPart) {
            var startPath = this.cy.path().setKey(startNodePatternKey).node(startNodePattern);
            startPatternPart = this.cy.part().path(startPath);
            this.addPatternPart(startPatternPart);
        }

        if (!endPatternPart) {
            var endPath = this.cy.path().setKey(endNodePatternKey).node(endNodePattern);
            endPatternPart = this.cy.part().path(endPath);
            this.addPatternPart(endPatternPart);
        }

        var link = this.cy.link().rel(relationshipPattern).node(endNodePattern);

        /*
        console.log("endPatternPart len: " + endPatternPart.pathPattern.getLength());
        console.log("startPatternPart len: " + startPatternPart.pathPattern.getLength());
        console.log("startPatternPart.pathPattern", startPatternPart.pathPattern);
        console.log("startPatternPart.pathPattern.patternElementChain", startPatternPart.pathPattern.patternElementChain);
        */

        if (endPatternPart.pathPattern.getLength() > 1) {
            if (startPatternPart.pathPattern.getLength() > 1) {
                // this is the case of start being A->B, and we are adding C->D, not just C
                startPatternPart.pathPattern.link(link);    // makes it A->B->C, (C->D still exists)
                if (startPatternPart !== endPatternPart) {
                    startPatternPart.pathPattern.mergeLinks(endPatternPart.pathPattern); // makes it A->B->C->D
                    this.removePatternPart(endPatternPart);
                }
            } else {
                // this is the case of start being B, and we are adding C->D, not just C
                endPatternPart.pathPattern.node(startNodePattern).addStartLink(link);
                this.removeStandaloneNodePathPattern(startNodePatternKey);
            }
        } else {
            // this is the case of start being B, or A->B, and we are adding just C, not C->D
            startPatternPart.pathPattern.link(link);
            this.removeStandaloneNodePathPattern(endNodePatternKey);
        }
    }

    getAllNodePatterns = () => {
        var allNodePatterns = this.patternParts.map(patternPart => {
            var pathPattern = patternPart.pathPattern;
            if (pathPattern) {
                return pathPattern.getAllNodePatterns();
            } else {
                return [];
            }
        }).reduce((acc,array) => acc.concat(array),[]);

        return allNodePatterns;
    }

    getAllRelationshipPatterns = () => {
        var allRelationshipPatterns = this.patternParts.map(patternPart => {
            var pathPattern = patternPart.pathPattern;
            if (pathPattern) {
                return pathPattern.getAllRelationshipPatterns();
            } else {
                return [];
            }
        }).reduce((acc,array) => acc.concat(array),[]);
        
        return allRelationshipPatterns;
    }

    getAllNodeRelNodePatterns = () => {
        var allNodeRelNodePatterns = this.patternParts.map(patternPart => {
            var pathPattern = patternPart.pathPattern;
            if (pathPattern) {
                return pathPattern.getAllNodeRelNodePatterns();
            } else {
                return [];
            }
        }).reduce((acc,array) => acc.concat(array),[]);
        
        return allNodeRelNodePatterns;
    }

    setVariableScope = (variableScope) => {
        this.variableScope = variableScope;
        this.cy.setVariableScope(variableScope);
        this.patternParts.map(patternPart => patternPart.setVariableScope(variableScope));
    }
    removeFromVariableScope = () => this.patternParts.map(patternPart => patternPart.removeFromVariableScope())
}