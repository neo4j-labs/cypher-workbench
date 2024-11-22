
import SnippetSet from "./cypherSnippetSet";
import { getCypherStringFromClauses } from './cypherStringConverter';
import { ReturnClause } from "./cypherReturn";
import { Pattern } from "./cypherPattern";
import { findValues } from "./graphUtil";
import { getVariables } from "./debugVariableUtil";
import { stripComments } from "../common/parse/antlr/commentUtil";
import { ExplanatoryMarker } from "./explanations";

export const InjectLimit = '_GD_INJECT_LIMIT_';

export default class SubQueryClause {

    parseSubQueryImportVarString = (varString) => {
        let importAll = false;
        let vars = [];
        if (typeof(varString) === 'string') {
            // will be (), (*), (a), (a,b), ...
            varString = varString.trim();
            varString = varString.substring(1, varString.length - 1);
            let tokens = varString.split(',').map(token => token.trim()).filter(x => x);
            if (tokens[0] === '*') {
                importAll = true;
            } else {
                vars = tokens;
            }
        }
        return { importAll, vars }
    }
    
    constructor (properties = {}) {

        let {
            isOptional,
            importedVariableString,
            subQueryDirective
            } = properties;

        this.isOptional = isOptional;
        this.subQueryImportVarString = importedVariableString;
        this.subQueryDirective = subQueryDirective;

        let { importAll, vars } = this.parseSubQueryImportVarString(importedVariableString);
        this.subQueryImportAllVariables = importAll;
        this.subQueryImportVariables = vars;

        this.clauses = [];
    }    

    setIsOptional = (isOptional) => {
        this.isOptional = isOptional;
    }

    getStatementOpener = () => {
        let optional = this.isOptional ? 'OPTIONAL ' : '';
        let subQueryImportVarString = this.subQueryImportVarString ? `${this.subQueryImportVarString} ` : '';
        let opener = `${optional}CALL ${subQueryImportVarString}{`;
        return opener;
    }

    getStatementCloser = () => {
        let directive = this.subQueryDirective ? ` ${this.subQueryDirective}` : '';
        let closer = `\n}${directive}`;
        return closer;
    }

    toCypherString = () => {
        let clauses = this.clauses || [];
        let clauseStr = getCypherStringFromClauses(clauses);
        let indent = '    ';
        clauseStr = clauseStr.split('\n').map(x => `${indent}${x}`).join('\n');

        let cypher = `${this.getStatementOpener()}\n${clauseStr}${this.getStatementCloser()}`
        return cypher;
    }

    getOpeningWithClause = () => {
        let clauses = this.clauses || [];
        return clauses[0] && this.clauses[0].keyword?.toLowerCase() === 'with' 
            ? this.clauses[0] 
            : null;
    }

    getPriorClausesExcludeOpeningWith = (currentClause) => {
        let clauses = this.clauses || [];
        let openingWithClause = this.getOpeningWithClause();
        if (openingWithClause) {
            clauses = clauses.slice(1);
        }
        let currentClauseIndex = clauses.indexOf(currentClause);
        if (currentClauseIndex >= 0) {
            return clauses.slice(0,currentClauseIndex)
        } else {
            return [];
        }
    }

