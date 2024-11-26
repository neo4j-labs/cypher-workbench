import React, { Component } from 'react';
import ReactDOM from "react-dom";

import { IconButton, Tooltip } from "@material-ui/core";
import { GraphCanvasRole } from './GraphCanvasRole';
import { USER_ROLE } from '../../common/Constants';
import { listenTo, stopListeningTo } from '../../dataModel/eventEmitter';

import { GraphCanvas, CANVAS_MESSAGES } from "./d3/graphCanvas";
import GraphCanvasSearch from "./GraphCanvasSearch";
import ColorPicker from './ColorPicker';
import ZoomControls from "./ZoomControls";
import { ZOOM_DIRECTION } from './d3/zoomHelper';
import { CIRCLE_SIZES, SizeCircles } from './SizeCircles';

export default class GraphCanvasControl extends Component {

    getDefaultWidth = () => {
        var { widthOffset } = this.props;
        const defaultWidthOffset = 150;
        widthOffset = (typeof(widthOffset) === 'number') ? defaultWidthOffset+widthOffset : defaultWidthOffset;
        //console.log('widthOffset: ', widthOffset);
        var width = (window.innerWidth - widthOffset); 
        if (width < 100) {
            width = 100;
        };
        //console.log('width: ', width);
        return width;
    }

    getDefaultHeight = () => {
        return 200;
    }

    state = {
        width: this.getDefaultWidth(),
        height: this.getDefaultHeight(),
        lastWidth: this.getDefaultWidth(),
        lastHeight: this.getDefaultHeight(),
        canvasLeft: 0,
        canvasTop: 0,
        zoomLevel: 100,
        currentCircleColor: '#ffffff',
        currentPropertyContainer: null
    }

