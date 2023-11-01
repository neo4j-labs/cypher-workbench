import DataModel from '../../dataModel/dataModel';

import {
    parseCypherPattern,
    parseStatement
} from './parseCypher';

test('test parse node pattern', () => {
    var cypher = ':Test';
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel.label).toBe('Test');
});

test('test parse node pattern with properties', () => {
    var cypher = ":Test {x:1, y:'foo'}";
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var testNodeLabel = nodeLabelArray[0];
    expect(testNodeLabel.label).toBe('Test');

    expect(Object.values(testNodeLabel.properties).length).toBe(2);
    var property1 = Object.values(testNodeLabel.properties)[0];
    var property2 = Object.values(testNodeLabel.properties)[1];
    expect(property1.name).toBe('x');
    expect(property1.datatype).toBe(dataModel.DataTypes.Integer);
    expect(property1.referenceData).toBe('1');
    expect(property1.isPartOfKey).not.toBe(true);

    expect(property2.name).toBe('y');
    expect(property2.datatype).toBe(dataModel.DataTypes.String);
    expect(property2.referenceData).toBe('foo');
    expect(property2.isPartOfKey).not.toBe(true);
});

test('test parse pattern', () => {
    var cypher = '(n:Test)';
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(1);
    var nodeLabel = nodeLabelArray[0];
    expect(nodeLabel.label).toBe('Test');
});

test('test start rel end', () => {
    var cypher = '(n:Start)-[:REL]->(m:End)';
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Start');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('End');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('REL');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Start');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('End');
});

test('test parse start rel end 2', () => {
    var cypher = '(n:Start)-[:REL]-(m:End)';
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Start');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('End');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('REL');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Start');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('End');
});

test('test start -- end', () => {
    var cypher = '(n:Start)-->(m:End)';
    var dataModel = new DataModel();

    var pattern = parseCypherPattern(cypher, dataModel);
    var nodeLabelArray = dataModel.getNodeLabelArray();
    expect(nodeLabelArray.length).toBe(2);
    var nodeLabel1 = nodeLabelArray[0];
    var nodeLabel2 = nodeLabelArray[1];
    expect(nodeLabel1).not.toBeNull();
    expect(nodeLabel1.label).toBe('Start');

    expect(nodeLabel2).not.toBeNull();
    expect(nodeLabel2.label).toBe('End');

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(1);
    expect(relationshipTypes[0].type).toBe('ANON');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('Start');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('End');
});

test("parse nested apoc calls", () => {

    var cypher = `
        MATCH (n:Product)
        RETURN id(n), n.productId, n.productName, 
            apoc.text.join(apoc.convert.toStringList(n.embedding),',') AS embeddingValueList
    `;

    try {
        var statement = parseStatement(cypher);
        expect(true).toBe(true);
    } catch (e) {
        // parse error
        console.log(e);
        expect(false).toBe(true);
    }
});