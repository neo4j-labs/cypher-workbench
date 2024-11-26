
import React, { Component } from 'react';

import {
    Button, TextField, Tooltip, Typography
} from '@material-ui/core';

import SearchableChips from '../../../../components/common/SearchableChips';
import SecurityRole from '../../../common/SecurityRole';
import CustomChips from '../../../../components/common/CustomChips';
import { OutlinedStyledButton, StyledButton } from '../../../../components/common/Components';
import { ALERT_TYPES } from '../../../../common/Constants';

const KEY_PREFIX = 'indexProperties';

export default class PropertyIndexes extends Component {

    state = {
        insertPosition: -1,
        propertyDefinitions: [],
        propertyContainer: {},
        editIndexPropertyDefinitions: [],
        indexName: '',
        indexes: [],
        editIndexChips: [],
        selectedKey: null
    };

    constructor (props) {
        super(props);
        this.propertiesRef = React.createRef();
        this.chipsRef = React.createRef();
    }

    setPropertyContainer = (propertyContainer) => {
        var propertyDefinitions = [];
        if (propertyContainer && propertyContainer.properties) {
            propertyDefinitions = Object.keys(propertyContainer.properties)
                .map(key => propertyContainer.properties[key])
                .filter(propertyDefinition => propertyDefinition.name); // name must exist and not be null or ''

            propertyDefinitions.sort((a,b) => (a.name === b.name) ? 0 
                                            : (a.name > b.name) ? 1 : -1 )
                
        }
        //console.log(propertyDefinitions);
        var stateProperties = {
            propertyDefinitions: propertyDefinitions,
            propertyContainer: propertyContainer,
            editIndexChips: [],
            editIndexPropertyDefinitions: [],
            indexName: '',
            insertPosition: -1,
            selectedKey: null,
            indexes: (propertyContainer && propertyContainer.getIndexes) ? propertyContainer.getIndexes() : []
        }

        this.setState(stateProperties, () => this.setPropertyChips());

    }

    getDataItemForPropertyDefinition = (propertyDefinition) => {
        return {
            key: propertyDefinition.key,
            propertyDefinition: propertyDefinition,
            getText: () => propertyDefinition.name, 
            getFontColor: () => 'black',
            getColor: () => 'white',
            matches: (searchText) => {
                if (searchText) {
                    return propertyDefinition.name.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                } else {
                    return true;
                }
            }
        }
    }

    setPropertyChips = () => {
        if (this.propertiesRef.current) {
            var { propertyDefinitions } = this.state;
            var dataItems = [];
            if (propertyDefinitions) {
                dataItems = propertyDefinitions.map(propertyDefinition => this.getDataItemForPropertyDefinition(propertyDefinition));
            }

            var data = {
                key: KEY_PREFIX,
                dataItems: dataItems
            }
            this.propertiesRef.current.setData(data);
            setTimeout(() => {
                this.propertiesRef.current.reRender();
            }, 100);
        }
    }

    addIndexItem = (propertyDefinition) => {
        var { editIndexChips, insertPosition, editIndexPropertyDefinitions } = this.state;
        var dataItem = this.getDataItemForPropertyDefinition(propertyDefinition);
        var chip = this.getChipFromDataItem(dataItem, KEY_PREFIX);
        var newChips = editIndexChips.slice();

        var newIndexPropertyDefinitions = editIndexPropertyDefinitions.slice();
        if (insertPosition === -1) {
            newChips.push(chip);
            newIndexPropertyDefinitions.push(propertyDefinition);
        } else {
            newChips.splice(insertPosition, 0, chip);
            newIndexPropertyDefinitions.splice(insertPosition, 0, propertyDefinition);
        }

        this.setState({
            editIndexPropertyDefinitions: newIndexPropertyDefinitions
        });

        this.saveChips(newChips);
    }

