import React, { Component } from 'react'
import {
    FormControl,
    TextField
} from '@material-ui/core';

import ComboBox from '../../../../components/common/ComboBox';
import CustomChips from '../../../../components/common/CustomChips';

import SecurityRole from '../../../common/SecurityRole';
import { ORDER_DIRECTION, SimpleOrderByItem } from '../../../../dataModel/cypherOrderBy';

const ORDER_DIRECTION_ICONS = {
    SORT_UP: 'sort-up',
    SORT_DOWN: 'sort-down'
}

export default class ReturnOrOrderByItems extends Component {

    emptyComboValue = {label: '', data: {}};

    state = {
        insertIndex: -1,
        selectedKey: null,
        variable: '',
        comboValue: this.emptyComboValue,
        chips: [],
        data: {}
    };

    constructor (props) {
        super(props);
        this.chipsRef = React.createRef();
    }

    getChipFromDataItem = (dataItem, keyPrefix) => {
        //console.log('getChipFromDataItem dataItem', dataItem);
        var backgroundColor = dataItem.getColor();
        var fontColor = dataItem.getFontColor();
        if (backgroundColor === fontColor) {
            backgroundColor = 'white';
        }
        if (dataItem.key === undefined) {
            console.log(`keyPrefix ${keyPrefix}, dataItem: `, dataItem);
            alert('dataItem.key is undefined');
            throw new Error('dataItem.key is undefined');
        }

        return {
            // need keyPrefix because using just Node1, Node2, etc keys causes React to cache chips by that key
            key: keyPrefix + '_' + dataItem.key,    
            keyNoPrefix: dataItem.key,
            backgroundColor: backgroundColor,
            textColor: fontColor,
            fontSize: '1em',
            toggleSelect: true,
            text: dataItem.getText(),
            icons: this.getIcons(dataItem.dataItem),
            canDelete: () => this.canEdit(),
            canEdit: () => this.canEdit(),
            data: dataItem
        }
    }

    getSortIconName = (dataItem) => (dataItem.getOrderDirection() === ORDER_DIRECTION.ASC) ? 
                                ORDER_DIRECTION_ICONS.SORT_UP : ORDER_DIRECTION_ICONS.SORT_DOWN;            

    getSortIconMarginTop = (iconName) => (iconName === ORDER_DIRECTION_ICONS.SORT_UP) ? '.3em' : '-.1em';                                

    onOrderBySortClick = (orderByItem) => (e, chipKey, index) => {
        e.stopPropagation();
        var newOrderDirection = (orderByItem.getOrderDirection() === ORDER_DIRECTION.ASC) ? 
                                                ORDER_DIRECTION.DESC : ORDER_DIRECTION.ASC;            
        this.updateSortIcon(orderByItem, newOrderDirection, chipKey, index);
    }

    updateSortIcon = (orderByItem, orderDirection, chipKey, index) => {
        var { editHelper } = this.props;
        editHelper.setOrderByItemSort(orderByItem, orderDirection); 
        
        var newIconName = this.getSortIconName(orderByItem);            
        var newIconState = {
            iconName: newIconName,
            style: this.getIconStyle(orderByItem),
            onClick: this.onOrderBySortClick(orderByItem)
        }
        this.changeIconState(chipKey, newIconState, index);
    }

    getIconStyle = (dataItem) => {
        var iconName = this.getSortIconName(dataItem);    
        var marginTop = this.getSortIconMarginTop(iconName);                    
        return {
            marginLeft: '.1em', 
            marginTop: marginTop,
            marginRight: '.1em',
            fontSize: '1.3em'
        }
    }

    getSortIcon = (dataItem) => {
        var iconName = this.getSortIconName(dataItem);    
        var iconStyle = this.getIconStyle(dataItem);
        return {
            iconName: iconName,
            style: iconStyle,
            onClick: this.onOrderBySortClick(dataItem)
        }                           
    }

    getIcons = (dataItem) => {
        if (dataItem instanceof SimpleOrderByItem) {
            var sortIcon = this.getSortIcon(dataItem);
            return [sortIcon];
        } else {
            return [];
        }
    }

    changeIconState = (chipKey, newIconState, iconIndex) => {
        var { chips } = this.state;
        var chipIndex = chips.findIndex(x => x.key === chipKey);
        if (chipIndex !== -1) {
            var chipToModify = chips[chipIndex];
            var chipIcons = chipToModify.icons;
            var newIcons = chipIcons.slice();
            newIcons[iconIndex] = newIconState;

            var newChip = { 
                ...chipToModify,
                icons: newIcons
            };

            var newChips = chips.slice();
            newChips.splice(chipIndex,1,newChip);
    
            this.setState({
                chips: newChips
            }, () => {
                if (this.chipsRef.current) {
                    // because when icons are updated the key is not, the chips won't redraw
                    this.chipsRef.current.reRenderIcons();
                }
            })
        }
    }

