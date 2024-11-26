import * as d3 from "d3";

export const ORIENTATION = {
    RIGHT: 'right',
    LEFT: 'left',
    TOP: 'top',
    BOTTOM: 'bottom',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    CENTER: 'center'    // for relationships
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
    'grip-vertical': '\uf58e',
    'check-circle' : '\uf058',
    'exclamation-triangle': '\uf071'
}

var iconBackgroundSettings = {
    'exclamation-triangle': {
        rx: 3,
        ry: 3,
        width: 8,
        height: 16,
        transform: "translate(6,-4)"
    },
    'check-circle': {
        rx: 3,
        ry: 3,
        width: 12,
        height: 12,
        transform: "translate(4,-4)"
    }
}

var em;
var lineHeight = 1.2;   // ems
var textFontSize = 14;  // pixels
var iconFontSize = 18;  // pixels
var leftMargin = 8;
var iconLeftMargin = 0;
var rightMargin = 8;   // pixels
var yMargin = 2;       // pixels
var yMarginText = 15;       // pixels
var yMarginIcon = 11;       // pixels
var iconWidth = 16;
var iconHeight = 16;

export const GLYPH_CONSTANTS = {
    X_MARGIN_MULTIPLIER: 2.5,
    Y_MARGIN_MULTIPLIER: 1
}

