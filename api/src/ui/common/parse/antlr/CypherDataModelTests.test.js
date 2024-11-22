//import antlr4 from 'antlr4/src/antlr4/index';
//const antlr4 = require('antlr4/src/antlr4/index');
import antlr4 from 'antlr4';

import DataModel from '../../../dataModel/dataModel';

import {
    getNodeLabels,
    verifyNodeLabelProperties,
    verifyProperty
} from '../../test/testHelper';

import CypherLexer from './CypherLexer';
import CypherParser from './CypherParser';
import CypherStatementBuilderListener from './CypherStatementBuilderListener';
import CypherStatement from './CypherStatement';


function parseStatement (cypherToParse) {
    var statement;
    if (cypherToParse) {
        var chars = new antlr4.InputStream(cypherToParse);
        var lexer = new CypherLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new CypherParser(tokens);
        var tree = parser.oC_Cypher();

        var builder = new CypherStatementBuilderListener();
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);

        statement = builder.getCypherStatement();
    }
    return statement;
}

function getDataModelWithNodeLabels (nodeLabelStrings) {
    var dataModel = DataModel();
    nodeLabelStrings.map(str => {
        var nodeLabel = new dataModel.NodeLabel({
            label: str
        });
        dataModel.addNodeLabel(nodeLabel);
    })
    return dataModel;
}

test('test get NodeLabel from cypher', () => {
    var cypher = 'MATCH (n:Test) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel).not.toBeNull();
    expect(nodeLabel.label).toBe('Test');
});

test('test get two NodeLabels from cypher', () => {
    var cypher = 'MATCH (n:Foo:Bar) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Foo');
    expect(nodeLabel1.isOnlySecondaryNodeLabel).toBe(false);
    expect(nodeLabel1.secondaryNodeLabelKeys.length).toBe(1);

    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel2.label).toBe('Bar');
    expect(nodeLabel2.isOnlySecondaryNodeLabel).toBe(true);
    expect(nodeLabel2.secondaryNodeLabelKeys.length).toBe(0);

    expect(dataModel.getNodeLabelByKey(nodeLabel1.secondaryNodeLabelKeys[0])).toBe(nodeLabel2);
});

test('two NodeLabels from two different cypher statements', () => {
    var dataModel = DataModel();

    var cypher1 = 'MATCH (n:Foo:Bar) RETURN n';
    var cypher2 = 'MATCH (n:Bar:Baz) RETURN n';

    var statement1 = parseStatement(cypher1);
    var statement2 = parseStatement(cypher2);

    statement1.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});
    statement2.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(3);

    var nodeLabel1 = nodeLabelArray[0];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Foo');
    expect(nodeLabel1.isOnlySecondaryNodeLabel).toBe(false);
    expect(nodeLabel1.secondaryNodeLabelKeys.length).toBe(1);

    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel2.label).toBe('Bar');
    expect(nodeLabel2.isOnlySecondaryNodeLabel).toBe(false);
    expect(nodeLabel2.secondaryNodeLabelKeys.length).toBe(1);

    expect(dataModel.getNodeLabelByKey(nodeLabel1.secondaryNodeLabelKeys[0])).toBe(nodeLabel2);

    var nodeLabel3 = nodeLabelArray[2];
    expect(nodeLabel3.label).toBe('Baz');
    expect(nodeLabel3.isOnlySecondaryNodeLabel).toBe(true);
    expect(nodeLabel3.secondaryNodeLabelKeys.length).toBe(0);

    expect(dataModel.getNodeLabelByKey(nodeLabel2.secondaryNodeLabelKeys[0])).toBe(nodeLabel3);

});


test('test back ticks', () => {
    var cypher = 'MATCH (n:`Test`) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel).not.toBeNull();
    expect(nodeLabel.label).toBe('Test');
});

test('test back ticks with space', () => {
    var cypher = 'MATCH (n:`Test Space`) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel).not.toBeNull();
    expect(nodeLabel.label).toBe('Test Space');
});

