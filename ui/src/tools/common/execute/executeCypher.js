
import { returnItem } from "../../../dataModel/cypherReturn";
import {
    getCurrentConnectionInfo,
    runCypherWithTransactionConfig,
  } from "../../../common/Cypher";
  
export default class ExecuteCypher {

    updateResultsPanel = (cypherQueryToRun, lastReturnClause, callback, options) => {

        options = options || {};
        const dontStringify = (options.dontStringify) ? true : false;

        //var { cypherQuery } = this.state;
        //cypherQueryToRun = cypherQueryToRun ? cypherQueryToRun : cypherQuery;
        //var lastReturnClause = this.cypherBlockDataProvider.getLastReturnClause();
        var returnItems = lastReturnClause
          ? lastReturnClause.getReturnItems()
          : [returnItem("No return items")];

        if (cypherQueryToRun && getCurrentConnectionInfo()) {
            // we have an active connection
            runCypherWithTransactionConfig(
                cypherQueryToRun,
                {},
                { timeout: 60000 },
                (results) => {
                    //console.log('results: ', cypherQuery, results);
                    results = {
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

                    //this.resultsTableRef.current.setData(results);
                    if (callback) {
                        callback(results);
                    }
                },
                (error) => {
                    //console.log('error runningCypher:', cypherQuery, error);
                    const errorMessage =
                        typeof error === "string" ? error : error.message;
                    const errorResults = {
                        headers: ["Cypher Error"],
                        rows: [{ ["Cypher Error"]: `${errorMessage}` }],
                        isError: true,
                    };
                    //this.resultsTableRef.current.setData(errorResults);
                    if (callback) {
                        callback(errorResults);
                    }
                }
            );
        } else {
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
            //this.resultsTableRef.current.setData(fakeResults);
            if (callback) {
                callback(fakeResults);
            }
        }
      };
    
}