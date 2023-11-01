
/*
* Note:
* This was the first canvas that existed prior to graphCanvas
* An effort was made to refactor this very large file into many subcomponents 
* when migrating to graphCanvas. However, the migration never fully finished
* so there is duplicate or similar code in this file with several other files
* related to graphCanvas
* 
* Since the migration never finished, both this file and graphCanvas are both used,
* but by different user-facing tools
*/

import * as d3 from "d3";
import * as $ from "jquery";
import * as dagre from "dagre";

import { ERROR_MESSAGES, validateText } from '../../../dataModel/dataValidation';
import { DataChangeType } from '../../../dataModel/dataModel';
import { USER_ROLE } from '../../../common/Constants';
import { isFeatureLicensed, FEATURES } from '../../../common/LicensedFeatures';
import SecurityRole from '../../../tools/common/SecurityRole';

/*
import {
    ORIENTATION,
    addAnnotation,
    hasAnnotation,
    removeAnnotation,
    updateAnnotationText,
    updateAnnotationPosition
} from './annotation.js';
*/
import { ORIENTATION, GraphCanvasAnnotation } from './graphCanvasAnnotation';
import { ORIENTATION as GLYPH_ORIENTATION, GraphCanvasGlyph } from './graphCanvasGlyph';
import {
    lineIntersectsWithRectangle,
    rectanglesIntersect,
    snap,
    setNewNodeLabelPosition
} from './helpers.js';
import { GRID_CONFIG, drawGrid, removeGrid } from './grid.js';

var dataModelCanvasCounter = 1;

const pxVal = (px) => (typeof(px) === 'string') ? parseFloat(px.replace(/px$/,'')) : px;

export const RELATIONSHIP_DISPLAY = {
    NORMAL: "normal",
    MEDIUM: "medium",
    LIGHT: "light"
}

export const SECONDARY_NODE_LABEL_DISPLAY = {
    CONCATENATE_LABEL: "concatenateLabel",
    SHOW_IN_ANNOTATION: "showInAnnotation",
    HIDE: "hide"
}

export const CANVAS_MESSAGES = {
    CURRENT_SELECTED_ITEMS: "currentSelectedItems",
    SELECTION_ADDED: "selectionAdded",
    SELECTION_REMOVED: "selectionRemoved",
    NODE_MOVED: "nodeMoved",
    ADD_NEW_RELATIONSHIP_TYPE: "addNewRelationshipType",
    UPDATE_NODE_LABEL: "updateNodeLabel"
}

export const CONTAINER_CALLBACK_MESSAGES = {
    SHOW_PROPERTIES: 'showProperties',
    SHOW_RELATIONSHIP_CARDINALITY: 'showRelationshipCardinality',
    REQUEST_EDIT: 'requestEdit',
    PROMPT_USER: 'promptUser'
}

