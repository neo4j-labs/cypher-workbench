
import { getExportPayload } from './exportResults';

const trimCypher = (cypher) => {
    var trimmedCypher = cypher.split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .join(' ');
    return trimmedCypher;
}

test("getExportPayload - simple query", () => {
    var cypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) 
        WHERE toLower(metadata.title) CONTAINS 'foo'
        RETURN model.key, metadata.title
    `;
    
    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) WHERE toLower(metadata.title) CONTAINS 'foo' RETURN model.key as model_key, metadata.title as metadata_title
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);

    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(2);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('model_key');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('metadata_title');
    expect(exportPayload.queryInfo.outputFields[1].type).toBe('String');

});

test("hoptype without alias", () => {
    var cypher = `
        MATCH (n:Client) 
        WITH n.id as clientId, n.new as new, n.name as name
        RETURN clientId, new_hoptype_Boolean, name 
        LIMIT 100
    `;

    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
        MATCH (n:Client) 
        WITH n.id as clientId, n.new as new, n.name as name
        RETURN clientId as clientId, new as new, name as name
        LIMIT 100
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);
    
    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(3);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('clientId');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('new');
    expect(exportPayload.queryInfo.outputFields[1].type).toBe('Boolean');
    expect(exportPayload.queryInfo.outputFields[2].name).toBe('name');
    expect(exportPayload.queryInfo.outputFields[2].type).toBe('String');

});

test("variable.property hoptype", () => {
    var cypher = `
        MATCH (n:Client) 
        RETURN n.id as clientId, n.new_hoptype_Boolean, n.name 
        LIMIT 100
    `;

    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
        MATCH (n:Client) 
        RETURN n.id as clientId, n.new as n_new, n.name as n_name
        LIMIT 100
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);
    
    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(3);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('clientId');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('n_new');
    expect(exportPayload.queryInfo.outputFields[1].type).toBe('Boolean');
    expect(exportPayload.queryInfo.outputFields[2].name).toBe('n_name');
    expect(exportPayload.queryInfo.outputFields[2].type).toBe('String');

});

test("getExportPayload - simple query - check order by", () => {
    var cypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) 
        WHERE toLower(metadata.title) CONTAINS 'foo'
        RETURN model.key, metadata.title
        ORDER BY model.key, metadata.title DESC
        LIMIT 10
    `;
    
    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) 
        WHERE toLower(metadata.title) CONTAINS 'foo'
        RETURN model.key as model_key, metadata.title as metadata_title
        ORDER BY model_key, metadata_title DESC
        LIMIT 10
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);
    
    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(2);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('model_key');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('metadata_title');
    expect(exportPayload.queryInfo.outputFields[1].type).toBe('String');

});

test("getExportPayload - simple query - check datatype", () => {
    var cypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) 
        WHERE toLower(metadata.title) CONTAINS 'foo'
        RETURN model.key, metadata.title as title, model.isPublic as isPublic_hoptype_Boolean
    `;
    
    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
        MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata) 
        WHERE toLower(metadata.title) CONTAINS 'foo'
        RETURN model.key as model_key, metadata.title as title, model.isPublic as isPublic
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);
    
    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(3);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('model_key');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('title');
    expect(exportPayload.queryInfo.outputFields[1].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[2].name).toBe('isPublic');
    expect(exportPayload.queryInfo.outputFields[2].type).toBe('Boolean');

});

test ('data science query', () => {
    var cypher = `
    CALL gds.graph.streamRelationshipProperties(
        'PersonInteracts',                      
        ['weight'],                        
        ['INTERACTS']                                     
      )
      YIELD
        sourceNodeId, targetNodeId, relationshipType, relationshipProperty, propertyValue
      RETURN
        gds.util.asNode(sourceNodeId).name as source, gds.util.asNode(targetNodeId).name as target, relationshipType, relationshipProperty, propertyValue
      ORDER BY source ASC, target ASC    
    `

    const exportPayload = getExportPayload({
        cypherQuery: cypher, 
        neoConnectionInfo: {}, 
        bigQueryExportInfo: {}
    });

    var expectedCypher = `
    CALL gds.graph.streamRelationshipProperties('PersonInteracts', ['weight'], ['INTERACTS']) YIELD sourceNodeId, targetNodeId, relationshipType, relationshipProperty, propertyValue
      RETURN gds.util.asNode(sourceNodeId).name as source, gds.util.asNode(targetNodeId).name as target, relationshipType as relationshipType, relationshipProperty as relationshipProperty, propertyValue as propertyValue
      ORDER BY source, target    
    `;

    //console.log('exportPayload: ', exportPayload);
    //console.log('exportPayload.queryInfo.outputFields: ', exportPayload.queryInfo.outputFields);
    
    expect(exportPayload.queryInfo.cypher).toBe(trimCypher(expectedCypher));
    expect(exportPayload.queryInfo.outputFields.length).toBe(5);
    expect(exportPayload.queryInfo.outputFields[0].name).toBe('source');
    expect(exportPayload.queryInfo.outputFields[0].type).toBe('String');
    expect(exportPayload.queryInfo.outputFields[1].name).toBe('target');
    expect(exportPayload.queryInfo.outputFields[2].name).toBe('relationshipType');
    expect(exportPayload.queryInfo.outputFields[3].name).toBe('relationshipProperty');
    expect(exportPayload.queryInfo.outputFields[4].name).toBe('propertyValue');

});