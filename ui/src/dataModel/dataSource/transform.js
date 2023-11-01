import { map } from "lodash";
import DataTypes from "../DataTypes";
import { ColumnSource } from "./dataMapping";



export class Transform {

    constructor (properties) {
        properties = properties || {};
        var {
            input,  // is a TransformInput
            outputName
        } = properties;

        this.input = input;
        this.outputName = outputName;
    }

    // should return a TransformOutput
    transform = () => {}

    // returns a string
    toCypher = () => {}
}

export class TransformInput {
    constructor (properties) {
        properties = properties || {};
        var { 
            inputValue,  // is this needed?
            inputVariable,
            inputDatatype,
            inputName
        } = properties;

        this.inputValue = inputValue;
        this.inputVariable = inputVariable;
        this.inputDatatype = inputDatatype;
        this.inputName = inputName;
    }
}

export class TransformOutput {
    constructor (properties) {
        properties = properties || {};
        var { 
            outputValue,
            outputVariable,
            outputDatatype,
            outputName
        } = properties;

        this.outputValue = outputValue;
        this.outputVariable = outputVariable;
        this.outputDatatype = outputDatatype;
        this.outputName = outputName;
    }
}

export class NoOpTransform extends Transform {
    constructor (properties) {
        super(properties);
    }

    getOutputFromInput = (input) => {
        if (input) {
            const { inputValue, inputDatatype } = input;
            return new TransformOutput({
                outputValue: inputValue,
                outputDatatype: inputDatatype,
                outputName: this.outputName
            });
        } else {
            return null;
        }
    }

    // returns a string
    getCypherOutputFromInput = (input) => {
        if (input) {
            var { inputValue, inputVariable, inputDatatype } = input;
            inputValue = (inputValue !== undefined && inputValue !== null) ? inputValue : '';
            if (!inputVariable && inputDatatype === DataTypes.String) {
                return `'${inputValue}'`;
            } else {
                const returnVal = inputValue || inputVariable;
                return `${returnVal}`;
            }
        } else {
            return 'null';
        }
    }    
    
    transform = () => {
        if (Array.isArray(this.input)) {
            return this.input.map(input => this.getOutputFromInput(input));
        } else {
            return this.getOutputFromInput(this.input);
        }
    }

    toCypher = () => {
        if (Array.isArray(this.input)) {
            return this.input.map(input => this.getCypherOutputFromInput(input));
        } else {
            return this.getCypherOutputFromInput(this.input);
        }
    }

}

export class DataTypeConversionTransform extends Transform {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        const { 
            convertTo 
        } = properties;

        this.convertTo = convertTo;
    }
    
    transform = () => {
        const { inputValue, inputDatatype } = this.input;
        var newValue = inputValue;

        if (inputDatatype !== this.convertTo) {
            switch (this.convertTo) {
                case DataTypes.Integer:
                    newValue = parseInt(`${inputValue}`);
                    break;
                default: 
                    newValue = `${inputValue}`;
                    break;
            }
        }

        return new TransformOutput({
            outputValue: newValue,
            outputDatatype: this.convertTo,
            outputName: this.outputName
        })
    }

    toCypher = () => {
        const { inputValue, inputVariable, inputName } = this.input;
        var newValue = inputValue;

        if (inputVariable) {
            const arg = (inputName) ? `${inputVariable}.${inputName}` : inputVariable;
            switch (this.convertTo) {
                case DataTypes.Integer:
                    newValue = `toInteger(${arg}) AS ${this.outputName}`;
                    break;
            }
        }
        return newValue;
    }
}

export class JoinTransform extends Transform {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var { sourceVariable, joiner } = properties;
        this.sourceVariable = sourceVariable;
        this.joiner = joiner;
    }

    transform = () => {
        // TODO
    }

    toCypher = () => {
        if (Array.isArray(this.input)) {
            const inputs = this.input
                .map(x => {
                    if (x instanceof ColumnSource) {
                        const value = (this.sourceVariable) 
                            ? `${this.sourceVariable}.${x.columnDefinition.name}`
                            : `${x.columnDefinition.name}`;
                        return value;
                    } else {
                        return x;
                    }
                })
                .join(', ')
            return `apoc.text.join([${inputs}], '${this.joiner}') AS ${this.outputName}`; 
        } else {
            return 'Error: input for JoinTransform must be an array'
        }
    }
    
}

export class SubstringTransform extends Transform {
    constructor (properties) {
        super(properties);
    }
    
}

export class AppendTransform extends Transform {
    constructor (properties) {
        super(properties);
    }
    
}


