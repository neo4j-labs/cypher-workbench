
import {
    currentlyConnectedToNeo,
    runCypher,
    connectionIsProxied
} from "../../../common/Cypher";
import { 
    CountNodesByLabel,
    CountRelationshipTypesSpecifyDataModel,
    GetConstraintsDescription,
    GetIndexes
} from './ModelDatabaseValidationCypher';
import { 
    getRelationshipTypeDescWithNodeLabels,
} from "./ModelValidation";
import { ValidationStatus } from '../../common/validation/ValidationStatus';
import { smartQuote } from '../../../dataModel/helper';
import { 
    parseConstraintDescription
} from '../../../dataModel/neo4jdb/constraints';
import {
    processDbIndexesRow
} from '../../../dataModel/neo4jdb/indexes';
import { Integer } from "neo4j-driver";

export const validateRelationshipTypesAgainstDatabase = (dataModel, updateState) => {
    var relationshipTypeDatabaseValidations = [];

    if (currentlyConnectedToNeo()) {
        if (connectionIsProxied()) {
            relationshipTypeDatabaseValidations.push({
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: "Database validation of relationships not allowed on proxied connections",
            });
            updateState(relationshipTypeDatabaseValidations);
            return;
        }

        updateState([{
            validationStatus: ValidationStatus.ValidationInProgress,
            validationMessage: "Running Relationship Type validation query",
        }], {dontUpdateValidationMessage: true});

        var nodeLabelRelTypeMap = dataModel.getOutboundNodeLabelStringRelationshipTypeStringMap();
        runCypher(CountRelationshipTypesSpecifyDataModel, {
            dataModel: nodeLabelRelTypeMap, 
            limit: 100
        }, (results) => {
            //console.log("reltype validation: ", results);
            var countMap = {};
            results.rows.map(row => {
                countMap[row['nodeLabel']] = row['estimatedRelCounts']
            });

            Object.keys(nodeLabelRelTypeMap).map(nodeLabelString => {
                var relArray = nodeLabelRelTypeMap[nodeLabelString];
                var relCounts = countMap[nodeLabelString] || {};

                relArray.map(relTypeString => {
                    var estimatedCount = relCounts[relTypeString] || 0;
                    var rels = dataModel.getOutboundRelationshipsByNodeLabelAndRelationshipType(nodeLabelString, relTypeString);
                    var relDescs = new Set(rels.map(x => getRelationshipTypeDescWithNodeLabels(x,true)));
                    var desc = [...relDescs].join(', ');
                    if (estimatedCount === 0) {
                        relationshipTypeDatabaseValidations.push({
                            validationStatus: ValidationStatus.Invalid,
                            validationMessage: `${desc} has 0 relationships`,
                            relationshipTypes: rels,
                            count: 0
                        });
                    } else {
                        relationshipTypeDatabaseValidations.push({
                            validationStatus: ValidationStatus.Valid,
                            validationMessage: `${desc} has ${estimatedCount} relationships (estimated)`,
                            relationshipTypes: rels,
                            count: estimatedCount
                        });
                    }
                });
            });
            
            updateState(relationshipTypeDatabaseValidations, {hasBeenValidated: true});

        }, (error) => {
            relationshipTypeDatabaseValidations.push({
                validationStatus: ValidationStatus.Error,
                validationMessage: `Error ${error.message}`
            });
            updateState(relationshipTypeDatabaseValidations, {hasBeenValidated: true});
        });
    } else {
        relationshipTypeDatabaseValidations.push({
            validationStatus: ValidationStatus.NotValidated,
            validationMessage: "Please connect to a database to run this validation",
        });
        updateState(relationshipTypeDatabaseValidations);
    }     
}

