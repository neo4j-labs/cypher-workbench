
import { getDbSchema } from '../../../persistence/graphql/GraphQLDBConnection';
import {
    runCypher,
    runCypherAsPromise,
    runCypherWithTransactionConfig
} from "../../../common/Cypher";
import { GetConstraintsDescription, GetIndexes} from '../components/ModelDatabaseValidationCypher';
import { 
    parseConstraintDescription
} from '../../../dataModel/neo4jdb/constraints';
import {
    processDbIndexesRow
} from '../../../dataModel/neo4jdb/indexes';

export const enhanceDataModelWithConstraintsAndIndexes = async (dataModel, setStatus) => {

    var getConstraintsPromise = runCypherAsPromise(GetConstraintsDescription, {});
    var getIndexesPromise = runCypherAsPromise(GetIndexes, {});
    
    var allPromises = Promise.all([getConstraintsPromise, getIndexesPromise]);
    try {
        const values = await allPromises;
        var constraintsResponse = values[0];
        var indexesResponse = values[1];

        if (constraintsResponse && constraintsResponse.results && constraintsResponse.results.rows) {
            var descriptionArray = constraintsResponse.results.rows.map(row => row['description']);
            var constraintDataModels = descriptionArray
                // TODO: switch this to processConstraintRow
                .map(description => parseConstraintDescription(description))
                .filter(dataModel => dataModel);    // get rid of nulls

            constraintDataModels.map(constraintDataModel => {
                constraintDataModel.getNodeLabelArray().map(constraintNodeLabel => {
                    var nodeLabel = dataModel.getNodeLabelByLabel(constraintNodeLabel.label);
                    if (nodeLabel) {
                        Object.values(constraintNodeLabel.properties).map(constraintProperty => {
                            var property = nodeLabel.getPropertyByName(constraintProperty.name);
                            if (!property) {
                                property = nodeLabel.addProperty({
                                    name: constraintProperty.name
                                });
                            }
                            // apply constraint info
                            var isPartOfKey = property.isPartOfKey;
                            var hasUniqueConstraint = property.hasUniqueConstraint;
                            var mustExist = property.mustExist;
                            var isIndexed = property.isIndexed;
                            if (constraintProperty.isPartOfKey) {
                                isPartOfKey = true;
                                hasUniqueConstraint = true;
                                isIndexed = true;
                                mustExist = true;
                            }
                            if (constraintProperty.hasUniqueConstraint) {
                                hasUniqueConstraint = true;
                                isIndexed = true;
                            }
                            property.isPartOfKey = isPartOfKey;
                            property.hasUniqueConstraint = hasUniqueConstraint;
                            property.isIndexed = isIndexed;
                            property.mustExist = mustExist;
                        });
                    }
                });

                constraintDataModel.getRelationshipTypeArray().map(constraintRelationshipType => {
                     dataModel.getRelationshipTypesByType(constraintRelationshipType.type)
                        .map(relationshipType => {
                            Object.values(constraintRelationshipType.properties).map(constraintProperty => {
                                var property = relationshipType.getPropertyByName(constraintProperty.name);
                                if (!property) {
                                    property = relationshipType.addProperty({
                                        name: constraintProperty.name
                                    });
                                }                                
                                // apply constraint info
                                property.mustExist = (constraintProperty.mustExist) ? true : property.mustExist;
                            });
                        })
                });
            });
        }

        if (indexesResponse && indexesResponse.results && indexesResponse.results.rows) {
            var indexDataModels = indexesResponse.results.rows
                .map(row => processDbIndexesRow(row))
                .filter(dataModel => dataModel);    // get rid of nulls

            indexDataModels.map(indexDataModel => {
                indexDataModel.getNodeLabelArray().map(indexNodeLabel => {
                    var nodeLabel = dataModel.getNodeLabelByLabel(indexNodeLabel.label);
                    if (nodeLabel) {
                        var indexProperties = Object.values(indexNodeLabel.properties);
                        // handling single property index only here
                        if (indexProperties.length === 1) {
                            var indexProperty = indexProperties[0];
                            var property = nodeLabel.getPropertyByName(indexProperty.name);
                            if (!property) {
                                property = nodeLabel.addProperty({
                                    name: indexProperty.name
                                });
                            }                            
                            // apply index info
                            property.isIndexed = (indexProperty.isIndexed) ? true : property.isIndexed;
                        } 
                        // composite indexes here
                        indexNodeLabel.getIndexes().map(compositeIndex => {
                            // in the index data model, the properties have the same key and name
                            //  but in the actual data model, this is not the case
                            //  we need to fix that, and we need to ensure that the property exists if not present
                            var nodeLabelProperties = 
                                compositeIndex.propertyDefinitionKeys.map(propertyDefinitionKey => {
                                    // propertyDefinitionKey is actually the property name
                                    var property = nodeLabel.getPropertyByName(propertyDefinitionKey);
                                    if (!property) {
                                        property = nodeLabel.addProperty({name: propertyDefinitionKey }, {}, true);
                                    }
                                    return property;
                                });
                            var compositeIndexInfo = {
                                indexName: compositeIndex.indexName,
                                propertyDefinitionKeys: nodeLabelProperties.map(x => x.key)
                            }
                            nodeLabel.addIndex(compositeIndexInfo, true);
                        });
                    }
                });
            })
        }

      } catch (error) {
        setStatus(error, false);
        alert(error);
      }
}

