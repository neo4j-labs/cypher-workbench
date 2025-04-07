
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
    RelationshipRef,
    Type,
    Visualisation,
    generateConstraints,
    generateIndexes,
    generateKey,
    Property,
    TableSchema,
    TableSchemaField,
    DataSourceSchema,
    NodeMapping,
    RelationshipMapping,
    RelationshipEndpointField,
    PropertyMapping,
    PropertyRef
} from "./graphModel";
import { DataImporterDataTypes } from "./workbenchDataModelToImporterGraphModel";

const compareMultilineStrings = (str1, str2) => {
    let str1Lines = str1.split('\n').map(x => x.trim()).filter(x => x);
    let str2Lines = str2.split('\n').map(x => x.trim()).filter(x => x);

    for (var i = 0; i < str1Lines.length; i++) {
        let str1 = str1Lines[i];
        let str2 = str2Lines[i];
        // console.log('str1: ', str1);
        // console.log('str2: ', str2);

        expect(str1).toEqual(str2);
    }

    expect(str1Lines.length).toEqual(str2Lines.length);
}

const smallMovieMapping = `{
    "dataSourceSchema": {
        "type": "local",
        "tableSchemas": [
          {
            "name": "export_Person_ACTED_IN_Movie.csv",
            "expanded": true,
            "fields": [
              {
                "name": "start_Person_name",
                "sample": "Keanu Reeves",
                "recommendedType": {
                  "type": "string"
                }
              },
              {
                "name": "end_Movie_title",
                "sample": "The Matrix",
                "recommendedType": {
                  "type": "string"
                }
              }
            ]
          },
          {
            "name": "export_Movie.csv",
            "expanded": true,
            "fields": [
              {
                "name": "title",
                "sample": "The Matrix",
                "recommendedType": {
                  "type": "string"
                }
              }
            ]
          },
          {
            "name": "export_Person.csv",
            "expanded": true,
            "fields": [
              {
                "name": "name",
                "sample": "Keanu Reeves",
                "recommendedType": {
                  "type": "string"
                }
              }
            ]
          }
        ]
      },
      "nodeMappings": [
        {
          "node": {
            "$ref": "#n:2"
          },
          "tableName": "export_Person.csv",
          "propertyMappings": [
            {
              "fieldName": "name",
              "property": {
                "$ref": "#p:5"
              }
            }
          ]
        },
        {
          "node": {
            "$ref": "#n:1"
          },
          "tableName": "export_Movie.csv",
          "propertyMappings": [
            {
              "fieldName": "title",
              "property": {
                "$ref": "#p:3"
              }
            }
          ]
        }
      ],
      "relationshipMappings": [
        {
          "relationship": {
            "$ref": "#r:1"
          },
          "tableName": "export_Person_ACTED_IN_Movie.csv",
          "propertyMappings": [],
          "fromMapping": {
            "fieldName": "start_Person_name"
          },
          "toMapping": {
            "fieldName": "end_Movie_title"
          }
        }
      ]
    }`

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
        nodeKey: true
    })
    let A_val = new Property({
        id: 'p:2', 
        token: 'val',
        type: new Type('string'),
        nullable: true,
        nodeKey: false
    })
    let B_id = new Property({
        id: 'p:3', 
        token: 'id',
        type: new Type('integer'),
        nullable: true,
        nodeKey: true
    })
    let B_val = new Property({
        id: 'p:4', 
        token: 'val',
        type: new Type('string'),
        nullable: true,
        nodeKey: false
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

    // console.log(JSON.stringify(dataImporterModel, null, 2));
})

