import React, { Component, useState } from 'react'

import {
    TextField,
    Tooltip, Typography
} from '@material-ui/core';

import {
    ALERT_TYPES,
    COLORS
} from '../../../common/Constants';
import { WorkStatus } from '../WorkStatus'

import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import CropFreeIcon from '@material-ui/icons/CropFree';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import CloseIcon from '@material-ui/icons/Close';
import PaletteIcon from '@material-ui/icons/PaletteOutlined';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import AdjustIcon from '@material-ui/icons/Adjust';

import SecurityRole, { SecurityMessages } from '../SecurityRole'

const Sizes = {
    TitleBarHeight: '2.5em',
}

export default class AccordionBlockNoDrag extends Component {

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }

    state = {
        isSelected: false,
        addButtonOpen: false,
        titleBeingEdited: false,
        currentTitleValue: ''
    }

    constructor (props) {
        super(props);
        this.dragStartCoords = { x: 0, y: 0 };
        this.currentScrollTop = 0;
        this.textFocus = this.utilizeFocus();
    }

    stopEditingTitle = () => {
        this.setState({
            titleBeingEdited: false
        });
    }

    editTitle = (e) => {
        const { titleEditingAllowed } = this.props;
        e.stopPropagation();
        if (titleEditingAllowed && SecurityRole.canEdit()) {
            this.setState({ 
                titleBeingEdited: true,
                currentTitleValue: this.getBlockTitle()
            }, () => {
                this.focusTextBox();
            });
        }
    }

    setTitle = (e) => {
        this.setState({
            currentTitleValue: e.target.value
        })
    }

    getBlockTitle = () => {
        const { dataProvider } = this.props;
        if (dataProvider && dataProvider.getTitle) {
            return dataProvider.getTitle();
        } else {
            return '';
        }
    }

    saveTitleEditChanges = () => {
        const { dataProvider } = this.props;
        const { currentTitleValue } = this.state;
        if (dataProvider && dataProvider.setTitle) {
            if (this.getBlockTitle() !== currentTitleValue) {
                dataProvider.setTitle(currentTitleValue);
            }
        }
        this.stopEditingTitle();
    }

    handleTitleKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            this.saveTitleEditChanges();
        }
    }

    handleTitleKeyDown = (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            this.stopEditingTitle();
        }
    }

    promptRemoveAccordionPanel = () => {
        const { 
            removeAccordionPanel, parentContainer
        } = this.props;
        const title = this.getBlockTitle();

        const prompt = `Would you like to delete section '${title}'?`;
        parentContainer.showGeneralDialog('Delete Section', prompt, [{
                text: 'Yes',
                onClick: (button, index) => {
                    removeAccordionPanel();
                    parentContainer.closeGeneralDialog();
                },
                autofocus: false
            },
            {
                text: 'No',
                onClick: (button, index) => parentContainer.closeGeneralDialog(),
                autofocus: true
            }]
        );
    }

    componentDidMount = () => {
        const { 
            domId, scrollIntoView, parentContainer
        } = this.props;

        if (scrollIntoView) {
            var domElement = document.getElementById(domId);
            var detailsDomElement = document.getElementById(`${domId}_accordionDetails`);
            if (parentContainer.scrollIntoView) {
                parentContainer.scrollIntoView({ domElement, detailsDomElement });
            }
        }
    }

    internalToggleAccordionPanel = () => {
        const { toggleAccordionPanel } = this.props;
        if (toggleAccordionPanel) {
            toggleAccordionPanel();
        }
    }

    internalSelectAccordionPanel = () => {
        const { selectAccordionPanel } = this.props;
        if (selectAccordionPanel) {
            selectAccordionPanel();
        }
    }

    render () {
        var { 
            blockKey, domId, expanded, selected, children,
            firstBlock, parentContainer, rightWidthOffset,
            showToggleTool, toggleAccordionPanel, selectAccordionPanel, removeAccordionPanel,
            addMode, workStatus, workStatusMessage
        } = this.props;

        var { titleBeingEdited, currentTitleValue } = this.state;
        const title = this.getBlockTitle();

        // TODO: implement the toggle tool
        showToggleTool = false;

        var className = (selected) ? 'accordionPanelSelected' : 'accordionPanel';
        const marginTop = (firstBlock)
            ?  (addMode) 
                ? '1em' 
                : '.3em'
            : '0em';

        return (
            <div id={domId} className={className} onClick={this.internalSelectAccordionPanel} 
                style={{
                    marginTop:marginTop,
                }}
            >
                <Accordion expanded={expanded} 
                    onChange={() => { if (!titleBeingEdited) { this.internalToggleAccordionPanel() }}}
                    onClick={(e) => { 
                        if (titleBeingEdited) {             
                            this.saveTitleEditChanges();
                        }
                        e.stopPropagation();
                    }}
                    style={{width: `calc(100% - ${rightWidthOffset}px)`}}
                >
                    <AccordionSummary style={{background: '#E9E9E9', height: Sizes.TitleBarHeight, minHeight: Sizes.TitleBarHeight}}
                        aria-controls={blockKey}
                        id={blockKey}
                    >
                        <div style={{display: 'flex', justifyContent: 'flex-start', flexFlow: 'row', width: '100%', padding: '5px'}} 
                        >
                            {(titleBeingEdited) ?
                                <TextField id={`${domId}_titleInput`} autoComplete="off"
                                    inputRef={this.textFocus.ref}
                                    value={currentTitleValue} 
                                    onChange={this.setTitle} 
                                    onKeyPress={this.handleTitleKeyPress}
                                    onKeyDown={this.handleTitleKeyDown}
                                    placeholder={'Enter Title'} title={'Enter Title'}
                                    margin="dense" style={{
                                        width: '30em'
                                    }}/>
                                :
                                <Typography style={{
                                    color: 'gray',
                                    fontStyle: 'italic',
                                    flex: '1 1 auto',
                                    maxWidth: '40em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'text'
                                }} onClick={this.editTitle}>{title}</Typography>
                            }
                            <div style={{marginLeft: 'auto', flex: '0 0 auto', display: 'flex', flexFlow: 'row' }}>
                                {(showToggleTool) &&
                                    <Tooltip enterDelay={600} arrow title="Toggle color/size/zoom">
                                        <PaletteIcon style={{ fontSize: '1.3em', marginTop: '.1em', marginRight: '.1em'}} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                //TODO
                                            }}/>
                                    </Tooltip>
                                }
                                {(workStatus === WorkStatus.Complete) &&
                                    <Tooltip enterDelay={600} arrow title={workStatusMessage}>
                                        <CheckCircleOutlineIcon style={{ color: 'green', fontSize: '1.3em', marginTop: '.1em', marginRight: '.3em'}} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}/>
                                    </Tooltip>
                                }
                                {(workStatus === WorkStatus.Pending) &&
                                    <Tooltip enterDelay={600} arrow title={workStatusMessage}>
                                        <AdjustIcon style={{ color: COLORS.primary, fontSize: '1.3em', marginTop: '.1em', marginRight: '.3em'}} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}/>
                                    </Tooltip>
                                }
                                {selectAccordionPanel &&
                                    <Tooltip enterDelay={600} arrow title="Click to Select Panel">
                                        <CropFreeIcon style={{ fontSize: '1.3em', marginTop: '.1em'}} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                this.internalSelectAccordionPanel();
                                            }}/>
                                    </Tooltip>
                                }
                                {toggleAccordionPanel &&
                                    <>
                                        <div style={{height: '1em', width: '1em'}}/>
                                        {(expanded) 
                                            ? <ExpandLessIcon/> 
                                            : <ExpandMoreIcon />
                                        }
                                    </>
                                }
                                {removeAccordionPanel &&
                                    <CloseIcon style={{ fontSize: '1.2em', marginTop: '.1em'}} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (SecurityRole.canEdit()) {
                                                this.promptRemoveAccordionPanel();
                                            } else {
                                                alert(SecurityMessages.NoPermissionToRemove, ALERT_TYPES.WARNING)
                                            }
                                        }}
                                    />
                                }
                            </div>
                        </div>
                    </AccordionSummary>
                    <AccordionDetails id={`${domId}_accordionDetails`}>
                        {children}
                    </AccordionDetails>
                </Accordion>
            </div>
        )
    }
}