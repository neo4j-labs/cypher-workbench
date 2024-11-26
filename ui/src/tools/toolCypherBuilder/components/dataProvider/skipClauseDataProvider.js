
import DataTypes from '../../../../dataModel/DataTypes';
import { SkipClause, SKIP_CLAUSE_DEFAULT_SKIP } from '../../../../dataModel/cypherSkip';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';

export class SkipClauseDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
            skipClause,
            ref
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.skipClause = (skipClause) ? skipClause : new SkipClause();
        this.ref = ref;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    getSkipClause = () => this.skipClause;

    loadDataIfPresent = () => {
        var skip = this.graphNode.getPropertyValueByKey('skip', SKIP_CLAUSE_DEFAULT_SKIP);
        this.skipClause.setSkip(skip);
    }

    getSkip = () => this.skipClause.getSkip();
    setSkip = (skip) => {
        this.skipClause.setSkip(skip);
        this.graphNode.addOrUpdateProperty("skip", skip, DataTypes.String);

        // update cypher
        this.cypherBuilder.updateCypher();
    }

    getCypher = () => this.skipClause.toCypherString();
    getCypherKeyword = () => CypherBlockKeywords.SKIP;

    handleBlockUpdated = (args) => {
        // nothing to do
    }
}