import React, { Component } from 'react';
import { CirclePicker } from 'react-color';
import PropTypes from 'prop-types';

export const CIRCLE_SIZES = {
    x_sm: 'x_sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    x_lg: 'x_lg'
}

export class SizeCircles extends Component {

    circleRadii = [];

    state = {
        selectedSize: CIRCLE_SIZES.md
    }

    computeCircleRadii = () => {
        const smallest = 15;
        const largest = 27;
        const howMany = Object.keys(CIRCLE_SIZES).length;

        if (howMany >= 1 && largest > smallest) {
            var increment = (howMany > 1) ? (largest - smallest) / (howMany - 1) : largest;
            for (var r = smallest; r <= largest; r += increment) {
                this.circleRadii.push(r);
            }
        }
    }

    constructor (props) {
        super(props);
        this.state.selectedSize = this.props.selectedSize;
        this.computeCircleRadii();
    }

    handleClick = (circleRadius, index) => {
        // call onClick with something like (21, 'md')
        const size = Object.keys(CIRCLE_SIZES)[index];
        //console.log(size);
        this.setState({
            selectedSize: size
        })
        console.log('calling onClick with size: ' + size);
        this.props.onClick(circleRadius, size);
    }

    setCircleSize = (size) => {
        console.log('setCircleSize: size is now: ' + size);
        this.setState({
            selectedSize: size
        });
    }

    renderBorderOnly = (circleRadius, index) => {
        //console.log('rendering border only for index: ' + index);
        return (
            <div key={index} onClick={() => this.handleClick(circleRadius, index)} className={'outlineSizeCircle'}
              style={{ height: circleRadius + 'px', width: circleRadius + 'px' }}>
            </div>
        )
    }

    renderSolid = (circleRadius, index) => {
        //console.log('rendering solid: ' + index);
        return (
            <div key={index} onClick={() => this.handleClick(circleRadius, index)} className={'solidSizeCircle'}
              style={{ height: circleRadius + 'px', width: circleRadius + 'px' }}>
            </div>
        )
    }

    render() {
        var { color, style } = this.props;
        var { selectedSize } = this.state;
        var circleRadii = this.circleRadii;

        const selectedIndex = Object.keys(CIRCLE_SIZES).indexOf(selectedSize);
        //console.log("selectedIndex: " + selectedIndex);
        return (
            <div style={style} className={'noselect'}>
              <div style={{display: 'inline-block', fontSize: '0.8em', marginRight: '.5em'}}>Size:</div>
              <div style={{display: 'inline-block'}}>
              {circleRadii.map((circleRadius, index) =>
                   (selectedIndex === index) ?
                        this.renderBorderOnly(circleRadius, index, color) :
                        this.renderSolid(circleRadius, index, color)
              )}
              </div>
            </div>
        )
    }
}

SizeCircles.propTypes = {
  /*smallest: PropTypes.number,
  largest: PropTypes.number,
  howMany: PropTypes.number, */
  selected: PropTypes.number
};
