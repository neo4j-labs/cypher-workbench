
import SnippetSet from "./cypherSnippetSet";

export default class CypherClause {
    
    constructor (properties) {
        properties = properties || {};

        var {
            keyword,
            clauseInfo,
            parsedVariables
        } = properties;

        this.keyword = keyword;
        this.clauseInfo = clauseInfo;
        this.parsedVariables = parsedVariables || [];

        // to help generate the proper RETURN a, b when generating debugging snippets
        this.debugSubQueryReturnHandler = null;
    }    

    toCypherString = () => {
        let clauseStr = (this.clauseInfo && this.clauseInfo.toCypherString) ? this.clauseInfo.toCypherString() : this.clauseInfo;
        // avoid double adding the keyword
        let keywordStr = `${this.keyword} `
        if (typeof(clauseStr) === 'string') {
            let clauseCheck = clauseStr.trim().toLowerCase();        
            let keywordCheck = keywordStr.toLowerCase()
            if (clauseCheck.startsWith(keywordCheck)) {
                keywordStr = '';
            }    
        }
        return `${keywordStr}${clauseStr}`;
    }

    getDebugCypherSnippetSet = (config = {}) => {
        // console.log('config: ', config);
        let { addNewLineIfCypherClause } = config;
        let optionalNewLine = (addNewLineIfCypherClause) ? '\n' : '';
        let snippetSet = new SnippetSet({
            opener: `${optionalNewLine}${this.keyword} `,
            associatedCypherObject: this,
            subQueryReturn: this.debugSubQueryReturnHandler
        });

        if (this.clauseInfo) {
            if (this.clauseInfo.getDebugCypherSnippetSet) {
                snippetSet.addOneOrMoreSnippets(this.clauseInfo.getDebugCypherSnippetSet(config));
            } else {
                snippetSet.addOneOrMoreSnippets(this.clauseInfo);
            }
        }

        snippetSet.cypherSnippet = snippetSet.computeCypherSnippet();
        return snippetSet;
    }

    getDebugCypherSnippets = (config) => {
        let snippetSet = this.getDebugCypherSnippetSet(config);
        let snippets = snippetSet.getSnippets();
        return snippets;
    }    
}