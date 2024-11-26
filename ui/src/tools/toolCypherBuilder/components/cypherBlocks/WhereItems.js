import React, { Component } from 'react'

import CustomChips from '../../../../components/common/CustomChips';
import SecurityRole from '../../../common/SecurityRole';

export default class WhereItems extends Component {

    emptyComboValue = {label: '', data: {}};

    state = {
        insertIndex: -1,
        selectedKey: null,
        comboValue: this.emptyComboValue,
        selectedChip: null,
        whereClause: null,
        chips: [],
        data: {}
    };

    constructor (props) {
        super(props);
        this.chipsRef = React.createRef();
    }

    componentDidMount () {
    }

    getChipFromDataItem = (dataItem, keyPrefix) => {
        console.log('getChipFromDataItem dataItem', dataItem);
        var backgroundColor = dataItem.getColor();
        var fontColor = dataItem.getFontColor();
        if (backgroundColor === fontColor) {
            backgroundColor = 'white';
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
            canDelete: () => this.canEdit(),
            //canEdit: this.canEdit(),
            canEdit: false,
            data: dataItem
        }
    }

    setData (data, whereClause) {
        var chips = data.dataItems.map(dataItem => this.getChipFromDataItem(dataItem, data.key));

        this.setState({
            whereClause: whereClause,
            data: data,
            chips: chips
        }, () => {
            if (this.chipsRef.current) {
                // because when text is updated the key is not, and the chips won't redraw
                this.chipsRef.current.reRender();
            }
            
        })
    }

    addWhereItem (whereDataItem) {
        var { data, chips, insertIndex } = this.state;

        //var dataItem = whereClauseComponent.getDataItemForWhereItem(whereDataItem);
        //var chip = this.getChipFromDataItem(dataItem, data.key);
        var chip = this.getChipFromDataItem(whereDataItem, data.key);

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
        var { saveChips } = this.props;
        this.setState({
            chips: chips
        }, () => {
            this.updateChipSelection();
        });
        
        saveChips(chips, onSuccess);
    }

    addChip = (chipData) => {
        var { data, chips, insertIndex } = this.state;

        chips = chips.slice();
        var newChip = this.getChipFromDataItem(chipData, data.key);
        if (insertIndex === -1) {
            chips.push(newChip);
        } else {
            chips.splice(insertIndex,0, newChip);
        }
        
        this.saveChips(chips);

        return chips;
    }

    onChipTextEdit = (chip, newText) => {
        if (this.canEdit()) {
        }
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

    render () {
        var { chips, insertIndex } = this.state;

        return (
            <div style={{marginBottom: '5px', marginTop: '-1.2em', display: 'flex', flexFlow: 'row'}} >
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
        )
    }
}
