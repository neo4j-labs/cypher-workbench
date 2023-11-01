
import { cypherFunctions } from './allFunctions';

export class CypherFunctionHelper {

    functions = [];
    functionPrefixes = [];

    constructor () {
        //console.log(cypherFunctions);
        var functionLines = cypherFunctions.split('\n');
        functionLines
            .map(x => x.trim())
            .filter(x => x)
            .map(x => {
                if (!this.functions.includes(x)) {
                    this.functions.push(x);
                }
            });

        this.functions.sort();

        this.functions
            .map(x => x.split('.'))
            .filter(tokens => tokens.length > 1)
            .map(tokens => {
                var prefix = '';
                for (var i = 0; i < tokens.length - 1; i++) {
                    if (prefix) prefix += '.';
                    prefix += tokens[i];
                    if (!this.functionPrefixes.includes(prefix)) {
                        this.functionPrefixes.push(prefix);
                    }
                }
            });
    }

    getFunctions = () => this.functions.slice();
    getFunctionPrefixes = () => this.functionPrefixes.slice();
}