
import { ALERT_TYPES } from '../../../../common/Constants';

import {
    returnItem,
} from '../../../../dataModel/cypherReturn';

export default class ReturnEditHelper {

    constructor (properties) {
        properties = properties || {};
        this.blockComponent = properties.blockComponent;
    }

    comboBoxActive = () => {
        return true;
    }

    performSearch = (searchText, callback) => {
        var possibleReturnItems = this.blockComponent.getPossibleReturnItems();

        var matches = possibleReturnItems
                .filter(returnItem => returnItem.toCypherString().toLowerCase().indexOf(searchText.toLowerCase()) !== -1)
                .map(returnItem => {
                    return {
                        label: returnItem.toCypherString(),
                        data: this.blockComponent.getDataItemForReturnItem(returnItem)
                    }
                })

        callback({success: true, data: matches});
    }

    saveChips = (chips, onSuccess) => this.blockComponent.saveReturnItemChips(chips, onSuccess);

    findItem = (text) => null;

    getNewItem = (text) => {
        //var simpleReturnItem = returnItem(text);   
        var simpleReturnItem = this.blockComponent.getNewReturnItemFromText(text);
        var returnClause = this.blockComponent.getReturnClause();
        returnClause.handleReturnItemKey(simpleReturnItem);
        return this.blockComponent.getDataItemForReturnItem(simpleReturnItem);
    } 

    handleItemKey = (dataItem) => {
        var returnClause = this.blockComponent.getReturnClause();
        returnClause.handleReturnItemKey(dataItem);
    }

    itemExists = (dataItem) => {
        var returnClause = this.blockComponent.getReturnClause();
        return returnClause.returnItemExists(dataItem);
    }

    validateEditedText = (dataItem, newText) => {
        var returnClause = this.blockComponent.getReturnClause();
        var simpleReturnItem = this.blockComponent.getNewReturnItemFromText(newText);

        if (!returnClause.returnItemExists(simpleReturnItem, dataItem.dataItem)) {
            return true;
        } else {
            alert('Return items must be unique', ALERT_TYPES.WARNING);
            return false;
        }
    }

    getConfig = () => {
        return {
            displayLabel: 'Add Return Item'
        }
    }
}