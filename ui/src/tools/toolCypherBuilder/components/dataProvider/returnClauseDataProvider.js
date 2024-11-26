
import DataTypes from '../../../../dataModel/DataTypes';
import { ReturnClause } from '../../../../dataModel/cypherReturn';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';
import BlockUpdateType from './blockUpdateTypes';

export class ReturnClauseDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
            returnClause,
            ref
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.returnClause = (returnClause) ? returnClause : new ReturnClause();
        this.ref = ref;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    getReturnClause = () => this.returnClause;

    getDebugCypherSnippets = () => this.getReturnClause().getDebugCypherSnippets();

    setReturnItems = (returnItems, ignoreSave, ignoreCypherUpdate) => {
        this.returnClause.setReturnItems(returnItems);
        // save return info as JSON for now
        this.saveReturn(ignoreSave, ignoreCypherUpdate);

        this.getScopedBlockProvider().updateSubsequentBlocks({
            cypherBlockKey: this.cypherBlockKey,
            updateType: BlockUpdateType.ReturnItemsChanged,
        });
    }

    saveReturn = (ignoreSave, ignoreCypherUpdate) => {
        if (!ignoreSave) {
            var returnClauseJSON = JSON.stringify(this.returnClause.toSaveObject());
            this.graphNode.addOrUpdateProperty("returnClause", returnClauseJSON, DataTypes.String);
        }

        // update cypher
        if (!ignoreCypherUpdate) {
            this.cypherBuilder.updateCypher();
        }
    }

    loadDataIfPresent = () => {
        var returnClauseJsonString = this.graphNode.getPropertyValueByKey('returnClause');
        if (returnClauseJsonString) {
            var returnClauseJSON = JSON.parse(returnClauseJsonString);
            this.returnClause.fromSaveObject(returnClauseJSON);
        }
    }

    getCypher = () => this.returnClause.toCypherString();
    getCypherKeyword = () => CypherBlockKeywords.RETURN;

    handleBlockUpdated = (args) => {
        args = args || {};
        const { cypherBlockKey, scopedBlockProvider, updateType } = args;

        this.setReturnItems(this.returnClause.getReturnItems(), true, true);
        if (this.ref && this.ref.current) {
            this.ref.current.refreshData(scopedBlockProvider);
        } else {
            console.log("Warning: returnClauseDataProvider handleBlockUpdated has no current ref");
        }
    }

    renameVariable = (args) => {
        args = args || {};
        var {
            variablePreviousValue, 
            variable, 
            item
        } = args;
        this.returnClause.renameVariable(variablePreviousValue, variable, item.key);
        this.setReturnItems(this.returnClause.getReturnItems(), false, true);
    }
}