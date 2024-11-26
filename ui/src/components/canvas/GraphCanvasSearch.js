import React, { Component } from 'react';
import {
    IconButton, TextField, Tooltip
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import SearchIcon from '@material-ui/icons/Search';

export default class GraphCanvasSearch extends Component {

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
                var node = match[1];
                var relationship = match[2];
                var endNodeText = match[3];
                performSearch('Relationship', node, relationship, endNodeText);
            } else {
                performSearch('Node', value);
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
        var { left, top, dataProvider } = this.props;
        var { showDropdown } = this.state;

        var options = [];
        if (dataProvider) {
            options = dataProvider.getNodeArray()
                .map(x => dataProvider.getNodeDisplayText(x))
                .concat(dataProvider.getRelationshipArray()
                    .map(x => {
                        var type = (x.type) ? x.type : '';
                        var startLabel = (x.getStartNode()) ? dataProvider.getNodeDisplayText(x.getStartNode()): '';
                        var endLabel = (x.getEndNode()) ? dataProvider.getNodeDisplayText(x.getEndNode()): '';
                        return (startLabel + '-' + type + '->' + endLabel);
                    }));
            options = (options) ? options : [];
            left = (showDropdown) ? left : left + 200;
        }

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
