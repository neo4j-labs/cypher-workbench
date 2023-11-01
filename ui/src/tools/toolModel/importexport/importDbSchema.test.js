
import {
    getNodeLabels,
    verifyNodeLabelProperties,
    verifyRelationshipTypeProperties,
    verifyProperty
} from '../../../common/test/testHelper';

import { getDataModelFromDbSchema, getDataModelFromRawDbSchema } from './importDbSchema';

var dbSchemaOutput = `
{
  "relationships": [
    {
      "relationshipType": "HAS_USER_SETTINGS",
      "startNode": "User",
      "endNode": "UserSettings"
    },
    {
      "relationshipType": "HAS_METADATA",
      "startNode": "DataModel",
      "endNode": "DataModelMetadata"
    },
    {
      "relationshipType": "HAS_CUSTOMER",
      "startNode": "DataModelMetadata",
      "endNode": "Customer"
    },
    {
      "relationshipType": "HAS_AUTHOR",
      "startNode": "DataModelMetadata",
      "endNode": "Author"
    },
    {
      "relationshipType": "HAS_PROPERTY",
      "startNode": "NodeLabel",
      "endNode": "PropertyDefinition"
    },
    {
      "relationshipType": "HAS_PROPERTY",
      "startNode": "RelationshipType",
      "endNode": "PropertyDefinition"
    },
    {
      "relationshipType": "HAS_RELATIONSHIP_TYPE",
      "startNode": "DataModel",
      "endNode": "RelationshipType"
    },
    {
      "relationshipType": "MEMBER",
      "startNode": "DataModel",
      "endNode": "User"
    },
    {
      "relationshipType": "OWNER",
      "startNode": "DataModel",
      "endNode": "User"
    },
    {
      "relationshipType": "OWNER",
      "startNode": "DBConnection",
      "endNode": "User"
    },
    {
      "relationshipType": "END_NODE_LABEL",
      "startNode": "RelationshipType",
      "endNode": "NodeLabel"
    },
    {
      "relationshipType": "VIEWER",
      "startNode": "DataModel",
      "endNode": "User"
    },
    {
      "relationshipType": "START_NODE_LABEL",
      "startNode": "RelationshipType",
      "endNode": "NodeLabel"
    },
    {
      "relationshipType": "CREATOR",
      "startNode": "DBConnection",
      "endNode": "User"
    },
    {
      "relationshipType": "CREATOR",
      "startNode": "DataModel",
      "endNode": "User"
    },
    {
      "relationshipType": "HAS_TAG",
      "startNode": "DataModelMetadata",
      "endNode": "Tag"
    },
    {
      "relationshipType": "HAS_NODE_LABEL",
      "startNode": "DataModel",
      "endNode": "NodeLabel"
    }
  ],
  "nodes": [
    {
      "name": "DBConnection",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "id"
          ]
        }
      ]
    },
    {
      "name": "User",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "email"
          ]
        }
      ]
    },
    {
      "name": "Customer",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "UserSettings",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "email"
          ]
        }
      ]
    },
    {
      "name": "RelationshipType",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "UseCase",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "name"
          ]
        }
      ]
    },
    {
      "name": "PropertyDefinition",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "NodeAssertTest",
      "constraints": [
        {
          "type": "assertExists",
          "properties": [
            "nodeTestProp"
          ]
        }
      ]
    },
    {
      "name": "Industry",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "name"
          ]
        }
      ]
    },
    {
      "name": "DataModelMetadata",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "NodeLabel",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "DataModel",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "Author",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "key"
          ]
        }
      ]
    },
    {
      "name": "NodeKeyTest",
      "constraints": [
        {
          "type": "isNodeKey",
          "properties": [
            "prop1",
            "prop2"
          ]
        }
      ]
    },
    {
      "name": "Tag",
      "constraints": [
        {
          "type": "isUnique",
          "properties": [
            "tag"
          ]
        }
      ]
    }
  ]
}
`

