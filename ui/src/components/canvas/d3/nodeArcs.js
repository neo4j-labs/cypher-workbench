
import * as d3 from "d3";

const CLASSES = {
    nodeArc: 'nodeArc',
    nodeArcHighlight: 'nodeArcHighlight',
    displayTextIcon: 'displayTextIcon'
}

const COLORS = {
    pathStroke: 'white',
    pathFill: '#A8A8A8',
    textFill: 'white'
}

export function areNodeArcsDisplayed (nodeSvgEl) {
    var nodeArcs = d3.select(nodeSvgEl).selectAll('.' + CLASSES.nodeArc);
    return (nodeArcs.size() > 0) ? true : false;
}

export function removeNodeArcs (properties) {
    var { nodeSvgEl } = properties;
    if (nodeSvgEl) {
        d3.select(nodeSvgEl).selectAll('.' + CLASSES.nodeArc)
            .data([])
            .exit()
            .remove();
    }
}

export function drawNodeArcs (properties) {
    
    var { graphCanvas, actionDefinitions, nodeSvgEl, displayNode } = properties;
    var actionKeys = Object.keys(actionDefinitions);

    var arcGroups = d3.select(nodeSvgEl).selectAll('.' + CLASSES.nodeArc)
        .data(() => {
            var myData = [];
            var arcAngle = ((2*Math.PI) / actionKeys.length);
            actionKeys.map((actionKey, i) => {
                myData.push({
                    id: displayNode.key + '_arc_' + i,
                    actionKey: actionKey,
                    actionObject: actionDefinitions[actionKey],
                    x: displayNode.x,
                    y: displayNode.y,
                    innerRadius: displayNode.radius + 7,
                    outerRadius: displayNode.radius + 34,
                    startAngle: i * arcAngle,
                    endAngle: (i + 1) * arcAngle,
                    displayNode: displayNode
                })
            })
            return myData;
        })
        .enter()
        .append('g')
        .attr('class', function (arcData) { return CLASSES.nodeArc + ' ' + arcData.action; })
        .attr("transform", function(arcData) { return "translate(" + arcData.x + "," + arcData.y + ")"})
        .on('mousedown', () => graphCanvas.setDragEnabled(false))
        .on('mouseup', () => graphCanvas.setDragEnabled(true))
        .on('click', function(event, arcData) {
            graphCanvas.setDragEnabled(true);
            arcData.actionObject.onClick({ 
                graphCanvas: graphCanvas,
                displayNode: arcData.displayNode, 
                arcSvgEl: this, 
                nodeSvgEl: nodeSvgEl
            });
            event.stopPropagation();
        });

    arcGroups.append("title").text((arcData) => arcData.actionObject.tooltip);

    arcGroups.append("path")
            .attr('id', (arcData) => arcData.id)
            .attr("d", (arcData) => {
                var arc = d3.arc()
                    .innerRadius(arcData.innerRadius)
                    .outerRadius(arcData.outerRadius)
                    .startAngle(arcData.startAngle)
                    .endAngle(arcData.endAngle);
                return arc();
            })
            .on('mouseover', (event, arcData) => d3.select('#' + arcData.id).classed(CLASSES.nodeArcHighlight, true))
            .on('mouseout', (event, arcData) => d3.select('#' + arcData.id).classed(CLASSES.nodeArcHighlight, false))
            .style("stroke", COLORS.pathStroke)
            .style("fill", COLORS.pathFill)

    arcGroups.append('text')
        .attr("class", CLASSES.displayTextIcon + " fa")
        .attr("x", (arcData) => getIconPosition(arcData).x)
        .attr("y", (arcData) => getIconPosition(arcData).y)
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .attr('font-family', 'FontAwesome')
        .attr("font-size", () => '1em')
        .style("fill", () => COLORS.textFill)
        .text((arcData) => arcData.actionObject.iconUnicode);
}

function getIconPosition (arcData) {
    var iconAngle = arcData.startAngle + (arcData.endAngle - arcData.startAngle) / 2 - ( Math.PI / 2);
    var iconRadiusPosition = arcData.innerRadius + (arcData.outerRadius - arcData.innerRadius) / 2;
    var x = iconRadiusPosition * Math.cos(iconAngle);
    var y = iconRadiusPosition * Math.sin(iconAngle);
    return {
        x: x,
        y: y
    }
}

export function updateArcIcon (arcSvgEl, iconUnicode) {
    var d3ArcSvgEl = d3.select(arcSvgEl);
    d3ArcSvgEl.datum().actionObject.iconUnicode = iconUnicode;
    d3ArcSvgEl
        .select('.' + CLASSES.displayTextIcon)
        .text((arcData) => arcData.actionObject.iconUnicode);
}

