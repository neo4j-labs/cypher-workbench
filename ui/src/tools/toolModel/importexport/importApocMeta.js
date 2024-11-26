
import DataModel from '../../../dataModel/dataModel';

function addProperties (dataModel, propertyContainer, properties, dataTypeMap, config) {
    config = config || {};
    Object.keys(properties).map(propName => {
        var propObj = properties[propName];
        var dataType = dataTypeMap[propObj.type.toLowerCase()];
        var refData = null;
        var booleanFlags = {};
        if (config.importFromJsonDirectly) {
            booleanFlags = {
                isPartOfKey: propObj.unique && propObj.existence,
                hasUniqueConstraint: propObj.unique,
                isIndexed: propObj.indexed || propObj.unique,
                mustExist: propObj.existence
            }
        } else {
            // we will get flags from using info from db.indexes() / db.constraints() instead later on
            booleanFlags = {
                isPartOfKey: false,
                hasUniqueConstraint: false,
                isIndexed: false,
                mustExist: false
            }
        }
        var propertyMap = {
            key: null, 
            name: propName, 
            datatype: dataType, 
            referenceData: refData
        }
        propertyContainer.addOrUpdateProperty (propertyMap, booleanFlags);
    });
}

export function getDataModelFromApocMetaSchema (apocMetaSchemaJSON, config) {
    config = config || {};
    var dataModel = DataModel();

    var nodeKeys = Object.keys(apocMetaSchemaJSON).filter(x => apocMetaSchemaJSON[x].type === 'node');
    //var relationshipKeys = Object.keys(apocMetaSchemaJSON).filter(x => apocMetaSchemaJSON[x].type === 'relationship');

    var dataTypeMap = {};
    Object.values(dataModel.DataTypes).map(dataType => {
        dataTypeMap[dataType.toLowerCase()] = dataType;
    });

    // process nodes
    var secondaryNodeLabels = new Set();
    if (nodeKeys && nodeKeys.length > 0) {
        nodeKeys.map(nodeKey => {
            var nodeValue = apocMetaSchemaJSON[nodeKey];
            if (nodeValue.labels && nodeValue.labels.length) {
                nodeValue.labels.map(x => {
                    if (!secondaryNodeLabels.has(x)) {
                        secondaryNodeLabels.add(x);
                    }
                });
            }
        });
    }

    if (nodeKeys && nodeKeys.length > 0) {
        var nodeLabelIdMap = {};
        nodeKeys.map(nodeKey => {
            var nodeValue = apocMetaSchemaJSON[nodeKey];
            var nodeLabel = dataModel.getNodeLabelByLabel(nodeKey);
            if (!nodeLabel) {
                nodeLabel = new dataModel.NodeLabel({
                    label: nodeKey
                });
                nodeLabelIdMap[nodeKey] = nodeLabel;
                dataModel.addNodeLabel(nodeLabel);
            }
            if (nodeValue.labels && nodeValue.labels.length) {
                dataModel.ensureSecondaryNodeLabels (nodeLabel, nodeValue.labels, dataModel);
            }
            nodeLabel.setIsOnlySecondaryNodeLabel(false, true);            

            addProperties(dataModel, nodeLabel, nodeValue.properties, dataTypeMap, config);
        });
    }

    // process relationships
    if (nodeKeys && nodeKeys.length > 0) {
        nodeKeys.map(nodeKey => {
            var nodeValue = apocMetaSchemaJSON[nodeKey];
            var relationshipMap = nodeValue.relationships;
            Object.keys(relationshipMap)
                .filter(relationshipName => (relationshipMap[relationshipName].direction === 'out'))
                .map(relationshipName => {
                    var relationshipObj = relationshipMap[relationshipName];
                    var startNodeLabel = nodeLabelIdMap[nodeKey];
                    var labels = relationshipObj.labels;
                    if (labels && labels.length > 0) {
                        var primaryNodeLabels = getPrimaryNodeLabels(secondaryNodeLabels, labels);
                        if (primaryNodeLabels.length > 0) {
                            labels = primaryNodeLabels;
                        } // otherwise, it consists of only secondary node labels, which are most likely primary in that case
                        labels.map(label => {
                            var endNodeLabel = nodeLabelIdMap[label];
                            if (startNodeLabel && endNodeLabel
                                && !startNodeLabel.isOnlySecondaryNodeLabel
                                && !endNodeLabel.isOnlySecondaryNodeLabel) {
                                var properties = {
                                    type: relationshipName,
                                    startNodeLabel: startNodeLabel,
                                    endNodeLabel: endNodeLabel
                                }
                                var relationshipType = new dataModel.RelationshipType(properties);
                                dataModel.addRelationshipType(relationshipType);
                                //console.log(relationshipObj.properties);
                                addProperties(dataModel, relationshipType, relationshipObj.properties, dataTypeMap, config);
                            }
                        })
                    }
                });
        });
    }

    return dataModel;
}

function getPrimaryNodeLabels (secondaryNodeLabels, labels) {
    if (labels && labels.length && secondaryNodeLabels && secondaryNodeLabels.size) {
        // make distinct set of labels
        var labelSet = new Set(labels);
        var difference = [...labelSet].filter(x => !secondaryNodeLabels.has(x));
        return difference;
    } 
    return labels;
}
