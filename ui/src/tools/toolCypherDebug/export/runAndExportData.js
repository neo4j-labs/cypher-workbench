
import { findObjectsContainingKeys, findValues } from '../../../dataModel/graphUtil';
import { isNode, isRelationship } from '../../toolCypherBuilder/components/results/ResultsTable';
import { downloadUrlAsFile } from '../../../common/util/download';
import { rewriteIntegers } from '../database/databaseUtil';
import { sleep } from '../validation/validateCypher';
import { getRecommendedKey, getRecommendedKeyFromValueAnalysis } from '../../../dataModel/propertyUtil/propertyAnalyzer';
import { 
    Constraint,
    DataSourceSchema,
    Index,
    NodeKeyProperty,
    NodeLabelRef,
    NodeMapping,
    NodeRef,
    Property,
    PropertyMapping,
    PropertyRef,
    RelationshipEndpointField,
    RelationshipMapping,
    TableSchema,
    TableSchemaField,
    Type
} from '../../../dataModel/graphModel/graphModel';
import { 
    convertDataType,
    DataImporterDataTypes,
    IdPrefixes,
    workbenchDataModelToImporterGraphModel
} from '../../../dataModel/graphModel/workbenchDataModelToImporterGraphModel';
import DataModel from '../../../dataModel/dataModel';
import { analyzeValues, getPropertyValueMap } from '../../../dataModel/propertyUtil/propertyAnalyzer';
import { isDate, isTime, isDateTime } from "../../../dataModel/graphUtil";
import Papa from 'papaparse';
import { getExportData, getExportFileNamePublic } from '../../toolModel/Model';
import { getModelMetadata } from '../../toolModel/components/SaveModelForm';
import { USER_ROLE } from '../../../common/Constants';
import { doDagreLayout } from '../../../common/layout/layout';
import JSZip from 'jszip';

const getErrorMsg = (headers, rows) => {
    return JSON.stringify(rows);
}

const getFileName = ({labelOrType, prefix}) => {
    let fileLabel = labelOrType.replace(/\s/g, '_')
    let fileName = `${prefix}${fileLabel}.csv`
    return fileName;
}

const downloadZip = async ({fileName, zip, statusFunction}) => {
    await zip
        .generateAsync(
        {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 },
            streamFiles: true,
        })
        .then(async (blob) => {
            let url = URL.createObjectURL(blob)
            downloadUrlAsFile(url, fileName);    
            await statusFunction({
                about: 'Data Importer Zip',
                status: `Downloaded zip to ${fileName}`
            });
        })
        .catch(async (error) => {
            console.log('Zip file error: ', error);
            await statusFunction({
                about: 'Zip file',
                status: `Error creating zip file ${error}`
            });
        });
}

const downloadWorkbenchModel = async({workbenchDataModel, fileName, statusFunction}) => {

    var dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(workbenchDataModel);
    downloadUrlAsFile(dataUrl, fileName);

    await statusFunction({
        about: 'Workbench Data Model',
        status: `Exported Workbench Data model to ${fileName}`
    });
}

const getWorkbenchDataModelMetadata = ({ dataModelText, prefix }) => {
    let modelName = '';
    if ((dataModelText && dataModelText.match && dataModelText.match(/^No Model Selected/) || !dataModelText)) {
        modelName = prefix.replaceAll('_', ' ')
            .split(' ')
            .filter(x => x)
            .map(x => (x.length > 0) ? x.substring(0,1).toUpperCase() + x.substring(1) : x)
            .join(' ');
    } else {
        modelName = dataModelText;
    }

    modelName = (modelName) ? `${modelName} ` : '';

    var now = new Date();
    let modelTitle = `${modelName}Workbench Model (${now.toLocaleString()})`

    let modelMetadata = getModelMetadata();
    modelMetadata.title = modelTitle;
    modelMetadata.dateCreated = now;
    modelMetadata.dateUpdated = now;
    modelMetadata.userRole = USER_ROLE.OWNER;
    modelMetadata.userIsCreator = true;
    modelMetadata.isPublic = false;

    return modelMetadata;
}

