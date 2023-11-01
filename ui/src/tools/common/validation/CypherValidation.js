
import { parseCypher, parseCypherPattern } from '../../../common/parse/parseCypher';
import DataModel from "../../../dataModel/dataModel";
import { diffDataModels } from "../../../dataModel/dataModelDiff";

export const getDataModelFromCypherStatement = (cypherStatement, dataModelCanvas) => {
    if (cypherStatement) {
      var dataModel = DataModel();
      var result = parseCypher(cypherStatement, dataModel);
      if (!result.success) {
        var result2 = parseCypherPattern(cypherStatement, dataModel, dataModelCanvas);
        if (!result2.success) {
          return {
            success: false,
            message: result2.message
          }
        }
      } 
      return {
        success: true,
        dataModel: dataModel
      }
    } else {
      return {
        success: false,
        message: 'No cypher statement to parse'
      }
    }
  }

export const handleAnons = (diff, selectedDataModel) => {
  // get rid of any node labels where there is no node label to verify
  diff.nodeLabelDiff.inBnotA = diff.nodeLabelDiff.inBnotA.filter(x => x.label !== 'Anon');

  diff.relationshipTypeDiff.inBnotA = diff.relationshipTypeDiff.inBnotA
    //.filter(x => x.type !== 'ANON')
    .filter(x => {
      // we want to remove as differences any difference where we have an anonymous relationship
      //   and if both sides have node labels, there exists any relationship between the 2
      //   and if 1 side has a node label, there exists any relationship from that node label
      if (x.type === 'ANON') {
        var howMany, nodeLabel;
        if (x.startNodeLabel.label !== 'Anon' && x.endNodeLabel.label !== 'Anon') {
          nodeLabel = selectedDataModel.getNodeLabelByLabel(x.startNodeLabel.label);
          if (nodeLabel) {
            var connectedRelationshipTypes = selectedDataModel.getConnectedRelationshipTypes(nodeLabel);
            //console.log('x: ', x);
            //console.log('connectedRelationshipTypes: ', connectedRelationshipTypes);
            var findResult = connectedRelationshipTypes.find(rel => 
              rel.endNodeLabel.label === x.endNodeLabel.label
            );
            //console.log('findResult: ', findResult);
            if (findResult) {
              // we found it, so it's ok, return false to filter out
              return false;
            } else {
              return true;
            }
          } else {
            return true;
          }
        } else if (x.startNodeLabel.label === 'Anon') {
          nodeLabel = selectedDataModel.getNodeLabelByLabel(x.endNodeLabel.label);
          if (nodeLabel) {
            howMany = selectedDataModel.getConnectedRelationshipTypes(nodeLabel).length;
            return (howMany > 0) ? false : true;  // false = ok, filter it out as not an issue
          } else {
            return true;
          }
        } else {
          nodeLabel = selectedDataModel.getNodeLabelByLabel(x.startNodeLabel.label);
          if (nodeLabel) {
            howMany = selectedDataModel.getConnectedRelationshipTypes(nodeLabel).length;
            return (howMany > 0) ? false : true;  // false = ok, filter it out as not an issue
          } else {
            return true;
          }
        }
      } else {
        return true;
      }
    })
    .filter(x => {
      // we want to remove as differences any difference where either the
      //   start label or end label is Anon, but we actually end up finding the relationship
      //   and the other side matches
      if (x.startNodeLabel.label === 'Anon' || x.endNodeLabel.label === 'Anon') {
        // find any relationship that matches by type
        const relationshipTypes = selectedDataModel.getRelationshipTypesByType(x.type);
        var findResult;
        if (x.startNodeLabel.label === 'Anon' && x.endNodeLabel.label === 'Anon') {
          // if both sides are anon, if we have found any relationship types, 
          //  then it's not a difference, therefore it can be filtered by returning false
          return (relationshipTypes.length > 0) ? false : true;
        } else if (x.startNodeLabel.label === 'Anon') {
          // start label is not defined, but end label is defined
          findResult = relationshipTypes.find(relType => relType.endNodeLabel.label === x.endNodeLabel.label);
          if (findResult) {
            // we found it, so it's ok, return false to filter out
            return false;
          } else {
            return true;
          }
        } else {
          // the end label is not defined, but start label must be
          findResult = relationshipTypes.find(relType => relType.startNodeLabel.label === x.startNodeLabel.label);
          if (findResult) {
            // we found it, so it's ok, return false to filter out
            return false;
          } else {
            return true;
          }
        }
      } else {
        return true;
      }
    })
}

export const validateCypherAgainstModel = (cypherStatement, selectedDataModel, dataModelCanvas, config) => {
    config = config || {};
    var result = getDataModelFromCypherStatement(cypherStatement, dataModelCanvas);
    if (!result.success) {
        return {
          ...result,
          valid: false,
          diff: null
        }
    } else {
      const highlightDataModel = result.dataModel;
      var diff = diffDataModels(selectedDataModel, highlightDataModel, { 
        // Something like this (:Person)-[:ACTED_IN]->() will result in (:Person)-[:ACTED_IN]->(:Anon)
           // or (:Person)-[]->(:Movie) would result in (:Person)-[:ANON]->(:Movie)
           // typically these would be stripped out prior to the diff, setting to false leaves them in
        removeAnons: false,

        // if we have this (:Person {name:'foo'}) and also (:Person:Actor) then 
           // (:Actor {name:'foo'}) will pass
        ensureOnlySecondaryNodeLabelsHavePrimaryProperties: true,

        // if A model has (:Person)-[:ACTED_IN]->(:Movie), and the model defines :Actor as secondary
           // like this (:Person:Actor), then (:Actor)-[:ACTED_IN]->(:Movie) will pass
        primaryNodeLabelRelationshipsIncludeSecondaryNodeLabels: true,

        // if A has (:Person)-[:ACTED_IN]->(:Movie) and B has (:Person)-[:ACTED_IN]->() it will match
           // TECHNICAL NOTE: (:Person)-[:ACTED_IN]->() is really (:Person)-[:ACTED_IN]->(:Anon) where :Anon is a special 
           //  node label assigned when converting a cypher statement into a data model if no node label info is present
        allowRelationshipAnonStartEndToMatch: true,
        ...config
      });

      handleAnons(diff, selectedDataModel);

      var valid = true;
      if (diff.anyDifference()) {
        const mismatchedNodeProperties = diff.nodeLabelDiff.BdiffA
          .find(x => x.propertyDiff.inBnotA.length > 0)
        const nodePropertyFailedValidation = (mismatchedNodeProperties) ? true : false;

        const mismatchedRelationshipProperties = diff.relationshipTypeDiff.BdiffA
          .find(x => x.propertyDiff.inBnotA.length > 0)
        const relationshipPropertiesFailedValidation = (mismatchedRelationshipProperties) ? true : false;

        if (diff.nodeLabelDiff.inBnotA.length > 0 
          || diff.relationshipTypeDiff.inBnotA.length > 0
          || nodePropertyFailedValidation
          || relationshipPropertiesFailedValidation) {
          valid = false;
        }
      }
      return {
        success: true,
        valid: valid,
        diff: diff
      }
    }

  }