export const validateNodeLabelsAgainstDatabase = (dataModel, updateState) => {
    var nodeLabelDatabaseValidations = [];

    if (currentlyConnectedToNeo()) {
        updateState([{
            validationStatus: ValidationStatus.ValidationInProgress,
            validationMessage: "Running Node Label validation query",
        }], {dontUpdateValidationMessage: true});

        runCypher(CountNodesByLabel, {}, (results) => {
            //console.log('results: ', cypherQuery, results);
            var countMap = {};
            results.rows.map(row => countMap[row['nodeLabel']] = row['numNodes']);

            var nodeLabels = dataModel.getNodeLabelArray();
            nodeLabels.map(nodeLabel => {
                var numNodes = countMap[nodeLabel.label];
                
                if (numNodes instanceof Integer) {
                    numNodes = numNodes.toInt();
                } else {
                    numNodes = (typeof(numNodes) === 'number') ? numNodes : 0;                    
                }
                
                if (numNodes > 0) {
                    nodeLabelDatabaseValidations.push({
                        validationStatus: ValidationStatus.Valid,
                        validationMessage: `${nodeLabel.label} has ${numNodes} nodes`,
                        nodeLabel: nodeLabel,
                        count: numNodes
                    });
                } else {
                    nodeLabelDatabaseValidations.push({
                        validationStatus: ValidationStatus.Invalid,
                        validationMessage: `${nodeLabel.label} has 0 nodes`,
                        nodeLabel: nodeLabel,
                        count: 0
                    });
                }
            });
            updateState(nodeLabelDatabaseValidations, {hasBeenValidated: true});
        }, (error) => {
            //console.log('error runningCypher:', cypherQuery, error);
            nodeLabelDatabaseValidations.push({
                validationStatus: ValidationStatus.Error,
                validationMessage: `Error ${error.message}`
            });
            updateState(nodeLabelDatabaseValidations, {hasBeenValidated: true});
        });                      
    } else {
        nodeLabelDatabaseValidations.push({
            validationStatus: ValidationStatus.NotValidated,
            validationMessage: "Please connect to a database to run this validation",
        });
        updateState(nodeLabelDatabaseValidations);
    }        
}

export const findAndMatchNodeLabelKey = (nodeLabel, nodeLabelConstraintsMap, properties) => {
    var constraintModelArray = nodeLabelConstraintsMap[nodeLabel.label];
    var foundIt = false;
    var badKey = null;
    
    if (constraintModelArray) {
        for (var i = 0; i < constraintModelArray.length; i++) {
            var constraintModel = constraintModelArray[i];
            const constraintNodeLabel = constraintModel.getNodeLabelByLabel(nodeLabel.label);
            if (!constraintNodeLabel)
                continue;
    
            var constraintKeyProperties = Object.values(constraintNodeLabel.properties).filter(property => property.isPartOfKey);
            if (constraintKeyProperties.length >= 1) {
                // this is a node key constraint from database
                //console.log('properties: ', properties);
                //console.log('constraintNodeLabel: ', constraintNodeLabel);
                var matches = properties.filter(prop => constraintNodeLabel.getPropertyByName(prop.name));
                //console.log('matches: ', matches);
                if (properties.length === matches.length) {
                    // we found a match
                    foundIt = true;
                    break;
                } 
                badKey = constraintNodeLabel;
            }
        }
    }
    return { foundIt, badKey };
}

export const getNodeKeyConstraintDesc = (nodeLabel) => {
    const props = Object.values(nodeLabel.properties)
        .filter(x => x.isPartOfKey)
        .map(x => smartQuote(x.name))
        .join(', ')

    const label = smartQuote(nodeLabel.label);
    const desc = `(:${label} {${props}})`;
    return desc;
}

export const getNodeConstraintDesc = (nodeLabel, property) => {
    const label = smartQuote(nodeLabel.label);
    const desc = `(:${label} {${property.name}})`;
    return desc;
}

export const getRelationshipConstraintDesc = (relationshipType, property) => {
    const type = smartQuote(relationshipType.type);
    const desc = `-[:${type} {${property.name}}]-`;
    return desc;
}

