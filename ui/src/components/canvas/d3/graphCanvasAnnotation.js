import * as d3 from "d3";
import { CONSTANTS, TextWrapHelper } from "./textWrapHelper";

export const ORIENTATION = {
    RIGHT: 'right',
    LEFT: 'left',
    TOP: 'top',
    BOTTOM: 'bottom',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right'
}

export const POINTERS = {
    TOP_LEFT_POINTER: 'top-left-pointer',
    TOP_RIGHT_POINTER: 'top-right-pointer',
    BOTTOM_LEFT_POINTER: 'bottom-left-pointer',
    BOTTOM_RIGHT_POINTER: 'bottom-right-pointer'
}

var fontAwesomeUnicodeIconMap = {
    'expand': '\uf065',
    'lock': '\uf023',
    'trash': '\uf1f8',
    'reverse': '\uf337',
    'comment': '\uf075',
    'thlist': '\uf00b',
    'key': '\uf084',
    'asterisk': '\uf069',
    'grip-vertical': '\uf58e'
}

var em;
var lineHeight = 1.5;   // ems
var textFontSize = 14;  // pixels
var leftMargin = 10;
var rightMargin = 14;   // pixels
var yMargin = 10;       // pixels
var pointerSize = 8;    // pixels
var maxWidth = 350;     // pixels

export const ANNOTATION_CONSTANTS = {
    X_MARGIN_MULTIPLIER: 3,
    Y_MARGIN_MULTIPLIER: 2.5
}

