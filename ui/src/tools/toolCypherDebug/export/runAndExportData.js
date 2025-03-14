
import { findObjectsContainingKeys } from '../../../dataModel/graphUtil';
import { isNode, isRelationship } from '../../toolCypherBuilder/components/results/ResultsTable';
import { downloadUrlAsFile } from '../../../common/util/download';
import { rewriteIntegers } from '../database/databaseUtil';
import { sleep } from '../validation/validateCypher';
import { getRecommendedKey } from '../../../dataModel/propertyUtil/propertyAnalyzer';
import Papa from 'papaparse';

const getErrorMsg = (headers, rows) => {
    return JSON.stringify(rows);
}

const downloadCsv = async ({csvRows, labelOrType, prefix, statusFunction}) => {
    let csv = Papa.unparse(csvRows);
    var dataUrl = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    let fileLabel = labelOrType.replace(/\s/g, '_')
    let fileName = `${prefix}${fileLabel}.csv`
    downloadUrlAsFile(dataUrl, fileName);

    // report status of downloaded CSV
    await statusFunction({
        about: labelOrType,
        status: `Exported ${csvRows.length} rows to ${fileName}`
    });
}

const objectHasKeys = (obj, requiredKeys) => {
    if (typeof(obj) === 'object') {
        let keys = Object.keys(obj);
        return requiredKeys.every(x => keys.includes(x))
    } else {
        return false;
    }
}

const isDate = (value) => objectHasKeys(value, ['day', 'month', 'year'])

const isTime = (value) => objectHasKeys(value, ['second', 'minute', 'hour'])

const isDateTime = (value) => isTime(value) && isDate(value);

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
        return `${getDateString(value)}Z`;
    } else if (isTime(value)) {
        return `1970-01-01T${getTimeString(value)}Z`;        
    } else {
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

export const runAndExportData = async (cypherQueries, cypherParameters, optionsAndFunctions) => {

    let {
        prefix,
        dataModel,
        skipItems,
        skipProperties,
        executeCypherAsPromise,
        checkIfUserHasCancelledFunction,
        statusFunction
    } = optionsAndFunctions; 

    let stopProcessing = false;
    let skipItemList = (skipItems) ? skipItems.split(',').map(x => x.trim()) : [];
    let skipPropMap = parseSkipProperties(skipProperties);

    let nodesByLabel = {};
    let nodeById = {};
    let relsByType = {};

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
    
                relType = `${startLabel}_${relType}_${endLabel}`;
                let relsForType = relsByType[relType];
                if (!relsForType) {
                    relsForType = {
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

    let labels = Object.keys(nodesByLabel);
    let { keyByLabel, makeNewKeyProps } = await getNodeKeyProperties(nodesByLabel, dataModel, statusFunction);

    for (let i = 0; i < labels.length; i++) {
        if (checkIfUserHasCancelledFunction()) {
            stopProcessing = true;
            break;
        }
        let label = labels[i];
        let nodes = Object.values(nodesByLabel[label]);
        // create a CSV and download it
        let csvRows = nodes
            .map(node => {
                let keyProp = keyByLabel[label];
                let exportObj = {};
                if (!keyProp) {
                    exportObj._neo_identity_ = node.identity
                }
                let propsToSkip = skipPropMap[label] || [];
                Object.keys(node.properties).forEach(propKey => {
                    if (!propsToSkip.includes(propKey)) {
                        exportObj[propKey] = getPropValue(node.properties[propKey]);
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
                }
                return exportObj;
            })

        downloadCsv({
            csvRows, 
            labelOrType: label, 
            prefix, 
            statusFunction
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

        let csvRows = rels
            .map(rel => {
                let startNode = nodeById[rel.start];
                let endNode = nodeById[rel.end];
                let startKeyProp = keyByLabel[startLabel];
                let endKeyProp = keyByLabel[endLabel];
                let exportObj = {};
                if (!startKeyProp) {
                    exportObj._neo_start_identity_ = rel.start
                } else {
                    exportObj[`start_${startLabel}_${startKeyProp}`] = getPropValue(startNode.properties[startKeyProp]);
                }
                if (!endKeyProp) {
                    exportObj._neo_end_identity_ = rel.end
                }else {
                    exportObj[`end_${endLabel}_${endKeyProp}`] = getPropValue(endNode.properties[endKeyProp]);
                }
                let propsToSkip = skipPropMap[type] || [];
                Object.keys(rel.properties).forEach(propKey => {
                    if (!propsToSkip.includes(propKey)) {
                        exportObj[propKey] = getPropValue(rel.properties[propKey]);
                    }
                })
                return exportObj;
            })

        downloadCsv({
            csvRows, 
            labelOrType: type, 
            prefix, 
            statusFunction
        })

        await sleep(200);
    }
}


