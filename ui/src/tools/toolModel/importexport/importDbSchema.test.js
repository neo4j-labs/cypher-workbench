
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
					"Constraint( id=141, name='constraint_a5b8379', type='UNIQUENESS', schema=(:DBConnection {id}), ownedIndex=140 )"
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
					"Constraint( id=143, name='constraint_3a8336b6', type='UNIQUENESS', schema=(:User {email}), ownedIndex=142 )"
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
					"Constraint( id=133, name='constraint_b3e00c86', type='UNIQUENESS', schema=(:Customer {key}), ownedIndex=132 )"
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
					"Constraint( id=111, name='constraint_9442c22c', type='UNIQUENESS', schema=(:UserSettings {email}), ownedIndex=110 )"
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
					"Constraint( id=135, name='constraint_63a8c2f8', type='UNIQUENESS', schema=(:RelationshipType {key}), ownedIndex=134 )"
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
					"Constraint( id=99, name='constraint_23e5e096', type='UNIQUENESS', schema=(:PropertyDefinition {key}), ownedIndex=98 )"
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
					"Constraint( id=10001, name='constraint_aabbccdd', type='NODE PROPERTY EXISTENCE', schema=(:NodeAssertTest {nodeTestProp}), ownedIndex=10001 )"
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
					"Constraint( id=137, name='constraint_b2f8dcc', type='UNIQUENESS', schema=(:DataModelMetadata {key}), ownedIndex=136 )"
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
					"Constraint( id=101, name='constraint_d471e728', type='NODE KEY', schema=(:NodeLabel {key}), ownedIndex=100 )"
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
					"Constraint( id=105, name='constraint_f7ecef6a', type='UNIQUENESS', schema=(:DataModel {key}), ownedIndex=104 )"
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
					"Constraint( id=10002, name='constraint_ddccbbaa', type='NODE KEY', schema=(:NodeKeyTest {prop1, prop2}), ownedIndex=10002 )"
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
					"Constraint( id=97, name='constraint_3ed5bdd3', type='UNIQUENESS', schema=(:Tag {key}), ownedIndex=96 )"
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
	// console.log(getNodeLabels(dataModel));

	expect(getNodeLabels(dataModel)).toStrictEqual([
	  'DBConnection',       'User',
      'Customer',           'UserSettings',
      'RelationshipType',   'UseCase',
      'PropertyDefinition', 'NodeAssertTest',
      'Industry',           'DataModelMetadata',
      'NodeLabel',          'DataModel',
      'Author',             'NodeKeyTest',
      'Tag'
	]);

	// console.log(dataModel.getNodeLabelByLabel('DataModel'));

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
    verifyProperty (nodeTestProp1, 'prop1', 'String', null, true);
    expect(nodeTestProp1.mustExist).toBe(true);
    var nodeTestProp2 = nodeKeyTest.getPropertyByName('prop2');
    verifyProperty (nodeTestProp2, 'prop2', 'String', null, true);
    expect(nodeTestProp2.mustExist).toBe(true);

    var nodeTestProp = nodeAssertTest.getPropertyByName('nodeTestProp');
    verifyProperty (nodeTestProp, 'nodeTestProp', 'String', null, false);
    expect(nodeTestProp.mustExist).toBe(true);

    // // verify relationships
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

/* Notes / Cypher to help formulate test data
WITH [
	'NodeLabel','DataModel','Author','NodeKeyTest',
	'Tag','DataModelMetadata','Industry',
	'NodeAssertTest','PropertyDefinition','UseCase',
	'RelationshipType','UserSettings','Customer',
	'User','DBConnection'
] as allowedLabels

CALL db.schema.visualization() YIELD nodes
UNWIND nodes as node
WITH allowedLabels, apoc.any.properties(node) as properties
WITH allowedLabels, properties.name as name, properties['constraints'] as constraints
WHERE size(constraints) > 0
  AND name IN allowedLabels
RETURN name, constraints
ORDER BY name

"Customer"	["Constraint( id=133, name='constraint_b3e00c86', type='UNIQUENESS', schema=(:Customer {key}), ownedIndex=132 )"]
"DBConnection"	["Constraint( id=141, name='constraint_a5b8379', type='UNIQUENESS', schema=(:DBConnection {id}), ownedIndex=140 )"]
"DataModel"	["Constraint( id=105, name='constraint_f7ecef6a', type='UNIQUENESS', schema=(:DataModel {key}), ownedIndex=104 )"]
"DataModelMetadata"	["Constraint( id=137, name='constraint_b2f8dcc', type='UNIQUENESS', schema=(:DataModelMetadata {key}), ownedIndex=136 )"]
"NodeLabel"	["Constraint( id=101, name='constraint_d471e728', type='NODE KEY', schema=(:NodeLabel {key}), ownedIndex=100 )"]
"PropertyDefinition"	["Constraint( id=99, name='constraint_23e5e096', type='UNIQUENESS', schema=(:PropertyDefinition {key}), ownedIndex=98 )"]
"RelationshipType"	["Constraint( id=135, name='constraint_63a8c2f8', type='UNIQUENESS', schema=(:RelationshipType {key}), ownedIndex=134 )"]
"Tag"	["Constraint( id=97, name='constraint_3ed5bdd3', type='UNIQUENESS', schema=(:Tag {key}), ownedIndex=96 )"]
"User"	["Constraint( id=143, name='constraint_3a8336b6', type='UNIQUENESS', schema=(:User {email}), ownedIndex=142 )"]
"UserSettings"	["Constraint( id=111, name='constraint_9442c22c', type='UNIQUENESS', schema=(:UserSettings {email}), ownedIndex=110 )"]

*/

