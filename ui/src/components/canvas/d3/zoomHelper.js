
import * as d3 from "d3";
import { GraphViewChangeType } from '../../../dataModel/graphDataConstants';

export const PAN_DIRECTION = { 
    LEFT: "LEFT", 
    RIGHT: "RIGHT", 
    UP: "UP", 
    DOWN: "DOWN", 
    PAN_RESET: "PAN_RESET" 
};

export const ZOOM_DIRECTION = { 
    ZOOM_IN: "ZOOM_IN", 
    ZOOM_OUT: "ZOOM_OUT", 
    ZOOM_RESET: "ZOOM_RESET" 
};

export class ZoomHelper {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            graphCanvas,
            getDataProvider,
            canvasConfig
        } = properties;

        this.graphCanvas = graphCanvas;
        this.getDataProvider = getDataProvider;
        this.CONSTANTS = canvasConfig.getConstants();
        
        this.zoom = d3.zoom().scaleExtent([
            this.CONSTANTS.MAX_ZOOM_OUT, 
            this.CONSTANTS.MAX_ZOOM_IN
        ]).on('zoom', this.zoomed);

        this.currentTransform = d3.zoomIdentity;
        this.scaleFactor = 1.0;
        this.currentPan = { x: 0, y: 0 }
        this.currentOffset = { x: 0, y: 0 }
    }

    getScaleFactor = () => this.scaleFactor;
    getCurrentPan = () => this.currentPan;

    /* from: http://bl.ocks.org/cartoda/de0664ca59ff7277a12c */
    zoomed = (event) => {
        this.graphCanvas.getSvgRootGroupEl().attr("transform", event.transform);
    }

    canvasZoom = (direction, amount, transitionTime) => {
        if (direction == ZOOM_DIRECTION.ZOOM_RESET) {
            this.scaleFactor = 1.0;
            this.currentTransform = d3.zoomIdentity.translate(this.currentPan.x, this.currentPan.y);
            this.currentOffset.x = 0;
            this.currentOffset.y = 0;
        } else {
            amount = (direction == ZOOM_DIRECTION.ZOOM_OUT) ? -amount : amount;
            this.scaleFactor = (this.scaleFactor + amount);
            var centerX = this.graphCanvas.getCanvasWidth() / 2;
            var centerY = this.graphCanvas.getCanvasHeight() / 2;
            this.currentOffset.x = (1 - this.scaleFactor) * centerX;
            this.currentOffset.y = (1 - this.scaleFactor) * centerY;
        }
        // offset logic from http://www.petercollingridge.co.uk/tutorials/svg/interactive/pan-and-zoom/
            // because I couldn't figure it out by myself
        //console.log("this.currentOffset: " + this.currentOffset.x + "," + this.currentOffset.y);
        this.currentTransform = d3.zoomIdentity.translate(this.currentPan.x + this.currentOffset.x, this.currentPan.y + this.currentOffset.y).scale(this.scaleFactor);
        if (transitionTime) {
            this.graphCanvas.getSvgRootGroupEl().transition()
                .duration(transitionTime)
                .call(this.zoom.transform, this.currentTransform);
        } else {
            this.graphCanvas.getSvgRootGroupEl().call(this.zoom.transform, this.currentTransform);
        }
        this.getDataProvider().dataChanged(GraphViewChangeType.CanvasTransformUpdate, { });
    }

    panTo = (thingToPanTo) => {
        var position;
        if (thingToPanTo.classType === 'NodeDisplay') {
            position = {
                x: thingToPanTo.x,
                y: thingToPanTo.y
            }
        } else if (thingToPanTo.classType === 'RelationshipDisplay') {
            position = {
                x: thingToPanTo.getStartNode().x + (thingToPanTo.getEndNode().x - thingToPanTo.getStartNode().x) / 2,
                y: thingToPanTo.getStartNode().y + (thingToPanTo.getEndNode().y - thingToPanTo.getStartNode().y) / 2
            }
        }
        var diffX = this.graphCanvas.getCanvasWidth() / 2 - position.x;
        var diffY = (this.graphCanvas.getCanvasHeight() / 2) - 50 - position.y;   // 50 is to make it slightly higher on screen
        this.updatePanTransform (diffX - this.currentPan.x, diffY - this.currentPan.y);
    }

    updatePanTransform = (diffX, diffY) => {
        this.currentTransform = this.currentTransform.translate(diffX, diffY);
        this.currentPan.x += diffX * this.scaleFactor;
        this.currentPan.y += diffY * this.scaleFactor;
        this.graphCanvas.getSvgRootGroupEl().call(this.zoom.transform, this.currentTransform);

        // trigger save
        this.getDataProvider().dataChanged(GraphViewChangeType.CanvasTransformUpdate, { });
    }

    getViewSettings = () => {
        var settings = {
            currentPan: this.currentPan,
            currentOffset: this.currentOffset,
            scaleFactor: this.scaleFactor
        };
        return settings;
    }

    setViewSettings = (settings) => {
        if (settings && settings.currentPan 
                && (settings.currentPan.x !== this.currentPan.x 
                 || settings.currentPan.y !== this.currentPan.y)) {
            this.currentPan = settings.currentPan;
            console.log('this.currentPan: ', this.currentPan);
            this.currentTransform = this.currentTransform.translate(this.currentPan.x, this.currentPan.y);
            this.graphCanvas.getSvgRootGroupEl().call(this.zoom.transform, this.currentTransform);
        }
    }

    adjustForPanAndZoom = (x, y) => {
        var middleX = this.graphCanvas.getCanvasWidth() / 2;
        var middleY = this.graphCanvas.getCanvasHeight() / 2;
        var modifiedX = middleX + (x - middleX) * this.scaleFactor;
        var modifiedY = middleY + (y - middleY) * this.scaleFactor;
        var newx = modifiedX + this.currentPan.x;
        var newy = modifiedY + this.currentPan.y;

        return {
            x: newx,
            y: newy
        }
    }

    getVisibleRect = () => {
        var newX = -this.currentPan.x / this.scaleFactor;
        var newY = -this.currentPan.y / this.scaleFactor;
        var newWidth = (this.graphCanvas.getCanvasWidth() - this.currentPan.x) / this.scaleFactor;
        var newHeight = (this.graphCanvas.getCanvasHeight() - this.currentPan.y) / this.scaleFactor;

        return {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            scaleFactor: this.scaleFactor
        }
    }

    resetPanAndZoom (dontSendDataChanged) {
        this.graphCanvas.getSvgRootGroupEl().call(this.zoom.transform, d3.zoomIdentity);
        this.currentTransform = d3.zoomIdentity;
        this.scaleFactor = 1.0;
        this.currentPan = { x: 0, y: 0 };
        this.currentOffset = { x: 0, y: 0 };
        if (!dontSendDataChanged) {
            this.getDataProvider().dataChanged(GraphViewChangeType.CanvasTransformUpdate, { });
        }
    }
}
