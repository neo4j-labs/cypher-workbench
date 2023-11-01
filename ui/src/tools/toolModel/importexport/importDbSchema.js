
import DataModel from '../../../dataModel/dataModel';

const CONSTRAINT_REGEXP = {
    isUnique: new RegExp(/CONSTRAINT ON \( (.+) \) ASSERT (.+) IS UNIQUE/),
    isNodeKey: new RegExp(/CONSTRAINT ON \( (.+) \) ASSERT \((.+)\) IS NODE KEY/),
    assertExists: new RegExp(/CONSTRAINT ON \( (.+) \) ASSERT exists\((.+)\)/)
}

function getNodeLabel (nodeObject) {
    if (nodeObject && nodeObject.labels && nodeObject.labels.length > 0) {
        return nodeObject.labels[0];
    } else {
        return null;
    }
}

function processConstraintText (constraint) {
    var result = Object.keys(CONSTRAINT_REGEXP)
        .map(key => {
            var regexp = CONSTRAINT_REGEXP[key];
            var matchResult = constraint.match(regexp);
            if (matchResult && matchResult[2]) {
                var properties = matchResult[2].split(',')
                    .filter(x => x) // cannot be zero-length
                    .map(x => x.trim().split('.')[1])
                return {
                    type: key,
                    properties: properties
                }
            } else {
                return null;
            }
        })
        .filter(x => x);   // cannot be null
    if (result && result.length > 0) {
        return result[0];
    } else {
        return null;
    }
}

function addConstraint (propertyContainer, constraint, dataTypeMap) {
    //var constraintType = constraint.type;
    constraint = constraint || {};
    var properties = constraint.properties || [];
    var dataType = dataTypeMap['string'];
    var refData = null;
    /* these flags no longer valid - instead using info from db.indexes() / db.constraints()
    var booleanFlags = {
        isPartOfKey: (constraintType === 'isNodeKey') ? true : false,
        hasUniqueConstraint: (constraintType === 'isUnique') ? true : false,
        isIndexed: (constraintType === 'isUnique' || constraintType === 'isNodeKey') ? true : false,
        mustExist: (constraintType === 'isNodeKey' || constraintType === 'assertExists') ? true : false
    }*/
    var booleanFlags = {
        isPartOfKey: false,
        hasUniqueConstraint: false,
        isIndexed: false,
        mustExist: false
    }

    if (properties && properties.length > 0) {
        properties.map(property => {
            var propertyMap = {
                key: null, 
                name: property, 
                datatype: dataType, 
                referenceData: refData
            }        
            propertyContainer.addOrUpdateProperty (propertyMap, booleanFlags)
        });
    }
}

export function getDataModelFromRawDbSchema (dbSchemaJSON) {
    var dataModel = DataModel();

    var dataTypeMap = {};
    Object.values(dataModel.DataTypes).map(dataType => {
        dataTypeMap[dataType.toLowerCase()] = dataType;
    });

    // process nodes
    if (dbSchemaJSON.nodes) {
        var nodeLabelIdMap = {};
        dbSchemaJSON.nodes.map(nodeObject => {
            var nodeLabelString = getNodeLabel(nodeObject);
            if (nodeLabelString) {
                var nodeLabel = new dataModel.NodeLabel({
                    label: nodeLabelString
                });
                nodeLabelIdMap[JSON.stringify(nodeObject.identity)] = nodeLabel;
                dataModel.addNodeLabel(nodeLabel);

                if (nodeObject.properties && nodeObject.properties.indexes
                                && nodeObject.properties.indexes.length > 0) {
                    nodeObject.properties.indexes.map(indexProperty => {
                        if (!indexProperty.match(/,/)) {
                            var dataType = dataTypeMap['string'];
                            var refData = null;
                            var booleanFlags = {
                                isPartOfKey: false,
                                hasUniqueConstraint: false,
                                isIndexed: false,   // changing - setting of flags handled elsewhere now 
                                mustExist: false
                            }
                            var propertyMap = {
                                key: null, 
                                name: indexProperty, 
                                datatype: dataType, 
                                referenceData: refData
                            }
                            nodeLabel.addOrUpdateProperty (propertyMap, booleanFlags);
                        }
                    });
                }

                if (nodeObject.properties && nodeObject.properties.constraints
                                    && nodeObject.properties.constraints.length > 0) {
                    nodeObject.properties.constraints.map(constraintText => {
                        //console.log('constraintText: ', constraintText);
                        // 08/03/2021: this will process old style constraints...new constraint string 
                        //  format will be ignored, because regex won't match, however, will be caught
                        //  by another process that handles constraints and indexes specifically
                        const constraint = processConstraintText(constraintText);
                        addConstraint (nodeLabel, constraint, dataTypeMap);
                    });
                }
            }
        });
    }

    // process relationships
    if (dbSchemaJSON.relationships) {
        dbSchemaJSON.relationships.map(relationshipObject => {
            var startNodeLabel = nodeLabelIdMap[JSON.stringify(relationshipObject.start)];
            var endNodeLabel = nodeLabelIdMap[JSON.stringify(relationshipObject.end)];
            var properties = {
                type: relationshipObject.type,
                startNodeLabel: startNodeLabel,
                endNodeLabel: endNodeLabel
            }
            var relationshipType = new dataModel.RelationshipType(properties);
            dataModel.addRelationshipType(relationshipType);
        });
    }

    return dataModel;
}

export function getDataModelFromDbSchema (dbSchemaJSON) {
    var dataModel = DataModel();

    var dataTypeMap = {};
    Object.values(dataModel.DataTypes).map(dataType => {
        dataTypeMap[dataType.toLowerCase()] = dataType;
    });

    // process nodes
    if (dbSchemaJSON.nodes) {
        var nodeLabelIdMap = {};
        dbSchemaJSON.nodes.map(nodeObject => {
            var nodeLabel = new dataModel.NodeLabel({
                label: nodeObject.name
            });
            nodeLabelIdMap[nodeObject.name] = nodeLabel;
            dataModel.addNodeLabel(nodeLabel);

            if (nodeObject.constraints && nodeObject.constraints.length > 0) {
                //console.log('nodeObject: ', nodeObject);
                nodeObject.constraints.map(constraint => {
                    addConstraint (nodeLabel, constraint, dataTypeMap);
                })
            }
        });
    }

    // process relationships
    if (dbSchemaJSON.relationships) {
        dbSchemaJSON.relationships.map(relationship => {
            var startNodeLabel = nodeLabelIdMap[relationship.startNode];
            var endNodeLabel = nodeLabelIdMap[relationship.endNode];
            var properties = {
                type: relationship.relationshipType,
                startNodeLabel: startNodeLabel,
                endNodeLabel: endNodeLabel
            }
            var relationshipType = new dataModel.RelationshipType(properties);
            dataModel.addRelationshipType(relationshipType);
        });
    }

    return dataModel;
}
