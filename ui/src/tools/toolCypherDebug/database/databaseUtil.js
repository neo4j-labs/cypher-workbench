import DataModel from '../../../dataModel/dataModel';
import ExecuteCypher from '../../common/execute/executeCypher';
import { getDataModelFromRawDbSchema } from '../../toolModel/importexport/importDbSchema';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import { Integer } from 'neo4j-driver';

const StatsQueries = {
    NodeCount: `MATCH (n) RETURN count(n) as count`,
    RelCount: `MATCH ()-[r]->() RETURN count(r) as count`,
    NodeLabelCounts: `
        CALL db.labels() YIELD label
        CALL apoc.cypher.run('MATCH (:\`'+label+'\`) RETURN count(*) as count',{}) YIELD value
        RETURN label, value.count as count
    `,
    RelTypeCounts: `
        CALL db.relationshipTypes() YIELD relationshipType as type
        CALL apoc.cypher.run('MATCH ()-[:\`'+type+'\`]->() RETURN count(*) as count',{}) YIELD value
        RETURN type, value.count as count
    `
}

const DbInfoQueries = {
    GetHomeDb: "SHOW HOME DATABASE YIELD name"
}

// use importDbSchema - 
//  upgrade importDbSchema to parse the new Constraint format (if error, don't stop keep going)
//  then enhance with 
//    CALL db.labels() YIELD label
//    CALL db.relationshipTypes() YIELD relationshipType as type
//    CALL db.schema.nodeTypeProperties()
//    TODO: CALL db.schema.relTypeProperties()
const ModelQueries = {
    DbSchemaVisualization: 'CALL db.schema.visualization()',
    NodeLabels: 'CALL db.labels()',
    NodeLabelProps: 'CALL db.schema.nodeTypeProperties()'
}

const convertInt = (integer) => {
    if (integer && integer.low !== undefined && integer.high !== undefined) {
        return parseInt(new Integer(integer.low, integer.high).toString());
    } else {
        return integer;
    }
}

const handleHighLowInt = (possibleHighLowInteger) => {
    if (possibleHighLowInteger 
            && possibleHighLowInteger.low !== undefined 
            && possibleHighLowInteger.high !== undefined
    ) {
        let int = new Integer(possibleHighLowInteger.low, possibleHighLowInteger.high);
        let javascriptInt = int.toInt();
        let stringInt = int.toString();
        if (parseInt(stringInt) === javascriptInt) {
            return javascriptInt;
        } else {
            return stringInt;
        }
    } else {
        return possibleHighLowInteger;
    }
}

export class DatabaseUtil {
    executeCypher = new ExecuteCypher();

    getActiveDatabase = () => {
        return new Promise((resolve, reject) => {
            let connectionInfo = getCurrentConnectionInfo();
            if (connectionInfo && connectionInfo.databaseName) {
                resolve(connectionInfo.databaseName);
            } else {
                this.runQuery(DbInfoQueries.GetHomeDb)
                    .then((result) => {
                        let dbName = result?.rows[0]?.name || 'default';
                        resolve(dbName);
                    })
                    .catch((error) => {
                        console.log('Error fetching home db: ', error);
                        resolve('default')
                    })
            }
    
        })
    }

    runQuery = (cypherQueryToRun) => {
        return new Promise((resolve, reject) => {
            try {
                this.executeCypher.runQuery(cypherQueryToRun, {}, null, (results) => {
                    var { headers, rows, isError } = results;
                    resolve({ 
                        headers, 
                        rows,
                        isError,
                        errorMessage: isError ? rows[0][headers[0]] : ''
                    });
                }, { dontStringify: true });
            } catch (e) {
                reject(e);
            }
        })
    }

