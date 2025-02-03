
import { 
    DataImporterModel,
    GraphMappingRepresentation,
    DataModel,
    GraphSchema,
    GraphSchemaRepresentation,
    GraphSchemaExtensionsRepresentation,
    NodeKeyProperty,
    NodeLabel,
    NodeLabelRef,
    NodeRef,
    NodeObjectType,
    NodeVisualisation,
    Position,
    Ref, 
    RelationshipObjectType, 
    RelationshipType, 
    RelationshipTypeRef,
    Type,
    Visualisation,
    generateConstraints,
    generateIndexes,
    generateKey,
    Property
} from "./graphModel";

test('make ref', () => {
    var ref = new Ref();
    expect(ref).not.toBeNull();
});

test('make importable schema', () => {
    // types

    let A_id = new Property({
        id: 'p:1', 
        token: 'id',
        type: new Type('integer'),
        nullable: true,
        primaryKey: true
    })
    let A_val = new Property({
        id: 'p:2', 
        token: 'val',
        type: new Type('string'),
        nullable: true,
        primaryKey: false
    })
    let B_id = new Property({
        id: 'p:3', 
        token: 'id',
        type: new Type('integer'),
        nullable: true,
        primaryKey: true
    })
    let B_val = new Property({
        id: 'p:4', 
        token: 'val',
        type: new Type('string'),
        nullable: true,
        primaryKey: false
    })

    let A_Label = new NodeLabel({
        id: 'nl:1', 
        token: 'A', 
        properties: [A_id, A_val]
    });
    let B_Label = new NodeLabel({
        id: 'nl:2', 
        token: 'B', 
        properties: [B_id, B_val]
    });
    let TO_Rel = new RelationshipType({
        id: 'rt:1',
        token: 'TO'
    })

    // instances
    let a = new NodeObjectType({
        id: 'n:1',
        labels: [new NodeLabelRef(A_Label.$id)]
    })
    let b = new NodeObjectType({
        id: 'n:2',
        labels: [new NodeLabelRef(B_Label.$id)]
    })
    let TO = new RelationshipObjectType({
        id: 'r:1',
        type: new RelationshipTypeRef(TO_Rel.$id),
        from: new NodeRef(a.$id),
        to: new NodeRef(b.$id)
    })

    let nodeLabels = [A_Label, B_Label];
    let graphSchema = new GraphSchema({
        nodeLabels: nodeLabels,
        relationshipTypes: [TO_Rel],
        nodeObjectTypes: [a, b],
        relationshipObjectTypes: [TO],
        constraints: generateConstraints(nodeLabels),
        indexes: generateIndexes(nodeLabels)
    })

    let graphSchemaRepresentation = new GraphSchemaRepresentation({
        version: '1.0.0',
        graphSchema: graphSchema
    })

    let aKey = generateKey(a, nodeLabels);
    let bKey = generateKey(b, nodeLabels);
    let graphSchemaExtensionsRepresentation = new GraphSchemaExtensionsRepresentation({
        nodeKeyProperties: [aKey, bKey]
    })

    let dataModel = new DataModel({
        version: '2.3.0',
        graphSchemaRepresentation: graphSchemaRepresentation,
        graphSchemaExtensionsRepresentation: graphSchemaExtensionsRepresentation,
        graphMappingRepresentation: new GraphMappingRepresentation()
    });

    // viz
    let aViz = new NodeVisualisation({
        id: 'n:1',
        position: new Position(0, -130)
    })

    let bViz = new NodeVisualisation({
        id: 'n:2',
        position: new Position(0, 130)
    })

    let visualisation = new Visualisation({
        nodes: [aViz, bViz]
    });

    // full importer definition
    let dataImporterModel = new DataImporterModel({
        version: '2.3.0',
        visualisation: visualisation,
        dataModel: dataModel
    });

    console.log(JSON.stringify(dataImporterModel, null, 2));
})