test('construct GraphMappingRepresentation', () => {

    let Person_name = new Property({
        id: 'p:5', 
        token: 'name',
        type: new Type('string'),
        nullable: true,
        nodeKey: true
    })
    let Person_name_propRef = new PropertyRef(Person_name.$id);

    let Movie_title = new Property({
        id: 'p:3', 
        token: 'title',
        type: new Type('string'),
        nullable: true,
        nodeKey: true
    })
    let Movie_title_propRef = new PropertyRef(Movie_title.$id);

    let Person_Label = new NodeLabel({
        id: 'nl:1', 
        token: 'Person', 
        properties: [Person_name]
    });
    let Movie_Label = new NodeLabel({
        id: 'nl:2', 
        token: 'Movie', 
        properties: [Movie_title]
    });
    let ACTED_IN_Rel = new RelationshipType({
        id: 'rt:1',
        token: 'ACTED_IN'
    })

    // instances
    let person1 = new NodeObjectType({
        id: 'n:2',
        labels: [new NodeLabelRef(Person_Label.$id)]
    })
    let movie1 = new NodeObjectType({
        id: 'n:1',
        labels: [new NodeLabelRef(Movie_Label.$id)]
    })
    let person1Ref = new NodeRef(person1.$id);
    let movie1Ref = new NodeRef(movie1.$id);

    let actedInTypeRef = new RelationshipTypeRef(ACTED_IN_Rel.$id)

    let actedIn = new RelationshipObjectType({
        id: 'r:1',
        type: actedInTypeRef,
        from: person1Ref,
        to: movie1Ref
    })
    let actedInRef = new RelationshipRef(actedIn.$id)

    let importerStringType = new Type(DataImporterDataTypes.String)

    let personNameField = new TableSchemaField({
        name: 'name',
        sample: 'Keanu Reeves',
        recommendedType: importerStringType
    })

    let movieTitleField = new TableSchemaField({
        name: 'title',
        sample: 'The Matrix',
        recommendedType: importerStringType
    })    

    // this is to represent fields in the ACTED_IN file
    let startPersonName = new TableSchemaField({
        name: 'start_Person_name',
        sample: 'Keanu Reeves',
        recommendedType: importerStringType
    })    
    let endMovieTitle = new TableSchemaField({
        name: 'end_Movie_title',
        sample: 'The Matrix',
        recommendedType: importerStringType
    })    

    let personSchema = new TableSchema({
        name: 'export_Person.csv',
        expanded: true,
        fields: [
            personNameField
        ]
    });

    let movieSchema = new TableSchema({
        name: 'export_Movie.csv',
        expanded: true,
        fields: [
            movieTitleField
        ]
    })

    let actedInSchema = new TableSchema({
        name: 'export_Person_ACTED_IN_Movie.csv',
        expanded: true,
        fields: [
            startPersonName,
            endMovieTitle
        ]
    })

    let dataSourceSchema = new DataSourceSchema({
        type: 'local',
        tableSchemas: [
            actedInSchema,
            movieSchema,
            personSchema
        ]
    })

    let personTable_personNamePropertyMapping = new PropertyMapping({
        fieldName: 'name',
        property: Person_name_propRef
    })

    let personTableToNodeMapping = new NodeMapping({
        node: person1Ref,
        tableName: 'export_Person.csv',
        propertyMappings: [
            personTable_personNamePropertyMapping
        ]
    })

    let movieTable_movieTitlePropertyMapping = new PropertyMapping({
        fieldName: 'title',
        property: Movie_title_propRef
    })

    let movieTableToNodeMapping = new NodeMapping({
        node: movie1Ref,
        tableName: 'export_Movie.csv',
        propertyMappings: [
            movieTable_movieTitlePropertyMapping
        ]
    })

    let actedInRelMapping = new RelationshipMapping({
        relationship: actedInRef,
        propertyMappings: [],
        tableName: 'export_Person_ACTED_IN_Movie.csv',
        fromMapping: new RelationshipEndpointField({fieldName: 'start_Person_name'}),
        toMapping: new RelationshipEndpointField({fieldName: 'end_Movie_title'})
    });

    let graphMappingRepresentation = new GraphMappingRepresentation({
        dataSourceSchema: dataSourceSchema,
        nodeMappings: [personTableToNodeMapping, movieTableToNodeMapping],
        relationshipMappings: [actedInRelMapping]
    });

    let jsonString = JSON.stringify(graphMappingRepresentation, null, 2);
    // console.log(jsonString);

    compareMultilineStrings(jsonString, smallMovieMapping);
    
})

