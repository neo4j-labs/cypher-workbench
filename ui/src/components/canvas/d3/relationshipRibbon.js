
import * as d3 from "d3";

const CLASSES = {
    relRibbon: 'relRibbon',
    nodeArcHighlight: 'nodeArcHighlight',
    displayTextIcon: 'displayTextIcon'
}

const COLORS = {
    pathStroke: 'white',
    pathFill: '#A8A8A8',
    textFill: 'white'
}

export class RelationshipRibbon {
    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            canvasMath,
            canvasConfig
        } = properties;

        this.CONSTANTS = canvasConfig.getConstants();
        this.canvasMath = canvasMath;
    }

    removeRelRibbon (properties) {
        var { relSvgEl } = properties;
        if (relSvgEl) {
            d3.select(relSvgEl).selectAll("." + CLASSES.relRibbon)
                .data([])
                .exit()
                .remove();
        }
    }
    
    isRelRibbonDisplayed (relSvgEl) {
        var ribbonGroups = d3.select(relSvgEl).selectAll("." + CLASSES.relRibbon);
        return (ribbonGroups.size() > 0) ? true : false;
    }
    
    drawRelRibbon (properties) {
    
        var { graphCanvas,
            actionDefinitions, 
            relSvgEl, 
            displayRelationship, 
            d3Mouse 
        } = properties;
    
        var actionKeys = Object.keys(actionDefinitions);
        var ribbonGroups = d3.select(relSvgEl).selectAll("." + CLASSES.relRibbon)
            .data(() => {
                var myData = [];
                actionKeys.map((actionKey, i) => {
                    myData.push({
                        id: displayRelationship.key + '_ribbon_' + i,
                        action: actionKey,
                        actionObject: actionDefinitions[actionKey],
                        actionDefinitions: actionDefinitions,
                        displayRelationship: displayRelationship
                    })
                });
                return myData;
            })
            .enter()
            .append('g')
            .attr('class', CLASSES.relRibbon)
            .attr("transform", (ribbonData, index) => {
                var point = this.canvasMath.getRibbonPoint(ribbonData);
                ////console.log('ribbon button index: ' + index);
                var x = point.x + (index * this.CONSTANTS.REL_RIBBON_BUTTON_WIDTH);
                if (d3Mouse && d3Mouse.y >= point.y && d3Mouse.y <= point.y + this.CONSTANTS.REL_RIBBON_BUTTON_HEIGHT) {
                    // move it away from the click area
                    point.y = d3Mouse.y + 10;
                }
                ////console.log("d3Mouse.y: " + d3Mouse.y);
                ////console.log("point.y: " + point.y);
                ////console.log('x: ' + x);
                var translate = "translate(" + x + "," + point.y + ")";
                ////console.log('translate: ' + translate);
                return translate;
            })
            .on('click', (event, ribbonData) => {
                ribbonData.actionObject.onClick({ 
                    graphCanvas: graphCanvas,
                    displayRelationship: ribbonData.displayRelationship, 
                    ribbonSvgEl: event.currentTarget, 
                    relationshipSvgEl: relSvgEl
                });
                event.stopPropagation();
            });
    
        ribbonGroups.append("title").text((ribbonData) => ribbonData.actionObject.tooltip);
    
        ribbonGroups.append("rect")
                .attr('id', (ribbonData) => ribbonData.id)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.CONSTANTS.REL_RIBBON_BUTTON_WIDTH)
                .attr("height", this.CONSTANTS.REL_RIBBON_BUTTON_HEIGHT)
                .on('mouseover', (event, ribbonData) => {
                    d3.select('#' + ribbonData.id).classed(CLASSES.nodeArcHighlight, true);
                })
                .on('mouseout', (event, ribbonData) => {
                    d3.select('#' + ribbonData.id).classed(CLASSES.nodeArcHighlight, false);
                })
                .style("stroke", COLORS.pathStroke)
                .style("fill", COLORS.pathFill)
    
        ribbonGroups.append('text')
            .attr("class", CLASSES.displayTextIcon + " fa")
            .attr("x", 12)
            .attr("y", 12)
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "central")
            .attr('font-family', 'FontAwesome')
            .attr("font-size", '1em')
            .style("fill", COLORS.textFill)
            .text((ribbonData) => ribbonData.actionObject.iconUnicode);
    }
    
}

