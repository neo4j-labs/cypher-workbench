
import { ERROR_MESSAGES, validateText } from '../../../dataModel/dataValidation';

export default class GraphCanvasEditHelper {

    // this is expected to be a NodeDisplay (pointing to a NodePattern)
    //  or a RelationshipDisplay (pointing to a RelationshipPattern)
    setPrimaryPropertyContainer (primaryPropertyContainer) {
        this.primaryPropertyContainer = primaryPropertyContainer;
    }

    setDataModel (dataModel) {
        this.dataModel = dataModel;
    }

    setDataProvider (dataProvider) {
        this.dataProvider = dataProvider;
    }

    isNodeDisplay = () => this.primaryPropertyContainer && this.primaryPropertyContainer.classType === 'NodeDisplay';
    isRelationshipDisplay = () => this.primaryPropertyContainer && this.primaryPropertyContainer.classType === 'RelationshipDisplay';

    comboBoxActive = () => {
        //console.log('comboBoxActive: this.primaryPropertyContainer', this.primaryPropertyContainer);
        if (this.isNodeDisplay() || this.isRelationshipDisplay()) {
            return true;
        } else {
            return false;
        }
    }

    performSearch = (searchText, callback) => {
        //console.log(`TODO: perform search ${searchText}`);
        var matches = [];
        searchText = searchText.toLowerCase();
        if (this.isNodeDisplay()) {
            var nodeLabelStringSet = new Set();
            this.dataProvider.getCypherPattern().getAllNodePatterns().map(nodePattern => {
                nodePattern.nodeLabels
                    .filter(x => x && x.toLowerCase && x.toLowerCase().indexOf(searchText) !== -1)
                    .map(x => nodeLabelStringSet.add(x));
            });
            if (this.dataModel) {
                this.dataModel.getNodeLabelArray()
                    .map(x => x.label)
                    .filter(x => x.toLowerCase().indexOf(searchText) !== -1)
                    .map(x => nodeLabelStringSet.add(x));
            }

            matches = Array.from(nodeLabelStringSet)
                .sort()
                .map(nodeLabelString => {
                    return {
                        label: nodeLabelString,
                        data: nodeLabelString
                    }
                });
        } else if (this.isRelationshipDisplay()) {
            var relationshipTypeStringSet = new Set();
            this.dataProvider.getCypherPattern().getAllNodeRelNodePatterns().map(nodeRelNodePattern => {
                    nodeRelNodePattern.relationshipPattern.types
                        .filter(x => x && x.toLowerCase && x.toLowerCase().indexOf(searchText) !== -1)
                        .map(x => relationshipTypeStringSet.add(x));
            });
            if (this.dataModel) {
                // TODO maybe: figure out which ones are appropriate and sort them first?
                this.dataModel.getRelationshipTypeArray()
                    .map(x => x.type)
                    .filter(x => x && x.toLowerCase().indexOf(searchText) !== -1)
                    .map(x => relationshipTypeStringSet.add(x));
            }

            matches = Array.from(relationshipTypeStringSet)
                .sort()
                .map(relationshipTypeString => {
                    return {
                        label: relationshipTypeString,
                        data: relationshipTypeString
                    }
                });
        }
        
        callback({success: true, data: matches});
    }

    saveVariable = (variable, variablePreviousValue) => {
        if (this.isNodeDisplay()) {
            var nodePattern = this.getNodePattern();
            this.dataProvider.updateNodePatternVariable({
                nodePattern: nodePattern,
                variable: variable,
                variablePreviousValue: variablePreviousValue
            });
        } else if (this.isRelationshipDisplay()) {
            var relationshipPattern = this.getRelationshipPattern();
            this.dataProvider.updateRelationshipPatternVariable({
                relationshipPattern: relationshipPattern,
                variable: variable,
                variablePreviousValue: variablePreviousValue
            });
        }
    }

    saveRange = (values) => {
        if (this.isRelationshipDisplay()) {
            var { variableLengthStart, variableLengthEnd } = values;
            if (variableLengthStart && !variableLengthStart.match(/^\*/)) {
                variableLengthStart = '*' + variableLengthStart;
            }
            var relationshipPattern = this.getRelationshipPattern();
            this.dataProvider.updateRelationshipPatternRange({
                variableLengthStart: variableLengthStart,
                variableLengthEnd: variableLengthEnd,
                relationshipPattern: relationshipPattern
            });

        }
    }

    saveLabelsAndTypes = (primaryItem, secondaryItems, onSuccess) => {
        // I have set isPrimary to always be false, so primaryItem should always be null or undefined now
        //console.log('primaryItem: ', primaryItem);
        //console.log('secondaryItems: ', secondaryItems);
        if (this.isNodeDisplay()) {
            var nodePattern = this.getNodePattern();
            var nodeLabels = [];
            if (primaryItem) {
                nodeLabels = [primaryItem.getText()];
            }
            nodeLabels = nodeLabels.concat(secondaryItems.map(x => x.getText()));
    
            this.dataProvider.updateNodePatternNodeLabels({
                nodePattern: nodePattern,
                nodeLabels: nodeLabels
            });
        } else if (this.isRelationshipDisplay()) {
            var relationshipPattern = this.getRelationshipPattern();
            var types = [];
            if (primaryItem) {
                types = [primaryItem.getText()];
            }
            types = types.concat(secondaryItems.map(x => x.getText()));
    
            this.dataProvider.updateRelationshipPatternTypes({
                relationshipPattern: relationshipPattern,
                types: types
            });
        }

        if (onSuccess) {
            onSuccess();                            
        }
    }