const rawDbSchemaOuput = `
{
	"nodes": [
		{
			"identity": {
				"low": -28,
				"high": -1
			},
			"labels": [
				"DBConnection"
			],
			"properties": {
				"indexes": [

				],
				"name": "DBConnection",
				"constraints": [
					"CONSTRAINT ON ( dbconnection:DBConnection ) ASSERT dbconnection.id IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -26,
				"high": -1
			},
			"labels": [
				"User"
			],
			"properties": {
				"indexes": [

				],
				"name": "User",
				"constraints": [
					"CONSTRAINT ON ( user:User ) ASSERT user.email IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -21,
				"high": -1
			},
			"labels": [
				"Customer"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag",
					"name"
				],
				"name": "Customer",
				"constraints": [
					"CONSTRAINT ON ( customer:Customer ) ASSERT customer.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -27,
				"high": -1
			},
			"labels": [
				"UserSettings"
			],
			"properties": {
				"indexes": [

				],
				"name": "UserSettings",
				"constraints": [
					"CONSTRAINT ON ( usersettings:UserSettings ) ASSERT usersettings.email IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -19,
				"high": -1
			},
			"labels": [
				"RelationshipType"
			],
			"properties": {
				"indexes": [

				],
				"name": "RelationshipType",
				"constraints": [
					"CONSTRAINT ON ( relationshiptype:RelationshipType ) ASSERT relationshiptype.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -25,
				"high": -1
			},
			"labels": [
				"UseCase"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag"
				],
				"name": "UseCase",
				"constraints": [
					"CONSTRAINT ON ( usecase:UseCase ) ASSERT usecase.name IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -18,
				"high": -1
			},
			"labels": [
				"PropertyDefinition"
			],
			"properties": {
				"indexes": [

				],
				"name": "PropertyDefinition",
				"constraints": [
					"CONSTRAINT ON ( propertydefinition:PropertyDefinition ) ASSERT propertydefinition.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -30,
				"high": -1
			},
			"labels": [
				"NodeAssertTest"
			],
			"properties": {
				"indexes": [

				],
				"name": "NodeAssertTest",
				"constraints": [
					"CONSTRAINT ON ( nodeasserttest:NodeAssertTest ) ASSERT exists(nodeasserttest.nodeTestProp)"
				]
			}
		},
		{
			"identity": {
				"low": -24,
				"high": -1
			},
			"labels": [
				"Industry"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag"
				],
				"name": "Industry",
				"constraints": [
					"CONSTRAINT ON ( industry:Industry ) ASSERT industry.name IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -20,
				"high": -1
			},
			"labels": [
				"DataModelMetadata"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag"
				],
				"name": "DataModelMetadata",
				"constraints": [
					"CONSTRAINT ON ( datamodelmetadata:DataModelMetadata ) ASSERT datamodelmetadata.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -17,
				"high": -1
			},
			"labels": [
				"NodeLabel"
			],
			"properties": {
				"indexes": [

				],
				"name": "NodeLabel",
				"constraints": [
					"CONSTRAINT ON ( nodelabel:NodeLabel ) ASSERT nodelabel.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -16,
				"high": -1
			},
			"labels": [
				"DataModel"
			],
			"properties": {
				"indexes": [

				],
				"name": "DataModel",
				"constraints": [
					"CONSTRAINT ON ( datamodel:DataModel ) ASSERT datamodel.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -22,
				"high": -1
			},
			"labels": [
				"Author"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag",
					"name"
				],
				"name": "Author",
				"constraints": [
					"CONSTRAINT ON ( author:Author ) ASSERT author.key IS UNIQUE"
				]
			}
		},
		{
			"identity": {
				"low": -29,
				"high": -1
			},
			"labels": [
				"NodeKeyTest"
			],
			"properties": {
				"indexes": [

				],
				"name": "NodeKeyTest",
				"constraints": [
					"CONSTRAINT ON ( nodekeytest:NodeKeyTest ) ASSERT (nodekeytest.prop1, nodekeytest.prop2) IS NODE KEY"
				]
			}
		},
		{
			"identity": {
				"low": -23,
				"high": -1
			},
			"labels": [
				"Tag"
			],
			"properties": {
				"indexes": [
					"title,description,name,tag"
				],
				"name": "Tag",
				"constraints": [
					"CONSTRAINT ON ( tag:Tag ) ASSERT tag.tag IS UNIQUE"
				]
			}
		}
	],
	"relationships": [
		{
			"identity": {
				"low": -28,
				"high": -1
			},
			"start": {
				"low": -26,
				"high": -1
			},
			"end": {
				"low": -27,
				"high": -1
			},
			"type": "HAS_USER_SETTINGS",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -18,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -20,
				"high": -1
			},
			"type": "HAS_METADATA",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -26,
				"high": -1
			},
			"start": {
				"low": -20,
				"high": -1
			},
			"end": {
				"low": -21,
				"high": -1
			},
			"type": "HAS_CUSTOMER",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -25,
				"high": -1
			},
			"start": {
				"low": -20,
				"high": -1
			},
			"end": {
				"low": -22,
				"high": -1
			},
			"type": "HAS_AUTHOR",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -21,
				"high": -1
			},
			"start": {
				"low": -19,
				"high": -1
			},
			"end": {
				"low": -18,
				"high": -1
			},
			"type": "HAS_PROPERTY",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -20,
				"high": -1
			},
			"start": {
				"low": -17,
				"high": -1
			},
			"end": {
				"low": -18,
				"high": -1
			},
			"type": "HAS_PROPERTY",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -22,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -19,
				"high": -1
			},
			"type": "HAS_RELATIONSHIP_TYPE",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -33,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "MEMBER",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -29,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "OWNER",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -30,
				"high": -1
			},
			"start": {
				"low": -28,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "OWNER",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -24,
				"high": -1
			},
			"start": {
				"low": -19,
				"high": -1
			},
			"end": {
				"low": -17,
				"high": -1
			},
			"type": "END_NODE_LABEL",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -34,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "VIEWER",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -23,
				"high": -1
			},
			"start": {
				"low": -19,
				"high": -1
			},
			"end": {
				"low": -17,
				"high": -1
			},
			"type": "START_NODE_LABEL",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -31,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "CREATOR",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -32,
				"high": -1
			},
			"start": {
				"low": -28,
				"high": -1
			},
			"end": {
				"low": -26,
				"high": -1
			},
			"type": "CREATOR",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -27,
				"high": -1
			},
			"start": {
				"low": -20,
				"high": -1
			},
			"end": {
				"low": -23,
				"high": -1
			},
			"type": "HAS_TAG",
			"properties": {
			}
		},
		{
			"identity": {
				"low": -19,
				"high": -1
			},
			"start": {
				"low": -16,
				"high": -1
			},
			"end": {
				"low": -17,
				"high": -1
			},
			"type": "HAS_NODE_LABEL",
			"properties": {
			}
		}
	]
}
`

