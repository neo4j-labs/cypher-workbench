import React, { Component } from 'react'
import uuidv4 from 'uuid/v4';
import {
    Dialog, DialogTitle, DialogActions, DialogContent, TextField
} from '@material-ui/core';
import { VERSION } from '../../../version';
import { StyledButton } from '../../../components/common/Components';
import MultiTextField from '../../../components/common/MultiTextField';
import { hasBasicLicense } from '../../../common/LicensedFeatures';

import { SAVE_MODE } from '../toolConstants';
import SecurityRole from '../SecurityRole';
import { searchForCustomers, searchForTags } from '../../../persistence/graphql/GraphQLPersistence';

import { getDynamicConfigValue } from '../../../dynamicConfig';

export const getMetadata = (title) => {
    return {
        key: uuidv4(),
        cypherWorkbenchVersion: VERSION,
        title: title,
        description: '',
        notes: '',
        customer: '',
        authors: '',
        tags: '',
        dateCreated: new Date().getTime().toString(),
        dateUpdated: new Date().getTime().toString(),
        viewSettings: {},
        isPublic: false
    }
}

const showCustomers = getDynamicConfigValue("REACT_APP_SHOW_CUSTOMERS_IN_SAVE_FORM") === false ? false : true;

export class SaveForm extends Component {

    state = {
        activeTabIndex: 0
    }

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.textFocus = this.utilizeFocus();
    }

    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }

    setValue = (e) => {
        const { mode } = this.props;
        if (mode !== SAVE_MODE.EXISTS || (mode === SAVE_MODE.EXISTS && SecurityRole.canEdit())) {
            this.props.recordMetadataChanges(e.target.id, e.target.value);
        }
    }

    setMultiValueWithKey = (key, value, propName) => {
        const { mode } = this.props;
        if (mode !== SAVE_MODE.EXISTS || (mode === SAVE_MODE.EXISTS && SecurityRole.canEdit())) {
            value = value.map(x => (typeof(x) === 'string') ? { key: uuidv4(), [propName]: x } : x);
            this.preventDuplicateValue(value, propName);
            this.props.recordMetadataChanges(key, value);
        }
    }

    /*
    setMultiValue = (key, value, propName) => {
        const { mode } = this.props;
        if (mode !== SAVE_MODE.EXISTS || (mode === SAVE_MODE.EXISTS && SecurityRole.canEdit())) {
            value = value.map(x => (typeof(x) === 'string') ? { [propName]: x } : x);
            this.preventDuplicateValue(value, propName);
            this.props.recordMetadataChanges(key, value);
        }
    }*/

    preventDuplicateValue = (value, propName) => {
        if (value && value.length >= 2) {
            var lastValue = value[value.length-1];
            // for now prevent multiple selections of same name
            var matches = value.slice(0,value.length-1).filter(x => x[propName] === lastValue[propName]);
            if (matches && matches.length > 0) {
                value.splice(value.length-1);
            }
        }
    }

    render () {
        var { activeTabIndex } = this.state;
        var { graphDocMetadata } = this.props;
        var { loading, title, description, notes, customers, authors, tags, isPublic } = graphDocMetadata;
        isPublic = (isPublic) ? true : false;
        const { mode, documentName } = this.props;
        authors = (authors) ? authors: [];
        customers = (customers) ? customers : [];
        tags = (tags) ? tags: [];
        //authors = (authors) ? authors.map(x => x.name) : [];
        //tags = (tags) ? tags.map(x => x.tag) : [];
        var defaultStyle = {width: '30em', marginRight: '.5em'}
        const canAddTagsOrCustomers = (hasBasicLicense()) ? false : true;

        return (
            <Dialog open={this.props.open} onClose={this.props.onClose} fullWidth={true} maxWidth={this.props.maxWidth} >
                <DialogTitle id="alert-dialog-title">{`${documentName} Information`}</DialogTitle>
                <DialogContent>
                <div style={{marginTop: '.5em', height: 400, overflow: 'auto'}}>
                    <div style={{marginBottom: '5px'}} >
                        <div>
                            <TextField id="title" label="Title" value={title} onChange={this.setValue}
                                inputRef={this.textFocus.ref}
                                margin="dense" style={defaultStyle}/>
                        </div>
                        <div>
                            <TextField id="description" label="Description" value={description} onChange={this.setValue}
                                multiline={true} rows={2} margin="dense" style={defaultStyle}/>
                        </div>
                        
                        {showCustomers &&
                            <div>
                                <MultiTextField search={searchForCustomers} label={'Customers'} displayProp={'name'} value={customers}
                                freeSolo={canAddTagsOrCustomers}
                                setValue={(value) => this.setMultiValueWithKey('customers', value, 'name')} />
                            </div>
                        }
                        {/*
                        <div>
                            <MultiTextField search={searchForAuthors} label={'Authors'} displayProp={'name'} value={authors}
                              setValue={(value) => this.setMultiValueWithKey('authors', value, 'name')} />
                        </div>
                        */}
                        <div>
                            <MultiTextField search={searchForTags} label={'Tags'} displayProp={'tag'} value={tags}
                              freeSolo={canAddTagsOrCustomers}
                              setValue={(value) => this.setMultiValueWithKey('tags', value, 'tag')} />
                        </div>
                        <div>
                            <TextField id="notes" label="Notes" value={notes} onChange={this.setValue}
                                multiline={true} rows={2} margin="dense" style={defaultStyle}/>
                        </div>
                  </div>
                </div>
                </DialogContent>
                <DialogActions>
                  {(mode === SAVE_MODE.EXISTS) ?
                      SecurityRole.canEdit() ?
                        <StyledButton onClick={this.props.save} color="primary" autoFocus>Save</StyledButton>
                        :
                        <></>
                      :
                      <StyledButton onClick={this.props.save} color="primary" autoFocus>Create</StyledButton>
                  }
                    <StyledButton onClick={this.props.cancel} color="primary">
                        Cancel
                    </StyledButton>
                </DialogActions>
            </Dialog>
        )
    }
}
