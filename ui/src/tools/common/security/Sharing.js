import React, { Component } from 'react'
import {
    Button,
    Dialog, DialogTitle, DialogActions, DialogContent, FormControlLabel,
    Switch, Tab, Tabs, TextField
} from '@material-ui/core';

import { USER_ROLE } from '../../../common/Constants';
import { StyledButton, TabPanel } from '../../../components/common/Components';
import MultiTextField from '../../../components/common/MultiTextField';

import SecurityRole from '../SecurityRole';
import UserRoles from './UserRoles';

export default class Sharing extends Component {

    constructor (props) {
        super(props);
    }

    /*
    setMultiValue = (key, value, propName) => {
        value = value.map(x => (typeof(x) === 'string') ? { [propName]: x } : x);
        this.preventDuplicateValue(value, propName);
        this.props.recordModelMetadataChanges(key, value);
    }

    handleTabClick = (event, newValue) => {
        this.setState({
            activeTabIndex: newValue
        })
    }*/

    render () {
        var { open, maxWidth, save, onClose, docKey, toolUri,
                setIsPublic, isPublic, userRoles, upsertUser, removeUser } = this.props;

        return (
            <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth={maxWidth} >
                <DialogTitle id="alert-dialog-title">Sharing</DialogTitle>
                <DialogContent>
                <div style={{marginTop: '.5em', height: 400, overflow: 'auto'}}>
                    <UserRoles upsertUser={upsertUser} removeUser={removeUser} docKey={docKey}
                        toolUri={toolUri}
                        setIsPublic={setIsPublic} isPublic={isPublic} userRoles={userRoles} />
                </div>
                </DialogContent>
                <DialogActions>
                  {SecurityRole.isOwner() &&
                      <StyledButton onClick={save} color="primary" autoFocus>
                        Save
                      </StyledButton>
                  }
                  <StyledButton onClick={onClose} color="primary">
                    Cancel
                  </StyledButton>
                </DialogActions>
            </Dialog>
        )
    }
}
