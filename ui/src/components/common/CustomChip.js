import React, { Component } from 'react'

import {
    TextField
} from '@material-ui/core';

import EditIcon from '@material-ui/icons/Edit';
import CancelIcon from '@material-ui/icons/Cancel';
import { CHIP_CLICK_BEHAVIOR } from './CustomChips';

export default class CustomChip extends Component {

    state = {
        key: '',
        hovering: false,
        childHovering: false,
        childHoveringTimeout: null,
        canDelete: true,
        canEdit: true,
        editMode: false,
        backgroundColor: 'green',
        textColor: 'white',
        fontSize: '1.1em',
        height: '2em',
        text: '',
        previousText: '',
        icons: [],
        selected: false,
        finishEditInProgess: false
    };

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.chipEditFocus = this.utilizeFocus();
    }

    componentDidMount () {

        var stateObj = { ...this.props };
        stateObj.icons = (stateObj.icons) ? stateObj.icons : [];

        this.setState(stateObj, () => {
            if (this.props.requestEditMode) {
                this.delayedEditText();
            }
        });
    }

    setChipColor = (backgroundColor, textColor) => {
        this.setState({
            backgroundColor: backgroundColor, 
            textColor: textColor
        })
    }

    toggleSelect = () => {
        const { selected } = this.state;
        const { onSelect } = this.props;
        const isSelected = !selected;
        this.setState({
            selected: isSelected
        });
        if (onSelect) {
            onSelect(isSelected);
        }
    }

    selectChip = () => {
        const { selected } = this.state;
        const { onSelect } = this.props;
        if (!selected) {
            const { onSelect } = this.props;
            this.setState({
                selected: true
            })
            if (onSelect) {
                onSelect(true);
            }
        }
    }

    deselectChip = () => {
        const { selected } = this.state;
        if (selected) {
            this.setState({
                selected: false
            })
        }
    }

    onClick = () => {
        const { onClick, clickBehavior, toggleSelect } = this.props;
        switch (clickBehavior) {
            case CHIP_CLICK_BEHAVIOR.Both:
                if (toggleSelect) {
                    this.toggleSelect();        
                } else {
                    this.selectChip();        
                }
                onClick();
                break; 
            case CHIP_CLICK_BEHAVIOR.Click:
                onClick();
                break; 
            case CHIP_CLICK_BEHAVIOR.Select:
                if (toggleSelect) {
                    this.toggleSelect();        
                } else {
                    this.selectChip();        
                }
                break; 
        }
    }

    delayedEditText = () => {
        setTimeout(() => this.editText(), 150);
    }

    editText = () => {
        const { text } = this.state;
        if (this.checkIfCanEdit()) {
            this.setState({
                previousText: text,
                editMode: true
            }, () => {
                this.chipEditFocus.setFocus();        
            });
        }
    }

    cancelEdit = () => {
        const { parentSetFocus } = this.props;
        const { previousText } = this.state;
        this.setState({
            text: previousText,
            editMode: false,
            finishEditInProgess: false
        }, () => {
            if (parentSetFocus) { parentSetFocus(); }
        });
    }

    finishEdit = () => {
        const { parentSetFocus } = this.props;
        const { text, previousText, finishEditInProgess } = this.state;
        if (finishEditInProgess) {
            return;
        }
        this.setState({
            finishEditInProgess: true
        }, () => {
            var cancelEdit = false;
            if (text !== previousText) {
                cancelEdit = this.props.onTextEdit(text);
            }
            console.log('cancelEdit: ' + cancelEdit);
            if (cancelEdit) {
                const { previousText } = this.state;
                this.setState({
                    text: previousText,
                    finishEditInProgess: false                    
                });
            } else {
                this.setState({
                    previousText: '',
                    editMode: false,
                    finishEditInProgess: false
                }, () => {
                    if (parentSetFocus) { parentSetFocus(); }
                });
            } 
        })
    }

    setValue = (e) => {
        const value = e.target.value;
        if (this.state.text !== value) {
            this.setState({
                text: value
            });
        }
    }

    startHovering = () => {
        var { childHoveringTimeout } = this.state;
        if (childHoveringTimeout) {
            clearTimeout(childHoveringTimeout);
            this.setState({
                childHoveringTimeout: null
            })
        }
        this.setState({hovering: true});
    }

    stopHovering = () => {
        var { childHoveringTimeout } = this.state;
        if (childHoveringTimeout) {
            clearTimeout(childHoveringTimeout);
            this.setState({
                childHoveringTimeout: null
            });
        }
        var timerId = setTimeout(() => {
            const { childHovering } = this.state;
            if (!childHovering) {
                this.setState({hovering: false});
            }
        }, 50);
        
        this.setState({
            childHoveringTimeout: timerId
        })
    }

    closeHoverItems = () => {
        this.setState({
            childHoveringTimeout: null,
            hovering: false,
            childHovering: false
        });
    }

    setText = (newText) => {
        var { text } = this.state;
        if (text !== newText) {
            this.setState({
                text: newText
            })
        }
    }

    setIcons = (newIcons) => {
        this.setState({
            icons: newIcons
        })
    }

    checkIfCanEdit = () => {
        var { canEdit } = this.state;
        if (typeof(canEdit) === 'function') {
            return canEdit();
        } else {
            return canEdit;
        }
    }

    checkIfCanDelete = () => {
        var { canDelete } = this.state;
        if (typeof(canDelete) === 'function') {
            return canDelete();
        } else {
            return canDelete;
        }
    }

    render () {
        var { backgroundColor, textColor, fontSize, height, text, icons, selected,
                    editMode, hovering } = this.state;
        var { chipKey, displayInsertPoint } = this.props;                    
        var className = (selected) ? 'chipSelected' : 'chip';
        text = (text) ? text : '';

        return (
            <div style={{display:'flex'}}>  
                {displayInsertPoint &&
                    <div className='fa fa-angle-up' style={{
                        width: '5px',
                        marginLeft: '-.2em',
                        marginTop: '1.6em',
                        color: 'orange'
                    }}/>
                }
                <div className={className} style={{
                        backgroundColor: backgroundColor, 
                        color: textColor,
                        fontSize: fontSize,
                        height: height
                    }} 
                    onClick={this.onClick} onDoubleClick={this.editText}
                    onMouseOver={this.startHovering} 
                    onMouseOut={this.stopHovering}
                >
                    {(editMode) ?
                        <TextField style={{
                                marginTop: '-0.1em', 
                                paddingLeft: '5px', 
                                marginRight: '3px',
                            }}
                            InputProps={{
                                style: {
                                    color: textColor
                                }
                            }}
                            value={text}
                            inputRef={this.chipEditFocus.ref}
                            onMouseOver={() => this.setState({childHovering: true})} 
                            onMouseOut={() => this.setState({childHovering: false})} 
                            onKeyPress={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    this.finishEdit();
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    this.cancelEdit();
                                }
                            }}
                            onChange={this.setValue} onBlur={this.finishEdit}
                            margin="dense"/>
                        :
                        <>
                            <div style={{paddingLeft: '5px', marginRight: '3px'}}
                                    onMouseOver={() => this.setState({childHovering: true})} 
                                    onMouseOut={() => this.setState({childHovering: false})} 
                            >
                                {text}
                            </div>
                            <>
                                {icons.map((icon, index) => 
                                        <div key={index} 
                                            style={icon.style}
                                            className={`fa fa-${icon.iconName}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                icon.onClick(e, chipKey, index)
                                            }}
                                        ></div>
                                    )
                                }
                            </>
                            {(this.checkIfCanEdit()) &&
                                <EditIcon fontSize="small" style={{
                                        width: (hovering) ? '1em' : '0em'                                    
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.editText();
                                    }} 
                                    onMouseOver={() => this.setState({childHovering: true})} 
                                    onMouseOut={() => this.setState({childHovering: false})} 
                                />
                            }
                            {(this.checkIfCanDelete()) && 
                                <CancelIcon fontSize="small" style={{
                                        width: (hovering) ? '1em' : '0em'                                    
                                    }}
                                    onClick={this.props.onDelete}
                                    onMouseOver={() => this.setState({childHovering: true})} 
                                    onMouseOut={() => this.setState({childHovering: false})} 
                                />
                            }
                        </>                    
                    }
                </div>
            </div>
        )
    }
}
