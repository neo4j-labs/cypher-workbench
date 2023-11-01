
import { GRID_CONFIG } from './grid';

export function setNewNodePosition (displayNode, x, y, dataProvider, canvasAttr) {
    var position = {x: x, y: y};
    //console.log('canvasAttr');
    //console.log(canvasAttr);
    if ((x === undefined || x === null) || (y === undefined || y === null)) {
        position = findOpenPosition(dataProvider, canvasAttr);
    }
    displayNode.setX(position.x);
    displayNode.setY(position.y);
}

export function findOpenPosition (dataProvider, canvasAttr) {
    var { x, y, width, height, scaleFactor, snapToGrid } = canvasAttr;
    var topMargin = 100 * scaleFactor + y;
    var bottomMargin = 20 * scaleFactor;
    var leftMargin = 200 * scaleFactor + x;
    var rightMargin = 20 * scaleFactor;
    var defaultXIncrement = 120 * scaleFactor;
    var defaultYIncrement = defaultXIncrement * (height / width);
    var defaultCircleRadius = 100;
    var cy = topMargin;

    var foundOpening = false;
    //console.log('width: ' + width + ', height: ' + height);
    while (cy < (height - bottomMargin)) {
        var cx = leftMargin;
        while (cx < (width - rightMargin)) {
            //console.log('cx: ' + cx + ', cy: ' + cy);
            var isOpen = !(intersectsWithAnyNode(dataProvider, cx, cy, defaultCircleRadius));
            if (isOpen) {
                foundOpening = true;
                break;
            }
            cx += defaultXIncrement;
        }
        if (foundOpening) {
            break;
        }
        cy += defaultYIncrement;
    }
    var point;
    if (foundOpening) {
        //console.log('found opening');
        point = { x: cx, y: cy };
    } else {
        //console.log('doing random placement');
        point = {
            x: leftMargin + Math.floor(Math.random()*(width-(leftMargin + rightMargin))),
            y: topMargin + Math.floor(Math.random()*(height-(topMargin + bottomMargin)))
        }
    }
    return (snapToGrid) ? snap(point.x, point.y) : point;
}

export function snap (x, y) {
    var xdiff = x % GRID_CONFIG.CELL_SIZE;
    xdiff = (xdiff < (GRID_CONFIG.CELL_SIZE/2)) ? -xdiff : GRID_CONFIG.CELL_SIZE - xdiff;
    x += xdiff;
    var ydiff = y % GRID_CONFIG.CELL_SIZE;
    ydiff = (ydiff < (GRID_CONFIG.CELL_SIZE/2)) ? -ydiff : GRID_CONFIG.CELL_SIZE - ydiff;
    y += ydiff;
    return {
        x: x,
        y: y
    }
}

// https://stackoverflow.com/questions/16005136/how-do-i-see-if-two-rectangles-intersect-in-javascript-or-pseudocode/29614525
export function rectanglesIntersect(minAx, minAy, maxAx, maxAy, minBx, minBy, maxBx, maxBy ) {
    var aLeftOfB = maxAx < minBx;
    var aRightOfB = minAx > maxBx;
    var aAboveB = minAy > maxBy;
    var aBelowB = maxAy < minBy;

    return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
}

export function rectangleContainsRectangle (outerMinX, outerMinY, outerMaxX, outerMaxY, innerMinX, innerMinY, innerMaxX, innerMaxY) {
    return (outerMinX <= innerMinX && innerMinX <= outerMaxX)
        && (outerMinX <= innerMaxX && innerMaxX <= outerMaxX)
        && (outerMinY <= innerMinY && innerMinY <= outerMaxY)
        && (outerMinY <= innerMaxY && innerMaxY <= outerMaxY);
}

// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
// returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
function linesIntersect(a,b,c,d,p,q,r,s) {
  var det, gamma, lambda;
  det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) {
    return false;
  } else {
    lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
    gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }
};

export function lineIntersectsWithRectangle(lineX1, lineY1, lineX2, lineY2, rectX1, rectY1, rectX2, rectY2) {

    var rectLines = [
        { x1: rectX1, y1: rectY1, x2: rectX1, y2: rectY2 },
        { x1: rectX1, y1: rectY2, x2: rectX2, y2: rectY2 },
        { x1: rectX2, y1: rectY1, x2: rectX2, y2: rectY2 },
        { x1: rectX1, y1: rectY1, x2: rectX2, y2: rectY1 }
    ]

    for (var i = 0; i < rectLines.length; i++) {
        var intersects = linesIntersect(lineX1, lineY1, lineX2, lineY2,
            rectLines[i].x1, rectLines[i].y1, rectLines[i].x2, rectLines[i].y2);
        if (intersects) {
            return true;
        }
    }
    // double check if line entirely consumed by rectangle
    return rectangleContainsRectangle(rectX1, rectY1, rectX2, rectY2, lineX1, lineY1, lineX2, lineY2);
}


function circlesIntersect(cx1, cy1, r1, cx2, cy2, r2) {
    // for simplicity for now - we will just convert them to squares
    return rectanglesIntersect(
        cx1 - r1, cy1 - r1, cx1 + r1, cy1 + r1,
        cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2
    );
}

export function intersectsWithAnyNode (dataProvider, cx, cy, r) {
    var nodeArray = dataProvider.data().getNodeArray();
    return nodeArray.some(displayNode =>
        circlesIntersect(cx, cy, r, displayNode.x, displayNode.y, displayNode.radius)
    );
}
