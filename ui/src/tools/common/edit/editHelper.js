
import { ERROR_MESSAGES, validateText } from '../../../dataModel/dataValidation';

export default class EditHelper {

    setPrimaryPropertyContainer (primaryPropertyContainer) {
        this.primaryPropertyContainer = primaryPropertyContainer;
    }

    setEditConfirmDelete (editConfirmDelete) {
        this.editConfirmDelete = editConfirmDelete;
    }
    
    setParentContainer = (parentContainer) => {
        this.parentContainer = parentContainer;
    }

    setDataModel (dataModel) {
        this.dataModel = dataModel;
    }

    comboBoxActive = () => {
        //console.log('comboBoxActive: this.primaryPropertyContainer', this.primaryPropertyContainer);
        if (this.primaryPropertyContainer &&
            this.primaryPropertyContainer.classType === 'NodeLabel') {
            return true;
        } else {
            return false;
        }
    }

    performSearch = (searchText, callback) => {
        var matches = [];
        if (searchText) {
            matches = this.dataModel.findItemsByText(searchText)
                .filter(match => match.matchType === 'NodeLabel')
        } else {
            matches = this.dataModel.getNodeLabelArray()
                .map(nodeLabel => {
                    return {
                        matchingItem: nodeLabel
                    }
                });
        }

        //var matches = this.dataModel.findItemsByText(searchText)
        matches = matches.map(match => {
                return {
                    label: match.matchingItem.getText(),
                    data: match.matchingItem
                }
            });
        
        callback({success: true, data: matches});
    }

    saveVariable = (variable) => {
        console.log(`TODO: save ${variable}`)
    }

    saveLabelsAndTypes = (primaryNodeLabel, secondaryNodeLabels, onSuccess) => {
        var promptToDeleteNodeLabels = this.dataModel.setSecondaryNodeLabels(primaryNodeLabel, secondaryNodeLabels);
        if (promptToDeleteNodeLabels.length > 0) {
            var nodeLabelNames = promptToDeleteNodeLabels.map(x => x.getText()).join(', ');
            var singular = (promptToDeleteNodeLabels.length === 1);
            var message = (singular) ? `Node Label '${nodeLabelNames}' has properties, would you like to delete it?` :
                                        `Node Labels '${nodeLabelNames}' have properties, would you like to delete them?`;
            
            //this.promptDelete(message, primaryNodeLabel, promptToDeleteNodeLabels, onSuccess);
            var title = 'Delete Secondary Node Labels';
            this.editConfirmDelete(title, message, () => {
                this.deletePromptedSecondaryNodeLabels(primaryNodeLabel, promptToDeleteNodeLabels);
                if (onSuccess) {
                    onSuccess();                            
                }
            })
        } else {
            if (onSuccess) {
                onSuccess();
            }
        }
    }

    deletePromptedSecondaryNodeLabels = (primaryNodeLabel, promptToDeleteNodeLabels) => {
        promptToDeleteNodeLabels.map(x => {
            this.dataModel.removeSecondaryNodeLabel(primaryNodeLabel, x);
            this.dataModel.removeNodeLabelByKey(x.key);
        });
    }

    /*
    promptDelete = (message, primaryNodeLabel, promptToDeleteNodeLabels, onSuccess) => {
        var { generalDialog } = this.state;
        this.setState({
            generalDialog: {
                ...generalDialog,
                open: true,
                title: 'Delete Secondary Node Labels',
                description: message,
                buttons: [{
                    text: 'Yes',
                    onClick: (button, index) => {
                        this.deletePromptedSecondaryNodeLabels(primaryNodeLabel, promptToDeleteNodeLabels);
                        if (onSuccess) {
                            onSuccess();                            
                        }
                        this.closeGeneralDialog();
                    },
                    autofocus: false
                },
                {
                    text: 'No',
                    onClick: (button, index) => this.closeGeneralDialog(),
                    autofocus: true
                }]
            }
        });
    }*/

    getDataItem = (propertyContainer) => {
        var isPrimary = (this.primaryPropertyContainer.key === propertyContainer.key);
        return this.parentContainer.getPropertyContainerDataItem(propertyContainer, isPrimary);
    }

    findLabelOrType = (text) => {
        var nodeLabel = this.dataModel.getNodeLabelByLabel(text);
        if (nodeLabel) {
            var isPrimary = (this.primaryPropertyContainer.key === nodeLabel.key);
            return this.parentContainer.getPropertyContainerDataItem(nodeLabel, isPrimary);        
        } else {
            return null;
        }
    }

    getNewLabelOrType = (text) => {
        var newNodeLabel = this.dataModel.createNewSecondaryNodeLabel();
        newNodeLabel.label = text;
        this.dataModel.addNodeLabel(newNodeLabel);

        var dataItem = this.parentContainer.getPropertyContainerDataItem(newNodeLabel, false);        

        // uncomment for testing
        /* 
        if (text === 'Baz') {
            console.log('Add property to newNodeLabel Baz');
            var propertyDefinition = this.dataModel.getNewPropertyDefinition();
            var { key, name, datatype, referenceData,
                isPartOfKey, isIndexed, isArray, mustExist, hasUniqueConstraint } = propertyDefinition;
            var booleanFlags = {
                isPartOfKey: isPartOfKey,
                isIndexed: isIndexed,
                isArray: isArray,
                mustExist: mustExist,
                hasUniqueConstraint: hasUniqueConstraint
            };            
            var propertyMap = { key, name, datatype, referenceData }
            newNodeLabel.addOrUpdateProperty(propertyMap, booleanFlags);
        }
        */

        //return newNodeLabel;
        return dataItem;
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
        return {
            displayLabel: 'Add Node Label'
        }
    }
}