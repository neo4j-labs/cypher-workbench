import React, { Component } from 'react';
import PropTypes from 'prop-types';

import SecurityRole from '../../tools/common/SecurityRole';
import { USER_ROLE } from '../../common/Constants';

import DataModelCanvas, { CANVAS_MESSAGES } from "./d3/dataModelCanvas";
import CanvasSearch from "./CanvasSearch";
import ColorPicker from './ColorPicker';
import ZoomControls from "./ZoomControls";
import { CIRCLE_SIZES, SizeCircles } from './SizeCircles';

const pxVal = (px) => (typeof(px) === 'string') ? parseFloat(px.replace(/px$/,'')) : px;

export class Canvas extends Component {

    dataModelCanvas = null;

    getDefaultWidth = () => {
        var width = (window.innerWidth - 100) 
        if (width < 800) {
            width = 800;
        };
        return width;
    }

    getDefaultHeight = () => {
        var height = (window.innerHeight - 160) 
        if (height < 600) {
            height = 600;
        };
        return height;
    }

    state = {
        width: 1100,
        height: 375,
        canvasLeft: 0,
        canvasTop: 0,
        zoomLevel: 100,
        currentCircleColor: '#ffffff',
        currentPropertyContainer: null
    }

    constructor(props) {
        super(props);
        this.canvasRef = React.createRef();
        this.colorPickerRef = React.createRef();
        this.sizePickerRef = React.createRef();
    }

    getDataModelCanvas = () => this.dataModelCanvas;

    getTopValue = (array) => {
        var frequencyMap = {};
        array.map(x => (frequencyMap[x] === undefined) ? frequencyMap[x] = 1 : frequencyMap[x] += 1);
        var highestFrequencyCount = Object.values(frequencyMap).sort((a,b) => b - a)[0];
        return Object.keys(frequencyMap).filter(key => frequencyMap[key] === highestFrequencyCount)[0];
    }

    setSizePickerCircleSize = (propertyContainer) => {
        if (this.sizePickerRef.current && propertyContainer) {
            if (!Array.isArray(propertyContainer)) {
                propertyContainer = [propertyContainer]
            }
            var sizes = propertyContainer
                .filter(x => x.classType === 'NodeLabel')
                .map(x => (x.display.size) ? x.display.size : CIRCLE_SIZES.md);
            if (sizes.length > 0) {
                this.sizePickerRef.current.setCircleSize(this.getTopValue(sizes));
            }
        }
    }

    setColorPickerColor = (propertyContainer) => {
        if (this.colorPickerRef.current && propertyContainer) {
            if (!Array.isArray(propertyContainer)) {
                propertyContainer = [propertyContainer]
            }
            var colors = propertyContainer
                .filter(x => x.classType === 'NodeLabel')
                .map(x => x.display.color);
            if (colors.length > 0) {
                this.colorPickerRef.current.setColor(this.getTopValue(colors));
            }
        }
    }

    canvasListener = (messageType, key, value) => {
        //console.log('messageType: ' + messageType + ', key: ' + key + ', value: <printed next line>');
        //console.log(value);
        if (messageType) {
            switch (messageType) {
                case CANVAS_MESSAGES.CURRENT_SELECTED_ITEMS:
                    var propertyContainer = value;
                    this.setState({
                        currentPropertyContainer: propertyContainer
                    });
                    this.setColorPickerColor(propertyContainer)
                    this.setSizePickerCircleSize(propertyContainer);
                    break;
                default:
                    break;
            }
        }
    }