// the goal of this function is to check and see if there are any NodeLabels that meet the following criteria:
//   1) Have all or a subset of the same properties
//      as a different node label that has at least 1 constraint or index
//   2) Have all or a subset of the same relationship types 
//      as a different node label that has at least 1 constraint or index
//   3) Have no explicit constraints / indexes, but has at least 1 relationship
//  if the above criteria are met, then it should become a secondary node label of the node label it matches
//    if multiple matches, pick the one with the most constraints indexes
export const runSecondaryNodeLabelPostProcessing = (dataModel) => {
    var nodeLabels = dataModel.getNodeLabelArray();
    var nodeLabelsWithNoConstraintsOrIndexes = nodeLabels
        .filter(x => {
            const hasConstraintOrIndex = Object.values(x.properties).find(p => 
                p.isPartOfKey || p.hasUniqueConstraint || p.isIndexed || p.mustExist
            )
            var outboundRels = dataModel.getOutboundRelationshipTypesForNodeLabelByKey(x.key) || [];            
            if (hasConstraintOrIndex || x.getIndexes().length > 0 || outboundRels.length === 0) {
                return false;
            } else {
                return true;
            }
        })
        ;

    var nodeLabelsToCheck = nodeLabels.filter(x => !nodeLabelsWithNoConstraintsOrIndexes.includes(x));

    var outboundRelMap = dataModel.getOutboundNodeLabelKeyRelationshipTypeMap();
    nodeLabelsWithNoConstraintsOrIndexes.map(nodeLabel => {
        //console.log('nodeLabel label: ', nodeLabel.label);
        var aOutboundRels = dataModel.getOutboundRelationshipTypesForNodeLabelByKey(nodeLabel.key) || [];
        //console.log('aOutboundRels: ', aOutboundRels.map(x => x.type).join(','))
        var matches = nodeLabelsToCheck
            // try to find a matching node label where all property names exist
            .filter(x => {
                //console.log('checking properties against: ', x.label);
                var aPropNames = Object.values(nodeLabel.properties).map(x => x.name);
                var bPropNames = Object.values(x.properties).map(x => x.name);
                var matchingProps = aPropNames.filter(aPropName => bPropNames.includes(aPropName));
                var returnVal = (matchingProps.length === aPropNames.length) ? true : false;
                //console.log('prop returnVal: ', returnVal);
                return returnVal;
            })
            // now further filter it down by relationship types
            .filter(x => {
                //console.log('checking rels against: ', x.label);
                var bOutboundRels = outboundRelMap[x.key] || [];
                //console.log('bOutboundRels: ', bOutboundRels.map(x => x.type).join(','))

                var matchingRels = aOutboundRels.filter(aRel => {
                    //console.log('aRel: ', aRel);
                    var result = bOutboundRels.findIndex(bRel => aRel.typeAndPropsAndEndNodeLabelMatch(bRel)) >= 0;
                    return result;
                })
                //console.log('matchingRels: ', matchingRels);
                var returnVal = (matchingRels.length === aOutboundRels.length) ? true : false;
                //console.log('rel returnVal: ', returnVal);
                return returnVal;
            });
        //console.log('matches: ', matches);
        if (matches && matches.length > 0) {
            // we have found at least 1 that matches all of the criteria
            // sort by how many have most constraints/indexes
            matches.sort((a,b) => {
                const A_howManyConstraintsIndexes = Object.values(a.properties)
                    .filter(p => p.isPartOfKey || p.hasUniqueConstraint || p.isIndexed || p.mustExist)               
                    .length;
                
                const B_howManyConstraintsIndexes = Object.values(b.properties)
                    .filter(p => p.isPartOfKey || p.hasUniqueConstraint || p.isIndexed || p.mustExist)               
                    .length;

                // sort desc
                return (B_howManyConstraintsIndexes - A_howManyConstraintsIndexes);
            });
            // change nodeLabel to secondary node label, get rid of properties and outbound relationships
            nodeLabel.setIsOnlySecondaryNodeLabel(true, true);
            nodeLabel.properties = {};
            aOutboundRels.map(rel => dataModel.removeRelationshipTypeByKey(rel.key));

            // take top match - this is out primary node label
            var primaryNodeLabel = matches[0];
            dataModel.addSecondaryNodeLabel(primaryNodeLabel, nodeLabel);            
        }
    });
}

