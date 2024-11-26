
import * as d3 from "d3";
import chroma from 'chroma-js';

import DataModel from '../../../dataModel/dataModel';
import { snap } from '../../../components/canvas/d3/helpers.js';

// from https://github.com/gka/chroma.js/issues/213
export function closestColor(needle, haystack) {
  return haystack
    .map((straw) => [chroma.distance(needle, straw), straw]) // become [distance, color]
    .sort((a, b) => a[0]-b[0])[0][1]; // pick first (closest), pick the color part ([1])
}

function getDataType(dataModel, propertyValue) {
    var dataType;
    var floatResult = parseFloat(propertyValue);
    if (!isNaN(floatResult)) {
        // both parseFloat and parseInt will parse either type
        // however, parseInt will truncate a float to an int like 1.1 => 1
        var intResult = parseInt(propertyValue);
        if (intResult === floatResult) {
            // then it is an integer
            dataType = dataModel.DataTypes.Integer;
        } else {
            dataType = dataModel.DataTypes.Float;
        }
    } else if (propertyValue && (propertyValue.toLowerCase() === 'true' || propertyValue.toLowerCase() === 'false')) {
        dataType = dataModel.DataTypes.Boolean;
    } else {
        dataType = dataModel.DataTypes.String;
    }
    return dataType;
}


function addProperties (dataModel, propertyContainer, properties, dataTypeMap) {
    Object.keys(properties).map(propName => {
        if (propName) {
            var propValue = properties[propName];
            var dataType = dataTypeMap[propValue.toLowerCase()];
            var refData = null;
            if (!dataType) {
                dataType = getDataType(dataModel, propValue);
                refData = propValue;
            }
            var propertyMap = {
                key: null, 
                name: propName, 
                datatype: dataType, 
                referenceData: refData
            }
            propertyContainer.addOrUpdateProperty (propertyMap);
        }
    });
}

export function getDataModelFromArrows (arrowsJSON, canvasDimensions) {
    var dataModel = DataModel();
    canvasDimensions = canvasDimensions || { width: 1200, height: 700 };

    if (arrowsJSON) {
        var style = (arrowsJSON.graph) ? arrowsJSON.graph.style : arrowsJSON.style;
        var sizeScale = d3.scaleQuantize()
            .domain([0, 100])
            .range(['x_sm','sm','md','lg','x_lg']);

        var colors = ["#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0",
                "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
                "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b",
                "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];

        var defaultSize, defaultColor;
        if (style) {
            defaultSize = sizeScale(style.radius);
            defaultColor = closestColor(style['node-color'], colors);
        }

        var dataTypeMap = {};
        Object.values(dataModel.DataTypes).map(dataType => {
            dataTypeMap[dataType.toLowerCase()] = dataType;
        });

        var nodes = (arrowsJSON.graph) ? arrowsJSON.graph.nodes : arrowsJSON.nodes;

        // process nodes
        if (nodes) {
            var nodeSize, nodeColor;
            var nodeLabelIdMap = {};

            var anyLabels = nodes.some(n => n.labels && n.labels.length > 0);

            var xValues = nodes.map(n => n.position.x).sort((a,b) => a - b);
            var yValues = nodes.map(n => n.position.y).sort((a,b) => a - b);
            var left = (xValues.length > 0) ? xValues[0] : 0;            
            var right = (xValues.length > 0) ? xValues[xValues.length - 1] : 0;            
            var top = (yValues.length > 0) ? yValues[0] : 0;
            var bottom = (yValues.length > 0) ? yValues[yValues.length - 1] : 0;
            //var offsetX = (canvasDimensions.width - (right - left)) / 2;
            //var offsetY = (canvasDimensions.height - (bottom - top)) / 2;
            var offsetX = 0 - left / 2 + ((canvasDimensions.width - right) / 2) - 100;
            var offsetY = 0 - top / 2 + ((canvasDimensions.height - bottom) / 2) - 100;

            nodes.map(n => {
                var color = (n.style['node-color']) ? closestColor(n.style['node-color'], colors) : defaultColor;
                var point = snap(n.position.x, n.position.y);

                var extraText = (n.caption) ? `-${n.caption}` : '';
                var primaryNodeLabel = `Unlabeled-${n.id}${extraText}`;
                var secondaryNodeLabels = [];
                var description = null;

                if (anyLabels) {
                    description = (n.caption) ? n.caption : '';
                    primaryNodeLabel = (n.labels && n.labels.length > 0) ? n.labels[0] : primaryNodeLabel;
                    secondaryNodeLabels = (n.labels && n.labels.length > 1) ? n.labels.slice(1) : [];
                } else {
                    primaryNodeLabel = (n.caption) ? n.caption : primaryNodeLabel;
                }

                var display = new dataModel.NodeLabelDisplay({
                   x: point.x + offsetX,
                   y: point.y + offsetY,
                   size: (n.style.radius) ? sizeScale(n.style.radius) : defaultSize
                });
                display.setColor(color);

                var nodeLabel = dataModel.getNodeLabelByLabel(primaryNodeLabel);
                if (!nodeLabel) {
                    nodeLabel = new dataModel.NodeLabel({
                        label: primaryNodeLabel,
                        description: description,
                        display: display
                    });
                    dataModel.addNodeLabel(nodeLabel);
                } 
                nodeLabelIdMap[n.id] = nodeLabel;                
                if (secondaryNodeLabels.length > 0) {
                    dataModel.ensureSecondaryNodeLabels (nodeLabel, secondaryNodeLabels, dataModel);
                }
                nodeLabel.setIsOnlySecondaryNodeLabel(false, true);            

                addProperties(dataModel, nodeLabel, n.properties, dataTypeMap);
            });
        }

        var relationships = (arrowsJSON.graph) ? arrowsJSON.graph.relationships : arrowsJSON.relationships;

        // process relationships
        if (relationships) {
            relationships.map(r => {
                var startNodeLabel = nodeLabelIdMap[r.fromId];
                var endNodeLabel = nodeLabelIdMap[r.toId];
                var properties = {
                    type: r.type,
                    startNodeLabel: startNodeLabel,
                    endNodeLabel: endNodeLabel
                }
                var relationshipType = new dataModel.RelationshipType(properties);
                dataModel.addRelationshipType(relationshipType);

                addProperties(dataModel, relationshipType, r.properties, dataTypeMap);
            });
        }

    }
    return dataModel;
}
