
import { ALERT_TYPES } from '../../../../common/Constants';

import {
    orderByItem,
} from '../../../../dataModel/cypherReturn';

export default class OrderByEditHelper {

    constructor (properties) {
        properties = properties || {};
        this.blockComponent = properties.blockComponent;
    }

    comboBoxActive = () => {
        return true;
    }

    performSearch = (searchText, callback) => {
        var possibleReturnItems = this.blockComponent.getPossibleOrderByItems();

        var matches = possibleReturnItems
                .filter(orderByItem => orderByItem.toCypherString().toLowerCase().indexOf(searchText.toLowerCase()) !== -1)
                .map(orderByItem => {
                    return {
                        label: orderByItem.toCypherString(),
                        data: this.blockComponent.getDataItemForOrderByItem(orderByItem)
                    }
                })

        callback({success: true, data: matches});
    }

    saveChips = (chips, onSuccess) => this.blockComponent.saveOrderByItemChips(chips, onSuccess);

    setOrderByItemSort = (orderByItem, sortDirection) => this.blockComponent.setOrderByItemSort(orderByItem, sortDirection);   

    findItem = (text) => null;

    getNewItem = (text) => {
        //var simpleOrderByItem = orderByItem(text);   
        var simpleOrderByItem = this.blockComponent.getNewOrderByItemFromText(text);
        var orderByClause = this.blockComponent.getOrderByClause();
        orderByClause.handleOrderByItemKey(simpleOrderByItem);
        return this.blockComponent.getDataItemForOrderByItem(simpleOrderByItem);
    } 

    handleItemKey = (dataItem) => {
        var orderByClause = this.blockComponent.getOrderByClause();
        orderByClause.handleOrderByItemKey(dataItem);
    }

    itemExists = (dataItem) => {
        var orderByClause = this.blockComponent.getOrderByClause();
        return orderByClause.orderByItemExists(dataItem);
    }

    validateEditedText = (dataItem, newText) => {
        var orderByClause = this.blockComponent.getOrderByClause();
        var simpleOrderByItem = this.blockComponent.getNewOrderByItemFromText(newText);

        if (!orderByClause.orderByItemExists(simpleOrderByItem, dataItem.dataItem)) {
            return true;
        } else {
            alert('Order By items must be unique', ALERT_TYPES.WARNING);
            return false;
        }
    }

    getConfig = () => {
        return {
            displayLabel: 'Add Order By Item'
        }
    }
}