export class GraphCanvasAnnotation {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            textDimensionHelperDomId,
            pixelEmHelperDomId
        } = properties;

        this.textWrapHelper = new TextWrapHelper({
            graphCanvasAnnotation: this
        });
        this.textDimensionHelperDomId = textDimensionHelperDomId;
        this.pixelEmHelperDomId = pixelEmHelperDomId;
    }

    /*
    getRoundedCorner = (x1, y1, x2, y2, radius, corner) => {
        var lineGenerator = d3.line();
        lineGenerator.curve(d3.curveNatural);
        var controlX = 0;
        var controlY = 0;

        switch (corner) {
            case ORIENTATION.BOTTOM_LEFT:
                controlX = x1 + radius;
                controlY = y2 - radius;
                break;
            case ORIENTATION.BOTTOM_RIGHT:
                controlX = x2 - radius;
                controlY = y1 - radius;
                break;
            case ORIENTATION.TOP_LEFT:
                controlX = x1 + radius;
                controlY = y2 + radius;
                break;
            case ORIENTATION.TOP_RIGHT:
                controlX = x2 - radius;
                controlY = y1 + radius;
                break;
        }
        var lineString = lineGenerator([[x1, y1], [controlX, controlY], [x2, y2]]);
        return lineString;
    }
    */

    getCorner = (x1, y1, x2, y2, params) => {
        var lineGenerator = d3.line();
        var lineString;
        var corner = params.corner;
        var controlX = 0;
        var controlY = 0;

        if (corner.match(/pointer$/)) {
            var points = [];
            var pointerSize = params.pointerSize;
            //console.log('draw pointer');
            pointerSize = pointerSize / 2;
            points.push([x1,y1]);
            switch (corner) {
                case POINTERS.TOP_RIGHT_POINTER:
                    points.push([x1+pointerSize,y1]);
                    points.push([x2+pointerSize,y1-pointerSize]);
                    points.push([x2,y2-pointerSize]);
                    break;
                case POINTERS.BOTTOM_RIGHT_POINTER:
                    points.push([x1,y1+pointerSize]);
                    points.push([x1+pointerSize,y2+pointerSize]);
                    points.push([x2+pointerSize,y2]);
                    break;
                case POINTERS.BOTTOM_LEFT_POINTER:
                    points.push([x1-pointerSize,y1]);
                    points.push([x2-pointerSize,y1+pointerSize]);
                    points.push([x2,y2+pointerSize]);
                    break;
                case POINTERS.TOP_LEFT_POINTER:
                    points.push([x1,y1-pointerSize]);
                    points.push([x1-pointerSize,y2-pointerSize]);
                    points.push([x2-pointerSize,y2]);
                    break;
            }
            points.push([x2,y2]);
            lineString = lineGenerator(points);
        } else {
            //console.log('draw curve');
            var radius = params.radius;
            lineGenerator.curve(d3.curveNatural);
            switch (corner) {
                case ORIENTATION.BOTTOM_LEFT:
                    controlX = x2 + radius;
                    controlY = y1 - radius;
                    break;
                case ORIENTATION.BOTTOM_RIGHT:
                    controlX = x1 - radius;
                    controlY = y2 - radius;
                    break;
                case ORIENTATION.TOP_LEFT:
                    controlX = x1 + radius;
                    controlY = y2 + radius;
                    break;
                case ORIENTATION.TOP_RIGHT:
                    controlX = x2 - radius;
                    controlY = y1 + radius;
                    break;
            }
            lineString = lineGenerator([[x1, y1], [controlX, controlY], [x2, y2]]);
        }
        return lineString;
    }

    updateAnnotationPosition = (svgElement, x, y, offsetX, offsetY, orientation) => {
        var data = d3.select(svgElement).selectAll('.annotation').data();
        var datum = (data.length) ? data[0] : {};

        var newOrientation = (orientation) ? orientation : datum.orientation;
        var orientationChanged = (datum.orientation !== newOrientation);

        var annotation = d3.select(svgElement).selectAll(".annotation")
            .data(() => {
                return [{
                    ...datum,
                    x: x,
                    y: y,
                    //orientation: (orientation) ? orientation : datum.orientation
                    orientation: newOrientation,
                    offsetX: offsetX,
                    offsetY: offsetY
                }]
            })
            .attr("transform", (d) => {
                var translation = this.getTranslation(d);
                //console.log('updateAnnotationPosition: translation.ty: ' + translation.ty);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            })

        if (orientationChanged) {
            /*
            console.log("orientationChanged: redrawing bubble");
            console.log("orientation: " + orientation + ", datum.orientation: " + datum.orientation);
            console.log(annotation.data());
            console.log(annotation.selectAll(".annotationBubble").data());
            */
            annotation.selectAll(".annotationBubble")
                // must also call data on child because d3 must auto-copy parent data to children on create and not update it
                .data(() => {
                    return [{
                        ...datum,
                        x: x,
                        y: y,
                        //orientation: (orientation) ? orientation : datum.orientation
                        orientation: newOrientation
                    }]
                })
                .attr("d", (d) => this.getBubbleShape(d));
        }
    }

    updateAnnotationText = (svgElement, text, coloredTextBlocks) => {

        if (!coloredTextBlocks) {
            coloredTextBlocks = this.convertTextToColoredTextBlocks(text);
        }

        var textDimensions = this.getColoredTextDimensions(coloredTextBlocks, lineHeight);
        var width = textDimensions.width + (leftMargin + rightMargin)/2 * ANNOTATION_CONSTANTS.X_MARGIN_MULTIPLIER;
        var height = textDimensions.height + yMargin;
        /*
        var textDimensions = this.getTextDimensions(text, lineHeight)
        var width = textDimensions.width + margin * 2;
        var height = textDimensions.height + margin * 2;
        */

        //TODO: update height and width, then update position based on new height and width
        var data = d3.select(svgElement).selectAll('.annotation').data();
        var datum = (data.length) ? data[0] : {};
        //console.log('annotation text changed');
        var annotation = d3.select(svgElement).selectAll(".annotation");

        annotation
            .data((d) => {
                return [{
                    ...datum,
                    text: text,
                    fitToWidth: width,
                    getColoredTextBlocks: () => coloredTextBlocks,
                    width: width,
                    height: height
                }]
            });

        annotation
            .selectAll('.annotationText')
            //.text(text)
            .call((text) => {
                this.wrap(text, lineHeight);
                //this.textWrapHelper.wrapColoredText(text);
            });

        annotation.selectAll(".annotationBubble")
            // must also call data on child because d3 must auto-copy parent data to children on create and not update it
            .data(() => {
                //console.log("annotation bubble data updated");
                return [{
                    ...datum,
                    text: text,
                    width: width,
                    height: height
                }]
            })
            .attr("d", (d) => {
                //console.log("updating annotation bubble shape");
                return this.getBubbleShape(d);
            })

        annotation
            .attr("transform", (d) => {
                var translation = this.getTranslation(d);
                //console.log('updateAnnotationText: translation.ty: ' + translation.ty);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            })
    }

    getTranslation = (d) => {
        var tx = d.x, ty = d.y;
        // depending on orientation - shift point right, left, up, down
        switch (d.orientation) {
            case ORIENTATION.RIGHT:
                tx += d.pointerSize + d.offsetX;
                ty += -d.height / 2;
                break;
            case ORIENTATION.LEFT:
                tx += -d.pointerSize - d.width - d.offsetX;
                ty += -d.height / 2;
                break;
            case ORIENTATION.TOP:
                tx += -d.width / 2;
                ty += -d.pointerSize - d.height - d.offsetY;
                break;
            case ORIENTATION.BOTTOM:
                tx += -d.width / 2;
                ty += d.pointerSize + d.offsetY;
                break;
            case ORIENTATION.BOTTOM_LEFT:
                tx +=  -d.pointerSize/2 - d.width - (Math.cos(Math.PI/4) * d.offsetX);
                ty += d.pointerSize/2 + (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.BOTTOM_RIGHT:
                tx += d.pointerSize/2 + (Math.cos(Math.PI/4) * d.offsetX);
                ty += d.pointerSize/2 + (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.TOP_LEFT:
                tx += -d.pointerSize/2 - d.width - (Math.cos(Math.PI/4) * d.offsetX);
                ty += -d.pointerSize/2 - d.height - (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.TOP_RIGHT:
                tx += d.pointerSize/2 + (Math.cos(Math.PI/4) * d.offsetX);
                ty += -d.pointerSize/2 - d.height - (Math.sin(Math.PI/4) * d.offsetY);
                break;
        }
        return {
            tx: tx,
            ty: ty
        }
    }

    removeAnnotation = (svgElement, dataModelElement) => {
        if (dataModelElement) {
            delete dataModelElement.hasAnnotation;
        }

        if (svgElement) {
            d3.select(svgElement).selectAll(".annotation")
                .data([])
                .exit()
                .remove();
        }
    }

    getBubbleShape = (d) => {
        //console.log("getBubbleShape: orientation: " + d.orientation);
        var cornerSize = 10;
        var cornerRadius = 2;

        var lineGenerator = d3.line();

        // compute 4 points for general rectangle
        var left = 0, top = 0;
        var rectPoints = [[left,top],[left+d.width,top],[left+d.width,top+d.height],[left,top+d.height]];

        // compute 8 points to handle curved corners
        var curvedRectPoints = [];
        var corners = [];
        var firstPoint, lastPoint, corner, cornerParams;
        for (var i = 0; i < rectPoints.length; i++) {
            var point = rectPoints[i], xOffset = 0, yOffset = 0;
            if (i === 0) { xOffset += cornerSize; }
            if (i === 1) {
                yOffset += cornerSize;
                corner = (d.orientation === ORIENTATION.BOTTOM_LEFT) ? POINTERS.TOP_RIGHT_POINTER : ORIENTATION.TOP_RIGHT;
            }
            if (i === 2) {
                xOffset += -cornerSize;
                corner = (d.orientation === ORIENTATION.TOP_LEFT) ? POINTERS.BOTTOM_RIGHT_POINTER : ORIENTATION.BOTTOM_RIGHT;
            }
            if (i === 3) {
                yOffset += -cornerSize;
                corner = (d.orientation === ORIENTATION.TOP_RIGHT) ? POINTERS.BOTTOM_LEFT_POINTER : ORIENTATION.BOTTOM_LEFT;
            }
            var newPoint = [point[0]+xOffset,point[1]+yOffset];
            curvedRectPoints.push(newPoint);

            if (lastPoint) {
                //console.log('corner: ' + corner);
                cornerParams = { corner: corner, radius: cornerRadius, pointerSize: pointerSize };
                corners.push(this.getCorner(lastPoint[0], lastPoint[1], newPoint[0], newPoint[1], cornerParams));
            }
            if (!firstPoint) { firstPoint = newPoint; }

            var nextPointIndex = ((i+1) === rectPoints.length) ? 0 : i+1;
            point = rectPoints[nextPointIndex]; xOffset = 0; yOffset = 0;
            if (i === 0) { xOffset += -cornerSize; }
            if (i === 1) { yOffset += -cornerSize; }
            if (i === 2) { xOffset += cornerSize; }
            if (i === 3) { yOffset += cornerSize; }
            newPoint = [point[0]+xOffset,point[1]+yOffset];
            curvedRectPoints.push(newPoint);
            lastPoint = newPoint;
        }
        corner = (d.orientation === ORIENTATION.BOTTOM_RIGHT) ? POINTERS.TOP_LEFT_POINTER : ORIENTATION.TOP_LEFT;
        //console.log('corner: ' + corner);
        cornerParams = { corner: corner, radius: cornerRadius, pointerSize: pointerSize };
        corners.push(this.getCorner(lastPoint[0], lastPoint[1], firstPoint[0], firstPoint[1], cornerParams));

        // depending on orientation - split line and add triangle
        var insertPointIndex;
        switch (d.orientation) {
            case ORIENTATION.BOTTOM:
                // split the top segment
                insertPointIndex = 0;
                break;
            case ORIENTATION.LEFT:
                // split the right segment
                insertPointIndex = 2;
                break;
            case ORIENTATION.TOP:
                // split the bottom segment
                insertPointIndex = 4;
                break;
            case ORIENTATION.RIGHT:
                // split the left segment
                insertPointIndex = 6;
                break;
        }

        var tempShapeArray = [];
        if (insertPointIndex === undefined) {
            for (i = 0; i < curvedRectPoints.length; i+=2) {
                tempShapeArray.push(lineGenerator([curvedRectPoints[i],curvedRectPoints[i+1]]));
            }
        } else {
            var splitPoints = curvedRectPoints.splice(insertPointIndex, 2);
            var newPoints = this.splitSegment(splitPoints[0][0],
                                        splitPoints[0][1],
                                        splitPoints[1][0],
                                        splitPoints[1][1],
                                        d.pointerSize, d.orientation);
            for (i = 0; i < curvedRectPoints.length; i+=2) {
                tempShapeArray.push(lineGenerator([curvedRectPoints[i],curvedRectPoints[i+1]]));
            }
            tempShapeArray.splice(insertPointIndex/2, 0, lineGenerator(newPoints));
        }

        var finalShapeArray = [];

        const moveRegex = new RegExp('^M[+-]?\\d+(\\.\\d+)?,[+-]?\\d+(\\.\\d+)?');
        var finalShapeArray = [];
        for (i = 0; i < tempShapeArray.length; i++) {
            var shape = (i === 0) ? tempShapeArray[i] : tempShapeArray[i].replace(moveRegex, '');
            shape = shape.replace(/,$/,'');
            var corner = corners[i].replace(moveRegex, '');
            corner = corner.replace(/,$/,'');

            //console.log('tempShape ' + i + ': ' + shape);
            finalShapeArray.push(shape);
            //console.log('corner ' + i + ': ' + corner);
            finalShapeArray.push(corner);
        }

        // now generate the shape
        var finalShape = finalShapeArray.join(' ') + 'Z';
        //console.log(finalShape);
        return finalShape;
    }

    getColoredTextDimensions = (coloredTextBlocks, lineHeight) => {

        var text = coloredTextBlocks.map(block => block.text).join(' ');
        var textLines = [];
        var textLineOffsets = [];
        var currentLinePhrases = [];

        var runningHeightMargin = 0;
        var maxMarginTopForLine = 0;
        var maxMarginBottomForLine = 0;

        coloredTextBlocks.map(block => {
            var marginTop = (block.marginTop) ? block.marginTop : 0;
            var marginBottom = (block.marginBottom) ? block.marginBottom : 0;
            maxMarginTopForLine = (marginTop > maxMarginTopForLine) ? marginTop : maxMarginTopForLine;
            maxMarginBottomForLine = (marginBottom > maxMarginBottomForLine) ? marginBottom : maxMarginBottomForLine;

            if (block.newline) {
                textLines.push(currentLinePhrases.join(' '));
                textLineOffsets.push(currentLinePhrases.length * CONSTANTS.TSPAN_PHRASE_SPACING_PX);
                //console.log('textLineOffset push: ' + currentLinePhrases.length * CONSTANTS.TSPAN_PHRASE_SPACING_PX);
                currentLinePhrases = [];

                runningHeightMargin += (maxMarginTopForLine + maxMarginBottomForLine);
                maxMarginTopForLine = 0;
                maxMarginBottomForLine = 0;
            }
            currentLinePhrases.push(block.text);
        });
        if (currentLinePhrases.length > 0) {
            textLines.push(currentLinePhrases.join(' '));
            textLineOffsets.push(currentLinePhrases.length * CONSTANTS.TSPAN_PHRASE_SPACING_PX);

            runningHeightMargin += (maxMarginTopForLine + maxMarginBottomForLine);
        }

        var anyKey = this.primaryKeyPresent(text);
        var tspan = d3.select(`#${this.textDimensionHelperDomId}`);

        var width = 0;
        var height = 0;
        var emPixels = this.getPixelsPerEm();
        var keyWidth = (anyKey) ? emPixels : 0;

        textLines.forEach((textLine, i) => {
            tspan.text(textLine);
            var textWidth = tspan.node().getComputedTextLength() + textLineOffsets[i];
            //console.log(`textLineOffset[${i}]: ${textLineOffsets[i]}`);
            width = (textWidth > width) ? textWidth : width;
            var numLines = Math.floor(textWidth/maxWidth) + 1;
            height += (lineHeight * emPixels) * numLines;
        });
        tspan.text('');

        var fullWidth = width + keyWidth;
        fullWidth = (fullWidth < maxWidth) ? fullWidth : maxWidth;

        return {
            width: fullWidth,
            height: height + runningHeightMargin
        }
    }

    getTextDimensions = (text, lineHeight) => {

        var anyKey = this.primaryKeyPresent(text);
        var textLines = text.split(/\n/);
        var tspan = d3.select(`#${this.textDimensionHelperDomId}`);

        var width = 0;
        var height = 0;
        var emPixels = this.getPixelsPerEm();
        var keyWidth = (anyKey) ? emPixels : 0;

        textLines.forEach((textLine, i) => {
            tspan.text(textLine);
            var textWidth = tspan.node().getComputedTextLength();
            width = (textWidth > width) ? textWidth : width;
            height += lineHeight * emPixels;
        });
        tspan.text('');

        return {
            width: width + keyWidth,
            height: height
        }
    }

    getPixelsPerEm = () => {
        if (!em) {
            var div = document.getElementById(this.pixelEmHelperDomId);
            div.style.height = "1em";
            em = (div.offsetHeight) ? div.offsetHeight : 16;
        }
        return em;
    }

    hasAnnotation = (dataModelElement) => {
        return (dataModelElement.hasAnnotation) ? true : false;
        //return (d3.select(svgElement).selectAll(".annotation").size() > 0);
    }

    convertTextToColoredTextBlocks = (text) => {
        var coloredTextBlocks = [];
        var tokens = text.split('\n');
        var lines = tokens.slice(1);

        coloredTextBlocks.push({
            text: tokens[0], 
            textColor: 'black', 
            backgroundColor: 'white', 
            strokeColor: 'white',
            alwaysKeepSeparate: false
        });
        lines.map(line => coloredTextBlocks.push({
            text: line, 
            newline: true, 
            textColor: 'black', 
            backgroundColor: 'white',
            strokeColor: 'white',
            alwaysKeepSeparate: false
        }));            
        return coloredTextBlocks;
    }

    annotationCount = 0;
    addAnnotation = (properties) => {
        var { 
            svgElement, 
            dataModelElement, 
            x, 
            y, 
            offsetX, 
            offsetY, 
            text, 
            coloredTextBlocks,
            orientation
        } = properties;

        if (!coloredTextBlocks) {
            coloredTextBlocks = this.convertTextToColoredTextBlocks(text);
        }
        
        /*
        var coloredTextBlocks = [
            {text: text, textColor: 'white', backgroundColor: 'blue'},
            {text: 'Some more', textColor: 'green', backgroundColor: 'white'}
        ]          
        this.annotationCount++;
        if (this.annotationCount === 2) {
            coloredTextBlocks.push({text: 'text', newline: true, textColor: 'white', backgroundColor: 'green'})
        }
        if (this.annotationCount === 3) {
            coloredTextBlocks.push({text: 'text', newline: true, textColor: 'white', backgroundColor: 'green'});
            coloredTextBlocks.push({text: 'more text', newline: true, textColor: 'white', backgroundColor: 'orange'})
        }*/
        

        var textDimensions = this.getColoredTextDimensions(coloredTextBlocks, lineHeight)
        var width = textDimensions.width + (leftMargin + rightMargin)/2 * ANNOTATION_CONSTANTS.X_MARGIN_MULTIPLIER;
        var height = textDimensions.height + yMargin;

        var annotation = d3.select(svgElement).selectAll(".annotation")
            .data(() => {
                return [{
                    x: x,
                    y: y,
                    text: text,
                    pointerSize: pointerSize,
                    fitToWidth: width,
                    textAnchor: 'start',
                    getColoredTextBlocks: () => coloredTextBlocks,
                    width: width,
                    height: height,
                    textMargin: (leftMargin + rightMargin) / 2,
                    leftMargin: leftMargin,
                    rightMargin: rightMargin,
                    yMargin: yMargin,
                    orientation: orientation,
                    offsetX: offsetX,
                    offsetY: offsetY
                }]
            })
            .enter()
            .append("g")
            .attr("class", "annotation")
            .attr("transform", (d) => {
                var translation = this.getTranslation(d);
                //console.log('addAnnotation: translation.ty: ' + translation.ty);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            });

        dataModelElement.hasAnnotation = true;

        annotation.append("path")
            .attr("class", "annotationBubble")
            .style("fill", "white")
            .style("stroke", "black")
            .attr("stroke-width", 2)
            .attr("d", (d) => this.getBubbleShape(d));

        annotation.append("g")
            .attr("class", "annotationColoredBackgroundRectangles")

        /*
        var backgroundRects = annotation.append("g")
            .attr("class", "annotationColoredBackgroundRectangles")

        backgroundRects.append("rect")
            .attr("x", (d) => d.textMargin)
            .attr("y", (d) => d.textMargin * 2.2)
            .attr("width", 80)
            .attr("height", 30)
            .attr("rx", 2)
            .style("fill", "yellow")
        */

        annotation.append("text")
            .attr("class", "annotationText")
            .attr("x", (d) => d.leftMargin)
            .attr("y", (d) => d.yMargin * ANNOTATION_CONSTANTS.Y_MARGIN_MULTIPLIER)
            .attr("pointer-events", "none")
            //.attr("text-anchor", "middle")
            //.attr("alignment-baseline", "central")
            //.attr("font-family", "sans-serif")
            .attr("font-family", "Roboto, sans-serif")
            .attr("font-size", textFontSize)
            .style("fill", "black")
            //.text(text)
            .call((text) => this.wrap(text, lineHeight));

    }

    primaryKeyPresent = (text) => {
        var textLines = text.split(/\n/);
        return textLines.some(x => x.match(/^\(\*\)/));
    }

    wrap = (text, lineHeight) => {
        this.textWrapHelper.wrapColoredText(text);
    }
    /*
    wrap = (text, lineHeight) => {
        text.each((d, i, nodes) => {
            var text = d3.select(nodes[i]);
                //words = text.text().split(/\s+/).reverse(),
            var textValue = text.text();
            var textLines = textValue.split(/\n/);
            var x = (text.attr("x")) ? parseFloat(text.attr("x")) : 0;
            var y = parseFloat(text.attr("y"));

            text.text(null);
            var dyVal = text.attr("dy");
            var dy = (dyVal) ? parseFloat(dyVal) : 0;
            var maxWidth = 0;

            text.selectAll("tspan").remove();

            var anyKey = this.primaryKeyPresent(textValue);
            var xOffset = (anyKey) ? this.getPixelsPerEm() / 2 : 0;
            var keyFontSize = 12;
            var keyMultiplier = textFontSize / keyFontSize;

            textLines.forEach((textLine, i) => {
                var isKey = textLine.match(/^\(\*\)/);
                if (isKey) {
                    //console.log(textLine + " is key");
                    textLine = textLine.replace(/^\(\*\)/, '');
                    var keySpan = text.append("tspan")
                    keySpan
                        .attr("class", "displayTextIcon fa")
                        .attr("x", x + 2)
                        .attr("y", y + 2)
                        .attr("dy", i * keyMultiplier*lineHeight + dy + "em")
                        .attr("pointer-events", "none")
                        .attr("text-anchor", "middle")
                        //.attr("alignment-baseline", "central")
                        .attr('font-family', 'FontAwesome')
                        .attr("font-size", keyFontSize)
                        .style("fill", (node) => 'gray')
                        .text(fontAwesomeUnicodeIconMap.key);
                }
                var offset = (anyKey) ?
                        (isKey) ? xOffset : xOffset + 5
                        : 0;
                var tspan = text.append("tspan")
                    .attr("x", x + offset)
                    .attr("text-anchor", "start")
                    .attr("y", y + 2)
                    .attr("dy", i * lineHeight + dy + "em")
                    .text(textLine);

                var textWidth = tspan.node().getComputedTextLength();
                maxWidth = (textWidth > maxWidth) ? textWidth : maxWidth;
            });
        });
    }
    */

    splitSegment = (x1, y1, x2, y2, pointerSize, orientation) => {
        //console.log('y1: ' + y1 + ', y2: ' + y2);
        var halfWidth = Math.abs(x1-x2) / 2;
        var halfHeight = Math.abs(y1-y2) / 2;
        var xOffset = (x1 === x2) ? pointerSize : 0;
        var yOffset = (y1 === y2) ? pointerSize : 0;
        xOffset = (orientation === ORIENTATION.RIGHT) ? -xOffset : xOffset;
        yOffset = (orientation === ORIENTATION.BOTTOM) ? -yOffset : yOffset;
        var xarray = [], yarray = [];
        if (x1 === x2) {
            xarray = [x1, x1, x1 + xOffset, x1, x1];
        } else if (x1 < x2) {
            xarray = [x1, x1 + halfWidth - pointerSize, x1 + halfWidth, x1 + halfWidth + pointerSize, x2];
        } else {
            xarray = [x1, x1 - halfWidth + pointerSize, x1 - halfWidth, x1 - halfWidth - pointerSize, x2];
        }

        if (y1 === y2) {
            yarray = [y1, y1, y1 + yOffset, y1, y1];
        } else if (y1 < y2) {
            yarray = [y1, y1 + halfHeight - pointerSize, y1 + halfHeight, y1 + halfHeight + pointerSize, y2];
        } else {
            yarray = [y1, y1 - halfHeight + pointerSize, y1 - halfHeight, y1 - halfHeight - pointerSize, y2];
        }

        var points = [];
        for (var i = 0; i < xarray.length; i++) {
            points.push([xarray[i],yarray[i]]);
        }
        return points;
    }

}