    componentDidMount() {
        const { canvasDomId, canvasArrowDomId, dataModel, containerCallback } = this.props;
        this.dataModelCanvas = DataModelCanvas();
        this.dataModelCanvas.initCanvas(canvasDomId, canvasArrowDomId);
        this.dataModelCanvas.setDataModel(dataModel);
        // TODO: combine the callback and the listener functionality
        this.dataModelCanvas.setContainerCallback(containerCallback);
        this.dataModelCanvas.addListener(this.canvasListener);
        //this.dataModelCanvas.addNodeLabel("Person");

        setTimeout(() => {
            this.updateDimensions();
        }, 150);
        window.addEventListener("resize", this.updateDimensions.bind(this));
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions.bind(this));
        this.dataModelCanvas.removeListener(this.canvasListener);
    }

    getCurrentDimensions = () => {
        const { width, height } = this.state;
        return {
            width: width,
            height: height
        }
    }

    /**
    * Calculate & Update state of new dimensions
    */
    updateDimensions(size) {
        var { getWidth, getHeight } = this.props;

        getWidth = getWidth || this.getDefaultWidth;
        getHeight = getHeight || this.getDefaultHeight;

        var width = (size && !isNaN(size.width)) ? size.width : getWidth();    
        var height = (size && !isNaN(size.height)) ? size.height : getHeight();

        var stateUpdateObj = {
            width: width,
            height: height
        }
        if (this.canvasRef && this.canvasRef.current) {
            stateUpdateObj.canvasLeft = this.canvasRef.current.getBoundingClientRect().left;
            stateUpdateObj.canvasTop = this.canvasRef.current.getBoundingClientRect().top;
        }

        this.setState(stateUpdateObj);
        this.dataModelCanvas.resizeCanvas(width, height);
    }

    resetCanvas = () => {
        this.setState({
            zoomLevel: 100
        });
        this.getDataModelCanvas().resetCanvas();
    }

    resetPanAndZoom = () => {
        this.setState({
            zoomLevel: 100
        });
        this.getDataModelCanvas().resetPanAndZoom();
    }

    zoomIn = (howMuch) => {
        howMuch = (howMuch !== undefined && howMuch !== null) ? howMuch : 10;
        var increment = howMuch / 100;
        this.setState({
            zoomLevel: this.state.zoomLevel + howMuch
        })
        this.dataModelCanvas.canvasZoom(this.dataModelCanvas.ZOOM_DIRECTION.ZOOM_IN, increment, 0);
    }

    zoomOut = (howMuch) => {
        howMuch = (howMuch !== undefined && howMuch !== null) ? howMuch : 10;
        var increment = howMuch / 100;
        this.setState({
            zoomLevel: this.state.zoomLevel - howMuch
        })
        this.dataModelCanvas.canvasZoom(this.dataModelCanvas.ZOOM_DIRECTION.ZOOM_OUT, increment, 0);
    }

    clearSearch = () => {
        this.dataModelCanvas.clearSearch();
    }

    performSearch = (type, nodeLabel, relationshipType, endNodeLabelText) => {
        this.dataModelCanvas.performSearch(type, nodeLabel, relationshipType, endNodeLabelText);
    }

    setColor = (hexColor) => {
        if (SecurityRole.canEdit()) {
            //console.log('hexColor: ' + hexColor);
            var { currentPropertyContainer } = this.state;
            if (currentPropertyContainer) {
                if (!Array.isArray(currentPropertyContainer)) {
                    currentPropertyContainer = [currentPropertyContainer];
                }
                currentPropertyContainer
                    .filter(x => x.classType === 'NodeLabel')
                    .map(x => {
                        x.setColor(hexColor);
                        this.dataModelCanvas.reRenderNodeLabel(x);
                    })
            }
        }
    }

    setCircleSize = (circleRadius, size) => {
        if (SecurityRole.canEdit()) {
            var { currentPropertyContainer } = this.state;
            if (currentPropertyContainer) {
                if (!Array.isArray(currentPropertyContainer)) {
                    currentPropertyContainer = [currentPropertyContainer];
                }
                currentPropertyContainer
                    .filter(x => x.classType === 'NodeLabel')
                    .map(x => {
                        x.setSize(size);
                        this.dataModelCanvas.reRenderNodeLabel(x);
                    });
            }
        }
    }

    render() {
        var { canvasDomId, canvasLeftOverride, canvasTopOffset, zoomOnTop, colorSizeTopOffset } = this.props;
        var { width, height, canvasTop, canvasLeft, zoomLevel } = this.state;
        canvasLeft = (typeof(canvasLeftOverride) === 'number') ? canvasLeftOverride : canvasLeft;
        canvasTopOffset = (typeof(canvasTopOffset) === 'number') ? canvasTopOffset : 0;
        colorSizeTopOffset = (typeof(colorSizeTopOffset) === 'number') ? colorSizeTopOffset : 0;
        canvasTop += canvasTopOffset;

        var widthValue = pxVal(width);
        var zoomTop = (zoomOnTop) ? 15 : canvasTop + height - 45;
        var canvasSearchLeft = (zoomOnTop) ? canvasLeft + widthValue - 460 : canvasLeft + widthValue - 260;
        var canvasSearchTop = (zoomOnTop) ? canvasTop - 80 : canvasTop - 50;

        return (
            <>
                <div className="Canvas" id={canvasDomId} ref={this.canvasRef}
                    style={{border: "1px dashed lightgray", width: widthValue + "px", height: height + "px"}}>
                    <input id="editTextBox" style={{display:"none", textAlign: "center", position: "absolute", border: "none"}}></input>
                    <ColorPicker ref={this.colorPickerRef} 
                        style={{
                            display: 'flex', 
                            flexFlow: 'row',
                            position: 'absolute', 
                            left: canvasLeft + 10, 
                            top: canvasTop + height-25+colorSizeTopOffset, 
                            marginRight: '10px'
                        }} 
                        pickerTop={'-315px'}
                        pickerTopAll={'-435px'}
                        width={'470px'} 
                        circleSize={15} circleSpacing={5} 
                        onClick={this.setColor} />
                    <SizeCircles ref={this.sizePickerRef}
                        style={{position: 'absolute', left: canvasLeft + 480, top: canvasTop + height-34+colorSizeTopOffset}}
                        selectedSize={CIRCLE_SIZES.md} color={'lightgray'} onClick={this.setCircleSize} />
                    <ZoomControls zoomLevel={zoomLevel}
                        style={{position: 'absolute', left: canvasLeft + widthValue-195, top: zoomTop}}
                        resetPanAndZoom={this.resetPanAndZoom} zoomIn={this.zoomIn} zoomOut={this.zoomOut}/>
                    <CanvasSearch left={canvasSearchLeft} top={canvasSearchTop} dataModel={this.props.dataModel}
                        performSearch={this.performSearch} clearSearch={this.clearSearch}/>
                </div>
            </>
        );
    }
}