export const importFromDatabase = (connectionInfo, processCypherResult, setStatus) => {

    var connectionEncrypted = (connectionInfo && connectionInfo.encrypted);
    var isLocalhost = (connectionInfo && connectionInfo.url && connectionInfo.url.match(/\/\/localhost/));

    if (connectionInfo && !connectionEncrypted && !isLocalhost) {
        getDbSchema(connectionInfo, (result) => {
            if (result.success) {
                processCypherResult(result.data.cypherFunction, result.data.jsonSchema);
            } else {
                setStatus(result.error, false);
                alert(result.error);
            }
        });
    } else {
        runCypherWithTransactionConfig("CALL apoc.meta.schema()", {}, { timeout: 30000 }, (results) => {
            if (results && results.rows && results.rows.length > 0) {
                var jsonSchema = results.rows[0].value;
                if (jsonSchema) {
                    processCypherResult('apoc.meta.schema', jsonSchema);
                } else {
                    setStatus("apoc.meta.schema did not return a json response", false);
                    alert("apoc.meta.schema did not return a json response");
                }
            } else {
                setStatus("apoc.meta.schema did not return any data", false);
                alert("apoc.meta.schema did not return any data");
            }
        }, (error) => {
            var errorMessage = '' + error;
            if (errorMessage.match(/There is no procedure with the name `apoc.meta.schema` registered for this database instance/)
             || errorMessage.match(/apoc.meta.schema is unavailable/)
             || errorMessage.match(/The transaction has been terminated. Retry your operation in a new transaction/)
            ) {
                runCypher("CALL db.schema.visualization()", {}, (results) => {
                    if (results && results.rows && results.rows.length > 0) {
                        var jsonSchema = results.rows[0];
                        processCypherResult('db.schema.visualization', jsonSchema);
                    } else {
                        setStatus("db.schema.visualization did not return a response", false);
                        alert("db.schema.visualization did not return a response");
                    }
                }, (error2) => {
                    setStatus(error2, false);
                    alert('Error importing schema: ' + error2);
                });
            } else {
                setStatus(error, false);
                alert('Error importing schema: ' + error);
            }
        });
    }
}