test('test get RelationshipType from cypher', () => {
    var cypher = 'MATCH (n:Test1)-[:TEST_REL]->(m:Test2) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Test1');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('Test2');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('TEST_REL');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Test1');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Test2');
});

test('test get multiple RelationshipTypes from cypher', () => {
    var cypher = 'MATCH (n:Test1)-[:TEST_REL1|TEST_REL2]->(m:Test2) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Test1');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('Test2');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(2);
    expect(relationshipTypes[0].type).toBe('TEST_REL1');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Test1');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Test2');

    expect(relationshipTypes[1].type).toBe('TEST_REL2');
    expect(relationshipTypes[1].startNodeLabel.label).toBe('Test1');
    expect(relationshipTypes[1].endNodeLabel.label).toBe('Test2');
});

test('test blank RelationshipType from cypher', () => {
    var cypher = 'MATCH (n:Test1)-->(m:Test2) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Test1');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('Test2');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('ANON');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Test1');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Test2');
});

test('test blank RelationshipType from cypher - reverse', () => {
    //console.log('reverse');
    var cypher = 'MATCH (n:Test1)<--(m:Test2) RETURN n';
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Test1');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('Test2');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('ANON');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Test2');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Test1');
});

test('test get properties from nodeLabel', () => {
    var cypher = "MATCH (n:Test {name:'Jim', age: 50}) RETURN n";
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    var testNodeLabel = nodeLabelArray[0];
    expect(testNodeLabel.label).toBe('Test');

    expect(Object.values(testNodeLabel.properties).length).toBe(2);
    var property1 = Object.values(testNodeLabel.properties)[0];
    var property2 = Object.values(testNodeLabel.properties)[1];
    expect(property1.name).toBe('name');
    expect(property1.datatype).toBe(dataModel.DataTypes.String);
    expect(property1.referenceData).toBe('Jim');
    expect(property1.isPartOfKey).not.toBe(true);

    expect(property2.name).toBe('age');
    expect(property2.datatype).toBe(dataModel.DataTypes.Integer);
    expect(property2.referenceData).toBe('50');
    expect(property2.isPartOfKey).not.toBe(true);
});

test('test get properties from nodeLabel - duplicate property name', () => {
    var cypher = "MATCH (n:Test {name:'Jim', name: 'Joe'}) RETURN n";
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    var testNodeLabel = nodeLabelArray[0];
    expect(testNodeLabel.label).toBe('Test');

    expect(Object.values(testNodeLabel.properties).length).toBe(1);
    var property1 = Object.values(testNodeLabel.properties)[0];
    expect(property1.name).toBe('name');
    expect(property1.datatype).toBe(dataModel.DataTypes.String);
    expect(property1.referenceData).toBe('Joe');
    expect(property1.isPartOfKey).not.toBe(true);
});

test('test key properties in nodeLabel', () => {
    var cypher = "MERGE (n:Test {name:'Jim', age: 50}) RETURN n";
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    var testNodeLabel = nodeLabelArray[0];
    expect(testNodeLabel.label).toBe('Test');

    expect(Object.values(testNodeLabel.properties).length).toBe(2);
    var property1 = Object.values(testNodeLabel.properties)[0];
    var property2 = Object.values(testNodeLabel.properties)[1];
    expect(property1.name).toBe('name');
    expect(property1.datatype).toBe(dataModel.DataTypes.String);
    expect(property1.referenceData).toBe('Jim');
    expect(property1.isPartOfKey).toBe(true);

    expect(property2.name).toBe('age');
    expect(property2.datatype).toBe(dataModel.DataTypes.Integer);
    expect(property2.referenceData).toBe('50');
    expect(property2.isPartOfKey).toBe(true);
});

