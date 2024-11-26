
import DataTypes from '../../../../dataModel/DataTypes';
import { lowerFirstLetter, smartQuote } from '../../../../dataModel/helper';
import { getExportData } from '../../../toolModel/Model';

const HopDatatypes = {
    Number: 'Number'
}

const doHopDatatypeSubstitution = (neoDatatype) => {
    var returnDatatype = neoDatatype;
    /*
    switch (neoDatatype) {
        case DataTypes.Float:
            returnDatatype = HopDatatypes.Number;
            break;
    }
    */
    return returnDatatype;
}

export const serializeModelExportToJson = ({
    dataModel, dataModelMetadata, pipelineOptions,
    nodeLabelsToExport, relationshipTypesToExport,
    sourceNeoConnectionInfo, destNeoConnectionInfo
}) => {
    var dataMappings = [];
    if (nodeLabelsToExport.length > 0 || relationshipTypesToExport.length > 0) {

        var nodeLabelVariableMap = {};
        var nodePatternKeyPropertyKeyToDataMappingKeyMap = {};
        var allSerializedNodeDataMappings = {};
        var onlyCopyNodeKeysForTheseNodeLabels = {};

        relationshipTypesToExport.map(relationshipType => {
            if (!nodeLabelsToExport.includes(relationshipType.startNodeLabel)) {
                nodeLabelsToExport.push(relationshipType.startNodeLabel);
                onlyCopyNodeKeysForTheseNodeLabels[relationshipType.startNodeLabel.key] = relationshipType.startNodeLabel;
            }

            if (!nodeLabelsToExport.includes(relationshipType.endNodeLabel)) {
                nodeLabelsToExport.push(relationshipType.endNodeLabel);
                onlyCopyNodeKeysForTheseNodeLabels[relationshipType.endNodeLabel.key] = relationshipType.endNodeLabel;
            }
        });

        var nodeDataMappings = nodeLabelsToExport.map(nodeLabel => {
            // create object with simple JSON data
            var serializedNodeDataMappings = {};
            var variable = lowerFirstLetter(nodeLabel.key);
            nodeLabelVariableMap[nodeLabel.key] = variable;
            const exportCypherMatch = `MATCH (${variable}:${smartQuote(nodeLabel.label)})`
            var returnProps = [];

            Object.values(nodeLabel.properties).map((propertyDefinition,index) => {
                var {
                    key, name, datatype, isPartOfKey, 
                    hasUniqueConstraint, isIndexed, mustExist
                } = propertyDefinition;
    
                if (onlyCopyNodeKeysForTheseNodeLabels[nodeLabel.key]) {
                    //if (!(isPartOfKey || hasUniqueConstraint)) {
                    // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects                
                    if (!(isPartOfKey)) {
                        // in this situation, someone wants to export a relationship
                        //  so we only need the primary key of the node label.  
                        //  this property is not part of the key, so we skip it
                        return;   
                    }
                }

                const dataMappingKey = `${nodeLabel.key}_${propertyDefinition.key}`
                var propName = propertyDefinition.name;
                var propNameAlias = `${variable}_${propName}`;
                returnProps.push({
                    varAndPropName: `${variable}.${smartQuote(propName)}`,
                    propNameAlias
                });

                serializedNodeDataMappings[dataMappingKey] = {
                    key: dataMappingKey,
                    source: {
                        key: dataMappingKey,
                        sourceNodeLabel: nodeLabel.label,
                        columnDefinition: {
                            key: propertyDefinition.key,
                            variable: variable,
                            propName: propName,
                            name: propNameAlias,
                            datatype: propertyDefinition.datatype,
                            ordinalPosition: index
                        }
                    },
                    destination: {
                        key: dataMappingKey,
                        nodePattern: {
                            key: nodeLabel.key,
                            variable: variable,
                            nodeLabels: [nodeLabel.label],
                            nodeLabelKey: nodeLabel.key
                        },
                        propertyDefinition: {
                            key, name, datatype: doHopDatatypeSubstitution(datatype), 
                            isPartOfKey, hasUniqueConstraint, isIndexed, mustExist
                        }
                    }
                }
                // NOTE: presumes that a source column can only be mapped to a single property
                const mapKey = `${nodeLabel.key}_${propertyDefinition.key}`;
                nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey] = dataMappingKey;
            });

            const returnPropsString = returnProps.map(returnProp => {
                const { varAndPropName, propNameAlias } = returnProp;
                return `${varAndPropName} AS ${smartQuote(propNameAlias)}`;
            })
            .join(', ');

            const exportCypher = `${exportCypherMatch} RETURN ${returnPropsString}`;

            Object.keys(serializedNodeDataMappings)
                .map(key => allSerializedNodeDataMappings[key] = serializedNodeDataMappings[key]);

            return {
                source: {
                    cypher: exportCypher
                },
                forRelOnly: (onlyCopyNodeKeysForTheseNodeLabels[nodeLabel.key]) ? true : false,
                cypherPatterns: {
                    nodePatternMap: {
                        [nodeLabel.key]: {
                            key: nodeLabel.key,
                            variable: variable,
                            nodeLabels: [nodeLabel.label]
                        }
                    },
                    relationshipPatternMap: {}
                },
                nodeDataMappings: serializedNodeDataMappings,
                relationshipDataMappings: []
            }    
        });

        dataMappings = nodeDataMappings.filter(x => !x.forRelOnly);
        dataMappings.map(x => delete x.forRelOnly);

        var relDataMappings = relationshipTypesToExport.map(relationshipType => {

            var isSelfRelationship = (relationshipType.startNodeLabel.key === relationshipType.endNodeLabel.key) ? true : false;
            var variable = lowerFirstLetter(relationshipType.key);

            // find all startNodeLabel primary key mappings
            var startNodePatternKeyMappings = Object.values(relationshipType.startNodeLabel.properties)
                // temporarily allowing hasUniqueConstraint...
                //   this is going to have to be converted into a UI flag
                //.filter(prop => prop.isPartOfKey || prop.hasUniqueConstraint)   
                // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects                
                .filter(prop => prop.isPartOfKey)   
                .map(prop => {
                    const mapKey = `${relationshipType.startNodeLabel.key}_${prop.key}`
                    return nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey];
                })

            // find all endNodeLabel primary key mappings
            var endNodePatternKeyMappings = Object.values(relationshipType.endNodeLabel.properties)
                // temporarily allowing hasUniqueConstraint...
                //   this is going to have to be converted into a UI flag
                //.filter(prop => prop.isPartOfKey || prop.hasUniqueConstraint)
                // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects
                .filter(prop => prop.isPartOfKey)
                .map(prop => {
                    const mapKey = `${relationshipType.endNodeLabel.key}_${prop.key}`
                    return nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey];
                });

            const anyStartKeysUndefinedIndex = startNodePatternKeyMappings.findIndex(propKey => propKey === null || propKey === undefined);
            const anyEndKeysUndefinedIndex = endNodePatternKeyMappings.findIndex(propKey => propKey === null || propKey === undefined);
            const anyStartKeysUndefined = anyStartKeysUndefinedIndex >= 0;
            const anyEndKeysUndefined = anyEndKeysUndefinedIndex >= 0;

            var serializedRelationshipDataMappings = {};
            var returnProps = [];
            Object.values(relationshipType.properties).map((propertyDefinition,index) => {
                var {
                    key, name, datatype, isPartOfKey, 
                    hasUniqueConstraint, isIndexed, mustExist
                } = propertyDefinition;

                var propName = propertyDefinition.name;
                var propNameAlias = `${variable}_${propName}`;
                returnProps.push({
                    varAndPropName: `${variable}.${smartQuote(propName)}`,
                    propNameAlias
                });

                const dataMappingKey = `${relationshipType.key}_${propertyDefinition.key}`
                serializedRelationshipDataMappings[dataMappingKey] = {
                    key: dataMappingKey,
                    source: {
                        key: dataMappingKey,
                        columnDefinition: {
                            key: propertyDefinition.key,
                            variable: variable,
                            propName: propName,
                            name: propNameAlias,
                            datatype: propertyDefinition.datatype,
                            ordinalPosition: index
                        }
                    },
                    destination: {
                        key: dataMappingKey,
                        propertyDefinition: {
                            key, name, datatype: doHopDatatypeSubstitution(datatype), 
                            isPartOfKey, hasUniqueConstraint, isIndexed, mustExist
                        }
                    }
                }
            });

            if (anyStartKeysUndefined || anyEndKeysUndefined) {
                return null;
            } else {
                var nodeKeyDataMappings = 
                    startNodePatternKeyMappings.map(nodeDataMappingKey => allSerializedNodeDataMappings[nodeDataMappingKey])
                    .concat(
                        endNodePatternKeyMappings.map(nodeDataMappingKey => {
                            var nodeDataMapping = allSerializedNodeDataMappings[nodeDataMappingKey];
                            if (isSelfRelationship) {
                                // deep copy - otherwise replacing variable affects both start and end
                                var modifiedMapping = JSON.parse(JSON.stringify(nodeDataMapping)); 
                                var variable = modifiedMapping.source.columnDefinition.variable;
                                // replace the variable
                                var newVariable = `${variable}_self`;
                                var newKey = `${modifiedMapping.key}_self`;
                                modifiedMapping.key = newKey;
                                modifiedMapping.source.key = newKey;
                                modifiedMapping.source.columnDefinition.variable = newVariable;
                                modifiedMapping.source.columnDefinition.name = `${newVariable}_${modifiedMapping.source.columnDefinition.propName}`;
                                modifiedMapping.destination.key = newKey;
                                modifiedMapping.destination.nodePattern.variable = newVariable;
                                return modifiedMapping;
                            } else {
                                return nodeDataMapping;
                            }
                        })
                    )

                nodeKeyDataMappings.map(nodeKeyDataMapping => {
                    const colDef = nodeKeyDataMapping.source.columnDefinition;
                    var propNameAlias = `${colDef.variable}_${colDef.propName}`;
                    returnProps.push({
                        varAndPropName: `${colDef.variable}.${smartQuote(colDef.propName)}`,
                        propNameAlias
                    });
                });

                const returnPropsString = returnProps.map(returnProp => {
                    const { varAndPropName, propNameAlias } = returnProp;
                    return `${varAndPropName} AS ${smartQuote(propNameAlias)}`;
                })
                .join(', ');

                var startNodeVar = `${lowerFirstLetter(relationshipType.startNodeLabel.key)}`
                var endNodeVar = `${lowerFirstLetter(relationshipType.endNodeLabel.key)}`
                if (startNodeVar === endNodeVar) {
                    endNodeVar += '_self';
                }

                const exportCypherMatchStart = `(${startNodeVar}:${smartQuote(relationshipType.startNodeLabel.label)})`;
                const exportCypherMatchRel = `[${lowerFirstLetter(relationshipType.key)}:${smartQuote(relationshipType.type)}]`;
                const exportCypherMatchEnd = `(${endNodeVar}:${smartQuote(relationshipType.endNodeLabel.label)})`;
                const exportCypherMatch = `MATCH ${exportCypherMatchStart}-${exportCypherMatchRel}->${exportCypherMatchEnd}`;
                const exportCypherReturn = `RETURN ${returnPropsString}`
                const exportCypher = `${exportCypherMatch} ${exportCypherReturn}`;

                return {
                    source: {
                        cypher: exportCypher
                    },
                    cypherPatterns: {
                        nodePatternMap: {},
                        relationshipPatternMap: {
                            [relationshipType.key]: {
                                startNodePattern: {
                                    key: relationshipType.startNodeLabel.key,
                                    variable: nodeLabelVariableMap[relationshipType.startNodeLabel.key],
                                    nodeLabels: [relationshipType.startNodeLabel.label]
                                },
                                relationshipPattern: {
                                    key: relationshipType.key,
                                    variable: variable,
                                    type: relationshipType.type
                                },
                                endNodePattern: {
                                    key: relationshipType.endNodeLabel.key,
                                    variable: (isSelfRelationship) 
                                        ? `${nodeLabelVariableMap[relationshipType.endNodeLabel.key]}_self`
                                        : nodeLabelVariableMap[relationshipType.endNodeLabel.key],
                                    nodeLabels: [relationshipType.endNodeLabel.label]
                                },
                            }
                        }
                    },
                    nodeDataMappings: nodeKeyDataMappings.map(x => ({ ...x, relOnly: true })),
                    relationshipDataMappings: [
                        {
                            startNodePatternKeyMappings,
                            relationshipPattern: {
                                key: relationshipType.key,
                                variable: variable,
                                type: relationshipType.type,
                                relationshipTypeKey: relationshipType.key
                            },
                            endNodePatternKeyMappings: (isSelfRelationship) 
                                ? endNodePatternKeyMappings.map(x => `${x}_self`)
                                : endNodePatternKeyMappings,
                            dataMappings: serializedRelationshipDataMappings
                        }
                    ]
                }
            }
        }).filter(relMapping => relMapping);  // filter out nulls

        dataMappings = dataMappings.concat(relDataMappings);
    }

    //const dataModelSaveObj = dataModel.toSaveObject();
    var exportData = getExportData(dataModelMetadata, dataModel);

    // sourceIsCypher: false - to let Hop know to expect a Cypher statement as the source input, to switch the workflow handling
    return {
        sourceIsCypher: "false",
        pipelineOptions: pipelineOptions,
        source: {
            neoConnectionInfo: sourceNeoConnectionInfo
        },
        dest: {
            neoConnectionInfo: destNeoConnectionInfo
        },
        metadata: exportData.metadata,
        dataModel: exportData.dataModel,
        dataMappings: dataMappings
    }
}

