import { Node } from 'slate';
import DataTypes from '../../../../dataModel/DataTypes';

export const getCypherStatementFromSlate = (cypherStatement) => {
      //console.log('cypherStatement: ', cypherStatement);
      if (cypherStatement && cypherStatement.map) {
        return cypherStatement
            .map(x => x.children)
            .reduce((acc,children) => acc.concat(children),[])
            .map((child,index) => {
                var text = Node.string(child);
                // slate is turning new lines into empty blocks - this will convert them back
                if (!text && index > 0) {
                    return '\n';
                } else {
                  //return text.trim();
                  return text;
                }
            })
            .join('');
    } else {
        //console.log('typeof cypherStatement: ', typeof(cypherStatement));
        //console.log('cypherStatement: ', cypherStatement);
        return '';
    }
}

export class CypherDataProvider {

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
            cypherTitle,
            cypherStatement,
            cypherBlockDataProvider,
            cypherBlockKey,
            cypherBuilder,
            graphNode,
        } = properties;

        this.graphNode = graphNode;
        this.cypherBlockDataProvider = cypherBlockDataProvider;
        this.cypherBlockKey = cypherBlockKey;
        this.cypherBuilder = cypherBuilder;
        this.cypherTitle = (cypherTitle) ? cypherTitle : 'Cypher';
        this.cypherStatement = (cypherStatement) ? cypherStatement : this.initialValue;

        this.loadDataIfPresent();
    }

    data = () => this.cypherBlockDataProvider.data();

    getDataModel = () => this.cypherBlockDataProvider.getDataModel();

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
      this.setCypherStatement(slateText, ignoreSave);
      return slateText;
    }

    setCypherStatement = (cypherStatement, ignoreSave) => {
        this.cypherStatement = cypherStatement;
        if (!ignoreSave) {
            const json = JSON.stringify(cypherStatement);
            this.graphNode.addOrUpdateProperty("cypherStatement", json, DataTypes.String);

            var cypher = this.getCypher();
            cypher = cypher.substring(0,512); // limit in case of large cypher statements
            const cypherSearchText = cypher.replace(/\W+/g, ' ');
            this.graphNode.addOrUpdateProperty("cypherStatementSearchText", cypherSearchText, DataTypes.String);
        }
    }

    setTitle = (cypherTitle, ignoreSave) => {
      this.cypherTitle = cypherTitle;
      if (!ignoreSave) {
          this.graphNode.addOrUpdateProperty("cypherTitle", cypherTitle, DataTypes.String);
      }
    }

    getCypherStatement = () => this.cypherStatement;

    getCypher = () => getCypherStatementFromSlate(this.cypherStatement);

    getTitle = () => this.cypherTitle;

    getKey = () => this.graphNode.key;

    loadDataIfPresent = () => {
        const json = this.graphNode.getPropertyValueByKey("cypherStatement", this.initialValueJson);
        const title = this.graphNode.getPropertyValueByKey("cypherTitle", "Cypher");
        this.setCypherStatement(JSON.parse(json));        
        this.setTitle(title);
    }
    
}