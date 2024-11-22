import React, { Component } from 'react'
import {
    Button, Checkbox, Dialog, DialogTitle, DialogActions, DialogContent,
    FormControl, FormControlLabel, IconButton, InputLabel, InputAdornment, MenuItem, OutlinedInput,
    Select, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import GeneralDialog from '../../../components/common/GeneralDialog';
import { StyledButton } from '../../../components/common/Components';
import { USER_ROLE } from '../../../common/Constants';

const headers = {
    title: 'Title',
    //dateCreated: 'Date Created',
    isInstanceModel: 'Instance Model',
    isPublic: 'Public',
    dateUpdated: 'Date Updated',
    description: 'Description',
    owners: 'Owners',
    customers: 'Customers',
    //authors: 'Authors',
    tags: 'Tags'
}
//const multiValuedKeys = ['customers','authors','tags'];
const multiValuedKeys = ['customers','owners','tags'];

const modelInfoKeys = Object.keys(headers);
const dateFields = ['dateCreated', 'dateUpdated'];

const SORT_OPTIONS = {
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

export default class LoadModelForm extends Component {

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
        includePublicModels: true,
        myOrderBy: 'DATE_UPDATED_DESC'
    }

    constructor (props) {
        super(props);
    }

    load = (modelInfo) => {
        //console.log('LoadModelForm: load: ' + JSON.stringify(modelInfo));
        this.props.load(modelInfo);
    }

    cancel = () => {
        this.props.cancel();
    }

    showDeleteModelDialog = (event, modelKey) => {
        //console.log(event);
        event.stopPropagation();
        var { generalDialog } = this.state;
        var { modelMetadataMap } = this.props;
        this.setState({
            generalDialog: {
                ...generalDialog,
                open: true,
                title: 'Delete Model',
                description: "Do you want to delete '" + modelMetadataMap[modelKey].title + "'?",
                buttons: [{
                    text: 'Yes',
                    onClick: (button, index) => {
                        this.props.deleteModel(modelKey);
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

    performSearchTimerId = null;
    setSearchValue = (e) => {
        const value = e.target.value;
        if (this.state.searchText !== value) {
            this.setState({
                searchText: value
            });
        }
        if (this.performSearchTimerId) {
            clearTimeout(this.performSearchTimerId);
        }
        this.performSearchTimerId = setTimeout(() => {
            this.performSearchTimerId = null;
            if (value) {
                this.performSearch(value);
            } else {
                this.performSearch();
            }
        }, 300)
    }

    setOrderBy = (e) => {
        const value = e.target.value;
        if (this.state.myOrderBy !== value) {
            this.setState({
                myOrderBy: value
            }, () => this.performSearchWithCurrentValue());
        }
    }

    handleSearchTextKeyPress = (e) => {
        if (e.key === "Enter") {
            this.performSearchWithCurrentValue();
        }
    }

    handlePublicModelCheckboxChange = () => {
        const { includePublicModels } = this.state;
        this.setState({
            includePublicModels: !includePublicModels
        }, () => {
            this.performSearchWithCurrentValue();
        })
    }

    performSearchWithCurrentValue = () => {
        const { searchText } = this.state;
        this.performSearch(searchText);
    }

    performSearch = (searchTerm = null) => {
        const { includePublicModels, myOrderBy } = this.state;
        const myOrderByParams = ORDER_BY_PARAMS[myOrderBy];
        this.props.performModelSearch(searchTerm ? searchTerm : '', includePublicModels, myOrderByParams.myOrderBy, myOrderByParams.orderDirection);
    }

    render () {
        const { generalDialog, includePublicModels, searchText, myOrderBy } = this.state;
        const { modelMetadataMap } = this.props;

        return (
            <>
                <Dialog fullWidth={true} maxWidth={this.props.maxWidth} open={this.props.open} onClose={this.props.onClose}>
                    <DialogTitle id="alert-dialog-title" style={{display:'inline'}}>
                        <div style={{float:'left'}}>
                            {"Load Model"}
                        </div>
                        <div style={{float:'right', fontWeight: 400, marginTop: '0.2em'}}>
                            <Tooltip enterDelay={600} arrow title="Public models you own are still shown even when unchecked">
                                <FormControlLabel style={{marginTop: '4px'}}
                                    control={
                                        <Checkbox
                                            checked={includePublicModels}
                                            onChange={this.handlePublicModelCheckboxChange}
                                            name="includePublicModels"
                                            color="primary"
                                        />
                                    }
                                    label="Include All Public Models"
                                />
                            </Tooltip>
                            <FormControl variant="outlined" style={{marginRight:'1em'}}>
                              <InputLabel htmlFor="model-search-textbox" style={{marginTop:'-0.2em'}}>Search</InputLabel>
                              <OutlinedInput
                                id="model-search-textbox" type={'text'} labelWidth={70} style={{height:'3em'}}
                                value={searchText}
                                onChange={this.setSearchValue}
                                onKeyPress={this.handleSearchTextKeyPress}
                                endAdornment={
                                  <InputAdornment position="end">
                                    <IconButton aria-label="search models" edge="end" onClick={() => this.performSearchWithCurrentValue()}>
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
                                {Object.keys(SORT_OPTIONS).map((key) => <MenuItem key={key} value={key}>{SORT_OPTIONS[key]}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <div style={{marginTop: '.5em', height: 400, overflow: 'auto'}}>
                            <Table stickyHeader aria-label="sticky table">
                              <TableHead>
                                <TableRow>
                                    {modelInfoKeys.map(header =>
                                        <TableCell key={header}>{headers[header]}</TableCell>
                                    )}
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                  {Object.keys(modelMetadataMap).map(key =>
                                      <TableRow key={key} hover={true} onClick={(() => this.load(modelMetadataMap[key]))}>
                                          {modelInfoKeys.map(header => {
                                              var value = modelMetadataMap[key][header];
                                              if (value !== undefined) {
                                                if (dateFields.includes(header)) {
                                                    value = new Date(parseInt(value)).toLocaleString("en-US");
                                                } else if (multiValuedKeys.includes(header)) {
                                                    value = this.formatMultiValue(header, value);
                                                } else if (header === 'isPublic') {
                                                    value = (value === true) ? 'Yes' : '';
                                                } else if (header === 'isInstanceModel') {
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
                                            {(modelMetadataMap[key].userRole === USER_ROLE.OWNER && !this.props.disableDelete) &&
                                                <Tooltip enterDelay={600} arrow title="Delete Model">
                                                    <Button color={'primary'} onClick={(event) => this.showDeleteModelDialog(event, key)}>
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
