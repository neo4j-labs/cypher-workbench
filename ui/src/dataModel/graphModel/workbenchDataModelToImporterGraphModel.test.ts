import DataModel from "../dataModel";
import { workbenchDataModelToImporterGraphModel } from './workbenchDataModelToImporterGraphModel';

let modelJson = `
{
	"metadata": {
		"cypherWorkbenchVersion": "1.7.0",
		"title": "Simple Test Export",
		"description": "",
		"notes": "",
		"customer": "",
		"authors": "",
		"tags": "",
		"dateCreated": "1738270519046",
		"dateUpdated": "1738270605022",
		"viewSettings": {
			"parentContainerViewSettings": {
				"rightDrawerOpen": false,
				"rightDrawerOpenWidth": "800px",
				"destinationTabIndex": 0,
				"exportSettings": {
				}
			},
			"canvasViewSettings": {
				"currentPan": {
					"x": 84,
					"y": 38
				},
				"currentOffset": {
					"x": 0,
					"y": 0
				},
				"scaleFactor": 1
			}
		}
	},
	"dataModel": {
		"nodeLabels": {
			"Node0": {
				"classType": "NodeLabel",
				"label": "A",
				"fromDataSources": [

				],
				"key": "Node0",
				"indexes": [

				],
				"properties": {
					"Prop1": {
						"key": "Prop1",
						"name": "id",
						"datatype": "Integer",
						"referenceData": "",
						"description": null,
						"fromDataSources": [

						],
						"isPartOfKey": true,
						"isArray": false,
						"isIndexed": true,
						"mustExist": true,
						"hasUniqueConstraint": true
					},
					"Prop2": {
						"key": "Prop2",
						"name": "val",
						"datatype": "String",
						"referenceData": "",
						"description": null,
						"fromDataSources": [

						],
						"isPartOfKey": false,
						"isArray": false,
						"isIndexed": false,
						"mustExist": false,
						"hasUniqueConstraint": false
					}
				},
				"secondaryNodeLabelKeys": [

				],
				"isOnlySecondaryNodeLabel": false,
				"description": null,
				"referenceData": "{\\"secondaryNodeLabelKeys\\":[],\\"isOnlySecondaryNodeLabel\\":false}",
				"display": {
					"color": "white",
					"stroke": "black",
					"strokeWidth": 4,
					"x": 200,
					"y": 100,
					"radius": 40,
					"size": "md",
					"width": 80,
					"height": 80,
					"fontSize": 14,
					"fontColor": "black",
					"textLocation": "middle",
					"isLocked": false,
					"glyphs": [

					]
				}
			},
			"Node1": {
				"classType": "NodeLabel",
				"label": "B",
				"fromDataSources": [

				],
				"key": "Node1",
				"indexes": [

				],
				"properties": {
					"Prop3": {
						"key": "Prop3",
						"name": "id",
						"datatype": "Integer",
						"referenceData": "",
						"description": null,
						"fromDataSources": [

						],
						"isPartOfKey": true,
						"isArray": false,
						"isIndexed": true,
						"mustExist": true,
						"hasUniqueConstraint": true
					},
					"Prop4": {
						"key": "Prop4",
						"name": "val",
						"datatype": "String",
						"referenceData": null,
						"description": null,
						"fromDataSources": [

						],
						"isPartOfKey": false,
						"isArray": false,
						"isIndexed": false,
						"mustExist": false,
						"hasUniqueConstraint": false
					}
				},
				"secondaryNodeLabelKeys": [

				],
				"isOnlySecondaryNodeLabel": false,
				"description": null,
				"referenceData": "{\\"secondaryNodeLabelKeys\\":[],\\"isOnlySecondaryNodeLabel\\":false}",
				"display": {
					"color": "white",
					"stroke": "black",
					"strokeWidth": 4,
					"x": 380,
					"y": 100,
					"radius": 40,
					"size": "md",
					"width": 80,
					"height": 80,
					"fontSize": 14,
					"fontColor": "black",
					"textLocation": "middle",
					"isLocked": false,
					"glyphs": [

					]
				},
				"x": 380,
				"y": 100
			}
		},
		"relationshipTypes": {
			"Rel1": {
				"classType": "RelationshipType",
				"key": "Rel1",
				"type": "TO",
				"startNodeLabelKey": "Node0",
				"endNodeLabelKey": "Node1",
				"properties": {
				},
				"referenceData": {
				},
				"description": null,
				"outMinCardinality": "0",
				"outMaxCardinality": "many",
				"inMinCardinality": "0",
				"inMaxCardinality": "many",
				"display": {
					"color": "black",
					"fontSize": 14,
					"strokeWidth": 3,
					"offset": 0,
					"glyph": null
				}
			}
		}
	}
}
`

test('get model from json', () => {
    var dataModel = DataModel();

    var importModelObject = JSON.parse(modelJson);
    dataModel.fromSaveObject(importModelObject.dataModel);
    
    expect(dataModel.getNodeLabelArray().map(x => x.label)).toStrictEqual(['A','B']);
});

test('text export', () => {
    var dataModel = DataModel();

    var importModelObject = JSON.parse(modelJson);
    dataModel.fromSaveObject(importModelObject.dataModel);
    
    let { dataImporterModel } = workbenchDataModelToImporterGraphModel(dataModel);
    // console.log(dataImporterModel);
    // console.log(JSON.stringify(dataImporterModel, null, 2));

    let graphSchema = dataImporterModel.dataModel.graphSchemaRepresentation.graphSchema;
    expect(graphSchema.nodeLabels.length).toBe(2);
    expect(graphSchema.relationshipTypes.length).toBe(1);

    expect(graphSchema.nodeLabels.map(x => x.token)).toStrictEqual(['A','B']);
});