test('import db.schema', () => {
    //console.log(apocMetaSchemaOutput);
    var schemaJSON = JSON.parse(dbSchemaOutput);
    var dataModel = getDataModelFromDbSchema(schemaJSON);

    expect(getNodeLabels(dataModel)).toStrictEqual(['DBConnection',
        'User',
        'Customer',
        'UserSettings',
        'RelationshipType',
        'UseCase',
        'PropertyDefinition',
        'NodeAssertTest',
        'Industry',
        'DataModelMetadata',
        'NodeLabel',
        'DataModel',
        'Author',
        'NodeKeyTest',
        'Tag']);

    // verify properties
    verifyNodeLabelProperties(dataModel, 'DataModel', { key: "String" });

    var dataModelNodeType = dataModel.getNodeLabelByLabel('DataModel');
    var keyProp = dataModelNodeType.getPropertyByName('key');
    verifyProperty (keyProp, 'key', 'String', null, false);

    verifyNodeLabelProperties(dataModel, 'NodeKeyTest', { prop1: "String", prop2: "String" });
    verifyNodeLabelProperties(dataModel, 'NodeAssertTest', { nodeTestProp: "String" });

    var nodeKeyTest = dataModel.getNodeLabelByLabel('NodeKeyTest');
    var nodeAssertTest = dataModel.getNodeLabelByLabel('NodeAssertTest');

    var nodeTestProp1 = nodeKeyTest.getPropertyByName('prop1');
    verifyProperty (nodeTestProp1, 'prop1', 'String', null, false);
    expect(nodeTestProp1.mustExist).toBe(false);
    var nodeTestProp2 = nodeKeyTest.getPropertyByName('prop2');
    verifyProperty (nodeTestProp2, 'prop2', 'String', null, false);
    expect(nodeTestProp2.mustExist).toBe(false);

    var nodeTestProp = nodeAssertTest.getPropertyByName('nodeTestProp');
    verifyProperty (nodeTestProp, 'nodeTestProp', 'String', null, false);
    expect(nodeTestProp.mustExist).toBe(false);

    // verify relationships
    var relationshipTypes = dataModel.getRelationshipTypesForNodeLabelByKey(dataModelNodeType.key);
    //console.log(relationshipTypes);
    expect(relationshipTypes.length).toBe(7);
    var hasNodeLabel = relationshipTypes.filter(x => x.type === 'HAS_NODE_LABEL')[0];
    expect(hasNodeLabel.type).toBe('HAS_NODE_LABEL');
    expect(hasNodeLabel.startNodeLabel.label).toBe('DataModel');
    expect(hasNodeLabel.endNodeLabel.label).toBe('NodeLabel');

    var hasRelationshipType = relationshipTypes.filter(x => x.type === 'HAS_RELATIONSHIP_TYPE')[0];
    expect(hasRelationshipType.type).toBe('HAS_RELATIONSHIP_TYPE');
    expect(hasRelationshipType.startNodeLabel.label).toBe('DataModel');
    expect(hasRelationshipType.endNodeLabel.label).toBe('RelationshipType');

});

