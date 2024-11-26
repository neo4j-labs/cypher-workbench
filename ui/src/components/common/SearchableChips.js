import React, { Component } from 'react'
import {
    FormControl,
    TextField
} from '@material-ui/core';

import CustomChips from './CustomChips';

export default class SearchableChips extends Component {

    state = {
        chips: [],
        data: {}
    };

    constructor (props) {
        super(props);
        this.chipsRef = React.createRef();
    }

    componentDidMount () {
        const { data } = this.props;
        this.setData(data);
    }

    reRender () {
        if (this.chipsRef.current) {
            this.chipsRef.current.reRender();
        }
    }

    getChipFromDataItem = (dataItem, keyPrefix) => {
        //console.log('getChipFromDataItem dataItem', dataItem);
        var backgroundColor = dataItem.getColor();
        var fontColor = dataItem.getFontColor();

        return {
            // need keyPrefix because using just Node1, Node2, etc keys causes React to cache chips by that key
            //  and the data for isPrimary is not honored even though I am creating new objects
            key: keyPrefix + '_' + dataItem.key,    
            keyNoPrefix: dataItem.key,
            backgroundColor: backgroundColor,
            textColor: fontColor,
            canDelete: false,
            canEdit: false,
            fontSize: '1em',
            text: dataItem.getText(),
            data: dataItem
        }
    }    

    // data needs to of the format:
    /*
    {
        key: '123',
        dataItems: [
            {
                key: '234',
                getText: () => { // implementation },
                getFontColor: () => { // implementation },
                getColor: () => { // implementation },
                matches: (searchText) => { // implementation }
            }
        ]
    }
    */
    setData (data) {
        //console.log('Searchable chips data: ', data)
        if (data) {
            var chips = data.dataItems.map(dataItem => this.getChipFromDataItem(dataItem, data.key));
            //console.log('Searchable chips chips: ', chips)
            this.setState({
                data: data,
                chips: chips
            })
        }
    }

    setSearchValue = (e) => {
        const value = e.target.value;
        if (this.state.searchText !== value) {
            this.setState({
                searchText: value
            });
        }
    }

    render () {
        var { searchText, chips } = this.state;
        var { onChipClick, displaySearch, additionalStyle, searchBoxWidth, style, noValueMessage } = this.props;
        style = style || {};
        
        searchBoxWidth = (searchBoxWidth) ? searchBoxWidth : '8em';
        if (!additionalStyle) {
            additionalStyle = {
                overflowY: 'auto', 
                height: '2.6em', 
                minWidth: '800px',
                marginTop: '1em', 
                marginRight: '5px'                                            
            }
        }
        var filteredChips = (searchText) ? chips.filter(chip => chip.data.matches(searchText)) : chips;
        //console.log('SearchableChips style: ', style);
        return (
            <div style={{...style, marginBottom: '5px'}} >
            <form>
            <FormControl style={{ display: 'flex', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em' }}>
                <div style={{ display: 'flex', flexFlow: 'row' }}>   
                    {displaySearch &&
                        <TextField id="chip_search" label="Search" 
                            autoComplete="off"
                            value={searchText}
                            onChange={this.setSearchValue}
                            onKeyPress={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                } 
                              }}
                  
                            margin="dense" style={{marginRight: '.5em', width: searchBoxWidth, minWidth: searchBoxWidth}}/>
                    }
                    <CustomChips 
                        ref={this.chipsRef}
                        chips={filteredChips} 
                        onClick={onChipClick}
                        selectMode='single'
                        noValueMessage={noValueMessage}
                        onSelect={() => {}}
                        additionalStyle={additionalStyle}
                    />                        
                </div>
            </FormControl>
            </form>
            </div>
        )
    }
}