test('test get properties from relationshipType', () => {
    var cypher = "MATCH (n:Test1)-[:TEST_REL {name:'Jim', age: 50}]->(m:Test2) RETURN n";
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    var testRelationshipType = relationshipTypes[0];
    expect(testRelationshipType.type).toBe('TEST_REL');

    expect(Object.values(testRelationshipType.properties).length).toBe(2);
    var property1 = Object.values(testRelationshipType.properties)[0];
    var property2 = Object.values(testRelationshipType.properties)[1];
    expect(property1.name).toBe('name');
    expect(property1.datatype).toBe(dataModel.DataTypes.String);
    expect(property1.referenceData).toBe('Jim');
    expect(property1.isPartOfKey).not.toBe(true);

    expect(property2.name).toBe('age');
    expect(property2.datatype).toBe(dataModel.DataTypes.Integer);
    expect(property2.referenceData).toBe('50');
    expect(property2.isPartOfKey).not.toBe(true);
});

function verifyKeanuModel (dataModel, isPartOfKey) {
    // confirm node labels
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(getNodeLabels(dataModel)).toStrictEqual(['Person','Movie']);

    // confirm relationships
    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('ACTED_IN');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Person');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('Movie');

    // confirm properties
    var nodeLabel1 = nodeLabelArray[0];
    expect(Object.values(nodeLabel1.properties).length).toBe(2);
    var property1 = Object.values(nodeLabel1.properties)[0];
    var property2 = Object.values(nodeLabel1.properties)[1];

    verifyProperty (property1, 'name', dataModel.DataTypes.String, 'Keanu Reeves', isPartOfKey);
    verifyProperty (property2, 'born', dataModel.DataTypes.Integer, '1964', isPartOfKey);

    var nodeLabel2 = nodeLabelArray[1];
    expect(Object.values(nodeLabel2.properties).length).toBe(3);
    property1 = Object.values(nodeLabel2.properties)[0];
    property2 = Object.values(nodeLabel2.properties)[1];
    var property3 = Object.values(nodeLabel2.properties)[2];

    verifyProperty (property1, 'title', dataModel.DataTypes.String, 'Johnny Mnemonic', isPartOfKey);
    verifyProperty (property2, 'released', dataModel.DataTypes.Integer, '1995', isPartOfKey);
    verifyProperty (property3, 'tagline', dataModel.DataTypes.String, 'The hottest data on earth. In the coolest head in town', isPartOfKey);

    var testRelationshipType = relationshipTypes[0];
    expect(Object.values(testRelationshipType.properties).length).toBe(1);
    var property1 = Object.values(testRelationshipType.properties)[0];
    expect(property1.name).toBe('roles');
    expect(property1.datatype).toBe(dataModel.DataTypes.String);
    expect(property1.referenceData).toBe("['Johnny Mnemonic']");
    expect(property1.isPartOfKey).not.toBe(true);
}

test('creates a more complex data model using CREATE', () => {
    var cypher = `
        CREATE (Keanu:Person {name:'Keanu Reeves', born:1964})
        CREATE (TheMatrix:Movie {title:'The Matrix', released:1999, tagline:'Welcome to the Real World'})
        CREATE (JohnnyMnemonic:Movie {title:'Johnny Mnemonic', released:1995, tagline:'The hottest data on earth. In the coolest head in town'})
        CREATE (Keanu)-[:ACTED_IN {roles:['Neo']}]->(TheMatrix)
        CREATE (Keanu)-[:ACTED_IN {roles:['Johnny Mnemonic']}]->(JohnnyMnemonic)
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    verifyKeanuModel(dataModel, false);
});

test('creates a more complex data model using MERGE', () => {
    var cypher = `
        MERGE (Keanu:Person {name:'Keanu Reeves', born:1964})
        MERGE (TheMatrix:Movie {title:'The Matrix', released:1999, tagline:'Welcome to the Real World'})
        MERGE (JohnnyMnemonic:Movie {title:'Johnny Mnemonic', released:1995, tagline:'The hottest data on earth. In the coolest head in town'})
        MERGE (Keanu)-[:ACTED_IN {roles:['Neo']}]->(TheMatrix)
        MERGE (Keanu)-[:ACTED_IN {roles:['Johnny Mnemonic']}]->(JohnnyMnemonic)
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    verifyKeanuModel(dataModel, true);
});