const downloadImporterModel = async({importerModel, fileName, statusFunction, zip}) => {

    if (zip) {
        zip.file('neo4j_importer_model.json', importerModel);

        await statusFunction({
            about: 'Data Importer Model',
            status: `Exported Data importer model to ${fileName}, adding to zip`
        });

        let zipFileName = fileName.replace(/json$/, 'zip');
        
        downloadZip({fileName: zipFileName, zip, statusFunction});
    } else {
        var dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(importerModel);
        downloadUrlAsFile(dataUrl, fileName);
    
        await statusFunction({
            about: 'Data Importer Model',
            status: `Exported Data importer model to ${fileName}`
        });
    }
}

const downloadCsv = async ({csvRows, fileName, labelOrType, statusFunction, zip}) => {
    let csv = Papa.unparse(csvRows);

    if (zip) {
        zip.file(fileName, csv);        

        // report status of downloaded CSV
        await statusFunction({
            about: labelOrType,
            status: `Exported ${csvRows.length} rows to ${fileName}, adding to zip file`
        });
    } else {
        var dataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
        downloadUrlAsFile(dataUrl, fileName);
    
        // report status of downloaded CSV
        await statusFunction({
            about: labelOrType,
            status: `Exported ${csvRows.length} rows to ${fileName}`
        });
    }
}

const ensureTwoDigits = (value) => {
    if (value < 10) {
        return `0${value}`;
    } else {
        return `${value}`
    }
}

const getDateString = (value) => {
    return `${value.year}-${ensureTwoDigits(value.month)}-${ensureTwoDigits(value.day)}`
}

const getTimeString = (value) => {
    return `${ensureTwoDigits(value.hour)}:${ensureTwoDigits(value.minute)}:${ensureTwoDigits(value.second)}`
}

const getPropValue = (value) => {
    if (isDateTime(value)) {
        return `${getDateString(value)}T${getTimeString(value)}Z`;
    } else if (isDate(value)) {
        // return `${getDateString(value)}Z`;
        return `${getDateString(value)}T00:00:00Z`;
    } else if (isTime(value)) {
        return `1970-01-01T${getTimeString(value)}Z`;        
    } else {
        // if (value === null || value === undefined) {
        //     return 'null';
        // } else {
        //     return value;
        // }
        return value;
    }
}

const getNodeKeyProperties = async (nodesByLabel, dataModel, statusFunction) => {

    let keyByLabel = {};
    let makeNewKeyProps = {};

    await Promise.all(Object.keys(nodesByLabel)
        .map(async (label) => {
            let key = null;
            if (dataModel) {
                let nodeLabel = dataModel.getNodeLabelByLabel(label);
                if (nodeLabel) {
                    let keyProps = Object.values(nodeLabel.properties).filter(x => x.isPartOfKey);
                    if (keyProps.length === 1) {
                        key = keyProps[0].name;
                    } else if (keyProps.length > 1) {
                        let keyPropNames = keyProps.map(x => x.name);
                        let newKeyProp = `nk_${keyPropNames.join('_')}`
                        key = newKeyProp;
                        makeNewKeyProps[label] = {
                            nodeKey: newKeyProp,
                            propsToJoin: keyPropNames
                        }

                        await statusFunction({
                            about: label,
                            status: `Making new composite key property ${newKeyProp} for node label ${label}`
                        });
                    }
                }
            }
            if (!key) {
                let nodes = Object.values(nodesByLabel[label]);
                key = getRecommendedKey(nodes);
                if (key) {
                    await statusFunction({
                        about: label,
                        status: (dataModel) 
                            ? `Node key not set in model, using '${key}' for ${label}`
                            : `Using recommended key '${key}' for ${label}`
                    });
                } else {
                    await statusFunction({
                        about: label,
                        status: 'Could not determine key'
                    });
                }
            }
            keyByLabel[label] = key;
        }))
    return {
        keyByLabel, makeNewKeyProps
    }
}

