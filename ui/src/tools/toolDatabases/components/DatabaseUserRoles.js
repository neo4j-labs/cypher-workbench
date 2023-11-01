import React, { Component } from 'react'

import {
    Button, Divider,
    FormControlLabel, Icon, IconButton,
    Switch, Tooltip, Typography
} from '@material-ui/core';
import LinkIcon from '@material-ui/icons/Link';

import MultiTextField from '../../../components/common/MultiTextField';
import { OutlinedStyledButton, StyledButton } from '../../../components/common/Components';
import { USER_ROLE, ALERT_TYPES } from '../../../common/Constants';
import { UserRoleDropDown } from '../../common/security/UserRoleDropDown';

import { DatabaseUserRole } from './DatabaseUserRole';

import {
    searchForUsers
} from '../../../persistence/graphql/GraphQLPersistence';

export default class DatabaseUserRoles extends Component {

    state = {
        role: USER_ROLE.MEMBER,
        newUsers: []
    }

    constructor (props) {
        super(props);
    }

    addUser = (userRole) => {
        const { newUsers, role } = this.state;
        var { upsertUser } = this.props;

        newUsers.map(user => upsertUser(user.email, role));

        this.setState({
            newUsers: []
        });
    }

    setRole = (role) => {
        this.setState({
            role: role
        })
    }

    setMultiValue = (value, propName) => {
        value = value.map(x => (typeof(x) === 'string') ? { [propName]: x } : x);
        this.preventDuplicateValue(value, propName);
        this.setState({
            newUsers: value
        });
    }

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

    userRoleSortByEmail = (a,b) => {
        if (a.email < b.email) {
            return -1;
        } else if (a.email > b.email) {
            return 1;
        } else {
            return 0;
        }
    }

    userRoleSort = (a,b) => {
        var roles = [USER_ROLE.OWNER, USER_ROLE.MEMBER, USER_ROLE.VIEWER];
        if (a.isCreator && b.isCreator) {
            return this.userRoleSortByEmail(a,b);
        } else if (!a.isCreator && b.isCreator) {
            return 1;
        } else if (a.isCreator && !b.isCreator) {
            return -1;
        } else {
            var diff = roles.indexOf(a.role) - roles.indexOf(b.role);
            if (diff !== 0) {
                return diff;
            } else {
                return this.userRoleSortByEmail(a,b);
            }
        }
    }

    render () {
        var { userRoles, upsertUser, removeUser, isCreator, isOwner, currentUser } = this.props;
        var { newUsers, role } = this.state;

        var userRoles = Object.values(userRoles).filter((role) => !role.removeUser);
        userRoles.sort(this.userRoleSort);

        return (
            <div>
                <div style={{height:'260px'}}>
                    <Typography variant="h6" color="inherit" noWrap>
                      Users
                    </Typography>
                    {userRoles.map((role) => {
                        var userRole = { ...role } // explicit clone of object
                        console.log('userRole', userRole);
                        return (
                            <DatabaseUserRole key={userRole.email}
                                currentUser={currentUser}
                                isOwner={isOwner}
                                isCreator={isCreator}
                                userRole={userRole}
                                upsertUser={upsertUser}
                                removeUser={removeUser}/>
                        )
                    })}
                </div>
                {(isCreator || isOwner) &&
                    <>
                        <Divider style={{marginTop:'0.5em',marginBottom:'0.5em'}}/>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexFlow: 'row', alignItems: 'center'}}>
                                <MultiTextField className={'sharingUserField'} search={searchForUsers} label={'Add Users'}
                                    displayProp={'email'} value={newUsers}
                                    setValue={(value) => this.setMultiValue(value, 'email')} />
                                <UserRoleDropDown role={role} setRole={this.setRole}/>
                                <Tooltip enterDelay={600} arrow title="Add User(s)">
                                    <Button color={'primary'} onClick={this.addUser}>
                                        <span style={{fontSize:'0.8em', marginRight:'.2em'}} className='fa fa-plus'/> Add
                                    </Button>
                                </Tooltip>
                            </div>
                            <div style={{marginTop:'0.5em'}}>
                            </div>
                        </div>
                    </>
                }
            </div>
        )
    }
}