test('test apoc.load.json with ON CREATE SET', () => {
    var cypher = `
        WITH "https://api.stackexchange.com/2.2/questions?pagesize=100&order=desc&sort=creation&tagged=neo4j&site=stackoverflow&filter=!5-i6Zw8Y)4W7vpy91PMYsKM-k9yzEsSC1_Uxlf" AS url
        CALL apoc.load.json(url) YIELD value
        UNWIND value.items AS q
        MERGE (question:Scenario {id:q.question_id}) ON CREATE
          SET question.title = q.title, question.share_link = q.share_link, question.favorite_count = q.favorite_count

        FOREACH (tagName IN q.tags | MERGE (tag:Tag {name:tagName}) MERGE (question)-[:TAGGED]->(tag))
        FOREACH (a IN q.answers |
           MERGE (question)<-[:ANSWERS]-(answer:Answer {id:a.answer_id})
           MERGE (answerer:User {id:a.owner.user_id}) ON CREATE SET answerer.display_name = a.owner.display_name
           MERGE (answer)<-[:PROVIDED]-(answerer)
        )
        WITH * WHERE NOT q.owner.user_id IS NULL
        MERGE (owner:User {id:q.owner.user_id}) ON CREATE SET owner.display_name = q.owner.display_name
        MERGE (owner)-[:ASKED]->(question)
    `

    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(getNodeLabels(dataModel)).toStrictEqual(['Scenario','Tag','Answer','User','Anon']);

    verifyNodeLabelProperties(dataModel,'Scenario', {
        id: 'q.question_id',
        title: 'q.title',
        share_link: 'q.share_link',
        favorite_count: 'q.favorite_count'
    });
    verifyNodeLabelProperties(dataModel,'Tag', { name: 'tagName' });
    verifyNodeLabelProperties(dataModel,'Answer', { id: 'a.answer_id' });
    verifyNodeLabelProperties(dataModel,'User', {
        id: 'q.owner.user_id',
        display_name: 'q.owner.display_name'
    });
});

test('test findNodeLabelByVariable', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var config = {
        labelVariableMap: {
             test: 'Test'
         }
    };
    var nodeLabel = CypherStatement.findNodeLabelStringByVariable (dataModel, config, 'test');
    expect(nodeLabel).toBe('Test');
});

test('test findNodeLabelByVariable - 2 levels', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var config = {
        variableMapStack: [
            {
                 test: 'Test'
            }
        ],
        labelVariableMap: {
             a: 'test'
         }
    };
    var nodeLabel = CypherStatement.findNodeLabelStringByVariable (dataModel, config, 'a');
    expect(nodeLabel).toBe('Test');
});

test('test findNodeLabelByVariable - 3 levels', () => {
    var dataModel = getDataModelWithNodeLabels(['Test']);
    var config = {
        variableMapStack: [
            {
                test: 'Test'
            },
            {
                a: 'test'
            }
        ],
        labelVariableMap: {
             foo: 'a'
         }
    };
    var nodeLabel = CypherStatement.findNodeLabelStringByVariable (dataModel, config, 'foo');
    expect(nodeLabel).toBe('Test');
});

test('test simple WITH', () => {
    //console.log('test simple WITH');
    var cypher = `
        MATCH (n:Test)
        WITH n as m
        SET m.prop = 'Hello'
        RETURN m
    `;
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    expect(getNodeLabels(dataModel)).toStrictEqual(['Test']);
    verifyNodeLabelProperties(dataModel,'Test', { prop: 'Hello' });
});