export const getCompositeIndexDesc = (nodeLabel, compositeIndex) => {
    const propNames = compositeIndex.propertyDefinitionKeys
        .map(key => nodeLabel.properties[key])
        .filter(property => property)
        .map(property => property.name)
        .join(', ');
    const indexName = compositeIndex.indexName || '';
    var desc = `(:${nodeLabel.label} {${propNames}})`;    
    desc = (indexName) ? `${indexName} ${desc}` : desc;
    return desc;
}
    
export const validateNodeKey = (nodeLabel, nodeLabelProperties, nodeLabelConstraintsMap) => {
    var validationErrors = [];
    var nodeKeyProperties = nodeLabelProperties.filter(property => property.isPartOfKey);
    if (nodeKeyProperties.length >= 1) {
        // found NodeKey - check if Node Key exists in Constraint Models
        var { foundIt, badKey } = findAndMatchNodeLabelKey(nodeLabel, nodeLabelConstraintsMap, nodeKeyProperties);
        if (!foundIt) {
            // write a validation error using bad key
            const expectedNodeKey = getNodeKeyConstraintDesc(nodeLabel);
            if (badKey) {
              // bad key is not null then there is a mismatch between what is in data model vs in database
              const badNodeKey = getNodeKeyConstraintDesc(badKey);
              validationErrors.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `Found mismatched Node Key. Expected ${expectedNodeKey}, got ${badNodeKey}.`,
                    nodeLabel
                });
            } else {
              // bad key is null then no key exists in database
              validationErrors.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: `Node Key ${expectedNodeKey} is not in the database.`,
                nodeLabel
              });
            }
        }
    }
    return validationErrors;
}

export const validateCompositeIndexes = (nodeLabel, nodeIndexConstraintMap) => {
    var validationErrors = [];
    var compositeIndexes = nodeLabel.getIndexes() || [];
    compositeIndexes.map(compositeIndex => {
        var foundIt = false;
        var indexModelArray = nodeIndexConstraintMap[nodeLabel.label];
        var compositeIndexDesc = getCompositeIndexDesc(nodeLabel, compositeIndex);
        var propertyNamesToCheck = compositeIndex.propertyDefinitionKeys
            .map(key => nodeLabel.properties[key])
            .filter(property => property)
            .map(property => property.name);
        if (indexModelArray) {
            for (var i = 0; i < indexModelArray.length; i++) {
                var indexModel = indexModelArray[i];
                const indexNodeLabel = indexModel.getNodeLabelByLabel(nodeLabel.label);
                if (!indexNodeLabel)
                    continue;

                var indexesToCheckAgainst = indexNodeLabel.getIndexes() || [];
                for (var j = 0; j < indexesToCheckAgainst.length; j++) {
                    var indexToCheckAgainst = indexesToCheckAgainst[j];

                    var foundKeys = propertyNamesToCheck
                        .filter(key => indexToCheckAgainst.propertyDefinitionKeys.includes(key));
                    if (foundKeys.length === propertyNamesToCheck.length) {
                        foundIt = true;
                        if (compositeIndex.indexName !== indexToCheckAgainst.indexName) {
                            validationErrors.push({
                                validationStatus: ValidationStatus.Invalid,
                                validationMessage: `Composite index ${compositeIndexDesc} found, but has different name. Expected '${compositeIndex.indexName}', got '${indexToCheckAgainst.indexName}'`,
                                nodeLabel
                            });
                        }
                        break;
                    }
                }
                if (foundIt) {
                    break;
                }
            }
        }

        if (!foundIt) {
            validationErrors.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: `Composite index ${compositeIndexDesc} is not in the database.`,
                nodeLabel
            });
        }
    });

    return validationErrors;
}

