
import DataModel from '../dataModel';
import {
    stripParens,
    stripTicks,
    getNodeLabelDataModel,
    getRelationshipTypeDataModel
} from './dataModelHelper';
import { ConstraintTypes } from './constraintIndexTypes';

const getFirstMatch = (regexResult) => {
    if (regexResult && regexResult.length >= 1) {
        return regexResult[1];
    } 
    return null;
}

export const parseConstraintDescription = (desc) => {
    var dataModel = DataModel();
    if (desc && desc.match) {
        const constraintInfo = desc.match(/CONSTRAINT ON (.*) ASSERT (.*)/);
        if (desc.length >= 2) {
            var firstPart = constraintInfo[1];
            var secondPart = constraintInfo[2];
            var firstPartMatch = firstPart.match(/^\(\)/); // check if ()-[ rel:REL ]-() vs ( node:Node )
            var isNodeConstraint = (firstPartMatch) ? false : true;

            var constraintType;
            var secondPartMatch = secondPart.match(/(?:exists)(.*)/);
            if (secondPartMatch) {
                constraintType = (isNodeConstraint) ? ConstraintTypes.NodePropertyExistence : ConstraintTypes.RelationshipPropertyExistence;
                secondPart = stripParens(secondPartMatch[1]);
            } else {
                secondPartMatch = secondPart.match(/(.*)\s((?:IS UNIQUE|IS NODE KEY))/);
                if (secondPartMatch) {
                    constraintType = (secondPartMatch[2] === 'IS UNIQUE') ? ConstraintTypes.Uniqueness : ConstraintTypes.NodeKey;
                    secondPart = stripParens(secondPartMatch[1]);
                } else {
                    // unknown format
                    return dataModel;
                }
            }
            var firstTokens, propStringArray;
            if (isNodeConstraint) {
                firstPart = stripParens(firstPart);
                firstTokens = firstPart.split(':').map(x => x.trim());
                var nodeLabelString = firstTokens[1];
                propStringArray = secondPart.split(',')
                    .map(x => x.trim())
                    .map(x => x.split('.')[1]);

                dataModel = getNodeLabelDataModel(nodeLabelString, propStringArray, constraintType);
            } else {
                //console.log(firstPart);
                // e.g. ()-[ has_menu_item:HAS_MENU_ITEM ]-()
                firstPartMatch = firstPart.match(/\(\)\-\[(.*)\]\-\(\)/);
                //console.log('firstPartMatch: ', firstPartMatch);
                if (firstPartMatch && firstPartMatch[1]) {
                    firstPart = firstPartMatch[1];
                    firstTokens = firstPart.split(':').map(x => x.trim());
                    var relationshipTypeString = firstTokens[1];
                    propStringArray = secondPart.split(',')
                        .map(x => x.trim())
                        .map(x => x.split('.')[1]);
    
                    dataModel = getRelationshipTypeDataModel(relationshipTypeString, propStringArray, constraintType);
                }
            }       
        }
    }
    return dataModel;
}

export const parseConstraintDetails = (details) => {
    if (details && details.match) {
        const constraintInfo = getFirstMatch(details.match(/Constraint\((.*)\)/));

        var id = getFirstMatch(constraintInfo.match(/id=([^,]*)/));
        id = (typeof(id) === 'string') ? parseInt(id) : id;
        const name = getFirstMatch(constraintInfo.match(/name='([^,']*)'/));
        const type = getFirstMatch(constraintInfo.match(/type='([^,']*)'/));
        const schema = getFirstMatch(constraintInfo.match(/schema=((?:\(|\-\[).*(?:\)|\]\-))/));

        return { id, name, type, schema };
    }
    return null;
}

export const parseSchema = (schema, constraintType) => {
    var dataModel = DataModel();
    if (schema && schema.indexOf && schema.match) {
        var propContainer = null;
        // (:Movie {title}) - regex[1] extracts 'Movie '
        var nodeMatch = schema.match(/^\(:(.*){/);  
        const props = schema.match(/{(.*)}/);
        var propStringArray;
        if (props && props[1]) {
            propStringArray = props[1].split(',').map(prop => prop = prop.trim());
        }

        if (nodeMatch && nodeMatch[1]) {
            var nodeLabelString = stripTicks(nodeMatch[1].trim());
            dataModel = getNodeLabelDataModel(nodeLabelString, propStringArray, constraintType);
        } else {
            // -[:ACTED_IN {role}]- - regex[1] extracts 'ACTED_IN '
            var relMatch = schema.match(/^\-\[:(.*){/);
            if (relMatch && relMatch[1]) {
                var relTypeString = relMatch[1].trim();
                relTypeString = stripTicks(relTypeString);
                dataModel = getRelationshipTypeDataModel(relTypeString, propStringArray, constraintType);
            }
        }
    }
    return dataModel;
}