import Papa from 'papaparse';
import fs from 'fs';
import { TableValueMap, ValueMapAnalyzer } from './tableValueMap';

export function readCsvAsTableValueMap (file) {

    // When the file is a local file when need to convert to a file Obj.
    //  This step may not be necissary when uploading via UI
    var text = fs.readFileSync(file, "utf8");

    var results = Papa.parse(text, { header: true });

    var tableValueMap = new TableValueMap();
    if (results && results.data && results.data.length > 0) {
      if (results.meta && results.meta.fields) {
        tableValueMap.headers = results.meta.fields.slice();
        results.meta.fields.map(x => {
            tableValueMap.valueMap[x] = [];
        })
        results.data.forEach(row => {
            results.meta.fields.forEach(x => {
                var value = row[x];
                tableValueMap.valueMap[x].push(value);
                /*
                if (row.__parsed_extra) {
                  value += row.__parsed_extra.join('');
                }
                */
            })
          })
        }
    }
    return tableValueMap;
}

// check out graphUtil.js -- has a way to get the data type based on an input value, 
//  may need to change because I'll need to do parseFloat, etc

// also checkout cypherStringConverter.js

function testReadCsv () {
    var file = '/file_to_analyze.csv';
    const tableValueMap = readCsvAsTableValueMap(file);
    tableValueMap.headers.slice(0,10).forEach(header => {
        console.log(`${header}:${tableValueMap.valueMap[header].slice(0,3)}`);
        const analysis = ValueMapAnalyzer.analyze(tableValueMap, header, 10);
        
        console.log(`totalSize: ${analysis.totalSize}`);
        console.log(`numberOfValues: ${analysis.numberOfValues}`);
        console.log(`numberOfEmpties: ${analysis.numberOfEmpties}`);
        console.log(`percentOfValues: ${analysis.percentOfValues}`);
        console.log(`percentUnique: ${analysis.percentUnique}`);
        console.log(`frequencyOfDataTypes: ${JSON.stringify(analysis.frequencyOfDataTypes)}`);
        //console.log(analysis.frequencyOfValues);        
        console.log();        
    })
}

testReadCsv();