
import { isUpperCamelCase, isLowerCamelCase, isUpperCase, containsSpaces } from "../../common/text/textUtil";

export const findNodeLabelsWithNoProperties = (dataModel) => {
    if (dataModel) {
        return dataModel.getNodeLabelArray()
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel)
            .filter(nodeLabel => nodeLabel.getNumberOfProperties() === 0)
    } else {
        return [];
    }
}

export const findNodeLabelsWithNoNames = (dataModel) => {
    if (dataModel) {
        return dataModel.getNodeLabelArray()
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel && !nodeLabel.label)
    } else {
        return [];
    }
}

export const findSecondaryNodeLabelsWithNoNames = (dataModel) => {
    if (dataModel) {
        return dataModel.getNodeLabelArray()
            .filter(nodeLabel => nodeLabel.isOnlySecondaryNodeLabel && !nodeLabel.label)
    } else {
        return [];
    }
}

export const findNodeLabelsWithNoNodeKeys = (dataModel, config) => {
    config = config || {};
    if (dataModel) {
        return dataModel.getNodeLabelArray()
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel)
            .filter(nodeLabel => {
                var props = nodeLabel.properties || {};
                var keyProp = Object.values(props).find(prop => prop.isPartOfKey);
                if (keyProp) {
                    return false;
                } else {
                    if (config.acceptUniqueIndexedMustExistAsNodeKey) {
                        keyProp = Object.values(props).find(prop => prop.hasUniqueConstraint 
                                                                && prop.isIndexed
                                                                && prop.mustExist);
                    } 
                    var hasNoKeyProp = (keyProp) ? false : true;
                    return hasNoKeyProp;
                }
            })
    } else {
        return [];
    }
}

export const findNodeLabelsWithNoRelationshipTypes = (dataModel) => {
    if (dataModel) {
        var rels = dataModel.getRelationshipTypeArray();
        var nodeLabelMap = {};
        dataModel.getNodeLabelArray()
            .filter(x => !x.isOnlySecondaryNodeLabel)
            .map(x => nodeLabelMap[x.key] = x)

        rels.map(rel => {
            if (!rel.startNodeLabel.isOnlySecondaryNodeLabel) {
                delete nodeLabelMap[rel.startNodeLabel.key];
            }
            if (!rel.endNodeLabel.isOnlySecondaryNodeLabel) {
                delete nodeLabelMap[rel.endNodeLabel.key];
            }
        });
        return Object.values(nodeLabelMap);
    } else {
        return [];
    }
}

export const findNodeLabelsThatDoNotConformToStyleGuide = (dataModel) => {
    if (dataModel) {
        return dataModel.getNodeLabelArray()
            .filter(nodeLabel => nodeLabel.label)
            .filter(nodeLabel => !isUpperCamelCase(nodeLabel.label));
    } else {
        return [];
    }
}

export const findRelationshipTypesWithNoNames = (dataModel) => {
    if (dataModel) {
        return dataModel.getRelationshipTypeArray()
            .filter(relationshipType => !relationshipType.type)
    } else {
        return [];
    }
}

export const findRelationshipTypesThatDoNotConformToStyleGuide = (dataModel) => {
    if (dataModel) {
        return dataModel.getRelationshipTypeArray()
            .filter(relationshipType => relationshipType.type)
            .filter(relationshipType => !isUpperCase(relationshipType.type)
                                        || containsSpaces(relationshipType.type));
    } else {
        return [];
    }
}

export const findPropertiesWithNoNames = (dataModel) => {
    if (dataModel) {
        var violations = [];
        dataModel.getNodeLabelArray()
            .concat(dataModel.getRelationshipTypeArray())
            .map(propContainer => {
                const props = Object.values(propContainer.properties || {});
                props
                    .filter(prop => !prop.name)
                    .map(prop => {
                        violations.push({
                            propertyContainer: propContainer,
                            property: prop
                        });
                    });
            });
        return violations;
    } else {
        return [];
    }
}

export const findPropertiesThatDoNotConformToStyleGuide = (dataModel) => {
    if (dataModel) {
        var violations = [];
        dataModel.getNodeLabelArray()
            .concat(dataModel.getRelationshipTypeArray())
            .map(propContainer => {
                const props = Object.values(propContainer.properties || {});
                props
                    .filter(prop => prop.name)
                    .map(prop => {
                    if (!isLowerCamelCase(prop.name)) {
                        violations.push({
                            propertyContainer: propContainer,
                            property: prop
                        });
                    }
                });
            });
        return violations;
    } else {
        return [];
    }
}
