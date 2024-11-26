

export const SKIP_CLAUSE_DEFAULT_SKIP = '';

export class SkipClause {
    constructor (properties) {
        properties = properties || {};
        var { skip } = properties;

        this.skip = (skip !== undefined) ? skip : SKIP_CLAUSE_DEFAULT_SKIP;
    }

    getSkip = () => this.skip;
    setSkip = (skip) => {
        this.skip = skip;
        return this;
    }

    toCypherString = () => `SKIP ${this.skip}`;
}