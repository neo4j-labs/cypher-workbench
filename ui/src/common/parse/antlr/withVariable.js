
export class WithVariable {

    constructor (properties) {
        properties = properties || {};
        var {
            key,
            expression, 
            variable,
        } = properties;

        this.key = key;
        this.expression = expression;
        this.variable = variable;
    }

    isAliased = () => (this.expression && this.variable) ? true : false;
    isAsterisk = () => (this.expression === '*') ? true : false;

    isEqualTo = (variable) => variable 
                && this.key === variable.key 
                && this.expression === variable.expression
                && this.variable === variable.variable
}