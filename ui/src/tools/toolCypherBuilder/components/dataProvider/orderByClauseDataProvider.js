
import DataTypes from '../../../../dataModel/DataTypes';
import { OrderByClause } from '../../../../dataModel/cypherOrderBy';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';

export class OrderByClauseDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
            orderByClause,
            ref
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.orderByClause = (orderByClause) ? orderByClause : new OrderByClause();
        this.ref = ref;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    getOrderByClause = () => this.orderByClause;

    getDebugCypherSnippets = () => this.getOrderByClause().getDebugCypherSnippets();

    setOrderByItems = (orderByItems, ignoreSave, ignoreCypherUpdate) => {
        this.orderByClause.setOrderByItems(orderByItems);
        this.saveOrderBy(ignoreSave, ignoreCypherUpdate);
    }

    setOrderByItemSort = (orderByItem, sortDirection) => {
        orderByItem.setOrderDirection(sortDirection);   
        this.saveOrderBy();     
    }

    saveOrderBy = (ignoreSave, ignoreCypherUpdate) => {
        if (!ignoreSave) {
            var orderByClauseJSON = JSON.stringify(this.orderByClause.toSaveObject());
            this.graphNode.addOrUpdateProperty("orderByClause", orderByClauseJSON, DataTypes.String);
        }

        // update cypher
        if (!ignoreCypherUpdate) {
            this.cypherBuilder.updateCypher();
        }
    }

    loadDataIfPresent = () => {
        var orderByClauseJsonString = this.graphNode.getPropertyValueByKey('orderByClause');
        if (orderByClauseJsonString) {
            var orderByClauseJSON = JSON.parse(orderByClauseJsonString);
            this.orderByClause.fromSaveObject(orderByClauseJSON);
        }
    }

    getCypher = () => this.orderByClause.toCypherString();
    getCypherKeyword = () => CypherBlockKeywords.ORDER_BY;

    handleBlockUpdated = (args) => {
        args = args || {};
        const { cypherBlockKey, scopedBlockProvider, updateType } = args;

        this.setOrderByItems(this.orderByClause.getOrderByItems(), true, true);
        if (this.ref && this.ref.current) {
            this.ref.current.refreshData(scopedBlockProvider);
        } else {
            console.log("Warning: orderByClauseDataProvider handleBlockUpdated has no current ref");
        }
    }

    renameVariable = (args) => {
        args = args || {};
        var {
            variablePreviousValue, 
            variable, 
            item
        } = args;
        this.orderByClause.renameVariable(variablePreviousValue, variable, item.key);
        this.setOrderByItems(this.orderByClause.getOrderByItems(), false, true);
    }
}