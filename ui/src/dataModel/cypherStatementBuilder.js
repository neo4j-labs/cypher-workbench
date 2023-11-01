
import { 
    NodePattern, 
    RelationshipPattern,
    PathPattern,
    PatternPart,
    PatternElementChainLink,
    Pattern
} from './cypherPattern';

export class CypherStatementBuilder {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            variableScope 
        } = properties;

        this.variableScope = variableScope;
    }

    setVariableScope = (variableScope) => this.variableScope = variableScope;

    node = () => new NodePattern({ variableScope: this.variableScope });
    rel = () => new RelationshipPattern({ variableScope: this.variableScope });
    path = () => new PathPattern({ variableScope: this.variableScope });
    link = () => new PatternElementChainLink({ variableScope: this.variableScope });
    part = () => new PatternPart({ variableScope: this.variableScope });
    pattern = () => new Pattern({ variableScope: this.variableScope });
}