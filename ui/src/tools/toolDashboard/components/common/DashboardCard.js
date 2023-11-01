import React, { Component } from 'react'

import {
    Card, CardContent, CardHeader, IconButton, Tooltip, Typography    
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import { Resizable, ResizableBox } from 'react-resizable';
//import "../../../../common/css/react-resizable.css";

const DRAG_MIME_TYPE = 'application/cypher-workbench';

export default class DashboardCard extends Component {

    constructor (props) {
        super(props);
        this.dragStartCoords = { x: 0, y: 0 };
        this.currentScrollTop = 0;
    }

    state = {
        isSelected: false,
        width: 200,
        height: 100
    }

    componentDidMount = () => {
        const { 
            domId, scrollIntoView, dashboardBuilder, width, height
        } = this.props;

        if (scrollIntoView) {
            var domElement = document.getElementById(domId);
            var detailsDomElement = document.getElementById(`${domId}_dashboardWidgetDetails`);
            //dashboardBuilder.scrollIntoView({ domElement, detailsDomElement });
        }

        var updateState = false;
        var updateStateObject = { };
        if (width) {
            updateStateObject.width = width; 
            updateState = true;
        }
        if (height) {
            updateStateObject.height = height; 
            updateState = true;
        }
        if (updateState) {
            this.setState(updateStateObject);
        }
    }

    /*
    onResizeStart = (size) => {
    }
    */

    onResize = (size) => {
        /*
            size = {
                width: 100,
                height: 100
            }
        */
        console.log('onResize: ', size);
        this.setState(size);
    }


    render () {
        var { 
            blockKey, domId, title, children
        } = this.props;

        var { width, height } = this.state;

        return (
            <div>
                <CardHeader id={blockKey}
                    title={title}
                    action={
                        <IconButton aria-label="settings">
                            <MoreVertIcon />
                        </IconButton>
                    }                    
                >
                </CardHeader>
                <CardContent id={`${domId}_dashboardWidgetDetails`}>
                    {children}
                </CardContent>
            </div>
        )
    }
}