    findLabelOrType = (text) => null;

    getNewLabelOrType = (text) => {
        if (this.isNodeDisplay()) {
            var nodePattern = this.getNodePattern();
            var newNodeLabel = this.getNewNodeLabelDataItem(text, nodePattern.nodeLabels.length);
            return newNodeLabel;
        } else if (this.isRelationshipDisplay()) {
            var relationshipPattern = this.getRelationshipPattern();
            var newRelationshipType = this.getNewRelationshipTypeDataItem(text, relationshipPattern.types.length);
            return newRelationshipType;
        } else {
            return text;
        }
    } 

    getNodePattern = () => {
        var displayNode = this.primaryPropertyContainer;
        var graphNode = displayNode.getNode();
        var nodePattern = this.dataProvider.getNodePatternByGraphNodeKey(graphNode.key);
        return nodePattern;
    }

    getRelationshipPattern = () => {
        var displayRelationship = this.primaryPropertyContainer;
        var graphRelationship = displayRelationship.getRelationship();
        var relationshipPattern = this.dataProvider.getRelationshipPatternByGraphRelationshipKey(graphRelationship.key);
        return relationshipPattern;
    }

    getNewNodeLabelDataItem = (text, index) => {
        // expected return 
        /*
        {
            key: <key>,
            getColor: () => (), <func>,
            getFontColor: () => (), <func>
            getText: () => (), <func>
            setText: (text) => (), <func>
            getSecondaryData: () => (), <func returning additional dataItems as chips>
        */

        var nodePattern = this.getNodePattern();
        var displayNode = nodePattern.displayNode;

        var dataItem = {
            key: text,
            variable: nodePattern.variable,
            displayNode: displayNode,
            nodePattern: nodePattern,
            getColor: () => displayNode.color, // TODO: get colors from data model if appropriate
            getFontColor: () => displayNode.fontColor, // TODO: get colors from data model if appropriate
            getText: () => text,
            setText: (newText) => {
                var nodeLabels = nodePattern.nodeLabels.slice();
                nodeLabels.splice(index, 1, newText);
        
                this.dataProvider.updateNodePatternNodeLabels({
                    nodePattern: nodePattern,
                    nodeLabels: nodeLabels
                });
            },
            canDelete: () => true,
            isPrimary: () => false,
            getSecondaryData: () => []
        }
        dataItem.getData = () => dataItem;

        return dataItem;
    }

    getNewRelationshipTypeDataItem = (text, index) => {
        // expected return 
        /*
        {
            key: <key>,
            getColor: () => (), <func>,
            getFontColor: () => (), <func>
            getText: () => (), <func>
            setText: (text) => (), <func>
            getSecondaryData: () => (), <func returning additional dataItems as chips>
        */

        var relationshipPattern = this.getRelationshipPattern();
        var displayRelationship = relationshipPattern.displayRelationship;

        var dataItem = {
            key: text,
            variable: relationshipPattern.variable,
            variableLengthStart: relationshipPattern.variableLengthStart,
            variableLengthEnd: relationshipPattern.variableLengthEnd,
            displayRelationship: displayRelationship,
            relationshipPattern: relationshipPattern,
            getColor: () => displayRelationship.color, // TODO: get colors from data model if appropriate
            getFontColor: () => displayRelationship.color, // TODO: get colors from data model if appropriate
            getText: () => text,
            setText: (newText) => {
                var types = relationshipPattern.types.slice();
                types.splice(index, 1, newText);
        
                this.dataProvider.updateRelationshipPatternTypes({
                    relationshipPattern: relationshipPattern,
                    types: types
                });
            },
            canDelete: () => true,
            isPrimary: () => false,
            getSecondaryData: () => []
        }
        dataItem.getData = () => dataItem;

        return dataItem;
    }

    getDataItem = () => {
        if (this.isNodeDisplay()) {
            var nodePattern = this.getNodePattern();

            var nodeLabels = nodePattern.nodeLabels;
            var firstNodeLabel = (nodeLabels.length > 0) ? nodeLabels[0] : null;
            var otherNodeLabels = (nodeLabels.length > 1) ? nodeLabels.slice(1) : [];
            var secondaryData = otherNodeLabels.map((x, index) => this.getNewNodeLabelDataItem(x, index + 1));

            var dataItem = this.getNewNodeLabelDataItem(firstNodeLabel, 0);
            dataItem.getSecondaryData = () => secondaryData;
            
            return dataItem;

        } else if (this.isRelationshipDisplay()) {
            var relationshipPattern = this.getRelationshipPattern();

            var types = relationshipPattern.types;
            var firstType = (types.length > 0) ? types[0] : null;
            var otherTypes = (types.length > 1) ? types.slice(1) : [];
            var secondaryData = otherTypes.map((x, index) => this.getNewRelationshipTypeDataItem(x, index + 1));

            var dataItem = this.getNewRelationshipTypeDataItem(firstType, 0);
            dataItem.getSecondaryData = () => secondaryData;
            
            return dataItem;
        }
    }

    validateEditedText = (propertyContainer, newText) => {
        if (newText.match(/:/)) {
            alert(ERROR_MESSAGES.ITEM_CANNOT_CONTAIN_COLON);
            return false;
        } else {
            return validateText(propertyContainer, this.dataModel, newText);
        }
    }

    getLabelsAndTypesConfig = () => {
        var displayLabel = (this.isNodeDisplay()) 
            ? 'Add Label'
            : (this.isRelationshipDisplay()) 
                ? 'Add Type' 
                : 'Add Item'

        return {
            displayLabel: displayLabel
        }
    }
}