
import { SimpleReturnItem, 
    ReturnClause,
    parseReturnItemText
} from './cypherReturn';

test('make return clause', () => {
    var returnClause = new ReturnClause();
    expect(returnClause).not.toBeNull();
});

test('make return clause', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo')
        .item('varC', 'bar', 'baz')

    var returnItems = returnClause.getReturnItems();
    expect(returnItems.length).toBe(3);

    var cypher = returnClause.toCypherString();
    var expectedCypher = 'RETURN varA, varB.foo, varC.bar as baz';
    expect(cypher).toBe(expectedCypher);
});

test('check keys', () => {
    var returnClause = new ReturnClause({ limit: ''});
    var returnItem = new SimpleReturnItem({variable: 'foo'});
    var returnItem2 = new SimpleReturnItem({variable: 'bar'});
    returnClause.item(returnItem);
    returnClause.item(returnItem2);

    expect(returnItem.key).toBe('returnItem_0');
    expect(returnItem2.key).toBe('returnItem_1');
});

test('check keys 2', () => {
    var returnClause = new ReturnClause({ limit: ''});
    var returnItem = new SimpleReturnItem({key: 'returnItem_1', variable: 'foo'});
    var returnItem2 = new SimpleReturnItem({variable: 'bar'});
    returnClause.item(returnItem);
    returnClause.item(returnItem2);

    expect(returnItem.key).toBe('returnItem_1');
    expect(returnItem2.key).toBe('returnItem_0');
});

test('rename variable', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo')
        .item('varB', 'bar')

    var cypher = returnClause.toCypherString();
    var expectedCypher = 'RETURN varA, varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    returnClause.renameVariable('varA', 'varC');
    returnClause.renameVariable('varB', 'varD');

    cypher = returnClause.toCypherString();
    expectedCypher = 'RETURN varC, varD.foo, varD.bar';
    expect(cypher).toBe(expectedCypher);
});

test('rename variable with associated item', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo', null, 'node1')
        .item('varB', 'bar', null, 'node2')

    var cypher = returnClause.toCypherString();
    var expectedCypher = 'RETURN varA, varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    returnClause.renameVariable('varB', 'varD', 'node1');

    cypher = returnClause.toCypherString();
    expectedCypher = 'RETURN varA, varD.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);
});

test('rename variable with associated item - varB has one associated item and one unassociated', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo', null, 'node1')
        .item('varB', 'bar')

    var cypher = returnClause.toCypherString();
    var expectedCypher = 'RETURN varA, varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    returnClause.renameVariable('varB', 'varD', 'node1');

    cypher = returnClause.toCypherString();
    expectedCypher = 'RETURN varA, varD.foo, varD.bar';
    expect(cypher).toBe(expectedCypher);
});

test('test removeAssociatedItems', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo', null, 'node1')
        .item('varB', 'bar', null, 'node2')

    var cypher = returnClause.toCypherString();
    var expectedCypher = 'RETURN varA, varB.foo, varB.bar';
    expect(cypher).toBe(expectedCypher);

    returnClause.removeAssociatedItems('node1');

    cypher = returnClause.toCypherString();
    expectedCypher = 'RETURN varA, varB.bar';
    expect(cypher).toBe(expectedCypher);
});

test('test getDebugCypherSnippets', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('varA')
        .item('varB', 'foo', null, 'node1')
        .item('varB', 'bar', null, 'node2')

    var snippets = returnClause.getDebugCypherSnippets();
    expect(snippets.length).toBe(3);

    expect(snippets[0]).toBe("RETURN varA // , varB.foo, varB.bar");
    expect(snippets[1]).toBe("RETURN varA, varB.foo // , varB.bar");
    expect(snippets[2]).toBe("RETURN varA, varB.foo, varB.bar");
});

test('parse returnItemText', () => {
    var parseObj = parseReturnItemText('foo');
    expect(parseObj.variable).toBe('foo');
    expect(parseObj.propertyExpression).toBeNull();
    expect(parseObj.alias).toBeNull();

    parseObj = parseReturnItemText('foo.bar');
    expect(parseObj.variable).toBe('foo');
    expect(parseObj.propertyExpression).toBe('bar');
    expect(parseObj.alias).toBeNull();

    parseObj = parseReturnItemText('foo.bar as baz');
    expect(parseObj.variable).toBe('foo');
    expect(parseObj.propertyExpression).toBe('bar');
    expect(parseObj.alias).toBe('baz');

    parseObj = parseReturnItemText('apoc.math.round((foo.profits), 2, "HALF_UP") as rounded');
    expect(parseObj.variable).toBeNull();
    expect(parseObj.propertyExpression).toBe('apoc.math.round((foo.profits), 2, "HALF_UP")');
    expect(parseObj.alias).toBe('rounded');
});