    getDatabaseStatistics = () => {
        return new Promise((resolve, reject) => {
            let nodeCountPromise = this.runQuery(StatsQueries.NodeCount);
            let relCountPromise = this.runQuery(StatsQueries.RelCount);
            let nodeLabelCountsPromise = this.runQuery(StatsQueries.NodeLabelCounts);
            let relTypeCountsPromise = this.runQuery(StatsQueries.RelTypeCounts);
            Promise.all([
                nodeCountPromise, relCountPromise, 
                nodeLabelCountsPromise, relTypeCountsPromise
            ])
            .then((responses) => {
                // console.log('response: ', response);    
                let errorResponse = responses.find(response => response.isError)
                if (errorResponse) {
                    reject(errorResponse);
                    return;
                }

                let nodeCountResponse = responses[0];
                let relCountResponse = responses[1];
                let nodeLabelCountsResponse = responses[2];
                let relTypeCountsResponse = responses[3];

                let nodeCount = convertInt(nodeCountResponse.rows[0].count);
                let relCount = convertInt(relCountResponse.rows[0].count);

                let nodeLabelCounts = nodeLabelCountsResponse.rows.reduce((map, row) => {
                    map[row.label] = convertInt(row.count);
                    return map;
                }, {});
                let relTypeCounts = relTypeCountsResponse.rows.reduce((map, row) => {
                    map[row.type] = convertInt(row.count);
                    return map;
                }, {});

                resolve({
                    nodeCount, relCount,
                    nodeLabelCounts, relTypeCounts
                });
            })
            .catch(error => {
                // console.log("error: " + error);
                // alert("error: " + error);
                reject(error);
            });
        })

    }

    getDataModel = () => {
        return new Promise((resolve, reject) => {
            let vizPromise = this.runQuery(ModelQueries.DbSchemaVisualization);
            let labelsPromise = this.runQuery(ModelQueries.NodeLabels);
            // this is taking too long for large databases - tested against Partner AML
            // let propsPromise = this.runQuery(ModelQueries.NodeLabelProps);
            // Promise.all([vizPromise, labelsPromise, propsPromise])
            Promise.all([vizPromise, labelsPromise])
                .then((responses) => {
                    // console.log('response: ', response);
                    let errorResponse = responses.find(response => response.isError)
                    if (errorResponse) {
                        reject(errorResponse);
                        return;
                    }

                    let vizResponse = responses[0];
                    // console.log(vizResponse);
                    let labelsResponse = responses[1];
                    // let propsResponse = responses[2];

                    // var dataModel = DataModel();
                    let schemaJSON = vizResponse.rows[0];
                    var dataModel = getDataModelFromRawDbSchema(schemaJSON);

                    let labelPropMap = {};
                    // propsResponse.rows.forEach(row => {
                    //     let nodeLabel = row.nodeLabels[0] || '<no_label>';
                    //     let datatype = (row.propertyTypes && row.propertyTypes[0]) ? row.propertyTypes[0] : 'string'
                    //     if (row.propertyName) {
                    //         let propertyMap = {
                    //             key: row.propertyName, 
                    //             name: row.propertyName, 
                    //             datatype
                    //         }
                    //         let props = labelPropMap[nodeLabel] || [];
                    //         props.push(propertyMap);
                    //         labelPropMap[nodeLabel] = props;
                    //     }
                    // });
        
                    labelsResponse.rows.forEach(labelRow => {
                        let label = labelRow.label;
                        var nodeLabel = dataModel.getNodeLabelByLabel(label);
                        if (!nodeLabel) {
                            nodeLabel = new dataModel.NodeLabel({
                                label: label
                            });
                            dataModel.addNodeLabel(nodeLabel);
                        }
        
                        let props = labelPropMap[label] || [];
                        props.forEach(prop => {
                            let existingProp = nodeLabel.getPropertyByName(prop.name);
                            if (!existingProp) {
                                nodeLabel.addOrUpdateProperty(prop, { isPartOfKey: false });
                            }
                            // nodeLabel.setColor('#57C7E3');
                        })
                    }) 
                    // console.log('dataModel nodes: ', dataModel.getNodeLabelArray());       
                    resolve(dataModel);
                })
                .catch(error => {
                    // console.log("error: " + error);
                    // alert("error: " + error);
                    reject(error);
                });
        })
    }
}

// modified from the Hive / NeoDash GraphQL stuff I did
export const rewriteIntegers = (value) => {
    if (value === undefined) {
      return undefined;
    } else if (value === null) {
      return null;
    } else if (Array.isArray(value)) {
      return value.map((x) => rewriteIntegers(x));
    } else if (value && typeof value === 'object') {
      let possibleInt = handleHighLowInt(value);
      if (value !== possibleInt) {
        // it got converted, therefore return it
        return possibleInt;
      } else {
        return Object.keys(value).reduce((newValue, key) => {
            newValue[key] = rewriteIntegers(value[key]);
            return newValue;
          }, {});
      }
    } else {
        return value;
    }
  };