    getChipFromDataItem = (dataItem, keyPrefix) => {
        console.log('getChipFromDataItem dataItem', dataItem);
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
            canDelete: true,
            canEdit: false,
            data: dataItem
        }
    }

    saveChips = (editIndexChips, wasDeleted) => {
        this.setState({
            editIndexChips: editIndexChips
        }, () => {
            this.updateChipSelection(null, null, wasDeleted);
        });
    }

    setValue = (e) => {
        if (SecurityRole.canEdit()) {
            const mapKey = (e.target.id) ? e.target.id : e.target.name;
            const value = e.target.value;
            if (this.state[mapKey] != value) {
                this.setState({
                    [mapKey]: value
                });
            }
        }
    }
    
    addIndexItemIfNotExists = (propertyDefinition) => {
        var { editIndexPropertyDefinitions } = this.state;

        var match = editIndexPropertyDefinitions.find(x => x.key === propertyDefinition.key);
        if (!match) {
            this.addIndexItem(propertyDefinition);
        }
    }

    onPropertyChipClick = (chip) => {
        console.log('property chip click: ', chip);
        var propertyDefinition = chip.data.propertyDefinition;
        this.addIndexItemIfNotExists(propertyDefinition);
    }

    onChipTextEdit = (chip, newText) => null;

    updateChipSelection = (selectedChip, isSelected, selectedKeyDeleted) => {
        var { editIndexChips } = this.state;
        if (!selectedChip) {
            // other operations like deleting and inserting can change the index
            var selectedKey = (selectedKeyDeleted) ? null : this.state.selectedKey;
            this.setState({
                insertPosition: (selectedKey) ? editIndexChips.findIndex(chip => chip.key === selectedKey) : -1,
                selectedKey: selectedKey
            });
        } else {
            this.setState({
                insertPosition: (isSelected) ? editIndexChips.findIndex(chip => chip.key === selectedChip.key) : -1,
                selectedKey: (isSelected) ? selectedChip.key : null
            });
        }
    }

    onChipSelect = (selectedChip, isSelected) => {
        if (SecurityRole.canEdit()) {
            this.updateChipSelection(selectedChip, isSelected, false);
        }
    }

    onChipDelete = (chipToDelete) => {
        if (SecurityRole.canEdit()) {
            var { editIndexPropertyDefinitions } = this.state;

            var index = editIndexPropertyDefinitions.indexOf(chipToDelete.data.propertyDefinition);
            if (index >= 0) {
                var newIndexPropertyDefinitions = editIndexPropertyDefinitions.slice();
                newIndexPropertyDefinitions.splice(index,1);
                this.setState({
                    editIndexPropertyDefinitions: newIndexPropertyDefinitions
                });

                var { editIndexChips } = this.state;
                var chip = editIndexChips.find(chip => chip.key === chipToDelete.key);
                if (chip) {
                    var chipsCopy = editIndexChips.slice(0);
                    chipsCopy.splice(chipsCopy.indexOf(chip),1);
    
                    this.saveChips(chipsCopy, true);
                }
            }
        }
    }

    addIndex = () => {
        var { indexes, indexName, propertyContainer, editIndexPropertyDefinitions } = this.state;
        var { dataModel } = this.props;

        if (editIndexPropertyDefinitions.length >= 2) {
            var newIndex = {
                indexName: indexName,
                propertyDefinitionKeys: editIndexPropertyDefinitions.map(x => x.key)
            }

            // ensure an index with the same name does not already exist
            if (indexName && dataModel.getAllCompositeIndexNames().includes(indexName)) {
                alert(`A composite index with name '${indexName}' already exists`, ALERT_TYPES.WARNING);
                return;
            }

            var match = indexes.find(index => {
                var indexPropertyKeys = index.propertyDefinitionKeys.join(',');
                var newPropertyKeys = newIndex.propertyDefinitionKeys.join(',');
                return indexPropertyKeys === newPropertyKeys;
            });
            if (match) {
                alert("A composite index with those properties already exists", ALERT_TYPES.WARNING);
                return;
            } else {
                var newIndexes = indexes.slice();
                newIndexes.push(newIndex);
                propertyContainer.addIndex(newIndex);
                this.setState({
                    insertPosition: -1,
                    editIndexPropertyDefinitions: [],
                    indexName: '',
                    editIndexChips: [],
                    selectedKey: null,
                    indexes: newIndexes
                })
            }
        } else {
            alert("Composite indexes must have 2 or more properties", ALERT_TYPES.WARNING);
        }
    }

    removeIndex = (arrayIndex) => {
        var { indexes, propertyContainer } = this.state;
        var newIndexes = indexes.slice();
        var removedIndex = newIndexes.splice(arrayIndex,1)[0];
        propertyContainer.removeIndex(removedIndex);
        this.setState({
            indexes: newIndexes
        })
    }

    render () {
        const { editIndexChips, insertPosition, indexName, indexes, propertyContainer } = this.state;
        return (
            <div>
                <div style={{display:'flex', marginTop: '3px'}}>
                    <div style={{marginTop: '1em', fontWeight: 500, width: '12em'}}>Available Properties:</div>
                    <SearchableChips 
                        ref={this.propertiesRef}
                        style={{marginTop: '-.7em'}}
                        onChipClick={this.onPropertyChipClick}
                        noValueMessage={'No properties'}
                        displaySearch={true}
                        additionalStyle={{
                            overflowY: 'auto', 
                            height: '2.6em',
                            marginTop: '1em', 
                            marginRight: '5px'                                            
                        }}
                    />                        
                </div>
                <div style={{display:'flex', marginTop:'2px'}}>
                    <div style={{fontWeight: 500, width: '12em', marginTop:'3px'}}>New Index Properties:</div>

                    <TextField id="indexName" label="Index Name" value={indexName}
                                autoComplete='off'
                                onChange={this.setValue}
                                margin="dense" style={{marginRight: '.5em', marginTop: '-1em'}}/>

                    <div style={{marginTop: '-1.4em', minWidth:'20em'}}>
                        <CustomChips 
                                ref={this.chipsRef}
                                additionalStyle={{
                                    marginTop: '1em', 
                                    marginRight: '5px'   
                                }}                    
                                chips={editIndexChips} 
                                insertIndex={insertPosition}
                                editFirstChip={false}
                                noValueMessage={'No properties selected'}
                                selectMode='single'
                                onTextEdit={this.onChipTextEdit}
                                onSelect={this.onChipSelect}
                                onDelete={this.onChipDelete}
                            />    
                    </div>
                    <OutlinedStyledButton style={{marginTop:'-.15em', height: '2.5em'}} onClick={this.addIndex}>
                        <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> Add Index
                    </OutlinedStyledButton>
                </div>
                <div style={{borderTop: '1px solid lightgray', paddingTop: '10px'}}>
                    <Typography variant='h6'>Composite indexes</Typography>
                    {indexes.length > 0 ? 
                        indexes.map((neoIndex, i) => {
                            var indexProperties = neoIndex.propertyDefinitionKeys
                                .map(key => propertyContainer.properties[key])
                                .filter(propertyDefinition => propertyDefinition)
                                .map(propertyDefinition => propertyDefinition.name)
                                .join(', ');

                            return <div key={i} style={{display:'flex', marginTop: '3px'}}>
                                <div style={{minWidth: '8em'}}>
                                    <strong>{(neoIndex.indexName) ? neoIndex.indexName : '<unnamed>'}</strong> 
                                </div>
                                <div style={{minWidth: '16em'}}>
                                    <strong></strong> {indexProperties}
                                </div>
                                <div>
                                    {SecurityRole.canEdit() &&
                                        <Tooltip enterDelay={600} arrow title="Delete Index">
                                            <Button color={'primary'} style={{marginLeft: '1em'}} onClick={() => this.removeIndex(i)}>
                                                <span className="fa fa-trash"/>
                                            </Button>
                                        </Tooltip>
                                    }
                                </div>
                            </div>
                        })
                        :
                        <div style={{color: 'gray', fontStyle: 'italic', marginTop: '.5em', marginRight: '1em'}}>
                            No composite indexes
                        </div>
                    }
                </div>
            </div>
        )
    }
}


