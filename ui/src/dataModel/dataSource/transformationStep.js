

export class TransformationStep {
    constructor (properties) {
        properties = properties || {};
        var { transformations } = properties;
        this.transformations = transformations;
    }

    toCypher = () => {
        var cypher = 'WITH ';
        cypher += this.transformations.map(x => {
            const cypher = x.toCypher();
            return cypher;
        }).join(', ');
        return cypher;
    }
}