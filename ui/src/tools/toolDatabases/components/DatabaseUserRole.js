import React, { Component } from 'react'

import {
    Button,
    Icon, InputLabel,
    MenuItem,
    FormControl, FormControlLabel,
    Select,
    Tooltip
} from '@material-ui/core';

import { USER_ROLE } from '../../../common/Constants';
import SecurityRole from '../../common/SecurityRole';
import { UserRoleDropDown } from '../../common/security/UserRoleDropDown';

export class DatabaseUserRole extends Component {

    constructor (props) {
        super(props);
    }

    setRole = (role) => {
        var { upsertUser, userRole } = this.props;
        var { email } = userRole;
        upsertUser(email, role);
    }

    render () {
        var { userRole, upsertUser, removeUser, isCreator, isOwner, currentUser } = this.props;
        var { email, role } = userRole;

        return (
            <div style={{marginBottom: '5px'}} >
            <form>
                <FormControl style={{ display: 'flex', justifyContent: 'space-between', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em' }}>
                    <div id="email" label="Email" style={{marginRight: '.5em'}}>
                        {email}
                    </div>
                    <div>
                        {(currentUser && currentUser.email === email && (isCreator || isOwner)) ?
                            <span>{(isCreator) ? 'CREATOR' : 'OWNER'}</span>
                            :
                            <>
                                {(isCreator || isOwner) ?
                                    <>
                                        <UserRoleDropDown role={role} setRole={this.setRole}/>
                                        <Tooltip enterDelay={600} arrow title="Delete User">
                                            <Button color={'primary'} style={{marginTop: '0.4em', fontSize: '1.2em'}}
                                                    onClick={() => removeUser(email)}>
                                                <span className="fa fa-trash"/>
                                            </Button>
                                        </Tooltip>
                                    </>
                                    :
                                    <>
                                        <span>{SecurityRole.getRoleDisplay(role)}</span>
                                    </>
                                }
                            </>
                        }
                    </div>
                </FormControl>
            </form>
            </div>
        )
    }
}
