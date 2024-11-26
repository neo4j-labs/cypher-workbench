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
//import PendingOutlinedIcon from '@material-ui/icons/PendingOutlined';
//import ModeStandbyOutlinedIcon from '@material-ui/icons/ModeStandbyOutlined';
import AdjustIcon from '@material-ui/icons/Adjust';

import SecurityRole, { SecurityMessages } from '../SecurityRole'

const DRAG_MIME_TYPE = 'application/cypher-workbench';

const Sizes = {
    TitleBarHeight: '2.5em',
}

var dragBlockKey = null;

const NewBlockZone = ({ expanded, newItemName }) => {
    return (
        <div className='selectedBackground'>
            <div style={{
                marginLeft: '1.3em', marginTop: '.2em', marginBottom: (expanded) ? '-.8em' : '0em',
            }}>
                {`New ${newItemName} goes here`}
            </div>
        </div>
    )                    
}

const DropZone = ({ position, blockKey, moveAccordionPanel }) => {

    const [dragOverActive, setDragOverActive] = useState(false)
    return (
        <div className={'cypherDropZone'}
            style={{
                background: (dragOverActive) ? 'orange' : '#EEE',
                width: '100%',
                height: (dragOverActive) ? '35px' : '5px'
            }}
            onDragLeave={e => setDragOverActive(false)}
            onDrop={e => {
                setDragOverActive(false);
                if (dragBlockKey !== blockKey) {
                    dragBlockKey = e.dataTransfer.getData(DRAG_MIME_TYPE);
                    moveAccordionPanel(dragBlockKey, blockKey, position);
                }
            }}
            onDragOver={e => {
                const isWorkbench = e.dataTransfer.types.includes(DRAG_MIME_TYPE);                                                
                if (isWorkbench) {
                    e.preventDefault();
                    setDragOverActive(true);
                }
            }}
        /> 
    )
}

export default class AccordionBlock extends Component {

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
        e.stopPropagation();
        if (SecurityRole.canEdit()) {
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
            removeAccordionPanel, parentBuilder
        } = this.props;
        const title = this.getBlockTitle();

        const prompt = `Would you like to delete section '${title}'?`;
        parentBuilder.showGeneralDialog('Delete Section', prompt, [{
                text: 'Yes',
                onClick: (button, index) => {
                    removeAccordionPanel();
                    parentBuilder.closeGeneralDialog();
                },
                autofocus: false
            },
            {
                text: 'No',
                onClick: (button, index) => parentBuilder.closeGeneralDialog(),
                autofocus: true
            }]
        );
    }

    componentDidMount = () => {
        const { 
            domId, scrollIntoView, parentBuilder
        } = this.props;

        if (scrollIntoView) {
            var domElement = document.getElementById(domId);
            var detailsDomElement = document.getElementById(`${domId}_accordionDetails`);
            parentBuilder.scrollIntoView({ domElement, detailsDomElement });
        }
    }

    render () {
        var { 
            blockKey, domId, expanded, selected, noneSelected, children, newItemName,
            firstBlock, lastBlock, parentBuilder, rightWidthOffset,
            showToggleTool, toggleAccordionPanel, moveAccordionPanel, selectAccordionPanel,
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
            <div id={domId} className={className} onClick={selectAccordionPanel} 
                style={{
                    marginTop:marginTop,
                }}
            >
                {(addMode && selected) && 
                    <NewBlockZone expanded={expanded} newItemName={newItemName}/>
                }
                {!addMode && 
                    <DropZone position='before' blockKey={blockKey} moveAccordionPanel={moveAccordionPanel}/>
                }
                <Accordion expanded={expanded} 
                    onChange={() => { if (!titleBeingEdited) { toggleAccordionPanel() }}}
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
                            draggable={!titleBeingEdited} onDragStart={(e) => {
                                //console.log('drag start: ', e);
                                //console.log(e.clientX, e.clientY, e.pageX, e.pageY);
                                this.dragStartCoords = { x: e.clientX, y: e.clientY };
                                this.currentScrollTop = parentBuilder.getScrollTop(); 
                                e.dataTransfer.setData(DRAG_MIME_TYPE, `${blockKey}`);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.dropEffect = "move";
                                dragBlockKey = blockKey;
                            }}
                            onDrag={(e) => {
                                // are we scrolling up or down?
                                var scrollTop = parentBuilder.getScrollTop();
                                if (e.clientY < this.dragStartCoords.y) {
                                    // scrolling up
                                    if (scrollTop > 0) {
                                        if (e.clientY < 90) {
                                            parentBuilder.scrollPane(-10);
                                        } else if (e.clientY < 110) {
                                            parentBuilder.scrollPane(-5);
                                        }
                                    }
                                } else {
                                    // scrolling down
                                    const stopScrollingHeight = parentBuilder.getPageSize() - 200;
                                    if (e.clientY < stopScrollingHeight) {
                                        if (e.clientY > window.innerHeight - 20) {
                                            parentBuilder.scrollPane(-5);
                                        } else if (e.clientY > window.innerHeight) {
                                            parentBuilder.scrollPane(-10);
                                        }
                                    }
                                }
                            }}
                            onDragEnd={(e) => {
                                if (e.dataTransfer.dropEffect === 'none') {
                                    // cancelled drop
                                    parentBuilder.setScrollTop(this.currentScrollTop);
                                }
                                //console.log('drag end: ', e);
                                //console.log(e.clientX, e.clientY, e.pageX, e.pageY);
                            }}
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
                                <Tooltip enterDelay={600} arrow title="Click to Select Panel">
                                    <CropFreeIcon style={{ fontSize: '1.3em', marginTop: '.1em'}} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectAccordionPanel();
                                        }}/>
                                </Tooltip>
                                <div style={{height: '1em', width: '1em'}}/>
                                {(expanded) 
                                    ? <ExpandLessIcon/> 
                                    : <ExpandMoreIcon />
                                }
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
                            </div>
                        </div>
                    </AccordionSummary>
                    <AccordionDetails id={`${domId}_accordionDetails`}>
                        {children}
                    </AccordionDetails>
                </Accordion>
                {(!addMode && lastBlock) && 
                    <DropZone position='after' blockKey={blockKey} moveAccordionPanel={moveAccordionPanel}/>                
                }
                {/*(addMode && lastBlock && noneSelected) && 
                    <NewBlockZone expanded={false}/>
                */}
            </div>
        )
    }
}