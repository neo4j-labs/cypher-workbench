
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import CloseIcon from '@material-ui/icons/Close';

import VariableLabelsAndTypes from './VariableLabelsAndTypes';

export const Portal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body)
}

export default class ModalVariableLabelsAndTypes extends Component {

    state = {
        sizingDefaults: {
            modalHeight: 26,
            pixelsPerChar: 5,
            minWidth: 150,
            addNodeLabelWidth: 80
        },
        expectedTextLength: 0,
        canvasDimensions: {
            x: 0,
            y: 0,
            width: 2000,
            height: 2000
        },
        popupPosition: {
            x: 400,
            y: 200
        },
        open: false,
        displayRange: false
    };

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.variableLabelAndTypesRef = React.createRef();
        this.popupDivFocus = this.utilizeFocus();
    }

    open = (canvasDimensions, popupPosition, expectedTextLength, data, displayRange) => {
        if (this.variableLabelAndTypesRef.current) {
            this.variableLabelAndTypesRef.current.setData(data);
            this.variableLabelAndTypesRef.current.setIsOpen(true);
        }

        this.setState({
            canvasDimensions: canvasDimensions,
            popupPosition: popupPosition,
            expectedTextLength: expectedTextLength,
            open: true,
            displayRange: (typeof(displayRange) === 'boolean') ? displayRange : false
        });
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    setFocus = () => {
        this.popupDivFocus.setFocus();  
    }

    onFinishEditing = (chips) => {
        if (chips.length <= 1) {
            this.handleClose();
        }
    }

    render () {
        var { editHelper, displayVariable, editFirstChip } = this.props;
        var { displayRange } = this.state;
        editFirstChip = (editFirstChip === undefined) ? true : editFirstChip;
        const { canvasDimensions, popupPosition, open, 
                expectedTextLength, sizingDefaults
        } = this.state;

        var computedWidth = expectedTextLength * sizingDefaults.pixelsPerChar + sizingDefaults.addNodeLabelWidth;
        computedWidth = (computedWidth < sizingDefaults.minWidth) ? sizingDefaults.minWidth :  computedWidth;

        var backgroundStyle = {
            position: 'absolute',
            display: (open) ? 'block' : 'none',
            opacity: 0.2,
            background: 'gray',
            zIndex: 1000,
            left: canvasDimensions.x,
            top: canvasDimensions.y,
            width: canvasDimensions.width,
            height: canvasDimensions.height
        };

        var popupStyle = {
            position: 'absolute',
            display: (open) ? 'flex' : 'none', 
            zIndex: 1300,
            background: 'rgba(255,255,255,0.85)', 
            border: '1px solid black',
            left: popupPosition.x - computedWidth / 2,
            top: popupPosition.y + 10
        };
        //console.log('canvasDimensions: ', canvasDimensions);
        //console.log('popupStyle: ', popupStyle);

        return (
            <Portal>
                <div style={backgroundStyle} onClick={this.handleClose}> 
                </div>
                <div style={popupStyle} onClick={(event) => event.preventDefault()}
                    tabIndex="0"
                    ref={this.popupDivFocus.ref}
                    onKeyPress={(event) => {
                        if (event.key === "Enter") {
                            if (document.activeElement === this.popupDivFocus.ref.current) {
                                this.handleClose();
                            }
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            this.handleClose();
                        }
                    }}
                >
                        <CloseIcon fontSize="small" 
                            style={{cursor: 'pointer'}}
                            onClick={this.handleClose} />
                        <VariableLabelsAndTypes 
                            ref={this.variableLabelAndTypesRef}
                            displayVariable={displayVariable}
                            displayRange={displayRange}
                            editFirstChip={editFirstChip}
                            parentSetFocus={this.setFocus}
                            editHelper={editHelper}
                            modalClose={this.handleClose}
                            onFinishEditing={this.onFinishEditing}
                        />
                </div>
            </Portal>
        )
    }
}