    setData (data) {
        var chips = data.dataItems.map(dataItem => this.getChipFromDataItem(dataItem, data.key));
        //console.log('chips: ', chips);
        this.setState({
            data: data,
            chips: chips
        }, () => {
            if (this.chipsRef.current) {
                // because when text is updated the key is not, the chips won't redraw
                this.chipsRef.current.reRender();
            }
            
        });
    }

    addItem (dataItem) {
        var { data, chips, insertIndex } = this.state;

        var chip = this.getChipFromDataItem(dataItem, data.key);
        var newChips = chips.slice();

        if (insertIndex === -1) {
            newChips.push(chip);
        } else {
            newChips.splice(insertIndex,0, chip);
        }
        this.saveChips(newChips);
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

    canEdit = () => {
        return SecurityRole.canEdit();
        //return true;
    }

    saveChips = (chips, onSuccess) => {
        var { editHelper } = this.props;
        this.setState({
            chips: chips
        }, () => {
            this.updateChipSelection();
        });
        editHelper.saveChips(chips, onSuccess);
    }

    addChip = (chipData) => {
        var { data, chips, insertIndex } = this.state;
        var { editHelper } = this.props;        

        if (!editHelper.itemExists(chipData.dataItem)) {
            chips = chips.slice();
            var newChip = this.getChipFromDataItem(chipData, data.key);
            if (insertIndex === -1) {
                chips.push(newChip);
            } else {
                chips.splice(insertIndex,0, newChip);
            }
            this.saveChips(chips);
        }
        return chips;
    }

    onChipTextEdit = (chip, newText) => {
        if (this.canEdit()) {
            var reRender = false;
            var { chips } = this.state;
            var { editHelper, onFinishEditing } = this.props;
            const isValid = editHelper.validateEditedText(chip.data, newText);
            if (isValid) {
                chip.data.setText(newText);
                var updatedText = chip.data.getText();
                if (updatedText !== newText) {
                    var chipIndex = chips.findIndex(x => x === chip);
                    if (chipIndex > -1) {
                        reRender = true;
                        chips[chipIndex].text = updatedText;
                    }
                }
                if (onFinishEditing) { onFinishEditing(chips) }
            } else {
                if (onFinishEditing) { onFinishEditing(chips) }
                return true;    // cancel edit
            }

            if (reRender) {
                if (this.chipsRef.current) {
                    // because when text is updated the key is not, the chips won't redraw
                    this.chipsRef.current.reRender();
                }
            }
        }
        return false;   // don't cancel edit
    }

    updateChipSelection = (selectedChip, isSelected) => {
        var { chips } = this.state;
        if (!selectedChip) {
            // other operations like deleting and inserting can change the index
            var { selectedKey } = this.state;
            this.setState({
                insertIndex: (selectedKey) ? chips.findIndex(chip => chip.key === selectedKey) : -1
            });
        } else {
            this.setState({
                insertIndex: (isSelected) ? chips.findIndex(chip => chip.key === selectedChip.key) : -1,
                selectedKey: (isSelected) ? selectedChip.key : null
            });
        }
    }

    onChipSelect = (selectedChip, isSelected) => {
        if (this.canEdit()) {
            this.updateChipSelection(selectedChip, isSelected);
        }
    }

    onChipDelete = (chipToDelete) => {
        //alert("deleting chip");
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
            //console.log(`setComboValue: ${JSON.stringify(value)}`);

            var data = undefined;
            if (typeof(value) === 'string') {
                data = editHelper.getNewItem(value);
            } else {
                data = value.data;
            }
            editHelper.handleItemKey(data.dataItem);  // ensures there is a key if not present
            data.key = data.dataItem.key;
            const chips = this.addChip(data);
            this.setState({
                chips: chips,
                comboValue: this.emptyComboValue
            });
        }
    }

    render () {
        var { editHelper } = this.props;
        var { getConfig, performSearch, comboBoxActive } = editHelper;
        var { variable, comboValue, chips, insertIndex } = this.state;
        var { displayLabel } = getConfig();

        variable = (variable) ? variable: '';

        return (
            <div style={{marginBottom: '5px', marginTop: '-1.2em'}} >
            <form>
            <FormControl style={{ display: 'flex', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em' }}>
                <div style={{ display: 'flex', flexFlow: 'row' }}>   
                    {(comboBoxActive()) && 
                        <ComboBox search={performSearch} 
                            label={displayLabel} 
                            style={{
                                minWidth: '12em',
                                width: '12em', 
                                marginTop: '5px',
                                marginRight: '.5em'
                            }}
                            displayProp={'label'} 
                            value={comboValue}
                            setValue={this.setComboValue} />
                    }

                    <CustomChips 
                        ref={this.chipsRef}
                        additionalStyle={{
                            marginTop: '1em', 
                            marginRight: '5px'   
                        }}                    
                        chips={chips} 
                        insertIndex={insertIndex}
                        editFirstChip={false}
                        selectMode='single'
                        onTextEdit={this.onChipTextEdit}
                        onSelect={this.onChipSelect}
                        onDelete={this.onChipDelete}
                    />                        
                </div>
            </FormControl>
            </form>
            </div>
        )
    }
}
