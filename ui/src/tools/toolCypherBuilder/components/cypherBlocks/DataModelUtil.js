
import { 
    NodePattern, 
    RelationshipPattern
} from '../../../../dataModel/cypherPattern';
import { WithVariable } from '../../../../common/parse/antlr/withVariable';

export const PROPERTY_DEFINITION_TYPES = {
    NODE_LABEL: 'nodeLabel',
    NODE_LABEL_RELATIONSHIP_TYPE_NODE_LABEL: 'nodeLabelRelTypeNodeLabel'
}

export const getPropertyKeysForPatternItem = (scopedBlockProvider, dataModel, patternItem) => {

    var propertyKeys = new Set();
    if (dataModel) {
        if (patternItem instanceof NodePattern) {
            patternItem.nodeLabels.map(nodeLabelString => {
                var nodeLabels = dataModel.getNodeLabelsByLabel(nodeLabelString);
                if (nodeLabels && nodeLabels.length > 0) {
                    nodeLabels
                        .filter(nodeLabel => nodeLabel.properties)
                        .map(nodeLabel => 
                            Object.values(nodeLabel.properties).map(propertyDefinition => 
                                propertyKeys.add(propertyDefinition.name))
                        );
                    }
                });
        } else if (patternItem instanceof RelationshipPattern) {
            var nodeRelNodePattern = scopedBlockProvider.getNodeRelNodePattern(patternItem);
            if (nodeRelNodePattern) {
                nodeRelNodePattern.startNodePattern.nodeLabels.map(startNodeLabelString => {
                    nodeRelNodePattern.relationshipPattern.types.map(relTypeString => {
                        nodeRelNodePattern.endNodePattern.nodeLabels.map(endNodeLabelString => {
                            var relationshipType = dataModel.getRelationshipType(relTypeString, startNodeLabelString, endNodeLabelString);
                            if (relationshipType && relationshipType.properties) {
                                Object.values(relationshipType.properties)
                                    .map(propertyDefinition => propertyKeys.add(propertyDefinition.name))
                            }
                        });
                    });
                });
            }
        }
    }
    return Array.from(propertyKeys);
}

export const getPropertyDefinitionsForPatternItem = (patternItem, dataModel, scopedBlockProvider) => {
    var propertyDefinitions = [];
    if (dataModel) {
        if (patternItem instanceof NodePattern) {
            patternItem.nodeLabels.map(nodeLabelString => {
                var nodeLabels = dataModel.getNodeLabelsByLabel(nodeLabelString);
                if (nodeLabels && nodeLabels.length > 0) {
                    nodeLabels
                        .filter(nodeLabel => nodeLabel.properties)
                        .map(nodeLabel => 
                            Object.values(nodeLabel.properties).map(propertyDefinition => 
                                propertyDefinitions.push({
                                    type: PROPERTY_DEFINITION_TYPES.NODE_LABEL,
                                    nodeLabel: nodeLabel,
                                    propertyDefinition: propertyDefinition
                                })
                            )
                        )
                }
            })
        } else if (patternItem instanceof RelationshipPattern) {
            var nodeRelNodePattern = scopedBlockProvider.getNodeRelNodePattern(patternItem);
            if (nodeRelNodePattern) {
                if (nodeRelNodePattern.startNodePattern && nodeRelNodePattern.startNodePattern.nodeLabels
                    && nodeRelNodePattern.relationshipPattern && nodeRelNodePattern.relationshipPattern.types
                    && nodeRelNodePattern.endNodePattern && nodeRelNodePattern.endNodePattern.nodeLabels) {
                    nodeRelNodePattern.startNodePattern.nodeLabels.map(startNodeLabelString => {
                        // TODO: switch this to getNodeLabelsByLabel
                        var startNodeLabel = dataModel.getNodeLabelByLabel(startNodeLabelString);
                        if (startNodeLabel) {
                            nodeRelNodePattern.relationshipPattern.types.map(relTypeString => {
                                nodeRelNodePattern.endNodePattern.nodeLabels.map(endNodeLabelString => {
                                    // TODO: switch this to getNodeLabelsByLabel
                                    var endNodeLabel = dataModel.getNodeLabelByLabel(endNodeLabelString);
                                    var relationshipType = dataModel.getRelationshipType(relTypeString, startNodeLabelString, endNodeLabelString);
                                    if (relationshipType && relationshipType.properties) {
                                        Object.values(relationshipType.properties)
                                            .map(propertyDefinition => {
                                                propertyDefinitions.push({
                                                    type: PROPERTY_DEFINITION_TYPES.NODE_LABEL_RELATIONSHIP_TYPE_NODE_LABEL,
                                                    startNodeLabel: startNodeLabel,
                                                    relationshipType: relationshipType,
                                                    endNodeLabel: endNodeLabel,
                                                    propertyDefinition: propertyDefinition
                                                });
                                            });
                                    }
                                });
                            });
                        }
                    });
                }
            }
        }
    }
    return propertyDefinitions;
}

export const resolvePatternVariableItem = (item, scopedBlockProvider) => {
    if (item instanceof WithVariable && scopedBlockProvider) {
        var variableToLookup = null;
        if (item.expression && item.variable) {
            variableToLookup = item.expression;
        } else {
            variableToLookup = item.variable;
        }
        var list = scopedBlockProvider.getVariableScope().getVariableItemList(variableToLookup);
        if (list && list.length > 0) {
            var patternItem = list.find(item => item instanceof NodePattern || item instanceof RelationshipPattern);
            if (patternItem) {
                return patternItem;
            } else {
                var withVariableItem = list.find(item => item instanceof WithVariable);
                if (withVariableItem) {
                    return resolvePatternVariableItem(withVariableItem, scopedBlockProvider.getPreviousScopedBlockProvider());
                }
            }
        }
    } 
    return null;
}

export const getResolvedPatternVariableItems = (variableScope, variable, scopedBlockProvider) => {
    var list = variableScope.getVariableItemList(variable);
    if (list && list.map) {
        list = list
            .map(item => {
                if (item instanceof WithVariable) {
                    return resolvePatternVariableItem(item, scopedBlockProvider.getPreviousScopedBlockProvider());
                } else {
                    return item;
                }
            })
            .filter(item => item);   // get rid of nulls
        return list;
    } else {
        return [];
    }
}
