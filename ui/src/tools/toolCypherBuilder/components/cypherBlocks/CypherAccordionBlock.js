import React, { Component, useState } from 'react'

import {
    Tooltip, Typography
} from '@material-ui/core';

import {
    ALERT_TYPES,
} from '../../../../common/Constants';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import CropFreeIcon from '@material-ui/icons/CropFree';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import CloseIcon from '@material-ui/icons/Close';
import PaletteIcon from '@material-ui/icons/PaletteOutlined';
import { AddControl } from '../AddControl';
import SecurityRole, { SecurityMessages } from '../../../common/SecurityRole';

const DRAG_MIME_TYPE = 'application/cypher-workbench';

const Sizes = {
    TitleBarHeight: '2.5em',
}

var dragBlockKey = null;

const NewBlockZone = ({ expanded }) => {
    return (
        <div className='selectedBackground'>
            <div style={{
                marginLeft: '1.3em', marginTop: '.2em', marginBottom: (expanded) ? '-.8em' : '0em',
            }}>
                New block goes here
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
                    var dragBlockKey = e.dataTransfer.getData(DRAG_MIME_TYPE);
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

export default class CypherAccordionBlock extends Component {

    constructor (props) {
        super(props);
        this.dragStartCoords = { x: 0, y: 0 };
        this.currentScrollTop = 0;
    }

    state = {
        isSelected: false,
        addButtonOpen: false
    }

    promptRemoveAccordionPanel = () => {
        const { 
            title, removeAccordionPanel, cypherBuilder
        } = this.props;

        const prompt = `Would you like to delete section '${title}'?`;
        cypherBuilder.showGeneralDialog('Delete Section', prompt, [{
                text: 'Yes',
                onClick: (button, index) => {
                    removeAccordionPanel();
                    cypherBuilder.closeGeneralDialog();
                },
                autofocus: false
            },
            {
                text: 'No',
                onClick: (button, index) => cypherBuilder.closeGeneralDialog(),
                autofocus: true
            }]
        );
    }

    componentDidMount = () => {
        const { 
            domId, scrollIntoView, cypherBuilder
        } = this.props;

        if (scrollIntoView) {
            var domElement = document.getElementById(domId);
            var detailsDomElement = document.getElementById(`${domId}_accordionDetails`);
            cypherBuilder.scrollIntoView({ domElement, detailsDomElement });
        }
    }

    render () {
        var { 
            blockKey, domId, expanded, selected, noneSelected, title, children, 
            firstBlock, lastBlock, cypherBuilder, rightWidthOffset,
            showToggleTool, toggleAccordionPanel, moveAccordionPanel, selectAccordionPanel,
            addMode, dataProvider
        } = this.props;

        const cypher = (dataProvider && dataProvider.getCypher) ? dataProvider.getCypher() : '';

        // TODO: implement the toggle tool
        showToggleTool = false;

        var className = (selected) ? 'accordionPanelSelected' : 'accordionPanel';
        const marginTop = (firstBlock)
            ?  (addMode) 
                ? '1em' 
                : '.3em'
            : '0em';

        //console.log('addMode: ', addMode);
        //console.log('CypherAccordionBlock expanded: ', expanded);
        return (
            <div id={domId} className={className} onClick={selectAccordionPanel} 
                style={{
                    marginTop:marginTop,
                }}
            >
                {(addMode && selected) && 
                    <NewBlockZone expanded={expanded}/>
                }
                {!addMode && 
                    <DropZone position='before' blockKey={blockKey} moveAccordionPanel={moveAccordionPanel}/>
                }
                <Accordion expanded={expanded} 
                    onChange={toggleAccordionPanel}
                    onClick={(e) => e.stopPropagation()}
                    style={{width: `calc(100% - ${rightWidthOffset}px)`}}
                >
                    <AccordionSummary style={{background: '#E9E9E9', height: Sizes.TitleBarHeight, minHeight: Sizes.TitleBarHeight}}
                        aria-controls={blockKey}
                        id={blockKey}
                    >
                        <div style={{display: 'flex', justifyContent: 'flex-start', flexFlow: 'row', width: '100%', padding: '5px'}} 
                            draggable={true} onDragStart={(e) => {
                                //console.log('drag start: ', e);
                                //console.log(e.clientX, e.clientY, e.pageX, e.pageY);
                                this.dragStartCoords = { x: e.clientX, y: e.clientY };
                                this.currentScrollTop = cypherBuilder.getScrollTop(); 
                                e.dataTransfer.setData(DRAG_MIME_TYPE, `${blockKey}`);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.dropEffect = "move";
                                dragBlockKey = blockKey;
                            }}
                            onDrag={(e) => {
                                // are we scrolling up or down?
                                var scrollTop = cypherBuilder.getScrollTop();
                                if (e.clientY < this.dragStartCoords.y) {
                                    // scrolling up
                                    if (scrollTop > 0) {
                                        if (e.clientY < 90) {
                                            cypherBuilder.scrollPane(-10);
                                        } else if (e.clientY < 110) {
                                            cypherBuilder.scrollPane(-5);
                                        }
                                    }
                                } else {
                                    // scrolling down
                                    const stopScrollingHeight = cypherBuilder.getPageSize() - 200;
                                    if (e.clientY < stopScrollingHeight) {
                                        if (e.clientY > window.innerHeight - 20) {
                                            cypherBuilder.scrollPane(-5);
                                        } else if (e.clientY > window.innerHeight) {
                                            cypherBuilder.scrollPane(-10);
                                        }
                                    }
                                }
                            }}
                            onDragEnd={(e) => {
                                if (e.dataTransfer.dropEffect === 'none') {
                                    // cancelled drop
                                    cypherBuilder.setScrollTop(this.currentScrollTop);
                                }
                                //console.log('drag end: ', e);
                                //console.log(e.clientX, e.clientY, e.pageX, e.pageY);
                            }}
                        >
                            <Typography style={{
                                flex: '0 0 10em'
                            }}>{title}</Typography>
                            <Typography style={{
                                color: 'gray',
                                fontStyle: 'italic',
                                flex: '1 1 auto',
                                maxWidth: '40em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>{cypher}</Typography>
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
                {(addMode && lastBlock && noneSelected) && 
                    <NewBlockZone expanded={false}/>
                }
            </div>
        )
    }
}