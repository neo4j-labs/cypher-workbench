
import { 
    OrderByClause,
    orderByItem,
    ORDER_DIRECTION,
    SimpleOrderByItem
} from './cypherOrderBy';

test('make order by clause', () => {
    var orderByClause = new OrderByClause();
    expect(orderByClause).not.toBeNull();
});

test('make order by clause 2', () => {
    var orderByClause = new OrderByClause();
    orderByClause.orderBy('varA')

    var orderByItems = orderByClause.getOrderByItems();
    expect(orderByItems.length).toBe(1);

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varA';
    expect(cypher).toBe(expectedCypher);
});

test('check keys', () => {
    var orderByClause = new OrderByClause();
    var orderByItem = new SimpleOrderByItem({expression: 'foo'});
    var orderByItem2 = new SimpleOrderByItem({expression: 'bar'});
    orderByClause.orderBy(orderByItem);
    orderByClause.orderBy(orderByItem2);

    expect(orderByItem.key).toBe('orderByItem_0');
    expect(orderByItem2.key).toBe('orderByItem_1');
});

test('check keys 2', () => {
    var orderByClause = new OrderByClause();
    var orderByItem = new SimpleOrderByItem({key: 'orderByItem_1', expression: 'foo'});
    var orderByItem2 = new SimpleOrderByItem({expression: 'bar'});
    orderByClause.orderBy(orderByItem);
    orderByClause.orderBy(orderByItem2);

    expect(orderByItem.key).toBe('orderByItem_1');
    expect(orderByItem2.key).toBe('orderByItem_0');
});

test('make order by clause DESC', () => {
    var orderByClause = new OrderByClause();
    var simpleOrderBy = orderByItem('varA', ORDER_DIRECTION.DESC);
    orderByClause.orderBy(simpleOrderBy)

    var orderByItems = orderByClause.getOrderByItems();
    expect(orderByItems.length).toBe(1);

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varA DESC';
    expect(cypher).toBe(expectedCypher);
});

test('rename expression', () => {
    var orderByClause = new OrderByClause();
    orderByClause
        .orderBy('varA')
        .orderBy('varB.foo')

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varA, varB.foo';
    expect(cypher).toBe(expectedCypher);

    orderByClause.renameVariable('varA', 'varC');
    orderByClause.renameVariable('varB', 'varD');

    cypher = orderByClause.toCypherString();
    // varA is not renamed because we don't have sophisticated tracing logic yet
    expectedCypher = 'ORDER BY varA, varD.foo';
    expect(cypher).toBe(expectedCypher);
});

test('rename expression with associated item', () => {
    var orderByClause = new OrderByClause();
    orderByClause
        .orderBy('varB.foo', ORDER_DIRECTION.ASC, 'node1')
        .orderBy('varB.bar', ORDER_DIRECTION.ASC, 'node2')

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    orderByClause.renameVariable('varB', 'varD', 'node1');

    cypher = orderByClause.toCypherString();
    expectedCypher = 'ORDER BY varD.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);
});

test('rename expression with associated item - varB has one associated item and one unassociated', () => {
    var orderByClause = new OrderByClause();
    orderByClause
        .orderBy('varB.foo', ORDER_DIRECTION.ASC, 'node1')
        .orderBy('varB.bar')

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    orderByClause.renameVariable('varB', 'varD', 'node1');

    cypher = orderByClause.toCypherString();
    expectedCypher = 'ORDER BY varD.foo, varD.bar';
    expect(cypher).toBe(expectedCypher);
});

test('test removeAssociatedItems', () => {
    var orderByClause = new OrderByClause();
    orderByClause
        .orderBy('varB.foo', ORDER_DIRECTION.ASC, 'node1')
        .orderBy('varB.bar', ORDER_DIRECTION.ASC, 'node2')

    var cypher = orderByClause.toCypherString();
    var expectedCypher = 'ORDER BY varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    orderByClause.removeAssociatedItems('node1');

    cypher = orderByClause.toCypherString();
    expectedCypher = 'ORDER BY varB.bar';
    expect(cypher).toBe(expectedCypher);
});

test('test getDebugCypherSnippets', () => {
    var orderByClause = new OrderByClause();
    orderByClause
        .orderBy('varB.foo', ORDER_DIRECTION.ASC, 'node1')
        .orderBy('varB.bar', ORDER_DIRECTION.ASC, 'node2')

    var snippets = orderByClause.getDebugCypherSnippets();
    expect(snippets.length).toBe(2);

    expect(snippets[0]).toBe("ORDER BY varB.foo /* , varB.bar */");
    expect(snippets[1]).toBe("ORDER BY varB.foo, varB.bar");
});
