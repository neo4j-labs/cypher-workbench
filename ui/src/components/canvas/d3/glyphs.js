import * as d3 from "d3";

export function upsertGlyphs () {
    var glyphs = d3.select(svgElement).selectAll(".glyphs")
        .data(function () {
            return [{
                x: x,
                y: y,
                text: text,
                pointerSize: pointerSize,
                width: width,
                height: height,
                textMargin: margin,
                orientation: orientation,
                offsetX: offsetX,
                offsetY: offsetY
            }]
        })
        .enter()
        .append("g")
        .attr("class", "annotation")
        .attr("transform", function(d) {
            var translation = getTranslation(d);
            //console.log('addAnnotation: translation.ty: ' + translation.ty);
            return "translate(" + translation.tx + "," + translation.ty + ")"
        });

        nodeGroups.selectAll(".dataGlyphText")
            .data(function (nodeLabel) {
                var myData = [];
                if (nodeLabel && nodeLabel.fromDataSources) {
                    for (var i = 0; i < nodeLabel.fromDataSources.length; i++) {
                        var dataSource = nodeLabel.fromDataSources[i];
                        myData.push({
                            nodeLabel: nodeLabel,
                            fromDataSource: dataSource,
                            index: i,
                            dataSourceNumber: (dataSourceColorMap[dataSource.key]) ? dataSourceColorMap[dataSource.key].dataSourceNumber : '-'
                        })
                    }
                }
                return myData;
            })
            .enter()

    // TODO: add two texts - one font-awesome icon, and then another overlay with a single character        
    //   we will have shape, color, and a character for a glyphs
    //   characters = A-Z, 0-9, specials too = about 68 choices * 20 colors * 5 shapes =
    //      6800 choices -
    //   need a glyph designer popup on key
    //   add a collapsible key/legend to the canvas
    //   add a user preference to 
    //      toggle: Show Node Labels glyphs
    //      toggle: Show Node Labels text concat with ':'
    //   -or-
    //   in annotation, we display the glyphs and/or full text        
/*
circle
star
square
play fa-rotate-90   (triangle)
heart
*/

    glyphs
        .append('text')
        .attr("class", "dataGlyphText")
        .attr("y", function (dsTuple) {
            var angle = (19 + dsTuple.index * 3)/16 * Math.PI;
            return dsTuple.nodeLabel.display.y + Math.sin(angle) * (dsTuple.nodeLabel.display.radius + DATA_SOURCE_GLYPH_OFFSET);
        })
        .attr("x", function (dsTuple) {
            var angle = (19 + dsTuple.index * 3)/16 * Math.PI;
            return dsTuple.nodeLabel.display.x + Math.cos(angle) * (dsTuple.nodeLabel.display.radius + DATA_SOURCE_GLYPH_OFFSET);
        })
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .attr("font-family", "sans-serif")
        .attr("font-size", function (dsTuple) { return dsTuple.nodeLabel.display.fontSize; })
        .style("fill", "black")
        .text(function (dsTuple) { return dsTuple.dataSourceNumber; });

    dataModelElement.hasAnnotation = true;

    annotation.append("path")
        .attr("class", "annotationBubble")
        .style("fill", "white")
        .style("stroke", "black")
        .attr("stroke-width", 2)
        .attr("d", function(d) { return getBubbleShape(d) });

    annotation.append("text")
        .attr("class", "annotationText")
        .attr("x", function(d) { return d.textMargin })
        .attr("y", function(d) { return d.textMargin * 2.2 })
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        //.attr("font-family", "sans-serif")
        .attr("font-family", "Roboto, sans-serif")
        .attr("font-size", textFontSize)
        .style("fill", "black")
        .text(text)
        .call(function (text) {
            wrap(text, lineHeight);
        });


}

export function hasGlyphs () {

}

export function removeGlyphs () {

}

export function updateGlyphsPosition () {

}


