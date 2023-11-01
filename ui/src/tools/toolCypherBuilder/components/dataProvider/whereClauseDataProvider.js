
import DataTypes from '../../../../dataModel/DataTypes';
import { WhereClause } from '../../../../dataModel/cypherWhere';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';

export class WhereClauseDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
            whereClause,
            ref
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.whereClause = (whereClause) ? whereClause : new WhereClause();
        this.ref = ref;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    getWhereClause = () => this.whereClause;

    getDebugCypherSnippets = () => this.getWhereClause().getDebugCypherSnippets();

    setWhereItems = (whereItems, ignoreSave, ignoreCypherUpdate) => {
        this.whereClause.setWhereItems(whereItems);
        // save where info as JSON for now
        if (!ignoreSave) {
            var whereClauseJSON = JSON.stringify(this.whereClause.toSaveObject());
            this.graphNode.addOrUpdateProperty("whereClause", whereClauseJSON, DataTypes.String);
        }

        // update cypher
        if (!ignoreCypherUpdate) {
            this.cypherBuilder.updateCypher();
        }        
    }

    loadDataIfPresent = () => {
        var whereClauseJsonString = this.graphNode.getPropertyValueByKey('whereClause');        
        if (whereClauseJsonString) {
            var whereClauseJSON = JSON.parse(whereClauseJsonString);
            this.whereClause.fromSaveObject(whereClauseJSON);
        }
    }

    getCypher = () => this.whereClause.toCypherString();
    getCypherKeyword = () => CypherBlockKeywords.WHERE;
 
    handleBlockUpdated = (args) => {
        args = args || {};
        const { scopedBlockProvider } = args;

        this.setWhereItems(this.whereClause.getWhereItems(), true, true);
        if (this.ref && this.ref.current) {
            this.ref.current.refreshData(scopedBlockProvider);
        } else {
            console.log("Warning: whereClauseDataProvider handleBlockUpdated has no current ref");
        }
    }

    renameVariable = (args) => {
        args = args || {};
        var {
            variablePreviousValue, 
            variable, 
            item
        } = args;
        this.whereClause.renameVariable(variablePreviousValue, variable, item.key);
        this.setWhereItems(this.whereClause.getWhereItems(), false, true);
    }
}