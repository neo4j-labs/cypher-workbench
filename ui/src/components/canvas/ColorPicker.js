import React, { Component } from 'react';
import { CirclePicker, SwatchesPicker, SketchPicker } from 'react-color';
import { Tabs, Tab } from "@material-ui/core";
import { TabPanel } from "../common/Components";

const pxVal = (px) => (typeof(px) === 'string') ? parseFloat(px.replace(/px$/,'')) : px;

export default class ColorPicker extends Component {

  state = {
    displayPopupColorPicker: false,
    pickerTabIndex: 0,
    color: '#ffffff',
    // default Circle colors from https://casesandberg.github.io/react-color/ + white and black
    colors: ["#000000", "#ffffff", "#f44336", "#e91e63", "#9c27b0",
            "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
            "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b",
            "#ffc107", "#ff9800", "#ff5722", "#795548", "#607d8b"]
  };

  handleChangeCompletePicker = (color) => {
    this.setState({ 
      color: color.hex 
    });
    this.props.onClick(color.hex);
  }

  handleChangeComplete = (color) => {
    this.setState({ 
      displayPopupColorPicker: false,
      color: color.hex 
    });
    this.props.onClick(color.hex);
  };

  closePopupColorPicker = () => {
    this.setState({ 
      displayPopupColorPicker: false
    });
  }

  togglePopupColorPicker = () => {
    const { displayPopupColorPicker } = this.state;
    this.setState({
      displayPopupColorPicker: !displayPopupColorPicker
    });
  }

  setColor = (hexColor) => {
      console.log('setColor: color is now: ' + hexColor);
      if (hexColor === 'white') hexColor = '#ffffff';
      this.setState({
          color: hexColor
      });
  }

  changeTab = (event, index) => {
    this.setState(
      {
        pickerTabIndex: index
      }
    );
  }

  render() {
    var { style, width, circleSize, circleSpacing, pickerTop, pickerTopAll } = this.props;
    const { displayPopupColorPicker, color, colors, pickerTabIndex } = this.state;

    pickerTop = (pickerTop) ? pickerTop : '0px';
    pickerTopAll = (pickerTopAll) ? pickerTopAll : pickerTop;
    pickerTop = (pickerTabIndex === 1) ? pickerTopAll : pickerTop;

    var ellipsisStyle = {
      cursor: 'pointer', 
      fontSize: '.8em', 
      marginLeft: '-.1em',
      marginRight: '.1em',
      height: '1.3em',
      paddingLeft: '4px',
      paddingTop: '3px',
      paddingRight: '3px'
    };

    if (!colors.includes(color)) {
      ellipsisStyle.border = '1px solid #ccc';
      ellipsisStyle.borderRadius = '50%';
      ellipsisStyle.paddingTop = '2px';
      ellipsisStyle.paddingLeft = '3px';
    }

    var backgroundStyle = {
      position: 'fixed',
      display: (displayPopupColorPicker) ? 'block' : 'none',
      opacity: 0,
      background: 'gray',
      zIndex: 1,
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    return (
        <div style={style} className={'noselect'}>
          <div style={{fontSize: '0.8em', marginRight: '.5em', marginTop: '-.15em'}}>Color:</div>
          <div style={{display: 'flex', flexFlow: 'row', height: '1em', 
            verticalAlign:'middle', zIndex: 2 }}>
              <div className="fa fa-ellipsis-h" style={ellipsisStyle} 
                          onClick={ this.togglePopupColorPicker }></div>
              <CirclePicker
                width={ width }
                circleSize={ circleSize }
                circleSpacing={ circleSpacing }
                color={ color }
                colors={ colors }
                onChangeComplete={ this.handleChangeComplete }
              />
          </div>
          {displayPopupColorPicker &&
            <>
              <div style={backgroundStyle} onClick={this.closePopupColorPicker}/>
              <div style={{
                position: 'absolute', 
                zIndex: 2, 
                left: 0,
                border: '1px solid #ccc',
                background: '#f8f8f8',
                top: pickerTop}}
              >
                <Tabs
                  orientation="horizontal"
                  variant="scrollable"
                  value={pickerTabIndex}
                  onChange={this.changeTab}
                >
                  <Tab label="Swatch" />
                  <Tab label="All" />
                </Tabs>
                <TabPanel value={pickerTabIndex} index={0}>
                  <div>
                    <SwatchesPicker 
                          width={320}
                          color={ this.state.color } 
                          onChangeComplete={ this.handleChangeCompletePicker } />              
                  </div>
                </TabPanel>
                <TabPanel value={pickerTabIndex} index={1}>
                  <div>
                    <SketchPicker 
                          width={300}
                          color={ this.state.color } 
                          onChangeComplete={ this.handleChangeCompletePicker } />              
                  </div>
                </TabPanel>
              </div>
            </>
          }
        </div>
    );
  }
}
