import React, { Component } from 'react'
import {
    FormControl,
    TextField
} from '@material-ui/core';

import ComboBox from './ComboBox';
import CustomChips from './CustomChips';

import SecurityRole from '../../tools/common/SecurityRole';
import { ALERT_TYPES } from '../../common/Constants';

export default class VariableLabelsAndTypes extends Component {

    emptyComboValue = {label: '', object: {}};

    state = {
        variable: '',
        variableLengthStart: '', 
        variableLengthEnd: '',
        existingVariableLengthStart: '', 
        existingVariableLengthEnd: '',
        comboValue: this.emptyComboValue,
        selectedChip: null,
        chips: [],
        data: {}
    };

    // from https://stackoverflow.com/questions/28889826/set-focus-on-input-after-render -and-
    // https://stackoverflow.com/questions/37949394/how-to-set-focus-to-a-materialui-textfield
    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.chipsRef = React.createRef();
        this.variableFocus = this.utilizeFocus();
    }

    componentDidMount () {
        this.setState({
            variable: this.props.variable,  // TODO: change variable as needed, not currently implemented this way
            existingVariableValue: this.props.variable
        }, () => {
            this.variableFocus.setFocus();
        })
    }

    getChipFromDataItem = (dataItem, keyPrefix) => {
        //console.log('getChipFromDataItem dataItem', dataItem);
        var backgroundColor = dataItem.getColor();
        var fontColor = dataItem.getFontColor();
        if (backgroundColor === fontColor) {
            backgroundColor = 'white';
        }

        var data = dataItem.getData();
        if (data === null || data === undefined) {
            console.log('dataItem.getData is null or undefined', dataItem);
            alert('dataItem.getData is null or undefined');
        }

        return {
            // need keyPrefix because using just Node1, Node2, etc keys causes React to cache chips by that key
            //  and the data for isPrimary is not honored even though I am creating new objects
            key: keyPrefix + '_' + dataItem.key,    
            keyNoPrefix: dataItem.key,
            backgroundColor: backgroundColor,
            textColor: fontColor,
            fontSize: '1.1em',
            text: dataItem.getText(),
            canDelete: this.canEdit() && dataItem.canDelete(),
            canEdit: this.canEdit(),
            isPrimary: dataItem.isPrimary(),
            data: data
        }
    }

    setData (data) {
        //console.log("setData: VariableLabelsAndTypes");
        //console.log("data: ", data);
        const { editFirstChip } = this.props;

        var allData = [];
        if (editFirstChip || (data.key && data.getText() !== null)) {
            allData = [data];
        } 
        
        var allData = allData.concat(data.getSecondaryData());
        //console.log("allData: ", allData);
        var chips = allData
            // filter: unless editFirstChip, will not display getText() if '', null, or undefined
            .filter((dataItem,index) => (index === 0 && editFirstChip || dataItem.getText()))
            .map(dataItem => this.getChipFromDataItem(dataItem, data.key));

        this.setState({
            variable: data.variable,
            variableLengthStart: data.variableLengthStart,
            variableLengthEnd: data.variableLengthEnd,
            existingVariableValue: data.variable,
            existingVariableLengthStart: data.variableLengthStart,
            existingVariableLengthEnd: data.variableLengthEnd,
            data: data,
            chips: chips
        })
    }

    setIsOpen (isOpen) {
        const { editFirstChip, displayVariable } = this.props;
        if (this.chipsRef.current && editFirstChip && isOpen) {
            this.chipsRef.current.editFirstChip();
        } else if (displayVariable && isOpen) {
            setTimeout(() => this.variableFocus.setFocus(), 150);            
        }
    }

    setValue = (e) => {
        if (this.canEdit()) {
            const mapKey = (e.target.id) ? e.target.id : e.target.name;
            const value = e.target.value;
            if (this.state[mapKey] != value) {
                this.setState({
                    [mapKey]: value
                });
            }
        }
    }

    setRangeValue = (type) => (e) => {
        if (this.canEdit()) {
            const mapKey = (e.target.id) ? e.target.id : e.target.name;
            var currentValue = this.state[mapKey];
            var newValue = e.target.value;

            if (newValue) {
                if (type === 'start') {
                    // match *, *2, 2, etc
                    const match = newValue.match(/^[\*\d]\d*$/);
                    if (!match) {
                        newValue = currentValue;
                    }
                } else if (type === 'end') {
                    // match just numbers
                    const match = newValue.match(/^\d+$/);
                    if (!match) {
                        newValue = currentValue;
                    }
                }
            }

            if (currentValue !== newValue) {
                this.setState({
                    [mapKey]: newValue
                });
            }
        }
    }

    saveVariable = () => {
        if (this.canEdit()) {
            var { editHelper } = this.props;
            var { variable, existingVariableValue } = this.state;
            if (variable !== existingVariableValue) {
                editHelper.saveVariable(variable, existingVariableValue);
            }
        }
    }

    saveRange = () => {
        if (this.canEdit()) {
            var { editHelper } = this.props;
            var { variableLengthStart, variableLengthEnd,
                existingVariableLengthStart, existingVariableLengthEnd } = this.state;
            if ((variableLengthStart !== existingVariableLengthStart
                    || variableLengthEnd !== existingVariableLengthEnd)
                    && editHelper.saveRange) {
                editHelper.saveRange({
                    variableLengthStart: variableLengthStart, 
                    variableLengthEnd: variableLengthEnd
                });
            }
        }
    }

    canEdit = () => {
        return SecurityRole.canEdit();
    }

    saveChips = (chips, onSuccess) => {
        var { editHelper } = this.props;
        var primaryChip = chips.find(chip => chip.isPrimary);
        var secondaryChips = chips.filter(chip => !chip.isPrimary);
        var secondaryLabelsAndTypes = secondaryChips
            .map(chip => chip.data)
            .filter(data => data);  // get rid of null and undefined

        var primaryChipData = (primaryChip) ? primaryChip.data : null;
        editHelper.saveLabelsAndTypes(primaryChipData, secondaryLabelsAndTypes, onSuccess);
    }

    addChip = (dataItem) => {
        var { data, chips } = this.state;
        var chip = chips.find(chip => chip.keyNoPrefix === dataItem.key);
        if (chip) {
            chip.data = dataItem.getData();
        } else {
            chips.push(this.getChipFromDataItem(dataItem, data.key));
        }
        this.saveChips(chips);
        return chips;
    }

    onChipTextEdit = (chip, newText) => {
        if (this.canEdit()) {
            if (!newText) {
                alert('Text cannot be empty', ALERT_TYPES.WARNING);
                return true;
            } else {
                var { chips } = this.state;
                var { editHelper, onFinishEditing } = this.props;
                const isValid = editHelper.validateEditedText(chip.data, newText);
                if (isValid) {
                    chip.data.setText(newText);
                    if (onFinishEditing) { onFinishEditing(chips) }
                } else {
                    if (onFinishEditing) { onFinishEditing(chips) }
                    return true;    // cancel edit
                }
            }
        }
        return false;   // don't cancel edit
    }

    onChipSelect = (chip, isSelected) => {
        if (this.canEdit()) {
            var { chips } = this.state;
            var chip = chips.find(chip => chip.key === chip.key);
            this.setState({
                selectedChip: chip
            });
            if (chip) {
                // TODO: switch the color
            }
        }
    }

    onChipDelete = (chipToDelete) => {
        if (this.canEdit()) {
            var { chips } = this.state;
            var chip = chips.find(chip => chip.key === chipToDelete.key);
            if (chip) {
                var chipsCopy = chips.slice(0);
                chipsCopy.splice(chipsCopy.indexOf(chip),1);

                this.saveChips(chipsCopy, () => {
                    chips.splice(chips.indexOf(chip),1);
                    this.setState({
                        chips: chips
                    });
                });
            }
        }
    }

    setComboValue = (value) => {
        if (!value) {
            return;
        }
        if (this.canEdit()) {
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
            const chips = this.addChip(dataItem);
            this.setState({
                chips: chips,
                comboValue: this.emptyComboValue
            });
        }
    }

    render () {
        var { editHelper, editFirstChip, displayVariable, displayRange, modalClose } = this.props;
        var { getLabelsAndTypesConfig, performSearch, comboBoxActive } = editHelper;
        var { variable, variableLengthStart, variableLengthEnd, comboValue, chips } = this.state;
        var { displayLabel } = getLabelsAndTypesConfig();

        variable = (variable) ? variable: '';
        variableLengthStart = (variableLengthStart) ? variableLengthStart : '';
        variableLengthEnd = (variableLengthEnd) ? variableLengthEnd : '';

        return (
            <div style={{marginBottom: '5px'}} >
            <form>
            <FormControl style={{ display: 'flex', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em' }}>
                <div style={{ display: 'flex', flexFlow: 'row' }}>   
                    {displayVariable && 
                        <TextField id="variable" label="Variable" value={variable}
                            inputRef={this.variableFocus.ref}
                            onChange={this.setValue} onBlur={this.saveVariable}
                            onKeyPress={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    //this.saveVariable(); // shouldn't need this because it should be call onBlur
                                    if (modalClose) modalClose();
                                }
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    const { existingVariableValue } = this.state;
                                    this.setState({
                                        variable: existingVariableValue
                                    }, () => {
                                        if (modalClose) modalClose();
                                    });
                                }
                            }}
                            margin="dense" style={{marginRight: '.5em'}}/>
                    }
                    <CustomChips 
                        additionalStyle={{
                            marginTop: '1em', 
                            marginRight: '5px'   
                        }}                    
                        ref={this.chipsRef}
                        chips={chips} 
                        editFirstChip={editFirstChip}
                        onTextEdit={this.onChipTextEdit}
                        onSelect={this.onChipSelect}
                        onDelete={this.onChipDelete}
                        parentSetFocus={this.props.parentSetFocus}                        
                    />                        
                    {(comboBoxActive()) && 
                        <ComboBox search={performSearch} 
                        label={displayLabel} 
                        style={{
                            width: '12em', 
                            marginTop: '5px',
                            marginRight: '.5em'
                        }}
                        displayProp={'label'} 
                        value={comboValue}
                        parentSetFocus={this.props.parentSetFocus}                        
                        setValue={this.setComboValue} />
                    }
                    {displayRange && 
                        <div style={{display:'flex', 
                                flexFlow: 'row',
                                alignItems: 'flex-end',
                                marginBottom: '.3em',
                                marginLeft: '.5em'
                        }}>
                            <span style={{color:'gray', marginBottom: '.5em'}}>Range</span>
                            <TextField id="variableLengthStart" label="" value={variableLengthStart}
                                onChange={this.setRangeValue('start')} onBlur={this.saveRange}
                                inputProps={{style: { textAlign: 'center' }}}
                                onKeyPress={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        if (modalClose) modalClose();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        this.setState({
                                            variableLengthStart: this.state.existingVariableLengthStart
                                        }, () => {
                                            if (modalClose) modalClose();
                                        });
                                    }
                                }}
                                margin="dense" style={{width: '2em', marginLeft: '.5em'}}/>
                            <span style={{
                                color:'gray',
                                paddingRight: '5px',
                                paddingLeft: '5px'
                            }}>..</span>
                            <TextField id="variableLengthEnd" label="" value={variableLengthEnd}
                                onChange={this.setRangeValue('end')} onBlur={this.saveRange}
                                inputProps={{style: { textAlign: 'center' }}}
                                onKeyPress={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        if (modalClose) modalClose();
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        event.preventDefault();
                                        this.setState({
                                            variableLengthEnd: this.state.existingVariableLengthEnd
                                        }, () => {
                                            if (modalClose) modalClose();
                                        });
                                    }
                                }}
                                margin="dense" style={{width: '2em', marginRight: '.75em'}}/>
                        </div>
                    }
                </div>
            </FormControl>
            </form>
            </div>
        )
    }
}
