
import { parseWith } from './parseWith';

export const PROMPT_TYPE = {
    None: 'None',
    VariableOnly: 'VariableOnly',
    FunctionOnly: 'FunctionOnly',
    VariableAndFunction: 'VariableAndFunction',
    VariableProperty: 'VariableProperty'
}

const GOOD_PARSE_RULES = [
    {
        // WITH apoc.map.me
        matchRule: (results, variables, functionPrefixes) => results.lastCompositeToken  
                        && Array.from(results.lastCompositeToken)
                            .reduce((numDots, char) => (char === '.') ? numDots+1 : numDots, 0) >= 2
                        && functionPrefixes
                        && functionPrefixes.find(x => x.startsWith(results.lastVariable))
        ,
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.FunctionOnly,
            variableOrFunction: '',
            searchText: results.lastCompositeToken
        })    
    },
    {
        // WITH apoc.coll 
        matchRule: (results, variables, functionPrefixes) => results.lastToken === results.lastPropertyKey 
                                && results.nextToLastToken === '.'
                                && results.lastVariable
                                && functionPrefixes
                                && functionPrefixes.find(x => x.startsWith(results.lastVariable)),
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.FunctionOnly,
            variableOrFunction: '',
            searchText: `${results.thirdFromLastToken}.${results.lastToken}`
        })    
    },
    {
        // WITH apoc
        matchRule: (results, variables, functionPrefixes) => results.lastVariable
                                && functionPrefixes
                                && functionPrefixes.find(x => x.startsWith(results.lastVariable)),
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.FunctionOnly,
            variableOrFunction: '',
            searchText: results.lastToken
        })    
    },
    {
        // WITH movie.ra 
        matchRule: (results, variables) => results.lastToken === results.lastPropertyKey 
                                && results.nextToLastToken === '.'
                                && results.lastVariable
                                && variables
                                && variables.find(x => x.startsWith(results.lastVariable)),
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.VariableProperty,
            variableOrFunction: results.lastVariable,
            searchText: results.lastPropertyKey
        })    
    },
    {
        // WITH m
        matchRule: (results) => results.nextToLastToken === 'WITH' && results.lastVariable,
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.VariableAndFunction,
            variableOrFunction: '',
            searchText: results.lastVariable
        })    
    },
    {
        // WITH movie, p
        matchRule: (results) => results.nextToLastToken === ',' && results.lastVariable,
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.VariableAndFunction,
            variableOrFunction: '',
            searchText: results.lastVariable
        })    
    }
]

const BAD_PARSE_RULES = [
    {
        // WITH movie.   
        matchRule: (results, variables) => results.lastToken === '.' 
                                    && results.lastSymbolicName === results.nextToLastToken
                                    && variables
                                    && variables.find(x => x.startsWith(results.lastSymbolicName)),
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.VariableProperty,
            variableOrFunction: results.lastSymbolicName,
            searchText: ''
        })
    },
    {
        // WITH apoc.map.
        matchRule: (results, variables, functionPrefixes) => results.lastCompositeToken  
                        && Array.from(results.lastCompositeToken)
                            .reduce((numDots, char) => (char === '.') ? numDots+1 : numDots, 0) >= 2
                        && results.lastToken === '.' 
                        // can't use function prefixes to check here, because lastVariable contains 'map'
        ,
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.FunctionOnly,
            variableOrFunction: '',
            searchText: results.lastCompositeToken
        })    
    },
    {
        // WITH apoc.   
        matchRule: (results, variables, functionPrefixes) => results.lastToken === '.' 
                                    && results.lastSymbolicName === results.nextToLastToken
                                    && functionPrefixes
                                    && functionPrefixes.find(x => x.startsWith(results.lastSymbolicName)),
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.FunctionOnly,
            variableOrFunction: '',
            searchText: `${results.lastSymbolicName}.`
        })
    },
    {
        // WITH -or- WITH ( -or- WITH var,   
        matchRule: (results) => results.lastToken === 'WITH' 
                                || results.nextToLastToken === 'WITH' 
                                || results.lastToken === '(' 
                                || results.nextToLastToken === '(' 
                                || results.lastToken === ','
                                || results.nextToLastToken === ',',
        returnFunc: (results) => ({
            promptType: PROMPT_TYPE.VariableAndFunction,
            variableOrFunction: '',
            searchText: (results.nextToLastToken === 'WITH' 
                            || results.nextToLastToken === '(' 
                            || results.nextToLastToken === ',')
                        ? results.lastSymbolicName : ''
        })
    }
]

export const getWithPromptInfo = (withCypher, variables, functionPrefixes) => {
    var results = parseWith(withCypher);
    var matchingRule = null;
    if (results.parseSuccessful) {
        matchingRule = GOOD_PARSE_RULES.find(rule => rule.matchRule(results, variables, functionPrefixes));
    } else {
        matchingRule = BAD_PARSE_RULES.find(rule => rule.matchRule(results, variables, functionPrefixes));
    }
    if (matchingRule) {
        return {
            ...matchingRule.returnFunc(results),
            parseResults: results
        }
    } else {
        return {
            promptType: PROMPT_TYPE.None,
            variableOrFunction: '',
            searchText: '',
            parseResults: results
        }
    }
}
