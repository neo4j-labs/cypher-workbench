
import * as d3 from "d3";
import { EventEmitter } from '../../../dataModel/eventEmitter';
import { GraphViewChangeType } from '../../../dataModel/graphDataConstants';
import { GraphCanvasAnnotation } from './graphCanvasAnnotation.js';

import { 
    areNodeArcsDisplayed,
    drawNodeArcs, 
    removeNodeArcs 
} from './nodeArcs';

import {
    lineIntersectsWithRectangle,
    rectanglesIntersect,
    snap,
    setNewNodePosition
} from './graphCanvasHelpers.js';

import { TextWrapHelper } from './textWrapHelper';
import { TextPositionHelper } from './textPositionHelper';
import { RelationshipRibbon } from './relationshipRibbon';
import { SelectionHelper } from './selectionHelper';

import { drawGrid, removeGrid } from './grid.js';
import { AnnotationPlacementHelper } from "./annotationPlacementHelper";
import { ZoomHelper } from "./zoomHelper";
import { LayoutHelper } from "./layoutHelper";
import { CanvasMath } from "./canvasMath";
import { isNullableType } from "graphql";

const ID_PREFIXES = {
    RELATIONSHIP: "relationship_",
    NODE: "node_"
}

var MODES = {
    NORMAL: "NORMAL",
    CONNECT: "CONNECT",
    SELECT: "SELECT",
    MULTI_SELECT: "MULTI_SELECT"
}

export const CANVAS_FEATURES = {
    NODE_MOVE: "NODE_MOVE",
    DRAW_RELATIONSHIP: "DRAW_RELATIONSHIP"
}

export const CANVAS_MESSAGES = {
    CURRENT_SELECTED_ITEMS: "currentSelectedItems",
    SELECTION_ADDED: "selectionAdded",
    SELECTION_REMOVED: "selectionRemoved",
    NODE_MOVED: "nodeMoved",
    ADD_NEW_RELATIONSHIP: "addNewRelationship",
    UPDATE_NODE: "updateNode",
    EDIT_REQUESTED: "editRequested"
}

export class GraphCanvas {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var { id, 
            dataProvider, 
            canvasConfig,
            parentDomElementId,
            canvasOptions,
            snapToGrid
        } = properties;
        this.id = id;

        this.dataProvider = dataProvider;
        this.canvasConfig = canvasConfig;
        console.log('creating a graphCanvas with parentDomElementId: ' + parentDomElementId);
        this.parentDomElementId = parentDomElementId;
        this.arrowDomElementId = `${parentDomElementId}_arrow`;
        this.textDimensionHelperDomId = `${parentDomElementId}_textDimensionHelper`;
        this.pixelEmHelperDomId = `${parentDomElementId}_pixelEmHelper`;

        this.CONSTANTS = canvasConfig.getConstants();

        this.mode = MODES.SELECT;
        this.dragEnabled = true;

        this.shiftDown = false;
        this.ctrlDown = false;

        this.canvasDragCoords = undefined;
        this.rectangleStartPoint = undefined;
        this.rectangleEndPoint = undefined;

        this.gridDisplayed = false;
        this.snapToGrid = (snapToGrid === undefined) ? true : snapToGrid;
        this.canvasHeight = undefined;
        this.canvasWidth = undefined;

        this.relationshipDisplay = this.CONSTANTS.DEFAULT_RELATIONSHIP_DISPLAY;

        this.linkMap = {};
        this.textMap = {};
        this.distanceMap = {};

        this.connectorSourceId = null;
        this.connectorEndId = null;
        this.connectorEndPoint = {};
        this.connectorDidDragSome = false;

        this.displayAnnotations = true;

        this.lineGenerator = d3.line();
        this.lineGenerator.curve(d3.curveNatural);

        this.myEventEmitter = new EventEmitter(id);
        this.selectionHelper = new SelectionHelper(this.myEventEmitter);

        // used to highlighting things, but not selecting them
        const dummyEmitter = new EventEmitter(`dummy_${id}`);
        this.selectionHelperAlt = new SelectionHelper(dummyEmitter, {
            nodeHighlight: 'highlightNodeAlt',
            relHighlight: 'highlightRelAlt'
        });

        this.canvasMath = new CanvasMath({
            canvasConfig: canvasConfig
        });

        this.textPositionHelper = new TextPositionHelper({
            canvasMath: this.canvasMath
        });

        this.annotation = new GraphCanvasAnnotation({
            textDimensionHelperDomId: this.textDimensionHelperDomId,
            pixelEmHelperDomId: this.pixelEmHelperDomId
        });

        this.annotationPlacementHelper = new AnnotationPlacementHelper({
            graphCanvas: this,
            getDataProvider: this.getDataProvider,
            canvasConfig: this.canvasConfig,
            textPositionHelper: this.textPositionHelper,
            canvasMath: this.canvasMath,
            graphCanvasAnnotation: this.annotation
        });

        this.relationshipRibbon = new RelationshipRibbon({
            canvasConfig: this.canvasConfig,
            canvasMath: this.canvasMath
        });

        this.textWrapHelper = new TextWrapHelper({
            graphCanvasAnnotation: this.annotation
        });

        //  then go back and track down the rest of the stuff in setupArrowDefinitions and
        //  canvasDragged, etc
        this.zoomHelper = new ZoomHelper({
            graphCanvas: this,
            getDataProvider: this.getDataProvider,
            canvasConfig: this.canvasConfig
        });

        this.layoutHelper = new LayoutHelper({
            graphCanvas: this,
            getDataProvider: this.getDataProvider
        });

        // these set by initCanvas
        this.svgElement = undefined; 
        this.svgRootGroupElement = undefined;

        canvasConfig.setGraphCanvas(this);

        var defaultOptions = {
            [CANVAS_FEATURES.NODE_MOVE]: true,
            [CANVAS_FEATURES.DRAW_RELATIONSHIP]: true
        }
        this.options = { ...defaultOptions, ...(canvasOptions || {}) }

