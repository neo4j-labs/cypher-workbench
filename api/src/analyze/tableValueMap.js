
import { isDate } from "neo4j-driver";
import DataTypes from "./DataTypes";
import { DateTime } from "luxon";

export class TableValueMap {
    headers = [];
    valueMap = {};
}

export class ValueMapAnalysis {
    totalSize = 0;
    numberOfValues = 0;
    numberOfEmpties = 0;
    percentOfValues = 0;
    percentUnique = 0;
    frequencyOfDataTypes = {};
    frequencyOfValues = {};
}

class ValueAndType {
    originalValue;
    convertedValue;
    type = DataTypes.String;
}

class ValueMapAnalyzerInternal {

    analyze = (tableValueMap, header, limit) => {
        let values = tableValueMap.valueMap[header];
        if (isInteger(limit) && limit > 0) {
           values = values.slice(0,limit);
        }
        const analysis = new ValueMapAnalysis();

        analysis.totalSize = values.length;
        analysis.numberOfValues = values.filter(x => x !== undefined && x !== null && x !== '').length;
        analysis.numberOfEmpties = analysis.totalSize - analysis.numberOfValues;
        analysis.percentOfValues = (analysis.totalSize > 0) ? analysis.numberOfValues / analysis.totalSize : 0;

        const convertedValuesAndTypes = values
                .filter(x => x !== undefined && x !== null && x !== '')
                .map(value => this.determineDataTypeAndConvertValue(value));

        convertedValuesAndTypes.forEach(convertedValueAndType => {
            let dataTypeCount = analysis.frequencyOfDataTypes[convertedValueAndType.type];
            analysis.frequencyOfDataTypes[convertedValueAndType.type] = (dataTypeCount === undefined) ? 1 : dataTypeCount + 1;

            let valueCount = analysis.frequencyOfValues[convertedValueAndType.convertedValue];
            analysis.frequencyOfValues[convertedValueAndType.convertedValue] = (valueCount === undefined) ? 1 : valueCount + 1;
        })

        if (analysis.numberOfValues > 0) {
            analysis.percentUnique = Object.keys(analysis.frequencyOfValues).length / analysis.numberOfValues;
        }     

        return analysis;   
    }

    determineDataTypeAndConvertValue = (value) => {
        const valueAndType = new ValueAndType();
        valueAndType.originalValue = value;
        valueAndType.convertedValue = value;

        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
            valueAndType.convertedValue = (lowerValue === 'true');
            valueAndType.type = DataTypes.Boolean;
        } else if (value.match(/^[\d\.\$\%]+$/)) {
            var number = parseFloat(value);
            if (!isNaN(number)) {
                if (Math.floor(number) === number) {
                    valueAndType.convertedValue = parseInt(number);
                    valueAndType.type = DataTypes.Integer;
                } else {
                    valueAndType.convertedValue = number;
                    valueAndType.type = DataTypes.Float;
                }
            } 
        } else if (isDateString(value)) {
            var date = new Date(value);
            if (date !== 'Invalid Date') {
                valueAndType.convertedValue = date;
                valueAndType.type = DataTypes.Date;
            }
        }
        return valueAndType;
    }
}

const dateFuncsToTry = [
    DateTime.fromISO, DateTime.fromRFC2822, DateTime.fromHTTP, DateTime.fromSQL
];

const dateFormatsToTry = [
    "MMMM d yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "MM-dd-yyyy", "dd-MM-yyyy",
    "MM/dd/yy", "dd/MM/yy", "MM-dd-yy", "dd-MM-yy",
]

// note to convert a Luxon DateTime to a JS Date use d.toJSDate where d is a luxon DateTime

export const isDateString = (value) => 
    dateFuncsToTry.some(dateFunc => dateFunc(value).isValid) ||
    dateFormatsToTry.some(dateFormat => DateTime.fromFormat(value, dateFormat).isValid);

export const isInteger = (value) => {
    if (typeof(value) === 'number') {
        if (Math.floor(value) === value) {
            return true;
        }
    }
    return false;
}

export const ValueMapAnalyzer = new ValueMapAnalyzerInternal();