export default function DataModelCanvas () {

    var dataModelCanvasInstanceNumber = dataModelCanvasCounter;
    dataModelCanvasCounter++;

    // Set2 from https://github.com/gka/chroma.js/blob/master/src/colors/colorbrewer.coffee
    // http://colorbrewer2.org/#type=qualitative&scheme=Set2&n=8
    var dataSourceColors = ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'];
    var dataSourceColorMap = {};
    var selections = {};
    var altSelections = {};

    var MODES = {
        NORMAL: "NORMAL",
        CONNECT: "CONNECT",
        SELECT: "SELECT",
        MULTI_SELECT: "MULTI_SELECT"
    }

    var DATA_SOURCE_GLYPH_OFFSET = 18;

    var ID_PREFIXES = {
        RELATIONSHIP_TYPE: "relationshiptype_",
        NODE_LABEL: "nodelabel_"
    }

    var LAYOUTS = {
        FORCE: "Force",
        DAGRE_TOP_BOTTOM: "DagreTopBottom",
        DAGRE_LEFT_RIGHT: "DagreLeftRight"
    }
    var lastLayoutUsed = null;

    //var mode = MODES.NORMAL;
    var mode = MODES.SELECT;
    var svg_main;
    var svg;
    var dataModelInstance;
    var containerCallback;  // a reference to a callback function provided by the container
    var dragEnabled = true;
    var canvasParentElement;
    var canvasWidth;
    var canvasHeight;
    var linkMap = {};
    var textMap = {};
    var listeners = [];
    var arrowDomId;
    var textDimensionHelperDomId;
    var gridDisplayed = false;
    var snapToGrid = true;
    var showArrows = true;
    var displayAnnotations = true;
    var relationshipDisplay = RELATIONSHIP_DISPLAY.NORMAL;
    var secondaryNodeLabelDisplay = SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION;
    var graphCanvasAnnotation;
    var graphCanvasGlyph;

    var containerNodeLabelClick;
    var containerRelationshipTypeClick;

    var markerWidth = 4;
    var markerHeight = 4;
    var lineGap = 5;
    var hoverCircleRadiusIncrease = 20;

    var nodeLabelAnnotationOffset = 5;  // for node Labels
    var annotationXOffsetDefault = 2;  // for relationship types
    var annotationYOffsetDefault = 2;

    var zoom;
    var MAX_ZOOM_IN = 2.0;
	var MAX_ZOOM_OUT = 0.2;

    var shiftDown = false;
    var ctrlDown = false;

    function initCanvas (parentElementId, arrowDomIdVar) {
        arrowDomId = arrowDomIdVar;
        canvasParentElement = $("#" + parentElementId);
        canvasWidth = canvasParentElement.width();
        if (canvasWidth < 800) {
            canvasWidth = 800;
        }
        canvasHeight = canvasParentElement.height();

        //console.log("canvasWidth: " + canvasWidth);
        //console.log("canvasHeight: " + canvasHeight);

        zoom = d3.zoom().scaleExtent([MAX_ZOOM_OUT, MAX_ZOOM_IN]).on('zoom', zoomed);
        svg_main = d3.select("#" + parentElementId).append("svg")
            .attr("width", canvasWidth)
            .attr("height", canvasHeight)
            .on("click", function () {
                //console.log('canvas click: removeNodeArcs');
                clearSelections();
                removeAllNodeArcs();
                removeAllRelRibbons();
                dragEnabled = true;
            })
            .on("mouseup", function() { dragEnabled = true; })
            .call(d3.drag()
                .clickDistance(4)
                .on("start", canvasDragstarted)
                .on("drag", canvasDragged)
                .on("end", canvasDragended));
            /*
            .style("transform-origin", "50% 50% 0")
            .call(zoom).on("dblclick.zoom", null); */

        setupArrowDefinitions();
        svg = svg_main.append("g");
        svg.append("g")
            .attr("class", "grid");

        textDimensionHelperDomId =`${parentElementId}_textDimensionHelper`;
        svg_main.append('text')
            .attr("pointer-events", "none")
            //.attr("text-anchor", "middle")
            //.attr("alignment-baseline", "central")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", function (nodeLabel) { return 14; }) // TODO: don't hardcode this
            //.attr('display','none')
            .append('tspan')
            .attr('id', textDimensionHelperDomId)
            .text('')

        graphCanvasAnnotation = new GraphCanvasAnnotation({
            textDimensionHelperDomId: textDimensionHelperDomId,
            pixelEmHelperDomId: 'pixelEmHelper'
        });            

        graphCanvasGlyph = new GraphCanvasGlyph({
            textDimensionHelperDomId: textDimensionHelperDomId,
            pixelEmHelperDomId: 'pixelEmHelper'
        });

        var handleKeys = (e, eventType) => {
            shiftDown = (e.shiftKey) ? true : false;
            ctrlDown = (e.ctrlKey || e.metaKey) ? true : false;

            // 8 = backspace, 46 = delete
            /* DON'T UNCOMMENT THIS UNLESS YOU ADD A LOT MORE CHECKING.
                Right now if you hit the backspace key in a properties text box it deletes the node
                This is not good
            if (eventType === 'keydown' && (e.keyCode === 8 || e.keyCode === 46)) {
                deleteSelectedItems();
            }*/


            /*
            if (!shiftDown) {
                deleteSelectionRect();
            }
            */
            //console.log(e);
        }

        window.addEventListener('keydown', (e) => handleKeys(e, 'keydown'));
        window.addEventListener('keyup', (e) => handleKeys(e));
    }

    function getCanvasDimensions () {
        return {
            width: canvasWidth,
            height: canvasHeight
        }
    }

    const setContainerNodeLabelClick = (containerNodeLabelClickVar) => containerNodeLabelClick = containerNodeLabelClickVar;
    const setContainerRelationshipTypeClick = (containerRelationshipTypeClickVar) => containerRelationshipTypeClick = containerRelationshipTypeClickVar;

    const setShowArrows = (showArrowsLocal) => showArrows = showArrowsLocal;
    const getShowArrows = () => showArrows;

    function showGrid () {
        var gridSvg = svg.select('.grid');
        drawGrid(gridSvg, canvasWidth, canvasHeight);
        gridDisplayed = true;
    }

    function hideGrid () {
        var gridSvg = svg.select('.grid');
        removeGrid(gridSvg);
        gridDisplayed = false;
    }

    function setSnapToGrid (snapToGridVar) {
        snapToGrid = snapToGridVar;
    }

    function getSnapToGrid () {
        return snapToGrid;
    }

    function setSecondaryNodeLabelDisplay (value) {
        // for now, this will be a toggle instead of a 3-way state
        console.log(`setSecondaryNodeLabelDisplay value = ${value}`);
        if (value === true || value === undefined) {
            secondaryNodeLabelDisplay = SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION;
        } else {
            secondaryNodeLabelDisplay = SECONDARY_NODE_LABEL_DISPLAY.HIDE;
        }

        if (displayAnnotationBubble()) {
            // add any annotations that should be there
            handleDisplayNodeLabelAnnotations();
            if (displayAnnotations) {
                handleDisplayRelationshipTypeAnnotations();
            } else {
                removeAllRelationshipTypeAnnotations();
            }
        } else {
            // remove any annotations that are present
            removeAllNodeLabelAnnotations();
            removeAllRelationshipTypeAnnotations();
        }

        /*
        if (!Object.values(SECONDARY_NODE_LABEL_DISPLAY).includes(value)) {
            // default
            secondaryNodeLabelDisplay = SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION;
        } else {
            secondaryNodeLabelDisplay = value;
        }*/
    }

    function getSecondaryNodeLabelDisplay () {
        return secondaryNodeLabelDisplay;
    }

    function setRelationshipDisplay (value) {
        if (value !== RELATIONSHIP_DISPLAY.LIGHT && value !== RELATIONSHIP_DISPLAY.MEDIUM) {
            relationshipDisplay = RELATIONSHIP_DISPLAY.NORMAL;
        } else {
            relationshipDisplay = value;
        }
    }

    function getRelationshipDisplaySettings () {
        var settings = {};
        switch (relationshipDisplay) {
            case RELATIONSHIP_DISPLAY.MEDIUM:
                settings = { color: 'gray', strokeWidth: '2' }
                break;
            case RELATIONSHIP_DISPLAY.LIGHT:
                settings = { color: 'lightgray', strokeWidth: '1' }
                break;
            case RELATIONSHIP_DISPLAY.NORMAL:
            default:
                settings = { color: 'black', strokeWidth: '3' }
                break;
        }
        return settings;
    }

    function setDisplayAnnotations (displayAnnotationsVar) {
        console.log(`setDisplayAnnotations value: ${displayAnnotationsVar}`);
        if (displayAnnotations !== displayAnnotationsVar) {
            displayAnnotations = displayAnnotationsVar;

            if (displayAnnotationBubble()) {
                // add any annotations that should be there
                handleDisplayNodeLabelAnnotations();
                if (displayAnnotations) {
                    handleDisplayRelationshipTypeAnnotations();
                } else {
                    removeAllRelationshipTypeAnnotations();
                }
            } else {
                // remove any annotations that are present
                removeAllNodeLabelAnnotations();
                removeAllRelationshipTypeAnnotations();
            }
        }
    }

    function displayAnnotationBubble () {
        return (displayAnnotations || secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION);
    }

    function getDisplayAnnotations () {
        return displayAnnotations;
    }

    function clearSearch () {
        clearSelections();
    }

    function performSearch (type, nodeLabelText, relationshipTypeText, endNodeLabelText) {
        clearSelections();
        var nodeLabels = dataModelInstance.getNodeLabelsByLabel(nodeLabelText);
        if (nodeLabels && nodeLabels.length > 0) {
            if (type === 'NodeLabel') {
                nodeLabels.map(nodeLabel => addNodeSelection(getD3NodeEl(nodeLabel).node(), nodeLabel));
                panTo(nodeLabels[0]);
            } else if (type === 'RelationshipType') {
                var relationshipType = dataModelInstance.getRelationshipType (relationshipTypeText, nodeLabelText, endNodeLabelText);
                if (!relationshipType) {
                    // special case where '' from regex doesn't match null of relationshipType, so we check for this case
                    relationshipType = dataModelInstance.getRelationshipType (null, nodeLabelText, endNodeLabelText);
                }
                if (relationshipType) {
                    addRelSelection(getD3RelEl(relationshipType).node(), relationshipType);
                    panTo(relationshipType);
                }
            }
        }
    }

    function setContainerCallback (containerCallbackInstance) {
        containerCallback = containerCallbackInstance;
    }

    function resizeCanvas (width, height) {
        svg_main
            .attr("width", width)
            .attr("height", height);

        canvasWidth = width;
        canvasHeight = height;

        if (gridDisplayed) {
            var gridSvg = svg.select('.grid');
            drawGrid(gridSvg, canvasWidth, canvasHeight);
        }
    }

    function resetPanAndZoom (dontSendDataChanged) {
        svg.call(zoom.transform, d3.zoomIdentity);
        currentTransform = d3.zoomIdentity;
        scaleFactor = 1.0;
        currentPan = { x: 0, y: 0 };
        currentOffset = { x: 0, y: 0 };
        if (!dontSendDataChanged) {
            dataModelInstance.dataChanged(dataModelInstance.DataChangeType.CanvasTransformUpdate, { });
        }
    }

    function resetCanvas () {
        resetPanAndZoom(true);

        d3.selectAll('#' + canvasParentElement.attr('id') + " > svg > g > *").remove();
        svg.append("g")
            .attr("class", "grid");

        if (gridDisplayed) {
            showGrid();
        }

        clearSelections();
        clearAltSelections();
    }

    function clearSelections() {
        Object.values(selections).map(aSelection => {
            if (aSelection.dataModelItem instanceof dataModelInstance.NodeLabel) {
                d3.select(aSelection.domEl).select(".displayCircle").classed("highlightNode", false);
            } else if (aSelection.dataModelItem instanceof dataModelInstance.RelationshipType) {
                d3.select(aSelection.domEl).select(".relationshipLine").classed("highlightRel", false);
            }
        });
        selections = {};
        notifyCurrentSelectedNodeLabels();
    }

    function clearAltSelections() {
        Object.values(altSelections).map(aSelection => {
            if (aSelection.dataModelItem instanceof dataModelInstance.NodeLabel) {
                d3.select(aSelection.domEl).select(".displayCircle").classed("highlightNodeAlt", false);
            } else if (aSelection.dataModelItem instanceof dataModelInstance.RelationshipType) {
                d3.select(aSelection.domEl).select(".relationshipLine").classed("highlightRelAlt", false);
            }
        });
        altSelections = {};
    }

    function getDataSourceColors () {
        return dataSourceColors;
    }

    function setDataSourceColorMap (dataSourceColorMapVar) {
        dataSourceColorMap = dataSourceColorMapVar;
    }

    /* from: http://bl.ocks.org/cartoda/de0664ca59ff7277a12c */
    function zoomed(event) {
        svg.attr("transform", event.transform);
    }

    /*
    function roundFloat(value){
		return value.toFixed(2);
	}*/

    function getLastLayoutUsed () {
        return lastLayoutUsed;
    }

    function tick () {
        ////console.log("tick called: " + new Date());
        var nodes = svg.selectAll(".nodeLabel");

        nodes.each(function (nodeLabel) {
            var point = {
                x: nodeLabel.x,
                y: nodeLabel.y
            };
            //if (!nodeLabel.display.isLocked) {
                updateNodeLabelPosition (nodeLabel, this, point, true);
            //}
        });
    }

    function doForceLayout () {

        var relationships = dataModelInstance.getRelationshipTypeArray();
        var links = [];
        for (var i = 0; i < relationships.length; i++) {
            links.push({
                source: relationships[i].startNodeLabel.key,
                target: relationships[i].endNodeLabel.key
            })
        }

        var previousSnapToGrid = snapToGrid;
        snapToGrid = false;

        var simulation = d3.forceSimulation()
            .force("collide", d3.forceCollide().radius(function () { return 40;} ))
            .force("link", d3.forceLink()
                .distance(function () { return 200; })
                .id(function(nodeLabel) { return nodeLabel.key; }))
            .force("charge", d3.forceManyBody().strength(function () { return -500; }))
            .force("center", d3.forceCenter(canvasWidth / 2, canvasHeight / 2));

        var nodes = getNodeLabelArray();
        nodes.map(node => {
            node.x = node.display.x;
            node.y = node.display.y;
            if (node.display.isLocked) {
                node.fx = node.x;
                node.fy = node.y;
            }
        });

        simulation.nodes(nodes).on("tick", tick);
        simulation.force("link").links(links);

        setTimeout(function () {
            snapToGrid = previousSnapToGrid;
            simulation.stop();
            getNodeLabelArray().map(nodeLabel =>
                dataModelInstance.dataChanged(dataModelInstance.DataChangeType.NodeLabelDisplayUpdate, { changedObject: nodeLabel })
            );

            nodes.map(node => {
                delete node.fx;
                delete node.fy;
            });

            if (snapToGrid) {
                svg.selectAll(".nodeLabel").each(function (nodeLabel) {
                    // if snapToGrid is on, calling updateNodePosition will snap all nodeLabels
                    var point = {
                        x: nodeLabel.display.x,
                        y: nodeLabel.display.y
                    };
                    updateNodeLabelPosition (nodeLabel, this, point);
                });
            }

        }, 3000);
    }

    /* modified from: https://github.com/dagrejs/dagre/wiki#using-dagre */
    function doDagreLayout (direction) {
        var g = new dagre.graphlib.Graph();

        var align = "DL";
        if (!direction) {
            direction = "LR";
            lastLayoutUsed = LAYOUTS.DAGRE_LEFT_RIGHT;
        }

        if (direction == 'side') {
            direction = 'LR';
            lastLayoutUsed = LAYOUTS.DAGRE_LEFT_RIGHT;
        } else if (direction == 'top') {
            direction = 'TB';
            lastLayoutUsed = LAYOUTS.DAGRE_TOP_BOTTOM;
        }

        // Set an config for the layout
        g.setGraph({rankdir: direction, align: align, nodesep: 100, ranksep: 100, edgesep: 30, marginx: 0, marginy: 0});

        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() { return {}; });

        // Add nodes to the graph. The first argument is the node id. The second is
        // metadata about the node.
        var nodeLabelArray = getNodeLabelArray();
        var lockedNodeLabels = nodeLabelArray.filter(x => x.display.isLocked);
        nodeLabelArray.map(nodeLabel => {
            nodeLabel.display.origx = nodeLabel.display.x;
            nodeLabel.display.origy = nodeLabel.display.y;
            g.setNode(nodeLabel.key, nodeLabel.display);
        });

        var relationshipTypeArray = dataModelInstance.getRelationshipTypeArray();
        relationshipTypeArray.map(relationshipType => {
            g.setEdge(relationshipType.startNodeLabel.key, relationshipType.endNodeLabel.key);
        })
        // this updates nodeLabel.display.x and .y
        dagre.layout(g);
        //var output = dagre.layout(g);

        // get bbox
        var minX = 100000, minY = 100000, maxX = 0, maxY = 0;
        svg.selectAll(".nodeLabel").each(function (nodeLabel) {
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
        var xOffset = (canvasWidth - (maxX - minX)) / 2 - minX;
        var yOffset = (canvasHeight - (maxY - minY)) / 2 - minY;
        ////console.log("minX: " + minX + ", minY: " + minY + ", maxX: " + maxX + ", maxY: " + maxY);
        ////console.log("xOffset " + xOffset + ", yOffset: " + yOffset);

        // update node positions
        var nodeLabels = svg.selectAll(".nodeLabel");

        nodeLabelArray.map(nodeLabel => {
            if (!nodeLabel.display.isLocked) {
                // compute closest lockedNodeLabel
                var minDistance = -1;
                var closestLockedNode = null;
                lockedNodeLabels.map(lockedNodeLabel => {
                    var xDistance = Math.abs(nodeLabel.display.x - lockedNodeLabel.display.origx);
                    var yDistance = Math.abs(nodeLabel.display.y - lockedNodeLabel.display.origy);
                    var distance = Math.sqrt(Math.pow(xDistance,2) + Math.pow(yDistance,2));
                    //console.log('distance between ' + nodeLabel.label + ' and ' + lockedNodeLabel.label + ' is ' + distance);
                    if (minDistance === -1 || distance < minDistance) {
                        //console.log('updating minDistance');
                        minDistance = distance;
                        closestLockedNode = lockedNodeLabel;
                    }
                })
                //console.log(nodeLabel.label + ' is closest to ' + closestLockedNode.label);
                nodeLabel.closestLockedNode = closestLockedNode;
            }
        });

        nodeLabels.each(function (nodeLabel) {
            if (!nodeLabel.display.isLocked) {
                var point;
                if (lockedNodeLabels.length > 0 && nodeLabel.closestLockedNode) {
                    //var xDistanceThird = Math.floor((nodeLabel.display.x - nodeLabel.closestLockedNode.display.x) / 3);
                    //var yDistanceThird = Math.floor((nodeLabel.display.y - nodeLabel.closestLockedNode.display.y) / 3);
                    //console.log(`${nodeLabel.label}: laying out with randomness`);
                    point = {
                        x: nodeLabel.display.x - 
                            (nodeLabel.closestLockedNode.display.origx - nodeLabel.closestLockedNode.display.x),
                        y: nodeLabel.display.y -
                            (nodeLabel.closestLockedNode.display.origy - nodeLabel.closestLockedNode.display.y)
                    }
                } else {
                    //console.log(`${nodeLabel.label}: laying out not random`);
                    point = {
                        x: nodeLabel.display.x + xOffset,
                        y: nodeLabel.display.y + yOffset
                    };
                }
                updateNodeLabelPosition (nodeLabel, this, point);
            }
        });

        nodeLabels.each(function (nodeLabel) {
            if (nodeLabel.display.isLocked) {
                var point = {
                    x: nodeLabel.display.origx,
                    y: nodeLabel.display.origy
                };
                updateNodeLabelPosition (nodeLabel, this, point);
            }
        });

        nodeLabels.each(function (nodeLabel) {
            delete nodeLabel.display.origx;
            delete nodeLabel.display.origy;
            if (!nodeLabel.display.isLocked) {
                delete nodeLabel.closestLockedNode;
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
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight
        }
    }

    function addListener (listener) {
        listeners.push(listener);
    }

    function removeListener (listener) {
        var index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
    }

    function setupArrowDefinitions () {
        var defs = svg_main.append("defs")

		defs.append("marker")

        svg_main.select("marker")
            .attr("id", arrowDomId)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", markerWidth)
            .attr("markerHeight", markerHeight)
            .attr("orient", "auto");

        svg_main.select("marker")
				.append("path")
					.attr("d", "M0,-5L10,0L0,5")
					.attr("class","arrowHead");
    }

    function listenForDataChanges (message) {   
        const { dataChangeType, details } = message;
        //console.log('listenForDataChanges message: ', message);
        const changedObject = (details) ? details.changedObject : {}
        switch (dataChangeType) {
            case DataChangeType.AddOrUpdateSecondaryNodeLabel:
                console.log('reRenderNodeLabel');
                reRenderNodeLabel(changedObject);
                break;
            case DataChangeType.AddOrUpdateNodeLabel:
                updateTextNoValidation (changedObject, changedObject.getText(), true);
                dataModelInstance.getNodeLabelsWhereIAmSecondary(changedObject)
                    .map(x => reRenderNodeLabel(x));
                break;
            case DataChangeType.UpdateRelationshipType:
                reRenderRelationshipType(changedObject);
                break;
            default:
                break;
        }
    }

    function setDataModel (dataModelInstanceVar) {
        if (dataModelInstance && dataModelInstance.removeDataChangeListener) {
            dataModelInstance.removeDataChangeListener(listenForDataChanges);
        }
        dataModelInstance = dataModelInstanceVar;
        dataModelInstance.addDataChangeListener(listenForDataChanges);
        renderDataModel();
    }

    function getDataModel () {
        return dataModelInstance;
    }

    function getSelectionArray () {
        return Object.values(selections).map(x => x.dataModelItem);
    }

    function getSelectedNodeLabelArray () {
        return getSelectionArray().filter(x => x.classType === 'NodeLabel');
    }

    function getSelectedRelationshipTypeArray () {
        return getSelectionArray().filter(x => x.classType === 'RelationshipType');
    }

    function deleteSelectedItems () {
        if (SecurityRole.canEditShowMessage()) {
            var selectionArray = getSelectionArray();

            var deleteItems = (() => {
                selectionArray.map(x => {
                    if (x.classType === 'NodeLabel') {
                        removeRelationshipsForNodeLabel(x.key);
                        removeNodeLabel(x.key);
                    } else if (x.classType === 'RelationshipType') {
                        removeRelationshipType(x.key);
                    }
                });
            })

            if (selectionArray.length > 1) {
                // prompt user to confirm
                containerCallback({
                    message: CONTAINER_CALLBACK_MESSAGES.PROMPT_USER,
                    title: 'Delete Items',
                    description: `Do you want to delete the selected items?`,
                    yesAction: () => deleteItems()
                });
            } else {
                deleteItems();
            }
        }
    }

    function textYOffset (nodeLabel) {
        var yOffset = 0;
        if (nodeLabel.display.textLocation == "below") {
            yOffset = nodeLabel.display.radius + nodeLabel.display.fontSize
        }
        return yOffset;
    }

    var fontAwesomeUnicodeIconMap = {
        'expand': '\uf065',
        'lock': '\uf023',
        'unlock': '\uf09c',
        'trash': '\uf1f8',
        'reverse': '\uf337',
        'comment': '\uf075',
        'thlist': '\uf00b',
        'key': '\uf084',
        'shareAlt': '\uf1e0'
    }

    var getIconName = function (actionName) {
        if (actionName == 'delete') {
            return 'trash';
        } else if (actionName == 'unlockPosition') {
            return 'unlock';
        } else if (actionName == 'lockPosition') {
            return 'lock';
        } else if (actionName == 'annotate') {
            return 'thlist';
            //return 'comment';
        } else if (actionName == 'cardinality') {
            return 'shareAlt'
        } else {
            return actionName;
        }
    }

    function removeAllNodeArcs () {
        svg.selectAll(".nodeLabel").each(function (nodeLabel) {
            removeNodeArcs(this);
        });
    }

    function removeAllRelRibbons () {
        svg.selectAll(".relationshipType").each(function (nodeLabel) {
            removeRelRibbon(this);
        });
    }

    function removeNodeArcs (nodeSvgEl) {
        if (nodeSvgEl) {
            d3.select(nodeSvgEl).selectAll(".nodeArc")
                .data([])
                .exit()
                .remove();
        }
    }

    function removeRelRibbon (relSvgEl) {
        if (relSvgEl) {
            d3.select(relSvgEl).selectAll(".relRibbon")
                .data([])
                .exit()
                .remove();
        }
    }

    function areNodeArcsDisplayed (nodeSvgEl) {
        var nodeArcs = d3.select(nodeSvgEl).selectAll(".nodeArc");
        return (nodeArcs.size() > 0) ? true : false;
    }

    function drawNodeArcs (nodeSvgEl, nodeLabel) {

        var actionTooltips = {
            lockPosition: 'Lock Position',
            annotate: 'Show Properties',
            delete: 'Delete'
        }

        var arcGroups = d3.select(nodeSvgEl).selectAll(".nodeArc")
            .data(function (nodeLabel) {
                //var actions = ['lockPosition', 'expand', 'delete', 'annotate'];
                var actions = ['lockPosition', 'delete', 'annotate'];
                var myData = [];
                var arcAngle = ((2*Math.PI) / actions.length);
                for (var i = 0; i < actions.length; i++) {
                    myData.push({
                        id: nodeLabel.key + '_arc_' + i,
                        action: actions[i],
                        x: nodeLabel.display.x,
                        y: nodeLabel.display.y,
                        innerRadius: nodeLabel.display.radius + 7,
                        outerRadius: nodeLabel.display.radius + 34,
                        startAngle: i * arcAngle,
                        endAngle: (i + 1) * arcAngle,
                        iconName: getIconName(actions[i]),
                        nodeLabel: nodeLabel
                    })
                }
                return myData;
            })
            .enter()
            .append('g')
            .attr('class', function (arcData) { return 'nodeArc ' + arcData.action; })
            .attr("transform", function(arcData) { return "translate(" + arcData.x + "," + arcData.y + ")"})
            .on('mousedown', function () { dragEnabled = false; })
            .on('mouseup', function () { dragEnabled = true; })
            .on('click', function(event, arcData) {
                dragEnabled = true;
                if (arcData.action === 'delete') {
                    deleteSelectedItems();
                } else if (arcData.action === 'expand') {
                    removeNodeArcs(nodeSvgEl);
                    //TODO: drawNodeRelationshipCircles(nodeSvgEl, nodeLabel);
                } else if (arcData.action === 'lockPosition') {
                    nodeLabel.display.isLocked = !nodeLabel.display.isLocked;
                    dataModelInstance.dataChanged(dataModelInstance.DataChangeType.NodeLabelDisplayUpdate, { changedObject: nodeLabel });
                    updateLockIcon(this);

                    getSelectedNodeLabelArray()
                        .filter(x => x.key !== nodeLabel.key)
                        .map(x => {
                            if (x.display.isLocked !== nodeLabel.display.isLocked) {
                                x.display.isLocked = nodeLabel.display.isLocked;
                                dataModelInstance.dataChanged(dataModelInstance.DataChangeType.NodeLabelDisplayUpdate, { changedObject: x });
                                var lockSvgEl = d3.select(getSvgNodeEl(x)).selectAll(".lockPosition").node();
                                updateLockIcon(lockSvgEl);
                            }
                        });

                } else if (arcData.action === 'annotate') {
                    containerCallback({ message: CONTAINER_CALLBACK_MESSAGES.SHOW_PROPERTIES, propertyContainer: nodeLabel });
                    /*
                    var offset = getNodeLabelAnnotationOffset(nodeLabel);
                    graphCanvasAnnotation.addAnnotation(nodeSvgEl, nodeLabel.display.x, nodeLabel.display.y,
                            offset, offset, 'Annotation', ORIENTATION.LEFT);
                    */
                    removeNodeArcs(nodeSvgEl);
                } else {
                    //console.log('Action ' + arcData.action + ' on ' + arcData.nodeLabel.label);
                }
                event.stopPropagation();
            });

        arcGroups.append("title")
                .text(function (arcData) {
                    return (actionTooltips[arcData.action]) ? actionTooltips[arcData.action] : '';
                });

        arcGroups.append("path")
                .attr('id', function (arcData) { return arcData.id; })
                .attr("d", function(arcData) {
                    var arc = d3.arc()
                        .innerRadius(arcData.innerRadius)
                        .outerRadius(arcData.outerRadius)
                        .startAngle(arcData.startAngle)
                        .endAngle(arcData.endAngle);
                    return arc();
                })
                .on('mouseover', function (event, arcData) {
                    d3.select('#' + arcData.id).classed("nodeArcHighlight", true);
                })
                .on('mouseout', function (event, arcData) {
                    d3.select('#' + arcData.id).classed("nodeArcHighlight", false);
                })
                .style("stroke", "white")
                .style("fill", "#A8A8A8")

        var getIconPosition = function (arcData) {
            var iconAngle = arcData.startAngle + (arcData.endAngle - arcData.startAngle) / 2 - ( Math.PI / 2);
            var iconRadiusPosition = arcData.innerRadius + (arcData.outerRadius - arcData.innerRadius) / 2;
            var x = iconRadiusPosition * Math.cos(iconAngle);
            var y = iconRadiusPosition * Math.sin(iconAngle);
            return {
                x: x,
                y: y
            }
        }

        arcGroups.append('text')
            .attr("class", "displayTextIcon fa")
            .attr("x", function (arcData) { return getIconPosition(arcData).x; })
            .attr("y", function (arcData) { return getIconPosition(arcData).y; })
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .attr('font-family', 'FontAwesome')
            .attr("font-size", function (node) { return '1em'; })
            .style("fill", function (node) { return 'white' })
            .text(function(arcData) {
                var iconName = arcData.iconName;
                if (arcData.action === 'lockPosition') {
                    // show the state of the node
                    iconName = (arcData.nodeLabel.display.isLocked) ? getIconName('lockPosition') : getIconName('unlockPosition');
                }
                var unicode = fontAwesomeUnicodeIconMap[iconName]
                ////console.log('iconName: ' + iconName + ', unicode: ' + unicode);
                return unicode;
            });
    }

    function updateLockIcon (arcSvgEl) {
        //console.log('updating lock icon');
        d3.select(arcSvgEl).select('.displayTextIcon')
            .text(function(arcData) {
                var iconName = arcData.iconName;
                if (arcData.action === 'lockPosition') {
                    // show the state of the node
                    iconName = (arcData.nodeLabel.display.isLocked) ? getIconName('lockPosition') : getIconName('unlockPosition');
                }
                var unicode = fontAwesomeUnicodeIconMap[iconName]
                ////console.log('iconName: ' + iconName + ', unicode: ' + unicode);
                return unicode;
            });
    }

    var relRibbonButtonWidth = 24, relRibbonButtonHeight = 24;
    function getRibbonPoint (relationshipType, actions, ignoreOffset) {
        var yOffset = (ignoreOffset) ? 0 : 10;
        var x, y, ribbonWidth;
        var offset = (relationshipType.display && relationshipType.display.offset) ? relationshipType.display.offset : 0;

        var connectToSelf = (relationshipType.startNodeLabel === relationshipType.endNodeLabel) ? true : false;
        if (connectToSelf) {
            var cx = relationshipType.startNodeLabel.display.x;
            var cy = relationshipType.startNodeLabel.display.y;
            var radius = relationshipType.startNodeLabel.display.radius;
            var cps = getLookbackControlPoints(cx, cy, radius, offset);
            x = ((cps[0].x - cps[1].x) / 2) + cps[1].x;
            y = ((cps[0].y - cps[1].y) / 2) + cps[1].y + relRibbonButtonHeight + yOffset;
        } else {
            var actionsLen = (actions) ? actions.length : 0;
            ribbonWidth = actionsLen * relRibbonButtonWidth;
            var midPoint = computeMidPoint (relationshipType, relationshipType.startNodeLabel.display.x,
                                            relationshipType.endNodeLabel.display.x,
                                            relationshipType.startNodeLabel.display.y,
                                            relationshipType.endNodeLabel.display.y, 0);
            x = midPoint.xMidPoint - ribbonWidth / 2;
            y = midPoint.yMidPoint + yOffset;
            //x = midPoint.xMidPoint;
            //y = midPoint.yMidPoint;
            /*
            x = relationshipType.startNodeLabel.display.x +
                        (relationshipType.endNodeLabel.display.x - relationshipType.startNodeLabel.display.x) / 2 -
                        ribbonWidth / 2;

            y = relationshipType.startNodeLabel.display.y +
                        (relationshipType.endNodeLabel.display.y - relationshipType.startNodeLabel.display.y) / 2 + yOffset;
            */
        }
        return {
            x: x,
            y: y
        }
    }

    function isRelRibbonDisplayed (relSvgEl) {
        var ribbonGroups = d3.select(relSvgEl).selectAll(".relRibbon");
        return (ribbonGroups.size() > 0) ? true : false;
    }

    function drawRelRibbon (relSvgEl, relationshipType, clickMouseCoords) {

        var actionTooltips = {
            reverse: 'Reverse Relationship',
            cardinality: 'Relationship Cardinality',
            annotate: 'Show Properties',
            delete: 'Delete'
        }

        var ribbonGroups = d3.select(relSvgEl).selectAll(".relRibbon")
            .data(function (relationshipType) {
                var actions = [], myData = [];

                var connectToSelf = (relationshipType.startNodeLabel == relationshipType.endNodeLabel) ? true : false;
                if (connectToSelf) {
                    actions = ['annotate','cardinality','delete'];
                } else {
                    actions = ['annotate','cardinality','reverse','delete'];
                }
                actions = actions.filter(action => {
                    if (action !== 'cardinality') {
                        return true;
                    } else {
                        // will remove 'cardinality' if it is not licensed
                        return isFeatureLicensed(FEATURES.MODEL.RelationshipCardinality);
                    }
                });

                for (var i = 0; i < actions.length; i++) {
                    myData.push({
                        id: relationshipType.key + '_ribbon_' + i,
                        action: actions[i],
                        actions: actions,
                        iconName: getIconName(actions[i]),
                        relationshipType: relationshipType
                    })
                }
                return myData;
            })
            .enter()
            .append('g')
            .attr('class', 'relRibbon')
            .attr("transform", function(ribbonData, index) {
                var point = getRibbonPoint(ribbonData.relationshipType, ribbonData.actions);
                ////console.log('ribbon button index: ' + index);
                var x = point.x + (index * relRibbonButtonWidth);
                if (clickMouseCoords && clickMouseCoords.y >= point.y && clickMouseCoords.y <= point.y + relRibbonButtonHeight) {
                    // move it away from the click area
                    point.y = clickMouseCoords.y + 10;
                }
                ////console.log("clickMouseCoords.y: " + clickMouseCoords.y);
                ////console.log("point.y: " + point.y);
                ////console.log('x: ' + x);
                var translate = "translate(" + x + "," + point.y + ")";
                ////console.log('translate: ' + translate);
                return translate;
            })
            .on('click', function(event, ribbonData) {
                if (ribbonData.action === 'delete') {
                    deleteSelectedItems();
                } else if (ribbonData.action === 'annotate') {
                    /*
                    var point = getRibbonPoint(ribbonData.relationshipType, [], true);
                    var annotationOffset = 2;
                    var orientation = getRelationshipTypeAnnotationOrientation(ribbonData.relationshipType);
                    graphCanvasAnnotation.addAnnotation(relSvgEl, point.x, point.y,
                            annotationOffset, annotationOffset, 'Annotation', orientation);
                    */
                    containerCallback({ message: CONTAINER_CALLBACK_MESSAGES.SHOW_PROPERTIES, propertyContainer: ribbonData.relationshipType });
                    removeRelRibbon(relSvgEl);
                } else if (ribbonData.action === 'cardinality') {
                    containerCallback({ message: CONTAINER_CALLBACK_MESSAGES.SHOW_RELATIONSHIP_CARDINALITY, propertyContainer: ribbonData.relationshipType });
                    removeRelRibbon(relSvgEl);
                } else if (ribbonData.action === 'reverse') {
                    if (SecurityRole.canEditShowMessage()) {
                        /*
                        var start = ribbonData.relationshipType.startNodeLabel;
                        ribbonData.relationshipType.startNodeLabel = ribbonData.relationshipType.endNodeLabel;
                        ribbonData.relationshipType.endNodeLabel = start;
                        ribbonData.relationshipType.setDisplayOffset(-ribbonData.relationshipType.display.offset);
                        removeRelRibbon(relSvgEl);
                        updateRelationshipTypePosition(relationshipType);
                        updateTextPosition(relationshipType);
                        removeRelSelection(relSvgEl, relationshipType);
                        dataModelInstance.dataChanged(dataModelInstance.DataChangeType.UpdateRelationshipType, { changedObject: relationshipType });
                        */
                        getSelectedRelationshipTypeArray().map(x => {
                            var relSvgEl = getSvgRelEl(x);
                            var start = x.startNodeLabel;
                            x.startNodeLabel = x.endNodeLabel;
                            x.endNodeLabel = start;
                            x.setDisplayOffset(-x.display.offset);
                            removeRelRibbon(relSvgEl);
                            updateRelationshipTypePosition(x);
                            updateTextPosition(x);
                            removeRelSelection(relSvgEl, x);
                            dataModelInstance.dataChanged(dataModelInstance.DataChangeType.UpdateRelationshipType, { changedObject: x });
                        });
                    }
                } else {
                    //console.log('Action ' + ribbonData.action + ' on ' + ribbonData.relationshipType.type);
                }
                event.stopPropagation();
            });

        ribbonGroups.append("title")
                .text(function (ribbonData) {
                    return (actionTooltips[ribbonData.action]) ? actionTooltips[ribbonData.action] : '';
                });

        ribbonGroups.append("rect")
                .attr('id', function (ribbonData) { return ribbonData.id; })
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", relRibbonButtonWidth)
                .attr("height", relRibbonButtonHeight)
                .on('mouseover', function (event, ribbonData) {
                    d3.select('#' + ribbonData.id).classed("nodeArcHighlight", true);
                })
                .on('mouseout', function (event, ribbonData) {
                    d3.select('#' + ribbonData.id).classed("nodeArcHighlight", false);
                })
                .style("stroke", "white")
                .style("fill", "#A8A8A8")

        ribbonGroups.append('text')
            .attr("class", "displayTextIcon fa")
            .attr("x", 12)
            .attr("y", 12)
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .attr('font-family', 'FontAwesome')
            .attr("font-size", function (node) { return '1em'; })
            .style("fill", function (node) { return 'white' })
            //.style("fill", "white")
            .text(function(ribbonData) { return fontAwesomeUnicodeIconMap[ribbonData.iconName]; });
    }

    function drawNodeRelationshipCircles (nodeSvgEl, nodeLabel) {
        var circleGroups = d3.select(nodeSvgEl).selectAll(".nodeRelationshipCircle")
            .data(function (nodeLabel) {
                var numberOfCircles = 8;
                var distanceFromNodeLabel = 60;
                var myData = [];
                var angleMulitplier = ((2*Math.PI) / numberOfCircles);
                for (var i = 0; i < numberOfCircles; i++) {
                    myData.push({
                        id: nodeLabel.key + '_rel_circle_' + i,
                        cx: distanceFromNodeLabel * Math.cos(i * angleMulitplier),
                        cy: distanceFromNodeLabel * Math.sin(i * angleMulitplier),
                        index: i + 1,
                        angle: i * angleMulitplier,
                        radius: 12,
                        nodeLabel: nodeLabel
                    })
                }
                return myData;
            })
            .enter()
            .append('g')
            .attr('class', 'nodeRelationshipCircle')
            //.attr("transform", function(relCircleData) { return "translate(" + relCircleData.cx + "," + relCircleData.cy + ")"})
            .on('click', function(event, data) {
                //console.log('angle: ' + relCircleData.angle);
                event.stopPropagation();
            });

        circleGroups.append('circle')
            //.attr("class", "displayTextIcon fa")
            .attr("class", "displayRelCircle")
            .attr("cx", function (relCircleData) {  return relCircleData.nodeLabel.display.x + relCircleData.cx; })
            .attr("cy", function (relCircleData) {  return relCircleData.nodeLabel.display.y + relCircleData.cy; })
            .attr("r", function (relCircleData) { return relCircleData.radius; })
            .attr("pointer-events", "none")
            .style("fill", function (relCircleData) { return 'lightblue'; });

        circleGroups.append('text')
            //.attr("class", "displayTextIcon fa")
            .attr("class", "displayRelCircleText")
            .attr("x", function (relCircleData) { return relCircleData.nodeLabel.display.x + relCircleData.cx; })
            .attr("y", function (relCircleData) { return relCircleData.nodeLabel.display.y + relCircleData.cy; })
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            //.attr('font-family', 'FontAwesome')
            .attr("font-size", function (node) { return '1em'; })
            .style("fill", function (node) { return 'white' })
            //.style("fill", "white")
            //.text(function(arcData) { return fontAwesomeUnicodeIconMap[arcData.iconName]; });
            .text(function(relCircleData) { return relCircleData.index; });
    }

    function getD3NodeEl (nodeLabel) {
        return svg.select('#' + ID_PREFIXES.NODE_LABEL + nodeLabel.key);
    }

    function getD3RelEl (relationshipType) {
        return svg.select("#" + ID_PREFIXES.RELATIONSHIP_TYPE + relationshipType.key);
    }

    function getSvgNodeEl (nodeLabel) {
        return getD3NodeEl(nodeLabel).node();
    }

    function getSvgRelEl (relationshipType) {
        return getD3RelEl(relationshipType).node();
    }

    function reRenderNodeLabel (nodeLabel) {
        var svgNodeEl = getSvgNodeEl(nodeLabel);
        var svgTextEl = d3.select(svgNodeEl).select(".displayText");
        const newText = getNodeLabelText(nodeLabel);
        console.log('newText: ' + newText);
        svgTextEl.text(newText);
        removeNodeArcs(svgNodeEl);
        updateNodeLabelPosition (nodeLabel, svgNodeEl, { x: nodeLabel.display.x, y: nodeLabel.display.y }, true);
        if (secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION) {
            handleDisplayNodeLabelAnnotation(svgNodeEl, nodeLabel);        
            dataModelInstance.getNodeLabelsWhereIAmSecondary(nodeLabel).map(secondaryNodeLabel => {
                handleDisplayNodeLabelAnnotation(getSvgNodeEl(secondaryNodeLabel), secondaryNodeLabel);
            });
        }
        svgTextEl.call(wrap);
    }

    function reRenderRelationshipType (relationshipType) {
        var svgTextEl = textMap[relationshipType.key];
        var text = d3.select(svgTextEl);
        text.text(getRelationshipText(relationshipType));
        updateRelationshipTypePosition(relationshipType);
        updateTextPosition(relationshipType);
    }

    function getNodeLabelArray () {
        return dataModelInstance.getNodeLabelArray()
            .filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel);
    }

    function renderNodes () {
        var nodeLabelArray = getNodeLabelArray();
        var nodes = svg.selectAll(".nodeLabel")
                .data(nodeLabelArray, function(nodeLabel) { return nodeLabel.key; })

        var nodeGroups = nodes.enter()
            .append("g")
            .attr("id", function(nodeLabel) { return ID_PREFIXES.NODE_LABEL + nodeLabel.key })
            .attr("class", "nodeLabel")
            .on("click", function (event, nodeLabel) {
                //console.log('node group clicked');
                if (containerNodeLabelClick) {
                    var cancelClick = containerNodeLabelClick(nodeLabel);
                    if (cancelClick) {
                        return;
                    }
                }

                if (mode == MODES.SELECT) {
                    //console.log('mode = SELECT');
                    if (shiftDown) {
                        if (!areNodeArcsDisplayed(this)) {
                            getSelectedNodeLabelArray().map(x => drawNodeArcs(getSvgNodeEl(x), x));
                        } else {
                            getSelectedNodeLabelArray().map(x => removeNodeArcs(getSvgNodeEl(x), x));
                        }
                    } else if (ctrlDown) {
                        if (!amISelected(nodeLabel)) {
                            addNodeSelection(this, nodeLabel)
                            getSelectedNodeLabelArray().map(x => drawNodeArcs(getSvgNodeEl(x), x));
                        } else {
                            getSelectedNodeLabelArray().map(x => removeNodeArcs(getSvgNodeEl(x), x));
                            removeNodeSelection(this, nodeLabel);
                        }
                    } else {
                        if (isAnythingSelected()) {
                            removeAllNodeArcs();
                            clearSelections();
                        }
                        removeAllRelRibbons();
                        if (!amISelected(nodeLabel)) {
                            addNodeSelection(this, nodeLabel)
                            drawNodeArcs(this, nodeLabel);
                        } else {
                            removeNodeSelection(this, nodeLabel);
                            removeNodeArcs(this, nodeLabel);
                        }
                    }
                }
                event.stopPropagation();
            })
            .call(d3.drag()
                .clickDistance(4)
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
                .on('dblclick', function () {
                    if (SecurityRole.canEditShowMessage()) {
                        handleEdit(this);
                    }
                })

        nodeGroups.append("circle")
            .attr("class", "hoverCircle")
            .attr("cy", function (nodeLabel) { return nodeLabel.display.y; })
            .attr("cx", function (nodeLabel) { return nodeLabel.display.x; })
            .attr("r", function (nodeLabel) { return nodeLabel.display.radius + hoverCircleRadiusIncrease; })
            .style("opacity", 0)
            .style("fill", "lightgray")
            .on("mouseover", function (event, d) {
                d3.select(this).transition().style("opacity", 1);
            })
            .on("mouseout", function (event, d) {
                d3.select(this).transition().style("opacity", 0);
            })
            .on("click", function (event, d) {
                // prevent relationship + node from getting drawn without dragging
                event.stopPropagation();
            })
            .call(d3.drag()
                .on("start", connectorStart)
                .on("drag", connectorDrag)
                .on("end", connectorStop));

        nodeGroups.append("circle")
            .attr("class", "displayCircle")
            .attr("cy", function (nodeLabel) { return nodeLabel.display.y; })
            .attr("cx", function (nodeLabel) { return nodeLabel.display.x; })
            .attr("r", function (nodeLabel) { return nodeLabel.display.radius; })
            .on("mouseover", function () {
                dragEnabled = true;
                handleNodeLabelMouseOver(this);
            })
            .on("mouseout", function (event) {
                handleNodeLabelMouseOut(event, this);
            });

        // handle coloring of new and existing nodes
        nodeGroups
            .merge(nodes)
            .select(".displayCircle")
            .style("fill", function (nodeLabel) { return nodeLabel.display.color; })
            .style("stroke", function (nodeLabel) { return nodeLabel.display.stroke; })
            .style("stroke-width", function (nodeLabel) { return nodeLabel.display.strokeWidth; })
            .style("stroke-dasharray", function (nodeLabel) { return nodeLabel.display.strokeDashArray; })

        nodeGroups.append("text")
            .attr("class", "displayText")
            .attr("x", function (nodeLabel) { return nodeLabel.display.x; })
            .attr("y", function (nodeLabel) { return (nodeLabel.display.y + textYOffset(nodeLabel)); })
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            //.attr("font-family", "sans-serif")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", function (nodeLabel) { return nodeLabel.display.fontSize; })
            .style("fill", function (nodeLabel) { return nodeLabel.display.fontColor; })
            .text(function (nodeLabel) { return getNodeLabelText(nodeLabel); })
            .call(wrap);

        if (displayAnnotationBubble()) {
            handleDisplayNodeLabelAnnotations();
        }
        handleDisplayAllNodeLabelGlyphs();

        nodes.exit().remove();
    }

    function removeAllNodeLabelAnnotations () {
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            if (graphCanvasAnnotation.hasAnnotation(nodeLabel)) {
                graphCanvasAnnotation.removeAnnotation(this, nodeLabel);
            }
        });
    }

    function removeAllNodeLabelGlyphs () {
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            const glyphs = graphCanvasGlyph.getGlyphs(nodeLabel);
            glyphs.map(glyph => graphCanvasGlyph.removeGlyph(this, nodeLabel, glyph));
        });
    }

    function removeAllRelationshipTypeGlyphs () {
        svg.selectAll(".relationshipType").each(function(relationshipType, i) {
            const glyphs = graphCanvasGlyph.getGlyphs(relationshipType);
            glyphs.map(glyph => graphCanvasGlyph.removeGlyph(this, relationshipType, glyph));
        });
    }

    function removeAllGlyphs () {
        removeAllNodeLabelGlyphs();
        removeAllRelationshipTypeGlyphs();
    }

    function getColoredTextBlocks (nodeLabel) {
        var coloredTextBlocks = [];
        var secondaryNodeLabelsDisplayed = false;
        if (secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION) {
            var secondaryNodeLabels = dataModelInstance.getSecondaryNodeLabels(nodeLabel);
            if (secondaryNodeLabels.length > 0) {
                secondaryNodeLabelsDisplayed = true;                
                secondaryNodeLabels.map(x => 
                    coloredTextBlocks.push({
                        text: x.getText(), 
                        textColor: x.getFontColor(), 
                        backgroundColor: x.getColor(),
                        marginBottom: 2,
                        strokeColor: 'black',
                        alwaysKeepSeparate: true
                    })
                );
            }
        }
        if (displayAnnotations) {
            var annotationText = nodeLabel.getPropertiesStringWithReferenceData();
            if (annotationText) {
                annotationText = annotationText.split('\n');

                annotationText.map((x, index) => {
                    coloredTextBlocks.push({
                        text: x, 
                        newline: (secondaryNodeLabelsDisplayed || index > 0) ? true : false,
                        textColor: 'black', 
                        marginTop: (secondaryNodeLabelsDisplayed && index === 0) ? 6 : 0,
                        backgroundColor: 'white',
                        strokeColor: 'white',
                        alwaysKeepSeparate: false
                    })
                });
            }
        }
        return coloredTextBlocks;
    }

    function handleDisplayAllNodeLabelGlyphs () {
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            handleDisplayNodeLabelGlyphs(this, nodeLabel);
        });
    }

    function handleDisplayNodeLabelGlyphs (svgEl, nodeLabel) {
        ////console.log(annotationText);
        const glyphs = nodeLabel.display.getGlyphs();
        glyphs.map(glyph => {
            if (graphCanvasGlyph.hasGlyph(nodeLabel, glyph.orientation)) {
                graphCanvasGlyph.updateGlyphText(svgEl, glyph);
            } else {
                graphCanvasGlyph.addGlyph({
                    svgElement: svgEl, 
                    dataModelElement: nodeLabel, 
                    x: nodeLabel.display.x, 
                    y: nodeLabel.display.y, 
                    offsetX: getNodeLabelGlyphOffset(nodeLabel), 
                    offsetY: getNodeLabelGlyphOffset(nodeLabel), 
                    text: glyph.text, 
                    color: glyph.color,
                    textColor: glyph.textColor,
                    icon: glyph.icon,
                    orientation: glyph.orientation
                });
            }
        })
    }

    function handleDisplayNodeLabelAnnotations () {
        // reselect all nodeLabels
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            handleDisplayNodeLabelAnnotation(this, nodeLabel);
        });
    }

    function handleDisplayNodeLabelAnnotation (svgEl, nodeLabel) {
        ////console.log(annotationText);
        var coloredTextBlocks = getColoredTextBlocks(nodeLabel);
        if (graphCanvasAnnotation.hasAnnotation(nodeLabel)) {
            if (coloredTextBlocks.length > 0) {
                // update annotation
                ////console.log("update annotation text");
                graphCanvasAnnotation.updateAnnotationText(svgEl, null, coloredTextBlocks);
            } else {
                // delete annotation
                ////console.log("remove annotation");
                graphCanvasAnnotation.removeAnnotation(svgEl, nodeLabel);
            }
        } else {
            if (coloredTextBlocks.length > 0) {
                var offset = getNodeLabelAnnotationOffset(nodeLabel);
                ////console.log("add annotation");
                var orientation = getNodeLabelAnnotationOrientation(nodeLabel);
                /*
                addAnnotation(this, nodeLabel, nodeLabel.display.x, nodeLabel.display.y,
                        offset, offset, annotationText, orientation);
                */
                graphCanvasAnnotation.addAnnotation({
                    svgElement: svgEl, 
                    dataModelElement: nodeLabel, 
                    x: nodeLabel.display.x, 
                    y: nodeLabel.display.y, 
                    offsetX: offset, 
                    offsetY: offset, 
                    //text: annotationText, 
                    coloredTextBlocks: coloredTextBlocks,
                    orientation: orientation
                });
            }
        }

        //console.log("nodeLabel: ", nodeLabel);
        var connectedNodes = dataModelInstance.getConnectedNodeLabels(nodeLabel);
        //console.log("connectedNodes: ", connectedNodes);
        connectedNodes.map(connectedNodeLabel => {
            if (connectedNodeLabel) {
                var connectedNodeSvgEl = getSvgNodeEl(connectedNodeLabel);
                //console.log("connectedNodeSvgEl: ", connectedNodeSvgEl);
                var orientation = getNodeLabelAnnotationOrientation(connectedNodeLabel);
                //console.log("orientation: ", orientation);
                var offset = getNodeLabelAnnotationOffset(connectedNodeLabel);
                //console.log("offset: ", offset);
                graphCanvasAnnotation.updateAnnotationPosition(connectedNodeSvgEl, connectedNodeLabel.display.x, connectedNodeLabel.display.y,
                        offset, offset, orientation);
                //console.log("after updateAnnotationPosition");
            }
        });
    }

    function isAnythingSelected () {
        return (Object.keys(selections).length > 0) ? true : false;
    }

    function amISelected (item) {
        return (selections[item.key]) ? true : false;
    }

    function bringAllNodesToTop () {
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            d3.select(this).raise();
        });
    }

    function addNodeSelection (nodeLabelSvgEl, nodeLabel, dontNotify) {
        selections[nodeLabel.key] = {
            dataModelItem: nodeLabel,
            domEl: nodeLabelSvgEl
        };
        d3.select(nodeLabelSvgEl)
            .raise()
            .select(".displayCircle")
            .classed("highlightNode", true);

        if (!dontNotify) {
            notifyCurrentSelectedNodeLabels();
            //notifyListeners(CANVAS_MESSAGES.SELECTION_ADDED, nodeLabel.key, nodeLabel);
        }
    }

    function addNodeHighlightAlt (nodeLabel) {
        var nodeLabelSvgEl = getSvgNodeEl(nodeLabel);
        altSelections[nodeLabel.key] = {
            dataModelItem: nodeLabel,
            domEl: nodeLabelSvgEl
        };
        d3.select(nodeLabelSvgEl)
            .select(".displayCircle")
            .classed("highlightNodeAlt", true);
    }

    function removeNodeSelection (nodeLabelSvgEl, nodeLabel, dontNotify) {
        delete selections[nodeLabel.key];
        d3.select(nodeLabelSvgEl).select(".displayCircle").classed("highlightNode", false);
        if (!dontNotify) {
            notifyCurrentSelectedNodeLabels();
            //notifyListeners(CANVAS_MESSAGES.SELECTION_REMOVED, nodeLabel.key, nodeLabel);
        }
    }

    function removeNodeHighlightAlt (nodeLabel) {
        var nodeLabelSvgEl = getSvgNodeEl(nodeLabel);
        delete altSelections[nodeLabel.key];
        d3.select(nodeLabelSvgEl).select(".displayCircle").classed("highlightNodeAlt", false);
    }    

    /* from https://bl.ocks.org/mbostock/7555321 */
    /*
    var averageCharWidthSet = false;
    var averageCharWidth = 8;
    var numCharsForAverage = 0;
    var totalWidthForAverage = 0;
    */

    function wrap(text) {
      text.each(function() {
        var text = d3.select(this),
            //words = text.text().split(/\s+/).reverse(),
            words, syllables,
            word, syllable,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = (text.attr("x")) ? text.attr("x") : 0,
            y = text.attr("y");

        var dataForNode = d3.select(this.parentNode).datum();
        var textToWrap = "";
        if (dataForNode.classType === "NodeLabel") {
            textToWrap = getNodeLabelText(dataForNode);
        } else if (dataForNode.classType === "RelationshipType") {
            textToWrap = getRelationshipText(dataForNode);
        } else {
            textToWrap = text.text();
        }
        words = camelCaseToWordArray(textToWrap).reverse();
        text.selectAll("tspan").remove();   // get rid of existing tspans
        var wordsCopy = words.slice(0); // for syllable layout
        var dyVal = text.attr("dy");
        var dy = (dyVal) ? parseFloat(dyVal) : 0;
        var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
        var width = text.datum().display.radius * 2 - 8;

        var tspans = [tspan];

        var wordLargerThanWidth = false;
        word = words.pop();

        while (word) {
          line.push(word);
          tspan.text(line.join("").trim());
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join("").trim());
            // recheck width
            if (tspan.node().getComputedTextLength() > width) {
                wordLargerThanWidth = true;
                break;
            }
            line = [word];
            tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            // recheck width
            if (tspan.node().getComputedTextLength() > width) {
                wordLargerThanWidth = true;
                break;
            }

            /*
            if (!averageCharWidthSet) {
                numCharsForAverage += tspan.node().getComputedTextLength()
                totalWidthForAverage += tspan.text().length;
            }*/

            tspans.push(tspan);
          }
          word = words.pop();
        }

        if (wordLargerThanWidth) {
            text.selectAll("tspan").remove();   // get rid of existing tspans
            var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
            tspans = [tspan];

            // erase existing text wrap and try with syllable approach
            syllables = getSyllables(wordsCopy);
            line = [];
            //console.log(syllables.slice(0));
            var numberOfSyllables = syllables.length;
            syllable = syllables.pop();
            while (syllable) {
              line.push(syllable);
              tspan.text(getCandidateText(line));
              if (numberOfSyllables > 1 && tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(getCandidateText(line));
                line = [syllable];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(syllable.syllable);
                tspans.push(tspan);
              }
              syllable = syllables.pop();
            }
        }

        // adjust line height offsets based on number of lines
        /* e.g.
            1 = 0.35
            2 = 0, 1.1
            3 = -.75, .35, 1.45
            4 = -1.1, 0, 1.1, 2.2
        */
        var numLines = tspans.length;
        var startPart1 = (numLines % 2 == 1) ? .34 : 0;
        var startPart2 = (Math.floor(((numLines+1) / 2)) - 1) * 1.1;
        var start = startPart1 - startPart2;
        for (var i = 0; i < numLines; i++) {
            dy = (start + i * 1.1).toFixed(2);
            tspans[i].attr('dy', dy + "em");
        }
      });
    }

    function getCandidateText (line) {
        //var candidateText = line.reduce((lineText, x) => (x.endOfWord) ? lineText + x.syllable + ' ' : lineText + x.syllable, '');
        var candidateText = line.reduce((lineText, x) => lineText + x.syllable, '');
        candidateText = (line && line.length && line[line.length-1] && line[line.length-1].endOfWord) ? candidateText : candidateText + '-';
        return candidateText.trim();
    }

    // from https://stackoverflow.com/questions/49403285/splitting-word-into-syllables-in-javascript
    const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;

    function syllabify(words) {
        return words.match(syllableRegex);
    }

    function getSyllables(words) {
        var syllableArrays = words.map(word => {
            var syllables = syllabify(word);
            if (syllables && syllables.map) {
                return syllables.map((syllable, index) => {
                    return ({
                        syllable: syllable,
                        endOfWord: (index + 1) === syllables.length
                    })
                }).reverse();
            } else {
                return [{
                    syllable: word,
                    endOfWord: true
                }];
            }
        })
        return syllableArrays.reduce((acc, val) => acc.concat(val), []);
    }

    function camelCaseToWordArray (camelCaseString) {
        if (camelCaseString && camelCaseString.toUpperCase && camelCaseString.toUpperCase() === camelCaseString) {
            return [camelCaseString];
        } else {
            var words = [camelCaseString];
            if (camelCaseString && camelCaseString.replace) {
                // convert 'camelCaseString' to 'Camel Case String'
                //var stringWithSpaces = camelCaseString.replace(/([A-Z])/g, ' $1');

                // NOTE: this more complex regular expression is better at handling acronyms and special characters
                // Network&ITOps = Network & IT Ops, USState = US State
                var stringWithSpaces = camelCaseString.replace(/([A-Z][^A-Z\W]+|[\W]+|[A-Z]+(?![^A-Z]))/g, '|$1')
                // add this if you want to also capitalize the first letter: .replace(/^./, function(str){ return str.toUpperCase(); })
                stringWithSpaces = stringWithSpaces.trim();
                words = stringWithSpaces.split(/\|/);
                words = words.filter(x => x.length > 0);
                /*
                for (var i = 0; i < words.length; i++) {
                    words[i] = words[i].trim();
                }
                */
            }
            return words;
        }
    }

    var lineGenerator = d3.line();
    lineGenerator.curve(d3.curveNatural);

    function addRelSelection (relSvgEl, relationshipType, dontNotify) {
        selections[relationshipType.key] = {
            dataModelItem: relationshipType,
            domEl: relSvgEl
        };
        d3.select(relSvgEl)
            .raise()
            .select(".relationshipLine")
            .classed("highlightRel", true);

        if (!dontNotify) {
            notifyListeners(CANVAS_MESSAGES.SELECTION_ADDED, relationshipType.key, relationshipType);
        }
    }

    function addRelHighlightAlt (relationshipType) {
        var relSvgEl = getSvgRelEl(relationshipType);
        altSelections[relationshipType.key] = {
            dataModelItem: relationshipType,
            domEl: relSvgEl
        };
        d3.select(relSvgEl)
            .select(".relationshipLine")
            .classed("highlightRelAlt", true);
    }

    function removeRelSelection (relSvgEl, relationshipType, dontNotify) {
        delete selections[relationshipType.key];
        d3.select(relSvgEl)
            .lower()
            .select(".relationshipLine")
            .classed("highlightRel", false);

        if (!dontNotify) {
            notifyListeners(CANVAS_MESSAGES.SELECTION_REMOVED, relationshipType.key, relationshipType);
        }
    }

    function removeRelHighlightAlt (relationshipType) {
        var relSvgEl = getSvgRelEl(relationshipType);
        delete altSelections[relationshipType.key];
        d3.select(relSvgEl)
            .select(".relationshipLine")
            .classed("highlightRelAlt", false);
    }

    function renderRelationships () {
        var relationshipTypeArray = dataModelInstance.getRelationshipTypeArray();
        var relationships = svg.selectAll(".relationshipType")
                          .data(relationshipTypeArray, function(relationshipType) { return relationshipType.key; });

        var relationshipGroups = relationships.enter()
            .append("g")
            .attr("id", function(relationshipType) { return ID_PREFIXES.RELATIONSHIP_TYPE + relationshipType.key })
            .attr("class", "relationshipType")
            .on('dblclick', function () {
                if (SecurityRole.canEditShowMessage()) {
                    handleEdit(this);
                }
            })
            .on("click", function (event, relationshipType) {
                if (containerRelationshipTypeClick) {
                    var cancelClick = containerRelationshipTypeClick(relationshipType);
                    if (cancelClick) {
                        return;
                    }
                }

                if (mode == MODES.SELECT) {
                    if (shiftDown) {
                        if (!isRelRibbonDisplayed(this)) {
                            drawRelRibbon(this, relationshipType, d3Mouse(event));
                            getSelectedRelationshipTypeArray()
                                .filter(x => x.key !== relationshipType.key)
                                .map(x => drawRelRibbon(getSvgRelEl(x), x));
                        } else {
                            getSelectedRelationshipTypeArray().map(x => removeRelRibbon(getSvgRelEl(x), x));
                        }
                    } else if (ctrlDown) {
                        if (!amISelected(relationshipType)) {
                            addRelSelection(this, relationshipType);
                            drawRelRibbon(this, relationshipType, d3Mouse(event));
                            getSelectedRelationshipTypeArray()
                                .filter(x => x.key !== relationshipType.key)
                                .map(x => drawRelRibbon(getSvgRelEl(x), x));
                        } else {
                            getSelectedRelationshipTypeArray().map(x => removeRelRibbon(getSvgRelEl(x), x));
                            removeRelSelection(this, relationshipType);
                        }
                    } else {
                        if (isAnythingSelected()) {
                            removeAllRelRibbons();
                            clearSelections();
                        }
                        removeAllNodeArcs();
                        if (!amISelected(relationshipType)) {
                            addRelSelection(this, relationshipType);
                            drawRelRibbon(this, relationshipType, d3Mouse(event));
                        } else {
                            removeRelSelection(this, relationshipType);
                            removeRelRibbon(this, relationshipType);
                        }

                    }
                }
                event.stopPropagation();
            });

        relationshipGroups.append("path")
                .classed("relationshipLine", true)
                .each(function (relationshipType) {
                    linkMap[relationshipType.key] = this;
                    updateRelationshipTypePosition(relationshipType)
                });

        var relationshipDisplaySettings = getRelationshipDisplaySettings();

        // handle coloring of new and existing relationships
        relationshipGroups
            .merge(relationships)
            .select(".relationshipLine")
            .style("fill", "none")
            /*
            .style("stroke", function (relationshipType) { return relationshipType.display.color; })
            .style("stroke-width", function (relationshipType) { return relationshipType.display.strokeWidth; })
            .style("stroke-dasharray", function (relationshipType) { return relationshipType.display.strokeDashArray; })
            */
            .style("stroke", function (relationshipType) { return relationshipDisplaySettings.color; })
            .style("stroke-width", function (relationshipType) { return relationshipDisplaySettings.strokeWidth; })
            .style("stroke-dasharray", function (relationshipType) { return relationshipType.display.strokeDashArray; })
            .classed("arrow", true);

        relationshipGroups.append("title")
            .attr("class", "relationshipTypeTooltip")
            .text(function (relationshipType) { return relationshipType.type; });

        relationshipGroups.append("text")
            //.attr("transform", rotateIfRightToLeft)
            .attr("class", "displayText")
            .attr("x", function(relationshipType) { return getTextPosition(relationshipType).x })
            .attr("y", function(relationshipType) { return getTextPosition(relationshipType).y })
            //.attr("x", 300)
            //.attr("y", 300)
            .attr("text-anchor", "middle")
            .attr("baseline-shift", "30%")
            .attr("alignment-baseline", "alphabetic")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", function (relationshipType) { return relationshipType.display.fontSize; })
            //.style("fill", relationshipDisplaySettings.color)
            .style("fill", "black")
            .text(function (relationshipType) { return getRelationshipText(relationshipType); })
            .each(function (relationshipType) {
                textMap[relationshipType.key] = this;
                updateTextPosition(relationshipType)
            });

        if (showArrows) {
            svg.selectAll(".relationshipType")
                .select(".relationshipLine")
                .attr("marker-end", "url(#" + arrowDomId + ")");
        } else {
            svg.selectAll(".relationshipType")
                .select(".relationshipLine")
                .attr("marker-end", "none");
        } 

        if (displayAnnotations) {
            handleDisplayRelationshipTypeAnnotations()
        }
        handleDisplayAllRelationshipTypeGlyphs();

        relationships.exit().remove();
    }

    function handleDisplayAllRelationshipTypeGlyphs () {
        svg.selectAll(".relationshipType").each(function(relationshipType, i) {
            handleDisplayRelationshipTypeGlyphs(this, relationshipType);
        });
    }

    function handleDisplayRelationshipTypeGlyphs (svgEl, relationshipType) {
        const glyph = relationshipType.display.glyph;
        if (glyph) {
            if (graphCanvasGlyph.hasGlyph(relationshipType, GLYPH_ORIENTATION.CENTER)) {
                graphCanvasGlyph.updateGlyphText(svgEl, glyph);
            } else {
                var point = getTextPosition(relationshipType);
                graphCanvasGlyph.addGlyph({
                    svgElement: svgEl, 
                    dataModelElement: relationshipType, 
                    x: point.x, 
                    y: point.y, 
                    offsetX: 0, 
                    offsetY: 0, 
                    text: glyph.text, 
                    color: glyph.color,
                    textColor: glyph.textColor,
                    icon: glyph.icon,
                    orientation: GLYPH_ORIENTATION.CENTER
                });
            }
        }
    }    

    function removeAllRelationshipTypeAnnotations () {
        svg.selectAll(".relationshipType").each(function(relationshipType, i) {
            if (graphCanvasAnnotation.hasAnnotation(relationshipType)) {
                graphCanvasAnnotation.removeAnnotation(this, relationshipType);
            }
        });
    }

    function handleDisplayRelationshipTypeAnnotations () {
        // reselect all relationshipTypes
        svg.selectAll(".relationshipType").each(function(relationshipType, i) {
            var annotationText = relationshipType.getPropertiesStringWithReferenceData();
            if (graphCanvasAnnotation.hasAnnotation(relationshipType)) {
                if (annotationText) {
                    // update annotation
                    //console.log("update annotation text");
                    graphCanvasAnnotation.updateAnnotationText(this, annotationText);
                } else {
                    // delete annotation
                    //console.log("remove annotation");
                    graphCanvasAnnotation.removeAnnotation(this, relationshipType);
                }
            } else {
                if (annotationText) {
                    //var point = getRibbonPoint(relationshipType, [], true);
                    var point = getTextPosition(relationshipType);
                    var annotationOffset = getRelationshipAnnotationOffset(relationshipType, point);
                    /*
                    addAnnotation(this, relationshipType, point.x, point.y,
                            annotationOffset.x, annotationOffset.y, annotationText, annotationOffset.orientation);
                    */
                    graphCanvasAnnotation.addAnnotation({
                        svgElement: this, 
                        dataModelElement: relationshipType, 
                        x: point.x, 
                        y: point.y, 
                        offsetX: annotationOffset.x, 
                        offsetY: annotationOffset.y, 
                        text: annotationText, 
                        orientation: annotationOffset.orientation
                    });
                }
            }
        });
    }

    function getTextWidth (text) {
        var tspan = d3.select(`#${textDimensionHelperDomId}`);
        tspan.text(text);
        var textWidth = tspan.node().getComputedTextLength();
        tspan.text('');
        return textWidth;
    }

    function getNodeLabelText (nodeLabel) {
        //console.log("getNodeLabelText: secondaryNodeLabelDisplay: " + secondaryNodeLabelDisplay);
        if (secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.CONCATENATE_LABEL) {
            //console.log("getTextWithSecondaryNodeLabels");
            return nodeLabel.getTextWithSecondaryNodeLabels();
        } else if (secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION) {
            return nodeLabel.getText(); 
        } else {
            return nodeLabel.getText(); 
        }
    }

    function getRelationshipText (aConnection) {
        var relationshipText = aConnection.getRelationshipDisplayText();
        if (relationshipText) {
            var connectToSelf = (aConnection && aConnection.startNodeLabel == aConnection.endNodeLabel) ? true : false;

            var distance = 120;
            if (!connectToSelf) {
                var points = computeConnectorEndPoints (aConnection.startNodeLabel.display.x,
                    aConnection.startNodeLabel.display.y,
                    aConnection.startNodeLabel.display.radius,
                    aConnection.endNodeLabel.display.x,
                    aConnection.endNodeLabel.display.y,
                    aConnection.endNodeLabel.display.radius,
                    aConnection);
                var xDistance = Math.abs(points.x1 - points.x2);
                var yDistance = Math.abs(points.y1 - points.y2);
                distance = Math.sqrt(Math.pow(xDistance,2) + Math.pow(yDistance,2));
            }
            var textLength = getTextWidth(relationshipText);
            if (textLength > distance) {
                var numChars = Math.floor(relationshipText.length * (distance / textLength)) - 3;
                relationshipText = relationshipText.substring(0, numChars) + '...';
            }
            return relationshipText;
        } else {
            return '';
        }
    }

    function getRelationshipAnnotationOffset (relationshipType, textPosition) {
        var annotationXOffset = annotationXOffsetDefault;
        var annotationYOffset = annotationYOffsetDefault;
        var orientation = getRelationshipTypeAnnotationOrientation(relationshipType);
        if (relationshipType.startNodeLabel == relationshipType.endNodeLabel) {
            ////console.log('changed annotation X and Y offset');
            if (orientation == ORIENTATION.BOTTOM_RIGHT) {
                if (textPosition) {
                    annotationXOffset = textPosition.controlPoints[0].x - textPosition.x + 5;
                    annotationYOffset = textPosition.controlPoints[0].y - textPosition.y + 5;
                }
            } else {
                if (textPosition) {
                    annotationXOffset = textPosition.controlPoints[0].x - textPosition.x - 65;
                    annotationYOffset = textPosition.controlPoints[0].y - textPosition.y + 15;
                }
            }

            /*
            if (orientation == ORIENTATION.BOTTOM_RIGHT) {
                annotationXOffset = relationshipType.display.offset - 5;
                annotationYOffset = Math.floor(relationshipType.display.offset * .9);
                //annotationYOffset = 0;
            } else {
                annotationXOffset = -Math.floor(relationshipType.display.offset * .28);
                annotationYOffset = Math.floor(relationshipType.display.offset * .28);
            }
            */
        } else {
            /*
            if (relationshipType.display.offset !== 0) {
                var annotationXOffset = relationshipType.display.offset * 1.3;
                var annotationYOffset = relationshipType.display.offset * 1.3;
            }
            */
        }
        return {
            x: annotationXOffset,
            y: annotationYOffset,
            orientation: orientation
        }
    }

    function getTextPosition (relationshipType) {
        if (relationshipType && relationshipType.startNodeLabel && relationshipType.endNodeLabel) {
            var cps;
            var x1 = relationshipType.startNodeLabel.display.x;
            var y1 = relationshipType.startNodeLabel.display.y;
            var x2 = relationshipType.endNodeLabel.display.x;
            var y2 = relationshipType.endNodeLabel.display.y;

            var connectToSelf = (relationshipType && relationshipType.startNodeLabel == relationshipType.endNodeLabel) ? true : false;
            var offset = (relationshipType && relationshipType.display && relationshipType.display.offset) ? relationshipType.display.offset : 0;
            var midpoint;
            if (connectToSelf) {
                var cx = relationshipType.startNodeLabel.display.x;
                var cy = relationshipType.startNodeLabel.display.y;
                var radius = relationshipType.startNodeLabel.display.radius;
                cps = getLookbackControlPoints(cx, cy, radius, offset);
                var angle = (7 * Math.PI) / 8;
                var sinVal = Math.sin(angle);
                var cosVal = Math.cos(angle);
                var textOffset = offset / 5;
                var textYOffset = textOffset * sinVal;
                var textXOffset = textOffset * cosVal;
                midpoint = {
                    xMidPoint: ((cps[0].x - cps[1].x) / 2) + cps[1].x + textXOffset,
                    yMidPoint: ((cps[0].y - cps[1].y) / 2) + cps[1].y + textYOffset
                }
            } else {
                var angle = computeAngle(x1, y1, x2, y2);
                var cosVal = Math.cos(angle);
                var sinVal = Math.sin(angle);
                ////console.log('angle: ' + angle + ', cosVal: ' + cosVal + ', sinVal: ' + sinVal);
                ////console.log('x1: ' + x1 + ', y1: ' + y1 + ', x2: ' + x2 + ', y2: ' + y2);
                x1 += relationshipType.startNodeLabel.display.radius * cosVal;
                y1 += relationshipType.startNodeLabel.display.radius * sinVal;
                x2 += -relationshipType.endNodeLabel.display.radius * cosVal;
                y2 += -relationshipType.endNodeLabel.display.radius * sinVal;
                ////console.log('now x1: ' + x1 + ', y1: ' + y1 + ', x2: ' + x2 + ', y2: ' + y2);
                midpoint = computeMidPoint(relationshipType, x1, x2, y1, y2, (offset / 4));
            }

            /*
            var x = (relationshipType.startNodeLabel.display.x + relationshipType.endNodeLabel.display.x) / 2;
            var y = (relationshipType.startNodeLabel.display.y + relationshipType.endNodeLabel.display.y) / 2;
            */

            var position = {
                x: midpoint.xMidPoint,
                y: midpoint.yMidPoint,
                controlPoints: cps
            }
            return position;
        } else {
            return {
                x: 0, y: 0, controlPoints: undefined
            }
        }
    }

    function doRelationshipOffsetComputations () {
        var nodeLabels = dataModelInstance.getNodeLabelsThatHaveSelfConnectedRelationships();   

        if (nodeLabels && nodeLabels.length) {
            //console.log('calling after getNodeLabelsThatHaveSelfConnectedRelationships');
            nodeLabels.map(nodeLabel => computeRelationshipTypeOffsets(nodeLabel, nodeLabel));
        }
        /* old way with loop - to be deleted
        if (nodeLabels && nodeLabels.length) {
            for (var i = 0; i < nodeLabels.length; i++) {
                computeRelationshipTypeOffsets(nodeLabels[i], nodeLabels[i]);
            }
        }*/
        var nodePairMap = dataModelInstance.getNodeLabelPairsThatHaveMoreThanOneRelationshipBetweenThem();
        //console.log('calling after getNodeLabelPairsThatHaveMoreThanOneRelationshipBetweenThem');
        Object.keys(nodePairMap).map(key => computeRelationshipTypeOffsets(nodePairMap[key].node1, nodePairMap[key].node2))
        /* old way with loop - to be deleted
        for (var key in nodePairMap) {
            if (nodePairMap.hasOwnProperty(key)) {
                computeRelationshipTypeOffsets(nodePairMap[key].node1, nodePairMap[key].node2);
            }
        }*/
    }

    function renderDataModel () {
        //console.log("rendering: " + dataModelCanvasInstanceNumber + ":" + dataModelInstance.getDataModelInstanceNumber())
        renderNodes();
        doRelationshipOffsetComputations();
        renderRelationships();
    }

    var connectorSourceId = null;
    var connectorEndId = null;
    var connectorEndPoint = {};
    var connectorDidDragSome = false;

    function connectorStart (event, d) {
        console.log("connector start event: ", event);
        if (SecurityRole.canEdit()) {
            connectorDidDragSome = false;
            mode = MODES.CONNECT;
            var coords = d3Mouse(event);
            connectorEndPoint = {
                x: coords.x,
                y: coords.y
            }
            connectorSourceId = this.parentNode.id;

            var lineString = lineGenerator([[coords.x, coords.y], [coords.x, coords.y]]);

            var result = svg.append("path")
                .attr("class", "connectorLine")
                .style("stroke", "gray")
                .style("stroke-width", 3)
                .attr("d", lineString);

            if (showArrows) {
                result.attr("marker-end", "url(#" + arrowDomId + ")");
            }

            /*
            svg.append("line")
                .attr("class", "connectorLine")
                .style("stroke", "gray")
                .style("stroke-width", 3)
                .attr("marker-end", "url(#arrow)")
                .attr("x1", coords.x)
                .attr("y1", coords.y)
                .attr("x2", coords.x)
                .attr("y2", coords.y);
                */
        }
    }

    function connectorDrag (event) {
        //console.log("connector drag event: ", event);
        if (SecurityRole.canEdit()) {
            connectorDidDragSome = true;
            var sourceNodeLabel = d3.select('#' + connectorSourceId);
            var sourceCircle = sourceNodeLabel.select(".displayCircle");

            connectorEndPoint.x += event.dx;
            connectorEndPoint.y += event.dy;

            /*
            var sourceNodeInfo = JSON.stringify(sourceNodeLabel.datum());
            //console.log("source node info: " + sourceNodeInfo);
            */
            //console.log("source circle: cx: " + sourceCircle.attr("cx") + ", cy: "+ sourceCircle.attr("cy"));
            var line = svg.select(".connectorLine");
            updateConnectorPosition (line, parseFloat(sourceCircle.attr("cx")),
                                     parseFloat(sourceCircle.attr("cy")),
                                     parseFloat(sourceCircle.attr("r")),
                                     connectorEndPoint.x,
                                     connectorEndPoint.y,
                                     /*coords.x,
                                     coords.y, */
                                     0);
        }
    }

    function connectorStop (event) {
        //console.log("connector stop");
        if (SecurityRole.canEdit()) {
            if (connectorDidDragSome) {
                if (connectorSourceId != null) {
                    if (connectorEndId != null) {
                        // connect 2 nodes
                        connectNodeLabels(connectorSourceId, connectorEndId);
                    } else {
                        // make a new node, then connect
                        var coords = d3Mouse(event);
                        if (snapToGrid) {
                            var point = snap(coords.x, coords.y);
                            coords.x = point.x;
                            coords.y = point.y;
                        }
                        var sourceKey = connectorSourceId.replace(ID_PREFIXES.NODE_LABEL, '');
                        var startNodeLabel = dataModelInstance.getNodeLabelByKey(sourceKey);
                        var displayProperties = (startNodeLabel && startNodeLabel.display) ? { ...startNodeLabel.display } : {};
                        var newNodeLabel = createNewNodeLabel(coords.x, coords.y, true, displayProperties);
                        connectNodeLabels(connectorSourceId, ID_PREFIXES.NODE_LABEL + newNodeLabel.key);
                    }
                }
            }
            connectorSourceId = null;
            connectorEndId = null;
            connectorEndPoint = {};
            connectorDidDragSome = false;
            //mode = MODES.NORMAL;
            mode = MODES.SELECT;
            svg.select(".connectorLine").remove();
            d3.select(".readyToConnect").classed("readyToConnect", false);
        }
    }

    function focusNewNode (nodeLabel) {
        clearSelections();
        var svgNodeEl = getSvgNodeEl(nodeLabel);
        var displayCircle = d3.select(svgNodeEl).select(".displayCircle");
        displayCircle.classed("focusNode", true);
        setTimeout(() => {
            displayCircle.classed("focusNode", false);
            addNodeSelection(svgNodeEl, nodeLabel);
        }, 250)

    }

    function createNewNodeLabel (x, y, deferRender, displayProperties) {
        var defaultProperties = {};
        var newNodeLabel = dataModelInstance.createNewNodeLabel(displayProperties);
        if (x !== undefined && y !== undefined) {
            if (newNodeLabel != null) {
                addCreatedNodeLabelWithPosition(newNodeLabel, x, y, deferRender);
                //notifyListeners("addNewNodeLabel", newNodeLabel.key, newNodeLabel);
            }
        } else {
            setNewNodeLabelPosition(newNodeLabel, x, y, dataModelInstance, { ...getVisibleRect(), snapToGrid: snapToGrid });
            //setNewNodeLabelPosition(newNodeLabel, x, y, dataModelInstance, { width: canvasWidth, height: canvasHeight, snapToGrid: snapToGrid});
        }
        dataModelInstance.addNodeLabel(newNodeLabel);
        if (!deferRender) {
            renderDataModel();
            focusNewNode(newNodeLabel);
        }

        return newNodeLabel;
    }

    function connectNodeLabels (startKey, endKey) {
        var startKeyNoPrefix = startKey.substring(ID_PREFIXES.NODE_LABEL.length);
        var endKeyNoPrefix = endKey.substring(ID_PREFIXES.NODE_LABEL.length);
        var startNodeLabel = dataModelInstance.getNodeLabelByKey(startKeyNoPrefix);
        var endNodeLabel = dataModelInstance.getNodeLabelByKey(endKeyNoPrefix);
        addRelationshipType("", startNodeLabel, endNodeLabel);
    }

    function handleNodeLabelMouseOver (d3Circle) {
        if (mode == MODES.CONNECT) {
            d3.select(d3Circle).classed("readyToConnect", true);
            //console.log("connect to id: " + d3Circle.parentNode.id);
            connectorEndId = d3Circle.parentNode.id;
        }
    }

    function handleNodeLabelMouseOut (event, d3Circle) {
        if (mode == MODES.CONNECT) {
            var circle = d3.select(d3Circle);
            var r = parseFloat(circle.attr("r"));
            var x1 = parseFloat(circle.attr("cx"));
            var y1 = parseFloat(circle.attr("cy"));
            ////console.log("mouseout coords: x1: " + x1 + ", y1: " + y1);
            var coords = d3Mouse(event);
            var x2 = coords.x;
            var y2 = coords.y;
            ////console.log("d3 x: " + x2 + ", y: " + y2);
            // distance calculations necessary because d3 keeps firing mouse out as I drag
            var distance = Math.hypot(x2-x1, y2-y1);
            ////console.log("distance: " + distance + ", r: " + r);
            if (distance > r) {
                connectorEndId = null;
                d3.select(d3Circle).classed("readyToConnect", false);
            }
        }
    }

    function d3Mouse (event) {
        var coordinates = d3.pointer(event, svg.node());
        //console.log('coords plain: ', coordinates);
        var coordinates = {
            x: coordinates[0],
            y: coordinates[1]
        }
        return coordinates;
    }

    var distanceMap = {};
    function dragstarted(event, nodeLabel) {
        if (dragEnabled) {
            d3.select(this)
                //.raise()  // if I raise() here, it doesn't let me select with 1-click
                    // what happens is that it takes 2 clicks before the d3 'click' event will fire
                .select(".displayCircle")
                .classed("active", true);

            if (!amISelected(nodeLabel) && !ctrlDown) {
                clearSelections();
                removeAllNodeArcs();
                removeAllRelRibbons();
            }

            distanceMap = {};
            getSelectedNodeLabelArray()
                .filter(x => x.key !== nodeLabel.key)
                .map(x =>
                    distanceMap[x.key] = {
                        x: x.display.x - nodeLabel.display.x,
                        y: x.display.y - nodeLabel.display.y
                    }
                );
        }
    }

    function getNodeLabelAnnotationOffset (nodeLabel) {
        return nodeLabel.display.radius + nodeLabelAnnotationOffset;
    }

    function getNodeLabelGlyphOffset (nodeLabel) {
        return nodeLabel.display.radius * 0.8;
    }

    function updateNodeLabelPosition (nodeLabel, nodeLabelSvgEl, newPosition, ignoreChange) {
        nodeLabel.display.x = newPosition.x;
        nodeLabel.display.y = newPosition.y;

        if (snapToGrid) {
            var point = snap(nodeLabel.display.x, nodeLabel.display.y);
            nodeLabel.display.x = point.x;
            nodeLabel.display.y = point.y;
        }

        nodeLabel.x = nodeLabel.display.x;  // is this for d3 forceLayout only? or not needed?
        nodeLabel.y = nodeLabel.display.y;
        d3.select(nodeLabelSvgEl).select(".displayCircle")
            .attr("cx", nodeLabel.display.x)
            .attr("cy", nodeLabel.display.y)
            .attr("r", nodeLabel.display.radius)
            .style("fill", nodeLabel.display.color)
            .style("stroke", nodeLabel.display.stroke)
            .style("stroke-width", nodeLabel.display.strokeWidth)
            .style("stroke-dasharray", nodeLabel.display.strokeDashArray);
        d3.select(nodeLabelSvgEl).select(".hoverCircle")
            .attr("cx", nodeLabel.display.x)
            .attr("cy", nodeLabel.display.y)
            .attr("r", nodeLabel.display.radius + hoverCircleRadiusIncrease);
        d3.select(nodeLabelSvgEl).select(".displayText")
            .attr("x", nodeLabel.display.x)
            .attr("y", nodeLabel.display.y + textYOffset(nodeLabel))
            .style("fill", nodeLabel.display.fontColor);
        d3.select(nodeLabelSvgEl).selectAll(".displayText tspan")
            .attr("x", nodeLabel.display.x)
            .attr("y", nodeLabel.display.y + textYOffset(nodeLabel));

        d3.select(nodeLabelSvgEl).selectAll(".nodeArc")
            .attr("transform", "translate(" + nodeLabel.display.x + "," + nodeLabel.display.y + ")");

        if (displayAnnotationBubble()) {
            if (graphCanvasAnnotation.hasAnnotation(nodeLabel)) {
                var orientation = getNodeLabelAnnotationOrientation(nodeLabel);
                var offset = getNodeLabelAnnotationOffset(nodeLabel);
                graphCanvasAnnotation.updateAnnotationPosition(nodeLabelSvgEl, nodeLabel.display.x, nodeLabel.display.y, offset, offset, orientation);
            }
            var connectedNodes = dataModelInstance.getConnectedNodeLabels(nodeLabel);
            connectedNodes.map(connectedNodeLabel => {
                var connectedNodeSvgEl = getSvgNodeEl(connectedNodeLabel);
                var orientation = getNodeLabelAnnotationOrientation(connectedNodeLabel);
                var offset = getNodeLabelAnnotationOffset(connectedNodeLabel);
                graphCanvasAnnotation.updateAnnotationPosition(connectedNodeSvgEl, connectedNodeLabel.display.x, connectedNodeLabel.display.y, offset, offset, orientation);
            })
        }

        if (graphCanvasGlyph.hasAnyGlyphs(nodeLabel)) {
            const glyphs = graphCanvasGlyph.getGlyphs(nodeLabel);
            glyphs.map(glyph => {
                var offset = getNodeLabelGlyphOffset(nodeLabel)
                graphCanvasGlyph.updateGlyphPosition(nodeLabelSvgEl, nodeLabel.display.x, nodeLabel.display.y, offset, offset, glyph);
            })
        }

        var connections = dataModelInstance.getConnectedRelationshipTypes(nodeLabel);
        for (var i = 0; i < connections.length; i++) {
            var aConnection = connections[i];
            updateRelationshipTypePosition(aConnection);
            updateTextPosition(aConnection);
        }
        if (!ignoreChange) {
            //dataModelInstance.dataChanged();
            dataModelInstance.dataChanged(dataModelInstance.DataChangeType.NodeLabelDisplayUpdate, { changedObject: nodeLabel });
        }
    }

    var canvasDragCoords;
    var rectangleStartPoint;
    var rectangleEndPoint;

    function startMultiSelect (event) {
        mode = MODES.MULTI_SELECT;
        var coords = d3Mouse(event);
        rectangleStartPoint = {
            //x: coords.x / scaleFactor - currentPan.x,
            //y: coords.y / scaleFactor - currentPan.y
            x: coords.x,
            y: coords.y
        }

        rectangleEndPoint = { ...rectangleStartPoint };
        svg.append("rect")
            .attr("class", "selectionRect")
            .attr("x", rectangleStartPoint.x)
            .attr("y", rectangleStartPoint.y)
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "1,1")
            .style("fill", "transparent");
    }

    function canvasDragstarted (event, d) {
        canvasDragCoords = d3Mouse(event); 

        if (shiftDown) {
            startMultiSelect(event);
        }
    }

    function adjustForPanAndZoom (x, y) {
        var middleX = canvasWidth / 2;
        var middleY = canvasHeight / 2;
        var modifiedX = middleX + (x - middleX) * scaleFactor;
        var modifiedY = middleY + (y - middleY) * scaleFactor;
        var newx = modifiedX + currentPan.x;
        var newy = modifiedY + currentPan.y;

        return {
            x: newx,
            y: newy
        }
    }

    function getVisibleRect () {
        var newX = -currentPan.x / scaleFactor;
        var newY = -currentPan.y / scaleFactor;
        var newWidth = (canvasWidth - currentPan.x) / scaleFactor;
        var newHeight = (canvasHeight - currentPan.y) / scaleFactor;

        return {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            scaleFactor: scaleFactor
        }
    }

    function handleMultiSelectDrag (event) {
        rectangleEndPoint = d3Mouse(event);

        var selectionRect = svg.select(".selectionRect");
        var startX = (rectangleStartPoint.x < rectangleEndPoint.x) ? rectangleStartPoint.x : rectangleEndPoint.x;
        var startY = (rectangleStartPoint.y < rectangleEndPoint.y) ? rectangleStartPoint.y : rectangleEndPoint.y;
        var width = Math.abs(rectangleEndPoint.x - rectangleStartPoint.x);
        var height = Math.abs(rectangleEndPoint.y - rectangleStartPoint.y);
        //console.log('right_rect: ', startX + width, ', bottom_rect: ', startY + height)
        selectionRect
            .attr("x", startX)
            .attr("y", startY)
            .attr("width", width)
            .attr("height", height);

        svg.selectAll(".relationshipType").each(function(relationshipType, i) {
            var linePath = d3.select(this).select(".relationshipLine").attr("d")
            var arr = linePath.split(/[MC,]/).slice(1);
            var line1X = parseFloat(arr[0]);
            var line1Y = parseFloat(arr[1]);
            var line2X = parseFloat(arr[arr.length-2]);
            var line2Y = parseFloat(arr[arr.length-1]);

            var intersects = lineIntersectsWithRectangle(
                line1X, line1Y, line2X, line2Y,
                startX, startY, startX + width, startY + height
            );

            if (intersects) {
                addRelSelection(this, relationshipType, true);
            } else {
                removeRelSelection(this, relationshipType, true);
            }
        });

        // select nodes that are within the rectangle
        svg.selectAll(".nodeLabel").each(function(nodeLabel, i) {
            var displayCircle = d3.select(this).select(".displayCircle")
            var cx = parseFloat(displayCircle.attr('cx'));
            var cy = parseFloat(displayCircle.attr('cy'));
            var r = parseFloat(displayCircle.attr('r'));

            var intersects = rectanglesIntersect(
                cx - r, cy - r, cx + r, cy + r,
                startX, startY, startX + width, startY + height
            );

            if (intersects) {
                //console.log('intersects');
                addNodeSelection(this, nodeLabel, true);
            } else {
                removeNodeSelection(this, nodeLabel, true);
            }
        });
    }

    function canvasDragged (event, d) {
        if (mode === MODES.MULTI_SELECT) {
            handleMultiSelectDrag(event);
        } else {
            if (shiftDown) {
                startMultiSelect(event);
            } else {
                var coords = d3Mouse(event);
                var diffX = coords.x-canvasDragCoords.x;
                var diffY = coords.y-canvasDragCoords.y;
                //canvasDragCoords = coords; // not needed for d3 v6 and above. d3.pointer takes 'g' which and accounts for current zoom/pan
                updatePanTransform (diffX, diffY);
            }
        }
    }

    function updatePanTransform (diffX, diffY) {
        currentTransform = currentTransform.translate(diffX, diffY);
        currentPan.x += diffX * scaleFactor;
        currentPan.y += diffY * scaleFactor;
        svg.call(zoom.transform, currentTransform);
        //svg.attr("transform", "translate(" + currentTransform.x + ", " + currentTransform.y + ")scale(" + (currentTransform.k) + ")");
        // it didn't really change, but it this will trigger a save
        //dataModelInstance.dataChanged();
        dataModelInstance.dataChanged(dataModelInstance.DataChangeType.CanvasTransformUpdate, { });
    }

    function panTo (thingToPanTo) {
        var position;
        if (thingToPanTo.classType === 'NodeLabel') {
            position = {
                x: thingToPanTo.display.x,
                y: thingToPanTo.display.y
            }
        } else if (thingToPanTo.classType === 'RelationshipType') {
            position = {
                x: thingToPanTo.startNodeLabel.display.x + (thingToPanTo.endNodeLabel.display.x - thingToPanTo.startNodeLabel.display.x) / 2,
                y: thingToPanTo.startNodeLabel.display.y + (thingToPanTo.endNodeLabel.display.y - thingToPanTo.startNodeLabel.display.y) / 2
            }
        }
        var diffX = canvasWidth / 2 - position.x;
        var diffY = (canvasHeight / 2) - 50 - position.y;   // 50 is to make it slightly higher on screen
        updatePanTransform (diffX - currentPan.x, diffY - currentPan.y);
    }

    function deleteSelectionRect () {
        svg.select(".selectionRect").remove();
    }

    function notifyCurrentSelectedNodeLabels () {
        var selectedNodeLabels = getSelectedNodeLabelArray();
        var selectedNodeLabelKeys = selectedNodeLabels.map(x => x.key);
        notifyListeners(CANVAS_MESSAGES.CURRENT_SELECTED_ITEMS, selectedNodeLabelKeys, selectedNodeLabels);
    }

    function canvasDragended (event, d) {
        if (mode ===MODES.MULTI_SELECT) {
            deleteSelectionRect();
            notifyCurrentSelectedNodeLabels();
        }
        mode = MODES.SELECT;
    }

    function dragged(event, nodeLabel) {
        if (dragEnabled) {
            var coords = d3Mouse(event);
            //console.log('event pageX, event pageY: ', event.pageX, event.pageY);

            updateNodeLabelPosition(nodeLabel, this, coords);
            getSelectedNodeLabelArray()
                .filter(x => x.key !== nodeLabel.key)
                .map(x => {
                    var newCoords = {
                        x: coords.x + distanceMap[x.key].x,
                        y: coords.y + distanceMap[x.key].y
                    }
                    //console.log('otherNodeLabel: ', x);
                    //console.log('newCoords', newCoords);
                    updateNodeLabelPosition(x, getSvgNodeEl(x), newCoords);
                });
        }
    }

    function dragended(event, nodeLabel) {
        if (dragEnabled) {
            d3.select(this).select(".displayCircle").classed("active", false);
            //notifyListeners(CANVAS_MESSAGES.NODE_MOVED);
        }
    }

    // from: https://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
    function computeAngle(cx, cy, ex, ey) {
      var dy = ey - cy;
      var dx = ex - cx;
      var theta = Math.atan2(dy, dx); // range (-PI, PI]
      //theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
      //if (theta < 0) theta = 360 + theta; // range [0, 360)
      return theta;
    }

    function computeRelationshipAngle (aConnection) {
        var angleInDegrees = 0;
        var connectToSelf = false;
        var x1 = 0, y1 = 0, x2 = 0, y2 = 0;

        if (aConnection.startNodeLabel && aConnection.endNodeLabel) {
            connectToSelf = (aConnection && aConnection.startNodeLabel == aConnection.endNodeLabel) ? true : false;

            if (connectToSelf) {
                var cx = aConnection.startNodeLabel.display.x;
                var cy = aConnection.startNodeLabel.display.y;
                var radius = aConnection.startNodeLabel.display.radius;
                var cps = getLookbackControlPoints(cx, cy, radius, 0);
                x1 = cps[1].x;
                y1 = cps[1].y;
                x2 = cps[0].x;
                y2 = cps[0].y;
            } else {
                x1 = aConnection.startNodeLabel.display.x;
                y1 = aConnection.startNodeLabel.display.y;
                x2 = aConnection.endNodeLabel.display.x;
                y2 = aConnection.endNodeLabel.display.y;
            }

            var angle = computeAngle(x1, y1, x2, y2);
            angleInDegrees = angle * (180 / Math.PI);

        }
        return {
            angleInDegrees: angleInDegrees,
            connectToSelf: connectToSelf,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        }
    }

    function computeAnnotationAngle (aConnection) {
        var result = computeRelationshipAngle(aConnection);

        if (result.y2 < result.y1) {
            result.angleInDegrees += 180;
        }

        return result.angleInDegrees;
    }

    function computeTextAngle(aConnection) {
        var result = computeRelationshipAngle(aConnection);
        if (result.angleInDegrees > 90) {
            result.angleInDegrees -= 180;
        } else if (result.angleInDegrees < -90) {
            result.angleInDegrees += 180;
        }

        if (result.connectToSelf) {
            result.angleInDegrees -= 180;
        }

        return result.angleInDegrees;
    }

    function updateTextPosition (aConnection) {
        var domText = textMap[aConnection.key];
        var text = d3.select(domText)

        var angleInDegrees = computeTextAngle(aConnection);

        ////console.log("angleInDegrees:" + angleInDegrees);
        var textPosition = getTextPosition(aConnection);
        text.attr("x", textPosition.x)
            .attr("y", textPosition.y)
            .attr("transform", "rotate(" + angleInDegrees + " " + textPosition.x + " " + textPosition.y + ")")
            .text(function (aConnection) { return getRelationshipText(aConnection); })
    }

    function getLookbackControlPoints (cx, cy, radius, offset) {
        var radiusMultiplier = offset / radius + 1;

        var angle1 = (25 * Math.PI) / 32;
        var angle2 = (31 * Math.PI) / 32;

        var sinVal1 = Math.sin(angle1);
        var cosVal1 = Math.cos(angle1);
        var sinVal2 = Math.sin(angle2);
        var cosVal2 = Math.cos(angle2);

        var control1X = radiusMultiplier * radius * cosVal1 + cx - lineGap;
        var control1Y = radiusMultiplier * radius * sinVal1 + cy - lineGap;
        var control2X = radiusMultiplier * radius * cosVal2 + cx - lineGap;
        var control2Y = radiusMultiplier * radius * sinVal2 + cy - lineGap;

        return [
            {
                x: control1X,
                y: control1Y
            },
            {
                x: control2X,
                y: control2Y
            }
        ]
    }

    function getLoopbackLine (cx, cy, radius, offset) {

        var angle = (3 * Math.PI) / 4;
        var sinVal = Math.sin(angle);
        var cosVal = Math.cos(angle);

        var startX = radius * cosVal + cx - lineGap;
        var startY = radius * sinVal + cy - lineGap;
        var markerWidthOffset = (showArrows) ? 5 : 0;
        var endX = cx - radius - markerWidthOffset - lineGap;
        var endY = cy - lineGap;

        var cps = getLookbackControlPoints(cx, cy, radius, offset);

        var lineString = lineGenerator([[startX, startY], [cps[0].x, cps[0].y], [cps[1].x, cps[1].y], [endX, endY]]);
        return lineString;
    }

    function computeConnectorEndPoints (startX, startY, startRadius, endX, endY, endRadius, relationship) {

        var offset = (relationship && relationship.display && relationship.display.offset) ? relationship.display.offset : 0;
        var angle = Math.abs(computeAngle(startX,
                                 startY,
                                 endX,
                                 endY))

        ////console.log("offset = " + offset);
        var x1Offset = (startRadius + lineGap) * Math.abs(Math.cos(angle));
        var y1Offset = (startRadius + lineGap) * Math.abs(Math.sin(angle));
        var x2Offset = 0;
        var y2Offset = 0;
        
        const markerWidthOffset = (showArrows) ? markerWidth : 0;
        if (!endRadius == 0) {
            x2Offset = -((endRadius + markerWidthOffset + lineGap) * Math.abs(Math.cos(angle)));
            y2Offset = -((endRadius + markerWidthOffset + lineGap) * Math.abs(Math.sin(angle)));
        }

        var curveOffset = (offset / 4);
        var curveOffsetX = curveOffset * Math.cos(angle + Math.PI/2);
        var curveOffsetY = curveOffset * Math.sin(angle + Math.PI/2);
        if (startY > endY) {
            curveOffsetX = -curveOffsetX;
        }
        if (startX > endX) {
            x1Offset = -x1Offset + curveOffsetX;
            x2Offset = -x2Offset + curveOffsetX;
        } else {
            x1Offset = x1Offset + curveOffsetX;
            x2Offset = x2Offset + curveOffsetX;
        }
        ////console.log("curveOffset = " + curveOffset);

        if (startY > endY) {
            y1Offset = -y1Offset + curveOffsetY;
            y2Offset = -y2Offset + curveOffsetY;
            ////console.log("startY greater than endY");
        } else {
            y1Offset = y1Offset + curveOffsetY;
            y2Offset = y2Offset + curveOffsetY;
            ////console.log("endY greater than startY");
        }

        /* compute start and end points */
        var x1 = startX + x1Offset;
        var y1 = startY + y1Offset;
        var x2 = endX + x2Offset;
        var y2 = endY + y2Offset;

        return {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        }

    }

    function updateConnectorPosition (d3line, startX, startY, startRadius, endX, endY, endRadius, connectToSelf) {

        var lineString;
        var relationship = d3line.datum();
        var offset = (relationship && relationship.display && relationship.display.offset) ? relationship.display.offset : 0;

        if (connectToSelf) {
            lineString = getLoopbackLine (startX, startY, startRadius, offset);
        } else {
            var points = computeConnectorEndPoints (startX, startY, startRadius, endX, endY, endRadius, relationship);
            if (relationship) {
                var midpoint = computeMidPoint(relationship, points.x1, points.x2, points.y1, points.y2);
                lineString = lineGenerator([[points.x1, points.y1], [midpoint.xMidPoint, midpoint.yMidPoint], [points.x2, points.y2]]);
            } else {
                lineString = lineGenerator([[points.x1, points.y1], [points.x2, points.y2]]);
            }
            /* compute midpoints */
            ////console.log("xMidPoint: " + xMidPoint + ", yMidPoint: " + yMidPoint);

            /*
            d3line.attr("x1", startX + x1Offset)
                .attr("y1", startY + y1Offset)
                .attr("x2", endX + x2Offset)
                .attr("y2", endY + y2Offset)
            */
        }
        d3line.attr("d", lineString);
    }

    function computeMidPoint (relationship, x1, x2, y1, y2, additionalOffset) {
        var offset = (relationship && relationship.display && relationship.display.offset) ? relationship.display.offset : 0;
        additionalOffset = (additionalOffset) ? additionalOffset : 0;
        var angleRadians = Math.atan2(y2 - y1, x2 - x1);

        //var angleInDegrees = angleRadians * 180 / Math.PI;
        //var offsetAngleInDegrees = angleInDegrees + 90;
        ////console.log("x1: " + x1 + ", y1: " + y1 + ", x2: " + x2 + ", y2: " + y2);
        ////console.log("angleRadians: " + angleRadians);
        ////console.log("angleInDegrees: " + angleInDegrees);
        ////console.log("offsetAngleInDegrees: " + offsetAngleInDegrees);
        ////console.log("offsetAngleRadians: " + (angleRadians + Math.PI / 2));
        var totalOffset = offset + additionalOffset;
        ////console.log("totalOffset: " + totalOffset);
        var xOffset = totalOffset * Math.cos(angleRadians + Math.PI / 2);
        var yOffset = totalOffset * Math.sin(angleRadians + Math.PI / 2);

        var centerX = (x1 + x2) / 2;
        var centerY = (y1 + y2) / 2;
        var xMidPoint = centerX + xOffset;
        var yMidPoint = centerY + yOffset;
        ////console.log("xMidPoint: " + xMidPoint + ", yMidPoint: " + yMidPoint + ", xOffset: " + xOffset + ", yOffset: " + yOffset + ", centerX: " + centerX + ", centerY " + centerY);
        /*
        var xOffset = (offset + additionalOffset) * Math.cos(angleRadians + (Math.PI * .5));
        var yOffset = (offset + additionalOffset) * Math.sin(angleRadians + (Math.PI * .5));
        var xMidPoint = x1 + (x2-x1)/2 + xOffset;
        var yMidPoint = y1 + (y2-y1)/2 + yOffset;
        */
        return {
            xMidPoint: xMidPoint,
            yMidPoint: yMidPoint
        }
    }

    function updateRelationshipTypePosition (aConnection) {
        if (aConnection && aConnection.startNodeLabel && aConnection.endNodeLabel) {
            var domLine = linkMap[aConnection.key];
            var line = d3.select(domLine);
            var connectToSelf = (aConnection && aConnection.startNodeLabel == aConnection.endNodeLabel) ? true : false;
            updateConnectorPosition (line, aConnection.startNodeLabel.display.x,
                                     aConnection.startNodeLabel.display.y,
                                     aConnection.startNodeLabel.display.radius,
                                     aConnection.endNodeLabel.display.x,
                                     aConnection.endNodeLabel.display.y,
                                     aConnection.endNodeLabel.display.radius, connectToSelf);

            // update relRibbon
            ////console.log('updateRelationshipTypePosition');
            d3.select(domLine.parentNode).selectAll(".relRibbon")
                .attr("transform", function(ribbonData, index) {
                    var point = getRibbonPoint(ribbonData.relationshipType, ribbonData.actions);
                    ////console.log('ribbon button index: ' + index);
                    var x = point.x + (index * relRibbonButtonWidth);
                    ////console.log('x: ' + x);
                    var translate = "translate(" + x + "," + point.y + ")";
                    ////console.log('translate: ' + translate);
                    return translate;
                });

            //var point = getRibbonPoint(aConnection, [], true);
            var point = getTextPosition(aConnection);
            if (displayAnnotations) {
                var annotationOffset = getRelationshipAnnotationOffset(aConnection, point);
                graphCanvasAnnotation.updateAnnotationPosition(domLine.parentNode, point.x, point.y, annotationOffset.x, annotationOffset.y, annotationOffset.orientation);
            }

            if (graphCanvasGlyph.hasAnyGlyphs(aConnection)) {
                //console.log('calling updateGlyphPosition');
                graphCanvasGlyph.updateGlyphPosition(domLine.parentNode, point.x, point.y, 0, 0, GLYPH_ORIENTATION.CENTER);
            }
        }
    }

    function getNodeLabelAnnotationOrientation (nodeLabel) {
        var relationshipTypes = dataModelInstance.getConnectedRelationshipTypes(nodeLabel);
        if (relationshipTypes.length > 0) {
            var indexes = relationshipTypes.map(x => {
                var angle = computeRelationshipAngle(x).angleInDegrees;
                ////console.log("angle0: " + angle);
                if (x.endNodeLabel == nodeLabel) {
                    ////console.log("angle1: " + angle);
                    angle = (angle + 180) % 360;
                }
                if (angle < 0) {
                    angle = (360 + angle)
                    ////console.log("angle2: " + angle);
                }
                var index = getLineOrientationIndex(angle);
                ////console.log("index: " + index);
                return index;
            });
            ////console.log("indexes");
            ////console.log(indexes);

            /* old way: average of position and then put it on other side.
                Problems: doesn't handle cross between 7 and 0 positions, and breaks down with more connections
            var avg = Math.floor(indexes.reduce((total, x) => total + x, 0) / indexes.length);
            var openIndex = (avg + 4) % 8;
            */

            /* new way: compute largest continuous opening - then put it in the middle */
            // range of 0-7
            var slots = [...Array(8).keys()]; // https://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-a-range-within-the-supp
            var openSlotRanges = [];
            var openSlotRange = [];
            for (var i = 0; i < slots.length; i++) {
                if (!indexes.includes(i)) {
                    openSlotRange.push(i);
                } else {
                    if (openSlotRange.length > 0) {
                        // stop the range and add it to ranges
                        openSlotRanges.push(openSlotRange);
                        openSlotRange = [];
                    }
                }
            }
            if (openSlotRange.length > 0) {
                openSlotRanges.push(openSlotRange);
            }
            ////console.log("openSlotRanges1: " + JSON.stringify(openSlotRanges));
            if (openSlotRanges.length > 1 && openSlotRanges[0].includes(0)
                && openSlotRanges[openSlotRanges.length-1].includes(7)) {
                // combine them because they are connected - put the 0 range last
                openSlotRanges[0] = openSlotRanges[openSlotRanges.length-1].concat(openSlotRanges[0]);
                openSlotRanges.pop();
            }
            ////console.log("openSlotRanges2: " + JSON.stringify(openSlotRanges));
            // get the range with the most indexes - it is the largest
            var biggestRange = [];
            for (i = 0; i < openSlotRanges.length; i++) {
                if (openSlotRanges[i].length > biggestRange.length) {
                    biggestRange = openSlotRanges[i];
                }
            }
            ////console.log("biggestRange: " + JSON.stringify(biggestRange));
            // best open slot is the middle of the range
            var openIndex = -1;
            if (biggestRange.length > 0) {
                openIndex = biggestRange[Math.floor((biggestRange.length-1)/2)];
                ////console.log("openIndex: " + openIndex);
            }

            var orientation = ORIENTATION.LEFT;
            switch (openIndex) {
                case 0:
                    orientation = ORIENTATION.RIGHT;
                    break;
                case 1:
                    orientation = ORIENTATION.BOTTOM_RIGHT;
                    break;
                case 2:
                    orientation = ORIENTATION.BOTTOM;
                    break;
                case 3:
                    orientation = ORIENTATION.BOTTOM_LEFT;
                    break;
                case 4:
                    orientation = ORIENTATION.LEFT;
                    break;
                case 5:
                    orientation = ORIENTATION.TOP_LEFT;
                    break;
                case 6:
                    orientation = ORIENTATION.TOP;
                    break;
                case 7:
                    orientation = ORIENTATION.TOP_RIGHT;
                    break;
            }
            return orientation;
            ////console.log(angles);
        } else {
            return ORIENTATION.LEFT;
        }
    }

    function getLineOrientationIndex (angle) {
        // 0 = RIGHT,  45 BOTTOM_RIGHT, 90 = BOTTOM, etc
        // RIGHT = 0, BOTTOM_RIGHT = 1, BOTTOM = 2, etc
        var index = Math.floor((angle / 45) + 0.5) % 8; // mod 8 so that 8 will roll back to 0
        return index;
    }

    function getRelationshipTypeAnnotationOrientation (relationshipType) {
        var angleInDegrees = computeAnnotationAngle(relationshipType);
        ////console.log(angleInDegrees);
        var orientation;
        if (relationshipType.startNodeLabel == relationshipType.endNodeLabel) {
            var relationshipNumber = Math.floor(relationshipType.display.offset / relationshipType.startNodeLabel.display.radius);
            if (relationshipNumber == 1) {
                return ORIENTATION.BOTTOM_RIGHT;
            } else if (relationshipNumber == 2) {
                return ORIENTATION.BOTTOM_LEFT;
            } else {
                return ORIENTATION.BOTTOM_RIGHT;
            }
        } else {
            if (angleInDegrees >= 170 || angleInDegrees <= 10) {
                orientation = ORIENTATION.BOTTOM;
            } else if (angleInDegrees <= 90) {
                if (angleInDegrees <= 75) {
                    orientation = ORIENTATION.BOTTOM_LEFT;
                } else {
                    orientation = ORIENTATION.LEFT;
                }
            } else {
                if (angleInDegrees >= 105) {
                    orientation = ORIENTATION.BOTTOM_RIGHT;
                } else {
                    orientation = ORIENTATION.RIGHT;
                }
            }
            return orientation;
        }
    }


    function getNodeLabel (label) {
        return dataModelInstance.getPrimaryNodeLabelAndEnsureSecondaryNodeLabels(label, dataModelInstance);
    }

    function addNodeLabel (label, deferRender) {
        console.log(`addNodeLabel: ${label}`)
        var existingNodeLabel = getNodeLabel(label);
        if (existingNodeLabel) {
            if (existingNodeLabel.isOnlySecondaryNodeLabel) {
                existingNodeLabel.setIsOnlySecondaryNodeLabel(false);
                setNewNodeLabelPosition(existingNodeLabel, null, null, dataModelInstance, { ...getVisibleRect(), snapToGrid: snapToGrid });
                if (!deferRender) {
                    renderDataModel();
                    focusNewNode(existingNodeLabel);
                }
            } else {
                //throw ERROR_MESSAGES.NODE_LABEL_MUST_BE_UNIQUE;
                reRenderNodeLabel(existingNodeLabel);
                focusNewNode(existingNodeLabel);
            }
        } else {
            return addNodeLabelWithPosition(label, null, null, deferRender);
        }
    }

    function addNodeLabelWithPosition (label, x, y, deferRender) {
        var nodeLabel = dataModelInstance.createPrimaryNodeLabelWithSecondaryNodeLabels(label, dataModelInstance);
        //setNewNodeLabelPosition(nodeLabel, x, y, dataModelInstance, { width: canvasWidth, height: canvasHeight, snapToGrid: snapToGrid});
        setNewNodeLabelPosition(nodeLabel, x, y, dataModelInstance, { ...getVisibleRect(), snapToGrid: snapToGrid });
        dataModelInstance.addNodeLabel(nodeLabel);
        if (!deferRender) {
            renderDataModel();
            focusNewNode(nodeLabel);
        }
        return nodeLabel;
    }

    function addCreatedNodeLabelWithPosition (createdNodeLabel, x, y, deferRender) {
        var margin = 150;
        createdNodeLabel.display.x = (x == undefined || x == null) ? margin + Math.floor(Math.random()*(canvasWidth-(margin*2))) : x;
        createdNodeLabel.display.y = (y == undefined || y == null) ? margin + Math.floor(Math.random()*(canvasHeight-(margin*2))) : y;
        return createdNodeLabel;
    }

    function addRelationshipType (type, startNodeLabel, endNodeLabel, deferRender) {
        var properties = {
            type: type,
            startNodeLabel: startNodeLabel,
            endNodeLabel: endNodeLabel
        }
        var relationshipType = new dataModelInstance.RelationshipType(properties);
        dataModelInstance.addRelationshipType(relationshipType);
        //console.log('calling computeRelationshipTypeOffsets in addRelationshipType')
        computeRelationshipTypeOffsets(startNodeLabel, endNodeLabel, relationshipType);
        //notifyListeners(CANVAS_MESSAGES.ADD_NEW_RELATIONSHIP_TYPE, relationshipType.key, relationshipType);
        if (!deferRender)
            renderDataModel();
        return relationshipType;
    }

    function computeRelationshipTypeOffsets (startNodeLabel, endNodeLabel, newRelationshipType) {
        var invertOffset = false;
        if (startNodeLabel.display.x > endNodeLabel.display.x ||
            (startNodeLabel.display.x === endNodeLabel.display.x && startNodeLabel.display.y > endNodeLabel.display.y)) {
            invertOffset = true;
        }

        var connections = dataModelInstance.getConnectedRelationshipTypeBetweenNodeLabels(startNodeLabel, endNodeLabel).reverse();
        if (connections) {
            var relId = null, relDomEl = null, connectionToUpdate = null;
            if (connections.length == 1) {
                if (startNodeLabel == endNodeLabel) {
                    //connections[0].display.offset = startNodeLabel.display.radius;
                    connections[0].setDisplayOffset(40);
                } else {
                    connections[0].setDisplayOffset(0);
                }

                if (newRelationshipType && connections[0] !== newRelationshipType) {
                    /*
                    relId = ID_PREFIXES.RELATIONSHIP_TYPE + connections[0].key;
                    relDomEl = d3.select("#" + relId);
                    */
                    relDomEl = getD3RelEl(connections[0]);
                    if (relDomEl && relDomEl.datum) {
                        connectionToUpdate = relDomEl.datum();
                        updateRelationshipTypePosition(connectionToUpdate);
                        updateTextPosition(connectionToUpdate);
                    }
                }
            } else {
                var offsetIncrement = 25;
                for (var i = 0; i < connections.length; i++) {
                    var aConnection = connections[i];
                    var offset = 0;
                    if (startNodeLabel == endNodeLabel) {
                        //offset = startNodeLabel.display.radius * (i + 1);
                        offset = 40 * (i + 1);
                    } else {
                        offset = Math.floor((i + 2) / 2) * offsetIncrement;
                        if (invertOffset) {
                            offset = -offset;
                        }
                        if ((i % 2) === 1) {
                            offset = -offset;   // we want to make it negative to mirror the first slot - this is normal if both are facing forward
                        }
                        if (aConnection.startNodeLabel === endNodeLabel) {
                            offset = -offset;
                        }
                        //console.log('i = ' + i + ', offset = ' + offset);

                        /*
                        if (i % 2 > 0) {
                            if (aConnection.startNodeLabel == startNodeLabel) {
                                offset = -offset;
                            }
                        } else {
                            if (aConnection.startNodeLabel == endNodeLabel) {
                                offset = -offset;
                            }
                        }*/
                    }
                    aConnection.setDisplayOffset(offset);
                    //console.log('aConnection.type: ' + aConnection.type + ', offset: ' + offset);
                    if (newRelationshipType && aConnection !== newRelationshipType) {
                        /*
                        relId = ID_PREFIXES.RELATIONSHIP_TYPE + aConnection.key;
                        relDomEl = d3.select("#" + relId);
                        */
                        relDomEl = getD3RelEl(aConnection);
                        if (relDomEl && relDomEl.datum) {
                            connectionToUpdate = relDomEl.datum();
                            updateRelationshipTypePosition(connectionToUpdate);
                            updateTextPosition(connectionToUpdate);
                        }
                    }
                }
            }
        }
    }

    var highlightSubgraph = function (tempDataModel, highlightNodeClass, highlightRelClass) {
        //var matches = dataModelInstance.getMatchingSubgraph(tempDataModel);

        var nodes = svg.selectAll(".nodeLabel");
        nodes.each(function (nodeLabel) {
            var matchingNodeLabel = tempDataModel.getNodeLabelByLabel(nodeLabel.label);
            if (matchingNodeLabel) {
                d3.select(this).select(".displayCircle").classed(highlightNodeClass, true);
            }
        });

        var relationships = svg.selectAll(".relationshipType");
        relationships.each(function (relationshipType) {
            var matchingRelationshipType = tempDataModel.doesMatchingRelationshipTypeExist(relationshipType);
            if (matchingRelationshipType) {
                d3.select(this).select(".relationshipLine").classed(highlightRelClass, true);
            }
        });
    }

    var removeSubgraphHighlight = function (tempDataModel, highlightNodeClass, highlightRelClass) {
        //var matches = dataModelInstance.getMatchingSubgraph(tempDataModel);

        var nodes = svg.selectAll(".nodeLabel");
        nodes.each(function (nodeLabel) {
            var matchingNodeLabel = tempDataModel.getNodeLabelByLabel(nodeLabel.label);
            if (matchingNodeLabel) {
                d3.select(this).select(".displayCircle").classed(highlightNodeClass, false);
            }
        });

        var relationships = svg.selectAll(".relationshipType");
        relationships.each(function (relationshipType) {
            var matchingRelationshipType = tempDataModel.doesMatchingRelationshipTypeExist(relationshipType);
            if (matchingRelationshipType) {
                d3.select(this).select(".relationshipLine").classed(highlightRelClass, false);
            }
        });

    }

    var removeAllSubgraphHighlights = function (highlightNodeClass, highlightRelClass) {
        var nodes = svg.selectAll(".nodeLabel");
        nodes.each(function (nodeLabel) {
            d3.select(this).select(".displayCircle").classed(highlightNodeClass, false);
        });

        var relationships = svg.selectAll(".relationshipType");
        relationships.each(function (relationshipType) {
            d3.select(this).select(".relationshipLine").classed(highlightRelClass, false);
        });
    }

    var removeNodeLabel = function (key) {
        dataModelInstance.removeNodeLabelByKey(key);
        renderDataModel();
    }

    function removeRelationshipsForNodeLabel (nodeLabelKey) {
        var relationshipTypeArray = dataModelInstance.getRelationshipTypesForNodeLabelByKey(nodeLabelKey);
        for (var i = 0; i < relationshipTypeArray.length; i++) {
            removeRelationshipType(relationshipTypeArray[i].key);
        }
        //dataChanged();
    }

    var removeRelationshipType = function (key) {
        var relationshipType = dataModelInstance.getRelationshipTypeByKey(key);
        if (relationshipType) {
            var startNodeLabel = relationshipType.startNodeLabel;
            var endNodeLabel = relationshipType.endNodeLabel;
            dataModelInstance.removeRelationshipTypeByKey(key);

            var remainingConnections = dataModelInstance.getConnectedRelationshipTypeBetweenNodeLabels(startNodeLabel, endNodeLabel);
            //remainingConnections.map(connection => connection.display.offset = 0);
            computeRelationshipTypeOffsets(startNodeLabel, endNodeLabel);
            remainingConnections.map(connection => reRenderRelationshipType(connection));
            renderDataModel();
        } else {
            //alert('Could not find relationship type for key: ' + key);
        }
    }

    // ******************
    // Text editing stuff
    // ******************
    var thingToEdit = null;
    var svgEditTextEl = null;
    var currentText = null;
    var activelyEditing = false;
    var defaultMinWidth = 120;
    var maxWidth = 600;

    function handleEdit (el) {
        var d3El = d3.select(el);
        thingToEdit = d3El.datum();
        var svgTextEl = d3El.select(".displayText");

        var currentX = parseFloat(svgTextEl.attr("x"));
        var currentY = parseFloat(svgTextEl.attr("y"));

        var cx = canvasWidth / 2;
        var cy = canvasHeight / 2;

        var modifiedX = cx + (currentX - cx) * scaleFactor;
        var modifiedY = cy + (currentY - cy) * scaleFactor;

        var x = modifiedX + canvasParentElement.offset().left;
        var y = modifiedY + canvasParentElement.offset().top;

        x += currentPan.x;
        y += currentPan.y;

        var text = (thingToEdit.getTextWithSecondaryNodeLabels) ? 
                thingToEdit.getTextWithSecondaryNodeLabels() : thingToEdit.getText();
        var textLen = (text && typeof(text.length) === 'number') ? text.length : 0;

        containerCallback({
            message: CONTAINER_CALLBACK_MESSAGES.REQUEST_EDIT,
            canvasDimensions: {
                x: 0,
                y: 0,
                width: canvasWidth * 2,
                height: canvasHeight * 2
            },
            popupPosition: { x: x, y: y },
            expectedTextLength: textLen,
            propertyContainer: thingToEdit
        });
    }

    function handleEditOld (el) {
        var d3El = d3.select(el);
        thingToEdit = d3El.datum();
        //console.log('thingToEdit');
        //console.log(thingToEdit);
        var minWidth;
        if (thingToEdit.classType == "NodeLabel") {
            var svgCircleEl = d3El.select(".displayCircle")
            minWidth = parseFloat(svgCircleEl.attr("r")) * 2;    // radius * 2
            currentText = thingToEdit.label;
            //console.log('setting currentText to: ' + currentText);
        } else if (thingToEdit.classType == "RelationshipType") {
            currentText = thingToEdit.type;
            minWidth = defaultMinWidth;
            //console.log('setting currentText to: ' + currentText);
        }
        var textLength = (currentText) ? currentText.length : 20;
        var characterSpacing = (currentText && currentText.toUpperCase && currentText.toUpperCase() === currentText) ? 10 : 8;
        var width = textLength * characterSpacing;
        if (width < minWidth) {
            width = minWidth;
        }
        if (width > maxWidth) {
            width = maxWidth;
        }

        var svgTextEl = d3El.select(".displayText");
        svgEditTextEl = svgTextEl;
        var editTextBox = $("#editTextBox");
        /*
        if (svgTextEl._groups && svgTextEl._groups[0] && svgTextEl._groups[0][0] && svgTextEl._groups[0][0].getBBox()) {
            var bbox = svgTextEl._groups[0][0].getBBox()
            if (bbox.width > width) {
                width = bbox.width + 2;
            }
        }*/
        var currentX = parseFloat(svgTextEl.attr("x"));
        var currentY = parseFloat(svgTextEl.attr("y"));

        /*
        //console.log("currentX: " + currentX + ", currentY: " + currentY);
        //console.log("canvasParentElement.offset().left: " + canvasParentElement.offset().left);
        //console.log("canvasParentElement.offset().top: " + canvasParentElement.offset().top);
        //console.log("(width / 2): " + (width / 2));
        //console.log("editTextBox.height() / 2: " + editTextBox.height() / 2);
        */
        var cx = canvasWidth / 2;
        var cy = canvasHeight / 2;
        ////console.log("cx: " + cx + ", cy: " + cy);
        //cx += currentOffset.x;
        //cy += currentOffset.y;

        var modifiedX = cx + (currentX - cx) * scaleFactor;
        var modifiedY = cy + (currentY - cy) * scaleFactor;
        ////console.log("modifiedX: " + modifiedX + ", modifiedY: " + modifiedY);
        ////console.log("scaleFactor: " + scaleFactor);

        var x = modifiedX + canvasParentElement.offset().left - (width / 2);
        var y = modifiedY + canvasParentElement.offset().top - editTextBox.height() / 2;

        x += currentPan.x;
        y += currentPan.y;
        //x += currentOffset.x;
        //y += currentOffset.y;
        ////console.log("showing edit text box at: x: " + x + ", y: " + y);

        editTextBox.css({
            "left": x,
            "top": y,
            "border": "1px solid black",
            "background-color": "white",
            "font-family": svgTextEl.attr("font-family"),
            "font-size": parseInt(svgTextEl.attr("font-size")),
            "width": width
        });
        editTextBox.val(currentText);
        editTextBox.show();
        editTextBox.focus();
        editTextBox.select();
        activelyEditing = true;
    }

    $("#editTextBox").blur(function () {
        //$(this).hide();
        finishEdit();
    })

    function notifyListeners (notifyType, key, value) {
        for (var i = 0; i < listeners.length; i++) {
            listeners[0](notifyType, key, value);
        }
    }

    function updateTextNoValidation (propertyContainer, newText, dontUpdatePropertyContainer) {
        var d3El = getD3NodeEl(propertyContainer);
        if (!d3El.node()) {
            d3El = getD3RelEl(propertyContainer);
        }
        var svgRelationshipTypeTooltipEl = d3El.select(".relationshipTypeTooltip");
        var svgEditTextEl = d3El.select(".displayText");

        if (propertyContainer.classType == "NodeLabel") {
            if (!dontUpdatePropertyContainer) {
                propertyContainer.update({ label: newText });
            }
            svgEditTextEl.text(getNodeLabelText(propertyContainer));
            svgEditTextEl.call(wrap);

            if (secondaryNodeLabelDisplay === SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION) {
                dataModelInstance.getNodeLabelsWhereIAmSecondary(propertyContainer).map(secondaryNodeLabel => {
                    handleDisplayNodeLabelAnnotation(getSvgNodeEl(secondaryNodeLabel), secondaryNodeLabel);
                });
            }
            //notifyListeners(CANVAS_MESSAGES.UPDATE_NODE_LABEL, thingToEdit.key, newText);
        } else if (propertyContainer.classType == "RelationshipType") {
            if (!dontUpdatePropertyContainer) {
                propertyContainer.update({ type: newText });
            }
            if (svgRelationshipTypeTooltipEl) {
                svgRelationshipTypeTooltipEl.text(newText);
            }
            svgEditTextEl.text(getRelationshipText(propertyContainer));
        }
    }

    function updateText (newText) {
        //console.log('newText: ' + newText + ', currentText: ' + currentText);
        if (newText === currentText) {
            return;
        }
        if (svgEditTextEl !== null) {
            const isValid = validateText(thingToEdit, dataModelInstance, newText);
            if (isValid) {
                updateTextNoValidation(thingToEdit, newText);
            }
        }
    }

    function stopEditing () {
        $("#editTextBox").hide();
        svgEditTextEl = null;
        thingToEdit = null;
        currentText = null;
        activelyEditing = false;
    }

    $("#editTextBox").on("keydown", function(e) {
        if (e.keyCode == 27) {   // esc key
            stopEditing();
            return false; // prevent normal behavior from happening
        }
    });


    function finishEdit () {
        var newVal = $("#editTextBox").val();
        newVal = newVal.trim();
        updateText(newVal);
        stopEditing();
    }

    $("#editTextBox").on("keypress", function(e) {
        if (e.keyCode == 13) {    // enter key
            /*
            updateText($(this).val());
            stopEditing();
            */
            finishEdit();
            return false; // prevent normal behavior from happening
        } else {
            // to grow the text box if we type more than the initial width
            var editBox = $(this);
            var textWidth = editBox.val().length * 8;   // assuming 8px per letter
            if (textWidth > editBox.width()) {
                var growSize = 10;
                editBox.css({
                    "left": editBox.position().left - (growSize / 2),
                    "width": (editBox.width() + growSize)
                });
            }
        }
    });
    // ******************
    // End Text editing stuff
    // ******************

    var currentTransform = d3.zoomIdentity;
    var scaleFactor = 1.0;
    //var zoom = d3.zoom();
    var currentPan = { x: 0, y: 0 }
    var currentOffset = { x: 0, y: 0 }
    var PAN_DIRECTION = { LEFT: "LEFT", RIGHT: "RIGHT", UP: "UP", DOWN: "DOWN", PAN_RESET: "PAN_RESET" };
    function pan (direction, amount, transitionTime) {
        if (direction == PAN_DIRECTION.PAN_RESET) {
            currentPan = { x: 0, y: 0 }
            currentTransform = d3.zoomIdentity.scale(scaleFactor);
            currentTransform = currentTransform.translate(currentOffset.x, currentOffset.y);
            //console.log("currentOffset: " + currentOffset.x + "," + currentOffset.y);
        } else {
            amount = (direction == PAN_DIRECTION.LEFT || direction == PAN_DIRECTION.UP) ? -amount : amount;
            var x = (direction == PAN_DIRECTION.LEFT || direction == PAN_DIRECTION.RIGHT) ? amount : 0;
            var y = (direction == PAN_DIRECTION.UP || direction == PAN_DIRECTION.DOWN) ? amount : 0;
            currentPan.x += x;
            currentPan.y += y;
            currentTransform = currentTransform.translate(x, y);
        }
        if (transitionTime) {
            svg.transition()
                .duration(transitionTime)
                .call(zoom.transform, currentTransform);
        } else {
            svg.call(zoom.transform, currentTransform);
        }
    }

    var ZOOM_DIRECTION = { ZOOM_IN: "ZOOM_IN", ZOOM_OUT: "ZOOM_OUT", ZOOM_RESET: "ZOOM_RESET" };
    function canvasZoom (direction, amount, transitionTime) {
        if (direction == ZOOM_DIRECTION.ZOOM_RESET) {
            scaleFactor = 1.0;
            currentTransform = d3.zoomIdentity.translate(currentPan.x, currentPan.y);
            currentOffset.x = 0;
            currentOffset.y = 0;
        } else {
            amount = (direction == ZOOM_DIRECTION.ZOOM_OUT) ? -amount : amount;
            scaleFactor = (scaleFactor + amount);
            var centerX = canvasWidth / 2;
            var centerY = canvasHeight / 2;
            currentOffset.x = (1 - scaleFactor) * centerX;
            currentOffset.y = (1 - scaleFactor) * centerY;
        }
        // offset logic from http://www.petercollingridge.co.uk/tutorials/svg/interactive/pan-and-zoom/
            // because I couldn't figure it out by myself
        //console.log("currentOffset: " + currentOffset.x + "," + currentOffset.y);
        currentTransform = d3.zoomIdentity.translate(currentPan.x + currentOffset.x, currentPan.y + currentOffset.y).scale(scaleFactor);
        if (transitionTime) {
            svg.transition()
                .duration(transitionTime)
                .call(zoom.transform, currentTransform);
        } else {
            svg.call(zoom.transform, currentTransform);
        }
        dataModelInstance.dataChanged(dataModelInstance.DataChangeType.CanvasTransformUpdate, { });
    }

    function panNodeToCenter (nodeLabelString, transitionTime) {
        var nodes = svg.selectAll(".nodeLabel");
        nodes.each(function (nodeLabel) {
            if (nodeLabel.label == nodeLabelString) {
                d3.select(this).select(".displayCircle").classed('highlightNode', true);
            }
        });
    }

    function getSvgElement () {
        return svg_main.node();
    }

    function getViewSettings () {
        var settings = {
            currentPan: currentPan,
            currentOffset: currentOffset,
            scaleFactor: scaleFactor
        };
        return settings;
    }

    function setViewSettings (settings) {
        if (settings) {
            /*
            if (settings.scaleFactor && settings.scaleFactor !== scaleFactor && settings.scaleFactor !== 1.0) {
                var direction = (settings.scaleFactor > 1) ? ZOOM_DIRECTION.ZOOM_IN : ZOOM_DIRECTION.ZOOM_OUT;
                canvasZoom (direction, Math.abs(1 - settings.scaleFactor), 0);
            }*/
            if (settings.currentPan && (settings.currentPan.x !== currentPan.x || settings.currentPan.y !== currentPan.y)) {
                currentPan = settings.currentPan;
                currentTransform = currentTransform.translate(currentPan.x, currentPan.y);
                svg.call(zoom.transform, currentTransform);
            }
        }
    }

    return {
        initCanvas: initCanvas,
        setShowArrows: setShowArrows,
        showGrid: showGrid,
        hideGrid: hideGrid,
        getSnapToGrid: getSnapToGrid,
        setSnapToGrid: setSnapToGrid,
        setRelationshipDisplay: setRelationshipDisplay,
        getSecondaryNodeLabelDisplay: getSecondaryNodeLabelDisplay,
        setSecondaryNodeLabelDisplay: setSecondaryNodeLabelDisplay,
        bringAllNodesToTop: bringAllNodesToTop,
        getDisplayAnnotations: getDisplayAnnotations,
        setDisplayAnnotations: setDisplayAnnotations,
        clearSearch: clearSearch,
        performSearch: performSearch,
        setContainerCallback: setContainerCallback,
        getSvgElement: getSvgElement,
        resetCanvas: resetCanvas,
        resetPanAndZoom: resetPanAndZoom,
        resizeCanvas: resizeCanvas,
        getCanvasDimensions: getCanvasDimensions,
        addListener: addListener,
        removeListener: removeListener,
        setDataModel: setDataModel,
        getDataModel: getDataModel,
        addNodeLabel: addNodeLabel,
        createNewNodeLabel: createNewNodeLabel,
        removeNodeLabel: removeNodeLabel,
        getNodeLabel: getNodeLabel,
        addRelationshipType: addRelationshipType,
        removeRelationshipType: removeRelationshipType,
        doDagreLayout: doDagreLayout,
        doForceLayout: doForceLayout,
        getLastLayoutUsed: getLastLayoutUsed,
        renderDataModel: renderDataModel,
        renderRelationships: renderRelationships,
        reRenderNodeLabel: reRenderNodeLabel,
        reRenderRelationshipType: reRenderRelationshipType,
        getDataSourceColors: getDataSourceColors,
        setDataSourceColorMap: setDataSourceColorMap,
        highlightSubgraph: highlightSubgraph,
        removeSubgraphHighlight: removeSubgraphHighlight,
        removeAllSubgraphHighlights: removeAllSubgraphHighlights,
        removeAllNodeLabelGlyphs: removeAllNodeLabelGlyphs,
        removeAllRelationshipTypeGlyphs: removeAllRelationshipTypeGlyphs,
        removeAllGlyphs: removeAllGlyphs,
        setContainerNodeLabelClick: setContainerNodeLabelClick,
        setContainerRelationshipTypeClick: setContainerRelationshipTypeClick,
        getSelectionArray: getSelectionArray,
        clearSelections: clearSelections,
        PAN_DIRECTION: PAN_DIRECTION,
        pan: pan,
        panNodeToCenter: panNodeToCenter,
        getViewSettings: getViewSettings,
        setViewSettings: setViewSettings,
        ZOOM_DIRECTION: ZOOM_DIRECTION,
        canvasZoom: canvasZoom,
        LAYOUTS: LAYOUTS,
        addNodeHighlightAlt: addNodeHighlightAlt,
        removeNodeHighlightAlt: removeNodeHighlightAlt,
        addRelHighlightAlt: addRelHighlightAlt,
        removeRelHighlightAlt: removeRelHighlightAlt
    }
};
