import React, { Component } from 'react'
import {
    Icon, InputLabel,
    MenuItem,
    FormControl,
    Select
} from '@material-ui/core';

import { USER_ROLE } from '../../../common/Constants';

export class UserRoleDropDown extends Component {

    constructor (props) {
        super(props);
    }

    getIcon = (userRole) => {
        var icon;
        switch (userRole) {
            case USER_ROLE.MEMBER:
                icon = <div className={"fa fa-edit"}/>;
                break;
            case USER_ROLE.VIEWER:
                icon = <div className={"fa fa-eye"}/>;
                break;
            case USER_ROLE.OWNER:
                icon = <div className={"fa fa-user-cog"}/>;
                break;
            default:
                break;
        }
        return icon;
    }

    titleCase = (text) => {
        text = (text === 'MEMBER') ? 'Editor' : text;
        return text.substring(0,1).toUpperCase() + text.substring(1).toLowerCase();
    }

    render () {
        var { role, setRole } = this.props;

        return (
            <FormControl variant="outlined">
                {/*
                <InputLabel htmlFor="datatype-label" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                  Role
                </InputLabel>
                */}
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  id="role"
                  inputProps={{
                    name: 'role',
                    id: 'role-label',
                  }}
                  style={{height: '2.4em'}}
                >
                    {Object.values(USER_ROLE).map((roleValue) =>
                        <MenuItem key={roleValue} value={roleValue}>
                            <div style={{display: 'flex', flexFlow: 'row', alignItems: 'center'}}>
                                <div style={{fontSize:'1.2em', marginRight: '.25em'}}>{this.getIcon(roleValue)}</div>
                                <div style={{fontSize:'0.9em'}}>{this.titleCase(roleValue)}</div>
                            </div>
                        </MenuItem>
                    )}
                </Select>
            </FormControl>
        )
    }
}
