// Generated from /Users/ericmonk/neo/projects/labs/internal-merge-cypher-workbench/cypher-workbench/ui/src/common/parse/antlr/Cypher.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.tree.ParseTreeListener;

/**
 * This interface defines a complete listener for a parse tree produced by
 * {@link CypherParser}.
 */
public interface CypherListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Cypher}.
	 * @param ctx the parse tree
	 */
	void enterOC_Cypher(CypherParser.OC_CypherContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Cypher}.
	 * @param ctx the parse tree
	 */
	void exitOC_Cypher(CypherParser.OC_CypherContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_QueryOptions}.
	 * @param ctx the parse tree
	 */
	void enterOC_QueryOptions(CypherParser.OC_QueryOptionsContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_QueryOptions}.
	 * @param ctx the parse tree
	 */
	void exitOC_QueryOptions(CypherParser.OC_QueryOptionsContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_AnyCypherOption}.
	 * @param ctx the parse tree
	 */
	void enterOC_AnyCypherOption(CypherParser.OC_AnyCypherOptionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_AnyCypherOption}.
	 * @param ctx the parse tree
	 */
	void exitOC_AnyCypherOption(CypherParser.OC_AnyCypherOptionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CypherOption}.
	 * @param ctx the parse tree
	 */
	void enterOC_CypherOption(CypherParser.OC_CypherOptionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CypherOption}.
	 * @param ctx the parse tree
	 */
	void exitOC_CypherOption(CypherParser.OC_CypherOptionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_VersionNumber}.
	 * @param ctx the parse tree
	 */
	void enterOC_VersionNumber(CypherParser.OC_VersionNumberContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_VersionNumber}.
	 * @param ctx the parse tree
	 */
	void exitOC_VersionNumber(CypherParser.OC_VersionNumberContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Explain}.
	 * @param ctx the parse tree
	 */
	void enterOC_Explain(CypherParser.OC_ExplainContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Explain}.
	 * @param ctx the parse tree
	 */
	void exitOC_Explain(CypherParser.OC_ExplainContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Profile}.
	 * @param ctx the parse tree
	 */
	void enterOC_Profile(CypherParser.OC_ProfileContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Profile}.
	 * @param ctx the parse tree
	 */
	void exitOC_Profile(CypherParser.OC_ProfileContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ConfigurationOption}.
	 * @param ctx the parse tree
	 */
	void enterOC_ConfigurationOption(CypherParser.OC_ConfigurationOptionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ConfigurationOption}.
	 * @param ctx the parse tree
	 */
	void exitOC_ConfigurationOption(CypherParser.OC_ConfigurationOptionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Statement}.
	 * @param ctx the parse tree
	 */
	void enterOC_Statement(CypherParser.OC_StatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Statement}.
	 * @param ctx the parse tree
	 */
	void exitOC_Statement(CypherParser.OC_StatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Query}.
	 * @param ctx the parse tree
	 */
	void enterOC_Query(CypherParser.OC_QueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Query}.
	 * @param ctx the parse tree
	 */
	void exitOC_Query(CypherParser.OC_QueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Use}.
	 * @param ctx the parse tree
	 */
	void enterOC_Use(CypherParser.OC_UseContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Use}.
	 * @param ctx the parse tree
	 */
	void exitOC_Use(CypherParser.OC_UseContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RegularQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_RegularQuery(CypherParser.OC_RegularQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RegularQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_RegularQuery(CypherParser.OC_RegularQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_BulkImportQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_BulkImportQuery(CypherParser.OC_BulkImportQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_BulkImportQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_BulkImportQuery(CypherParser.OC_BulkImportQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PeriodicCommitHint}.
	 * @param ctx the parse tree
	 */
	void enterOC_PeriodicCommitHint(CypherParser.OC_PeriodicCommitHintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PeriodicCommitHint}.
	 * @param ctx the parse tree
	 */
	void exitOC_PeriodicCommitHint(CypherParser.OC_PeriodicCommitHintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LoadCSVQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_LoadCSVQuery(CypherParser.OC_LoadCSVQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LoadCSVQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_LoadCSVQuery(CypherParser.OC_LoadCSVQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Union}.
	 * @param ctx the parse tree
	 */
	void enterOC_Union(CypherParser.OC_UnionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Union}.
	 * @param ctx the parse tree
	 */
	void exitOC_Union(CypherParser.OC_UnionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SingleQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_SingleQuery(CypherParser.OC_SingleQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SingleQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_SingleQuery(CypherParser.OC_SingleQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SinglePartQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_SinglePartQuery(CypherParser.OC_SinglePartQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SinglePartQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_SinglePartQuery(CypherParser.OC_SinglePartQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_MultiPartQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_MultiPartQuery(CypherParser.OC_MultiPartQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_MultiPartQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_MultiPartQuery(CypherParser.OC_MultiPartQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_UpdatingClause}.
	 * @param ctx the parse tree
	 */
	void enterOC_UpdatingClause(CypherParser.OC_UpdatingClauseContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_UpdatingClause}.
	 * @param ctx the parse tree
	 */
	void exitOC_UpdatingClause(CypherParser.OC_UpdatingClauseContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ReadingClause}.
	 * @param ctx the parse tree
	 */
	void enterOC_ReadingClause(CypherParser.OC_ReadingClauseContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ReadingClause}.
	 * @param ctx the parse tree
	 */
	void exitOC_ReadingClause(CypherParser.OC_ReadingClauseContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Command}.
	 * @param ctx the parse tree
	 */
	void enterOC_Command(CypherParser.OC_CommandContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Command}.
	 * @param ctx the parse tree
	 */
	void exitOC_Command(CypherParser.OC_CommandContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CreateUniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_CreateUniqueConstraint(CypherParser.OC_CreateUniqueConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CreateUniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_CreateUniqueConstraint(CypherParser.OC_CreateUniqueConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CreateNodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_CreateNodePropertyExistenceConstraint(CypherParser.OC_CreateNodePropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CreateNodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_CreateNodePropertyExistenceConstraint(CypherParser.OC_CreateNodePropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CreateRelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_CreateRelationshipPropertyExistenceConstraint(CypherParser.OC_CreateRelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CreateRelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_CreateRelationshipPropertyExistenceConstraint(CypherParser.OC_CreateRelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CreateIndex}.
	 * @param ctx the parse tree
	 */
	void enterOC_CreateIndex(CypherParser.OC_CreateIndexContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CreateIndex}.
	 * @param ctx the parse tree
	 */
	void exitOC_CreateIndex(CypherParser.OC_CreateIndexContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_DropUniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_DropUniqueConstraint(CypherParser.OC_DropUniqueConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_DropUniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_DropUniqueConstraint(CypherParser.OC_DropUniqueConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_DropNodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_DropNodePropertyExistenceConstraint(CypherParser.OC_DropNodePropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_DropNodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_DropNodePropertyExistenceConstraint(CypherParser.OC_DropNodePropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_DropRelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_DropRelationshipPropertyExistenceConstraint(CypherParser.OC_DropRelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_DropRelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_DropRelationshipPropertyExistenceConstraint(CypherParser.OC_DropRelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_DropIndex}.
	 * @param ctx the parse tree
	 */
	void enterOC_DropIndex(CypherParser.OC_DropIndexContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_DropIndex}.
	 * @param ctx the parse tree
	 */
	void exitOC_DropIndex(CypherParser.OC_DropIndexContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Index}.
	 * @param ctx the parse tree
	 */
	void enterOC_Index(CypherParser.OC_IndexContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Index}.
	 * @param ctx the parse tree
	 */
	void exitOC_Index(CypherParser.OC_IndexContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_UniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_UniqueConstraint(CypherParser.OC_UniqueConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_UniqueConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_UniqueConstraint(CypherParser.OC_UniqueConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodePropertyExistenceConstraint(CypherParser.OC_NodePropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodePropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodePropertyExistenceConstraint(CypherParser.OC_NodePropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipPropertyExistenceConstraint(CypherParser.OC_RelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipPropertyExistenceConstraint}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipPropertyExistenceConstraint(CypherParser.OC_RelationshipPropertyExistenceConstraintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipPatternSyntax}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipPatternSyntax(CypherParser.OC_RelationshipPatternSyntaxContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipPatternSyntax}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipPatternSyntax(CypherParser.OC_RelationshipPatternSyntaxContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LoadCSV}.
	 * @param ctx the parse tree
	 */
	void enterOC_LoadCSV(CypherParser.OC_LoadCSVContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LoadCSV}.
	 * @param ctx the parse tree
	 */
	void exitOC_LoadCSV(CypherParser.OC_LoadCSVContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Match}.
	 * @param ctx the parse tree
	 */
	void enterOC_Match(CypherParser.OC_MatchContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Match}.
	 * @param ctx the parse tree
	 */
	void exitOC_Match(CypherParser.OC_MatchContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Unwind}.
	 * @param ctx the parse tree
	 */
	void enterOC_Unwind(CypherParser.OC_UnwindContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Unwind}.
	 * @param ctx the parse tree
	 */
	void exitOC_Unwind(CypherParser.OC_UnwindContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Merge}.
	 * @param ctx the parse tree
	 */
	void enterOC_Merge(CypherParser.OC_MergeContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Merge}.
	 * @param ctx the parse tree
	 */
	void exitOC_Merge(CypherParser.OC_MergeContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_MergeAction}.
	 * @param ctx the parse tree
	 */
	void enterOC_MergeAction(CypherParser.OC_MergeActionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_MergeAction}.
	 * @param ctx the parse tree
	 */
	void exitOC_MergeAction(CypherParser.OC_MergeActionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Create}.
	 * @param ctx the parse tree
	 */
	void enterOC_Create(CypherParser.OC_CreateContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Create}.
	 * @param ctx the parse tree
	 */
	void exitOC_Create(CypherParser.OC_CreateContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CreateUnique}.
	 * @param ctx the parse tree
	 */
	void enterOC_CreateUnique(CypherParser.OC_CreateUniqueContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CreateUnique}.
	 * @param ctx the parse tree
	 */
	void exitOC_CreateUnique(CypherParser.OC_CreateUniqueContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Set}.
	 * @param ctx the parse tree
	 */
	void enterOC_Set(CypherParser.OC_SetContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Set}.
	 * @param ctx the parse tree
	 */
	void exitOC_Set(CypherParser.OC_SetContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SetItem}.
	 * @param ctx the parse tree
	 */
	void enterOC_SetItem(CypherParser.OC_SetItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SetItem}.
	 * @param ctx the parse tree
	 */
	void exitOC_SetItem(CypherParser.OC_SetItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Delete}.
	 * @param ctx the parse tree
	 */
	void enterOC_Delete(CypherParser.OC_DeleteContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Delete}.
	 * @param ctx the parse tree
	 */
	void exitOC_Delete(CypherParser.OC_DeleteContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Remove}.
	 * @param ctx the parse tree
	 */
	void enterOC_Remove(CypherParser.OC_RemoveContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Remove}.
	 * @param ctx the parse tree
	 */
	void exitOC_Remove(CypherParser.OC_RemoveContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RemoveItem}.
	 * @param ctx the parse tree
	 */
	void enterOC_RemoveItem(CypherParser.OC_RemoveItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RemoveItem}.
	 * @param ctx the parse tree
	 */
	void exitOC_RemoveItem(CypherParser.OC_RemoveItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Foreach}.
	 * @param ctx the parse tree
	 */
	void enterOC_Foreach(CypherParser.OC_ForeachContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Foreach}.
	 * @param ctx the parse tree
	 */
	void exitOC_Foreach(CypherParser.OC_ForeachContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_InQueryCall}.
	 * @param ctx the parse tree
	 */
	void enterOC_InQueryCall(CypherParser.OC_InQueryCallContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_InQueryCall}.
	 * @param ctx the parse tree
	 */
	void exitOC_InQueryCall(CypherParser.OC_InQueryCallContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SubQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_SubQuery(CypherParser.OC_SubQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SubQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_SubQuery(CypherParser.OC_SubQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SubQueryVariableScope}.
	 * @param ctx the parse tree
	 */
	void enterOC_SubQueryVariableScope(CypherParser.OC_SubQueryVariableScopeContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SubQueryVariableScope}.
	 * @param ctx the parse tree
	 */
	void exitOC_SubQueryVariableScope(CypherParser.OC_SubQueryVariableScopeContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SubQueryDirective}.
	 * @param ctx the parse tree
	 */
	void enterOC_SubQueryDirective(CypherParser.OC_SubQueryDirectiveContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SubQueryDirective}.
	 * @param ctx the parse tree
	 */
	void exitOC_SubQueryDirective(CypherParser.OC_SubQueryDirectiveContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_StandaloneCall}.
	 * @param ctx the parse tree
	 */
	void enterOC_StandaloneCall(CypherParser.OC_StandaloneCallContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_StandaloneCall}.
	 * @param ctx the parse tree
	 */
	void exitOC_StandaloneCall(CypherParser.OC_StandaloneCallContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_YieldItems}.
	 * @param ctx the parse tree
	 */
	void enterOC_YieldItems(CypherParser.OC_YieldItemsContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_YieldItems}.
	 * @param ctx the parse tree
	 */
	void exitOC_YieldItems(CypherParser.OC_YieldItemsContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_YieldItem}.
	 * @param ctx the parse tree
	 */
	void enterOC_YieldItem(CypherParser.OC_YieldItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_YieldItem}.
	 * @param ctx the parse tree
	 */
	void exitOC_YieldItem(CypherParser.OC_YieldItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_With}.
	 * @param ctx the parse tree
	 */
	void enterOC_With(CypherParser.OC_WithContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_With}.
	 * @param ctx the parse tree
	 */
	void exitOC_With(CypherParser.OC_WithContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Return}.
	 * @param ctx the parse tree
	 */
	void enterOC_Return(CypherParser.OC_ReturnContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Return}.
	 * @param ctx the parse tree
	 */
	void exitOC_Return(CypherParser.OC_ReturnContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ReturnBody}.
	 * @param ctx the parse tree
	 */
	void enterOC_ReturnBody(CypherParser.OC_ReturnBodyContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ReturnBody}.
	 * @param ctx the parse tree
	 */
	void exitOC_ReturnBody(CypherParser.OC_ReturnBodyContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ReturnItems}.
	 * @param ctx the parse tree
	 */
	void enterOC_ReturnItems(CypherParser.OC_ReturnItemsContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ReturnItems}.
	 * @param ctx the parse tree
	 */
	void exitOC_ReturnItems(CypherParser.OC_ReturnItemsContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ReturnItem}.
	 * @param ctx the parse tree
	 */
	void enterOC_ReturnItem(CypherParser.OC_ReturnItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ReturnItem}.
	 * @param ctx the parse tree
	 */
	void exitOC_ReturnItem(CypherParser.OC_ReturnItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Order}.
	 * @param ctx the parse tree
	 */
	void enterOC_Order(CypherParser.OC_OrderContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Order}.
	 * @param ctx the parse tree
	 */
	void exitOC_Order(CypherParser.OC_OrderContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Skip}.
	 * @param ctx the parse tree
	 */
	void enterOC_Skip(CypherParser.OC_SkipContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Skip}.
	 * @param ctx the parse tree
	 */
	void exitOC_Skip(CypherParser.OC_SkipContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Limit}.
	 * @param ctx the parse tree
	 */
	void enterOC_Limit(CypherParser.OC_LimitContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Limit}.
	 * @param ctx the parse tree
	 */
	void exitOC_Limit(CypherParser.OC_LimitContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SortItem}.
	 * @param ctx the parse tree
	 */
	void enterOC_SortItem(CypherParser.OC_SortItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SortItem}.
	 * @param ctx the parse tree
	 */
	void exitOC_SortItem(CypherParser.OC_SortItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Hint}.
	 * @param ctx the parse tree
	 */
	void enterOC_Hint(CypherParser.OC_HintContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Hint}.
	 * @param ctx the parse tree
	 */
	void exitOC_Hint(CypherParser.OC_HintContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_IdentifiedIndexLookup}.
	 * @param ctx the parse tree
	 */
	void enterOC_IdentifiedIndexLookup(CypherParser.OC_IdentifiedIndexLookupContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_IdentifiedIndexLookup}.
	 * @param ctx the parse tree
	 */
	void exitOC_IdentifiedIndexLookup(CypherParser.OC_IdentifiedIndexLookupContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_IndexQuery}.
	 * @param ctx the parse tree
	 */
	void enterOC_IndexQuery(CypherParser.OC_IndexQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_IndexQuery}.
	 * @param ctx the parse tree
	 */
	void exitOC_IndexQuery(CypherParser.OC_IndexQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_IdLookup}.
	 * @param ctx the parse tree
	 */
	void enterOC_IdLookup(CypherParser.OC_IdLookupContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_IdLookup}.
	 * @param ctx the parse tree
	 */
	void exitOC_IdLookup(CypherParser.OC_IdLookupContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LiteralIds}.
	 * @param ctx the parse tree
	 */
	void enterOC_LiteralIds(CypherParser.OC_LiteralIdsContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LiteralIds}.
	 * @param ctx the parse tree
	 */
	void exitOC_LiteralIds(CypherParser.OC_LiteralIdsContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Where}.
	 * @param ctx the parse tree
	 */
	void enterOC_Where(CypherParser.OC_WhereContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Where}.
	 * @param ctx the parse tree
	 */
	void exitOC_Where(CypherParser.OC_WhereContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Pattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_Pattern(CypherParser.OC_PatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Pattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_Pattern(CypherParser.OC_PatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PatternPart}.
	 * @param ctx the parse tree
	 */
	void enterOC_PatternPart(CypherParser.OC_PatternPartContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PatternPart}.
	 * @param ctx the parse tree
	 */
	void exitOC_PatternPart(CypherParser.OC_PatternPartContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_AnonymousPatternPart}.
	 * @param ctx the parse tree
	 */
	void enterOC_AnonymousPatternPart(CypherParser.OC_AnonymousPatternPartContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_AnonymousPatternPart}.
	 * @param ctx the parse tree
	 */
	void exitOC_AnonymousPatternPart(CypherParser.OC_AnonymousPatternPartContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ShortestPathPattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_ShortestPathPattern(CypherParser.OC_ShortestPathPatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ShortestPathPattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_ShortestPathPattern(CypherParser.OC_ShortestPathPatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PatternElement}.
	 * @param ctx the parse tree
	 */
	void enterOC_PatternElement(CypherParser.OC_PatternElementContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PatternElement}.
	 * @param ctx the parse tree
	 */
	void exitOC_PatternElement(CypherParser.OC_PatternElementContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_OpenParen}.
	 * @param ctx the parse tree
	 */
	void enterOC_OpenParen(CypherParser.OC_OpenParenContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_OpenParen}.
	 * @param ctx the parse tree
	 */
	void exitOC_OpenParen(CypherParser.OC_OpenParenContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CloseParen}.
	 * @param ctx the parse tree
	 */
	void enterOC_CloseParen(CypherParser.OC_CloseParenContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CloseParen}.
	 * @param ctx the parse tree
	 */
	void exitOC_CloseParen(CypherParser.OC_CloseParenContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodePattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodePattern(CypherParser.OC_NodePatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodePattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodePattern(CypherParser.OC_NodePatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PatternElementChain}.
	 * @param ctx the parse tree
	 */
	void enterOC_PatternElementChain(CypherParser.OC_PatternElementChainContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PatternElementChain}.
	 * @param ctx the parse tree
	 */
	void exitOC_PatternElementChain(CypherParser.OC_PatternElementChainContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipPattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipPattern(CypherParser.OC_RelationshipPatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipPattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipPattern(CypherParser.OC_RelationshipPatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipDetail}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipDetail(CypherParser.OC_RelationshipDetailContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipDetail}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipDetail(CypherParser.OC_RelationshipDetailContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_QuantifiedPathPattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_QuantifiedPathPattern(CypherParser.OC_QuantifiedPathPatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_QuantifiedPathPattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_QuantifiedPathPattern(CypherParser.OC_QuantifiedPathPatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PathPatternQuantifier}.
	 * @param ctx the parse tree
	 */
	void enterOC_PathPatternQuantifier(CypherParser.OC_PathPatternQuantifierContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PathPatternQuantifier}.
	 * @param ctx the parse tree
	 */
	void exitOC_PathPatternQuantifier(CypherParser.OC_PathPatternQuantifierContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Properties}.
	 * @param ctx the parse tree
	 */
	void enterOC_Properties(CypherParser.OC_PropertiesContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Properties}.
	 * @param ctx the parse tree
	 */
	void exitOC_Properties(CypherParser.OC_PropertiesContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelType}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelType(CypherParser.OC_RelTypeContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelType}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelType(CypherParser.OC_RelTypeContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypes}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypes(CypherParser.OC_RelationshipTypesContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypes}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypes(CypherParser.OC_RelationshipTypesContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeTerm}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeTerm(CypherParser.OC_RelationshipTypeTermContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeTerm}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeTerm(CypherParser.OC_RelationshipTypeTermContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeOr}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeOr(CypherParser.OC_RelationshipTypeOrContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeOr}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeOr(CypherParser.OC_RelationshipTypeOrContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeAnd}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeAnd(CypherParser.OC_RelationshipTypeAndContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeAnd}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeAnd(CypherParser.OC_RelationshipTypeAndContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeNot}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeNot(CypherParser.OC_RelationshipTypeNotContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeNot}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeNot(CypherParser.OC_RelationshipTypeNotContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeContainer}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeContainer(CypherParser.OC_RelationshipTypeContainerContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeContainer}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeContainer(CypherParser.OC_RelationshipTypeContainerContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeGroup}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeGroup(CypherParser.OC_RelationshipTypeGroupContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeGroup}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeGroup(CypherParser.OC_RelationshipTypeGroupContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeNotNested}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeNotNested(CypherParser.OC_RelationshipTypeNotNestedContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeNotNested}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeNotNested(CypherParser.OC_RelationshipTypeNotNestedContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipTypeAny}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipTypeAny(CypherParser.OC_RelationshipTypeAnyContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipTypeAny}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipTypeAny(CypherParser.OC_RelationshipTypeAnyContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabels}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabels(CypherParser.OC_NodeLabelsContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabels}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabels(CypherParser.OC_NodeLabelsContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelTerm}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelTerm(CypherParser.OC_NodeLabelTermContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelTerm}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelTerm(CypherParser.OC_NodeLabelTermContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelOr}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelOr(CypherParser.OC_NodeLabelOrContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelOr}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelOr(CypherParser.OC_NodeLabelOrContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelAnd}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelAnd(CypherParser.OC_NodeLabelAndContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelAnd}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelAnd(CypherParser.OC_NodeLabelAndContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelNot}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelNot(CypherParser.OC_NodeLabelNotContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelNot}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelNot(CypherParser.OC_NodeLabelNotContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelContainer}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelContainer(CypherParser.OC_NodeLabelContainerContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelContainer}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelContainer(CypherParser.OC_NodeLabelContainerContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelGroup}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelGroup(CypherParser.OC_NodeLabelGroupContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelGroup}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelGroup(CypherParser.OC_NodeLabelGroupContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelNotNested}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelNotNested(CypherParser.OC_NodeLabelNotNestedContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelNotNested}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelNotNested(CypherParser.OC_NodeLabelNotNestedContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabelAny}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabelAny(CypherParser.OC_NodeLabelAnyContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabelAny}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabelAny(CypherParser.OC_NodeLabelAnyContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeLabel}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeLabel(CypherParser.OC_NodeLabelContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeLabel}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeLabel(CypherParser.OC_NodeLabelContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RangeLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_RangeLiteral(CypherParser.OC_RangeLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RangeLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_RangeLiteral(CypherParser.OC_RangeLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LabelName}.
	 * @param ctx the parse tree
	 */
	void enterOC_LabelName(CypherParser.OC_LabelNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LabelName}.
	 * @param ctx the parse tree
	 */
	void exitOC_LabelName(CypherParser.OC_LabelNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelTypeName}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelTypeName(CypherParser.OC_RelTypeNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelTypeName}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelTypeName(CypherParser.OC_RelTypeNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Expression}.
	 * @param ctx the parse tree
	 */
	void enterOC_Expression(CypherParser.OC_ExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Expression}.
	 * @param ctx the parse tree
	 */
	void exitOC_Expression(CypherParser.OC_ExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_OrExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_OrExpression(CypherParser.OC_OrExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_OrExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_OrExpression(CypherParser.OC_OrExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_XorExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_XorExpression(CypherParser.OC_XorExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_XorExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_XorExpression(CypherParser.OC_XorExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_AndExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_AndExpression(CypherParser.OC_AndExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_AndExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_AndExpression(CypherParser.OC_AndExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NotExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_NotExpression(CypherParser.OC_NotExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NotExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_NotExpression(CypherParser.OC_NotExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ComparisonExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_ComparisonExpression(CypherParser.OC_ComparisonExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ComparisonExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_ComparisonExpression(CypherParser.OC_ComparisonExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_AddOrSubtractExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_AddOrSubtractExpression(CypherParser.OC_AddOrSubtractExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_AddOrSubtractExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_AddOrSubtractExpression(CypherParser.OC_AddOrSubtractExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_MultiplyDivideModuloExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_MultiplyDivideModuloExpression(CypherParser.OC_MultiplyDivideModuloExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_MultiplyDivideModuloExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_MultiplyDivideModuloExpression(CypherParser.OC_MultiplyDivideModuloExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PowerOfExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_PowerOfExpression(CypherParser.OC_PowerOfExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PowerOfExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_PowerOfExpression(CypherParser.OC_PowerOfExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_UnaryAddOrSubtractExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_UnaryAddOrSubtractExpression(CypherParser.OC_UnaryAddOrSubtractExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_UnaryAddOrSubtractExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_UnaryAddOrSubtractExpression(CypherParser.OC_UnaryAddOrSubtractExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_StringListNullOperatorExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_StringListNullOperatorExpression(CypherParser.OC_StringListNullOperatorExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_StringListNullOperatorExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_StringListNullOperatorExpression(CypherParser.OC_StringListNullOperatorExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RegularExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_RegularExpression(CypherParser.OC_RegularExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RegularExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_RegularExpression(CypherParser.OC_RegularExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PropertyOrLabelsExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_PropertyOrLabelsExpression(CypherParser.OC_PropertyOrLabelsExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PropertyOrLabelsExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_PropertyOrLabelsExpression(CypherParser.OC_PropertyOrLabelsExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NodeProjection}.
	 * @param ctx the parse tree
	 */
	void enterOC_NodeProjection(CypherParser.OC_NodeProjectionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NodeProjection}.
	 * @param ctx the parse tree
	 */
	void exitOC_NodeProjection(CypherParser.OC_NodeProjectionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Atom}.
	 * @param ctx the parse tree
	 */
	void enterOC_Atom(CypherParser.OC_AtomContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Atom}.
	 * @param ctx the parse tree
	 */
	void exitOC_Atom(CypherParser.OC_AtomContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Literal}.
	 * @param ctx the parse tree
	 */
	void enterOC_Literal(CypherParser.OC_LiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Literal}.
	 * @param ctx the parse tree
	 */
	void exitOC_Literal(CypherParser.OC_LiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_BooleanLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_BooleanLiteral(CypherParser.OC_BooleanLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_BooleanLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_BooleanLiteral(CypherParser.OC_BooleanLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ListLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_ListLiteral(CypherParser.OC_ListLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ListLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_ListLiteral(CypherParser.OC_ListLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Reduce}.
	 * @param ctx the parse tree
	 */
	void enterOC_Reduce(CypherParser.OC_ReduceContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Reduce}.
	 * @param ctx the parse tree
	 */
	void exitOC_Reduce(CypherParser.OC_ReduceContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PartialComparisonExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_PartialComparisonExpression(CypherParser.OC_PartialComparisonExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PartialComparisonExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_PartialComparisonExpression(CypherParser.OC_PartialComparisonExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ParenthesizedExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_ParenthesizedExpression(CypherParser.OC_ParenthesizedExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ParenthesizedExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_ParenthesizedExpression(CypherParser.OC_ParenthesizedExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RelationshipsPattern}.
	 * @param ctx the parse tree
	 */
	void enterOC_RelationshipsPattern(CypherParser.OC_RelationshipsPatternContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RelationshipsPattern}.
	 * @param ctx the parse tree
	 */
	void exitOC_RelationshipsPattern(CypherParser.OC_RelationshipsPatternContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_FilterExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_FilterExpression(CypherParser.OC_FilterExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_FilterExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_FilterExpression(CypherParser.OC_FilterExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_IdInColl}.
	 * @param ctx the parse tree
	 */
	void enterOC_IdInColl(CypherParser.OC_IdInCollContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_IdInColl}.
	 * @param ctx the parse tree
	 */
	void exitOC_IdInColl(CypherParser.OC_IdInCollContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_FunctionInvocation}.
	 * @param ctx the parse tree
	 */
	void enterOC_FunctionInvocation(CypherParser.OC_FunctionInvocationContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_FunctionInvocation}.
	 * @param ctx the parse tree
	 */
	void exitOC_FunctionInvocation(CypherParser.OC_FunctionInvocationContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_FunctionName}.
	 * @param ctx the parse tree
	 */
	void enterOC_FunctionName(CypherParser.OC_FunctionNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_FunctionName}.
	 * @param ctx the parse tree
	 */
	void exitOC_FunctionName(CypherParser.OC_FunctionNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ExplicitProcedureInvocation}.
	 * @param ctx the parse tree
	 */
	void enterOC_ExplicitProcedureInvocation(CypherParser.OC_ExplicitProcedureInvocationContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ExplicitProcedureInvocation}.
	 * @param ctx the parse tree
	 */
	void exitOC_ExplicitProcedureInvocation(CypherParser.OC_ExplicitProcedureInvocationContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ImplicitProcedureInvocation}.
	 * @param ctx the parse tree
	 */
	void enterOC_ImplicitProcedureInvocation(CypherParser.OC_ImplicitProcedureInvocationContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ImplicitProcedureInvocation}.
	 * @param ctx the parse tree
	 */
	void exitOC_ImplicitProcedureInvocation(CypherParser.OC_ImplicitProcedureInvocationContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ProcedureResultField}.
	 * @param ctx the parse tree
	 */
	void enterOC_ProcedureResultField(CypherParser.OC_ProcedureResultFieldContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ProcedureResultField}.
	 * @param ctx the parse tree
	 */
	void exitOC_ProcedureResultField(CypherParser.OC_ProcedureResultFieldContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ProcedureName}.
	 * @param ctx the parse tree
	 */
	void enterOC_ProcedureName(CypherParser.OC_ProcedureNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ProcedureName}.
	 * @param ctx the parse tree
	 */
	void exitOC_ProcedureName(CypherParser.OC_ProcedureNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Namespace}.
	 * @param ctx the parse tree
	 */
	void enterOC_Namespace(CypherParser.OC_NamespaceContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Namespace}.
	 * @param ctx the parse tree
	 */
	void exitOC_Namespace(CypherParser.OC_NamespaceContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ListComprehension}.
	 * @param ctx the parse tree
	 */
	void enterOC_ListComprehension(CypherParser.OC_ListComprehensionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ListComprehension}.
	 * @param ctx the parse tree
	 */
	void exitOC_ListComprehension(CypherParser.OC_ListComprehensionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PatternComprehension}.
	 * @param ctx the parse tree
	 */
	void enterOC_PatternComprehension(CypherParser.OC_PatternComprehensionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PatternComprehension}.
	 * @param ctx the parse tree
	 */
	void exitOC_PatternComprehension(CypherParser.OC_PatternComprehensionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PropertyLookup}.
	 * @param ctx the parse tree
	 */
	void enterOC_PropertyLookup(CypherParser.OC_PropertyLookupContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PropertyLookup}.
	 * @param ctx the parse tree
	 */
	void exitOC_PropertyLookup(CypherParser.OC_PropertyLookupContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CaseExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_CaseExpression(CypherParser.OC_CaseExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CaseExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_CaseExpression(CypherParser.OC_CaseExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_CaseAlternatives}.
	 * @param ctx the parse tree
	 */
	void enterOC_CaseAlternatives(CypherParser.OC_CaseAlternativesContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_CaseAlternatives}.
	 * @param ctx the parse tree
	 */
	void exitOC_CaseAlternatives(CypherParser.OC_CaseAlternativesContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Variable}.
	 * @param ctx the parse tree
	 */
	void enterOC_Variable(CypherParser.OC_VariableContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Variable}.
	 * @param ctx the parse tree
	 */
	void exitOC_Variable(CypherParser.OC_VariableContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_NumberLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_NumberLiteral(CypherParser.OC_NumberLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_NumberLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_NumberLiteral(CypherParser.OC_NumberLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_MapLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_MapLiteral(CypherParser.OC_MapLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_MapLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_MapLiteral(CypherParser.OC_MapLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LegacyParameter}.
	 * @param ctx the parse tree
	 */
	void enterOC_LegacyParameter(CypherParser.OC_LegacyParameterContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LegacyParameter}.
	 * @param ctx the parse tree
	 */
	void exitOC_LegacyParameter(CypherParser.OC_LegacyParameterContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Parameter}.
	 * @param ctx the parse tree
	 */
	void enterOC_Parameter(CypherParser.OC_ParameterContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Parameter}.
	 * @param ctx the parse tree
	 */
	void exitOC_Parameter(CypherParser.OC_ParameterContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PropertyExpression}.
	 * @param ctx the parse tree
	 */
	void enterOC_PropertyExpression(CypherParser.OC_PropertyExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PropertyExpression}.
	 * @param ctx the parse tree
	 */
	void exitOC_PropertyExpression(CypherParser.OC_PropertyExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_PropertyKeyName}.
	 * @param ctx the parse tree
	 */
	void enterOC_PropertyKeyName(CypherParser.OC_PropertyKeyNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_PropertyKeyName}.
	 * @param ctx the parse tree
	 */
	void exitOC_PropertyKeyName(CypherParser.OC_PropertyKeyNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_IntegerLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_IntegerLiteral(CypherParser.OC_IntegerLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_IntegerLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_IntegerLiteral(CypherParser.OC_IntegerLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_DoubleLiteral}.
	 * @param ctx the parse tree
	 */
	void enterOC_DoubleLiteral(CypherParser.OC_DoubleLiteralContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_DoubleLiteral}.
	 * @param ctx the parse tree
	 */
	void exitOC_DoubleLiteral(CypherParser.OC_DoubleLiteralContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SchemaName}.
	 * @param ctx the parse tree
	 */
	void enterOC_SchemaName(CypherParser.OC_SchemaNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SchemaName}.
	 * @param ctx the parse tree
	 */
	void exitOC_SchemaName(CypherParser.OC_SchemaNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_ReservedWord}.
	 * @param ctx the parse tree
	 */
	void enterOC_ReservedWord(CypherParser.OC_ReservedWordContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_ReservedWord}.
	 * @param ctx the parse tree
	 */
	void exitOC_ReservedWord(CypherParser.OC_ReservedWordContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_SymbolicName}.
	 * @param ctx the parse tree
	 */
	void enterOC_SymbolicName(CypherParser.OC_SymbolicNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_SymbolicName}.
	 * @param ctx the parse tree
	 */
	void exitOC_SymbolicName(CypherParser.OC_SymbolicNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_KeywordsThatArePartOfFunctionNames}.
	 * @param ctx the parse tree
	 */
	void enterOC_KeywordsThatArePartOfFunctionNames(CypherParser.OC_KeywordsThatArePartOfFunctionNamesContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_KeywordsThatArePartOfFunctionNames}.
	 * @param ctx the parse tree
	 */
	void exitOC_KeywordsThatArePartOfFunctionNames(CypherParser.OC_KeywordsThatArePartOfFunctionNamesContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_LeftArrowHead}.
	 * @param ctx the parse tree
	 */
	void enterOC_LeftArrowHead(CypherParser.OC_LeftArrowHeadContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_LeftArrowHead}.
	 * @param ctx the parse tree
	 */
	void exitOC_LeftArrowHead(CypherParser.OC_LeftArrowHeadContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_RightArrowHead}.
	 * @param ctx the parse tree
	 */
	void enterOC_RightArrowHead(CypherParser.OC_RightArrowHeadContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_RightArrowHead}.
	 * @param ctx the parse tree
	 */
	void exitOC_RightArrowHead(CypherParser.OC_RightArrowHeadContext ctx);
	/**
	 * Enter a parse tree produced by {@link CypherParser#oC_Dash}.
	 * @param ctx the parse tree
	 */
	void enterOC_Dash(CypherParser.OC_DashContext ctx);
	/**
	 * Exit a parse tree produced by {@link CypherParser#oC_Dash}.
	 * @param ctx the parse tree
	 */
	void exitOC_Dash(CypherParser.OC_DashContext ctx);
}