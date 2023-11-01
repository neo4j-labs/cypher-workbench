
import { DataSourceTypes } from '../../../common/mapping/DataSource';
import { getExportData } from '../../../toolModel/Model';

export const serializeDataMappingsToJson = ({dataModel, dataModelMetadata, dataMappingBlocks, dataSourceType = DataSourceTypes.BigQuery}) => {
    var dataMappingBlockOutputArray = [];
    if (dataMappingBlocks && dataMappingBlocks.length > 0) {
        dataMappingBlockOutputArray = dataMappingBlocks.map(dataMappingBlock => {
            const {datasetId, tableDefinition, dataMappings, cypherPattern} = dataMappingBlock;

            var nodePatternMap = {};
            var relationshipPatternMap = {};
    
            cypherPattern.getAllNodePatterns()
                .map(nodePattern => {
                    // create object with simple JSON data
                    nodePatternMap[nodePattern.key] = {
                        key: nodePattern.key,
                        variable: nodePattern.variable,
                        nodeLabels: nodePattern.nodeLabels
                    }
                });
    
            cypherPattern.getAllNodeRelNodePatterns()
                .map(nodeRelNodePattern => {
                    // create object with simple JSON data
                    relationshipPatternMap[nodeRelNodePattern.relationshipPattern.key] = {
                        startNodePattern: {
                            key: nodeRelNodePattern.startNodePattern.key,
                            variable: nodeRelNodePattern.startNodePattern.variable,
                            nodeLabels: nodeRelNodePattern.startNodePattern.nodeLabels
                        },
                        relationshipPattern: {
                            key: nodeRelNodePattern.relationshipPattern.key,
                            variable: nodeRelNodePattern.relationshipPattern.variable,
                            type: nodeRelNodePattern.relationshipPattern.types[0]
                        },
                        endNodePattern: {
                            key: nodeRelNodePattern.endNodePattern.key,
                            variable: nodeRelNodePattern.endNodePattern.variable,
                            nodeLabels: nodeRelNodePattern.endNodePattern.nodeLabels
                        }
                    }
                });
    
            var nodePatternKeyPropertyKeyToDataMappingKeyMap = {};
            var serializedNodeDataMappings = {};
            dataMappings
                .filter(dataMapping => dataMapping.destination.nodePattern)
                .map(dataMapping => {
                    var {
                        key, name, datatype, isPartOfKey, 
                        hasUniqueConstraint, isIndexed, mustExist
                    } = dataMapping.destination.propertyDefinition;

                    serializedNodeDataMappings[dataMapping.key] = {
                        key: dataMapping.key,
                        source: {
                            key: dataMapping.source.key,
                            tableName: tableDefinition.name,
                            columnDefinition: {
                                key: dataMapping.source.columnDefinition.key,
                                name: dataMapping.source.columnDefinition.name,
                                datatype: dataMapping.source.columnDefinition.datatype,
                                ordinalPosition: dataMapping.source.columnDefinition.ordinalPosition
                            }
                        },
                        destination: {
                            key: dataMapping.destination.key,
                            nodePattern: {
                                key: dataMapping.destination.nodePattern.key,
                                variable: dataMapping.destination.nodePattern.variable,
                                nodeLabels: dataMapping.destination.nodePattern.nodeLabels,
                                nodeLabelKey: dataMapping.destination.nodeLabel.key
                            },
                            propertyDefinition: {
                                key, name, datatype, isPartOfKey, 
                                hasUniqueConstraint, isIndexed, mustExist
                            }
                        }
                    }
                    // NOTE: presumes that a source column can only be mapped to a single property
                    const mapKey = `np.${dataMapping.destination.nodePattern.key}_prop.${key}`;
                    nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey] = dataMapping.key;
                });

            /*
            go through cypher pattern - getAllNodeRelNodes
            */
            const nodeRelNodePatternMappings = dataMappings
                .filter(dataMapping => dataMapping.destination.nodeRelNodePattern); 
            //console.log('nodeRelNodePatternMappings.length: ', nodeRelNodePatternMappings.length);
            //console.log('nodePatternKeyPropertyKeyToDataMappingKeyMap: ', nodePatternKeyPropertyKeyToDataMappingKeyMap);
            var relationshipDataMappings = cypherPattern.getAllNodeRelNodePatterns()
              .map(nodeRelNodePattern => {
                var relevantMappings = nodeRelNodePatternMappings.filter(x => {
                    const xNodeRelNodePattern = x.destination.nodeRelNodePattern;
                    return (
                        nodeRelNodePattern.startNodePattern.key === xNodeRelNodePattern.startNodePattern.key
                        && nodeRelNodePattern.endNodePattern.key === xNodeRelNodePattern.endNodePattern.key
                        && nodeRelNodePattern.relationshipPattern.key === xNodeRelNodePattern.relationshipPattern.key
                    )
                });

                // find all startNodePattern primary key mappings
                var relationshipType = dataModel.getRelationshipType(
                    nodeRelNodePattern.relationshipPattern.types[0], 
                    nodeRelNodePattern.startNodePattern.nodeLabels[0], 
                    nodeRelNodePattern.endNodePattern.nodeLabels[0]
                );

                if (!relationshipType) {
                    var startNodePattern = nodeRelNodePattern.startNodePattern;
                    var endNodePattern = nodeRelNodePattern.endNodePattern;
                    var relPattern = nodeRelNodePattern.relationshipPattern;
                    var startRelNodeDesc = `${startNodePattern.nodeLabels[0]}`;
                    var endRelNodeDesc = `${endNodePattern.nodeLabels[0]}`;
                    var relTypeDesc = `${relPattern.types[0]}`;
                    var relDesc = `(:${startRelNodeDesc})-[:${relTypeDesc}]->(${endRelNodeDesc})`;
                    throw new Error(`Cannot find relationship type '${relDesc}' in model`);
                }
                var startNodePatternKeyMappings = Object.values(relationshipType.startNodeLabel.properties)
                    // temporarily allowing hasUniqueConstraint...
                    //   this is going to have to be converted into a UI flag
                    //.filter(prop => prop.isPartOfKey || prop.hasUniqueConstraint)   
                    // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects
                    .filter(prop => prop.isPartOfKey)
                    .map(prop => {
                        const mapKey = `np.${nodeRelNodePattern.startNodePattern.key}_prop.${prop.key}`
                        return nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey];
                    })

                // find all endNodePattern primary key mappings
                var endNodePatternKeyMappings = Object.values(relationshipType.endNodeLabel.properties)
                    // temporarily allowing hasUniqueConstraint...
                    //   this is going to have to be converted into a UI flag
                    //.filter(prop => prop.isPartOfKey || prop.hasUniqueConstraint)
                    // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects
                    .filter(prop => prop.isPartOfKey)
                    .map(prop => {
                        const mapKey = `np.${nodeRelNodePattern.endNodePattern.key}_prop.${prop.key}`
                        //console.log('mapKey: ', mapKey);
                        return nodePatternKeyPropertyKeyToDataMappingKeyMap[mapKey];
                    });
                //console.log('endNodePatternKeyMappings: ', endNodePatternKeyMappings);

                const anyStartKeysUndefinedIndex = startNodePatternKeyMappings.findIndex(propKey => propKey === null || propKey === undefined);
                const anyEndKeysUndefinedIndex = endNodePatternKeyMappings.findIndex(propKey => propKey === null || propKey === undefined);
                const anyStartKeysUndefined = anyStartKeysUndefinedIndex >= 0;
                const anyEndKeysUndefined = anyEndKeysUndefinedIndex >= 0;

                var serializedRelationshipDataMappings = {};

                relevantMappings
                    .map(dataMapping => {
                        var {
                            key, name, datatype, isPartOfKey, 
                            hasUniqueConstraint, isIndexed, mustExist
                        } = dataMapping.destination.propertyDefinition;

                        serializedRelationshipDataMappings[dataMapping.key] = {
                            key: dataMapping.key,
                            source: {
                                key: dataMapping.source.key,
                                columnDefinition: {
                                    key: dataMapping.source.columnDefinition.key,
                                    name: dataMapping.source.columnDefinition.name,
                                    datatype: dataMapping.source.columnDefinition.datatype,
                                    ordinalPosition: dataMapping.source.columnDefinition.ordinalPosition
                                }
                            },
                            destination: {
                                key: dataMapping.destination.key,
                                propertyDefinition: {
                                    key, name, datatype, isPartOfKey, 
                                    hasUniqueConstraint, isIndexed, mustExist
                                }
                            }
                        }
                    });

                //console.log('anyStartKeysUndefined: ', anyStartKeysUndefined);
                //console.log('anyEndKeysUndefined: ', anyEndKeysUndefined);
                if (anyStartKeysUndefined || anyEndKeysUndefined) {
                    return null;
                } else {
                    return {
                        startNodePatternKeyMappings,
                        relationshipPattern: {
                            key: nodeRelNodePattern.relationshipPattern.key,
                            variable: nodeRelNodePattern.relationshipPattern.variable,
                            type: relationshipType.type,
                            relationshipTypeKey: relationshipType.key
                        },
                        endNodePatternKeyMappings,
                        dataMappings: serializedRelationshipDataMappings
                    }
                }
            }).filter(relMapping => relMapping);  // filter out nulls

            var mappingObj = {};
            var sourceObj = {};
            if (dataSourceType === DataSourceTypes.BigQuery) {
                sourceObj.datasetId = datasetId;
                sourceObj.tableDefinition = tableDefinition;
            } else if (dataSourceType === DataSourceTypes.Neo4j) {
                sourceObj.cypher = tableDefinition.metadata.rewrittenCypher;
            }
            
            mappingObj = {
                ...mappingObj,
                source: sourceObj,
                cypherPatterns: {
                    nodePatternMap,
                    relationshipPatternMap
                },
                nodeDataMappings: serializedNodeDataMappings,
                relationshipDataMappings: relationshipDataMappings
            }
            return mappingObj;
        });
    }

    //const dataModelSaveObj = dataModel.toSaveObject();
    var exportData = getExportData(dataModelMetadata, dataModel);

    return {
        metadata: exportData.metadata,
        dataModel: exportData.dataModel,
        dataMappings: dataMappingBlockOutputArray
    }
}