test('import raw db.schema', () => {
    //console.log(apocMetaSchemaOutput);
    var schemaJSON = JSON.parse(rawDbSchemaOuput);
    var dataModel = getDataModelFromRawDbSchema(schemaJSON);

    expect(getNodeLabels(dataModel)).toStrictEqual(['DBConnection',
        'User',
        'Customer',
        'UserSettings',
        'RelationshipType',
        'UseCase',
        'PropertyDefinition',
        'NodeAssertTest',
        'Industry',
        'DataModelMetadata',
        'NodeLabel',
        'DataModel',
        'Author',
        'NodeKeyTest',
        'Tag']);

    // verify properties
    verifyNodeLabelProperties(dataModel, 'DataModel', { key: "String" });

    var dataModelNodeType = dataModel.getNodeLabelByLabel('DataModel');
    var keyProp = dataModelNodeType.getPropertyByName('key');
    verifyProperty (keyProp, 'key', 'String', null, false);

    verifyNodeLabelProperties(dataModel, 'NodeKeyTest', { prop1: "String", prop2: "String" });
    verifyNodeLabelProperties(dataModel, 'NodeAssertTest', { nodeTestProp: "String" });

    var nodeKeyTest = dataModel.getNodeLabelByLabel('NodeKeyTest');
    var nodeAssertTest = dataModel.getNodeLabelByLabel('NodeAssertTest');

    var nodeTestProp1 = nodeKeyTest.getPropertyByName('prop1');
    verifyProperty (nodeTestProp1, 'prop1', 'String', null, false);
    expect(nodeTestProp1.mustExist).toBe(false);
    var nodeTestProp2 = nodeKeyTest.getPropertyByName('prop2');
    verifyProperty (nodeTestProp2, 'prop2', 'String', null, false);
    expect(nodeTestProp2.mustExist).toBe(false);

    var nodeTestProp = nodeAssertTest.getPropertyByName('nodeTestProp');
    verifyProperty (nodeTestProp, 'nodeTestProp', 'String', null, false);
    expect(nodeTestProp.mustExist).toBe(false);

    // verify relationships
    var relationshipTypes = dataModel.getRelationshipTypesForNodeLabelByKey(dataModelNodeType.key);
    //console.log(relationshipTypes);
    expect(relationshipTypes.length).toBe(7);
    var hasNodeLabel = relationshipTypes.filter(x => x.type === 'HAS_NODE_LABEL')[0];
    expect(hasNodeLabel.type).toBe('HAS_NODE_LABEL');
    expect(hasNodeLabel.startNodeLabel.label).toBe('DataModel');
    expect(hasNodeLabel.endNodeLabel.label).toBe('NodeLabel');

    var hasRelationshipType = relationshipTypes.filter(x => x.type === 'HAS_RELATIONSHIP_TYPE')[0];
    expect(hasRelationshipType.type).toBe('HAS_RELATIONSHIP_TYPE');
    expect(hasRelationshipType.startNodeLabel.label).toBe('DataModel');
    expect(hasRelationshipType.endNodeLabel.label).toBe('RelationshipType');

});