export const validateNodeLabelConstraint = (nodeLabel, nodeLabelProperties, nodeLabelConstraintsMap, constraintInfo) => {
    var validationErrors = [];
    var { propertyToCheck, constraintType } = constraintInfo;
    nodeLabelProperties
        .filter(property => !property.isPartOfKey && property[propertyToCheck])
        .map(property => {
            var foundIt = false;
            var constraintModelArray = nodeLabelConstraintsMap[nodeLabel.label];
            if (constraintModelArray) {
                for (var i = 0; i < constraintModelArray.length; i++) {
                    var constraintModel = constraintModelArray[i];
                    const constraintNodeLabel = constraintModel.getNodeLabelByLabel(nodeLabel.label);
                    if (!constraintNodeLabel)
                        continue;
            
                    var constraintKeyProperties = Object.values(constraintNodeLabel.properties).filter(property => property[propertyToCheck]);
                    if (constraintKeyProperties.length >= 1) {
                        // we assume only 1 property has to match
                        //  because Uniqueness and MustExist only allow for 1 property to be defined 
                        if (property.name === constraintKeyProperties[0].name) {
                            // we found a match
                            foundIt = true;
                            break;
                        }
                    }
                }
            }

            if (!foundIt) {
                // write a validation error using bad key
                const constraintDesc = getNodeConstraintDesc(nodeLabel, property);
                // bad key is null then no key exists in database
                validationErrors.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `${constraintType} ${constraintDesc} is not in the database.`,
                    nodeLabel
                });
            }
        });
        
    return validationErrors;
}

export const validateNodeLabelIndex = (nodeLabel, nodeLabelProperties, nodeLabelIndexesMap) => {
    var validationErrors = [];
    nodeLabelProperties
        .filter(property => !property.isPartOfKey && !property.hasUniqueConstraint && property.isIndexed)
        .map(property => {
            var foundIt = false;
            var indexModelArray = nodeLabelIndexesMap[nodeLabel.label];
            if (indexModelArray) {
                for (var i = 0; i < indexModelArray.length; i++) {
                    var indexModel = indexModelArray[i];
                    const indexNodeLabel = indexModel.getNodeLabelByLabel(nodeLabel.label);
                    if (!indexNodeLabel)
                        continue;
            
                    var indexProperties = Object.values(indexNodeLabel.properties).filter(property => property.isIndexed);
                    if (indexProperties.length >= 1) {
                        // we assume only 1 property has to match - checking against a single property index
                        if (property.name === indexProperties[0].name) {
                            // we found a match
                            foundIt = true;
                            break;
                        }
                    }
                }
            }

            if (!foundIt) {
                // write a validation error using bad key
                const indexDesc = getNodeConstraintDesc(nodeLabel, property);
                // bad key is null then no key exists in database
                validationErrors.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `Index ${indexDesc} is not in the database.`,
                    nodeLabel
                });
            }
        });
        
    return validationErrors;
}

export const validateRelationshipTypeConstraint = (relationshipType, relationshipTypeProperties, relationshipTypeConstraintsMap, constraintInfo) => {
    var validationErrors = [];
    var { propertyToCheck, constraintType } = constraintInfo;
    relationshipTypeProperties
        .filter(property => !property.isPartOfKey && property[propertyToCheck])
        .map(property => {
            var foundIt = false;
            var constraintModelArray = relationshipTypeConstraintsMap[relationshipType.type];
            if (constraintModelArray) {
                for (var i = 0; i < constraintModelArray.length; i++) {
                    var constraintModel = constraintModelArray[i];
                    // should be only 1 relationship type in a constraint model
                    const constraintRelationshipType = constraintModel.getRelationshipTypeArray()[0];
                    if (!constraintRelationshipType)
                        continue;
            
                    var constraintKeyProperties = Object.values(constraintRelationshipType.properties).filter(property => property[propertyToCheck]);
                    if (constraintKeyProperties.length >= 1) {
                        // we assume only 1 property has to match
                        //  because MustExist only allow for 1 property to be defined 
                        if (property.name === constraintKeyProperties[0].name) {
                            // we found a match
                            foundIt = true;
                            break;
                        }
                    }
                }
            }

            if (!foundIt) {
                // write a validation error using bad key
                const constraintDesc = getRelationshipConstraintDesc(relationshipType, property);
                // bad key is null then no key exists in database
                validationErrors.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `${constraintType} ${constraintDesc} is not in the database.`,
                    relationshipType
                });
            }
        });
        
    return validationErrors;
}

