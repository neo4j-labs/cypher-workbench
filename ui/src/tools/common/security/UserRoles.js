import React, { Component } from 'react'
import {
    Button, Divider,
    FormControlLabel, Icon, IconButton,
    Switch, Tooltip, Typography
} from '@material-ui/core';
import ClipboardJS from 'clipboard/dist/clipboard';
import LinkIcon from '@material-ui/icons/Link';

import { USER_ROLE, ALERT_TYPES } from '../../../common/Constants';
import { OutlinedStyledButton, StyledButton } from '../../../components/common/Components';
import MultiTextField from '../../../components/common/MultiTextField';
import {
    searchForUsers
} from '../../../persistence/graphql/GraphQLPersistence';
import { getDynamicConfigValue } from '../../../dynamicConfig';

import SecurityRole from '../SecurityRole';
import { UserRole } from './UserRole';
import { UserRoleDropDown } from './UserRoleDropDown';

export default class UserRoles extends Component {

    clipboard = undefined;

    state = {
        role: USER_ROLE.MEMBER,
        newUsers: [],
        copyLinkTooltipOpen: false
    }

    constructor (props) {
        super(props);
    }

    componentDidMount () {
        this.clipboard = new ClipboardJS('.copyToClipboard', {
            container: document.getElementById('copyToClipboardContainer')
        });
        this.clipboard.on('success', (e) => {
            /*
            console.info('Action:', e.action);
            console.info('Text:', e.text);
            console.info('Trigger:', e.trigger);
            */
            e.clearSelection();
            this.setState({
                copyLinkTooltipOpen: true
            }, () => {
                setTimeout(() => {
                    this.setState({
                        copyLinkTooltipOpen: false
                    })
                }, 1200);
            });
        });

        this.clipboard.on('error', (e) => {
            console.log('clipboard error');
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });
    }

    componentWillUnmount () {
        this.clipboard.destroy();
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

    /*
    copyToClipboard = (str) => {
      // a mixture of https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
      //  and https://stackoverflow.com/questions/47879184/document-execcommandcopy-not-working-on-chrome
      const el = document.createElement('textarea');
      el.value = str;
      el.textContent = 'copied text';   // for chrome
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();

      var selection = document.getSelection();
      var range = document.createRange();
      range.selectNode(el);
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand('copy');

      selection.removeAllRanges();
      document.body.removeChild(el);
    };
    */

    render () {
        var { docKey, toolUri, isPublic, setIsPublic, userRoles, upsertUser, removeUser } = this.props;
        var { newUsers, role, copyUrl, copyLinkTooltipOpen } = this.state;

        var userRoles = Object.values(userRoles).filter((role) => !role.removeUser);
        userRoles.sort(this.userRoleSort);

        var copyUrl = `${getDynamicConfigValue("REACT_APP_BASE_URL")}${toolUri}${docKey}`;

        return (
            <div id='copyToClipboardContainer'>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexFlow: 'row', alignItems: 'center'}}>
                    <FormControlLabel style={{marginLeft: '0em', marginBottom: '0.5em'}} label="Public (viewable by all users)" control={
                          <Switch size="small" checked={isPublic} id="isPublic" value="isPublic" color="primary"
                            onChange={(e) => {
                                if (SecurityRole.isOwner()) {
                                    setIsPublic(e.target.checked)
                                }
                            }}/>
                        }
                    />
                    <Tooltip open={copyLinkTooltipOpen} arrow title="Copied!">
                        <Button style={{float:'right'}} edge="end" className="copyToClipboard"
                                                                    data-clipboard-text={copyUrl} onClick={this.copyUrlToClipboard}>
                          <LinkIcon style={{marginRight:'0.1em'}}/> Copy Link
                        </Button>
                    </Tooltip>
                </div>
                <Divider style={{marginTop:'0.5em',marginBottom:'0.5em'}}/>
                <div style={{height:'260px', overflowY: 'scroll', paddingRight: '10px'}}>
                    <Typography variant="h6" color="inherit" noWrap>
                      Users
                    </Typography>
                    {userRoles.map((role) => {
                        var userRole = { ...role } // explicit clone of object
                        return (
                            <UserRole key={userRole.email}
                                userRole={userRole}
                                upsertUser={upsertUser}
                                removeUser={removeUser}/>
                        )
                    })}
                </div>
                {SecurityRole.isOwner() &&
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
