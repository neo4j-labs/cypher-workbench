
import { NodePattern, RelationshipPattern } from './cypherPattern';
import { WithVariable } from '../common/parse/antlr/withVariable';

export class CypherVariableScope {

    // keys are variable names, value is a list of associated items
    variableMap = {};

    // key is a node label string, value is a list of variable names
    //variablesByNodeLabels = {};

    // key is a relationship type string, value is a list of variable names
    //variablesByRelationshipTypes = {};

    getVariableSet = () => new Set(Object.keys(this.variableMap));
    getVariableArray = () => Array.from(this.getVariableSet());

    renameVariable = (oldName, newName, associatedItem) => {
        if (newName !== oldName) {
            if (associatedItem) {
                // move the item from the old list to the new list
                var associatedList = this.variableMap[oldName];
                if (associatedList) {
                    this.removeFromList(associatedList, associatedItem);                
                    if (associatedList.length === 0) {
                        delete this.variableMap[oldName];
                    }
                }
                this.addItemToMapList(this.variableMap, newName, associatedItem);
            } else {
                this.variableMap[newName] = this.variableMap[oldName];
                delete this.variableMap[oldName];
            }
        }
    }

    /*
    getVariableSetForNodeLabel = (nodeLabel) => {
        var list = this.variablesByNodeLabels[nodeLabel];
        return (list) ? new Set(list) : new Set();
    }

    getVariableSetForRelationshipType = (relationshipType) => {
        var list = this.variablesByRelationshipTypes[relationshipType];
        return (list) ? new Set(list) : new Set();
    }
    */

    // TODO: clone?
    getVariableMap = () => this.variableMap;

    addItemToMapList = (mapList, key, item) => {
        var list = mapList[key];
        if (!list) {
            list = [];
            mapList[key] = list;
        }

        if (item.areKeysEqual) {
            const match = list.find(x => item.areKeysEqual(x));
            if (!match) {
                list.push(item);
            }
        } else {
            if (!list.includes(item)) {
                list.push(item);
            }
        }
    }

    getAssociatedItemVariable = (associatedItem) => {
        var variables = Object.keys(this.variableMap).filter(variable => {
            const list = this.variableMap[variable];
            return list.includes(associatedItem);
        });
        return (variables.length > 0) ? variables[0] : null;
    }

    addVariable = (variable, associatedItem) => {
        if (variable !== null && variable !== undefined && associatedItem !== null && associatedItem !== undefined) {
            this.addItemToMapList(this.variableMap, variable, associatedItem);

            /*
            if (associatedItem && associatedItem instanceof NodePattern) {
                associatedItem.getNodeLabels().map(nodeLabel => {
                    this.addItemToMapList(this.variablesByNodeLabels, nodeLabel, variable);
                });
            }
    
            if (associatedItem && associatedItem instanceof RelationshipPattern) {
                associatedItem.getRelationshipTypes().map(relationshipType => {
                    this.addItemToMapList(this.variablesByRelationshipTypes, relationshipType, variable);
                });
            }
            */
        }
    }

    getVariableItemList = (variable) => this.variableMap[variable];

    removeFromList = (associatedList, associatedItem) => {
        if (associatedList) {
            var index = associatedList.indexOf(associatedItem);
            if (index >= 0) {
                associatedList.splice(index,1);
            }
        }
    }

    removeItem = (associatedItem) => {
        if (associatedItem && associatedItem.variable) {
            // remove from variableMap
            var associatedList = this.variableMap[associatedItem.variable];
            if (associatedList) {
                this.removeFromList(associatedList, associatedItem);
                if (associatedList.length === 0) {
                    delete this.variableMap[associatedItem.variable];
                }
            }
        }
    }

    getNextVar = (key) => {
        var usedVars = this.getVariableSet();
        var varBase = '';
        if (key.toUpperCase() === key) {
            // for relationships like ACTED_IN
            varBase = key.split('_')
                .map((x, i) => (i === 0) 
                    ? x.toLowerCase() 
                    : x.substring(0,1) + x.substring(1).toLowerCase()
                )
                .join('');
        } else {
            varBase = key.substring(0,1).toLowerCase() + key.substring(1);
        }
        varBase = varBase.replace(/[\W ]/g, '_');
        
        var candidateVar = '';
        for (var i = 1; i <= 100000; i++) {
            candidateVar = `${varBase + i}`;
            if (!usedVars.has(candidateVar)) {
                break;
            }
        }
        return candidateVar;
    }

    getCandidateNodePatternVariable = (label) => this.getNextVar(label);
    getCandidateRelationshipPatternVariable = (type) => this.getNextVar(type);

    clearVariables = () => {
        //this.variablesByNodeLabels = {};
        //this.variablesByRelationshipTypes = {};
        this.variableMap = {};
    }

    clearWithVariables = () => {
        Object.keys(this.variableMap).map(key => {
            var list = this.variableMap[key];
            for (var i = 0; i < list.length; i++) {
                var listItem = list[i];
                if (listItem instanceof WithVariable) {
                    list.splice(i, 1);
                    i--;
                }
            }
            if (list.length === 0) {
                delete this.variableMap[key];
            }
        });
    }
}