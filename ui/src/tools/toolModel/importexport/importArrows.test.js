
import * as d3 from "d3";

import {
    getNodeLabels,
    verifyNodeLabelProperties,
    verifyRelationshipTypeProperties,
    verifyProperty
} from '../../../common/test/testHelper';

import { getDataModelFromArrows, closestColor } from './importArrows';

var sampleArrowsJSONExport = `
{
	"graph": {
		"style": {
			"radius": 50,
			"node-color": "#47a8dc",
			"border-width": 0,
			"border-color": "#000000",
			"caption-color": "#ffffff",
			"caption-font-size": 10,
			"caption-font-weight": "normal",
			"property-color": "#000000",
			"property-font-size": 8,
			"arrow-width": 1,
			"arrow-color": "#000000"
		},
		"nodes": [
			{
				"id": "n0",
				"position": {
					"x": 295.57801620522446,
					"y": 175.34264168681202
				},
				"caption": "A",
				"style": {
				},
				"properties": {
				}
			},
			{
				"id": "n1",
				"position": {
					"x": 578,
					"y": 175.34264168681202
				},
				"caption": "B",
                "style": {
					"border-color": "#fb9e00",
					"border-width": 2,
					"property-font-size": 12,
					"radius": 30,
					"caption-font-weight": "bold",
					"caption-font-size": 14,
					"caption-color": "#cccccc"
				},
				"properties": {
					"abc": "def",
					"def": "Integer"
				}
			},
			{
				"id": "n2",
				"position": {
					"x": 578,
					"y": 412
				},
				"caption": "C",
				"style": {
				},
				"properties": {
				}
			},
			{
				"id": "n3",
				"position": {
					"x": 295.57801620522446,
					"y": 412
				},
				"caption": "D",
				"style": {
				},
				"properties": {
				}
			},
			{
				"id": "n4",
				"position": {
					"x": 444.28900810261223,
					"y": 292.671320843406
				},
				"caption": "E",
				"style": {
				},
				"properties": {
				}
			},
			{
				"id": "n5",
				"position": {
					"x": 161.8670243078367,
					"y": 292.671320843406
				},
				"caption": "F",
				"style": {
				},
				"properties": {
				}
			}
		],
		"relationships": [
			{
				"id": "n0",
				"type": "TO",
				"style": {
				},
				"properties": {
                    "abc": "def",
                    "def": "Integer"
				},
				"fromId": "n0",
				"toId": "n1"
			},
			{
				"id": "n1",
				"type": "",
				"style": {
				},
				"properties": {
				},
				"fromId": "n1",
				"toId": "n2"
			},
			{
				"id": "n2",
				"type": "",
				"style": {
				},
				"properties": {
				},
				"fromId": "n2",
				"toId": "n3"
			},
			{
				"id": "n3",
				"type": "",
				"style": {
				},
				"properties": {
				},
				"fromId": "n3",
				"toId": "n4"
			},
			{
				"id": "n4",
				"type": "",
				"style": {
				},
				"properties": {
				},
				"fromId": "n4",
				"toId": "n5"
			}
		]
	},
	"gangs": [

	]
}
`;

var sampleArrows20JSONExport = `
{
	"style": {
	  "node-color": "#4C8EDA",
	  "border-width": 0,
	  "border-color": "#000000",
	  "radius": 75,
	  "node-padding": 4,
	  "outside-position": "auto",
	  "caption-position": "inside",
	  "caption-max-width": 200,
	  "caption-color": "#ffffff",
	  "caption-font-size": 20,
	  "caption-font-weight": "normal",
	  "label-position": "inside",
	  "label-color": "#000000",
	  "label-background-color": "#ffffff",
	  "label-border-color": "#848484",
	  "label-border-width": 3,
	  "label-font-size": 20,
	  "label-padding": 5,
	  "label-margin": 4,
	  "directionality": "directed",
	  "detail-position": "above",
	  "detail-orientation": "parallel",
	  "arrow-width": 3,
	  "arrow-color": "#848484",
	  "margin-start": 5,
	  "margin-end": 5,
	  "margin-peer": 20,
	  "attachment-start": "normal",
	  "attachment-end": "normal",
	  "type-color": "#848484",
	  "type-background-color": "#ffffff",
	  "type-border-color": "#848484",
	  "type-border-width": 0,
	  "type-font-size": 21,
	  "type-padding": 5,
	  "property-position": "outside",
	  "property-color": "#848484",
	  "property-font-size": 20,
	  "property-font-weight": "normal"
	},
	"nodes": [
	  {
		"id": "n0",
		"position": {
		  "x": -237.9248046875,
		  "y": -190
		},
		"caption": "Baz",
		"style": {
		  "radius": 20,
		  "node-color": "#d33115"
		},
		"labels": [],
		"properties": {}
	  },
	  {
		"id": "n1",
		"position": {
		  "x": -237.9248046875,
		  "y": -398.2680064244146
		},
		"caption": "Foo",
		"style": {},
		"labels": [],
		"properties": {}
	  },
	  {
		"id": "n2",
		"position": {
		  "x": 598.7631898935344,
		  "y": -398.2680064244146
		},
		"caption": "Word wrapping? does it exist? Yes.",
		"style": {
		  "property-position": "outside",
		  "property-font-size": 16
		},
		"labels": [
		  "Node",
		  "Is there word wrapping?"
		],
		"properties": {
		  "id": "123",
		  "qux": "something"
		}
	  },
	  {
		"id": "n3",
		"position": {
		  "x": 598.7631898935344,
		  "y": -190,
		  "voronoiId": 1
		},
		"caption": "Another",
		"style": {},
		"labels": [
		  "Foo"
		],
		"properties": {}
	  },
	  {
		"id": "n4",
		"position": {
		  "x": 237.75561838426722,
		  "y": -190,
		  "voronoiId": 0
		},
		"caption": "Node",
		"style": {
		  "caption-position": "inside",
		  "node-color": "#68bc00",
		  "radius": 30,
		  "border-width": 3
		},
		"labels": [
		  "Foo"
		],
		"properties": {}
	  },
	  {
		"id": "n5",
		"position": {
		  "x": -0.0845931516163887,
		  "y": -190
		},
		"caption": "Standalone",
		"style": {},
		"labels": [],
		"properties": {}
	  }
	],
	"relationships": [
	  {
		"id": "n0",
		"type": "REL",
		"style": {},
		"properties": {},
		"fromId": "n0",
		"toId": "n1"
	  },
	  {
		"id": "n2",
		"type": "RELATIONSHIP_BETWEEN_FOO_AND_OTHER",
		"fromId": "n2",
		"toId": "n1",
		"style": {
		  "property-position": "outside"
		},
		"properties": {
		  "prop1": "val1",
		  "prop2": "val2",
		  "prop3": "val3"
		}
	  },
	  {
		"id": "n3",
		"type": "",
		"style": {},
		"properties": {},
		"fromId": "n2",
		"toId": "n3"
	  },
	  {
		"id": "n4",
		"type": "",
		"style": {},
		"properties": {},
		"fromId": "n3",
		"toId": "n4"
	  }
	]
  }
`;

