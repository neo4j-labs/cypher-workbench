
import { ORIENTATION } from './graphCanvasAnnotation.js';

export class AnnotationPlacementHelper {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            graphCanvas,
            getDataProvider,
            canvasConfig,
            canvasMath,
            textPositionHelper,
            graphCanvasAnnotation
        } = properties;

        this.CONSTANTS = canvasConfig.getConstants();

        this.graphCanvas = graphCanvas;
        this.getDataProvider = getDataProvider;
        this.canvasMath = canvasMath;
        this.textPositionHelper = textPositionHelper;
        this.annotation = graphCanvasAnnotation;
    }

    handleDisplayNodeAnnotations () {
        // reselect all displayNodes
        this.graphCanvas.getSvgRootGroupEl().selectAll(".node").each((displayNode, i, nodes) => {
            var annotationText = this.getDataProvider().getNodeDisplayAnnotationText(displayNode);
            ////console.log(annotationText);
            if (this.annotation.hasAnnotation(displayNode)) {
                if (annotationText) {
                    // update annotation
                    ////console.log("update annotation text");
                    this.annotation.updateAnnotationText(nodes[i], annotationText);
                } else {
                    // delete annotation
                    ////console.log("remove annotation");
                    this.annotation.removeAnnotation(nodes[i], displayNode);
                }
            } else {
                if (annotationText) {
                    var offset = this.getNodeAnnotationOffset(displayNode);
                    ////console.log("add annotation");
                    var orientation = this.getNodeAnnotationOrientation(displayNode);

                    this.annotation.addAnnotation({
                        svgElement: nodes[i], 
                        dataModelElement: displayNode, 
                        x: displayNode.x, 
                        y: displayNode.y, 
                        offsetX: offset, 
                        offsetY: offset, 
                        text: annotationText, 
                        orientation: orientation
                    });
                }
            }

            //console.log("displayNode: ", displayNode);
            var connectedNodes = this.getDataProvider().data().getConnectedNodes(displayNode);
            //console.log("connectedNodes: ", connectedNodes);
            connectedNodes.map(connectedNode => {
                if (connectedNode) {
                    var connectedNodeSvgEl = this.graphCanvas.getSvgNodeEl(connectedNode);
                    //console.log("connectedNodeSvgEl: ", connectedNodeSvgEl);
                    var orientation = this.getNodeAnnotationOrientation(connectedNode);
                    //console.log("orientation: ", orientation);
                    var offset = this.getNodeAnnotationOffset(connectedNode);
                    //console.log("offset: ", offset);
                    this.annotation.updateAnnotationPosition(connectedNodeSvgEl, connectedNode.x, connectedNode.y,
                            offset, offset, orientation);
                    //console.log("after this.annotation.updateAnnotationPosition");
                }
            })
        });
    }

    getNodeAnnotationOffset (displayNode) {
        return displayNode.radius + this.CONSTANTS.NODE_ANNOTATION_OFFSET;
    }

    getNodeAnnotationOrientation (displayNode) {
        var relationships = this.getDataProvider().data().getConnectedRelationships(displayNode);
        if (relationships.length > 0) {
            var indexes = relationships.map(x => {
                var angle = this.canvasMath.computeRelationshipAngle(x).angleInDegrees;
                ////console.log("angle0: " + angle);
                if (x.getEndNode() == displayNode) {
                    ////console.log("angle1: " + angle);
                    angle = (angle + 180) % 360;
                }
                if (angle < 0) {
                    angle = (360 + angle)
                    ////console.log("angle2: " + angle);
                }
                var index = this.getLineOrientationIndex(angle);
                ////console.log("index: " + index);
                return index;
            });
            ////console.log("indexes");
            ////console.log(indexes);

            // old way: average of position and then put it on other side.
            //    Problems: doesn't handle cross between 7 and 0 positions, and breaks down with more connections
            // var avg = Math.floor(indexes.reduce((total, x) => total + x, 0) / indexes.length);
            // var openIndex = (avg + 4) % 8;

            // new way: compute largest continuous opening - then put it in the middle
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

    getLineOrientationIndex (angle) {
        // 0 = RIGHT,  45 BOTTOM_RIGHT, 90 = BOTTOM, etc
        // RIGHT = 0, BOTTOM_RIGHT = 1, BOTTOM = 2, etc
        var index = Math.floor((angle / 45) + 0.5) % 8; // mod 8 so that 8 will roll back to 0
        return index;
    }

    getRelationshipAnnotationOrientation (displayRelationship) {
        var angleInDegrees = this.canvasMath.computeAnnotationAngle(displayRelationship);
        ////console.log(angleInDegrees);
        var orientation;
        if (displayRelationship.isSelfConnected()) {
            var relationshipNumber = Math.floor(displayRelationship.offset / displayRelationship.getStartNode().radius);
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

    handleDisplayRelationshipAnnotations () {
        // reselect all relationships
        this.graphCanvas.getSvgRootGroupEl().selectAll(".relationship").each((displayRelationship, i, nodes) => {
            var annotationText = this.getDataProvider().getRelationshipDisplayAnnotationText(displayRelationship);
            if (this.annotation.hasAnnotation(displayRelationship)) {
                if (annotationText) {
                    // update annotation
                    //console.log("update annotation text");
                    this.annotation.updateAnnotationText(nodes[i], annotationText);
                } else {
                    // delete annotation
                    //console.log("remove annotation");
                    this.annotation.removeAnnotation(nodes[i], displayRelationship);
                }
            } else {
                if (annotationText) {
                    var point = this.textPositionHelper.getTextPosition(displayRelationship);
                    var annotationOffset = this.getRelationshipAnnotationOffset(displayRelationship, point);

                    this.annotation.addAnnotation({
                        svgElement: nodes[i], 
                        dataModelElement: displayRelationship, 
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

    getRelationshipAnnotationOffset (displayRelationship, textPosition) {
        var annotationXOffset = this.CONSTANTS.ANNOTATION_X_OFFSET_DEFAULT;
        var annotationYOffset = this.CONSTANTS.ANNOTATION_Y_OFFSET_DEFAULT;
        var orientation = this.getRelationshipAnnotationOrientation(displayRelationship);
        if (displayRelationship.isSelfConnected()) {
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

        } 
        return {
            x: annotationXOffset,
            y: annotationYOffset,
            orientation: orientation
        }
    }

    removeAllNodeAnnotations () {
        this.graphCanvas.getSvgRootGroupEl().selectAll(".node").each((displayNode, i, nodes) => {
            if (this.annotation.hasAnnotation(displayNode)) {
                this.annotation.removeAnnotation(nodes[i], displayNode);
            }
        });
    }

    removeAllRelationshipAnnotations () {
        this.graphCanvas.getSvgRootGroupEl().selectAll(".relationship").each((displayRelationship, i, nodes) => {
            if (this.annotation.hasAnnotation(displayRelationship)) {
                this.annotation.removeAnnotation(nodes[i], displayRelationship);
            }
        });
    }
}
