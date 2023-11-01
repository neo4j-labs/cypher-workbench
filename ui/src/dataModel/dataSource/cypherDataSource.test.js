
import { 
    CypherParameterDataSource,
    CypherLoadCSVDataSource,
    CypherEmbeddedData
} from './cypherDataSource'

test("CypherParameterDataSource", () => {
    var cypherParameterDataSource = new CypherParameterDataSource({
        rowVariable: 'row',
        parameterVariable: 'rows'
    });
    var expectedCypher = "WITH $rows AS rows\nUNWIND rows AS row";
    expect(cypherParameterDataSource.toCypher()).toBe(expectedCypher);
});

test("CypherLoadCSVDataSource", () => {
    var cypherLoadCSVDataSource = new CypherLoadCSVDataSource({
        rowVariable: 'row',
        fileUrl: 'file:///foo'
    });
    var expectedCypher = "LOAD CSV FROM 'file:///foo' AS row";
    expect(cypherLoadCSVDataSource.toCypher()).toBe(expectedCypher);

    cypherLoadCSVDataSource = new CypherLoadCSVDataSource({
        rowVariable: 'row',
        fileUrl: 'file:///foo',
        withHeaders: true
    });
    expectedCypher = "LOAD CSV WITH HEADERS FROM 'file:///foo' AS row";
    expect(cypherLoadCSVDataSource.toCypher()).toBe(expectedCypher);

    cypherLoadCSVDataSource = new CypherLoadCSVDataSource({
        rowVariable: 'row',
        fileUrl: 'file:///foo',
        withHeaders: true,
        usePeriodicCommit: true,
        periodicCommitInterval: 1000,
    });
    expectedCypher = "USING PERIODIC COMMIT 1000\nLOAD CSV WITH HEADERS FROM 'file:///foo' AS row";
    expect(cypherLoadCSVDataSource.toCypher()).toBe(expectedCypher);

    cypherLoadCSVDataSource = new CypherLoadCSVDataSource({
        rowVariable: 'row',
        fileUrl: 'file:///foo',
        withHeaders: true,
        usePeriodicCommit: true,
        periodicCommitInterval: 1000,
        fieldTerminator: '|'
    });
    expectedCypher = "USING PERIODIC COMMIT 1000\nLOAD CSV WITH HEADERS FROM 'file:///foo' AS row FIELDTERMINATOR '|'";
    expect(cypherLoadCSVDataSource.toCypher()).toBe(expectedCypher);
});

test("CypherEmbeddedData", () => {
    
    var embeddedData = "[{a:1, b:'foo'}, {a:2, b:'bar'}]";
    var cypherEmbeddedData = new CypherEmbeddedData({
        rowVariable: 'row',
        embeddedData,
        embeddedDataVariable: 'rows'
    });
    var expectedCypher = "WITH [{a:1, b:'foo'}, {a:2, b:'bar'}] AS rows\nUNWIND rows AS row";
    expect(cypherEmbeddedData.toCypher()).toBe(expectedCypher);
});