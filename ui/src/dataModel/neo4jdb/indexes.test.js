
import { 
    processDbIndexesRow,
    processDbIndexesResult
} from './indexes';

test("test 4.x - composite index", () => {
    var row = {
        name: "pizza_index",
        uniqueness: "NONUNIQUE",
        type: "BTREE",
        labelsOrTypes: ["Pizza"],
        properties: ["cheese", "sauce"]
    }
    var dataModel = processDbIndexesRow(row);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(2);
    const prop1 = Object.values(node.properties)[0];
    const prop2 = Object.values(node.properties)[1];
    expect(prop1.name).toBe('cheese');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(false);    // when it's a composite index, this flag isn't set
    expect(prop2.name).toBe('sauce');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isIndexed).toBe(false);

    var indexes = node.getIndexes();
    expect(indexes.length).toBe(1);
    expect(indexes[0].indexName).toBe('pizza_index');
    expect(indexes[0].propertyDefinitionKeys.length).toBe(2);
    expect(indexes[0].propertyDefinitionKeys[0]).toBe('cheese');
    expect(indexes[0].propertyDefinitionKeys[1]).toBe('sauce');
});

test("test 4.x - single index", () => {
    var row = {
        name: "pizza_index",
        uniqueness: "NONUNIQUE",
        type: "BTREE",
        labelsOrTypes: ["Pizza"],
        properties: ["cheese"]
    }
    var dataModel = processDbIndexesRow(row);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('cheese');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(true);

    var indexes = node.getIndexes();
    expect(indexes.length).toBe(0);
});

test("test 4.x - ignore UNIQUE index (covered by constraints)", () => {
    var row = {
        name: "pizza_index",
        uniqueness: "UNIQUE",
        type: "BTREE",
        labelsOrTypes: ["Pizza"],
        properties: ["cheese"]
    }
    var dataModel = processDbIndexesRow(row);
    expect(dataModel).toBe(null);
});

test("test 4.x - ignore FULLTEXT index (not covered)", () => {
    var row = {
        name: "pizza_index",
        uniqueness: "NONUNIQUE",
        type: "FULLTEXT",
        labelsOrTypes: ["Pizza"],
        properties: ["cheese","sauce"]
    }
    var dataModel = processDbIndexesRow(row);
    expect(dataModel).toBe(null);
});

test("test 3.x - single index", () => {
    var row = {
        indexName: "pizza_index",
        type: "node_label_property",
        tokenNames: ["Pizza"],
        properties: ["cheese"]
    }
    var dataModel = processDbIndexesRow(row);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(1);
    const prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('cheese');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(true);

    var indexes = node.getIndexes();
    expect(indexes.length).toBe(0);    
});

test("test 3.x - composite index", () => {
    var row = {
        indexName: "pizza_index",
        type: "node_label_property",
        tokenNames: ["Pizza"],
        properties: ["cheese","sauce"]
    }
    var dataModel = processDbIndexesRow(row);

    const nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    const node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(2);
    const prop1 = Object.values(node.properties)[0];
    const prop2 = Object.values(node.properties)[1];
    expect(prop1.name).toBe('cheese');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(false);    // when it's a composite index, this flag isn't set
    expect(prop2.name).toBe('sauce');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isIndexed).toBe(false);

    var indexes = node.getIndexes();
    expect(indexes.length).toBe(1);
    expect(indexes[0].indexName).toBe('pizza_index');
    expect(indexes[0].propertyDefinitionKeys.length).toBe(2);
    expect(indexes[0].propertyDefinitionKeys[0]).toBe('cheese');
    expect(indexes[0].propertyDefinitionKeys[1]).toBe('sauce');

});

test("test 3.x - ignore node_unique_property (covered by constraints)", () => {
    var row = {
        indexName: "pizza_index",
        type: "node_unique_property",
        tokenNames: ["Pizza"],
        properties: ["cheese"]
    }
    var dataModel = processDbIndexesRow(row);
    expect(dataModel).toBe(null);
});

test("test multiple rows", () => {
    var rows = [{
        name: "pizza_index",
        uniqueness: "NONUNIQUE",
        type: "BTREE",
        labelsOrTypes: ["Pizza"],
        properties: ["cheese", "sauce"]
    },
    {
        name: "pizza_index2",
        uniqueness: "NONUNIQUE",
        type: "BTREE",
        labelsOrTypes: ["Pizza"],
        properties: ["crust"]
    }]
    var dataModels = processDbIndexesResult(rows);
    expect(dataModels.length).toBe(2);

    var dataModel = dataModels[0];

    // verify first data model
    var nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    var node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(2);
    var prop1 = Object.values(node.properties)[0];
    var prop2 = Object.values(node.properties)[1];
    expect(prop1.name).toBe('cheese');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(false);    // when it's a composite index, this flag isn't set
    expect(prop2.name).toBe('sauce');
    expect(prop2.datatype).toBe('String');
    expect(prop2.isIndexed).toBe(false);

    var indexes = node.getIndexes();
    expect(indexes.length).toBe(1);
    expect(indexes[0].indexName).toBe('pizza_index');
    expect(indexes[0].propertyDefinitionKeys.length).toBe(2);
    expect(indexes[0].propertyDefinitionKeys[0]).toBe('cheese');
    expect(indexes[0].propertyDefinitionKeys[1]).toBe('sauce');

    // verify second data model
    dataModel = dataModels[1];
    nodes = dataModel.getNodeLabelArray();

    expect(nodes.length).toBe(1);
    node = nodes[0];
    expect(node.label).toBe('Pizza');

    expect(Object.values(node.properties).length).toBe(1);
    prop1 = Object.values(node.properties)[0];
    expect(prop1.name).toBe('crust');
    expect(prop1.datatype).toBe('String');
    expect(prop1.isIndexed).toBe(true);

    indexes = node.getIndexes();
    expect(indexes.length).toBe(0);

})