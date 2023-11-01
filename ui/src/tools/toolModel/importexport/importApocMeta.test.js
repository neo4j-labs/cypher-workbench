
import { getDataModelFromApocMetaSchema } from './importApocMeta';
import {
    getNodeLabels,
    verifyNodeLabelProperties,
    verifyRelationshipTypeProperties,
    verifyProperty
} from '../../../common/test/testHelper';

var fooOutput = `
{
  "Foo": {
    "count": 1,
    "relationships": {
      "TO": {
        "count": 1,
        "properties": {},
        "direction": "out",
        "labels": [
          "Bar",
          "Baz"
        ]
      }
    },
    "type": "node",
    "properties": {},
    "labels": []
  },
  "Bar": {
    "count": 1,
    "relationships": {
      "TO": {
        "count": 1,
        "properties": {},
        "direction": "in",
        "labels": [
          "Foo"
        ]
      }
    },
    "type": "node",
    "properties": {},
    "labels": ["Baz"]
  }
}
`

var apocMetaSchemaOutput = `
{
  "DBConnection": {
    "count": 2,
    "relationships": {
      "CREATOR": {
        "count": 22,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      },
      "OWNER": {
        "count": 22,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      }
    },
    "type": "node",
    "properties": {
      "createdAt": {
        "existence": false,
        "type": "INTEGER",
        "indexed": false,
        "unique": false
      },
      "password": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "name": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "id": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "isPrivate": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "user": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "url": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "HAS_USER_SETTINGS": {
    "type": "relationship",
    "count": 2,
    "properties": {

    }
  },
  "User": {
    "count": 5,
    "relationships": {
      "HAS_USER_SETTINGS": {
        "count": 4,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "UserSettings"
        ]
      },
      "OWNER": {
        "count": 29,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel",
          "DBConnection"
        ]
      },
      "VIEWER": {
        "count": 1,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel"
        ]
      },
      "CREATOR": {
        "count": 23,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel",
          "DBConnection"
        ]
      },
      "MEMBER": {
        "count": 4,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel"
        ]
      }
    },
    "type": "node",
    "properties": {
      "name": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "picture": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "email": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "lastOpenedModel": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "HAS_METADATA": {
    "type": "relationship",
    "count": 24,
    "properties": {

    }
  },
  "Customer": {
    "count": 4,
    "relationships": {
      "HAS_CUSTOMER": {
        "count": 17,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModelMetadata"
        ]
      }
    },
    "type": "node",
    "properties": {
      "name": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      }
    },
    "labels": []
  },
  "HAS_CUSTOMER": {
    "type": "relationship",
    "count": 11,
    "properties": {

    }
  },
  "RelationshipType": {
    "count": 139,
    "relationships": {
      "HAS_PROPERTY": {
        "count": 6,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "PropertyDefinition"
        ]
      },
      "HAS_RELATIONSHIP_TYPE": {
        "count": 1481,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel"
        ]
      },
      "END_NODE_LABEL": {
        "count": 277,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "NodeLabel"
        ]
      },
      "START_NODE_LABEL": {
        "count": 441,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "NodeLabel"
        ]
      }
    },
    "type": "node",
    "properties": {
      "referenceData": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "outMaxCardinality": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "display": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "inMaxCardinality": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "outMinCardinality": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "type": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "inMinCardinality": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "HAS_AUTHOR": {
    "type": "relationship",
    "count": 2,
    "properties": {

    }
  },
  "HAS_PROPERTY": {
    "type": "relationship",
    "count": 74,
    "properties": {

    }
  },
  "HAS_RELATIONSHIP_TYPE": {
    "type": "relationship",
    "count": 139,
    "properties": {

    }
  },
  "MEMBER": {
    "type": "relationship",
    "count": 4,
    "properties": {

    }
  },
  "Industry": {
    "type": "relationship",
    "count": null,
    "properties": {

    }
  },
  "OWNER": {
    "type": "relationship",
    "count": 27,
    "properties": {

    }
  },
  "NodeLabel": {
    "count": 125,
    "relationships": {
      "HAS_PROPERTY": {
        "count": 68,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "PropertyDefinition"
        ]
      },
      "END_NODE_LABEL": {
        "count": 139,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "RelationshipType"
        ]
      },
      "START_NODE_LABEL": {
        "count": 139,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "RelationshipType"
        ]
      },
      "HAS_NODE_LABEL": {
        "count": 977,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModel"
        ]
      }
    },
    "type": "node",
    "properties": {
      "referenceData": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "label": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "display": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "END_NODE_LABEL": {
    "type": "relationship",
    "count": 139,
    "properties": {

    }
  },
  "CREATOR": {
    "type": "relationship",
    "count": 25,
    "properties": {

    }
  },
  "HAS_TAG": {
    "type": "relationship",
    "count": 11,
    "properties": {

    }
  },
  "HAS_NODE_LABEL": {
    "type": "relationship",
    "count": 125,
    "properties": {

    }
  },
  "UserSettings": {
    "count": 1,
    "relationships": {
      "HAS_USER_SETTINGS": {
        "count": 2,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "User"
        ]
      }
    },
    "type": "node",
    "properties": {
      "email": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "canvasSettings": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "UseCase": {
    "type": "relationship",
    "count": null,
    "properties": {

    }
  },
  "PropertyDefinition": {
    "count": 74,
    "relationships": {
      "HAS_PROPERTY": {
        "count": 254,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "NodeLabel",
          "RelationshipType"
        ]
      }
    },
    "type": "node",
    "properties": {
      "referenceData": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "isIndexed": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "datatype": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "name": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "isPartOfKey": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "isArray": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "hasUniqueConstraint": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "mustExist": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "DataModelMetadata": {
    "count": 24,
    "relationships": {
      "HAS_AUTHOR": {
        "count": 4,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "Author"
        ]
      },
      "HAS_TAG": {
        "count": 19,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "Tag"
        ]
      },
      "HAS_METADATA": {
        "count": 24,
        "properties": {
            "testProperty": {
                "type": "STRING",
                "existence": true,
                "array": false
            }
        },
        "direction": "in",
        "labels": [
          "DataModel"
        ]
      },
      "HAS_CUSTOMER": {
        "count": 53,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "Customer"
        ]
      }
    },
    "type": "node",
    "properties": {
      "notes": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "dateCreated": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "description": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": false
      },
      "title": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": false
      },
      "viewSettings": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "dateUpdated": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      }
    },
    "labels": []
  },
  "VIEWER": {
    "type": "relationship",
    "count": 1,
    "properties": {

    }
  },
  "START_NODE_LABEL": {
    "type": "relationship",
    "count": 139,
    "properties": {

    }
  },
  "DataModel": {
    "count": 24,
    "relationships": {
      "OWNER": {
        "count": 233,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      },
      "HAS_METADATA": {
        "count": 24,
        "properties": {
            "testProperty": {
                "type": "STRING",
                "existence": true,
                "array": false
            }
        },
        "direction": "out",
        "labels": [
          "DataModelMetadata"
        ]
      },
      "VIEWER": {
        "count": 1,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      },
      "CREATOR": {
        "count": 225,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      },
      "HAS_RELATIONSHIP_TYPE": {
        "count": 139,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "RelationshipType"
        ]
      },
      "HAS_NODE_LABEL": {
        "count": 125,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "NodeLabel"
        ]
      },
      "MEMBER": {
        "count": 6,
        "properties": {

        },
        "direction": "out",
        "labels": [
          "User"
        ]
      }
    },
    "type": "node",
    "properties": {
      "isPrivate": {
        "existence": false,
        "type": "BOOLEAN",
        "indexed": false,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      },
      "lockedByUser": {
        "existence": false,
        "type": "STRING",
        "indexed": false,
        "unique": false
      },
      "lockTimestamp": {
        "existence": false,
        "type": "INTEGER",
        "indexed": false,
        "unique": false
      }
    },
    "labels": ["GraphDoc"]
  },
  "Author": {
    "count": 1,
    "relationships": {
      "HAS_AUTHOR": {
        "count": 2,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModelMetadata"
        ]
      }
    },
    "type": "node",
    "properties": {
      "name": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": false
      },
      "key": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      }
    },
    "labels": []
  },
  "Tag": {
    "count": 8,
    "relationships": {
      "HAS_TAG": {
        "count": 55,
        "properties": {

        },
        "direction": "in",
        "labels": [
          "DataModelMetadata"
        ]
      }
    },
    "type": "node",
    "properties": {
      "tag": {
        "existence": false,
        "type": "STRING",
        "indexed": true,
        "unique": true
      }
    },
    "labels": []
  }
}
`

