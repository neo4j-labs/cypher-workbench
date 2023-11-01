
import DataModel from '../dataModel';
import DataTypes from '../DataTypes';

function resetDataChangeFlags (dataModel) {
    var timestamp = new Date().getTime();
    // the logic right now is that is only clears things < timestamp, so we need to ensure we add 1 millisecond so things will clear
    dataModel.resetDataChangeFlags({
        timestamp: timestamp+1
    });
}

export const getDataModel = (definitions) => {
    var dataModel = DataModel();
    definitions.map(def => {
        var propContainer = null;
        if (typeof(def.label) === 'string') {
            propContainer = new dataModel.NodeLabel({
                label: def.label
            });
            dataModel.addNodeLabel(propContainer);
        } else if (typeof(def.type) === 'string') {
            var startNodeLabel = dataModel.getNodeLabelByLabel(def.startNodeLabel);
            var endNodeLabel = dataModel.getNodeLabelByLabel(def.endNodeLabel);
            var properties = {
                type: def.type,
                startNodeLabel: startNodeLabel,
                endNodeLabel: endNodeLabel,
                description: `${startNodeLabel.label}-${def.type}->${endNodeLabel.label}`
            }
            propContainer = new dataModel.RelationshipType(properties);
            dataModel.addNodeLabel(startNodeLabel);
            dataModel.addNodeLabel(endNodeLabel);
            dataModel.addRelationshipType(propContainer);
        }

        if (def.properties) {
            def.properties.map(prop => {
                var propertyMap = {
                    key: (prop.key) ? prop.key : prop.name, 
                    name: prop.name, 
                    datatype: (prop.datatype) ? prop.datatype: DataTypes.String
                }      
                var isPartOfKey = (typeof(prop.isPartOfKey) === 'boolean') ? prop.isPartOfKey : false;
                var hasUniqueConstraint = (typeof(prop.hasUniqueConstraint) === 'boolean') ? prop.hasUniqueConstraint : false;
                var isIndexed = (typeof(prop.isIndexed) === 'boolean') ? prop.isIndexed : false;
                var mustExist = (typeof(prop.mustExist) === 'boolean') ? prop.mustExist : false;
                propContainer.addOrUpdateProperty(propertyMap, { isPartOfKey, hasUniqueConstraint, isIndexed, mustExist });
            })
        }
    })

    resetDataChangeFlags(dataModel);
    return dataModel;
}