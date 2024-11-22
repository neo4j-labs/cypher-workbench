
import { returnItem } from "../../../dataModel/cypherReturn";
import {
    getCurrentConnectionInfo,
    runCypherWithTransactionConfig,
  } from "../../../common/Cypher";
  
export default class ExecuteCypher {

    processResults = (results, returnItems, options) => {
        const dontStringify = (options.dontStringify) ? true : false;

        let transformedResults = {
            headers:
                results.headers.length === 0
                    ? returnItems.map((x) => x.getResultHeader())
                    : results.headers,
            rows: results.rows.map((row) => {
                var newRow = {};
                Object.keys(row).map((rowKey) => {
                    var value = row[rowKey];
                    var constructor =
                    value && value.constructor && value.constructor.name
                        ? value.constructor.name
                        : "";
                    if (constructor === "Node") {
                        newRow[rowKey] = (dontStringify) ? value
                            : `${JSON.stringify(value.labels)} ${JSON.stringify(value.properties)}`;
                    } else if (constructor === "Relationship") {
                        newRow[rowKey] = (dontStringify) ? value
                            : `${JSON.stringify(value.type)} ${JSON.stringify(value.properties)}`;
                    } else if (typeof value === "object") {
                        newRow[rowKey] = (dontStringify) ? value
                            : JSON.stringify(value);
                    } else {
                        newRow[rowKey] = value;
                    }
                });
                return newRow;
            }),
        };
        return transformedResults;
    }

    validateOptions = (options) => {
        options = options || {};
        if (options.timeout === undefined) {
            options.timeout = 60000;
        }
        if (options.resultLimit === undefined) {
            options.resultLimit = 1000;
        }
        return options;
    }

    getErrorResults = (error) => {
        const errorMessage =
            typeof error === "string" ? error : error.message;
        const errorResults = {
            headers: ["Cypher Error"],
            rows: [{ ["Cypher Error"]: `${errorMessage}` }],
            isError: true,
        };
        return errorResults;
    }

    getFakeResults = (returnItems) => {
        var headers = returnItems.map((x) => x.getResultHeader());
        var fakeRow = {};
        headers.map((header) => {
            fakeRow[header] = "Not connected";
        });
        const fakeResults = {
            headers: headers,
            rows: [fakeRow],
            isError: true,
        };
        return fakeResults;
    }

    runQuery = (cypherQueryToRun, cypherParameters, lastReturnClause, callback, options) => {

        options = this.validateOptions(options);

        var returnItems = lastReturnClause
          ? lastReturnClause.getReturnItems()
          : [returnItem("No return items")];

        if (cypherQueryToRun && getCurrentConnectionInfo()) {
            // we have an active connection
            runCypherWithTransactionConfig(
                cypherQueryToRun,
                cypherParameters,
                { timeout: options.timeout, resultLimit: options.resultLimit },
                (results) => {
                    //console.log('results: ', cypherQuery, results);
                    let transformedResults = this.processResults(results, returnItems, options);
                    if (callback) {
                        callback(transformedResults);
                    }
                },
                (error) => {
                    //console.log('error runningCypher:', cypherQuery, error);
                    let errorResults = this.getErrorResults(error)
                    if (callback) {
                        callback(errorResults);
                    }
                }
            );
        } else {
            let fakeResults = this.getFakeResults(returnItems);
            if (callback) {
                callback(fakeResults);
            }
        }
      };

    runQueryAsPromise = (cypherQueryToRun, cypherParameters, lastReturnClause, options) => {
        return new Promise((resolve, reject) => {
            this.runQuery(cypherQueryToRun, cypherParameters, lastReturnClause, (results) => {
                resolve(results);
            }, options);
        });
    };
}