test('test return var', () => {
    var cypher = `
        MATCH (nl:NodeLabel)
        RETURN nl.label
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    expect(getNodeLabels(dataModel)).toStrictEqual(['NodeLabel']);
    var property1 = Object.values(dataModel.getNodeLabelArray()[0].properties)[0];
    verifyProperty (property1, 'label', dataModel.DataTypes.String, null, false);
});

test('test return var including with', () => {
    var cypher = `
        MATCH (nl:NodeLabel)
        WITH nl as nl2
        RETURN nl2.label
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    expect(getNodeLabels(dataModel)).toStrictEqual(['NodeLabel']);
    var property1 = Object.values(dataModel.getNodeLabelArray()[0].properties)[0];
    verifyProperty (property1, 'label', dataModel.DataTypes.String, null, false);
});

test('test return with map', () => {
    console.log('** START test return with map ** ');
    var cypher = `
        MATCH (nl:NodeLabel)
        WITH {nlKey: nl} as nlMap
        RETURN nlMap.nlKey.label
    `
    var statement = parseStatement(cypher);
    //console.log(JSON.stringify(statement));
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    expect(getNodeLabels(dataModel)).toStrictEqual(['NodeLabel']);
    var property1 = Object.values(dataModel.getNodeLabelArray()[0].properties)[0];
    //verifyProperty (property1, 'label', dataModel.DataTypes.String, null, false);
    console.log('** STOP test return with map ** ');
});

/*
test('test collect', () => {
    var cypher = `
        MATCH (nl:NodeLabel)
        WITH collect(nl) as nodeLabels
        UNWIND nodeLabels as nodeLabel
        RETURN nodeLabel.label
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});

    expect(getNodeLabels(dataModel)).toStrictEqual(['NodeLabel']);
    var property1 = Object.values(dataModel.getNodeLabelArray()[0].properties)[0];
    verifyProperty (property1, 'label', dataModel.DataTypes.String, null, false);
});
*/

/*
test('complicated situation', () => {
    var cypher = `
        MATCH (nl:NodeLabel)-[r:HAS_PROPERTY]->(p:PropertyDefinition)
        WITH collect({nodeLabel:nl, propDef:p, rel:r}) as nodeLabelProps, nl.label as label
        WITH label, extract(x IN nodeLabelProps | x.propDef.name) as propNames
        RETURN label, propNames
    `
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});
});
*/

test ('Test complex merge statement', () => {
    var cypher = `MERGE (m:Movie {releaseDate: '1999', title:'The Matrix'})-[:ABOUT]->(:Character {name: 'Neo'})<-[:PLAYED_BY]-(p:Person {name:'Keanu'});`
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});
});

test ('Test sub-query', () => {
    var cypher = `
    MATCH (dm:DataModel) 
    CALL {
      WITH dm
      MATCH (dm)-[:HAS_METADATA]->(meta:DataModelMetadata)
      RETURN meta
    }
    RETURN dm.key, meta.title
    LIMIT 10
    `;
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true})
    expect(dataModel.getNodeLabelArray().length).toBe(2);
    //dataModel.getNodeLabelArray().map(x => console.log(x.label));
});

test ('Test multiple subqueries', () => {
    var cypher = `
    MATCH (dm:DataModel) 
    CALL {
      WITH dm
      MATCH (dm)-[:HAS_METADATA]->(meta:DataModelMetadata)
      RETURN meta
    }
    CALL {
        WITH dm
        MATCH (dm)-[:HAS_NODE_LABEL]->(nl:NodeLabel)
        RETURN count(nl) as numNodeLabels
    }
    RETURN dm.key, meta.title, numNodeLabels
    LIMIT 10
    `;
    var statement = parseStatement(cypher);
    var dataModel = DataModel();
    statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true})
    //dataModel.getNodeLabelArray().map(x => console.log(x.label));
    //console.log(statement.toString());
    //console.log(statement.regularQuery.singleQuery.singlePartQuery);
    expect(dataModel.getNodeLabelArray().length).toBe(3);
});
