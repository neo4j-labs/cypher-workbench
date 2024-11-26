
export const LIMIT_CLAUSE_DEFAULT_LIMIT = '';

export class LimitClause {
    constructor (properties) {
        properties = properties || {};
        var { limit } = properties;

        this.limit = (limit !== undefined) ? limit : LIMIT_CLAUSE_DEFAULT_LIMIT;
    }

    getLimit = () => this.limit;
    setLimit = (limit) => {
        this.limit = limit;
        return this;
    }

    toCypherString = () => `LIMIT ${this.limit}`;
}