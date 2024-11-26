import React, { Component } from 'react'
import {
    Divider,
    MenuItem,
    Typography
} from '@material-ui/core';
import { OutlinedStyledButton } from '../../components/common/Components';

export default class SettingsForm extends Component {

    constructor () {
        super();
    }

    clearStorageAndLogout = () => {
        const { logout } = this.props;
        localStorage.clear();
        logout();
    }

    render () {
        const { email, currentUser, logout, showSwitchOrganizations } = this.props;

        var howManyOrganizations = (currentUser && currentUser.authorizedOrganizations) ? currentUser.authorizedOrganizations.length : 0;
        var primaryOrganization = (currentUser && currentUser.primaryOrganization) ? currentUser.primaryOrganization : 'Unknown';

        return (
            <div style={{marginBottom: '5px'}} >
                <Typography variant="body1" color="inherit" noWrap style={{padding:'10px'}}>
                    Signed in as <br/><span style={{fontWeight:500}}>{email}</span>
                </Typography>
                {(howManyOrganizations > 1) &&
                    <>
                        <Divider />
                        <Typography variant="body1" color="inherit" noWrap style={{padding:'10px'}}>
                            Organization <span style={{fontWeight:500}}>{primaryOrganization}</span> 
                            <OutlinedStyledButton onClick={showSwitchOrganizations} 
                                            style={{marginLeft:'1.5em',height:'2em'}} color="primary">
                                Switch
                            </OutlinedStyledButton>
                        </Typography>
                    </>
                }
                <Divider />
                <MenuItem style={{marginTop:'5px'}} onClick={this.clearStorageAndLogout}>Clear Local Storage and Logout</MenuItem>
                <MenuItem style={{marginTop:'5px'}} onClick={logout}>Logout</MenuItem>
            </div>
        )
    }
}
