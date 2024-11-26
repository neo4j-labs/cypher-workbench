MATCH (model:DataModel)-[:HAS_METADATA]->(metadata:DataModelMetadata)
RETURN model.key, metadata.title, count { (model)-[:HAS_NODE_LABEL]->() } as numNodeLabels
ORDER BY numNodeLabels DESC


WITH {
    // Model Title
    modelKey: "<model_key>"
} as params

MATCH (model:DataModel {key: params.modelKey})
MATCH p=(model)-[:HAS_NODE_LABEL]->(nl:NodeLabel)-[:HAS_PROPERTY]->(prop:PropertyDefinition)
RETURN prop


// get paths
WITH {
    // Model Title
    modelKey: "<model_key>"
} as params

MATCH (model:DataModel {key: params.modelKey})
MATCH (model)-[:HAS_NODE_LABEL]->(nl:NodeLabel)
MATCH p=(nl)<-[:START_NODE_LABEL]-(rel)-[:END_NODE_LABEL]->(nl2)
RETURN p

// get paths 2
WITH {
    // Model Title
    modelKey: "<model_key>"
} as params

MATCH (model:DataModel {key: params.modelKey})
MATCH (model)-[:HAS_NODE_LABEL]->(nl:NodeLabel)-[:HAS_PROPERTY]->(prop:PropertyDefinition)
WITH prop
LIMIT 5
CALL {
    WITH prop
    MATCH p=(prop)<-[:HAS_PROPERTY]-(nl)-[:START_NODE_LABEL|END_NODE_LABEL|HAS_PROPERTY*0..6]-(:NodeLabel)
    RETURN p
    LIMIT 5
}
RETURN p

// take paths and make Cypher
WITH {
    // Model Title
    modelKey: "<model_key>"
} as params

MATCH (model:DataModel {key: params.modelKey})
MATCH (model)-[:HAS_NODE_LABEL]->(nl:NodeLabel)-[:HAS_PROPERTY]->(prop:PropertyDefinition)
WITH prop
LIMIT 5
CALL {
    WITH prop
    MATCH p=(prop)<-[:HAS_PROPERTY]-(nl)-[:START_NODE_LABEL|END_NODE_LABEL|HAS_PROPERTY*0..6]-(:NodeLabel)
    RETURN p
    LIMIT 5
}
// make cypher -- we need to convert the START_NODE_LABEL/END_NODE_LABEL/relationship type into actual rels
//  would be better to have a Javascript client convert these paths into Cypher
WITH p
UNWIND range(0, size(relationships(p)), 1) as relIndex
WITH p, relationships(p)[relIndex] as rel, relIndex
WITH p, relIndex, rel, startNode(rel) as startNode, endNode(rel) as endNode
WITH p, relIndex,

    CASE WHEN relIndex = 0 
        THEN
            '(:' + apoc.text.join(labels(startNode), ':') + ')-' +
            '[:' + type(rel) + ']->' + 
            '(:' + apoc.text.join(labels(endNode), ':') + ')'
        ELSE
            '-[:' + type(rel) + ']->' + 
            '(:' + apoc.text.join(labels(endNode), ':') + ')'
    END as pattern
WITH p, apoc.text.join(collect(pattern), '') as pattern
RETURN pattern


// try again - this time only process Nodes
WITH {
    // Model Title
    modelKey: "<model_key>"
} as params

MATCH (model:DataModel {key: params.modelKey})
MATCH (model)-[:HAS_NODE_LABEL]->(nl:NodeLabel)-[:HAS_PROPERTY]->(prop:PropertyDefinition)
WITH prop
LIMIT 5
CALL {
    WITH prop
    MATCH p=(prop)<-[:HAS_PROPERTY]-(nl)-[:START_NODE_LABEL|END_NODE_LABEL|HAS_PROPERTY*1..6]-(:NodeLabel)
    RETURN p
    LIMIT 5
}
// make cypher -- we need to convert the START_NODE_LABEL/END_NODE_LABEL/relationship type into actual rels
//  would be better to have a Javascript client convert these paths into Cypher
//  I think this already exists in some form in the validation code of Cypher workbench
WITH p
UNWIND range(0, size(nodes(p)), 1) as nodeIndex
WITH p, nodes(p)[nodeIndex] as node, nodes(p)[nodeIndex-1] as priorNode, nodeIndex
WITH p, nodeIndex, node,
    CASE 
        WHEN 'RelationshipType' IN labels(node) THEN '-[:' + node.type + ']->'
        WHEN 'NodeLabel' IN labels(node) THEN '(:' + node.label + 
            CASE WHEN 'PropertyDefinition' IN labels(priorNode)
                THEN ' {' + priorNode.name + ':' + 
                    CASE WHEN priorNode.datatype = 'String'
                        THEN '\'String\'})'
                        ELSE priorNode.datatype + '})'
                    END
                ELSE ')'
            END
        ELSE ''
    END as pattern
WITH p, 
    'MATCH path=' + apoc.text.join(collect(pattern), '') + 
    '\nRETURN path' as cypher
RETURN cypher

