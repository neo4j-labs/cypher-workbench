
export class TextPositionHelper {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            canvasMath
        } = properties;

        this.canvasMath = canvasMath;
    }

    getTextPosition (displayRelationship) {
        if (displayRelationship && displayRelationship.getStartNode() && displayRelationship.getEndNode()) {
            var cps;
            var x1 = displayRelationship.getStartNode().x;
            var y1 = displayRelationship.getStartNode().y;
            var x2 = displayRelationship.getEndNode().x;
            var y2 = displayRelationship.getEndNode().y;

            var connectToSelf = displayRelationship.isSelfConnected();
            var offset = (displayRelationship && displayRelationship.offset) ? displayRelationship.offset : 0;
            var midpoint;
            if (connectToSelf) {
                var cx = displayRelationship.getStartNode().x;
                var cy = displayRelationship.getStartNode().y;
                var radius = displayRelationship.getStartNode().radius;
                cps = this.canvasMath.getLookbackControlPoints(cx, cy, radius, offset);
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
                var angle = this.canvasMath.computeAngle(x1, y1, x2, y2);
                var cosVal = Math.cos(angle);
                var sinVal = Math.sin(angle);
                ////console.log('angle: ' + angle + ', cosVal: ' + cosVal + ', sinVal: ' + sinVal);
                ////console.log('x1: ' + x1 + ', y1: ' + y1 + ', x2: ' + x2 + ', y2: ' + y2);
                x1 += displayRelationship.getStartNode().radius * cosVal;
                y1 += displayRelationship.getStartNode().radius * sinVal;
                x2 += -displayRelationship.getEndNode().radius * cosVal;
                y2 += -displayRelationship.getEndNode().radius * sinVal;
                ////console.log('now x1: ' + x1 + ', y1: ' + y1 + ', x2: ' + x2 + ', y2: ' + y2);
                midpoint = this.canvasMath.computeMidPoint(displayRelationship, x1, x2, y1, y2, (offset / 4));
            }

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
}