    getInjectdVariables = (activeSubSnippets) => {
        // handle any 
        let lastActiveSubSnippet = activeSubSnippets[activeSubSnippets.length - 1];
        let lastCypher = stripComments(lastActiveSubSnippet?.snippetStr);
        // regex to find _gd_# variables that were injected and weren't present initially
        let varRegex = /[\(\[](_gd_\d+):/g;
        // https://stackoverflow.com/questions/6323417/regex-to-extract-all-matches-from-string-using-regexp-exec
        let injectedVariables = [];
        let match = null;
        do {
            match = varRegex.exec(lastCypher);
            if (match) {
                injectedVariables.push(match[1])
            }
        } while (match);

        return injectedVariables;
    }

    getReturnVariablesString = (currentClause, activeSubSnippets) => {
        if (!currentClause) {
            return '*';
        }
        let openingWith = this.getOpeningWithClause();
        let openingWithVariables = openingWith?.parsedVariables || [];
        openingWithVariables = openingWithVariables.concat(this.subQueryImportVariables || []);

        // console.log('openingWithVariables: ', openingWithVariables)

        let priorClauses = this.getPriorClausesExcludeOpeningWith(currentClause);
        // console.log('priorClauses: ', priorClauses)
        let currentCypherObjects = findValues(activeSubSnippets, 'associatedCypherObject');
        // console.log('currentCypherObjects: ', currentCypherObjects)
        let allClauses = priorClauses.concat(currentCypherObjects);
        // console.log('allClauses: ', allClauses)
        let variables = getVariables(allClauses);
        
        let injectedVariables = this.getInjectdVariables(activeSubSnippets);
        variables = variables.concat(injectedVariables);

        // console.log('variables: ', variables)
        let variablesToAdd = variables.filter(x => !openingWithVariables.includes(x));

        let openingVarsStr = variables
            .filter(x => openingWithVariables.includes(x))
            .map(x => `'${x}'`).join(', ')
        let openingVariablesMessage = `"${openingVarsStr} defined in parent scope" as _gd_message`

        // console.log('variablesToAdd: ', variablesToAdd)
        let varString = (variablesToAdd.length > 0) 
            ? variablesToAdd.join(', ') 
            : openingVariablesMessage

        return varString;
    }

    handleSubQueryReturn = (currentSnippet, activeSubSnippets) => {
        if (!currentSnippet || !activeSubSnippets) {
            console.log('Warning: required params currentSnippet and activeSubSnippets not passed into subQueryReturn');
            return '';
        }
        // console.log('currentSnippet: ', currentSnippet)
        // console.log('activeSubSnippets: ', activeSubSnippets)

        let returnVariables = this.getReturnVariablesString(currentSnippet.associatedCypherObject, activeSubSnippets);
        // console.log('returnVariables: ', returnVariables)

        /* we want the logic to be:
         1) if current step is RETURN or SKIP, then only add InjectLimit
         2) if we are on a LIMIT, it is assumed a RETURN has already occured, do nothing
         3) in all other cases add a RETURN with InjectLimit
        */ 
         let returnStr = '';
        // console.log('currentSnippet: ', currentSnippet)
        let currentKeyword = currentSnippet.associatedCypherObject?.keyword;
        currentKeyword = (currentKeyword) ? currentKeyword.toUpperCase() : currentKeyword;
        if (currentKeyword === 'RETURN' || currentKeyword === 'SKIP') {
            returnStr = `\n    ${InjectLimit}`
        } else if (currentKeyword !== 'LIMIT') {
            returnStr = `\n    RETURN ${returnVariables}\n    ${InjectLimit}`
        }
        // console.log('returnStr: ', returnStr);
        return returnStr;
    }

    getDebugCypherSnippetSet = (config) => {
        // console.log('config: ', config)

        let snippetSet = new SnippetSet({
            id: 'subQuery',
            opener: this.getStatementOpener(),
            closer: this.getStatementCloser(),
            associatedCypherObject: this
        });

        let openingWithClause = this.getOpeningWithClause();
        
        this.clauses.forEach((clause, i) => {
            let isReturnClause = clause && clause.clauseInfo && clause.clauseInfo instanceof ReturnClause;
            let isOpeningWithClause = clause === openingWithClause 

            // need the SubQuery return to be generated when the Pattern snippets are getting built
            let isMatchClause = clause && clause.clauseInfo && clause.clauseInfo instanceof Pattern;
            // if (isMatchClause) {
            //     clause.debugSubQueryReturnHandler = this.handleSubQueryReturn
            // }
            
            // console.log('clause.parsedVariables: ', clause.parsedVariables);
            let clauseSnippetSet = new SnippetSet({
                id: clause.keyword,
                explanatoryMarker: ExplanatoryMarker.SubQueryCypherClause,
                skipMe: isOpeningWithClause,
                parsedVariables: clause.parsedVariables,
                associatedCypherObject: clause,
                opener: '\n    ',
                subQueryReturn: this.handleSubQueryReturn    // moving to MATCH CypherClause 
            })

            // console.log(clause);
            // putting in this workaround for now to handle RETURN being returned twice
            let subClauseSnippetSet = null;
            if (isReturnClause) {
                subClauseSnippetSet = clause.clauseInfo.getDebugCypherSnippetSet(config)
            } else {
                subClauseSnippetSet = clause.getDebugCypherSnippetSet(config)
            }
            // console.log(subClauseSnippetSet);
            clauseSnippetSet.addOneOrMoreSnippets(subClauseSnippetSet);
            clauseSnippetSet.cypherSnippet = clauseSnippetSet.computeCypherSnippet();

            snippetSet.addOneOrMoreSnippets(clauseSnippetSet);
        })

        snippetSet.cypherSnippet = snippetSet.computeCypherSnippet();

        return snippetSet;
    }      

    getDebugCypherSnippets = (config) => {
        let snippetSet = this.getDebugCypherSnippetSet(config);
        let snippets = snippetSet.getSnippets();
        return snippets;
    }    

}