
import DataModel from '../dataModel';
import { ConstraintTypes, IndexTypes } from './constraintIndexTypes';

export const stripTicks = (x) => {
    const result = x.match(/`(.*)`/);
    if (result && result[1]) {
        return result[1];
    } else {
        return x;
    }
}

export const stripParens = (x) => {
    const result = x.match(/\((.*)\)/);
    if (result && result[1]) {
        return result[1];
    } else {
        return x;
    }
}

export const getNodeLabelDataModel = (nodeLabelString, propStringArray, constraintType) => {
    var dataModel = DataModel();
    var nodeLabel = new dataModel.NodeLabel({
        label: nodeLabelString
    });
    dataModel.addNodeLabel(nodeLabel);
    if (Array.isArray(propStringArray)) {
        addProps(nodeLabel, propStringArray, constraintType);
    }
    return dataModel;
}

export const getRelationshipTypeDataModel = (relationshipTypeString, propStringArray, constraintType) => {
    var dataModel = DataModel();
    const startNodeLabel = new dataModel.NodeLabel({ label: '' });
    const endNodeLabel = new dataModel.NodeLabel({ label: '' });

    var properties = {
        type: relationshipTypeString,
        startNodeLabel: startNodeLabel,
        endNodeLabel: endNodeLabel,
        description: `${startNodeLabel.label}-${relationshipTypeString}->${endNodeLabel.label}`
    }
    var relationshipType = new dataModel.RelationshipType(properties);
    dataModel.addNodeLabel(startNodeLabel);
    dataModel.addNodeLabel(endNodeLabel);
    dataModel.addRelationshipType(relationshipType);

    if (Array.isArray(propStringArray)) {
        addProps(relationshipType, propStringArray, constraintType);
    }
    return dataModel;    
}

export const addProps = (propContainer, propStringArray, constraintOrIndexType) => {
    propStringArray.map(prop => {
        const propertyMap = { name: prop };
        const isPartOfKey = (constraintOrIndexType === ConstraintTypes.NodeKey) ? true : false;
        const hasUniqueConstraint = (constraintOrIndexType === ConstraintTypes.Uniqueness) ? true : false;
        const mustExist = (constraintOrIndexType === ConstraintTypes.NodePropertyExistence 
                            || constraintOrIndexType === ConstraintTypes.RelationshipPropertyExistence)
                            ? true : false;
        const isIndexed = (constraintOrIndexType === IndexTypes.SinglePropertyIndex) ? true : false;

        propContainer.addOrUpdateProperty (propertyMap, { 
            isPartOfKey, hasUniqueConstraint, mustExist, isIndexed });
    });
}