const parseSkipProperties = (skipPropertiesStr) => {
    let skipPropMap = {};
    if (skipPropertiesStr) {
        skipPropertiesStr.split(',')
            .map(x => x.trim())
            .map(x => {
                let [key,prop] = x.split('.');
                let props = skipPropMap[key];
                if (!props) {
                    props = [];
                    skipPropMap[key] = props;
                }
                props.push(prop);
            })
    }
    return skipPropMap;
}

export const getRelNodeLabel = ({ startOrEndNode, skipItemList }) => {
    return startOrEndNode.labels.filter(x => !skipItemList.includes(x))[0];
}

const getNewDataImporterModelId = (mapOfIdTypeAndMaxIdValue, idPrefix) => {
    let maxId = mapOfIdTypeAndMaxIdValue[idPrefix] || 0;
    let newId = maxId + 1;
    mapOfIdTypeAndMaxIdValue[idPrefix] = newId;
    return `${idPrefix}:${newId}`;
}

const addCompositeKeyToDataImporterModel = ({dataImporterModel, newPropertyKey, nodeLabelString}) => {

    // this method gets called when we create a composite key to use as the node key in Data Importer
    //   a composite key is a new property that consists of several other properties, where the names
    //   and values are joined together
    // 
    // for instance - if you have City with properties name, state, and country then 
    //   the composite key would be name_state_country and a value could be Springfield_IL_US
    // 
    // we need to add it to these areas of the graphSchema
    //   nodeLabels
    //   constraints
    //   indexes
    // and to graphSchemaExtensionRepresentation nodeKeyProperties
    // 
    // we will presume that no existing key has been defined for the nodeLabelString, so we don't
    //    have to clean anything up

    let nodeLabelDef = dataImporterModel.dataModel.graphSchemaRepresentation.graphSchema.nodeLabels.find(x => x.token === nodeLabelString);
    let constraints = dataImporterModel.dataModel.graphSchemaRepresentation.graphSchema.constraints;
    let indexes = dataImporterModel.dataModel.graphSchemaRepresentation.graphSchema.indexes;
    let nodeObjectTypes = dataImporterModel.dataModel.graphSchemaRepresentation.graphSchema.nodeObjectTypes;

    if (nodeLabelDef) {
        let allIds = findValues(dataImporterModel, '$id');
        // creates a map like { i: 2, c: 2, p: 5 } where the key is the id prefix of items in the dataImporterModel 
        //  and the value is the id maximum value
        let mapOfIdTypeAndMaxIdValue = allIds.reduce((acc, id) => {
            if (id && id.split) {
                let tokens = id.split(':');
                let idType = tokens[0];
                if (idType) {
                    let idValue = parseInt(tokens[1]);
                    let currentValue = acc[idType] || 0;
                    if (idValue > currentValue) {
                        acc[idType] = idValue;
                    }
                }
            }
            return acc;
        }, {});
    
        let newCompositeKeyProperty = new Property({
                id: getNewDataImporterModelId(mapOfIdTypeAndMaxIdValue, IdPrefixes.Property), 
                token: newPropertyKey,
                type: new Type(DataImporterDataTypes.String),
                nullable: true,
                nodeKey: true
        });

        let propertyRef = new PropertyRef(newCompositeKeyProperty.$id);

        // add property to node label definition
        nodeLabelDef.properties.push(newCompositeKeyProperty);

        // add constraint and index
        let constraint = new Constraint({
            id: getNewDataImporterModelId(mapOfIdTypeAndMaxIdValue, IdPrefixes.Constraint),
            name: `${newPropertyKey}_${nodeLabelDef.token}_uniq`,
            constraintType: 'uniqueness',
            entityType: 'node',
            nodeLabel: new NodeLabelRef(nodeLabelDef.$id),
            properties: [propertyRef]
        })            
        constraints.push(constraint);

        let index = new Index({
            id: getNewDataImporterModelId(mapOfIdTypeAndMaxIdValue, IdPrefixes.Index),
            name: `${newPropertyKey}_${nodeLabelDef.token}_uniq`,
            indexType: 'default',
            entityType: 'node',
            nodeLabel: new NodeLabelRef(nodeLabelDef.$id),
            properties: [propertyRef]
        })
        indexes.push(index);

        // update graphSchemaExtensionsRepresentation
        let nodeObjectForNodeLabel = nodeObjectTypes.find(x => x.labels.some(label => label.$ref.includes(`#${nodeLabelDef.$id}`)));
        if (nodeObjectForNodeLabel) {
            let nodeKeyProperty = new NodeKeyProperty({
                node: new NodeRef(nodeObjectForNodeLabel.$id),
                keyProperty: propertyRef
            })
            dataImporterModel.dataModel.graphSchemaExtensionsRepresentation.nodeKeyProperties.push(nodeKeyProperty);

            return {
                propRef: propertyRef,
                error: null
            }
        } else {
            return {
                propRef: propertyRef,
                error: `Warning: PropertyRef added for ${newPropertyKey}, but couldn't update graphSchemaExtensionsRepresentation.nodeKeyProperties. No node object type found for node label ${nodeLabelString}`
            }
        }
    } else {
        return {
            propRef: null,
            error: `nodeLabel '${nodeLabelString}' not found in data importer model`
        }
    }
}