test('d3 scale quantize radius', () => {
    var radius = d3.scaleQuantize()
        .domain([0, 100])
        .range(['x_sm','sm','md','lg','x_lg']);

    expect(radius(50)).toBe('md');
    expect(radius(100)).toBe('x_lg');
    expect(radius(110)).toBe('x_lg');
});

test('chroma find closest color', () => {
    var colors = ["#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0",
            "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
            "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b",
            "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];

    expect(closestColor("#ff0000", colors)).toBe("#ff5722");
    expect(closestColor("#00ff00", colors)).toBe("#8bc34a");
    expect(closestColor("#111111", colors)).toBe("#000000");
    expect(closestColor("#eeeeee", colors)).toBe("#ffffff");
});

test('import neo4j-arrows.appspot.com', () => {
    var arrowsJSON = JSON.parse(sampleArrowsJSONExport);
    var dataModel = getDataModelFromArrows(arrowsJSON);

    expect(getNodeLabels(dataModel)).toStrictEqual(['A','B','C','D','E','F']);
    verifyNodeLabelProperties(dataModel, 'B', { abc: "def", def: "Integer" });

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(5);
    expect(relationshipTypes[0].type).toBe('TO');
    expect(relationshipTypes[0].startNodeLabel.label).toBe('A');
    expect(relationshipTypes[0].endNodeLabel.label).toBe('B');
    verifyRelationshipTypeProperties (dataModel, relationshipTypes[0], { abc: "def", def: "Integer" })

});

test('import https://arrows.app/', () => {
    var arrowsJSON = JSON.parse(sampleArrows20JSONExport);
	var dataModel = getDataModelFromArrows(arrowsJSON);

	var sortedNodeLabels = getNodeLabels(dataModel).sort();
	expect(sortedNodeLabels).toStrictEqual(['Foo','Is there word wrapping?','Node','Unlabeled-n0-Baz','Unlabeled-n1-Foo','Unlabeled-n5-Standalone']);

	verifyNodeLabelProperties(dataModel, 'Node', { id: "123", qux: "something" });

    var relationshipTypes = dataModel.getRelationshipTypeArray();
    expect(relationshipTypes.length).toBe(4);
    expect(relationshipTypes[0].type).toBe('REL');
	expect(relationshipTypes[0].startNodeLabel.label).toBe('Unlabeled-n0-Baz');
	expect(relationshipTypes[0].startNodeLabel.description).toBe('Baz');
	expect(relationshipTypes[0].endNodeLabel.label).toBe('Unlabeled-n1-Foo');
	expect(relationshipTypes[0].endNodeLabel.description).toBe('Foo');

    expect(relationshipTypes[1].type).toBe('RELATIONSHIP_BETWEEN_FOO_AND_OTHER');
	expect(relationshipTypes[1].startNodeLabel.label).toBe('Node');
	expect(relationshipTypes[1].startNodeLabel.description).toBe('Word wrapping? does it exist? Yes.');
	expect(relationshipTypes[1].endNodeLabel.label).toBe('Unlabeled-n1-Foo');
	expect(relationshipTypes[1].endNodeLabel.description).toBe('Foo');
	
	verifyRelationshipTypeProperties (dataModel, relationshipTypes[1], { prop1: "val1", prop2: "val2", prop3: "val3" })
});
