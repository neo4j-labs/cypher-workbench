//import antlr4 from 'antlr4/src/antlr4/index';
import antlr4 from 'antlr4';
import differenceWith from 'lodash/differenceWith';

import { AutocompleteErrorListener } from './antlr/AutocompleteErrorListener';
import CypherLexer from './antlr/CypherLexer';
import CypherParser from './antlr/CypherParser';
import WithClauseListener from './antlr/WithClauseListener';
import { processTokens, getDescendentsOfType } from './parseUtil';

export function doTokensMatch (token1, token2) {
    return (token1.text === token2.text && token1.type === token2.type);
} 

export function parseWith (cypherToParse) {
    var chars = new antlr4.InputStream(cypherToParse);
    var lexer = new CypherLexer(chars);
    var tokens  = new antlr4.CommonTokenStream(lexer);
    var parser = new CypherParser(tokens);

    const autocompleteInfo = new AutocompleteErrorListener(cypherToParse);

    // Do this after creating the parser and before running it
    parser.removeErrorListeners(); // Remove default ConsoleErrorListener
    parser.addErrorListener(autocompleteInfo); // Add custom error listener

    var cypherLines = cypherToParse.split('\n');

    var tree = parser.oC_With();
    if (autocompleteInfo.errorOccurred) {
        var tokens = [];
        const errorNodeImpls = getDescendentsOfType(tree, 'ErrorNodeImpl');
        if (errorNodeImpls.length > 0) {
            tokens = errorNodeImpls.map(error => {
                return {
                    text: error.symbol.text,
                    type: parser.symbolicNames[error.symbol.type]
                }
            });
            tokens = tokens.filter(token => token.text.trim());            
            if (tokens.length === 0) {
                tokens = autocompleteInfo.tokens;
            } else {
                const lastToken = tokens[tokens.length - 1];
                var autocompleteTokens = autocompleteInfo.tokens;
                const filteredTokens = autocompleteTokens
                    .filter(autocompleteToken => autocompleteToken.text.trim())
                const index = filteredTokens
                    .findIndex(autocompleteToken => doTokensMatch(lastToken, autocompleteToken));

                /*
                console.log('lastToken: ', lastToken);
                console.log('index: ', index);
                console.log('autocompleteInfo.tokens: ', autocompleteTokens);
                console.log('autocompleteInfo.tokens.slice(index): ', autocompleteTokens.slice(index+1));
                */
                
                if (index >= 0) {
                    tokens = tokens.concat(filteredTokens.slice(index+1));
                }
            }
            //console.log('errorNodeImpl + autocomplete tokens: ', tokens);
        } else {
            tokens = autocompleteInfo.tokens;
            //console.log('autocomplete tokens: ', tokens);
        }
        //console.log('tokens: ', tokens);
        if (tokens.length === 0) {
            var streamTokens = parser.getTokenStream().tokens;
            tokens = processTokens(streamTokens, parser, cypherLines);
            //console.log('tokens (2): ', tokens);
        }
        const lastCompositeToken = getLastCompositeToken((autocompleteInfo.tokens) ? autocompleteInfo.tokens : tokens);

        tokens = tokens.filter(token => token.text.trim())
        // process tokens
        const lastToken = tokens[tokens.length - 1];
        const nextToLastToken = tokens[tokens.length - 2];
        const thirdFromLastToken = tokens[tokens.length - 3];

        var lastSymbolicName = tokens.reverse().find(x => x.type === 'UnescapedSymbolicName');
        lastSymbolicName = (lastSymbolicName) ? lastSymbolicName.text : null;

        return {
            lastSymbolicName: lastSymbolicName,
            lastToken: (lastToken) ? lastToken.text : '',
            lastCompositeToken: lastCompositeToken, 
            withVariables: null,
            hasAsterisk: false,
            nextToLastToken: (nextToLastToken) ? nextToLastToken.text : '',
            thirdFromLastToken: (thirdFromLastToken) ? thirdFromLastToken.text : '',
            parseSuccessful: false
        }
    } else {
        var tokens = parser.getTokenStream().tokens;
        tokens = processTokens(tokens, parser, cypherLines, { leaveSpaces: true });
        const lastCompositeToken = getLastCompositeToken(tokens);        

        tokens = tokens.filter(token => token.text.trim())

        const lastToken = tokens[tokens.length - 1];
        const nextToLastToken = tokens[tokens.length - 2];
        const thirdFromLastToken = tokens[tokens.length - 3];

        var withListener = new WithClauseListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(withListener, tree);

        return {
            lastVariable: withListener.getLastVariable(),
            lastPropertyKey: withListener.getLastPropertyKey(),
            lastSymbolicName: withListener.getLastSymbolicName(),
            withVariables: withListener.getWithVariables(),
            hasAsterisk: withListener.getHasAsterisk(),
            lastToken: (lastToken) ? lastToken.text : '',
            lastCompositeToken: lastCompositeToken, 
            nextToLastToken: (nextToLastToken) ? nextToLastToken.text : '',
            thirdFromLastToken: (thirdFromLastToken) ? thirdFromLastToken.text : '',
            parseSuccessful: true
        }
    }
}

const getLastCompositeToken = (tokens) => {
    const lastSpaceTokenIndex = findLastIndex(tokens.slice(0,tokens.length-1), (token) => token.text.trim() === '');
    //console.log('lastSpaceTokenIndex: ', lastSpaceTokenIndex);
    var lastCompositeToken = '';
    if (lastSpaceTokenIndex >= 0) {
        lastCompositeToken = tokens.slice(lastSpaceTokenIndex+1).map(x => x.text).join('');
    }
    return lastCompositeToken;
}

const findLastIndex = (array, comparisonFunction) => {
    if (array && array.length > 0) {
        for (var i = array.length - 1; i >= 0; i--) {
            if (comparisonFunction(array[i], i, array)) {
                return i;
            }
        }
    }
    return -1;
}

export const getVariableArrayDifference = (array1, array2) => {
    return {
        inLeftOnly: differenceWith(array1, array2, variablesAreEqual),
        inRightOnly: differenceWith(array2, array1, variablesAreEqual)
    }        
}

export const variablesAreEqual = (a, b) => {
    if ((!a && b) || (a && !b)) return false;
    if (!a && !b || a === b) return true;
    return a.isEqualTo(b);
}
