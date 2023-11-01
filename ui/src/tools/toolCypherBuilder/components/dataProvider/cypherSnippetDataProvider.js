import { Node } from 'slate';
import DataTypes from '../../../../dataModel/DataTypes';
import { CypherKeywords } from '../../../../common/parse/cypherKeywords';
import BlockUpdateType from '../dataProvider/blockUpdateTypes';
import { parseWith } from '../../../../common/parse/parseWith';
import { WithVariable } from '../../../../common/parse/antlr/withVariable';

export class CypherSnippetDataProvider {

    initialValue = [
        {
          children: [
            {
              text: '',
            }
          ],
        }
      ]

    initialValueJson = JSON.stringify(this.initialValue);
      
    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            cypherSnippet,
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.cypherSnippet = (cypherSnippet) ? cypherSnippet : this.initialValue;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getDataModel = () => this.cypherBlockDataProvider.getDataModel();

    getScopedBlockProvider = () => this.cypherBlockDataProvider.getScopedBlockProvider(this.cypherBlockKey);

    setCypherKeyword = (cypherSnippet) => {
        const existingKeyword = this.cypherKeyword;
        var newKeyword = '';
        if (cypherSnippet && cypherSnippet.split) {
            const tokens = cypherSnippet.split(' ');
            const keywordOption1 = tokens[0];       // e.g. WITH
            const keywordOption2 = `${tokens[0]} ${tokens[1]}`;  // e.g. ORDER BY

            newKeyword = CypherKeywords.includes(keywordOption1) 
                    ? keywordOption1 
                    : CypherKeywords.includes(keywordOption2)
                        ? keywordOption2 
                        : '';
        }
        if (existingKeyword !== newKeyword) {
            this.cypherKeyword = newKeyword;
            this.cypherBlockDataProvider.setCypherSnippetKeyword({
                cypherBlockKey: this.cypherBlockKey, 
                newKeyword: this.cypherKeyword,
                oldKeyword: existingKeyword
            });
        }
    }

    getCypherKeyword = () => this.cypherKeyword;

    setCypherSnippet = (cypherSnippet, ignoreSave, ignoreCypherUpdate) => {
        this.cypherSnippet = cypherSnippet;
        const cypher = this.getCypher();
        this.setCypherKeyword(cypher);
        if (!ignoreSave) {
            const json = JSON.stringify(cypherSnippet);
            this.graphNode.addOrUpdateProperty("cypherSnippet", json, DataTypes.String);
        }

        // update cypher
        if (!ignoreCypherUpdate) {
            this.cypherBuilder.updateCypher();
        }        
    }

    setPlainTextCypherStatement = (plainTextCypherStatement, ignoreSave) => {
        var slateText = [];
        var lines = plainTextCypherStatement.split('\n');
        lines.map((x,i) => {
          slateText.push({
            children: [
              {
                text: x,
              }
            ],
          });
          if (i < (lines.length - 1)) {
            slateText.push({
              children: [
                {
                  text: '',
                }
              ],
            });
          }
        })
        this.setCypherSnippet(slateText, ignoreSave);
        return slateText;
      }

    getCypherSnippet = () => this.cypherSnippet;

    loadDataIfPresent = () => {
        const json = this.graphNode.getPropertyValueByKey("cypherSnippet", this.initialValueJson);
        this.setCypherSnippet(JSON.parse(json));        
        //console.log('this.cypherSnippet: ', this.cypherSnippet);
    }

    getCypher = () => {
        //console.log('this.cypherSnippet: ', this.cypherSnippet);
        if (this.cypherSnippet && this.cypherSnippet.map) {
            return this.cypherSnippet
                .map(x => x.children)
                .reduce((acc,children) => acc.concat(children),[])
                .map((child,index) => {
                    var text = Node.string(child);
                    // slate is turning new lines into empty blocks - this will convert them back
                    return (!text && index > 0) ? '\n' : text.trim();
                })
                .join('');
        } else {
            console.log('typeof cypherSnippet: ', typeof(cypherSnippet));
            console.log('this.cypherSnippet: ', this.cypherSnippet);
            return '';
        }
    }
 
    handleBlockUpdated = (args) => {
        args = args || {};
        //const { scopedBlockProvider } = args;
        this.ensureVariablesInVariableScope();
    }

    renameVariable = (args) => {
        args = args || {};
        var {
            variablePreviousValue, 
            variable, 
            item
        } = args;
        // TODO
    }

    ensureVariablesInVariableScope = () => {
        var withCypher = this.getCypher();
        //console.log('ensureVariablesInVariableScope withCypher: ', withCypher);
        if (withCypher) {
            var results = parseWith(withCypher);
            const trimmedCypher = withCypher.trim().toUpperCase();
            if (results.parseSuccessful || trimmedCypher === 'WITH' || trimmedCypher === '') {
                var withVariables = (results.withVariables) ? results.withVariables : [];
                var scopedBlockProvider = this.getScopedBlockProvider();
                if (scopedBlockProvider) {
                    var variableScope = scopedBlockProvider.getVariableScope();
                    
                    variableScope.clearWithVariables();
                
                    withVariables.map(withVar => variableScope.addVariable(withVar.variable, withVar));
                
                    // need to handle '*'
                    if (results.hasAsterisk) {
                        var previousScopedBlockProvider = scopedBlockProvider.getPreviousScopedBlockProvider();
                        if (previousScopedBlockProvider) {
                            var previousVariableScope = previousScopedBlockProvider.getVariableScope();
                            previousVariableScope.getVariableArray().map(scopedVar => {
                                var asteriskVar = new WithVariable({
                                    key: `asterisk_${scopedVar}`,
                                    variable: scopedVar
                                });
                                variableScope.addVariable(asteriskVar.variable, asteriskVar);
                            })
                        }
                    }
                
                    // need to handle variables passed through from parent scope
                
                    scopedBlockProvider.handleBlockUpdated({
                        cypherBlockKey: this.cypherBlockKey,
                        updateType: BlockUpdateType.WithVariablesChanged
                    });
                }
            }
        }
    }    
}