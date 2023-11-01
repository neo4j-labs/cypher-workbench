
import DataTypes from '../../../../dataModel/DataTypes';
import { LimitClause, LIMIT_CLAUSE_DEFAULT_LIMIT } from '../../../../dataModel/cypherLimit';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';

export class LimitClauseDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
            limitClause,
            ref
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.limitClause = (limitClause) ? limitClause : new LimitClause();
        this.ref = ref;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    getLimitClause = () => this.limitClause;

    loadDataIfPresent = () => {
        var limit = this.graphNode.getPropertyValueByKey('limit', LIMIT_CLAUSE_DEFAULT_LIMIT);
        this.limitClause.setLimit(limit);
    }

    getLimit = () => this.limitClause.getLimit();
    setLimit = (limit) => {
        this.limitClause.setLimit(limit);
        this.graphNode.addOrUpdateProperty("limit", limit, DataTypes.String);

        // update cypher
        this.cypherBuilder.updateCypher();
    }

    getCypher = () => this.limitClause.toCypherString();
    getCypherKeyword = () => CypherBlockKeywords.LIMIT;

    handleBlockUpdated = (args) => {
        // nothing to do
    }
}