export const findConstraintsNotPresentInDatabase = (dataModel, nodeLabelConstraintsMap, relationshipTypeConstraintsMap) => {

    var validationErrors = [];
    var nodeLabels = dataModel.getNodeLabelArray();
    nodeLabels.map(nodeLabel => {
        if (nodeLabel && nodeLabel.properties) {
            var nodeLabelProperties = Object.values(nodeLabel.properties);
            
            var nodeKeyValidations = validateNodeKey(nodeLabel, nodeLabelProperties, nodeLabelConstraintsMap);
            validationErrors = validationErrors.concat(nodeKeyValidations);

            var uniquenessValidations = validateNodeLabelConstraint(
                    nodeLabel, 
                    nodeLabelProperties, 
                    nodeLabelConstraintsMap,
                    { 
                        propertyToCheck: 'hasUniqueConstraint', 
                        constraintType: 'Uniqueness Constraint'
                    });
            validationErrors = validationErrors.concat(uniquenessValidations);

            var mustExistValidations = validateNodeLabelConstraint(
                nodeLabel, 
                nodeLabelProperties, 
                nodeLabelConstraintsMap,
                { 
                    propertyToCheck: 'mustExist', 
                    constraintType: 'Must Exist'
                });
            validationErrors = validationErrors.concat(mustExistValidations);
        }
    });

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    relationshipTypes.map(relationshipType => {
        if (relationshipType && relationshipType.properties) {
            var relationshipTypeProperties = Object.values(relationshipType.properties);
            
            var mustExistValidations = validateRelationshipTypeConstraint(
                relationshipType, 
                relationshipTypeProperties, 
                relationshipTypeConstraintsMap,
                { 
                    propertyToCheck: 'mustExist', 
                    constraintType: 'Must Exist'
                });
            validationErrors = validationErrors.concat(mustExistValidations);
            
        }
    });
    return validationErrors;
}

export const getConstraintMaps = (descriptionArray) => {
    var nodeLabelConstraintsMap = {};
    var relationshipTypeConstraintsMap = {};

    descriptionArray.map(details => {
        const schemaModel = parseConstraintDescription(details);
        if (schemaModel) {
            const schemaNodeLabels = schemaModel.getNodeLabelArray().filter(x => x.label);
            if (schemaNodeLabels.length > 0) {
                schemaNodeLabels.map(x => {
                    var array = nodeLabelConstraintsMap[x.label];
                    if (!array) {
                        array = [];
                        nodeLabelConstraintsMap[x.label] = array;
                    }
                    array.push(schemaModel);
                })
            } else {
                var schemaRelationshipTypes = schemaModel.getRelationshipTypeArray();
                if (schemaRelationshipTypes.length > 0) {
                    schemaRelationshipTypes.map(x => {
                        var array = relationshipTypeConstraintsMap[x.type];
                        if (!array) {
                            array = [];
                            relationshipTypeConstraintsMap[x.type] = array;
                        }
                        array.push(schemaModel);
                    })
                }
            }
        }
    });
    return {
        nodeLabelConstraintsMap,
        relationshipTypeConstraintsMap
    }
}

export const findIndexesNotPresentInDatabase = (dataModel, nodeLabelIndexesMap) => {
    var validationErrors = [];
    var nodeLabels = dataModel.getNodeLabelArray();
    nodeLabels.map(nodeLabel => {
        if (nodeLabel && nodeLabel.properties) {
            var nodeLabelProperties = Object.values(nodeLabel.properties);
            
            var singlePropertyIndexValidations = validateNodeLabelIndex(
                    nodeLabel, 
                    nodeLabelProperties, 
                    nodeLabelIndexesMap);
            validationErrors = validationErrors.concat(singlePropertyIndexValidations);
        }

        var compositePropertyIndexValidations = validateCompositeIndexes(
            nodeLabel, 
            nodeLabelIndexesMap);
        validationErrors = validationErrors.concat(compositePropertyIndexValidations);
    });
    return validationErrors;
}

