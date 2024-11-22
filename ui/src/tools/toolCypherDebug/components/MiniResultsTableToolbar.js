import React, { Component } from 'react'
import {
    IconButton, 
    MenuItem,
    Select,
    Tooltip
} from '@material-ui/core';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import "./MiniResultsTableToolbar.css";

export const Sizes = {
    ToolbarHeight: '30px'
}

const ToolbarDelay = 2000

export const DisplayTypes = {
    NodesAndText: "Nodes and Text",
    FormattedText: "Formatted Text",
    CompactText: "Compact Text"
}

export default class MiniResultsTableToolbar extends Component {

    runParentFunc = (funcName) => {
        /* 
        let { onExecute } = this.props;
        if (onExecute && typeof(onExecute) === 'function') {
            onExecute();
        }
        */
        
        // like the above, but generalized
        let func = this.props[funcName];
        if (func && typeof(func) === 'function') {
            func();
        }        
    }

    goToTop = () => this.runParentFunc('goToTop');
    goUp = () => this.runParentFunc('goUp');
    goDown = () => this.runParentFunc('goDown');
    goToBottom = () => this.runParentFunc('goToBottom');

    setLimit = (e) => {
        var { limit, setLimit } = this.props;
        var newValueString = e.target.value;
        if (newValueString !== '') {
            const matches = newValueString.match(/^\d+$/);
            newValueString = (matches) ? newValueString : limit;
        }
        setLimit(newValueString);
    }    

    switchDisplay = (e) => {
        const value = e.target.value;
        this.props.switchDisplay(value);            
    }

    render () {
        var { numRows, display } = this.props;

        const connectionActive = (getCurrentConnectionInfo()) ? true : false;

        return (
            <div style={{
                height: Sizes.ToolbarHeight, 
                borderTop: '1px solid lightgray', 
                display: 'flex', 
                flexFlow: 'row',
                // marginBottom: '5px'
            }}>
                <div style={{
                    display:'flex', flexFlow: 'row', 
                    marginTop: '-6px', alignContent: 'center'
                }}>
                    <div style={{marginLeft: '5px', marginTop: '10px', minWidth: '180px', color: 'gray', marginRight: '.5em'}}>
                        <span>Num Records 
                            <span style={{marginLeft: '0.5em', color: 'black'}}>{(connectionActive) ? numRows : 0}</span>
                        </span>
                    </div>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Go to top">
                        <span>
                            <IconButton aria-label="Go to top" onClick={this.goToTop}>
                                <span className='runCypherButton2 fa fa-angle-double-left' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Go up" onClick={this.goUp}>
                        <span>
                            <IconButton aria-label="Go up">
                                <span className='runCypherButton2 fa fa-angle-left' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Go down" onClick={this.goDown}>
                        <span>
                            <IconButton aria-label="Go down">
                                <span className='runCypherButton2 fa fa-angle-right' />
                            </IconButton>
                        </span>                    
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Go to bottom">
                        <span>
                            <IconButton aria-label="Go to bottom" onClick={this.goToBottom}>
                                <span className='runCypherButton2 fa fa-angle-double-right' />
                            </IconButton>
                        </span>
                    </Tooltip>
                </div>
                <div style={{flexGrow: 1}}></div>
                <Select 
                    id='miniToolbarSelectDisplay'
                    style={{marginRight: '5px', paddingLeft: '3px', height: '20px'}}
                    value={display}
                    onChange={this.switchDisplay}
                    displayEmpty
                >
                    {
                        Object.values(DisplayTypes).map(type => 
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        )
                    }
                </Select>
            </div>          
        )
    }
}