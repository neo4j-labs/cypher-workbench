//import antlr4 from 'antlr4/src/antlr4/index';
import antlr4 from 'antlr4';

import { CustomErrorListener } from './antlr/ErrorListener';
import CypherLexer from './antlr/CypherLexer';
import CypherParser from './antlr/CypherParser';
import CypherStatementBuilderListener from './antlr/CypherStatementBuilderListener';

export const splitCypherStatementsBySemicolon = (cypherToParse) => {
    //console.log("parse this: " + cypherToParse);
    var parseDelimiter = ';';
    var regexp = new RegExp(parseDelimiter);

    var splitCypherStatements = cypherToParse.split(regexp);
    splitCypherStatements = splitCypherStatements.filter((cypher) => {
        return (cypher.trim().length > 0 && !cypher.match(/:param ?\[/) && !cypher.match(/:params ?\[/)
                                         && !cypher.match(/:param ?\{/) && !cypher.match(/:params ?\{/));
     });

    var cypherStatements = [];
    var i;
    for (var i = 0; i < splitCypherStatements.length; i++) {
        var aCypherStatement = splitCypherStatements[i];
        if (aCypherStatement.toUpperCase().indexOf("INDEX ON") == -1
            && aCypherStatement.toUpperCase().indexOf("CONSTRAINT") == -1) {
            aCypherStatement = aCypherStatement.trim();
            aCypherStatement = aCypherStatement.replace(/\(start/g, '(start1');
            aCypherStatement = aCypherStatement.replace(/\(end/g, '(end1');
            if (aCypherStatement) {
                cypherStatements.push(aCypherStatement);
            }
        }
    }
    return cypherStatements;
}

export function parseCypher (cypherToParse, dataModel) {
    const cypherStatements = splitCypherStatementsBySemicolon(cypherToParse);
    return processCypherStatements(cypherStatements, dataModel);
}

export function handleParseError (e, cypherText) {
    var success = true, message = '';
    if (e.symbol && typeof(e.symbol.start) === 'number' && typeof(e.symbol.stop) === 'number') {
        var stop = (e.symbol.start === e.symbol.stop) ? e.symbol.stop + 1 : e.symbol.stop;
        var offendingText = cypherText.substring(e.symbol.start, stop);
        if (offendingText) {
            offendingText = (offendingText.length > 20) ? offendingText.substring(0,20) + '...' : offendingText;
            message = `'Error parsing statement: Unexpected symbol '${offendingText}', line: ${e.line}, column: ${e.column}, message: ${e.message}`;
            success = false;
        } else {
            message = 'Error parsing statement: ' + e;
            success = false;
        }
    } else {
        message = 'Error parsing statement: ' + e;
        success = false;
    }
    return {
        success: success,
        message: message
    }
}

export function parseCypherPattern (cypherPattern, dataModel, dataModelCanvas) {
    try {
        var pattern = parsePattern(cypherPattern);
        //console.log('pattern:');
        //console.log(pattern);
        if (pattern) {
            pattern.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true, dataModelCanvas: dataModelCanvas});
        }
    } catch (e) {
        return handleParseError(e, cypherPattern);
    }
    return { success: true };
}

function processCypherStatements (cypherStatements, dataModel) {
    for (var i = 0; i < cypherStatements.length; i++) {
        var cypherStatement = cypherStatements[i];
        if (cypherStatement) {
            try {
                var statement = parseStatement(cypherStatement);
                if (statement) {
                    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});
                }
            } catch (e) {
                return handleParseError(e, cypherStatement);
            }
        }
    }
    return { success: true };
}

function getParser (cypherToParse) {
    var chars = new antlr4.InputStream(cypherToParse);
    var lexer = new CypherLexer(chars);
    var tokens  = new antlr4.CommonTokenStream(lexer);
    var parser = new CypherParser(tokens);

    const listener = new CustomErrorListener();

    // Do this after creating the parser and before running it
    parser.removeErrorListeners(); // Remove default ConsoleErrorListener
    parser.addErrorListener(listener); // Add custom error listener
    return parser;
}

var parsePattern = function (cypherPattern) {
    var pattern;
    if (cypherPattern && cypherPattern.trim && cypherPattern.replace) {
        cypherPattern = cypherPattern.trim().replace(/^MATCH|CREATE|MERGE/i, '').trim();
        if (!cypherPattern.match(/^\(/)) {    // if partial pattern, e.g. :Test, then add parentheses
            cypherPattern = (cypherPattern.charAt(0) !== ':') ? ':' + cypherPattern : cypherPattern;
            cypherPattern = `(${cypherPattern})`;
        }
        // special case
        var match = cypherPattern.match(/\[:(REL|RELATIONSHIP)\]/i);
        if (match) {
            var original = match[1];
            var replacement = original + '_' + new Date().getTime().toString();
            cypherPattern = cypherPattern.replace()
        }
        //console.log('getting parser for: ' + cypherPattern);
        var parser = getParser(cypherPattern);
        var tree = parser.oC_AnonymousPatternPart();
        var builder = new CypherStatementBuilderListener('AnonymousPatternPart');
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);
        pattern = builder.getCypherStatement();
    }
    return pattern;
}

export function parseStatement (cypherToParse) {
    var statement;
    if (cypherToParse) {
        var parser = getParser(cypherToParse);
        var tree = parser.oC_Cypher();

        var builder = new CypherStatementBuilderListener();
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);

        statement = builder.getCypherStatement();
    }
    return statement;
}
