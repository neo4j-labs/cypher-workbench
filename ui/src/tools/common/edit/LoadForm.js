import React, { Component } from 'react'
import {
    Button, Dialog, DialogTitle, DialogActions, DialogContent,
    FormControl, IconButton, InputLabel, InputAdornment, MenuItem, OutlinedInput,
    Select, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';

import GeneralDialog from '../../../components/common/GeneralDialog';
import { StyledButton } from '../../../components/common/Components';
import { USER_ROLE } from '../../../common/Constants';
import ShowMoreLessHelper from './showMoreLessHelper';

const ORDER_BY_KEYS = {
    DATE_UPDATED_ASC: 'DATE_UPDATED_ASC',
    DATE_UPDATED_DESC: 'DATE_UPDATED_DESC',
    TITLE_ASC: 'TITLE_ASC',
    TITLE_DESC: 'TITLE_DESC'
}

export const SORT_OPTIONS = {
    DATE_UPDATED_ASC: 'Date Updated (Earliest)',
    DATE_UPDATED_DESC: 'Date Updated (Latest)',
    TITLE_ASC: 'Title (A - Z)',
    TITLE_DESC: 'Title (Z - A)'
}

const ORDER_BY_PARAMS = {
    DATE_UPDATED_ASC: { myOrderBy: 'dateUpdated', orderDirection: 'ASC' },
    DATE_UPDATED_DESC: { myOrderBy: 'dateUpdated', orderDirection: 'DESC' },
    TITLE_ASC: { myOrderBy: 'title', orderDirection: 'ASC' },
    TITLE_DESC: { myOrderBy: 'title', orderDirection: 'DESC' },
}

const DEFAULT_MAX_TEXT_LENGTH = 512;

export default class LoadForm extends Component {

    closeGeneralDialog = () => {
        this.setState({ generalDialog: { ...this.state.generalDialog, open: false }});
    }

    state = {
        generalDialog: {
            open: false,
            handleClose: this.closeGeneralDialog,
            title: '',
            description: '',
            buttons: []
        },
        searchText: '',
        myOrderBy: ORDER_BY_KEYS.DATE_UPDATED_DESC,
        showMoreKeys: []    // for limiting display of text
    }

    constructor (props) {
        super(props);

        var { headers, dateFields, multiValuedKeys, booleanKeys, allowOnlyTitleSortOption } = props;
        if (!headers) {
            headers = {
                title: 'Title',
                isPublic: 'Public',
                dateUpdated: 'Date Updated',
                description: 'Description',
                owners: 'Owners',
                customers: 'Customers',
                tags: 'Tags'
            }
        }
        if (!dateFields) {
            dateFields = ['dateCreated', 'dateUpdated'];
        }
        if (!multiValuedKeys) {
            multiValuedKeys = ['customers','owners','tags'];
        }
        if (!booleanKeys) {
            booleanKeys = ['isPublic', 'isInstanceModel']
        }

        this.allowedSortOptions = { ...SORT_OPTIONS };
        if (allowOnlyTitleSortOption) {
            delete this.allowedSortOptions[ORDER_BY_KEYS.DATE_UPDATED_ASC];
            delete this.allowedSortOptions[ORDER_BY_KEYS.DATE_UPDATED_DESC];
            this.state.myOrderBy = ORDER_BY_KEYS.TITLE_ASC;
        }

        this.limitTextForKey = this.props.limitTextForKey;
        this.showMoreLessHelper = new ShowMoreLessHelper({
            getState: () => this.state,
            setState: (newState) => this.setState(newState),
            maxDisplayLength: (this.props.maxTextLength) ? this.props.maxTextLength : DEFAULT_MAX_TEXT_LENGTH,
            showMoreKeysStateKey: 'showMoreKeys'
        });

        this.headers = headers;
        this.dateFields = dateFields;
        this.multiValuedKeys = multiValuedKeys;
        this.booleanKeys = booleanKeys;
        this.modelInfoKeys = Object.keys(headers);
        this.showActions = (typeof(props.showActions) === 'boolean') ? props.showActions : true;
    }

    load = (graphDocMetadata) => {
        //console.log('LoadModelForm: load: ' + JSON.stringify(modelInfo));
        //this.props.onClose({ justCloseForDebugging: true });
        this.props.load(graphDocMetadata);
    }

    cancel = () => {
        this.props.cancel();
    }

    showDeleteDialog = (event, key) => {
        //console.log(event);
        event.stopPropagation();
        var { generalDialog } = this.state;
        var { metadataMap } = this.props;
        const { toolHumanName } = this.props;

        this.setState({
            generalDialog: {
                ...generalDialog,
                open: true,
                title: `Delete ${toolHumanName}`,
                description: "Do you want to delete '" + metadataMap[key].title + "'?",
                buttons: [{
                    text: 'Yes',
                    onClick: (button, index) => {
                        this.props.delete(key);
                        this.closeGeneralDialog();
                    },
                    autofocus: false
                },
                {
                    text: 'No',
                    onClick: (button, index) => this.closeGeneralDialog(),
                    autofocus: true
                }]
            }
        });
    }

    formatMultiValue = (key, value) => {
        if (value && value.length > 0) {
            var propName;
            switch (key) {
                case 'owners':
                    propName = 'email';
                    break;
                case 'tags':
                    propName = 'tag';
                    break;
                default:
                    propName = 'name';
            }
            return value.map(x => x[propName]).join(', ');
        } else {
            return value;
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

    setOrderBy = (e) => {
        const value = e.target.value;
        if (this.state.myOrderBy !== value) {
            this.setState({
                myOrderBy: value
            }, () => this.performSearch());
        }
    }

    handleSearchTextKeyPress = (e) => {
        if (e.key === "Enter") {
            this.performSearch();
        }
    }

    performSearch = () => {
        const { searchText, myOrderBy } = this.state;
        const myOrderByParams = ORDER_BY_PARAMS[myOrderBy];
        this.props.performSearch(searchText, myOrderByParams.myOrderBy, myOrderByParams.orderDirection);
    }


    render () {
        const { generalDialog, searchText, myOrderBy } = this.state;
        const { metadataMap, toolHumanName, title } = this.props;
        const dialogTitle = (title) ? title : `Load ${toolHumanName}`;
        return (
            <>
                <Dialog fullWidth={true} maxWidth={this.props.maxWidth} open={this.props.open} onClose={this.props.onClose}>
                    <DialogTitle id="alert-dialog-title" style={{display:'inline'}}>
                        <div style={{float:'left'}}>
                            {dialogTitle}
                        </div>
                        <div style={{float:'right', fontWeight: 400, marginTop: '0.2em'}}>
                            <FormControl variant="outlined" style={{marginRight:'1em'}}>
                              <InputLabel htmlFor="model-search-textbox" style={{marginTop:'-0.2em'}}>Search</InputLabel>
                              <OutlinedInput
                                id="model-search-textbox" type={'text'} labelWidth={70} style={{height:'3em'}}
                                value={searchText}
                                onChange={this.setSearchValue}
                                onKeyPress={this.handleSearchTextKeyPress}
                                endAdornment={
                                  <InputAdornment position="end">
                                    <IconButton aria-label="search models" edge="end" onClick={this.performSearch}>
                                      <SearchIcon />
                                    </IconButton>
                                  </InputAdornment>
                                }
                              />
                            </FormControl>
                            <FormControl variant="outlined">
                                <InputLabel htmlFor="model-search-order-by" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                                  Sort By
                                </InputLabel>
                                <Select
                                  value={myOrderBy} onChange={this.setOrderBy}
                                  inputProps={{
                                    name: 'modelSortBy',
                                    id: 'model-search-order-by',
                                  }}
                                  style={{height: '3em', width:'15em'}}
                                >
                                {Object.keys(this.allowedSortOptions).map((key) => <MenuItem key={key} value={key}>{this.allowedSortOptions[key]}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <div style={{marginTop: '.5em', height: 400, overflow: 'auto'}}>
                            <Table stickyHeader aria-label="sticky table">
                              <TableHead>
                                <TableRow>
                                    {this.modelInfoKeys.map(header =>
                                        <TableCell key={header}>{this.headers[header]}</TableCell>
                                    )}
                                    {this.showActions &&
                                        <TableCell>Actions</TableCell>
                                    }
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                  {Object.keys(metadataMap).map(key =>
                                      <TableRow key={key} hover={true} onClick={(() => this.load(metadataMap[key]))}>
                                          {this.modelInfoKeys.map(header => {
                                              var value = (metadataMap[key]) ? metadataMap[key][header] : undefined;
                                              if (value !== undefined) {
                                                if (header === this.limitTextForKey) {
                                                    value = this.showMoreLessHelper.handleShowMoreLess(key, value);
                                                } else if (this.dateFields.includes(header)) {
                                                    value = new Date(parseInt(value)).toLocaleString("en-US");
                                                } else if (this.multiValuedKeys.includes(header)) {
                                                    value = this.formatMultiValue(header, value);
                                                } else if (this.booleanKeys.includes(header)) {
                                                    value = (value === true) ? 'Yes' : '';
                                                } 
                                              }
                                              return (
                                                  <TableCell style={{cursor: 'pointer'}} key={header}>
                                                    {value}
                                                  </TableCell>
                                              )
                                          })}
                                          <TableCell>
                                            {(metadataMap[key].userRole === USER_ROLE.OWNER && this.showActions) &&
                                                <Tooltip enterDelay={600} arrow title={`Delete ${toolHumanName}`}>
                                                    <Button color={'primary'} onClick={(event) => this.showDeleteDialog(event, key)}>
                                                        <span className="fa fa-trash"/>
                                                    </Button>
                                                </Tooltip>
                                          }
                                          </TableCell>
                                      </TableRow>
                                  )}
                              </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                    <DialogActions>
                      <StyledButton onClick={this.cancel} color="primary">
                        Cancel
                      </StyledButton>
                    </DialogActions>
                </Dialog>
                <GeneralDialog open={generalDialog.open} onClose={generalDialog.handleClose}
                            title={generalDialog.title} description={generalDialog.description}
                            buttons={generalDialog.buttons} />
            </>
        )
    }
}
