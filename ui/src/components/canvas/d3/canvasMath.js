
export class CanvasMath {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var { 
            canvasConfig
        } = properties;

        this.CONSTANTS = canvasConfig.getConstants();
    }

    // from: https://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
    computeAngle(cx, cy, ex, ey) {
        var dy = ey - cy;
        var dx = ex - cx;
        var theta = Math.atan2(dy, dx); // range (-PI, PI]
        //theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        //if (theta < 0) theta = 360 + theta; // range [0, 360)
        return theta;
    }

    computeRelationshipAngle (aConnection) {
        var angleInDegrees = 0;
        var connectToSelf = aConnection.isSelfConnected();
        var x1 = 0, y1 = 0, x2 = 0, y2 = 0;

        if (aConnection.getStartNode() && aConnection.getEndNode()) {
            if (connectToSelf) {
                var cx = aConnection.getStartNode().x;
                var cy = aConnection.getStartNode().y;
                var radius = aConnection.getStartNode().radius;
                var cps = this.getLookbackControlPoints(cx, cy, radius, 0);
                x1 = cps[1].x;
                y1 = cps[1].y;
                x2 = cps[0].x;
                y2 = cps[0].y;
            } else {
                x1 = aConnection.getStartNode().x;
                y1 = aConnection.getStartNode().y;
                x2 = aConnection.getEndNode().x;
                y2 = aConnection.getEndNode().y;
            }

            var angle = this.computeAngle(x1, y1, x2, y2);
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

    computeAnnotationAngle (aConnection) {
        var result = this.computeRelationshipAngle(aConnection);

        if (result.y2 < result.y1) {
            result.angleInDegrees += 180;
        }

        return result.angleInDegrees;
    }

    computeTextAngle (aConnection) {
        var result = this.computeRelationshipAngle(aConnection);
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

    computeConnectorEndPoints (startX, startY, startRadius, endX, endY, endRadius, displayRelationship) {

        var offset = (displayRelationship && displayRelationship.offset) ? displayRelationship.offset : 0;
        var angle = Math.abs(this.computeAngle(startX,
                                    startY,
                                    endX,
                                    endY))

        ////console.log("offset = " + offset);
        var x1Offset = (startRadius + this.CONSTANTS.LINE_GAP) * Math.abs(Math.cos(angle));
        var y1Offset = (startRadius + this.CONSTANTS.LINE_GAP) * Math.abs(Math.sin(angle));
        var x2Offset = 0;
        var y2Offset = 0;
        if (!endRadius == 0) {
            x2Offset = -((endRadius + this.CONSTANTS.MARKER_WIDTH + this.CONSTANTS.LINE_GAP) * Math.abs(Math.cos(angle)));
            y2Offset = -((endRadius + this.CONSTANTS.MARKER_WIDTH + this.CONSTANTS.LINE_GAP) * Math.abs(Math.sin(angle)));
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

        // compute start and end points
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

    computeMidPoint (displayRelationship, x1, x2, y1, y2, additionalOffset) {
        var offset = (displayRelationship && displayRelationship.offset) ? displayRelationship.offset : 0;
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

        return {
            xMidPoint: xMidPoint,
            yMidPoint: yMidPoint
        }
    }

    getLookbackControlPoints (cx, cy, radius, offset) {
        var radiusMultiplier = offset / radius + 1;

        var angle1 = (25 * Math.PI) / 32;
        var angle2 = (31 * Math.PI) / 32;

        var sinVal1 = Math.sin(angle1);
        var cosVal1 = Math.cos(angle1);
        var sinVal2 = Math.sin(angle2);
        var cosVal2 = Math.cos(angle2);

        var control1X = radiusMultiplier * radius * cosVal1 + cx - this.CONSTANTS.LINE_GAP;
        var control1Y = radiusMultiplier * radius * sinVal1 + cy - this.CONSTANTS.LINE_GAP;
        var control2X = radiusMultiplier * radius * cosVal2 + cx - this.CONSTANTS.LINE_GAP;
        var control2Y = radiusMultiplier * radius * sinVal2 + cy - this.CONSTANTS.LINE_GAP;

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

    getRibbonPoint (ribbonData) {
        var { displayRelationship, actionDefinitions } = ribbonData;
        var actionsLen = Object.values(actionDefinitions).length;
        //var yOffset = (ignoreOffset) ? 0 : 10;
        var yOffset = 10;
        var x, y, ribbonWidth;
        var offset = (displayRelationship && displayRelationship.offset) ? displayRelationship.offset : 0;

        if (displayRelationship.isSelfConnected()) {
            var cx = displayRelationship.getStartNode().x;
            var cy = displayRelationship.getStartNode().y;
            var radius = displayRelationship.getStartNode().radius;
            var cps = this.getLookbackControlPoints(cx, cy, radius, offset);
            x = ((cps[0].x - cps[1].x) / 2) + cps[1].x;
            y = ((cps[0].y - cps[1].y) / 2) + cps[1].y + this.CONSTANTS.REL_RIBBON_BUTTON_HEIGHT + yOffset;
        } else {
            ribbonWidth = actionsLen * this.CONSTANTS.REL_RIBBON_BUTTON_WIDTH;
            var midPoint = this.computeMidPoint (displayRelationship, displayRelationship.getStartNode().x,
                                            displayRelationship.getEndNode().x,
                                            displayRelationship.getStartNode().y,
                                            displayRelationship.getEndNode().y, 0);
            x = midPoint.xMidPoint - ribbonWidth / 2;
            y = midPoint.yMidPoint + yOffset;
            //x = midPoint.xMidPoint;
            //y = midPoint.yMidPoint;

        }
        return {
            x: x,
            y: y
        }
    }
}
