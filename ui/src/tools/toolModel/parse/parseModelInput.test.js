
import DataModel from '../../../dataModel/dataModel';

import { parseModelInput } from './parseModelInput';

test('test simple model input', () => {
    var cypher = 'Test';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeLabel');
    expect(response.thingsToAdd[0].nodeLabel).toBe('Test');
});

test('test simple model input with colon', () => {
    var cypher = ':Test';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeLabel');
    expect(response.thingsToAdd[0].nodeLabel).toBe('Test');
});

test('test space in node label', () => {
    var cypher = 'Graph Database';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeLabel');
    expect(response.thingsToAdd[0].nodeLabel).toBe('Graph Database');
});

test('test :start :REL :end', () => {
    var cypher = ':BBQ Pizza :HAS SAUCE :BBQ Sauce';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[0].start).toBe('BBQ Pizza');
    expect(response.thingsToAdd[0].relationship).toBe('HAS SAUCE');
    expect(response.thingsToAdd[0].end).toBe('BBQ Sauce');
});

test('test :start :REL :middle :REL :end', () => {
    var cypher = ':BBQ Pizza :HAS SAUCE :BBQ Sauce :HAS COLOR :Dark Red';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(2);
    expect(response.thingsToAdd[0].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[0].start).toBe('BBQ Pizza');
    expect(response.thingsToAdd[0].relationship).toBe('HAS SAUCE');
    expect(response.thingsToAdd[0].end).toBe('BBQ Sauce');

    expect(response.thingsToAdd[1].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[1].start).toBe('BBQ Sauce');
    expect(response.thingsToAdd[1].relationship).toBe('HAS COLOR');
    expect(response.thingsToAdd[1].end).toBe('Dark Red');
});

test('test start REL end no colons', () => {
    var cypher = 'BBQ_Pizza HAS_SAUCE BBQ_Sauce';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[0].start).toBe('BBQ_Pizza');
    expect(response.thingsToAdd[0].relationship).toBe('HAS_SAUCE');
    expect(response.thingsToAdd[0].end).toBe('BBQ_Sauce');
});

test('test start REL end no colons with spaces', () => {
    var cypher = 'Bbq Pizza HAS SAUCE Bbq Sauce';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[0].start).toBe('Bbq Pizza');
    expect(response.thingsToAdd[0].relationship).toBe('HAS SAUCE');
    expect(response.thingsToAdd[0].end).toBe('Bbq Sauce');
});

test('test A TO B', () => {
    var cypher = 'A TO B';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(true);
    expect(response.thingsToAdd.length).toBe(1);
    expect(response.thingsToAdd[0].type).toBe('NodeRelNode');
    expect(response.thingsToAdd[0].start).toBe('A');
    expect(response.thingsToAdd[0].relationship).toBe('TO');
    expect(response.thingsToAdd[0].end).toBe('B');
});

test('test start REL end no colons with spaces - bad caps', () => {
    var cypher = 'BBQ Pizza HAS SAUCE BBQ Sauce';
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.success).toBe(false);
    expect(response.thingsToAdd.length).toBe(0);
    expect(response.message).toBe('Expected NodeLabel RELATIONSHIP NodeLabel')
});

test('test parse node pattern with properties', () => {
    var cypher = ":Test {x:1, y:'foo'}";
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.cypherParse).toBe(true);
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

test('test parse node pattern with properties - no leading colon', () => {
    var cypher = "Test {x:1, y:'foo'}";
    var dataModel = new DataModel();

    var response = parseModelInput(cypher, dataModel);
    expect(response.cypherParse).toBe(true);
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
