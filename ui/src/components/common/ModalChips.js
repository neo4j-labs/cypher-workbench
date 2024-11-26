
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import CloseIcon from '@material-ui/icons/Close';

import SearchableChips from './SearchableChips';

export const Portal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body)
}

export default class ModalChips extends Component {

    state = {
        sizingDefaults: {
            modalHeight: 26,
            pixelsPerChar: 5,
            minWidth: 150,
            maxWidth: 550,
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
        open: false
    };

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }    

    constructor (props) {
        super(props);
        this.searchableChipsRef = React.createRef();
        this.popupDivFocus = this.utilizeFocus();
    }

    open = (canvasDimensions, popupPosition, expectedTextLength, data) => {
        if (this.searchableChipsRef.current) {
            this.searchableChipsRef.current.setData(data);
        }

        this.setState({
            canvasDimensions: canvasDimensions,
            popupPosition: popupPosition,
            expectedTextLength: expectedTextLength,
            open: true
        });
    }

    close = () => {
        this.handleClose();
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    render () {
        const { chips, canvasDimensions, popupPosition, open, 
                expectedTextLength, sizingDefaults
        } = this.state;
        var { onChipClick, displaySearch } = this.props;

        var computedWidth = expectedTextLength * sizingDefaults.pixelsPerChar + sizingDefaults.addNodeLabelWidth;
        computedWidth = (computedWidth < sizingDefaults.minWidth) ? sizingDefaults.minWidth :  computedWidth;
        computedWidth = (computedWidth > sizingDefaults.maxWidth) ? sizingDefaults.maxWidth :  computedWidth;

        var backgroundStyle = {
            position: 'absolute',
            display: (open) ? 'block' : 'none',
            opacity: 0.2,
            background: 'gray',
            zIndex: 1000,
            //left: canvasDimensions.x,
            //top: canvasDimensions.y,
            //width: canvasDimensions.width,
            //height: canvasDimensions.height
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight
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
                        <SearchableChips 
                            ref={this.searchableChipsRef}
                            onChipClick={onChipClick}
                            displaySearch={displaySearch}
                            additionalStyle={{
                                overflowY: 'scroll', 
                                height: '5em', 
                                fontSize: '1.1em',
                                maxWidth: `${sizingDefaults.maxWidth}px`,
                                marginTop: '1em', 
                                marginRight: '5px'                                            
                            }}
                        />                        
                </div>
            </Portal>
        )
    }
}