test('import apoc.meta.schema', () => {
    //console.log(apocMetaSchemaOutput);
    var schemaJSON = JSON.parse(apocMetaSchemaOutput);
    var dataModel = getDataModelFromApocMetaSchema(schemaJSON);

    expect(getNodeLabels(dataModel)).toStrictEqual(['DBConnection',
        'User',
        'Customer',
        'RelationshipType',
        'NodeLabel',
        'UserSettings',
        'PropertyDefinition',
        'DataModelMetadata',
        'DataModel',
        'GraphDoc',
        'Author',
        'Tag']);

    verifyNodeLabelProperties(dataModel, 'DataModel', {
        isPrivate: "Boolean",
        key: "String",
        lockedByUser: "String",
        lockTimestamp: "Integer"
    });

    var dataModelNodeType = dataModel.getNodeLabelByLabel('DataModel');
    var graphDocNodeType = dataModel.getNodeLabelByLabel('GraphDoc');

    expect(graphDocNodeType).not.toBeNull();
    expect(graphDocNodeType.isOnlySecondaryNodeLabel).toBe(true);

    expect(dataModelNodeType.secondaryNodeLabelKeys.length).toBe(1);
    expect(dataModelNodeType.isOnlySecondaryNodeLabel).toBe(false);
    expect(dataModelNodeType.secondaryNodeLabelKeys.includes(graphDocNodeType.key)).toBe(true);

    var keyProperty = dataModelNodeType.getPropertyByName('key');
    verifyProperty (keyProperty, 'key', 'String', null, false);

    var lockedByUserProperty = dataModelNodeType.getPropertyByName('lockedByUser');
    verifyProperty (lockedByUserProperty, 'lockedByUser', 'String', null, false);

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

    var hasMetadata = relationshipTypes.filter(x => x.type === 'HAS_METADATA')[0];
    //console.log(hasMetadata);
    var testProperty = hasMetadata.getPropertyByName('testProperty');
    verifyProperty (testProperty, 'testProperty', 'String', null, false);
    expect(testProperty.mustExist).toBe(false);


    //verifyRelationshipTypeProperties (dataModel, relationshipTypes[0], { abc: "def", def: "Integer" })
});