export const getIndexMap = (dbIndexesRows) => {
    var nodeLabelIndexMap = {};

    dbIndexesRows.map(row => {
        const schemaModel = processDbIndexesRow(row);
        if (schemaModel) {
            const schemaNodeLabels = schemaModel.getNodeLabelArray().filter(x => x.label);
            if (schemaNodeLabels.length > 0) {
                schemaNodeLabels.map(x => {
                    var array = nodeLabelIndexMap[x.label];
                    if (!array) {
                        array = [];
                        nodeLabelIndexMap[x.label] = array;
                    }
                    array.push(schemaModel);
                })
            } 
        }
    });
    return nodeLabelIndexMap;
}

export const validateConstraintsAgainstDatabase = (dataModel, updateState) => {
    var constraintDatabaseValidations = [];

    if (currentlyConnectedToNeo()) {
        updateState([{
            validationStatus: ValidationStatus.ValidationInProgress,
            validationMessage: "Running Constraint validation query",
        }], {dontUpdateValidationMessage: true});

        runCypher(GetConstraintsDescription, {}, (results) => {
            //console.log('results: ', cypherQuery, results);
            var descriptionArray = results.rows.map(row => row['description']);
            var { nodeLabelConstraintsMap, relationshipTypeConstraintsMap } = getConstraintMaps(descriptionArray);
            constraintDatabaseValidations = findConstraintsNotPresentInDatabase(dataModel, nodeLabelConstraintsMap, relationshipTypeConstraintsMap);
            if (constraintDatabaseValidations.length === 0) {
                constraintDatabaseValidations.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: `No Constraint discrepancies found.`
                });
            }
            updateState(constraintDatabaseValidations, {hasBeenValidated: true});
        }, (error) => {
            //console.log('error runningCypher:', cypherQuery, error);
            constraintDatabaseValidations.push({
                validationStatus: ValidationStatus.Error,
                validationMessage: `Error ${error.message}`
            });
            updateState(constraintDatabaseValidations, {hasBeenValidated: true});
        });                      
    } else {
        constraintDatabaseValidations.push({
            validationStatus: ValidationStatus.NotValidated,
            validationMessage: "Please connect to a database to run this validation",
        });
        updateState(constraintDatabaseValidations);
    }        
}

export const validateIndexesAgainstDatabase = (dataModel, updateState) => {
    var indexDatabaseViolations = [];

    if (currentlyConnectedToNeo()) {
        updateState([{
            validationStatus: ValidationStatus.ValidationInProgress,
            validationMessage: "Running Constraint validation query",
        }], {dontUpdateValidationMessage: true});

        runCypher(GetIndexes, {}, (results) => {
            //console.log('results: ', cypherQuery, results);
            var nodeLabelIndexesMap = getIndexMap(results.rows);
            indexDatabaseViolations = findIndexesNotPresentInDatabase(dataModel, nodeLabelIndexesMap);
            if (indexDatabaseViolations.length === 0) {
                indexDatabaseViolations.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: `No Index discrepancies found.`
                });
            }
            updateState(indexDatabaseViolations, {hasBeenValidated: true});
        }, (error) => {
            //console.log('error runningCypher:', cypherQuery, error);
            indexDatabaseViolations.push({
                validationStatus: ValidationStatus.Error,
                validationMessage: `Error ${error.message}`
            });
            updateState(indexDatabaseViolations, {hasBeenValidated: true});
        });                      
    } else {
        indexDatabaseViolations.push({
            validationStatus: ValidationStatus.NotValidated,
            validationMessage: "Please connect to a database to run this validation",
        });
        updateState(indexDatabaseViolations);
    }        
}
