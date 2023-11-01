import React, { Component } from 'react'
import {
    Checkbox, ClickAwayListener,
    FormControlLabel,
    IconButton,
    Popper, Paper,
    Tooltip, Typography
} from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';

export default class PipelineOptionsButton extends Component {

    state = {
        optionsOpen: false,
        optionsAnchor: null,
        amOpeningPopper: false
    }

    handleClick = (event) => {
        this.setState({
            optionsAnchor: event.currentTarget,
            optionsOpen: !this.state.optionsOpen,
            amOpeningPopper: true
        }, () => {
            setTimeout(() => this.setState({ amOpeningPopper: false }), 1000);
        });
    }

    clickAway = () => {
        const { amOpeningPopper } = this.state;
        if (!amOpeningPopper) {
            this.setState({
                optionsOpen: false
            })
        }
    }
  
    render () {
        var { style } = this.props;
        style = style || {};
        style = {...style, color: '#555' };
        const { optionsOpen, optionsAnchor } = this.state;

        return (
            <>
                <IconButton
                    style={style}
                    edge="end"
                    color="inherit"
                    aria-label="connect"
                    onClick={this.handleClick}
                >
                    <Tooltip enterDelay={600} arrow title="Export Options">
                        <SettingsIcon />
                    </Tooltip>
                </IconButton>
                <ClickAwayListener onClickAway={this.clickAway}>
                    <Popper open={optionsOpen} 
                        anchorEl={optionsAnchor} placement={'bottom-end'}
                        style={{zIndex: 10000}} transition>
                        <Paper style={{background: '#F6F6F6', border: '1px solid gray',
                                            paddingLeft: '10px',
                                            paddingTop: '4px',
                                            paddingRight: '4px',
                                            paddingBottom: '4px'}}>
                            <PipelineOptions {...this.props}/>
                        </Paper>
                    </Popper>
                </ClickAwayListener>
            </>

        )
    }
}

class PipelineOptions extends Component {

    constructor () {
        super();
    }

    setParallelRelationships = () => {
        const { parallelRelationships, setParallelRelationships } = this.props;
        setParallelRelationships(!parallelRelationships);
    }

    render () {
        const { parallelRelationships } = this.props;

        return (
            <>
                <div style={{textDecoration: 'underline', fontSize: '1.2em', fontWeight: 500}}>Export Options</div>
                <div style={{marginBottom: '5px'}} >
                    <FormControlLabel
                        control={
                        <Checkbox
                            checked={parallelRelationships}
                            onChange={this.setParallelRelationships}
                            name="parallelRelationships"
                            color="primary"
                        />
                        }
                        label={"Parallel Relationships"}
                    />
                </div>
            </>
        )
    }
}
