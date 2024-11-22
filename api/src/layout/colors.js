
import { getNodeLabelArray } from "./layout";

// from ColorPicker.js
const DefaultColors = ["#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0",
            "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
            "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b",
            "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"];

// 1-based
const SelectionOrder = [10,12,15,4,5,20,7,11,17,19,8,13,16,3,6,1,14,2,9,18];

function makeColorPalette () {
    let colors = SelectionOrder.map(oneBasedIndex => DefaultColors[oneBasedIndex-1])
    colors.reverse();
    return colors;
}

// this mutates colorPalette and re-hydrates it when it's empty
function getNextColor (colorPalette) {
    let nextColor = colorPalette.pop();
    if (!nextColor) {
        let newPalette = makeColorPalette();
        newPalette.forEach(color => colorPalette.push(color));
        nextColor = colorPalette.pop();        
    }
    return nextColor;
}

// this mutates the node labels within the data model by setting the color
export function autoColor (dataModel) {
    let nodeLabels = getNodeLabelArray(dataModel);
    let colorPalette = makeColorPalette();
    nodeLabels.forEach((nodeLabel) => {
        let color = getNextColor(colorPalette);
        nodeLabel.setColor(color);
    })
}