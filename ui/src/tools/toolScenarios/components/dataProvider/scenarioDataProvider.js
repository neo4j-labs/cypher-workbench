import React from 'react'
import { Node } from 'slate';
import DataTypes from '../../../../dataModel/DataTypes';
import { getCypherStatementFromSlate } from '../../../toolCypherSuite/components/dataProvider/cypherDataProvider'
import { WorkStatus } from '../../../common/WorkStatus'
import { ValidationStatus } from '../../../common/validation/ValidationStatus';

export class ScenarioDataProvider {

    initialValue = [
        {
          children: [
            {
              text: '',
            }
          ],
        }
      ]

    initialValueJson = JSON.stringify(this.initialValue);
      
    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            scenarioTitle,
            scenarioText,
            scenarioBlockDataProvider,
            scenarioBlockKey,
            scenarioSetBuilder,
            graphNode,
        } = properties;

        this.graphNode = graphNode;
        this.scenarioBlockDataProvider = scenarioBlockDataProvider;
        this.scenarioBlockKey = scenarioBlockKey;
        this.scenarioSetBuilder = scenarioSetBuilder;
        this.scenarioTitle = (scenarioTitle) ? scenarioTitle : 'Scenario';
        this.scenarioText = (scenarioText) ? scenarioText : this.initialValue;
        this.associatedCypher = [];

        this.loadDataIfPresent();
    }

    data = () => this.scenarioBlockDataProvider.data();

    getRemoteKey = () => {
      var graphData = this.data();
      var graphDocKey = graphData.id;
      var idJoiner = graphData.getKeyHelper().getIdJoiner();
      var remoteKey = `${graphDocKey}${idJoiner}${this.scenarioBlockKey}`      
      return remoteKey;
    }

    getWorkStatus = () => {
      if (this.associatedCypher && this.associatedCypher.length > 0) {
        return WorkStatus.Complete;
      } else {
        return WorkStatus.Pending;
      }
    }

    getWorkMessage = () => {
      if (this.associatedCypher && this.associatedCypher.length > 0) {
        return `${this.associatedCypher.length} associated Cypher Statements`
      } else {
        return 'No Cypher Statements Associated'
      }
    }

    getRemoteCypherSubKey = (cypherGraphDocKey, cypherSubKey) => {
      if (cypherSubKey) {
        var graphData = this.data();
        var idJoiner = graphData.getKeyHelper().getIdJoiner();
        var remoteKey = '';
        if (cypherSubKey.indexOf(idJoiner) >= 0) {
          remoteKey = cypherSubKey;
        } else {
          remoteKey = `${cypherGraphDocKey}${idJoiner}${cypherSubKey}`;      
        }
        return remoteKey;
      } else {
        return cypherSubKey;
      }
      
    }    

    getDataModel = () => this.scenarioBlockDataProvider.getDataModel();

    setPlainTextScenario = (scenarioText) => {
      var slateText = [
        {
          children: [
            {
              text: scenarioText,
            }
          ],
        }
      ]
      this.setScenario(slateText);
    }

    getPlainTextScenario = () => {
      if (this.scenarioText && this.scenarioText.map) {
        return this.scenarioText
            .map(x => x.children)
            .reduce((acc,children) => acc.concat(children),[])
            .map((child,index) => {
                var text = Node.string(child);
                // slate is turning new lines into empty blocks - this will convert them back
                return (!text && index > 0) ? '\n' : text.trim();
            })
            .join('');
      } else {
          return '';
      }
    }

    setScenario = (scenarioText, ignoreSave) => {
        this.scenarioText = scenarioText;
        if (!ignoreSave) {
            const json = JSON.stringify(scenarioText);
            this.graphNode.addOrUpdateProperty("scenarioText", json, DataTypes.String);
        }
    }

    setTitle = (scenarioTitle, ignoreSave) => {
      this.scenarioTitle = scenarioTitle;
      if (!ignoreSave) {
          this.graphNode.addOrUpdateProperty("scenarioTitle", scenarioTitle, DataTypes.String);
      }
    }

    setAssociatedCypher = (associatedCypher) => {
      this.associatedCypher = associatedCypher;
      this.sortAssociatedCypher();
    }

    addAssociatedCypher = (associatedCypherEntry) => {
      this.associatedCypher.push(associatedCypherEntry);
      this.sortAssociatedCypher();
    }

    removeAssociatedCypher = (associatedCypherEntry) => {
      var index = this.associatedCypher.indexOf(associatedCypherEntry);
      if (index >= 0) {
        this.associatedCypher.splice(index,1);
      }
    }

    sortAssociatedCypher = () => {
      if (this.associatedCypher && this.associatedCypher.sort) {
        this.associatedCypher.sort((a,b) => (a.cypherTitle === b.cypherTitle) ? 0 : (a.cypherTitle < b.cypherTitle) ? -1 : 1);
      }
    }

    getRelNodeLabelText = (relNodeLabel) => {
      relNodeLabel = relNodeLabel || { label: ''};
      return (relNodeLabel.label === 'Anon') ? '' : `:${relNodeLabel.label}`;
    }

    getRelTypeText = (relType) => 
        (relType === 'ANON') ? '' : `:${relType}`;

    setValidationInfo = (associatedCypherEntry, validationInfo) => {
      const { success, message, valid, diff } = validationInfo;
      if (success) {
        associatedCypherEntry.validationStatus = (valid) ? ValidationStatus.Valid : ValidationStatus.Invalid;
        if (valid) {
          associatedCypherEntry.validationMessage = "Valid";
        } else {
          var nlMessage = diff.nodeLabelDiff.inBnotA.map(x => x.label).join(', ');
          var rtMessage = diff.relationshipTypeDiff.inBnotA.map(x => `(:${this.getRelNodeLabelText(x.startNodeLabel)})-[:${this.getRelTypeText(x.type)}]->(:${this.getRelNodeLabelText(x.endNodeLabel)})`).join(', ');

          var nlPropMessage = diff.nodeLabelDiff.BdiffA
            .map(x => {
              return (x.propertyDiff.inBnotA.length > 0) 
                ? x.propertyDiff.inBnotA.map(y => {
                  return `'${x.b.label}.${y.name}'`
                }).join(', ')
                : ''
            })
            .filter(x => x)
            .join(', ');

          var rtPropMessage = diff.relationshipTypeDiff.BdiffA
            .map(x => {
                if (x.propertyDiff.inBnotA.length > 0) {
                  const desc = `(${this.getRelNodeLabelText(x.b.startNodeLabel)})-[${this.getRelTypeText(x.b.type)}]->(${this.getRelNodeLabelText(x.b.endNodeLabel)})`;
                  const missingPropertyNames = x.propertyDiff.inBnotA.map(y => `'${desc}.${y.name}'`).join(', ');
                  return missingPropertyNames;
                } else {
                  return '';
                }
              })
              .filter(x => x)
              .join(', ');
          
          //associatedCypherEntry.validationMessage = displayMessage;
          associatedCypherEntry.validationMessage = 
            <>
              {(nlMessage) ? <p>{`Node Labels not in model: (${nlMessage})`}</p> : <></>}
              {(rtMessage) ? <p>{`Relationship Types not in model: (${rtMessage})`}</p> : <></>}
              {(nlPropMessage) ? <p>{`Node Label properties not in model: (${nlPropMessage})`}</p> : <></>}
              {(rtPropMessage) ? <p>{`Relationship Type properties not in model: (${rtPropMessage})`}</p> : <></>}
            </>;
        }
      } else {
        associatedCypherEntry.validationStatus = ValidationStatus.Error;
        associatedCypherEntry.validationMessage = message;
      }
    }

    getScenario = () => this.scenarioText;
    getTitle = () => this.scenarioTitle;
    getAssociatedCypher = () => this.associatedCypher;

    loadDataIfPresent = () => {
        const json = this.graphNode.getPropertyValueByKey("scenarioText", this.initialValueJson);
        const title = this.graphNode.getPropertyValueByKey("scenarioTitle", "Scenario");

        this.setScenario(JSON.parse(json), true);        
        this.setTitle(title, true);

        var graphData = this.graphNode.getGraphData();
        if (graphData) {
          var associatedCypherRels = graphData.getOutboundRelationshipsForNodeByType(this.graphNode, 'ASSOCIATED_CYPHER')
          //console.log('associatedCypherRels: ', associatedCypherRels);
          var associatedCypher = associatedCypherRels.map(rel => {
            //console.log('rel: ', rel);
            var graphDocKey = rel.getPropertyValueByKey("cypherGraphDocKey");
            var primaryEndNodeLabel = rel.endNode.getPropertyValueByKey("primaryNodeLabel");
            var subKey = rel.endNode.getPropertyValueByKey("key");
            var cypherTitle = '';
            var cypherStatement = rel.endNode.getPropertyValueByKey("cypherStatement");
  
            if (primaryEndNodeLabel === 'CypherBuilder') {
              var cypherMetadata = graphData.getOutboundRelationshipsForNodeByType(rel.endNode, 'HAS_METADATA');
              if (cypherMetadata && cypherMetadata[0] && cypherMetadata[0].endNode) {
                cypherTitle = cypherMetadata[0].endNode.getPropertyValueByKey("title");
              }
            } else {
              cypherTitle = rel.endNode.getPropertyValueByKey("cypherTitle");
              cypherStatement = getCypherStatementFromSlate(JSON.parse(cypherStatement));
            }
  
            return {
              isVisualCypher: rel.getPropertyValueByKey("isVisualCypher"),
              cypherGraphDocKey: rel.getPropertyValueByKey("cypherGraphDocKey"),
              cypherSubKey: (graphDocKey !== subKey) ? subKey : null,
              cypherTitle: cypherTitle,
              cypherStatement: cypherStatement,
              validationStatus: ValidationStatus.NotValidated,
              validationMessage: ''
            }
          })
          this.setAssociatedCypher(associatedCypher);
          //console.log('associatedCypher', associatedCypher);
        }
    }
    
}