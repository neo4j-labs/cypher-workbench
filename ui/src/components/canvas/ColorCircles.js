import React from 'react';
import PropTypes from 'prop-types';

var colors = [
    [255,219,100],[188,121,178],[242,132,85],
    [74,187,221],[235,78,85],[209,188,158],
    [125,196,129],[230,164,190],[61,121,209],
    [254,184,68],[208,89,130],[71,131,109]
];

export default function ColorCircles (props) {
    var circleRadius = 15;
    var { selected, onClick } = props;

    var hexColors = colors.map(color => '#' + convertIntToHex(color[0]) +
                                convertIntToHex(color[1]) + convertIntToHex(color[2]));
    var divCircles = hexColors.map((hexColor, index) => {
        var extraStyle = (selected === index) ? { border: '1px solid black' } : {}
        return (
            <div key={index} onClick={() => onClick(hexColor, index)}
                style={{ ...extraStyle, height: circleRadius + 'px', width: circleRadius + 'px',
                    display: 'inline-block', margin: '2px', verticalAlign: 'middle',
                    backgroundColor: hexColor, borderRadius: '50%', cursor: 'pointer'}}>
            </div>
        )
    });

    return (
        <div style={{ ...props.style, display: 'inline-block'}}>
            {divCircles}
        </div>
    )
}

function convertIntToHex (intValue) {
    var newStringValue = intValue.toString(16);
    if (newStringValue.length < 2) {
        newStringValue = '0' + newStringValue;
    }
    return newStringValue;
}

function darkenColor (color, percent) {
	var hash = false;
    var isUpper = false;
	if (color.startsWith('#')) {
 		hash = true;
		color = color.substring(1);
	}
	if (color.toUpperCase() == color) {
		isUpper = true;
	}
	var colorSegments = [];
	for (var i = 0; i < color.length; i+=2) {
		colorSegments.push(color.substring(i,i+2));
	}
	var newSegments = colorSegments.map(segment => {
		var newIntValue = Math.floor(parseInt(segment,16) * percent);
		var newStringValue = convertIntToHex(newIntValue);
		return newStringValue;
	});
	var newColor = newSegments.join('');
	newColor = (hash) ? '#' + newColor : newColor;
	newColor = (isUpper) ? newColor.toUpperCase() : newColor;
	return newColor;
}

ColorCircles.propTypes = {
};