const handlePropertyMapping = ({ 
    mappedPropertyKeys, index,
    propKey, propRef, propValue,
    propertyMappings, tableSchemaFields,
    dataModelItem
}) => {

    if (!mappedPropertyKeys.includes(propKey)) {
        // add PropertyMapping
        let propertyMapping = new PropertyMapping({
            fieldName: propKey,
            property: propRef
        })                        
        propertyMappings.push(propertyMapping);
        mappedPropertyKeys.push(propKey);

        // add a TableSchemaField
        let importerDatatype = new Type(DataImporterDataTypes.String);
        if (dataModelItem) {
            let dataModelPropDef = dataModelItem.getPropertyByName(propKey);
            importerDatatype = convertDataType(dataModelPropDef?.datatype);
        }
        let tableSchemaField = new TableSchemaField({
            name: propKey,
            sample: index === 0 ? `${propValue}` : "",
            recommendedType: importerDatatype
        })    
        tableSchemaFields.push(tableSchemaField);
    }
}

// this will make a data model using the returned data
//   if userSpecifiedModel is present and matches the the label / rel / property, its settings
//   will be used to override the model created from the data
export const makeDataModelFromData = ({ nodesByLabel, relsByType, skipItemList = [], skipPropMap = {}, userSpecifiedModel }) => {
    var dataModel = DataModel();

    let InspectionLimit = 5000;
    let existingNodes = [];
    let anyNewNodes = false;

    // handle nodes and node properties
    Object.keys(nodesByLabel).forEach(labelString => {
        if (!skipItemList.includes(labelString)) {
            var nodeLabel = new dataModel.NodeLabel({
                label: labelString
            });
            dataModel.addNodeLabel(nodeLabel);
    
            let existingNodeLabel = (userSpecifiedModel) ? userSpecifiedModel.getNodeLabelByLabel(labelString) : null;
            if (existingNodeLabel) {
                nodeLabel.display = new dataModel.NodeLabelDisplay(existingNodeLabel.display);
                existingNodes.push(nodeLabel);
            } else {
                anyNewNodes = true;
            }
    
            let nodesMap = nodesByLabel[labelString];
            let nodes = Object.values(nodesMap);
    
            let propertyValueMap = getPropertyValueMap(nodes, InspectionLimit);
            let propsToSkip = skipPropMap[labelString] || [];
            propsToSkip.forEach(prop => delete propertyValueMap[prop])
    
            let analysisArray = [];
            let nodeKeyOrUniqueConstraintExists = false;
    
            Object.keys(propertyValueMap).forEach(propName => {
                let values = propertyValueMap[propName];
    
                let existingProperty = existingNodeLabel?.getPropertyByName(propName);
                let existingDatatype = existingProperty?.datatype;
                let propValueAnalysis = analyzeValues(propName, values);
                analysisArray.push(propValueAnalysis);
                let dataType = (existingDatatype) ? existingDatatype : propValueAnalysis.getTopNeoDataType();
            
                let booleanFlags = {};
                if (existingProperty) {
                    booleanFlags = {
                        isPartOfKey: existingProperty.isPartOfKey,
                        isArray: existingProperty.isArray,
                        isIndexed: existingProperty.isIndexed,
                        hasUniqueConstraint: existingProperty.hasUniqueConstraint,
                        mustExist: existingProperty.mustExist
                    }
                    if (!nodeKeyOrUniqueConstraintExists) {
                        nodeKeyOrUniqueConstraintExists = existingProperty.isPartOfKey || existingProperty.hasUniqueConstraint;
                    }
                }
                var propertyMap = {
                    key: null, 
                    name: propName, 
                    datatype: dataType, 
                    referenceData: null
                }
                nodeLabel.addOrUpdateProperty (propertyMap, booleanFlags);
            })
    
            if (!nodeKeyOrUniqueConstraintExists) {
                let recommendedKey = getRecommendedKeyFromValueAnalysis(analysisArray, nodes);
                if (recommendedKey) {
                    let keyProp = nodeLabel.getPropertyByName(recommendedKey);
                    if (keyProp) {
                        keyProp.isPartOfKey = true;
                    }
                }
            }
        }
    })

    // handle relationships and relationship properties
    Object.keys(relsByType).forEach(typeString => {
        if (!skipItemList.includes(typeString)) {
            let { type, startLabel, endLabel, relsByIdentity } = relsByType[typeString];
            let rels = Object.values(relsByIdentity);
    
            let startNodeLabel = dataModel.getNodeLabelByLabel(startLabel);
            let endNodeLabel = dataModel.getNodeLabelByLabel(endLabel);
    
            var properties = {
                type: type,
                startNodeLabel: startNodeLabel,
                endNodeLabel: endNodeLabel
            }
            var relationshipType = new dataModel.RelationshipType(properties);
            dataModel.addRelationshipType(relationshipType);
    
            let existingRelationshipType = dataModel.getRelationshipType(type, startLabel, endLabel);
    
            let propertyValueMap = getPropertyValueMap(rels, InspectionLimit);
            let propsToSkip = skipPropMap[typeString] || [];
            propsToSkip.forEach(prop => delete propertyValueMap[prop])
    
            Object.keys(propertyValueMap).forEach(propName => {
    
                let values = propertyValueMap[propName];
    
                let existingProperty = existingRelationshipType?.getPropertyByName(propName);
                let existingDatatype = existingProperty?.datatype;
                let dataType = (existingDatatype) ? existingDatatype : analyzeValues(propName, values).getTopNeoDataType();
    
                // for now we're going to skip mustExist, it's not needed for data importer import
                var propertyMap = {
                    key: null, 
                    name: propName, 
                    datatype: dataType, 
                    referenceData: null
                }      
                relationshipType.addOrUpdateProperty(propertyMap);
            });
        }
    });

    if (anyNewNodes) {
        // handle display layout
        //  lock nodes from existing model first
        existingNodes.map(x => {
            x.display.isLocked = true; // lock it so when we do dagre layout we don't reposition everything
        });

        doDagreLayout(dataModel, {});    

        //  unlock nodes from existing model 
        existingNodes.map(x => x.display.isLocked = false);
    }

    return dataModel;
}

