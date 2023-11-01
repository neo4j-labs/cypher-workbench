

export class MergeInstruction {
    constructor (properties) {
        properties = properties || {};
        var {
            patternPart,
            onMatchSetItems,
            onCreateSetItems
        } = properties;
        this.patternPart = patternPart;
        this.onMatchSetItems = onMatchSetItems;
        this.onCreateSetItems = onCreateSetItems;
    }

    toCypher = () => {
        var cypher = `MERGE ${this.patternPart.toCypherString()}`;
        if (this.onCreateSetItems) {
            cypher += `\n  ON CREATE ${this.onCreateSetItems.toCypher()}`;
        }
        if (this.onMatchSetItems) {
            cypher += `\n  ON MATCH ${this.onMatchSetItems.toCypher()}`;
        }
        return cypher;
    }
}

export class SetItem {
    constructor (properties) {
        properties = properties || {};
        var { 
            leftExpr,
            operator,
            rightExpr
        } = properties;
        this.leftExpr = leftExpr;
        this.operator = operator;
        this.rightExpr = rightExpr;
    }   

    toCypher = () => (this.operator) 
        ? `${this.leftExpr} ${this.operator} ${this.rightExpr}`
        : `${this.leftExpr}${this.rightExpr}`   // for setting NodeLabels, e.g. SET person:Person:Actor
}

export class SetItems {
    constructor (properties) {
        properties = properties || {};
        var { setItems } = properties;
        this.setItems = setItems || [];
    }

    toCypher = () => 'SET ' + this.setItems.map(x => x.toCypher()).join(', ');
}