export class GraphCanvasGlyph {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            textDimensionHelperDomId,
            pixelEmHelperDomId
        } = properties;

        this.textDimensionHelperDomId = textDimensionHelperDomId;
        this.pixelEmHelperDomId = pixelEmHelperDomId;
    }

    updateGlyphPosition = (svgElement, x, y, offsetX, offsetY, orientation) => {
        //console.log('updating glyph position: ', x, y);
        var data = d3.select(svgElement).selectAll(`.glyph-${orientation}`).data();
        var datum = (data.length) ? data[0] : {};
        //console.log('datum: ', datum);

        d3.select(svgElement).selectAll(`.glyph-${orientation}`)
            .data(() => {
                return [{
                    ...datum,
                    x: x,
                    y: y,
                    offsetX: offsetX,
                    offsetY: offsetY
                }]
            })
            .attr("transform", (d) => {
                //console.log('transform d: ', d);
                var translation = this.getTranslation(d);
                //console.log('translation: ', translation);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            })
    }

    getIconBackgroundSettings = (icon) => (icon) ? iconBackgroundSettings[icon] || {} : {};
    getText = (text, icon) => (icon) ? fontAwesomeUnicodeIconMap[icon] : text;
    getTextFont = (icon) => (icon) ? 'FontAwesome' : 'Roboto, sans-serif';
    getTextClass = (icon, orientation) => {
        var textClass = `glyph-${orientation}-text`;
        textClass = (icon) ? `${textClass} fa`: textClass;
        return textClass;
    }
    getRectRadius = (icon) => (icon) ? "15" : "5";
    getLeftMargin = (icon) => (icon) ? iconLeftMargin : leftMargin;
    getYMarginText = (icon) => (icon) ? yMarginIcon : yMarginText;

    updateGlyphText = (svgElement, glyph) => {

        const { text, color, textColor, icon, orientation } = glyph;
        var textDimensions = this.getTextDimensions(text, lineHeight);
        var width = (icon) 
            ? iconWidth
            : textDimensions.width + (this.getLeftMargin(icon) + rightMargin)/2 * GLYPH_CONSTANTS.X_MARGIN_MULTIPLIER;
        var height = (icon)
            ? iconHeight
            : textDimensions.height + yMargin;

        //console.log("updateGlyphText height: ", height);            

        var data = d3.select(svgElement).selectAll(`.glyph-${orientation}`).data();
        var datum = (data.length) ? data[0] : {};
        //console.log('annotation text changed');
        var glyph = d3.select(svgElement).selectAll(`.glyph-${orientation}`);

        glyph
            .data((d) => {
                return [{
                    ...datum,
                    text: text,
                    textColor: textColor,
                    icon: icon,
                    fitToWidth: width,
                    width: width,
                    height: height
                }]
            });

        glyph.select(`.glyph-${orientation}-text`)
            .style("fill", textColor)
            .text(this.getText(text, icon))

        var backgroundSettings = this.getIconBackgroundSettings(icon);
        width = backgroundSettings.width || width;
        height = backgroundSettings.height || height;
        var rectRadius = this.getRectRadius(icon);
        var rx = backgroundSettings.rx || rectRadius;
        var ry = backgroundSettings.ry || rectRadius;

        var backgroundRect = glyph.selectAll(`.glyph-${orientation}-rect`)
            // must also call data on child because d3 must auto-copy parent data to children on create and not update it
            .data(() => {
                return [{
                    ...datum,
                    text: text,
                    textColor: textColor,
                    icon: icon,
                    width: width,
                    height: height
                }]
            })
            .style("fill", color)
            .attr("rx", rx)
            .attr("ry", ry)
            .attr("width", width)
            .attr("height", height)

        if (backgroundSettings.transform) {
            backgroundRect.attr("transform", backgroundSettings.transform);
        }

        glyph
            .attr("transform", (d) => {
                var translation = this.getTranslation(d);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            })
    }

    getTranslation = (d) => {
        var tx = d.x, ty = d.y;
        // depending on orientation - shift point right, left, up, down
        switch (d.orientation) {
            case ORIENTATION.RIGHT:
                tx += d.offsetX;
                ty += -d.height / 2;
                break;
            case ORIENTATION.LEFT:
                tx += - d.width - d.offsetX;
                ty += -d.height / 2;
                break;
            case ORIENTATION.TOP:
                tx += -d.width / 2;
                ty += - d.height - d.offsetY;
                break;
            case ORIENTATION.BOTTOM:
                tx += -d.width / 2;
                ty += d.offsetY;
                break;
            case ORIENTATION.BOTTOM_LEFT:
                tx += - d.width - (Math.cos(Math.PI/4) * d.offsetX);
                ty += -d.height / 2 + (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.BOTTOM_RIGHT:
                tx += (Math.cos(Math.PI/4) * d.offsetX);
                //console.log('d.height: ', d.height);
                //console.log('d.offsetY: ', d.offsetY);
                ty += -d.height / 2 + (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.TOP_LEFT:
                tx += - d.width - (Math.cos(Math.PI/4) * d.offsetX);
                ty += - d.height / 2 - (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.TOP_RIGHT:
                tx += (Math.cos(Math.PI/4) * d.offsetX);
                ty += - d.height / 2 - (Math.sin(Math.PI/4) * d.offsetY);
                break;
            case ORIENTATION.CENTER:
                // no adjustments
                break;
        }
        return {
            tx: tx,
            ty: ty
        }
    }

    removeGlyph = (svgElement, dataModelElement, orientation) => {
        if (dataModelElement) {
            const glyphProperty = this.getGlyphProperty(orientation);
            delete dataModelElement[glyphProperty];
            if (this.getGlyphs(dataModelElement).length === 0) {
                delete dataModelElement.hasGlyphs;
            }
        }

        if (svgElement) {
            d3.select(svgElement).selectAll(`.glyph-${orientation}`)
                .data([])
                .exit()
                .remove();
        }
    }

    hasGlyph = (dataModelElement, orientation) => {
        const glyphProperty = this.getGlyphProperty(orientation);
        return (dataModelElement[glyphProperty]) ? true : false;
    }

    hasAnyGlyphs = (dataModelElement) => (dataModelElement.hasGlyphs === true);

    getGlyphs = (dataModelElement) => {
        var whichGlyphs = [];
        Object.values(ORIENTATION).map(x => {
            const prop = this.getGlyphProperty(x);
            if (dataModelElement[prop] && !whichGlyphs.includes(x)) {
                whichGlyphs.push(x);
            }
        })
        return whichGlyphs;
    }

    getGlyphProperty = (orientation) => {
        const camelCaseOrientation = orientation
            .split('-')
            .reduce((str,token) => 
                str += token.substring(0,1).toUpperCase() + token.substring(1) 
            , '')

        return `hasGlyph${camelCaseOrientation}`;
    }

    addGlyph = (properties) => {
        var { 
            svgElement, 
            dataModelElement, 
            x, 
            y, 
            offsetX, 
            offsetY, 
            text, 
            color,
            textColor,
            icon,
            orientation
        } = properties;

        var textDimensions = this.getTextDimensions(text, lineHeight)
        var width = (icon) 
            ? iconWidth
            : textDimensions.width + (this.getLeftMargin(icon) + rightMargin)/2 * GLYPH_CONSTANTS.X_MARGIN_MULTIPLIER;
        var height = (icon)
            ? iconHeight
            : textDimensions.height + yMargin;

        //console.log("addGlyph height: ", height);            

        var glyph = d3.select(svgElement).selectAll(`.glyph-${orientation}`)
            .data(() => {
                return [{
                    x: x,
                    y: y,
                    color: color,
                    text: text,
                    textColor: textColor,
                    icon: icon,
                    fitToWidth: width,
                    textAnchor: 'start',
                    width: width,
                    height: height,
                    textMargin: (this.getLeftMargin(icon) + rightMargin) / 2,
                    leftMargin: this.getLeftMargin(icon),
                    rightMargin: rightMargin,
                    yMargin: yMargin,
                    yMarginText: this.getYMarginText(icon),
                    orientation: orientation,
                    offsetX: offsetX,
                    offsetY: offsetY
                }]
            })
            .enter()
            .append("g")
            .attr("class", `glyph-${orientation}`)
            .attr("transform", (d) => {
                var translation = this.getTranslation(d);
                //console.log('addGlyph: translation.ty: ' + translation.ty);
                return "translate(" + translation.tx + "," + translation.ty + ")"
            });

        const glyphProperty = this.getGlyphProperty(orientation);
        dataModelElement[glyphProperty] = true;
        dataModelElement.hasGlyphs = true;

        var backgroundSettings = this.getIconBackgroundSettings(icon);
        width = backgroundSettings.width || width;
        height = backgroundSettings.height || height;
        var rectRadius = this.getRectRadius(icon);
        var rx = backgroundSettings.rx || rectRadius;
        var ry = backgroundSettings.ry || rectRadius;

        var backgroundRect = glyph.append("rect")
            .attr("class", `glyph-${orientation}-rect`)
            .style("fill", color)
            //.style("stroke", "black")
            //.attr("stroke-width", 1)
            .attr("rx", rx)
            .attr("ry", ry)
            .attr("width", width)
            .attr("height", height);

        if (backgroundSettings.transform) {
            backgroundRect.attr("transform", backgroundSettings.transform);
        }

        glyph.append("text")
            .attr("class", this.getTextClass(icon, orientation))
            .attr("x", (d) => d.leftMargin)
            .attr("y", (d) => d.yMarginText)
            .attr("pointer-events", "none")
            //.attr("text-anchor", "middle")
            //.attr("alignment-baseline", "central")
            //.attr("font-family", "sans-serif")
            .attr("font-family", this.getTextFont(icon))
            .attr("font-size", (icon) ? iconFontSize : textFontSize)
            .style("fill", textColor)
            .text(this.getText(text, icon))
    }

    getTextDimensions = (text, lineHeight) => {
        var tspan = d3.select(`#${this.textDimensionHelperDomId}`);

        tspan.text(text);
        var width = tspan.node().getComputedTextLength();
        var height = lineHeight * this.getPixelsPerEm();
        tspan.text('');

        //console.log('getTextDimensions: height: ', height);
        return {
            width: width,
            height: height
        }
    }

    getPixelsPerEm = () => {
        if (!em) {
            var div = document.getElementById(this.pixelEmHelperDomId);
            div.style.height = "1em";
            em = (div.offsetHeight) ? div.offsetHeight : 16;
            //console.log('getPixelsPerEm after calculation: ', em)
        }
        //console.log('getPixelsPerEm: ', em)
        return em;
    }
}
