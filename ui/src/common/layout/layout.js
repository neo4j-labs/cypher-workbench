// this file is the same in both ui and api 

import * as dagre from "dagre";

const LAYOUTS = {
    FORCE: "Force",
    DAGRE_TOP_BOTTOM: "DagreTopBottom",
    DAGRE_LEFT_RIGHT: "DagreLeftRight"
}

const DefaultCanvasSize = {
    Width: 1400,
    Height: 700
}

const DefaultLayoutConfig = {
    rankdir: 'LR', 
    align: 'DL', 
    nodesep: 120, // was 100
    ranksep: 180, // was 100
    edgesep: 30,  // was 30
    marginx: 0, 
    marginy: 0
}

export function getNodeLabelArray (dataModel) {
    return dataModel.getNodeLabelArray()
        .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel);
}

function getLayoutConfig (layoutConfig) {
    layoutConfig = layoutConfig || {};

    if (layoutConfig.direction == 'side') {
        layoutConfig.direction = 'LR';
    } else if (layoutConfig.direction == 'top') {
        layoutConfig.direction = 'TB';
    }

    layoutConfig = {
        ...DefaultLayoutConfig,
        ...layoutConfig
    }
    return layoutConfig;
}

// this mutates the nodeLabel.display.x and .y of node labels within dataModel
export function doDagreLayout (dataModel, layoutConfig) {
    var g = new dagre.graphlib.Graph();

    layoutConfig = getLayoutConfig(layoutConfig);

    // Set an config for the layout
    g.setGraph(layoutConfig);

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    // Add nodes to the graph. The first argument is the node id. The second is
    // metadata about the node.
    var nodeLabelArray = getNodeLabelArray(dataModel);
    nodeLabelArray.map(nodeLabel => {
        g.setNode(nodeLabel.key, nodeLabel.display);
    });

    var relationshipTypeArray = dataModel.getRelationshipTypeArray();
    relationshipTypeArray.map(relationshipType => {
        g.setEdge(relationshipType.startNodeLabel.key, relationshipType.endNodeLabel.key);
    })
    // this updates nodeLabel.display.x and .y
    dagre.layout(g);

    // attempt to center layout
    var minX = 100000, minY = 100000, maxX = 0, maxY = 0;
    nodeLabelArray.forEach(function (nodeLabel) {
        if (nodeLabel.display.x < minX) {
            minX = nodeLabel.display.x;
        }
        if (nodeLabel.display.y < minY) {
            minY = nodeLabel.display.y;
        }
        if (nodeLabel.display.x > maxX) {
            maxX = nodeLabel.display.x;
        }
        if (nodeLabel.display.y > maxY) {
            maxY = nodeLabel.display.y;
        }
    });
    var xOffset = (DefaultCanvasSize.Width - (maxX - minX)) / 2 - minX;
    var yOffset = (DefaultCanvasSize.Height - (maxY - minY)) / 2 - minY;

    nodeLabelArray.forEach(function (nodeLabel) {
        nodeLabel.display.x = nodeLabel.display.x + xOffset;
        nodeLabel.display.y = nodeLabel.display.y + yOffset;
    });
}
