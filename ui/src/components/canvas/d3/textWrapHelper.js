
import * as d3 from "d3";
import { ANNOTATION_CONSTANTS } from './graphCanvasAnnotation';
import { camelCaseToWordArray } from "../../../common/text/textUtil";

/* from https://bl.ocks.org/mbostock/7555321 */
/*
var averageCharWidthSet = false;
var averageCharWidth = 8;
var numCharsForAverage = 0;
var totalWidthForAverage = 0;
*/

// from https://stackoverflow.com/questions/49403285/splitting-word-into-syllables-in-javascript
const SYLLABLE_REGEX = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;

export const CONSTANTS = {
    DEFAULT_BACKGROUND_COLOR: 'white',
    DEFAULT_TEXT_COLOR: 'black',
    TSPAN_PHRASE_SPACING_PX: 10,
    DEFAULT_LINE_HEIGHT_EMS: 1.1,
    //DEFAULT_LINE_HEIGHT_EMS: 1.4,
    DEFAULT_LINE_SPACING_EMS: 0.35,
    //DEFAULT_LINE_SPACING_EMS: 0.0,
    DEFAULT_LINE_OFFSET_EMS: 0.34,
    DEFAULT_COLORED_LINE_OFFSET_EMS: 0.0,
    RECTANGLE_TEXT_MARGIN: 2,
    RECTANGLE_Y_NUDGE: -2,
    RECTANGLE_X_NUDGE: -2
}

