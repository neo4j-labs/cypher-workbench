
import * as d3 from "d3";
import * as dagre from "dagre";

export const LAYOUTS = {
    FORCE: "Force",
    DAGRE_TOP_BOTTOM: "DagreTopBottom",
    DAGRE_LEFT_RIGHT: "DagreLeftRight"
}

export class LayoutHelper {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            graphCanvas,
            getDataProvider
        } = properties;

        this.graphCanvas = graphCanvas;
        this.getDataProvider = getDataProvider;        
        this.lastLayoutUsed = null;
    }

    getLastLayoutUsed () {
        return this.lastLayoutUsed;
    }

    tick (me) {
        ////console.log("tick called: " + new Date());
        var displayNodes = me.getDataProvider().data().getNodeArray()
        displayNodes.forEach(displayNode => {
            var point = {
                x: displayNode.x,
                y: displayNode.y
            };
            const nodeSvgEl = this.graphCanvas.getD3NodeEl(displayNode);
            me.graphCanvas.updateNodePosition (displayNode, nodeSvgEl, point, true)
        })
    }

    doGridLayout () {
        var displayNodes = this.getDataProvider().data().getNodeArray();
        const numNodesToDisplay = displayNodes.length;

        var marginX = 50;
        var marginY = 50;

        var canvasWidth = this.graphCanvas.getCanvasWidth() - (2 * marginX);
        var canvasHeight = this.graphCanvas.getCanvasHeight() - (2 * marginY);
        const aspectRatio = canvasWidth / canvasHeight;

        // formula to compute number of nodes per row
        // nodesPerRow = sqrt(numNodesToDisplay * aspectRatio)

        // formula to compute number of rows
        // numRows = sqrt(numRowsToDisplay / aspectRatio)

        var numRows = Math.ceil(Math.sqrt(numNodesToDisplay / aspectRatio));
        var gridSizeY = Math.ceil(canvasHeight / numRows);
        
        var numCols = Math.ceil(Math.sqrt(numNodesToDisplay * aspectRatio));
        var gridSizeX = Math.ceil(canvasWidth / numCols);

        for (var i = 0; i < numRows; i++) {
            var currentY = i * gridSizeY + marginY;
            for (var j = 0; j < numCols; j++) {
                var arrayIndex = (numCols * i) + j;
                if (arrayIndex < displayNodes.length) {
                    var currentX = j * gridSizeX + marginX;
                    var displayNode = displayNodes[arrayIndex];
                    displayNode.setX(currentX + Math.floor(gridSizeX / 2));
                    displayNode.setY(currentY + Math.floor(gridSizeY / 2));
                    this.graphCanvas.reRenderNode(displayNode);
                } else {
                    break;
                }
            }
        }
    }

    doForceLayout () {

        var relationships = this.getDataProvider().data().getRelationshipArray();
        var links = [];
        for (var i = 0; i < relationships.length; i++) {
            links.push({
                source: relationships[i].startNodeLabel.key,
                target: relationships[i].endNodeLabel.key
            })
        }

        var simulation = d3.forceSimulation()
            .force("collide", d3.forceCollide().radius(function () { return 40; } ))
            .force("link", d3.forceLink()
                .distance(function () { return 200; })
                .id(function(displayNode) { return displayNode.key; }))
            .force("charge", d3.forceManyBody().strength(function () { return -500; }))
            .force("center", d3.forceCenter(this.graphCanvas.getCanvasWidth() / 2, this.graphCanvas.getCanvasHeight() / 2));

        var displayNodes = this.getDataProvider().data().getNodeArray();
        displayNodes.forEach(displayNode => {
            if (displayNode.isLocked) {
                displayNode.fx = displayNode.x;
                displayNode.fy = displayNode.y;
            }
        });

        // becaause this will be overridden in tick function
        const me = this;
        simulation.nodes(displayNodes).on("tick", function () { this.tick(me) });
        simulation.force("link").links(links);

        setTimeout(function () {
            simulation.stop();

            displayNodes.forEach(displayNode => {
                delete displayNode.fx;
                delete displayNode.fy;
            });

        }, 3000);
    }

    isNullOrUndefined = (variable) => variable === null || variable === undefined;

    /* modified from: https://github.com/dagrejs/dagre/wiki#using-dagre */
    doDagreLayout (direction, options) {
        options = options || {};

        var xOffset = this.isNullOrUndefined(options.xOffset) ? 50 : options.xOffset;
        var yOffset = this.isNullOrUndefined(options.yOffset) ? 50 : options.yOffset;

        var g = new dagre.graphlib.Graph();

        var align = 'DL';
        if (!direction) {
            direction = 'LR';
            this.lastLayoutUsed = LAYOUTS.DAGRE_LEFT_RIGHT;
        }

        if (direction === LAYOUTS.DAGRE_LEFT_RIGHT) {
            direction = 'LR';
            this.lastLayoutUsed = LAYOUTS.DAGRE_LEFT_RIGHT;
        } else if (direction === LAYOUTS.DAGRE_TOP_BOTTOM) {
            direction = 'TB';
            this.lastLayoutUsed = LAYOUTS.DAGRE_TOP_BOTTOM;
        }

        // Set an config for the layout
        g.setGraph({rankdir: direction, align: align, nodesep: 100, ranksep: 100, edgesep: 30, marginx: 0, marginy: 0});

        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() { return {}; });

        // Add nodes to the graph. The first argument is the displayNode id. The second is
        // metadata about the displayNode.
        var nodeArray = this.getDataProvider().data().getNodeArray();
        var lockedNodes = nodeArray.filter(x => x.isLocked);
        nodeArray.forEach(displayNode => {
            displayNode.x = displayNode.x === undefined || displayNode.x === null ? 100 : displayNode.x;
            displayNode.y = displayNode.y === undefined || displayNode.y === null ? 100 : displayNode.y;
            displayNode.origx = displayNode.x;
            displayNode.origy = displayNode.y;
            g.setNode(displayNode.key, displayNode);
        });

        var relationshipArray = this.getDataProvider().data().getRelationshipArray();
        relationshipArray.forEach(relationship => {
            g.setEdge(relationship.startDisplayNode.key, relationship.endDisplayNode.key);
        })
        // this updates displayNode.x and .y
        dagre.layout(g);
        //var output = dagre.layout(g);

        // get bbox
        var minX = 100000, minY = 100000, maxX = 0, maxY = 0;
        const svgRootGroupEl = this.graphCanvas.getSvgRootGroupEl();
        svgRootGroupEl.selectAll(".node").each(function (displayNode) {
            if (displayNode.x < minX) {
                minX = displayNode.x;
            }
            if (displayNode.y < minY) {
                minY = displayNode.y;
            }
            if (displayNode.x > maxX) {
                maxX = displayNode.x;
            }
            if (displayNode.y > maxY) {
                maxY = displayNode.y;
            }
        });
        //var xOffset = (this.graphCanvas.getCanvasWidth() - (maxX - minX)) / 2 - minX;        
        //var yOffset = (this.graphCanvas.getCanvasHeight() - (maxY - minY)) / 2 - minY;

        ////console.log("minX: " + minX + ", minY: " + minY + ", maxX: " + maxX + ", maxY: " + maxY);
        ////console.log("xOffset " + xOffset + ", yOffset: " + yOffset);

        // update displayNode positions
        nodeArray.forEach(displayNode => {
            if (!displayNode.isLocked) {
                // compute closest lockedNodeLabel
                var minDistance = -1;
                var closestLockedNode = null;
                lockedNodes.forEach(lockedNodeLabel => {
                    var xDistance = Math.abs(displayNode.x - lockedNodeLabel.origx);
                    var yDistance = Math.abs(displayNode.y - lockedNodeLabel.origy);
                    var distance = Math.sqrt(Math.pow(xDistance,2) + Math.pow(yDistance,2));
                    //console.log('distance between ' + displayNode.label + ' and ' + lockedNodeLabel.label + ' is ' + distance);
                    if (minDistance === -1 || distance < minDistance) {
                        //console.log('updating minDistance');
                        minDistance = distance;
                        closestLockedNode = lockedNodeLabel;
                    }
                })
                //console.log(displayNode.label + ' is closest to ' + closestLockedNode.label);
                displayNode.closestLockedNode = closestLockedNode;
            }
        });

        const animationSettings = {
            animationDuration: 600,
            animationEasing: d3.easeExpOut
        }
        
        nodeArray.forEach(displayNode => {
            if (!displayNode.isLocked) {
                var point;
                if (lockedNodes.length > 0 && displayNode.closestLockedNode) {
                    //var xDistanceThird = Math.floor((displayNode.x - displayNode.closestLockedNode.x) / 3);
                    //var yDistanceThird = Math.floor((displayNode.y - displayNode.closestLockedNode.y) / 3);
                    //console.log(`${displayNode.label}: laying out with randomness`);
                    point = {
                        x: displayNode.x - 
                            (displayNode.closestLockedNode.origx - displayNode.closestLockedNode.x),
                        y: displayNode.y -
                            (displayNode.closestLockedNode.origy - displayNode.closestLockedNode.y)
                    }
                } else {
                    //console.log(`${displayNode.label}: laying out not random`);
                    point = {
                        x: displayNode.x + xOffset,
                        y: displayNode.y + yOffset
                    };
                }
                var renderedNode = this.graphCanvas.getD3NodeEl(displayNode);                        
                if (renderedNode && renderedNode.node()) {
                    this.graphCanvas.updateNodePosition (displayNode, renderedNode.node(), point, null, animationSettings);
                } else {
                    displayNode.x = point.x;
                    displayNode.y = point.y;
                }
            }
        });

        nodeArray.forEach(displayNode => {
            if (displayNode.isLocked) {
                var point = {
                    x: displayNode.origx,
                    y: displayNode.origy
                };
                var renderedNode = this.graphCanvas.getD3NodeEl(displayNode);  
                if (renderedNode && renderedNode.node()) {
                    this.graphCanvas.updateNodePosition (displayNode, renderedNode.node(), point);
                } else {
                    displayNode.x = point.x;
                    displayNode.y = point.y;
                }
            }
        });

        nodeArray.forEach(displayNode => {
            delete displayNode.origx;
            delete displayNode.origy;
            if (!displayNode.isLocked) {
                delete displayNode.closestLockedNode;
            }
        });

        var diagramSizeX = maxX - minX;
        var diagramSizeY = maxY - minY;
        /*
        if (diagramSizeX > canvasWidth || diagramSizeY > canvasHeight) {
            //zoomToFit (diagramSizeX, diagramSizeY / 2, diagramSizeX, diagramSizeY);
        }*/
        return {
            diagramWidth: diagramSizeX,
            diagramHeight: diagramSizeY,
            canvasWidth: this.graphCanvas.getCanvasWidth(),
            canvasHeight: this.graphCanvas.getCanvasHeight()
        }
    }

}
