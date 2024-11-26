import CypherClause from "./cypherClause";
import SnippetSet from "./cypherSnippetSet";
import { getCypherStringFromClauses } from './cypherStringConverter';

export default class UnionClause {
    
    constructor (properties) {
        properties = properties || {};

        var {
            firstClauses,
            secondClauses,
            keyword
        } = properties;

        this.keyword = keyword;
        this.firstClauses = (firstClauses) ? firstClauses : [];
        this.secondClauses = (secondClauses) ? secondClauses : [];
    }    

    toCypherString = () => {
        let firstClausesCypher = getCypherStringFromClauses(this.firstClauses);
        let secondClausesCypher = getCypherStringFromClauses(this.secondClauses);
        return `${firstClausesCypher}\n${this.keyword}\n${secondClausesCypher}`;
    }

    // this is a helper function to return the union in the correct line order to assist with debugging
    getOrderedClauses = () => {
        let orderedClauses = [];

        let firstClauses = this.firstClauses.reduce((acc, clause) => {
            if (clause instanceof UnionClause) {
                return acc.concat(clause.getOrderedClauses())
            } else {
                return acc.concat([clause]);
            }
        }, []);

        let secondClauses = this.secondClauses.reduce((acc, clause) => {
            if (clause instanceof UnionClause) {
                return acc.concat(clause.getOrderedClauses())
            } else {
                return acc.concat([clause]);
            }
        }, []);        

        orderedClauses = orderedClauses.concat(firstClauses);
        orderedClauses.push(new CypherClause({
            keyword: this.keyword,
            clauseInfo: ''
        }));
        orderedClauses = orderedClauses.concat(secondClauses);

        return orderedClauses;
    }

    getDebugCypherSnippetSet = (config) => {

        let snippetSet = new SnippetSet({
            id: 'union',
            associatedCypherObject: this
        });
        
        this.firstClauses.forEach((clause, i) => {
            snippetSet.addOneOrMoreSnippets(clause.getDebugCypherSnippetSet({
                config,
                addNewLineIfCypherClause: (i > 0)
            }));
        })

        let keywordSnippetSet = new SnippetSet({
            opener: `\n${this.keyword}`,
            skipMe: true
        })
        keywordSnippetSet.cypherSnippet = keywordSnippetSet.computeCypherSnippet();

        snippetSet.addOneOrMoreSnippets(keywordSnippetSet);

        this.secondClauses.forEach(clause => {
            snippetSet.addOneOrMoreSnippets(clause.getDebugCypherSnippetSet({
                config,
                addNewLineIfCypherClause: true
            }));
        })

        snippetSet.cypherSnippet = snippetSet.computeCypherSnippet();

        return snippetSet;
    }      

    getDebugCypherSnippets = (config) => {
        var snippetSet = this.getDebugCypherSnippetSet(config);
        var snippets = snippetSet.getSnippets();
        return snippets;
    }    
}