export class TextWrapHelper {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            graphCanvasAnnotation
        } = properties;

        this.graphCanvasAnnotation = graphCanvasAnnotation;
    }

    wrap (textEl) {
        textEl.each((d, i, nodes) => {
            var text = d3.select(nodes[i]);
            var word, words, syllable, syllables;
            var line = [];
            var lineNumber = 0;
            var lineHeight = CONSTANTS.DEFAULT_LINE_HEIGHT_EMS;
            var x = (text.attr("x")) ? text.attr("x") : 0;
            var y = text.attr("y");

            var dataForNode = d3.select(nodes[i].parentNode).datum();
            var textToWrap = (dataForNode.getText) ? dataForNode.getText() : text.text();

            words = camelCaseToWordArray(textToWrap).reverse();
            text.selectAll("tspan").remove();   // get rid of existing tspans
            var wordsCopy = words.slice(0); // for syllable layout
            var dyVal = text.attr("dy");
            var dy = (dyVal) ? parseFloat(dyVal) : 0;
            var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
            var width = text.datum().radius * 2 - 8;

            var tspans = [tspan];

            var wordLargerThanWidth = false;
            word = words.pop();

            while (word) {
            line.push(word);
            tspan.text(line.join("").trim());
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join("").trim());
                // recheck width
                if (tspan.node().getComputedTextLength() > width) {
                    wordLargerThanWidth = true;
                    break;
                }
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                // recheck width
                if (tspan.node().getComputedTextLength() > width) {
                    wordLargerThanWidth = true;
                    break;
                }

                /*
                if (!averageCharWidthSet) {
                    numCharsForAverage += tspan.node().getComputedTextLength()
                    totalWidthForAverage += tspan.text().length;
                }*/

                tspans.push(tspan);
            }
            word = words.pop();
            }

            if (wordLargerThanWidth) {
                text.selectAll("tspan").remove();   // get rid of existing tspans
                var tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
                tspans = [tspan];

                // erase existing text wrap and try with syllable approach
                syllables = this.getSyllables(wordsCopy);
                line = [];
                //console.log(syllables.slice(0));
                var numberOfSyllables = syllables.length;
                syllable = syllables.pop();
                while (syllable) {
                line.push(syllable);
                tspan.text(this.getCandidateText(line));
                if (numberOfSyllables > 1 && tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(this.getCandidateText(line));
                    line = [syllable];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(syllable.syllable);
                    tspans.push(tspan);
                }
                syllable = syllables.pop();
                }
            }

            // adjust line height offsets based on number of lines
            /* e.g.
                1 = 0.35
                2 = 0, 1.1
                3 = -.75, .35, 1.45
                4 = -1.1, 0, 1.1, 2.2
            */
            var numLines = tspans.length;
            var startPart1 = (numLines % 2 == 1) ? CONSTANTS.DEFAULT_LINE_OFFSET_EMS : 0;
            var startPart2 = (Math.floor(((numLines+1) / 2)) - 1) * CONSTANTS.DEFAULT_LINE_HEIGHT_EMS;
            var start = startPart1 - startPart2;
            for (var i = 0; i < numLines; i++) {
                dy = (start + i * CONSTANTS.DEFAULT_LINE_HEIGHT_EMS).toFixed(2);
                tspans[i].attr('dy', dy + "em");
            }
        });
    }

    setTSpanAttributes (tspan, properties) {
        var { 
            x, y, dy, textAnchor, textContainer, coloredTextSyllable
        } = properties;

        var {
            syllable, textColor
        } = coloredTextSyllable;

        tspan
            .text(syllable.syllable)
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", textAnchor)
            //.attr("dy", dy + "em")
            .style("fill", textColor);

        return tspan;
    }

    addColoredTSpan (properties) {
        var { 
            x, y, dy, textAnchor, textContainer, coloredTextSyllable
        } = properties;

        var {
            syllable, textColor
        } = coloredTextSyllable;

        var tspan = textContainer
            .append("tspan")
            .text(syllable.syllable)
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", textAnchor)
            //.attr("dy", dy + "em")
            .style("fill", textColor);

        return tspan;
    }

    getLineWidth (line) {
        return line.reduce((lineWidth, x) => lineWidth + x.tspan.node().getComputedTextLength() + (CONSTANTS.TSPAN_PHRASE_SPACING_PX), 0);
    }

    peek (array) {
        return array[array.length-1];
    }

    checkForNoPhrases (line) {
        var phraseAndTspan = this.peek(line);
        if (phraseAndTspan && phraseAndTspan.phrases.length === 0) {
            var linePart = line.pop();
            return linePart.tspan;
        } else {
            return null;
        }
    }

    layoutColoredTextArea (textContainer, coloredTextSyllables, fitToWidth, textAnchor) {
        var phrases = [];
        var line = [];
        var lines = [line];
        var x = (textContainer.attr("x")) ? parseFloat(textContainer.attr("x")) : 0;
        var y = (textContainer.attr("y")) ? parseFloat(textContainer.attr("y")) : 0;

        var tspan = undefined;
        var currentTextColor = CONSTANTS.DEFAULT_TEXT_COLOR;
        var currentBackgroundColor = CONSTANTS.DEFAULT_BACKGROUND_COLOR;
        var currentLineWidth = 0;

        var numberOfSyllables = coloredTextSyllables.length;
        var coloredTextSyllable = coloredTextSyllables.pop();
        if (coloredTextSyllable) {
            tspan = this.addColoredTSpan({
                textContainer: textContainer,
                x: x, 
                y: y,
                textAnchor: textAnchor,
                //dy: ++lineNumber * lineHeight + dy,
                coloredTextSyllable: coloredTextSyllable
            });
            currentTextColor = coloredTextSyllable.textColor;
            currentBackgroundColor = coloredTextSyllable.backgroundColor;
            line.push({phrases: phrases, tspan: tspan});
        }  

        while (coloredTextSyllable) {
            // add words until width exceeded
            if (currentTextColor !== coloredTextSyllable.textColor 
                || currentBackgroundColor !== coloredTextSyllable.backgroundColor
                || (coloredTextSyllable.alwaysKeepSeparate && line.length > 0 && phrases.length > 0)) {
                // color has changed, so add a tspan to the same line, without making a new line
                currentLineWidth = this.getLineWidth(line);
                tspan = this.addColoredTSpan({
                    textContainer: textContainer,
                    x: x + currentLineWidth + CONSTANTS.TSPAN_PHRASE_SPACING_PX * line.length, 
                    y: y,
                    textAnchor: textAnchor,
                    //dy: dy,
                    coloredTextSyllable: coloredTextSyllable
                });
                phrases = [coloredTextSyllable];
                line.push({phrases: phrases, tspan: tspan});

                currentTextColor = coloredTextSyllable.textColor;
                currentBackgroundColor = coloredTextSyllable.backgroundColor;
            } else {
                phrases.push(coloredTextSyllable);
            }

            tspan.text(this.getColoredLineCandidateText(phrases));
            currentLineWidth = this.getLineWidth(line);

            if ((numberOfSyllables > 1 && (currentLineWidth > fitToWidth)) || coloredTextSyllable.newline) {
                phrases.pop(); // adding last syllable exceeded fitToWidth or there is a newline, so get rid of it and put it on the next line                                                
                var emptyTspan = this.checkForNoPhrases(line);                

                tspan.text(this.getColoredLineCandidateText(phrases)); // resetting to the text before we exceeded the fitToWidth
                if (emptyTspan) {
                    tspan = emptyTspan;
                    this.setTSpanAttributes(tspan, {
                        textContainer: textContainer,
                        x: x, 
                        y: y,
                        textAnchor: textAnchor,
                        //dy: ++lineNumber * lineHeight + dy,
                        coloredTextSyllable: coloredTextSyllable
                    });
                } else {
                    tspan = this.addColoredTSpan({
                        textContainer: textContainer,
                        x: x, 
                        y: y,
                        textAnchor: textAnchor,
                        //dy: ++lineNumber * lineHeight + dy,
                        coloredTextSyllable: coloredTextSyllable
                    });
                }
                currentTextColor = coloredTextSyllable.textColor;
                currentBackgroundColor = coloredTextSyllable.backgroundColor;

                phrases = [coloredTextSyllable];
                line = [{phrases: phrases, tspan: tspan}];
                lines.push(line);
            }
            coloredTextSyllable = coloredTextSyllables.pop();
        }

        // adjust line height offsets based on number of lines
        var dy = 0;
        var start = CONSTANTS.DEFAULT_COLORED_LINE_OFFSET_EMS;

        var pixelsPerEm = this.graphCanvasAnnotation.getPixelsPerEm();
        var pixelLineHeight = pixelsPerEm * CONSTANTS.DEFAULT_LINE_HEIGHT_EMS;

        // add in background color rectangles as we layout the lines
        var backgroundRectangleGroup = d3.select(textContainer.node().parentNode).select('.annotationColoredBackgroundRectangles');
        backgroundRectangleGroup.selectAll('rect').remove();
        var runningHeightOffset = 0;

        lines.map((line,i) => {
            var phraseMarginTop = (line[0] && line[0].phrases && line[0].phrases[0]) ? line[0].phrases[0].marginTop : 0;
            runningHeightOffset += phraseMarginTop;
            //console.log('runningHeightOffset: ' + runningHeightOffset);

            dy = (start + i * (CONSTANTS.DEFAULT_LINE_HEIGHT_EMS + CONSTANTS.DEFAULT_LINE_SPACING_EMS)).toFixed(2);

            line.map(lineItem => {
                var tspan = lineItem.tspan;

                tspan.attr('dy', parseFloat(dy) + runningHeightOffset/pixelsPerEm + (i*2-2) * CONSTANTS.RECTANGLE_TEXT_MARGIN/pixelsPerEm + 'em');

                var backgroundColor = (lineItem && lineItem.phrases && lineItem.phrases[0]) ? lineItem.phrases[0].backgroundColor : 'white';
                var strokeColor = (lineItem && lineItem.phrases && lineItem.phrases[0]) ? lineItem.phrases[0].strokeColor : 'white';

                //if (backgroundColor !== CONSTANTS.DEFAULT_BACKGROUND_COLOR) {
                    backgroundRectangleGroup.append("rect")
                        .attr("x", tspan.attr('x') - CONSTANTS.RECTANGLE_TEXT_MARGIN + CONSTANTS.RECTANGLE_X_NUDGE)
                        .attr("y", parseFloat(tspan.attr('y')) + (dy * pixelsPerEm) - pixelLineHeight + runningHeightOffset + CONSTANTS.RECTANGLE_Y_NUDGE)
                        .attr("width", tspan.node().getComputedTextLength() 
                            + CONSTANTS.TSPAN_PHRASE_SPACING_PX + CONSTANTS.RECTANGLE_TEXT_MARGIN * 2 - CONSTANTS.RECTANGLE_X_NUDGE)
                        .attr("height", pixelLineHeight + CONSTANTS.RECTANGLE_TEXT_MARGIN * 2)
                        .attr("rx", 3)
                        .style("fill", backgroundColor)
                        .style("stroke", strokeColor)
                        .style("stroke-width", 1);
                //}
            });
            var phraseMarginBottom = (line[0] && line[0].phrases && line[0].phrases[0]) ? line[0].phrases[0].marginBottom : 0;
            runningHeightOffset += phraseMarginBottom;
        });
    }

    // data for each text element needs to include fitToWidth, textMargin, textAnchor, getColoredTextBlocks()
    /*   coloredTextBlocks = [
            {text: 'One Fish Two Fish', textColor: 'black', backgroundColor: 'white'}, 
            {text: 'Red Fish', textColor: 'white', backgroundColor: 'red'}, 
            {text: 'Blue Fish', textColor: 'white', backgroundColor: 'blue'}]
    */
    wrapColoredText (textElementArray) {
        
        textElementArray.each((d, i, nodes) => {
            var textContainer = d3.select(nodes[i]);
            textContainer.text(null);
            var dataForNode = d3.select(nodes[i].parentNode).datum();
            var { fitToWidth, textMargin, textAnchor } = dataForNode;
            var coloredTextBlocks = dataForNode.getColoredTextBlocks();
            var coloredTextSyllables = [];
            coloredTextBlocks.reverse().map(x => {
                var totalWords = camelCaseToWordArray(x.text).reverse(); // reverse() to convert it to a stack so we can pop() off the first word, then the second, etc.
                totalWords.map((word, wordIndex) => {
                    var syllables = this.getSyllablesForWord(word);
                    syllables.map((syllable, syllableIndex) => {
                        coloredTextSyllables.push({
                            textColor: x.textColor,
                            backgroundColor: (x && x.backgroundColor) ? x.backgroundColor : 'white',
                            marginTop: (x.marginTop) ? x.marginTop : 0,
                            marginBottom: (x.marginBottom) ? x.marginBottom : 0,
                            strokeColor: x.strokeColor,
                            alwaysKeepSeparate: (x.alwaysKeepSeparate 
                                && (wordIndex+1) === totalWords.length 
                                && (syllableIndex+1) === syllables.length) ? true : false,
                            syllable: syllable,
                            newline: (x.newline 
                                && (wordIndex+1) === totalWords.length 
                                && (syllableIndex+1) === syllables.length) ? true : false
                        });
                    });
                });
            });   
            this.layoutColoredTextArea(textContainer, coloredTextSyllables, fitToWidth - textMargin * ANNOTATION_CONSTANTS.X_MARGIN_MULTIPLIER, textAnchor);
        });
    }


    syllabify(words) {
        return words.match(SYLLABLE_REGEX);
    }

    getSyllablesForWord (word) {
        var syllables = this.syllabify(word);
        if (syllables && syllables.map) {
            return syllables.map((syllable, index) => {
                return ({
                    syllable: syllable,
                    endOfWord: (index + 1) === syllables.length
                })
            }).reverse();
        } else {
            return [{
                syllable: word,
                endOfWord: true
            }];
        }
    }

    getSyllables(words) {
        var syllableArrays = words.map(word => this.getSyllablesForWord(word));
        return syllableArrays.reduce((acc, val) => acc.concat(val), []);
    }

    getCandidateText (line) {
        var candidateText = line.reduce((lineText, x) => lineText + x.syllable, '');
        candidateText = (line.length && line[line.length-1] && line[line.length-1].endOfWord) ? candidateText : candidateText + '-';
        return candidateText.trim();
    }

    getColoredLineCandidateText (phrases) {
        var candidateText = phrases.reduce((lineText, x) => lineText + x.syllable.syllable, '');
        var lastSyllable = phrases[phrases.length - 1];
        if (lastSyllable) {
            candidateText = (lastSyllable.syllable.endOfWord) ? candidateText : candidateText + '-';
            return candidateText.trim();
        } else {
            return '';
        }
    }
}
