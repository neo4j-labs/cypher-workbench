
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import CloseIcon from '@material-ui/icons/Close';
import {
    TextField
} from '@material-ui/core';
import ComboBox from './ComboBox';
import { css } from 'emotion'

export const Portal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body)
}

export default class ModalRelationship extends Component {

    emptyComboValue = {label: '', object: {}};

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
        startNodeComboValue: this.emptyComboValue,
        endNodeComboValue: this.emptyComboValue,
        relationshipType: ''
    };

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.relationshipTypeFocus = this.utilizeFocus();
        this.popupDivFocus = this.utilizeFocus();
    }

    open = (canvasDimensions, popupPosition, expectedTextLength, data) => {

        const { relationshipType } = data;
        
        var { editHelper } = this.props;
        editHelper.setPrimaryPropertyContainer({
            classType: 'RelationshipType',
            key: ''
        });     

        // TODO: set startNodeComboValue and endNodeComboValue

        this.setState({
            canvasDimensions: canvasDimensions,
            popupPosition: popupPosition,
            expectedTextLength: expectedTextLength,
            open: true,
            startNodeComboValue: this.emptyComboValue,
            endNodeComboValue: this.emptyComboValue,
            relationshipType: relationshipType
        }, () => {
            this.setFocus();
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

    setRelationshipTypeValue = (e) => {
        this.setState({
            relationshipType: e.target.value
        });
    }

    setComboValue = (stateKey) => (value) => {
        if (!value) {
            return;
        }
        var { editHelper } = this.props;
        console.log(`setComboValue: ${JSON.stringify(value)}`);

        var dataItem = undefined;
        if (typeof(value) === 'string' || (value.label === value.data)) {
            value = (value.label) ? value.label : value;
            dataItem = editHelper.findLabelOrType(value);
            if (!dataItem) {
                dataItem = editHelper.getNewLabelOrType(value);
            }
        } else {
            dataItem = editHelper.getDataItem(value.data);
            //data = value.data;
        }
        this.setState({
            [stateKey]: dataItem
        });
    }

    getLabelForComboValue = (comboValue) => {
        var label = '';
        if (comboValue.getText) {
            label = comboValue.getText();
        } else if (comboValue.label) {
            label = comboValue.label;
        }
        return label;
    }

    saveAndClose = () => {
        const { addRelationship } = this.props;
        const { startNodeComboValue, endNodeComboValue, relationshipType } = this.state;
        if (addRelationship) {
            const startLabel = this.getLabelForComboValue(startNodeComboValue);
            const endLabel = this.getLabelForComboValue(endNodeComboValue);
            addRelationship(startLabel, relationshipType, endLabel);
        } else {
            alert('function addRelationship is not implemented');
        }
        this.handleClose();
    }

    render () {
        var { editHelper } = this.props;
        var { performSearch } = editHelper;        
        const { canvasDimensions, popupPosition, open, 
                expectedTextLength, sizingDefaults, 
                startNodeComboValue, endNodeComboValue, relationshipType
        } = this.state;

        const buttonStyle = css`
            border: 2px solid #2E8CC1;
            background: white;
            height: 2em;
            margin-left: 2px;
            margin-bottom: 2px;
            margin-top: 1.5em;
            margin-right: 0.5em;            
            cursor: pointer;
            padding: 3px;
            padding-left: 5px;
            padding-right: 5px;
            font-weight: 500;
            text-transform: uppercase;
        `        

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
            //background: 'rgba(255,255,255,0.85)', 
            background: '#fff',
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

                        <ComboBox search={performSearch} 
                            label={'Start Node Label'} 
                            style={{
                                width: '12em', 
                                marginTop: '5px',
                                marginRight: '.5em'
                            }}
                            displayProp={'label'} 
                            value={startNodeComboValue}
                            parentSetFocus={this.props.parentSetFocus}                        
                            setValue={this.setComboValue('startNodeComboValue')} />

                        <TextField id="modalRelationshipType" label="Relationship Type" value={relationshipType}
                            inputRef={this.relationshipTypeFocus.ref}
                            onChange={this.setRelationshipTypeValue} 
                            onKeyPress={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    //this.saveRelationshipType(); // shouldn't need this because it should be call onBlur
                                    this.saveAndClose();
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    const { relationshipType } = this.state;
                                    this.setState({
                                        relationshipType: relationshipType
                                    }, () => {
                                        this.handleClose();
                                    });
                                }
                            }}
                            margin="dense" style={{marginRight: '.5em'}}/>

                        <ComboBox search={performSearch} 
                            label={'End Node Label'} 
                            style={{
                                width: '12em', 
                                marginTop: '5px',
                                marginRight: '.5em'
                            }}
                            displayProp={'label'} 
                            value={endNodeComboValue}
                            setValue={this.setComboValue('endNodeComboValue')} />
                        <div className={buttonStyle} onClick={this.saveAndClose}>
                            Add
                        </div>
                </div>
            </Portal>
        )
    }
}


