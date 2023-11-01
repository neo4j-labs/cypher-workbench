import React, { Component } from 'react'
import {
    Button,
    Dialog, DialogTitle, DialogActions, DialogContent, FormControlLabel,
    Switch, Tab, Tabs, TextField
} from '@material-ui/core';

import MultiTextField from '../../../components/common/MultiTextField';
import { StyledButton, TabPanel } from '../../../components/common/Components';
import { USER_ROLE } from '../../../common/Constants';

import DatabaseUserRoles from './DatabaseUserRoles';

export default class DatabaseSharing extends Component {

    constructor (props) {
        super(props);
    }

    isCreator = (currentUser) => {
        return (currentUser) ? (currentUser.role === USER_ROLE.CREATOR) : false;
    }

    isOwner = (currentUser) => {
        return (currentUser) ? (currentUser.role === USER_ROLE.OWNER) : false;
    }

    render () {
        var { open, onClose, maxWidth, save, currentUser,
                userRoles, upsertUser, removeUser } = this.props;

        const isCreator = this.isCreator(currentUser);
        const isOwner = this.isOwner(currentUser);

        return (
            <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth={maxWidth} >
                <DialogTitle id="alert-dialog-title">Sharing</DialogTitle>
                <DialogContent>
                <div style={{marginTop: '.5em', height: 400, overflow: 'auto'}}>
                    <DatabaseUserRoles upsertUser={upsertUser} isCreator={isCreator} isOwner={isOwner}
                        removeUser={removeUser} userRoles={userRoles} currentUser={currentUser} />
                </div>
                </DialogContent>
                <DialogActions>
                  {(isCreator || isOwner) &&
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