    constructor(props) {
        super(props);
        this.id = props.id;

        this.canvasRef = React.createRef();
        this.colorPickerRef = React.createRef();
        this.sizePickerRef = React.createRef();

        this.userRole = new GraphCanvasRole();
        this.userRole.setRole(USER_ROLE.OWNER);
    }

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
                .filter(x => x.classType === 'NodeDisplay')
                .map(x => (x.size) ? x.size : CIRCLE_SIZES.md);
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
                .filter(x => x.classType === 'NodeDisplay')
                .map(x => x.color);
            if (colors.length > 0) {
                this.colorPickerRef.current.setColor(this.getTopValue(colors));
            }
        }
    }

    canvasListener = (id, messageName, messagePayload) => {
        //console.log('messageName: ' + messageName, messagePayload);
        if (messageName) {
            switch (messageName) {
                case CANVAS_MESSAGES.CURRENT_SELECTED_ITEMS:
                    var propertyContainer = messagePayload.selectedNodes;
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

    componentIsMounted = false;

    setDataProvider = (dataProvider) => {
        if (this.componentIsMounted) {
            if (!dataProvider) {
                throw new Error('GraphCanvas setDataProvider: A data provider is required!');
            }
    
            const graphCanvas = this.getGraphCanvas();
            if (graphCanvas) {
                graphCanvas.resetCanvas();
                graphCanvas.setDataProvider(dataProvider);
            }
            this.setState({
                dataProvider: dataProvider
            });
        }
    }

    componentDidMount = () => {
        
        var graphCanvasProperties = { 
            id: this.props.id, 
            parentDomElementId: this.props.domId,
            arrowDomElementId: this.props.arrowDomId,
            dataProvider: this.props.dataProvider, 
            canvasConfig: this.props.canvasConfig,
            canvasOptions: this.props.canvasOptions,
            snapToGrid: this.props.snapToGrid
        };

        if (!this.props.dataProvider) {
            throw new Error('GraphCanvas componentDidMount: A data provider is required!');
        }

        console.log(">>> creating an instance of GraphCanvas <<<");
        var graphCanvas = new GraphCanvas(graphCanvasProperties);
        graphCanvas.setUserRole(this.userRole);
        console.log("canvas domId = " + this.props.domId);

        listenTo(graphCanvas, this.id, this.canvasListener);
        
        this.setState({
            graphCanvas: graphCanvas,
            dataProvider: this.props.dataProvider,
        }, () => {
            this.componentIsMounted = true;
        })

        setTimeout(() => {
            //console.log('calling updateDimensions on ' + this.props.id);
            this.updateDimensions();
        }, 150);
        window.addEventListener("resize", this.updateDimensions);
    }

    componentWillUnmount = () => {
        const { graphCanvas } = this.state;

        window.removeEventListener("resize", this.updateDimensions);
        if (graphCanvas) {
            stopListeningTo(graphCanvas, this.id);
        }
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
    updateDimensions = (size) => {
        var { graphCanvas, lastWidth, lastHeight } = this.state;
        var { getWidth, getHeight, autoResizeWidth, autoResizeHeight } = this.props;

        getWidth = getWidth || this.getDefaultWidth;
        getHeight = getHeight || this.getDefaultHeight;

        var width = (size && !isNaN(size.width)) ? size.width : getWidth();    
        var height = (size && !isNaN(size.height)) ? size.height : getHeight();

        let updateWidth = width;
        let updateHeight = height;

        var stateUpdateObj = {
            width: updateWidth,
            height: updateHeight
        }
        if (this.canvasRef && this.canvasRef.current) {
            stateUpdateObj.canvasLeft = this.canvasRef.current.getBoundingClientRect().left;
            stateUpdateObj.canvasTop = this.canvasRef.current.getBoundingClientRect().top;
        }

        //console.log('updating state ', stateUpdateObj);
        this.setState(stateUpdateObj);
        if (graphCanvas) {
            graphCanvas.resizeCanvas(updateWidth, updateHeight);
        }
    }

    getGraphCanvas = () => {
        const { graphCanvas } = this.state;
        return graphCanvas;
    }

    resetCanvas = () => {
        const { graphCanvas } = this.state;

        this.setState({
            zoomLevel: 100
        });
        if (graphCanvas) {
            graphCanvas.resetCanvas();
        }
    }

    resetPanAndZoom = () => {
        const { graphCanvas } = this.state;

        this.setState({
            zoomLevel: 100
        });
        if (graphCanvas) {
            graphCanvas.getZoomHelper().resetPanAndZoom();
        }
    }

    zoomIn = (howMuch) => {
        const { graphCanvas } = this.state;

        howMuch = (howMuch !== undefined && howMuch !== null) ? howMuch : 10;
        var increment = howMuch / 100;
        this.setState({
            zoomLevel: this.state.zoomLevel + howMuch
        })
        if (graphCanvas) {
            graphCanvas.getZoomHelper().canvasZoom(ZOOM_DIRECTION.ZOOM_IN, increment, 0);
        }
    }

    zoomOut = (howMuch) => {
        const { graphCanvas } = this.state;

        howMuch = (howMuch !== undefined && howMuch !== null) ? howMuch : 10;
        var increment = howMuch / 100;
        this.setState({
            zoomLevel: this.state.zoomLevel - howMuch
        })
        if (graphCanvas) {
            graphCanvas.getZoomHelper().canvasZoom(ZOOM_DIRECTION.ZOOM_OUT, increment, 0);
        }
    }

    clearSearch = () => {
        const { graphCanvas } = this.state;
        if (graphCanvas) {
            graphCanvas.clearSearch();
        }
    }

    performSearch = (type, node, relationshipType, endNodeText) => {
        const { graphCanvas } = this.state;
        if (graphCanvas) {
            graphCanvas.performSearch(type, node, relationshipType, endNodeText);
        }
    }

    setColor = (hexColor) => {
        if (this.userRole.canEdit()) {
            //console.log('hexColor: ' + hexColor);
            var { graphCanvas, currentPropertyContainer } = this.state;
            if (currentPropertyContainer) {
                if (!Array.isArray(currentPropertyContainer)) {
                    currentPropertyContainer = [currentPropertyContainer];
                }
                currentPropertyContainer
                    .filter(x => x.classType === 'NodeDisplay')
                    .map(x => {
                        x.setColor(hexColor);
                        graphCanvas.reRenderNode(x);
                    })
            }
        }
    }

    setCircleSize = (circleRadius, size) => {
        if (this.userRole.canEdit()) {
            var { graphCanvas, currentPropertyContainer } = this.state;
            if (currentPropertyContainer) {
                if (!Array.isArray(currentPropertyContainer)) {
                    currentPropertyContainer = [currentPropertyContainer];
                }
                currentPropertyContainer
                    .filter(x => x.classType === 'NodeDisplay')
                    .map(x => {
                        x.setSize(size);
                        graphCanvas.reRenderNode(x);
                    });
            }
        }
    }

    renderGraph = () => {
        const { graphCanvas } = this.state;
        if (graphCanvas) {
            graphCanvas.render();
        }
    }

    /*
    getCanvasWidth = (domId) => {
        const { width } = this.state;
        console.log(`getCanvasWidth: domId: ${domId} width is: ${width}`);
        return `${width}`;
    }

    getCanvasHeight = (domId) => {
        const { height } = this.state;
        console.log(`getCanvasHeight: domId: ${domId} height is: ${height}`);
        return `${height}`;
    }*/

    getBoundingClientRect = () => ReactDOM.findDOMNode(this).getBoundingClientRect();    

    closeCanvas = () => {
        const { parentContainer } = this.props;
        if (parentContainer && parentContainer.closeCanvas) {
            parentContainer.closeCanvas();
        }
    }

    render = () => {
        const { domId } = this.props;
        const { width, height, canvasTop, canvasLeft, zoomLevel, dataProvider } = this.state;
        var { displayOptions, additionalStyle, floatControls, 
                floatControlsStyle, sizeCirclesStyle, zoomControlsStyle, closeCanvas } = this.props;
        additionalStyle = additionalStyle || {};

        floatControlsStyle = floatControlsStyle || {
            marginLeftOffset: "370px",
            marginTop: "0.5em"
        };

        sizeCirclesStyle = sizeCirclesStyle || {
            marginTop: '-.2em'
        }        

        zoomControlsStyle = zoomControlsStyle || {
            marginRight: '1.5em', 
            marginTop: '-.5em'
        }

        var defaultDisplayOptions = {
            displayColorPicker: true,
            displaySizeCircles: true,
            displayZoomControls : true,
            closeButton: false
        };        
        displayOptions = { ...defaultDisplayOptions, ...(displayOptions || {}) }
        var colorOrSizeDisplayed = displayOptions.displayColorPicker || displayOptions.displaySizeCircles;
        var anyControlsDisplayed = Object.values(displayOptions).find(value => value === true);
        var canvasStyle = {
            border: "1px dashed lightgray", 
            width: width, 
            height: height,
            ...additionalStyle
        }

        var additionalControlsStyle = (floatControls) ? {
            position: 'absolute',
            marginLeft: `calc(100% - ${floatControlsStyle.marginLeftOffset})`,
            marginTop: floatControlsStyle.marginTop
        } 
        : {
            position: 'static'
        };
        //console.log('canvasStyle', canvasStyle);

        return (
            <div>
                {anyControlsDisplayed &&
                    <div style={{display:'flex', ...additionalControlsStyle}}>
                        {/*
                        <GraphCanvasSearch left={canvasLeft + width-260} top={canvasTop-50} 
                            dataModel={dataProvider}
                            performSearch={this.performSearch} clearSearch={this.clearSearch}/>
                        */}
                        {displayOptions.displayColorPicker && 
                            <ColorPicker ref={this.colorPickerRef}
                                pickerTop={'70px'}
                                style={{ display: 'flex', flexFlow: 'row', marginTop: '.3em'}}
                                width={'470px'} circleSize={15} circleSpacing={5} onClick={this.setColor} />
                        }
                        {displayOptions.displaySizeCircles && 
                            <SizeCircles ref={this.sizePickerRef} 
                                style={sizeCirclesStyle}
                                selectedSize={CIRCLE_SIZES.md} color={'lightgray'} onClick={this.setCircleSize} />
                        }
                        <div style={{flexGrow: 1}}></div>
                        {displayOptions.displayZoomControls && 
                            <ZoomControls zoomLevel={zoomLevel}
                                style={zoomControlsStyle}
                                resetPanAndZoom={this.resetPanAndZoom} zoomIn={this.zoomIn} zoomOut={this.zoomOut}/>
                        }
                        {displayOptions.closeButton && 
                            <Tooltip enterDelay={600} arrow title="Close Canvas" onClick={closeCanvas}>
                                <div style={{ display: 'flex', flexFlow: 'row', marginTop: '-0.5em'}}>
                                    <IconButton aria-label="Close Canvas">
                                        <span className='runCypherButton2 fa fa-times' />
                                    </IconButton>
                                </div>                    
                            </Tooltip>
                        }
                    </div>
                }
                <div className="Canvas" id={domId} ref={this.canvasRef} style={canvasStyle}>
                    <input id={`${domId}_editTextBox`} style={{display:"none", textAlign: "center", position: "absolute", border: "none"}}></input>
                </div>
            </div>
        );
    }
}