        this.initCanvas();        
    }

    getSvgRootGroupElement = () => this.svgRootGroupElement;

    getUserRole = () => this.userRole;
    setUserRole = (userRole) => this.userRole = userRole;

    getEventEmitter = () => this.myEventEmitter;
    getSelectionHelper = () => this.selectionHelper;
    getRelationshipRibbon = () => this.relationshipRibbon;
    getZoomHelper = () => this.zoomHelper;
    getLayoutHelper = () => this.layoutHelper;

    getViewSettings = () => this.zoomHelper.getViewSettings();
    setViewSettings = (viewSettings) => this.zoomHelper.setViewSettings(viewSettings);

    bringAllNodesToTop = () => {
        this.svgRootGroupElement.selectAll(".node").each((node, i, nodes) => {
            d3.select(nodes[i]).raise();
        });
    }

    snapPoint (coords) {
        if (this.snapToGrid) {
            return snap(coords.x, coords.y);
        } else {
            return coords;
        }
    }
    
    resetCanvas () {
        this.zoomHelper.resetPanAndZoom(true);

        d3.selectAll(`#${this.parentDomElementId} > svg > g > *`).remove();
        this.svgRootGroupElement.append("g")
            .attr("class", "grid");

        if (this.gridDisplayed) {
            this.showGrid();
        }

        this.selectionHelper.clearSelections();
        this.selectionHelperAlt.clearSelections();
    }

    resizeCanvas (width, height) {
        if (this.svgElement) {
            this.svgElement
                .attr("width", width)
                .attr("height", height);

            this.canvasWidth = width;
            this.canvasHeight = height;

            if (this.gridDisplayed) {
                var gridSvg = this.svgRootGroupElement.select('.grid');
                drawGrid(gridSvg, this.canvasWidth, this.canvasHeight);
            }
        }
    }

    getArcSvgEl (node, arcId) {
        return d3.select(this.getSvgNodeEl(node)).selectAll(`.${arcId}`).node();
    }

    pxVal = (px) => (typeof(px) === 'string') ? parseFloat(px.replace(/px$/,'')) : px;

    getCanvasHeight () {
        return this.pxVal(this.canvasHeight);
    }

    getCanvasWidth () {
        return this.pxVal(this.canvasWidth);
    }

    showGrid () {
        var gridSvg = this.svgRootGroupElement.select('.grid');
        drawGrid(gridSvg, this.canvasWidth, this.canvasHeight);
        this.gridDisplayed = true;
    }

    hideGrid () {
        var gridSvg = this.svgRootGroupElement.select('.grid');
        removeGrid(gridSvg);
        this.gridDisplayed = false;
    }

    setSnapToGrid (snapToGridVar) {
        this.snapToGrid = snapToGridVar;
    }

    getSnapToGrid () {
        return this.snapToGrid;
    }

    setRelationshipDisplay (value) {
        if (!value) {
            this.relationshipDisplay = this.CONSTANTS.DEFAULT_RELATIONSHIP_DISPLAY;
        } else {
            this.relationshipDisplay = value;
        }
    }

    setDisplayAnnotations (displayAnnotations) {
        if (this.displayAnnotations !== displayAnnotations) {
            this.displayAnnotations = displayAnnotations;

            if (this.displayAnnotations) {
                // add any annotations that should be there
                this.annotationPlacementHelper.handleDisplayNodeAnnotations();
                this.annotationPlacementHelper.handleDisplayRelationshipAnnotations();
            } else {
                // remove any annotations that are present
                this.annotationPlacementHelper.removeAllNodeAnnotations();
                this.annotationPlacementHelper.removeAllRelationshipAnnotations();
            }
        }
    }

    getDisplayAnnotations () {
        return this.displayAnnotations;
    }

    clearSearch () {
        this.selectionHelper.clearSelections();
    }
    
    performSearch (type, nodeText, relationshipText, endNodeText) {
        this.selectionHelper.clearSelections();
        alert("TODO");
        /*
        USE: this.dataProvider.search(text)

        var displayNode = this.dataProvider.data().getNodeByLabel(nodeText);
        if (displayNode) {
            if (type === 'Node') {
                this.selectionHelper.addNodeSelection(this.getD3NodeEl(displayNode).node(), displayNode);
                this.zoomHelper.panTo(displayNode);
            } else if (type === 'Relationship') {
                var relationship = this.dataProvider.data().getRelationship (relationshipText, nodeText, endNodeText);
                if (!relationship) {
                    // special case where '' from regex doesn't match null of relationship, so we check for this case
                    relationship = this.dataProvider.data().getRelationship (null, nodeText, endNodeText);
                }
                if (relationship) {
                    this.selectionHelper.addRelSelection(this.getD3RelEl(relationship).node(), relationship);
                    this.zoomHelper.panTo(relationship);
                }
            }
        }
        */
    }

    initCanvas () {
        const maxTries = 20;
        const timeBetweenTries = 100;
        var tryNumber = 1;

        const doInit = () => {
            var elementCheck = document.getElementById(this.parentDomElementId);
            if (elementCheck) {
                var parentEl = d3.select(`#${this.parentDomElementId}`);
                var boundingRect = parentEl.node().getBoundingClientRect();
                this.canvasWidth = boundingRect.width;
                if (this.canvasWidth < 800) {
                    this.canvasWidth = 800;
                }
                this.canvasHeight = boundingRect.height;
        
                //console.log("this.canvasWidth: " + this.canvasWidth);
                //console.log("this.canvasHeight: " + this.canvasHeight);

                // I'm doing this because I need to have d3 use the original this for the dragged function
                const me = this;
                const localCanvasDragged = function (event, node) {
                    // here 'this' is the d3 this, and 'me' is now the 'this' of the class instance
                    me.canvasDragged(this, event, node);
                }
                const localCanvasDragstarted = function (event, node) {
                    me.canvasDragstarted(this, event, node);
                }
                const localCanvasDragended = function (event, node) {
                    me.canvasDragended(this, event, node);
                }
                        
        
                this.svgElement = d3.select(`#${this.parentDomElementId}`).append("svg")
                    .attr("id", `${this.parentDomElementId}_svg`)
                    .attr("width", this.canvasWidth)
                    .attr("height", this.canvasHeight)
                    .attr("class", "noselect")
                    .on("click", () => {
                        //console.log('canvas click: removeNodeArcs');
                        this.selectionHelper.clearSelections();
                        this.removeAllNodeArcs();
                        this.removeAllRelRibbons();
                        this.dragEnabled = true;
                    })
                    .on("mouseup", () => this.dragEnabled = true )
                    .call(d3.drag()
                        .clickDistance(4)
                        .on("start", localCanvasDragstarted)
                        .on("drag", localCanvasDragged)
                        .on("end", localCanvasDragended)
                    )
        
                this.setupArrowDefinitions();
                this.svgRootGroupElement = this.svgElement.append("g")
                    .attr("id", `${this.parentDomElementId}_g`)
                this.svgRootGroupElement.append("g")
                    .attr("class", "grid");
        
                this.svgElement.append('text')
                    .attr("font-family", "Roboto, sans-serif")
                    .attr("font-size", () => this.CONSTANTS.DEFAULT_FONT_SIZE ) 
                    //.attr('display','none')
                    .append('tspan')
                    .attr('id', this.textDimensionHelperDomId)
                    .text('')
        
                this.svgElement.append('div')
                    .attr('id', this.pixelEmHelperDomId)
                    .attr('style', 'width: 0; height: 0; outline: none; border: none; padding; none; margin: none;');
        
                var handleKeys = (e, eventType) => {
                    this.shiftDown = (e.shiftKey) ? true : false;
                    this.ctrlDown = (e.ctrlKey || e.metaKey) ? true : false;
        
                    // 8 = backspace, 46 = delete
                    /* DON'T UNCOMMENT THIS UNLESS YOU ADD A LOT MORE CHECKING.
                        Right now if you hit the backspace key in a properties text box it deletes the node
                        This is not good
                    if (eventType === 'keydown' && (e.keyCode === 8 || e.keyCode === 46)) {
                        deleteSelectedItems();
                    }*/
        
                    /*
                    if (!this.shiftDown) {
                        deleteSelectionRect();
                    }
                    */
                    //console.log(e);
        
                }
        
                window.addEventListener('keydown', (e) => handleKeys(e, 'keydown'));
                window.addEventListener('keyup', (e) => handleKeys(e));
            } else {
                tryNumber++;
                if (tryNumber <= maxTries) {
                    setTimeout(doInit, timeBetweenTries);
                }
            } 
        }
        doInit();
    }

    dragStarted (d3This, event, displayNode) {
        const svgEl = d3This;
        if (this.dragEnabled) {
            d3.select(svgEl)
                //.raise()  // if I raise() here, it doesn't let me select with 1-click
                    // what happens is that it takes 2 clicks before the d3 'click' event will fire
                .select(".displayCircle")
                .classed("active", true);

            if (!this.selectionHelper.amISelected(displayNode) && !this.ctrlDown) {
                this.selectionHelper.clearSelections();
                this.removeAllNodeArcs();
                this.removeAllRelRibbons();
            }

            this.distanceMap = {};
            this.selectionHelper.getSelectedNodeArray()
                .filter(selectedNode => selectedNode.key !== displayNode.key)
                .map(selectedNode =>
                    this.distanceMap[selectedNode.key] = {
                        x: selectedNode.x - displayNode.x,
                        y: selectedNode.y - displayNode.y
                    }
                );
        }
    }

    dragged (d3This, event, node) {
        const svgEl = d3This;  // using old school d3 this because the changes in d3 v6 are breaking things
        if (this.dragEnabled && this.optionEnabled(CANVAS_FEATURES.NODE_MOVE)) {
            var coords = this.d3Mouse(event);

            this.updateNodePosition(node, svgEl, coords);
            this.selectionHelper.getSelectedNodeArray()
                .filter(x => x.key !== node.key)
                .map(x => {
                    var newCoords = {
                        x: coords.x + this.distanceMap[x.key].x,
                        y: coords.y + this.distanceMap[x.key].y
                    }
                    //console.log('otherNode: ', x);
                    //console.log('newCoords', newCoords);
                    this.updateNodePosition(x, this.getSvgNodeEl(x), newCoords);
                });
        }
    }

    dragEnded (d3This, event, node) {
        const svgEl = d3This;
        if (this.dragEnabled) {
            d3.select(svgEl).select(".displayCircle").classed("active", false);
            //notifyListeners(CANVAS_MESSAGES.NODE_MOVED);
        }
    }

    canvasDragstarted (d3This, event) {
        this.canvasDragCoords = this.d3Mouse(event);

        if (this.shiftDown) {
            this.startMultiSelect(event);
        }
    }

    canvasDragged (d3This, event) {
        if (this.mode === MODES.MULTI_SELECT) {
            this.handleMultiSelectDrag(event);
        } else {
            if (this.shiftDown) {
                this.startMultiSelect(event);
            } else {
                var coords = this.d3Mouse(event);
                var diffX = coords.x - this.canvasDragCoords.x;
                var diffY = coords.y - this.canvasDragCoords.y;
                //this.canvasDragCoords = coords;   // not needed for d3 v6 and above. d3.pointer takes 'g' which and accounts for current zoom/pan
                this.zoomHelper.updatePanTransform (diffX, diffY);
            }
        }
    }

    canvasDragended () {
        if (this.mode === MODES.MULTI_SELECT) {
            this.deleteSelectionRect();
            this.notifyCurrentSelectedNodes();
        }
        this.mode = MODES.SELECT;
    }

    deleteSelectionRect () {
        this.svgRootGroupElement.select(".selectionRect").remove();
    }

    notifyCurrentSelectedNodes () {
        var selectedNodes = this.selectionHelper.getSelectedNodeArray();
        var selectedNodeKeys = selectedNodes.map(x => x.key);
        
        this.myEventEmitter.notifyListeners(
            CANVAS_MESSAGES.CURRENT_SELECTED_ITEMS, 
            {
                selectedNodeKeys: selectedNodeKeys, 
                selectedNodes: selectedNodes            
            }
        )
    }

    startMultiSelect (event) {
        this.mode = MODES.MULTI_SELECT;
        var coords = this.d3Mouse(event);
        this.rectangleStartPoint = {
            //x: coords.x / scaleFactor - currentPan.x,
            //y: coords.y / scaleFactor - currentPan.y
            x: coords.x,
            y: coords.y
        }

        this.rectangleEndPoint = { ...this.rectangleStartPoint };
        this.svgRootGroupElement.append("rect")
            .attr("class", "selectionRect")
            .attr("x", this.rectangleStartPoint.x)
            .attr("y", this.rectangleStartPoint.y)
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "1,1")
            .style("fill", "transparent");
    }

    handleMultiSelectDrag (event) {
        this.rectangleEndPoint = this.d3Mouse(event);

        var selectionRect = this.svgRootGroupElement.select(".selectionRect");
        var startX = (this.rectangleStartPoint.x < this.rectangleEndPoint.x) ? this.rectangleStartPoint.x : this.rectangleEndPoint.x;
        var startY = (this.rectangleStartPoint.y < this.rectangleEndPoint.y) ? this.rectangleStartPoint.y : this.rectangleEndPoint.y;
        var width = Math.abs(this.rectangleEndPoint.x - this.rectangleStartPoint.x);
        var height = Math.abs(this.rectangleEndPoint.y - this.rectangleStartPoint.y);
        selectionRect
            .attr("x", startX)
            .attr("y", startY)
            .attr("width", width)
            .attr("height", height);

        this.svgRootGroupElement.selectAll(".relationship").each((relationship, i, nodes) => {
            var linePath = d3.select(nodes[i]).select(".relationshipLine").attr("d")
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
                this.selectionHelper.addRelSelection(nodes[i], relationship, true);
            } else {
                this.selectionHelper.removeRelSelection(nodes[i], relationship, true);
            }
        });

        // select nodes that are within the rectangle
        this.svgRootGroupElement.selectAll(".node").each((node, i, nodes) => {
            var displayCircle = d3.select(nodes[i]).select(".displayCircle")
            var cx = parseFloat(displayCircle.attr('cx'));
            var cy = parseFloat(displayCircle.attr('cy'));
            var r = parseFloat(displayCircle.attr('r'));

            var intersects = rectanglesIntersect(
                cx - r, cy - r, cx + r, cy + r,
                startX, startY, startX + width, startY + height
            );

            if (intersects) {
                //console.log('intersects');
                this.selectionHelper.addNodeSelection(nodes[i], node, true);
            } else {
                this.selectionHelper.removeNodeSelection(nodes[i], node, true);
            }
        });
    }

    getDataProvider = () => this.dataProvider;

    setDataProvider (dataProvider) {
        this.dataProvider = dataProvider;
        this.render();
    }

    setDataView (dataView) {
        this.dataView = dataView;
    }

    setupArrowDefinitions () {
        var defs = this.svgElement.append("defs")

        var marker1 = defs.append("marker");
        var marker2 = defs.append("marker");

        marker1
            .attr("id", this.arrowDomElementId)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", this.CONSTANTS.MARKER_WIDTH)
            .attr("markerHeight", this.CONSTANTS.MARKER_HEIGHT)
            .attr("orient", "auto");

        marker1.append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class","arrowHead");

        marker2
            .attr("id", `${this.arrowDomElementId}_gray`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", this.CONSTANTS.MARKER_WIDTH)
            .attr("markerHeight", this.CONSTANTS.MARKER_HEIGHT)
            .attr("orient", "auto");

        marker2.append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class","arrowHead")
            .attr("fill", "#888");
    
    }

    render(options) {
        this.renderNodes(options);
        this.doRelationshipOffsetComputations();
        this.renderRelationships();
    }

    doRelationshipOffsetComputations () {
        var nodes = this.dataProvider.data().getNodesThatHaveSelfConnectedRelationships();

        if (nodes && nodes.length) {
            //console.log('calling after getNodesThatHaveSelfConnectedRelationships');
            nodes.map(node => this.computeRelationshipOffsets(node, node));
        }
        /* old way with loop - to be deleted
        if (nodes && nodes.length) {
            for (var i = 0; i < nodes.length; i++) {
                computeRelationshipOffsets(nodes[i], nodes[i]);
            }
        }*/
        var nodePairMap = this.dataProvider.data().getNodePairsThatHaveMoreThanOneRelationshipBetweenThem();
        //console.log('calling after getNodePairsThatHaveMoreThanOneRelationshipBetweenThem');
        Object.keys(nodePairMap).map(key => this.computeRelationshipOffsets(nodePairMap[key].node1, nodePairMap[key].node2))
        /* old way with loop - to be deleted
        for (var key in nodePairMap) {
            if (nodePairMap.hasOwnProperty(key)) {
                computeRelationshipOffsets(nodePairMap[key].node1, nodePairMap[key].node2);
            }
        }*/
    }

    reRenderNode (displayNode) {
        var svgNodeEl = this.getSvgNodeEl(displayNode);
        if (svgNodeEl) {
            removeNodeArcs({
                nodeSvgEl: svgNodeEl
            });

            const d3NodeEl = this.getD3NodeEl(displayNode);
            d3NodeEl.selectAll(".displayText tspan").remove();
            const text = d3NodeEl.select(".displayText");
            const newText = this.dataProvider.getNodeDisplayText(displayNode);
            console.log('newText: ', newText);
            text.text(newText);
            text.call((text) => this.textWrapHelper.wrap(text));

            this.updateNodePosition (displayNode, svgNodeEl, { x: displayNode.x, y: displayNode.y });
            console.log('after updateNodePosition');
        }
    }

    reRenderRelationship (relationship) {
        var svgTextEl = this.textMap[relationship.key];
        var text = d3.select(svgTextEl);
        text.text(this.getRelationshipText(relationship));
        this.updateRelationshipPosition(relationship);
        this.updateTextPosition(relationship);
    }

    getNodeDomId = (displayNode) => `${this.parentDomElementId}_${ID_PREFIXES.NODE}${displayNode.key}`;
    getRelationshipDomId = (displayRelationship) => `${this.parentDomElementId}_${ID_PREFIXES.RELATIONSHIP}${displayRelationship.key}`;

    extractNodeKeyFromDomId = (domId) => {
        const prefix = `${this.parentDomElementId}_${ID_PREFIXES.NODE}`;
        return domId.substring(prefix.length);
    }

    extractRelationshipKeyFromDomId = (domId) => {
        const prefix = `${this.parentDomElementId}_${ID_PREFIXES.RELATIONSHIP}`;
        return domId.substring(prefix.length);
    }

    renderNodes (options) {
        options = options || {};
        const { animate } = options;
        //console.log('renderNodes, this.dataProvider is: ', this.dataProvider);
        //console.log('renderNodes, this.svgRootGroupElement is: ', this.svgRootGroupElement);
        var svgRootGroupElement = this.getSvgRootGroupEl();
        //console.log('renderNodes, svgRootGroupElement is: ', svgRootGroupElement);

        var graphNodes = this.dataProvider.data().getNodeArray();
        var nodes = svgRootGroupElement.selectAll(".node")
                .data(graphNodes, (displayNode) => displayNode.key)

        // I'm doing this because I need to have d3 use the original this for the dragged function
        const me = this;
        const localDragged = function (event, node) {
            // here 'this' is the d3 this, and 'me' is now the 'this' of the class instance
            me.dragged(this, event, node);
        }
        const localDragStarted = function (event, node) {
            me.dragStarted(this, event, node);
        }
        const localDragEnded = function (event, node) {
            me.dragEnded(this, event, node);
        }

        const localConnectorDrag = function (event, node) {
            me.connectorDrag(this, event, node);
        }
        const localConnectorStart = function (event, node) {
            me.connectorStart(this, event, node);
        }
        const localConnectorStop = function (event, node) {
            me.connectorStop(this, event, node);
        }

        var nodeGroups = nodes.enter()
            .append("g")
            .attr("id", (displayNode) => this.getNodeDomId(displayNode))
            .attr("class", "node")
            .on("click", (event, displayNode) => {

                if (this.dataProvider.nodeClick) {
                    var cancelClick = this.dataProvider.nodeClick(displayNode);
                    if (cancelClick) {
                        return;
                    }
                }

                if (this.mode === MODES.SELECT) {
                    if (this.shiftDown) {
                        if (!areNodeArcsDisplayed(event.currentTarget)) {
                            this.selectionHelper.getSelectedNodeArray().map(x => 
                                    drawNodeArcs({
                                        graphCanvas: this,
                                        actionDefinitions: this.canvasConfig.getArcDefinitions(),
                                        nodeSvgEl: this.getSvgNodeEl(x),
                                        displayNode: x
                                    }));
                        } else {
                            this.selectionHelper.getSelectedNodeArray().map(x => removeNodeArcs({
                                nodeSvgEl: this.getSvgNodeEl(x)
                            }));
                        }
                    } else if (this.ctrlDown) {
                        if (!this.selectionHelper.amISelected(displayNode)) {
                            this.selectionHelper.addNodeSelection(event.currentTarget, displayNode)
                            this.selectionHelper.getSelectedNodeArray().map(x => drawNodeArcs({
                                graphCanvas: this,
                                actionDefinitions: this.canvasConfig.getArcDefinitions(),
                                nodeSvgEl: this.getSvgNodeEl(x),
                                displayNode: x
                            }));
                        } else {
                            this.selectionHelper.getSelectedNodeArray().map(x => removeNodeArcs({
                                nodeSvgEl: this.getSvgNodeEl(x)
                            }));
                            this.selectionHelper.removeNodeSelection(event.currentTarget, displayNode);
                        }
                    } else {
                        if (this.selectionHelper.isAnythingSelected()) {
                            this.removeAllNodeArcs();
                            this.selectionHelper.clearSelections();
                        }
                        this.removeAllRelRibbons();
                        if (!this.selectionHelper.amISelected(displayNode)) {
                            this.selectionHelper.addNodeSelection(event.currentTarget, displayNode)
                            drawNodeArcs({
                                graphCanvas: this,
                                actionDefinitions: this.canvasConfig.getArcDefinitions(),
                                nodeSvgEl: event.currentTarget,
                                displayNode: displayNode
                            });
                        } else {
                            this.selectionHelper.removeNodeSelection(event.currentTarget, displayNode);
                            removeNodeArcs({
                                nodeSvgEl: event.currentTarget
                            });
                        }
                    }
                }
                event.stopPropagation();
            })
            .call(d3.drag()
                .clickDistance(4)
                .on("start", localDragStarted)
                .on("drag", localDragged)
                .on("end", localDragEnded))
                .on('dblclick', function (event, displayNode) { 
                    var containerCallback = me.canvasConfig.getContainerCallback();
                    var popupCoords = me.getPopupCoords(this);
                    var rectDimensions = me.getDocumentRect();
                    var textLen = me.getExpectedTextLen(displayNode);

                    containerCallback({
                        message: CANVAS_MESSAGES.EDIT_REQUESTED,
                        canvasDimensions: rectDimensions,
                        popupPosition: popupCoords,
                        expectedTextLength: textLen,
                        propertyContainer: displayNode
                    })
                });

        nodeGroups.append("circle")
            .attr("class", "hoverCircle")
            .attr("cy", function (displayNode) { return displayNode.y })
            .attr("cx", function (displayNode) { return displayNode.x })
            //.transition()
            //    .ease(d3.easeExpOut)
            //    .duration(500)            
                .attr("r", function (displayNode) { return (displayNode.radius + me.CONSTANTS.HOVER_CIRCLE_RADIUS_INCREASE) })
            .style("opacity", 0)
            .style("fill", "lightgray")
            .on("mouseover", function () { d3.select(this).transition().style("opacity", 1)} )
            .on("mouseout", function () { d3.select(this).transition().style("opacity", 0)})
            .on("click", function (event) {
                // prevent relationship + displayNode from getting drawn without dragging
                event.stopPropagation();
            })
            .call(d3.drag()
                .on("start", localConnectorStart)
                .on("drag", localConnectorDrag)
                .on("end", localConnectorStop)
            );

        nodeGroups.append("circle")
            .attr("class", "displayCircle")
            .attr("cy", function (displayNode) { return displayNode.y })
            .attr("cx", function (displayNode) { return displayNode.x })
            .on("mouseover", function () {
                me.dragEnabled = true;
                me.handleNodeMouseOver(this);
            })
            .on("mouseout", function (event) {
                me.handleNodeMouseOut(event, this);
            });

        // handle coloring of new and existing nodes
        var displayCircle = nodeGroups
            .merge(nodes)
            .select(".displayCircle");

        this.setNodeDisplayCircleStyle(displayCircle);

        if (animate) {
            displayCircle
                .transition()
                .ease(d3.easeExpOut)
                .duration(600)            
                .attr("r", function (displayNode) { return displayNode.radius })
        } else {
            displayCircle
                .attr("r", function (displayNode) { return displayNode.radius })
        }

        var displayText = nodeGroups.append("text")
            .attr("class", "displayText");

        this.setNodeDisplayTextStyle(displayText);

        if (this.displayAnnotations) {
            this.annotationPlacementHelper.handleDisplayNodeAnnotations();
        }

        const exitingNodesSelection = nodes.exit();
        const removeNodes = () => {
            exitingNodesSelection.remove();    
        }

        if (animate) {
            exitingNodesSelection.select(".displayText")
                .transition()
                .delay(150)
                .remove()

            exitingNodesSelection.select(".displayCircle")
                .transition()
                .ease(d3.easeExpIn)
                .duration(300)            
                .attr("r", 2)
                .on("end", removeNodes);
        } else {
            removeNodes();
        }
    }

    getExpectedTextLen = (itemToEdit) => {
        var text = (itemToEdit.getText) ? itemToEdit.getText() : '';
        if (itemToEdit.nodeLabels) {
            text += itemToEdit.nodeLabels.join(':');
        } else if (itemToEdit.types) {
            text += itemToEdit.types.join(':')
        }
        return text.length;
    }

    convertLocalCoordsToGlobalCoords = (coords) => {
        var cx = this.canvasWidth / 2;
        var cy = this.canvasHeight / 2;

        var modifiedX = cx + (coords.x - cx) * this.zoomHelper.getScaleFactor();
        var modifiedY = cy + (coords.y - cy) * this.zoomHelper.getScaleFactor();

        var parentEl = d3.select(`#${this.parentDomElementId}`);        
        var boundingRect = parentEl.node().getBoundingClientRect();

        var x = modifiedX + boundingRect.left;
        var y = modifiedY + boundingRect.top;

        x += this.zoomHelper.getCurrentPan().x;
        y += this.zoomHelper.getCurrentPan().y;

        return {
            x: x,
            y: y
        }
    }

    getPopupCoords = (el) => {
        var d3El = d3.select(el);
        var svgTextEl = d3El.select(".displayText");

        var x = parseFloat(svgTextEl.attr("x"));
        var y = parseFloat(svgTextEl.attr("y"));

        return this.convertLocalCoordsToGlobalCoords({x, y})
    }

    getCanvasRect = () => {
        var parentEl = d3.select(`#${this.parentDomElementId}`);        
        return parentEl.node().getBoundingClientRect();
    }

    getDocumentRect = () => {
        var boundingRect = document.body.getBoundingClientRect();
        return boundingRect;
    }

    setNodeDisplayCircleStyle = (displayCircle, localDisplayNode) => {
        // so we have a bit of a mess - I initially bound the data in renderNodes and its working fine
        //   however, in some situations we want to keep the same key - but change the display/data of 
        //   the keyed item. I don't know how to do this "the right way" in D3 so using this hack 
        //   for now

        var fillFunc, fillOpacityFunc, strokeFunc, strokeWidthFunc, strokeDashArrayFunc, strokeOpacityFunc;
        if (localDisplayNode) {
            fillFunc = () => localDisplayNode.color;
            fillOpacityFunc = () => localDisplayNode.fillOpacity;
            strokeFunc = () => localDisplayNode.stroke;
            strokeWidthFunc = () => localDisplayNode.strokeWidth;
            strokeDashArrayFunc = () => localDisplayNode.strokeDashArray;
            strokeOpacityFunc = () => localDisplayNode.strokeOpacity;
        } else {
            fillFunc = (displayNode) => displayNode.color;
            fillOpacityFunc = (displayNode) => displayNode.fillOpacity;
            strokeFunc = (displayNode) => displayNode.stroke;
            strokeWidthFunc = (displayNode) => displayNode.strokeWidth;
            strokeDashArrayFunc = (displayNode) => displayNode.strokeDashArray;
            strokeOpacityFunc = (displayNode) => displayNode.strokeOpacity;
        }

        displayCircle
            .style("fill", fillFunc)
            .style("fill-opacity", fillOpacityFunc)
            .style("stroke", strokeFunc)
            .style("stroke-width", strokeWidthFunc)
            .style("stroke-dasharray", strokeDashArrayFunc)
            .style("stroke-opacity", strokeOpacityFunc)
    }

    setNodeDisplayTextStyle = (displayText, animationSettings, localDisplayNode) => {
        // so we have a bit of a mess - I initially bound the data in renderNodes and its working fine
        //   however, in some situations we want to keep the same key - but change the display/data of 
        //   the keyed item. I don't know how to do this "the right way" in D3 so using this hack 
        //   for now

        var xUpdateFunc = null;
        var yUpdateFunc = null;
        var fontSizeUpdateFunc = null;
        var fontColorUpdateFunc = null;
        var fontOpacityUpdateFunc = null;
        var textUpdateFunc = null;

        if (localDisplayNode) {
            xUpdateFunc = () => localDisplayNode.x;
            yUpdateFunc = () => localDisplayNode.y;
            fontSizeUpdateFunc = () => localDisplayNode.fontSize;
            fontColorUpdateFunc = () => localDisplayNode.fontColor;
            fontOpacityUpdateFunc = () => localDisplayNode.fontOpacity;
            textUpdateFunc = () => this.dataProvider.getNodeDisplayText(localDisplayNode);
        } else {
            xUpdateFunc = (displayNode) => displayNode.x;
            yUpdateFunc = (displayNode) => displayNode.y + this.textYOffset(displayNode);
            fontSizeUpdateFunc = (displayNode) => displayNode.fontSize;
            fontColorUpdateFunc = (displayNode) => displayNode.fontColor;
            fontOpacityUpdateFunc = (displayNode) => displayNode.fontOpacity;
            textUpdateFunc = (displayNode) => this.dataProvider.getNodeDisplayText(displayNode);
        }

        if (animationSettings) {
            const { animationDuration, animationEasing } = animationSettings;
            displayText
                .transition()
                .ease(animationEasing)
                .duration(animationDuration)            
                .attr("x", xUpdateFunc)
                .attr("y", yUpdateFunc)
        } else {
            displayText
                .attr("x", xUpdateFunc)
                .attr("y", yUpdateFunc)
        }

        displayText
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            //.attr("font-family", "sans-serif")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", fontSizeUpdateFunc)
            .style("fill", fontColorUpdateFunc)
            .style("fill-opacity", fontOpacityUpdateFunc)
            .text(textUpdateFunc)
            .call((text) => this.textWrapHelper.wrap(text));
    }

    renderRelationships () {
        var svgRootGroupElement = this.getSvgRootGroupEl();
        var graphRelationships = this.dataProvider.data().getRelationshipArray();
        var relationships = svgRootGroupElement.selectAll(".relationship")
                .data(graphRelationships, (displayRelationship) => displayRelationship.key)

        var relationshipGroups = relationships.enter()
            .append("g")
            .attr("id", (displayRelationship) => this.getRelationshipDomId(displayRelationship))
            .attr("class", "relationship")
            .on('dblclick', (event, displayRelationship) => {
                var containerCallback = this.canvasConfig.getContainerCallback();
                var popupCoords = this.getPopupCoords(event.currentTarget);
                var rectDimensions = this.getDocumentRect();
                var textLen = this.getExpectedTextLen(displayRelationship);

                containerCallback({
                    message: CANVAS_MESSAGES.EDIT_REQUESTED,
                    canvasDimensions: rectDimensions,
                    popupPosition: popupCoords,
                    expectedTextLength: textLen,
                    propertyContainer: displayRelationship
                });
            })
            .on("click", (event, displayRelationship) => {

                if (this.dataProvider.relationshipClick) {
                    var cancelClick = this.dataProvider.relationshipClick(displayRelationship);
                    if (cancelClick) {
                        return;
                    }
                }

                if (this.mode == MODES.SELECT) {
                    if (this.shiftDown) {
                        if (!this.relationshipRibbon.isRelRibbonDisplayed(event.currentTarget)) {
                            this.relationshipRibbon.drawRelRibbon({
                                graphCanvas: this,
                                actionDefinitions: this.canvasConfig.getRibbonDefinitions(displayRelationship.isSelfConnected()),
                                relSvgEl: this.getSvgRelEl(displayRelationship),
                                displayRelationship: displayRelationship,
                                d3Mouse: this.d3Mouse(event)
                            });
                            this.selectionHelper.getSelectedRelationshipArray()
                                .filter(x => x.key !== displayRelationship.key)
                                .map(x => {
                                    this.relationshipRibbon.drawRelRibbon({
                                        graphCanvas: this,
                                        actionDefinitions: this.canvasConfig.getRibbonDefinitions(x.isSelfConnected()),
                                        relSvgEl: this.getSvgRelEl(x),
                                        displayRelationship: x,
                                        d3Mouse: this.d3Mouse(event)
                                    })
                                });
                        } else {
                            this.selectionHelper.getSelectedRelationshipArray().map(x => this.relationshipRibbon.removeRelRibbon(
                                { relSvgEl: this.getSvgRelEl(x) }
                            ));
                        }
                    } else if (this.ctrlDown) {
                        if (!this.selectionHelper.amISelected(displayRelationship)) {
                            this.selectionHelper.addRelSelection(event.currentTarget, displayRelationship);
                            this.relationshipRibbon.drawRelRibbon({
                                graphCanvas: this,
                                actionDefinitions: this.canvasConfig.getRibbonDefinitions(displayRelationship.isSelfConnected()),
                                relSvgEl: this.getSvgRelEl(displayRelationship),
                                displayRelationship: displayRelationship,
                                d3Mouse: this.d3Mouse(event)
                            });
                            this.selectionHelper.getSelectedRelationshipArray()
                                .filter(x => x.key !== displayRelationship.key)
                                .map(x => {
                                    this.relationshipRibbon.drawRelRibbon({
                                        graphCanvas: this,
                                        actionDefinitions: this.canvasConfig.getRibbonDefinitions(x.isSelfConnected()),
                                        relSvgEl: this.getSvgRelEl(x),
                                        displayRelationship: x,
                                        d3Mouse: this.d3Mouse(event)
                                    })
                                });
                        } else {
                            this.selectionHelper.getSelectedRelationshipArray().map(x => this.relationshipRibbon.removeRelRibbon(
                                { relSvgEl: this.getSvgRelEl(x) }                                
                            ));
                            this.selectionHelper.removeRelSelection(event.currentTarget, displayRelationship);
                        }
                    } else {
                        if (this.selectionHelper.isAnythingSelected()) {
                            this.removeAllRelRibbons();
                            this.selectionHelper.clearSelections();
                        }
                        this.removeAllNodeArcs();
                        if (!this.selectionHelper.amISelected(displayRelationship)) {
                            this.selectionHelper.addRelSelection(event.currentTarget, displayRelationship);
                            this.relationshipRibbon.drawRelRibbon({
                                graphCanvas: this,
                                actionDefinitions: this.canvasConfig.getRibbonDefinitions(displayRelationship.isSelfConnected()),
                                relSvgEl: this.getSvgRelEl(displayRelationship),
                                displayRelationship: displayRelationship,
                                d3Mouse: this.d3Mouse(event)
                            });
                        } else {
                            this.selectionHelper.removeRelSelection(event.currentTarget, displayRelationship);
                            this.relationshipRibbon.removeRelRibbon({ relSvgEl: this.getSvgRelEl(displayRelationship) });                        }
                    }
                }
                event.stopPropagation();
            });

        relationshipGroups.append("path")
                .classed("relationshipLine", true)
                .each((displayRelationship, i, nodes) => {
                    this.linkMap[displayRelationship.key] = nodes[i];
                    this.updateRelationshipPosition(displayRelationship)
                });

        var relationshipDisplaySettings = this.canvasConfig.getRelationshipDisplaySettings(this.relationshipDisplay);

        // handle coloring of new and existing relationships
        var relationshipLine = relationshipGroups
            .merge(relationships)
            .select(".relationshipLine")

        this.setRelationshipLineStyle(relationshipLine);

        relationshipGroups.append("title")
            .attr("class", "relationshipTooltip")
            .text((displayRelationship) => displayRelationship.type);

        var displayText = relationshipGroups.append("text")
            //.attr("transform", rotateIfRightToLeft)
            .attr("class", "displayText")
            .attr("x", (displayRelationship) => this.textPositionHelper.getTextPosition(displayRelationship).x)
            .attr("y", (displayRelationship) => this.textPositionHelper.getTextPosition(displayRelationship).y)
            .text((displayRelationship) => this.getRelationshipText(displayRelationship))
            .each((displayRelationship, i, nodes) => {
                this.textMap[displayRelationship.key] = nodes[i];
                this.updateTextPosition(displayRelationship)
            });

        this.setRelationshipDisplayTextStyle(displayText);

        if (this.displayAnnotations) {
            this.annotationPlacementHelper.handleDisplayRelationshipAnnotations()
        }

        relationships.exit().remove();
    }

    setRelationshipLineStyle = (relationshipLine) => {
        relationshipLine
            .style("fill", "none")
            .style("stroke", (displayRelationship) => displayRelationship.color)
            .style("stroke-width", (displayRelationship) => displayRelationship.strokeWidth)
            //.style("stroke", (displayRelationship) => relationshipDisplaySettings.color)
            //.style("stroke-width", (displayRelationship) => relationshipDisplaySettings.strokeWidth)
            .style("stroke-dasharray", (displayRelationship) => displayRelationship.strokeDashArray)
            .style("stroke-opacity", (displayRelationship) => displayRelationship.strokeOpacity)
            .classed("arrow", true)
            .attr("marker-end", (displayRelationship) => displayRelationship.strokeDashArray === '1,0' 
                            ? `url(#${this.arrowDomElementId})` : `url(#${this.arrowDomElementId}_gray)`);
    }

    setRelationshipDisplayTextStyle = (displayText) => {
        displayText
            //.attr("x", 300)
            //.attr("y", 300)
            .attr("text-anchor", "middle")
            .attr("baseline-shift", "30%")
            .attr("alignment-baseline", "alphabetic")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", (displayRelationship) => displayRelationship.fontSize)
            //.style("fill", relationshipDisplaySettings.color)
            .style("fill", (displayRelationship) => displayRelationship.color)
            .style("fill-opacity", (displayRelationship) => displayRelationship.strokeOpacity)
    }

    textYOffset (displayNode) {
        var yOffset = 0;
        if (displayNode.textLocation == "below") {
            yOffset = displayNode.radius + displayNode.fontSize
        }
        return yOffset;
    }

    handleNodeMouseOver (d3Circle) {
        if (this.mode == MODES.CONNECT) {
            d3.select(d3Circle).classed("readyToConnect", true);
            //console.log("connect to id: " + d3Circle.parentNode.id);
            this.connectorEndId = d3Circle.parentNode.id;
        }
    }

    handleNodeMouseOut (event, d3Circle) {
        if (this.mode == MODES.CONNECT) {
            var circle = d3.select(d3Circle);
            var r = parseFloat(circle.attr("r"));
            var x1 = parseFloat(circle.attr("cx"));
            var y1 = parseFloat(circle.attr("cy"));
            ////console.log("mouseout coords: x1: " + x1 + ", y1: " + y1);
            var coords = this.d3Mouse(event);
            var x2 = coords.x;
            var y2 = coords.y;
            ////console.log("d3 x: " + x2 + ", y: " + y2);
            // distance calculations necessary because d3 keeps firing mouse out as I drag
            var distance = Math.hypot(x2-x1, y2-y1);
            ////console.log("distance: " + distance + ", r: " + r);
            if (distance > r) {
                this.connectorEndId = null;
                d3.select(d3Circle).classed("readyToConnect", false);
            }
        }
    }

    d3Mouse (event) {
        var coordinates = d3.pointer(event, this.svgRootGroupElement.node());
        return {
            x: coordinates[0],
            y: coordinates[1]
        }
    }

    getSvgRootGroupEl () {
        //return this.svgRootGroupElement;
        return d3.select(`#${this.parentDomElementId}_g`);
    }

    getD3NodeEl = (displayNode) => this.svgRootGroupElement.select(`#${this.getNodeDomId(displayNode)}`);
    getD3RelEl = (displayRelationship) => this.svgRootGroupElement.select(`#${this.getRelationshipDomId(displayRelationship)}`);

    getSvgNodeEl (displayNode) {
        const d3NodeEl = this.getD3NodeEl(displayNode);
        return (d3NodeEl) ? d3NodeEl.node() : null;
    }

    getSvgRelEl (displayRelationship) {
        const d3RelEl = this.getD3RelEl(displayRelationship);
        return (d3RelEl) ? d3RelEl.node() : null;
    }

    removeAllNodeArcs () {
        this.svgRootGroupElement.selectAll(".node").each((displayNode, i, nodes) => {
            removeNodeArcs({
                nodeSvgEl: nodes[i]
            });
        });
    }

    removeAllRelRibbons () {
        this.svgRootGroupElement.selectAll(".relationship").each((displayNode, i, nodes) => {
            this.relationshipRibbon.removeRelRibbon(
                { relSvgEl: nodes[i] }
            );
        });
    }

    optionEnabled = (option) => this.options[option];

    setDragEnabled (dragEnabledVar) {
        this.dragEnabled = dragEnabledVar;
    }

    connectorStart (d3This, event) {
        const svgEl = d3This;
        //console.log("connector start");
        if (this.userRole.canEdit() && this.optionEnabled(CANVAS_FEATURES.DRAW_RELATIONSHIP)) {
            this.connectorDidDragSome = false;
            this.mode = MODES.CONNECT;
            var coords = this.d3Mouse(event);
            this.connectorEndPoint = {
                x: coords.x,
                y: coords.y
            }
            this.connectorSourceId = svgEl.parentNode.id;

            var lineString = this.lineGenerator([[coords.x, coords.y], [coords.x, coords.y]]);

            this.svgRootGroupElement.append("path")
                .attr("class", "connectorLine")
                .style("stroke", "gray")
                .style("stroke-width", 3)
                .attr("marker-end", "url(#" + this.arrowDomElementId + ")")
                .attr("d", lineString);

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

    connectorDrag (d3This, event) {
        //console.log("connector drag");
        if (this.userRole.canEdit() && this.optionEnabled(CANVAS_FEATURES.DRAW_RELATIONSHIP)) {
            this.connectorDidDragSome = true;
            var sourceNode = d3.select('#' + this.connectorSourceId);
            var sourceCircle = sourceNode.select(".displayCircle");

            //var coords = d3Mouse(this);
            this.connectorEndPoint.x += event.dx;
            this.connectorEndPoint.y += event.dy;

            /*
            var sourceNodeInfo = JSON.stringify(sourceNode.datum());
            //console.log("source node info: " + sourceNodeInfo);
            */
            //console.log("source circle: cx: " + sourceCircle.attr("cx") + ", cy: "+ sourceCircle.attr("cy"));
            var line = this.svgRootGroupElement.select(".connectorLine");
            this.updateConnectorPosition (line, parseFloat(sourceCircle.attr("cx")),
                                     parseFloat(sourceCircle.attr("cy")),
                                     parseFloat(sourceCircle.attr("r")),
                                     this.connectorEndPoint.x,
                                     this.connectorEndPoint.y,
                                     /*coords.x,
                                     coords.y, */
                                     0);
        }
    }

    connectorStop (d3This, event) {
        //console.log("connector stop");
        if (this.userRole.canEdit() && this.optionEnabled(CANVAS_FEATURES.DRAW_RELATIONSHIP)) {
            if (this.connectorDidDragSome) {
                if (this.connectorSourceId != null) {
                    if (this.connectorEndId != null) {
                        // connect 2 nodes
                        var startKeyNoPrefix = this.extractNodeKeyFromDomId(this.connectorSourceId);
                        var endKeyNoPrefix = this.extractNodeKeyFromDomId(this.connectorEndId);
                        var startNode = this.dataProvider.data().getNodeByKey(startKeyNoPrefix);
                        var endNode = this.dataProvider.data().getNodeByKey(endKeyNoPrefix);
                
                        this.dataProvider.newRelationshipBetweenExistingNodes({
                            startNode: startNode,
                            startNodeCoords: this.convertLocalCoordsToGlobalCoords({x: startNode.x, y: startNode.y}),
                            endNode: endNode,
                            endNodeCoords: this.convertLocalCoordsToGlobalCoords({x: endNode.x, y: endNode.y}),
                            graphCanvas: this
                        })
                        //this.connectNodes(this.connectorSourceId, this.connectorEndId);
                    } else {
                        // make a new node, then connect
                        var coords = this.d3Mouse(event);
                        if (this.snapToGrid) {
                            var point = snap(coords.x, coords.y);
                            coords.x = point.x;
                            coords.y = point.y;
                        }
                        var sourceKey = this.extractNodeKeyFromDomId(this.connectorSourceId);
                        var startNode = this.dataProvider.data().getNodeByKey(sourceKey);

                        this.dataProvider.newRelationshipToEmptyNode({
                            coords: coords, 
                            startNode: startNode,
                            startNodeCoords: this.convertLocalCoordsToGlobalCoords({x: startNode.x, y: startNode.y}),
                            popupCoords: this.convertLocalCoordsToGlobalCoords(coords),
                            graphCanvas: this
                        });

                        /*
                        var displayProperties = {};
                        if (startNode) {
                            var propsToCopy = ['color','fontColor','fontSize','height',
                                'radius','size','stroke','strokeWidth','textLocation','width'];
                            propsToCopy.map(prop => displayProperties[prop] = startNode[prop]);
                        }

                        var newNode = this.createNewNode(coords.x, coords.y, true, displayProperties);
                        this.connectNodes(this.connectorSourceId, ID_PREFIXES.NODE + newNode.key);
                        */
                    }
                }
            }
            this.connectorSourceId = null;
            this.connectorEndId = null;
            this.connectorEndPoint = {};
            this.connectorDidDragSome = false;
            //mode = MODES.NORMAL;
            this.mode = MODES.SELECT;
            this.svgRootGroupElement.select(".connectorLine").remove();
            d3.select(".readyToConnect").classed("readyToConnect", false);
        }
    }

    getCanvasAttr = () => ({ ...this.zoomHelper.getVisibleRect(), snapToGrid: this.snapToGrid });

    createNewNode (x, y, deferRender, displayProperties) {
        var newNode = this.dataProvider.createNewNode(displayProperties);
        if (newNode) {
            if (x !== undefined && y !== undefined) {
                if (newNode != null) {
                    this.setNodePosition(newNode, x, y);
                }
            } else {
                setNewNodePosition(newNode, x, y, this.dataProvider, this.getCanvasAttr());
            }
            this.dataProvider.addNode(newNode);
            if (!deferRender) {
                this.render();
                this.focusNewNode(newNode);
            }
    
            return newNode;
        } else {
            return null;
        }
    }

    addNewNodeAndRender (newNode) {
        setNewNodePosition(newNode, null, null, this.dataProvider, this.getCanvasAttr());
        this.render();
        this.focusNewNode(newNode);
    }

    setNewNodePositionInternal (newNode) {
        setNewNodePosition(newNode, null, null, this.dataProvider, this.getCanvasAttr());
    }

    setNodePosition (node, x, y) {
        var margin = 150;
        var x = (x == undefined || x == null) ? margin + Math.floor(Math.random()*(this.canvasWidth-(margin*2))) : x;
        var y = (y == undefined || y == null) ? margin + Math.floor(Math.random()*(this.canvasHeight-(margin*2))) : y;

        node.setX(x);
        node.setY(y);

        return node;
    }

    nodeRemoved (node) {
        var svgNodeEl = this.getSvgNodeEl(node);
        this.selectionHelper.removeNodeSelection(svgNodeEl, node);
        this.selectionHelperAlt.removeNodeSelection(svgNodeEl, node);
    }

    relationshipRemoved (relationship) {
        var svgRelEl = this.getSvgRelEl(relationship);
        this.selectionHelper.removeRelSelection(svgRelEl, relationship);
        this.selectionHelperAlt.removeRelSelection(svgRelEl, relationship);

        var startNode = relationship.getStartNode();
        var endNode = relationship.getEndNode();

        var remainingConnections = this.dataProvider.getConnectedRelationshipBetweenNodes(startNode, endNode);
        this.computeRelationshipOffsets(startNode, endNode);
        remainingConnections.map(connection => this.reRenderRelationship(connection));
    }

    reverseRelationship (relationship) {
        var relSvgEl = this.getSvgRelEl(relationship);
        relationship.setDisplayOffset(-relationship.offset);
        this.relationshipRibbon.removeRelRibbon({
            relSvgEl: relSvgEl
        });
        this.updateRelationshipPosition(relationship);
        this.updateTextPosition(relationship);
        this.selectionHelper.removeRelSelection(relSvgEl, relationship);
    }

    focusNewNode (node) {
        this.selectionHelper.clearSelections();
        var svgNodeEl = this.getSvgNodeEl(node);
        var displayCircle = d3.select(svgNodeEl).select(".displayCircle");
        displayCircle.classed("focusNode", true);
        setTimeout(() => {
            displayCircle.classed("focusNode", false);
            this.selectionHelper.addNodeSelection(svgNodeEl, node);
        }, 250)
    }

    /*
    connectNodes (startKey, endKey) {
        var startKeyNoPrefix = startKey.substring(ID_PREFIXES.NODE.length);
        var endKeyNoPrefix = endKey.substring(ID_PREFIXES.NODE.length);
        var startNode = this.dataProvider.data().getNodeByKey(startKeyNoPrefix);
        var endNode = this.dataProvider.data().getNodeByKey(endKeyNoPrefix);
        this.addRelationship("", startNode, endNode);
    }*/

    addRelationship (type, startNode, endNode, deferRender) {
        var properties = {
            type: type,
            startNode: startNode,
            endNode: endNode
        }
        var relationship = this.dataProvider.getNewRelationship(properties);
        if (relationship) {
            this.dataProvider.data().addRelationship(relationship);
            //console.log('calling computeRelationshipOffsets in addRelationship')
            this.computeRelationshipOffsets(startNode, endNode, relationship);
            //notifyListeners(CANVAS_MESSAGES.ADD_NEW_RELATIONSHIP, relationship.key, relationship);
            if (!deferRender)
                this.render();
            return relationship;
        } else {
            return null;
        }
    }

    removeRelationshipsForNode (nodeKey) {
        var relationshipArray = this.dataProvider.data().getRelationshipsForNodeByKey(nodeKey);
        relationshipArray.map(x => this.removeRelationship(x.key));
    }

    /*
    removeRelationship (key) {
        var relationship = this.dataProvider.data().getRelationshipByKey(key);
        if (relationship) {
            var startNode = relationship.getStartNode();
            var endNode = relationship.getEndNode();
            this.dataProvider.data().removeRelationshipByKey(key);

            var remainingConnections = this.dataProvider.getConnectedRelationshipBetweenNodes(startNode, endNode);
            //remainingConnections.map(connection => connection.offset = 0);
            this.computeRelationshipOffsets(startNode, endNode);
            remainingConnections.map(connection => this.reRenderRelationship(connection));
            this.render();
        } else {
            //alert('Could not find relationship type for key: ' + key);
        }
    }
    */

    computeRelationshipOffsets (startNode, endNode, newRelationship) {
        var invertOffset = false;
        if (startNode.x > endNode.x ||
            (startNode.x === endNode.x && startNode.y > endNode.y)) {
            invertOffset = true;
        }

        var connections = this.dataProvider.data().getConnectedRelationshipBetweenNodes(startNode, endNode).reverse();
        if (connections) {
            var relId = null, relDomEl = null, connectionToUpdate = null;
            if (connections.length == 1) {
                if (startNode == endNode) {
                    //connections[0].offset = startNode.radius;
                    connections[0].setDisplayOffset(40);
                } else {
                    connections[0].setDisplayOffset(0);
                }

                if (newRelationship && connections[0] !== newRelationship) {
                    /*
                    relId = ID_PREFIXES.RELATIONSHIP + connections[0].key;
                    relDomEl = d3.select("#" + relId);
                    */
                    relDomEl = this.getD3RelEl(connections[0]);
                    if (!relDomEl.empty()) {
                        connectionToUpdate = relDomEl.datum();
                        this.updateRelationshipPosition(connectionToUpdate);
                        this.updateTextPosition(connectionToUpdate);
                    }
                }
            } else {
                var offsetIncrement = 25;
                for (var i = 0; i < connections.length; i++) {
                    var aConnection = connections[i];
                    var offset = 0;
                    if (startNode == endNode) {
                        //offset = startNode.radius * (i + 1);
                        offset = 40 * (i + 1);
                    } else {
                        offset = Math.floor((i + 2) / 2) * offsetIncrement;
                        if (invertOffset) {
                            offset = -offset;
                        }
                        if ((i % 2) === 1) {
                            offset = -offset;   // we want to make it negative to mirror the first slot - this is normal if both are facing forward
                        }
                        if (aConnection.getStartNode() === endNode) {
                            offset = -offset;
                        }
                        //console.log('i = ' + i + ', offset = ' + offset);

                        /*
                        if (i % 2 > 0) {
                            if (aConnection.getStartNode() == startNode) {
                                offset = -offset;
                            }
                        } else {
                            if (aConnection.getStartNode() == endNode) {
                                offset = -offset;
                            }
                        }*/
                    }
                    aConnection.setDisplayOffset(offset);
                    //console.log('aConnection.type: ' + aConnection.type + ', offset: ' + offset);
                    if (newRelationship && aConnection !== newRelationship) {
                        /*
                        relId = ID_PREFIXES.RELATIONSHIP + aConnection.key;
                        relDomEl = d3.select("#" + relId);
                        */
                        relDomEl = this.getD3RelEl(aConnection);
                        if (!relDomEl.empty()) {
                            connectionToUpdate = relDomEl.datum();
                            this.updateRelationshipPosition(connectionToUpdate);
                            this.updateTextPosition(connectionToUpdate);
                        }
                    }
                }
            }
        }
    }

    updateNodePosition (displayNode, nodeSvgEl, newPosition, ignoreChange, animationSettings) {
        // const debugDisplayCircle = d3.select(nodeSvgEl).select(".displayCircle");
        // console.log(`${displayNode.key}: old position x: ${displayNode.x}, y: ${displayNode.y}`);
        // console.log(`${displayNode.key}: new position x: ${newPosition.x}, y: ${newPosition.y}`);
        // console.log(`${displayNode.key}: circle old position x: ${debugDisplayCircle.attr("cx")}, y: ${debugDisplayCircle.attr("cy")}`);
        if (newPosition) {
            displayNode.x = newPosition.x;
            displayNode.y = newPosition.y;
        }

        if (this.snapToGrid) {
            var point = snap(displayNode.x, displayNode.y);
            displayNode.x = point.x;
            displayNode.y = point.y;
        }

        // 2020-06-20: I don't know if this is needed
        //node.x = displayNode.x;  // is this for d3 forceLayout only? or not needed?
        //node.y = displayNode.y;

        var displayCircle = d3.select(nodeSvgEl).select(".displayCircle");
        this.setNodeDisplayCircleStyle(displayCircle, displayNode);

        //console.log("displayNode.x type: " + typeof(displayNode.x));
        //const cxInterpolator = d3.interpolateNumber(displayCircle.attr("cx"), displayNode.x);
        displayCircle
            .attr("r", displayNode.radius)

        if (animationSettings) {
            // https://gist.github.com/mbostock/5d8039fb983a29e2ad49
            // holy [expletive]!  the transition needs a name, otherwise it gets cancelled immediately when something else calls this function
            displayCircle
                .transition(`displayCircle-${displayNode.key}`)
                .ease(animationSettings.animationEasing)
                .duration(animationSettings.animationDuration)            
                .attr("cx", displayNode.x)
                .attr("cy", displayNode.y)

        } else {
            displayCircle
                .attr("cx", displayNode.x)
                .attr("cy", displayNode.y)
        }

        d3.select(nodeSvgEl).select(".hoverCircle")
            .attr("cx", displayNode.x)
            .attr("cy", displayNode.y)
            .attr("r", displayNode.radius + this.CONSTANTS.HOVER_CIRCLE_RADIUS_INCREASE);

        var displayText = d3.select(nodeSvgEl).select(".displayText")
        if (animationSettings) {
            this.setNodeDisplayTextStyle(displayText, animationSettings, displayNode);
        } else {
            this.setNodeDisplayTextStyle(displayText, null, displayNode);
        }

        const newYPos = displayNode.y + this.textYOffset(displayNode);
        if (animationSettings) {
            d3.select(nodeSvgEl).selectAll(".displayText tspan")
                .transition(`.displayText-tspan-${displayNode.key}`)
                .ease(animationSettings.animationEasing)
                .duration(animationSettings.animationDuration)            
                .attr("x", displayNode.x)
                .attr("y", newYPos);
        } else {
            d3.select(nodeSvgEl).selectAll(".displayText tspan")
                .attr("x", displayNode.x)
                .attr("y", newYPos);
        }

        d3.select(nodeSvgEl).selectAll(".nodeArc")
            //.attr("transform", "translate(" + event.x + "," + event.y + ")");
            .attr("transform", "translate(" + displayNode.x + "," + displayNode.y + ")");

        if (this.displayAnnotations) {
            if (this.annotation.hasAnnotation(displayNode)) {
                var orientation = this.annotationPlacementHelper.getNodeAnnotationOrientation(displayNode);
                var offset = this.annotationPlacementHelper.getNodeAnnotationOffset(displayNode);
                this.annotation.updateAnnotationPosition(nodeSvgEl, displayNode.x, displayNode.y, offset, offset, orientation);
            }
            var connectedNodes = this.dataProvider.data().getConnectedNodes(displayNode);
            connectedNodes.map(connectedNode => {
                var connectedNodeSvgEl = this.getSvgNodeEl(connectedNode);
                var orientation = this.annotationPlacementHelper.getNodeAnnotationOrientation(connectedNode);
                var offset = this.annotationPlacementHelper.getNodeAnnotationOffset(connectedNode);
                this.annotation.updateAnnotationPosition(connectedNodeSvgEl, connectedNode.x, connectedNode.y, offset, offset, orientation);
            })
        }

        var connections = this.dataProvider.data().getConnectedRelationships(displayNode);
        connections.forEach(aConnection => {
            if (aConnection) {
                this.updateRelationshipPosition(aConnection);
                this.updateTextPosition(aConnection);
            }
        });
        if (!ignoreChange) {
            //this.dataProvider.dataChanged();
            this.dataProvider.dataChanged(GraphViewChangeType.NodeDisplayUpdate, { changedObject: displayNode });
        }
    }

    getRelationshipText (aConnection) {
        var relationshipText = this.dataProvider.getRelationshipDisplayText(aConnection);
        if (relationshipText) {
            var distance = 120;
            if (!aConnection.isSelfConnected()) {
                var points = this.canvasMath.computeConnectorEndPoints (
                    aConnection.getStartNode().x,
                    aConnection.getStartNode().y,
                    aConnection.getStartNode().radius,
                    aConnection.getEndNode().x,
                    aConnection.getEndNode().y,
                    aConnection.getEndNode().radius,
                    aConnection);
                var xDistance = Math.abs(points.x1 - points.x2);
                var yDistance = Math.abs(points.y1 - points.y2);
                distance = Math.sqrt(Math.pow(xDistance,2) + Math.pow(yDistance,2));
            }
            var textLength = this.getTextWidth(relationshipText);
            if (textLength > distance) {
                var numChars = Math.floor(relationshipText.length * (distance / textLength)) - 3;
                relationshipText = relationshipText.substring(0, numChars) + '...';
            }
            return relationshipText;
        } else {
            return '';
        }
    }

    getTextWidth (text) {
        var tspan = d3.select(`#${this.textDimensionHelperDomId}`);
        tspan.text(text);
        var textWidth = tspan.node().getComputedTextLength();
        tspan.text('');
        return textWidth;
    }

    getLoopbackLine (cx, cy, radius, offset) {

        var angle = (3 * Math.PI) / 4;
        var sinVal = Math.sin(angle);
        var cosVal = Math.cos(angle);

        var startX = radius * cosVal + cx - this.CONSTANTS.LINE_GAP;
        var startY = radius * sinVal + cy - this.CONSTANTS.LINE_GAP;
        var endX = cx - radius - 5 - this.CONSTANTS.LINE_GAP;
        var endY = cy - this.CONSTANTS.LINE_GAP;

        var cps = this.canvasMath.getLookbackControlPoints(cx, cy, radius, offset);

        var lineString = this.lineGenerator([[startX, startY], [cps[0].x, cps[0].y], [cps[1].x, cps[1].y], [endX, endY]]);
        return lineString;
    }

    updateTextPosition (aConnection) {
        var domText = this.textMap[aConnection.key];
        var text = d3.select(domText)

        var angleInDegrees = this.canvasMath.computeTextAngle(aConnection);

        ////console.log("angleInDegrees:" + angleInDegrees);
        var textPosition = this.textPositionHelper.getTextPosition(aConnection);
        text.attr("x", textPosition.x)
            .attr("y", textPosition.y)
            .attr("transform", "rotate(" + angleInDegrees + " " + textPosition.x + " " + textPosition.y + ")")
            .text((aConnection) => this.getRelationshipText(aConnection))

        this.setRelationshipDisplayTextStyle(text);            
    }

    updateConnectorPosition (d3line, startX, startY, startRadius, endX, endY, endRadius, connectToSelf) {

        var lineString;
        var relationship = d3line.datum();
        var offset = (relationship && relationship.offset) ? relationship.offset : 0;

        if (connectToSelf) {
            lineString = this.getLoopbackLine (startX, startY, startRadius, offset);
        } else {
            var points = this.canvasMath.computeConnectorEndPoints (startX, startY, startRadius, endX, endY, endRadius, relationship);
            if (relationship) {
                var midpoint = this.canvasMath.computeMidPoint(relationship, points.x1, points.x2, points.y1, points.y2);
                lineString = this.lineGenerator([[points.x1, points.y1], [midpoint.xMidPoint, midpoint.yMidPoint], [points.x2, points.y2]]);
            } else {
                lineString = this.lineGenerator([[points.x1, points.y1], [points.x2, points.y2]]);
            }
            // compute midpoints
            ////console.log("xMidPoint: " + xMidPoint + ", yMidPoint: " + yMidPoint);

        }
        d3line.attr("d", lineString);
    }

    updateRelationshipPosition (aConnection) {
        if (aConnection && aConnection.getStartNode() && aConnection.getEndNode()) {
            var domLine = this.linkMap[aConnection.key];
            if (domLine) {
                var line = d3.select(domLine);
                this.updateConnectorPosition (line, aConnection.getStartNode().x,
                                         aConnection.getStartNode().y,
                                         aConnection.getStartNode().radius,
                                         aConnection.getEndNode().x,
                                         aConnection.getEndNode().y,
                                         aConnection.getEndNode().radius, aConnection.isSelfConnected());
    
                this.setRelationshipLineStyle(line);
    
                // update relRibbon
                ////console.log('updateRelationshipPosition');
                d3.select(domLine.parentNode).selectAll(".relRibbon")
                    .attr("transform", (ribbonData, index, nodes) => {
                        var point = this.canvasMath.getRibbonPoint(ribbonData);
                        ////console.log('ribbon button index: ' + index);
                        var x = point.x + (index * this.CONSTANTS.REL_RIBBON_BUTTON_WIDTH);
                        ////console.log('x: ' + x);
                        var translate = "translate(" + x + "," + point.y + ")";
                        ////console.log('translate: ' + translate);
                        return translate;
                    });
    
                if (this.displayAnnotations) {
                    var point = this.textPositionHelper.getTextPosition(aConnection);
                    var annotationOffset = this.annotationPlacementHelper.getRelationshipAnnotationOffset(aConnection, point);
                    this.annotation.updateAnnotationPosition(domLine.parentNode, point.x, point.y, annotationOffset.x, annotationOffset.y, annotationOffset.orientation);
                }
            }
        }
    }
}