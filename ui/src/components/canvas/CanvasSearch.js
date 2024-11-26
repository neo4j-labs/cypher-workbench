import React, { Component } from 'react';
import {
    FormControl, IconButton, InputLabel, InputAdornment, OutlinedInput,
    TextField, Tooltip
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import SearchIcon from '@material-ui/icons/Search';

export default class CanvasSearch extends Component {

    state = {
        showDropdown: false
    }

    utilizeFocus = () => {
    	const ref = React.createRef();
    	const setFocus = () => { ref.current && ref.current.focus() };
    	return {ref: ref, setFocus: setFocus};
    }

    constructor (props) {
        super(props);
        this.searchFocus = this.utilizeFocus();
    }

    setValue = (value) => {
        const { clearSearch, performSearch } = this.props;
        if (value === null) {
            clearSearch();
        } else {
            var match = value.match(/(.*)-(.*)->(.*)/);
            if (match) {
                var nodeLabel = match[1];
                var relationshipType = match[2];
                var endNodeLabelText = match[3];
                performSearch('RelationshipType', nodeLabel, relationshipType, endNodeLabelText);
            } else {
                performSearch('NodeLabel', value);
            }
        }
        this.setState({
            showDropdown: false
        })
    }

    toggleSearch = () => {
        this.setState({
            showDropdown: !this.state.showDropdown
        }, () => {
            if (this.state.showDropdown) {
                setTimeout(() => this.searchFocus.setFocus(), 200);
            }
        });
    }

    render () {
        var { left, top, dataModel } = this.props;
        var { showDropdown } = this.state;
        var options = dataModel.getNodeLabelArray()
                                .map(x => x.label)
                                .concat(dataModel.getRelationshipTypeArray()
                                    .map(x => {
                                        var type = (x.type) ? x.type : '';
                                        var startLabel = (x.startNodeLabel) ? x.startNodeLabel.label: '';
                                        var endLabel = (x.endNodeLabel) ? x.endNodeLabel.label: '';
                                        return (startLabel + '-' + type + '->' + endLabel);
                                    }));
        options = (options) ? options : [];
        left = (showDropdown) ? left : left + 200;

        return (
            <div style={{display:'inline-block', position: 'absolute', left: left, top: top}} className={'noselect'}>
                {(showDropdown) &&
                    <Autocomplete style={{width:'200px', float: 'left'}}
                        id="canvas-search"
                        options={options}
                        onChange={(event, value) => this.setValue(value)}
                        autoHighlight={true}
                        freeSolo
                        renderInput={params => (
                            <TextField {...params} inputRef={this.searchFocus.ref} style={{background: '#FAFAFA'}} label="Search" fullWidth />
                        )}
                      />
                }
                <Tooltip enterDelay={600} arrow title="Search In Model">
                    <IconButton style={{float:'right'}} aria-label="search within model" edge="end" onClick={this.toggleSearch}>
                      <SearchIcon />
                    </IconButton>
                </Tooltip>
            </div>
        );
    }
}