export const runAndExportData = async (cypherQueries, cypherParameters, optionsAndFunctions) => {

    let {
        prefix,
        dataModel,
        dataModelText,
        skipItems,
        skipProperties,
        executeCypherAsPromise,
        checkIfUserHasCancelledFunction,
        statusFunction,
        exportToZip = true,
        exportWorkbenchModel = false,
    } = optionsAndFunctions; 

    let stopProcessing = false;
    let skipItemList = (skipItems) ? skipItems.split(',').map(x => x.trim()) : [];
    let skipPropMap = parseSkipProperties(skipProperties);

    let nodesByLabel = {};
    let nodeById = {};
    let relsByType = {};

    let zip = null;
    if (exportToZip) {
        zip = new JSZip();
    }

    for (let q = 0; q < cypherQueries.length; q++) {

        if (checkIfUserHasCancelledFunction()) {
            stopProcessing = true;
            break;
        }

        let cypherQuery = cypherQueries[q];

        // run query
        let options = { dontStringify: true };

        await statusFunction({
            about: cypherQuery,
            status: 'Running'
        });

        let results = await executeCypherAsPromise(cypherQuery, cypherParameters, null, options);
        let { headers, rows, isError } = results;
        if (isError) {
            await statusFunction({
                about: cypherQuery,
                isError,
                errorMessage: getErrorMsg(headers, rows)
            });
            return;
        } else {
            await statusFunction({
                about: cypherQuery,
                status: 'Finished'
            });
        }

        // extract any nodes, relationships, or paths returned
        rows = rewriteIntegers(rows);    
        let identityObjs = findObjectsContainingKeys(rows, 'identity');
        
        let nodes = identityObjs.filter(x => isNode(x));
        let rels = identityObjs.filter(x => isRelationship(x));

        // we need to group the nodes by label
        nodes.forEach((node) => {
            nodeById[node.identity] = node;
            node.labels.forEach(label => {
                if (!skipItemList.includes(label)) {
                    let nodesForLabel = nodesByLabel[label];
                    if (!nodesForLabel) {
                        nodesForLabel = {};
                        nodesByLabel[label] = nodesForLabel;
                    }
                    nodesForLabel[node.identity] = node;
                }
            })
        })

        rels.forEach((rel) => {
            let relType = rel.type;

            if (!skipItemList.includes(relType)) {

                let startNode = nodeById[rel.start];
                let endNode = nodeById[rel.end];
                let startLabel = (startNode) ? getRelNodeLabel({startOrEndNode: startNode, skipItemList}) : null;
                let endLabel = (endNode) ? getRelNodeLabel({startOrEndNode: endNode, skipItemList}) : null;
    
                // overriding basic relType because the same name may exist between different start end end node labels
                relType = `${startLabel}_${relType}_${endLabel}`;
                let relsForType = relsByType[relType];
                if (!relsForType) {
                    relsForType = {
                        type: rel.type,
                        startLabel,
                        endLabel,
                        relsByIdentity: {}
                    };
                    relsByType[relType] = relsForType;
                }
                relsForType.relsByIdentity[rel.identity] = rel;
            }
        })

        await sleep(25);

    }
    if (stopProcessing) {
        return;
    }  

    if (Object.keys(nodesByLabel).length === 0 && Object.keys(relsByType).length === 0) {
        await statusFunction({
            about: 'All',
            isError: true,
            errorMessage: "No nodes, relationships, or paths were returned"
        });
        return;
    }    

    let combinedDataModel = makeDataModelFromData({ 
            nodesByLabel, relsByType, 
            skipItemList, skipPropMap,
            userSpecifiedModel: dataModel 
    });
    let { dataImporterModel, helperObjects } = workbenchDataModelToImporterGraphModel(combinedDataModel, { onlySetSinglePropertyNodeKeys: true });    
    let { nodeRefByLabelMap, nodePropRefsByLabelMap, relRefByTypeMap, relPropRefsByTypeMap } = helperObjects;

    let labels = Object.keys(nodesByLabel);
    let { keyByLabel, makeNewKeyProps } = await getNodeKeyProperties(nodesByLabel, combinedDataModel, statusFunction);

    let nodeMappings = [];
    let relationshipMappings = [];
    let tableSchemas = [];

    for (let i = 0; i < labels.length; i++) {
        if (checkIfUserHasCancelledFunction()) {
            stopProcessing = true;
            break;
        }

        let label = labels[i];
        let dataModelNodeLabel = combinedDataModel.getNodeLabelByLabel(label);
        let nodeLabelPropKeys = dataModelNodeLabel && dataModelNodeLabel.properties ? Object.values(dataModelNodeLabel.properties).map(x => x.name) : null;

        let nodes = Object.values(nodesByLabel[label]);

        let propertyMappings = [];
        let propRefsByPropNameMap = nodePropRefsByLabelMap[label] || {};

        let mappedPropertyKeys = [];
        let tableSchemaFields = [];

        let errors = [];

        // create a CSV and download it
        let csvRows = nodes
            .map((node,index) => {
                let keyProp = keyByLabel[label];
                let exportObj = {};
                if (!keyProp) {
                    exportObj._neo_identity_ = node.identity
                }
                let propsToSkip = skipPropMap[label] || [];
                // NOTE: we should use nodeLabelPropKeys instead of node.properties if possible
                //  Reason: all data was analyzed for the data model, therefore all possible property keys are in the model
                //          if just using node.properties, prop keys that may or may not have a value won't get populated
                let keysToIterate = nodeLabelPropKeys || Object.keys(node.properties);
                keysToIterate.forEach(propKey => {                
                    if (!propsToSkip.includes(propKey)) {
                        let propValue = getPropValue(node.properties[propKey]);
                        exportObj[propKey] = propValue;

                        let propRef = propRefsByPropNameMap[propKey];
                        handlePropertyMapping({ 
                            mappedPropertyKeys, index,
                            propKey, propRef, propValue,
                            propertyMappings, tableSchemaFields,
                            dataModelItem: dataModelNodeLabel
                        })                            
                    }
                })
                // add any composite node keys
                let compositeNodeKeyProps = makeNewKeyProps[label];
                if (compositeNodeKeyProps) {
                    let { nodeKey, propsToJoin } = compositeNodeKeyProps;
                    let compositeValue = propsToJoin.map(propKey => getPropValue(node.properties[propKey])).join('_');
                    exportObj[nodeKey] = compositeValue;

                    // update node.properties with new value so it will be available when we process rels
                    node.properties[nodeKey] = compositeValue;

                    if (!mappedPropertyKeys.includes(nodeKey)) {
                        // we need to update the dataImporterModel to include the composite key
                        //   once we do this we'll have the propRef we need
                        let { propRef, error } = addCompositeKeyToDataImporterModel({dataImporterModel, newPropertyKey: nodeKey, nodeLabelString: label});
                        if (error) {
                            errors.push(error);
                        }

                        if (propRef) {
                            handlePropertyMapping({ 
                                mappedPropertyKeys, index,
                                propKey: nodeKey, propRef, propValue: compositeValue,
                                propertyMappings, tableSchemaFields,
                                dataModelItem: dataModelNodeLabel
                            })                            
                            propRefsByPropNameMap[nodeKey] = propRef;     
                        }
                    }
                }
                return exportObj;
            })

        if (errors.length > 0) {
            await statusFunction({
                about: label,
                isError: true,
                errorMessage: errors.join('\n')
            });
        }
    
        let fileName = getFileName({labelOrType: label, prefix}); 

        let nodeMapping = new NodeMapping({
            node: nodeRefByLabelMap[label],
            tableName: fileName,
            propertyMappings
        })        
        nodeMappings.push(nodeMapping);

        let tableSchema = new TableSchema({
            name: fileName,
            expanded: true,
            fields: tableSchemaFields
        });        
        tableSchemas.push(tableSchema);

        await downloadCsv({
            csvRows, 
            fileName,
            labelOrType: label,
            statusFunction,
            zip
        })

        await sleep(200);
    }
    if (stopProcessing) {
        return;
    }  

    let types = Object.keys(relsByType);
    for (let i = 0; i < types.length; i++) {
        if (checkIfUserHasCancelledFunction()) {
            stopProcessing = true;
            break;
        }
        let type = types[i];
        let { startLabel, endLabel, relsByIdentity } = relsByType[type];
        let rels = Object.values(relsByIdentity);

        let dataModelRelationshipType = combinedDataModel.getRelationshipType(type, startLabel, endLabel);
        let relTypePropKeys = dataModelRelationshipType && dataModelRelationshipType.properties ? Object.values(dataModelRelationshipType.properties).map(x => x.name) : null;

        let propertyMappings = [];
        let propRefsByPropNameMap = relPropRefsByTypeMap[type] || {};

        let mappedPropertyKeys = [];
        let tableSchemaFields = [];

        let startKeyProp = keyByLabel[startLabel];
        let endKeyProp = keyByLabel[endLabel];
        let startPropName = (startKeyProp) ? `start_${startLabel}_${startKeyProp}` : '_neo_start_identity_';
        let endPropName = (endKeyProp) ? `end_${endLabel}_${endKeyProp}` : '_neo_end_identity_';

        let csvRows = rels
            .map((rel, index) => {
                let startNode = nodeById[rel.start];
                let endNode = nodeById[rel.end];
                let exportObj = {};
                exportObj[startPropName] = (startKeyProp) ? getPropValue(startNode.properties[startKeyProp]) : rel.start;
                exportObj[endPropName] = (endKeyProp) ? getPropValue(endNode.properties[endKeyProp]) : rel.end;

                let propsToSkip = skipPropMap[type] || [];
                let keysToIterate = relTypePropKeys || Object.keys(rel.properties);
                keysToIterate.forEach(propKey => {                
                    if (!propsToSkip.includes(propKey)) {
                        let propValue = getPropValue(rel.properties[propKey]);
                        exportObj[propKey] = propValue;

                        let propRef = propRefsByPropNameMap[propKey];
                        handlePropertyMapping({ 
                            mappedPropertyKeys, index,
                            propKey, propRef, propValue,
                            propertyMappings, tableSchemaFields,
                            dataModelItem: dataModelRelationshipType
                        })                            
                    }
                })
                return exportObj;
            })

        let fileName = getFileName({labelOrType: type, prefix}); 

        let relationshipMapping = new RelationshipMapping({
            relationship: relRefByTypeMap[type],
            propertyMappings, 
            tableName: fileName,
            fromMapping: new RelationshipEndpointField({fieldName: startPropName}),
            toMapping: new RelationshipEndpointField({fieldName: endPropName})
        })        
        relationshipMappings.push(relationshipMapping);

        let tableSchema = new TableSchema({
            name: fileName,
            expanded: true,
            fields: tableSchemaFields
        });        
        tableSchemas.push(tableSchema);

        await downloadCsv({
            csvRows, 
            fileName,
            labelOrType: type,            
            statusFunction,
            zip
        })

        await sleep(200);
    }

    // update and output dataImporterModel
    let dataSourceSchema = new DataSourceSchema({
        type: 'local',
        tableSchemas: tableSchemas
    })

    dataImporterModel.dataModel.graphMappingRepresentation.dataSourceSchema = dataSourceSchema;
    dataImporterModel.dataModel.graphMappingRepresentation.nodeMappings = nodeMappings;
    dataImporterModel.dataModel.graphMappingRepresentation.relationshipMappings = relationshipMappings;
    
    let dataImporterModelJson = JSON.stringify(dataImporterModel, null, 2);
    let fileName = getExportFileNamePublic(dataModelText, 'cw_model', 'json', '_export_for_data_importer')
    if (fileName.match(/^No_Model_Selected_/)) {
        fileName = `${prefix}_for_data_importer.json`.replace('__', '_');
    }

    await downloadImporterModel({
        importerModel: dataImporterModelJson, 
        fileName, 
        statusFunction,
        zip
    })

    if (exportWorkbenchModel) {
        let metadata = getWorkbenchDataModelMetadata({ dataModelText, prefix });
        var exportData = getExportData(metadata, combinedDataModel);
        var modelJson = JSON.stringify(exportData, null, 2);

        let workbenchModelName = getExportFileNamePublic(dataModelText, 'cw_model', 'json', '_export_workbench_model')
        if (workbenchModelName.match(/^No_Model_Selected_/)) {
            workbenchModelName = `${prefix}_workbench_model.json`.replace('__', '_');
        }
    
        await downloadWorkbenchModel({
            workbenchDataModel: modelJson, 
            fileName: workbenchModelName, 
            statusFunction
        })
    }
}


