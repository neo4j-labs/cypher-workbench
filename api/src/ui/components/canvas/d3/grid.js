//import * as d3 from "d3";

export const GRID_CONFIG = {
    CELL_SIZE: 20,
    EXTRA_MARGIN: 1000
};

export function drawGrid (gridSvg, canvasWidth, canvasHeight) {

    var left = -GRID_CONFIG.EXTRA_MARGIN,
        top = -GRID_CONFIG.EXTRA_MARGIN,
        right = canvasWidth + GRID_CONFIG.EXTRA_MARGIN,
        bottom = canvasHeight + GRID_CONFIG.EXTRA_MARGIN;

    var verticalLineData = [];
    for (var i = left; i <= right; i+= GRID_CONFIG.CELL_SIZE) {
        verticalLineData.push({key: 'vert_' + i, x: i, y: top, length: (bottom-top)});
    }
    /*
    var horizontalLineData = [];
    for (var j = top; j <= bottom; j+= cellSize) {
        horizontalLineData.push({key: 'horz_' + j, x: left, y: j, length: (right-left)});
    }
    */

    var dashArray = '1,' + (GRID_CONFIG.CELL_SIZE - 1);
    /*
    var horizontals = gridSvg.selectAll(".gridHorizontal")
            .data(horizontalLineData)
    var horizontalLines = horizontals.enter();
    horizontalLines
        .append('line')
        //.style('stroke', 'lightgray')
        .style('stroke', 'black')
        .style('stroke-width', '1')
        //.style('stroke-dasharray', '6,14')
        .style('stroke-dasharray', dashArray)
        //.style('stroke-dashoffset', '3')
        .attr('x1', function(d) { return d.x})
        .attr('x2', function(d) { return d.x + d.length})
        .attr('y1', function(d) { return d.y})
        .attr('y2', function(d) { return d.y})
    */
    var verticals = gridSvg.selectAll(".gridVertical")
            .data(verticalLineData)
    var verticalLines = verticals.enter();
    verticalLines
        .append('line')
        .attr('class', 'gridVertical')
        //.style('stroke', 'lightgray')
        .style('stroke', 'black')
        .style('stroke-width', '1')
        //.style('stroke-dasharray', '6,14')
        .style('stroke-dasharray', dashArray)
        //.style('stroke-dashoffset', '3')
        .attr('x1', function(d) { return d.x})
        .attr('x2', function(d) { return d.x})
        .attr('y1', function(d) { return d.y})
        .attr('y2', function(d) { return d.y + d.length})

    //horizontalLines.exit().remove();
    verticalLines.exit().remove();
}

export function removeGrid (gridSvg) {
    //gridSvg.selectAll(".gridHorizontal").remove();
    //console.log('removeGrid called');
    gridSvg.selectAll(".gridVertical").remove();
}
