
import { 
    whereItem,
    SimpleWhereItem, 
    WhereClause
} from './cypherWhere';

test('make where clause', () => {
    var whereClause = new WhereClause();
    expect(whereClause).not.toBeNull();
});

test('make nested clause', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'")
    var whereItem2 = whereItem('n.y','=',"'bar'")
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var whereItems = whereClause.getWhereItems();
    expect(whereItems.length).toBe(3);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE n.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);
});

test('make deeper nested clause', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'")
    var whereItem2 = whereItem('n.y','=',"'bar'")
    var whereItem3 = whereItem('n.z','=',"'baz'")

    whereClause
        .token('(')
        .item(whereItem1)
        .token('AND')
        .item(whereItem2)
        .token(')')
        .token('OR')
        .item(whereItem3);

    var whereItems = whereClause.getWhereItems();
    expect(whereItems.length).toBe(7);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE (n.x = 'foo' AND n.y = 'bar') OR n.z = 'baz'";
    expect(cypher).toBe(expectedCypher);

    expect(whereClause.usedKeys.length).toBe(7);
    expect(whereItem1.key).toBe('whereItem_1');
    expect(whereItem2.key).toBe('whereItem_3');  
    expect(whereItem3.key).toBe('whereItem_6');  
});

test('where IS NULL', () => {
    var whereClause = new WhereClause();
    whereClause
        .item('n.x','IS NULL');

    var whereItems = whereClause.getWhereItems();
    expect(whereItems.length).toBe(1);

    var cypher = whereClause.toCypherString();
    var expectedCypher = 'WHERE n.x IS NULL';
    expect(cypher).toBe(expectedCypher);
});

test('where NOT', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'");
    whereClause
        .token('NOT')
        .item(whereItem1);

    var whereItems = whereClause.getWhereItems();
    expect(whereItems.length).toBe(2);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE NOT n.x = 'foo'";
    expect(cypher).toBe(expectedCypher);
});

test('check keys', () => {
    var whereClause = new WhereClause();
    var whereItem = new SimpleWhereItem({leftHandSide: 'foo'});
    var whereItem2 = new SimpleWhereItem({leftHandSide: 'bar'});
    whereClause.item(whereItem);
    whereClause.item(whereItem2);

    expect(whereItem.key).toBe('whereItem_0');
    expect(whereItem2.key).toBe('whereItem_1');
});

test('check keys 2', () => {
    var whereClause = new WhereClause();
    var whereItem = new SimpleWhereItem({key: 'whereItem_1', leftHandSide: 'foo'});
    var whereItem2 = new SimpleWhereItem({leftHandSide: 'bar'});
    whereClause.item(whereItem);
    whereClause.item(whereItem2);

    expect(whereItem.key).toBe('whereItem_1');
    expect(whereItem2.key).toBe('whereItem_0');
});

test('rename variable', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'")
    var whereItem2 = whereItem('n.y','=',"'bar'")
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE n.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);

    whereClause.renameVariable('n','node');
    cypher = whereClause.toCypherString();
    expectedCypher = "WHERE node.x = 'foo' AND node.y = 'bar'";
    expect(cypher).toBe(expectedCypher);
});

test('rename variable with associated item', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('n.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE n.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);

    whereClause.renameVariable('n','node','node1');
    cypher = whereClause.toCypherString();
    expectedCypher = "WHERE node.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);
});

test('rename variable with associated item - one associated and one not associated', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('n.y','=',"'bar'");
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE n.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);

    whereClause.renameVariable('n','node','node1');
    cypher = whereClause.toCypherString();
    expectedCypher = "WHERE node.x = 'foo' AND node.y = 'bar'";
    expect(cypher).toBe(expectedCypher);
});

test('test removeAssociatedWhereItems', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('n.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var cypher = whereClause.toCypherString();
    var expectedCypher = "WHERE n.x = 'foo' AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);

    whereClause.removeAssociatedWhereItems('node1');
    cypher = whereClause.toCypherString();
    expectedCypher = "WHERE  AND n.y = 'bar'";
    expect(cypher).toBe(expectedCypher);
});

test('test getDebugCypherSnippets', () => {
    var whereClause = new WhereClause();
    var whereItem1 = whereItem('n.x','=',"'foo'",'node1');
    var whereItem2 = whereItem('n.y','=',"'bar'",'node2');
    whereClause
        .item(whereItem1)
        .token('AND')
        .item(whereItem2);

    var snippets = whereClause.getDebugCypherSnippets();
    expect(snippets.length).toBe(2);

    expect(snippets[0]).toBe("WHERE n.x = 'foo' //  AND n.y = 'bar'");
    expect(snippets[1]).toBe("WHERE n.x = 'foo' AND n.y = 'bar'");
});
