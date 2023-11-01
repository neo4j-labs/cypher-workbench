

export default class CypherClause {
    
    constructor (properties) {
        properties = properties || {};

        var {
            keyword,
            clauseInfo
        } = properties;

        this.keyword = keyword;
        this.clauseInfo = clauseInfo;
    }    

}