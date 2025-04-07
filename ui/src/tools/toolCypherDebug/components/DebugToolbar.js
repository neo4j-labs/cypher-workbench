import React, { Component } from 'react'
import {
    Button,
    CircularProgress,
    IconButton, 
    TextField, Tooltip
} from '@material-ui/core';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import { track } from '../../../common/util/tracking';
import { TOOL_NAMES } from '../../../common/LicensedFeatures';
import { RevealMetrics } from '../CypherDebug';

export const Sizes = {
    ToolbarHeight: '40px'
}

const ToolbarDelay = 2000

let activity = [];
let ActivityRecordTime = 10 * 1000; // 10 seconds

let recordActivity = () => {
    if (activity.length > 0) {
        let activityCopy = activity.slice();
        track(RevealMetrics.ToolClick, { 
            toolName: TOOL_NAMES.CYPHER_DEBUG,
            clicks: activityCopy                 
        });
        activity = [];
    }
    setTimeout(recordActivity, ActivityRecordTime);
}

export default class DebugToolbar extends Component {

    constructor (props) {
        super(props);
        setTimeout(recordActivity, ActivityRecordTime);
    }

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
            let dateString = new Date().toISOString();
            console.log(dateString);
            activity.push({
                action: funcName,
                dateTime: dateString
            })
            func();
        }        
    }

    executeCypher = () => this.runParentFunc('onExecute');
    startDebugging = () => this.runParentFunc('startDebugging');
    stepBackward = () => this.runParentFunc('stepBackward');
    stepForward = () => this.runParentFunc('stepForward');
    internalStepForward = () => this.runParentFunc('internalStepForward');
    internalStepBackward = () => this.runParentFunc('internalStepBackward');
    stopDebugging = () => this.runParentFunc('stopDebugging');
    stopQueryExecution = () => this.runParentFunc('stopQueryExecution');
    setParameters = () => this.runParentFunc('setParameters');
    clear = () => this.runParentFunc('clear');
    validate = () => this.runParentFunc('validate');

    setLimit = (e) => {
        var { limit, setLimit } = this.props;
        var newValueString = e.target.value;
        if (newValueString !== '') {
            const matches = newValueString.match(/^\d+$/);
            newValueString = (matches) ? newValueString : limit;
        }
        setLimit(newValueString);
    }    

    render () {
        // var { numRows } = this.props;
        const { 
            limit, canStepBackward, canStepForward, isBusy, areStepping, validationIcon 
        } = this.props;

        // const connectionActive = (getCurrentConnectionInfo()) ? true : false;

        return (
            <div style={{
                height: Sizes.ToolbarHeight, 
                border: '1px solid lightgray', 
                display: 'flex', 
                flexFlow: 'row',
                // marginBottom: '5px'
            }}>
                <div>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Execute Cypher">
                        <IconButton aria-label="Execute Cypher" onClick={this.executeCypher}>
                            <span className='runCypherButton1 fa fa-play' />
                        </IconButton>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Debug Cypher">
                        <span>
                            <IconButton disabled={areStepping} aria-label="Start Debugging" onClick={this.startDebugging}>
                                <span className='runCypherButton2 fa fa-bug' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Stop Debugging and Revert to Original Cypher">
                        <IconButton disabled={!areStepping} aria-label="Stop Debugging and Revert to Original Cypher" onClick={this.stopDebugging}>
                            <span className='runCypherButton1 fa fa-stop' />
                        </IconButton>
                    </Tooltip>                                    
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Step backward a line">
                        <span>
                            <IconButton disabled={!canStepBackward} aria-label="Step backward a line" onClick={this.stepBackward}>
                                <span className='runCypherButton2 fa fa-angle-double-up' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Step forward a line">
                        <span>
                            <IconButton disabled={!canStepForward} aria-label="Step forward a line" onClick={this.stepForward}>
                                <span className='runCypherButton2 fa fa-angle-double-down' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Step backward inside line" onClick={this.internalStepBackward}>
                        <span>
                            <IconButton disabled={!canStepBackward} aria-label="Step backward inside line">
                                <span className='runCypherButton2 fa fa-arrow-left' />
                            </IconButton>
                        </span>                    
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Step forward inside line" onClick={this.internalStepForward}>
                        <span>
                            <IconButton disabled={!canStepForward} aria-label="Step forward inside line">
                                <span className='runCypherButton2 fa fa-arrow-right' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Stop executing current query" onClick={this.stopQueryExecution}>
                        <span>
                            <IconButton disabled={!isBusy} aria-label="Stop executing current query">
                                <span className='runCypherButton2 fa fa-stop-circle' />
                            </IconButton>
                        </span>
                    </Tooltip>
                    {isBusy && 
                        <CircularProgress style={{
                            marginLeft: '.2em', marginBottom: '-.25em', width:'1em', height:'1em'
                        }}/>                
                    }
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Set parameters" onClick={this.setParameters}>
                        <span style={{marginLeft: '20px'}}>
                            <Button aria-label="Set parameters">
                                Params
                            </Button>
                        </span>
                    </Tooltip>                    
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Clear canvas" onClick={this.clear}>
                        <span style={{marginLeft: '20px'}}>
                            <Button aria-label="Clear canvas">
                                Clear
                            </Button>
                        </span>
                    </Tooltip>                    
                    {/* <span style={{marginLeft: '15em', color: 'gray', marginRight: '.5em'}}>Num Records Returned 
                        <span style={{marginLeft: '0.5em', color: 'black'}}>{(connectionActive) ? numRows : 0}</span>
                    </span> */}
                    <span style={{marginLeft: '3.5em', color: 'gray', marginRight: '.5em'}}>Limit </span>
                    <TextField value={limit} onChange={this.setLimit} margin="dense" style={{width: '5em', marginTop: '.46em'}}/>
                    <Tooltip enterDelay={ToolbarDelay} placement="top" arrow title="Validate" onClick={this.validate}>
                        <span style={{marginLeft: '20px'}}>
                            <Button disabled={areStepping} aria-label="Validate">
                                Validate
                            </Button>
                            <span style={{position: 'relative', top: '7px'}}>
                                {validationIcon}
                            </span>
                        </span>
                    </Tooltip>                    
                </div>
            </div>          
        )
    }
}