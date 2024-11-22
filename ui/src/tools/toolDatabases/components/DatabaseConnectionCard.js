import React, {useState, useEffect} from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {CircularProgress, Button, Tooltip, IconButton} from '@material-ui/core';
import { OutlinedStyledButton } from '../../../components/common/Components';

import "../KeyMakerApp.css";

import auth from '../../../auth/auth0';

import {ALERT_TYPES, COLORS} from '../../../common/Constants';
import {isFeatureLicensed, showUpgradeLicenseMessage, FEATURES} from '../../../common/LicensedFeatures';
import {connectToNeo, disconnectFromNeo} from '../../../common/Cypher';
import {updateDatabaseUserRoles} from '../../../persistence/graphql/GraphQLPersistence';
import {DELETE_DB_CONNECTION} from "../../../persistence/graphql/dbConnection";
import {
    getUserNameAndPasswordLocally,
    removeUsernameAndPasswordLocally
} from "../../../common/encryption";

import {runMutation, parseDBInfo, pluralize} from "../util/helper";

import DeleteModal from "../keyMakerComponents/DeleteModal";
import MessageModal from "../keyMakerComponents/MessageModal";
import DatabaseSharing from './DatabaseSharing';
import EditDatabaseConnectionModal from "./EditDatabaseConnectionModal";
import Paper from '@material-ui/core/Paper';
import Avatar from '@material-ui/core/Avatar';
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from '@material-ui/icons/Delete';
import CheckIcon from '@material-ui/icons/Check';
import PlaylistAddCheckIcon from '@material-ui/icons/PlaylistAddCheck';
import CloseIcon from '@material-ui/icons/Close';
import {makeStyles} from "@material-ui/core/styles";


const ContentWrapper = styled.div`
  height: 100%;
  display: flex;
  padding: 20px;
  flex-direction: column;
  justify-content: space-between;
`;

const TopGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const HeaderWrapper = styled.div`
  display: flex;
  margin-bottom: 25px;
  justify-content: space-between;
`;

const Domain = styled.div`
  display: flex;
  border-radius: 3px;
  align-items: center;
  justify-content: center;
  padding: 0px 15px 0px 15px;
`;

const TitleWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 5px;
`;

const Title = styled.div`
  margin: 0px 5px 0px 0px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.25em;
  max-height: 2.5;
`;

const ConnectionURL = styled.div`
  display: flex;
  flex-direction: row;

  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-height: 1.25em;
  max-height: 1.25;
`;

const DatabaseName = styled.div`
  display: flex;
  flex-direction: row;

  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  margin-top: 0.2em;
  line-height: 1.25em;
  max-height: 1.25;
`;


const UserGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: 5px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: row;
`;

const Subscript = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
`;

const ConnectionStatus = styled.div`
  color: ${props => props.status.color};
`;

const DB_CONNECTION_STATUS = {
    NOT_CONNECTED: "NOT_CONNECTED",
    TRYING_TO_CONNECT: "TRYING_TO_CONNECT",
    CONNECTION_GOOD: "CONNECTION_GOOD",
    CONNECTION_BAD: "CONNECTION_BAD",
    CONNECTION_PROXY: "CONNECTION_PROXY"
}

/*
function getCurrentUser () => {
    email: String
    role: String
    isCreator: Boolean
} */

const isSecure = (dbConnection) => {
    const {url, encrypted} = dbConnection;
    if (encrypted) {
        return true;
    }

    if (url.match(/bolt\+s/) || url.match(/bolt\+ssc/)
        || url.match(/neo4j\+s/) || url.match(/neo4j\+ssc/)) {
        return true;
    }
    return false;
}

const useStyles = makeStyles({
    circularProgress: {
        width: '12px !important',
        height: '12px !important',
        marginRight: '5px'
    },
    buttonBar: {
        display: 'flex',
        flexDirection: 'row'  
    },
    userGroup: {
        marginTop: '.8em',
        display: 'flex',
        flexDirection: 'row'
    },
    addUserButton: {
        border: '1px solid gray'
    },
    spacer: {
        flexGrow: 1
    },
    button: {
        marginRight: '4px !important',
        marginLeft: '4px !important',
        paddingLeft: '5px',
        paddingRight: '15px'
    }, 
    testIcon: {
        color: 'green',
        height: '0.75em'
    },
    testBadIcon: {
        color: 'red',
        height: '0.75em'
    },
    buttonIcon: {
        height: '0.75em'
    }
})

const DatabaseConnectionCard = ({otherToolActionRequest, dbConnection, refetch}) => {

    const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
    const [isEditingDatabase, setIsEditingDatabase] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(DB_CONNECTION_STATUS.NOT_CONNECTED);
    const [buttonIcon, setButtonIcon] = useState(<></>)
    const classes = useStyles();
    let {id, name, url, databaseName, encrypted, proxyThroughAppServer, dbInfo, users, isPrivate} = dbConnection;
    databaseName = (databaseName) ? databaseName : '';

    let userRolesObj = {};
    users.map(user => userRolesObj[user.email] = user);
    const [userRoles, setUserRoles] = useState(userRolesObj);

    let currentUser = users.filter(x => x.email === auth.getLoggedInUserInfo().email)[0];
    //setUserRoles(userRolesObj);

    const computeButtonIcon = (connectionStatus) => {
        if (connectionStatus === DB_CONNECTION_STATUS.TRYING_TO_CONNECT) {
            return <CircularProgress className={classes.circularProgress}/>
        } else if (connectionStatus === DB_CONNECTION_STATUS.CONNECTION_GOOD){
            return <CheckIcon className={classes.testIcon}/>
        } else if (connectionStatus === DB_CONNECTION_STATUS.CONNECTION_BAD){
            return <CloseIcon className={classes.testBadIcon}/>
        } else {
            return <PlaylistAddCheckIcon className={classes.buttonIcon}/>
        }
    }

    useEffect(() => {
        let icon = computeButtonIcon(connectionStatus);
        setButtonIcon(icon);
    }, [connectionStatus])

    const upsertUser = (email, role) => {
        // prevent the creator role from being modied
        if (currentUser) {
            if (email === currentUser.email) {
                // do nothing
            } else {
                let newUserRoles = {...userRoles}
                newUserRoles[email] = {email: email, role: role};
                setUserRoles(newUserRoles);
            }
        }
    }

    const removeUser = (email) => {
        let newUserRoles = {...userRoles}
        newUserRoles[email] = {email: email, removeUser: true};
        setUserRoles(newUserRoles);
    }

    const saveShare = () => {
        let saveUserRoles = Object.values(userRoles).map(x => {
            let returnRole = {...x};
            delete returnRole.__typename;
            delete returnRole.picture;
            return returnRole;
        });
        updateDatabaseUserRoles(id, saveUserRoles, () => {
            setIsShareDialogOpen(false);
            refetch();
        });
    }


    /*
    const requestModelToolImport = () => {
  
        let connectionInfo = {
            id: id,
            name: name,
            url: url,
            databaseName: databaseName,
            username: getUserNameLocally(id),
            password: getPasswordLocally(id)
        }
        setConnectionStatus(DB_CONNECTION_STATUS.TRYING_TO_CONNECT);
        connectToNeo(connectionInfo, () => {
            setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_GOOD);
            //otherToolActionRequest(TOOL_NAMES.MODEL, { action: MODEL_ACTIONS.IMPORT_DATABASE_MODEL });
        }, (error) => {
            setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_BAD);
            alert(error);
            disconnectFromNeo(id);
        });
    }
    */

    const testConnection = async () => {
        const {username, password} = await getUserNameAndPasswordLocally(id);
        let connectionInfo = {
            id: id + '-test',
            name: name + ' (test)',
            url: url,
            databaseName: databaseName,
            encrypted: encrypted,
            proxyThroughAppServer: proxyThroughAppServer,
            username: username,
            password: password
        }
        setConnectionStatus(DB_CONNECTION_STATUS.TRYING_TO_CONNECT);
        connectToNeo(connectionInfo, (response) => {
            // success
            response = response || {};
            const {proxy} = response;
            if (proxy) {
                alert('Connection successful. This will be a proxied connection.',
                    ALERT_TYPES.WARNING, {}, "Certain operations are limited and data volumes are limited when using a proxied connection.");
                setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_GOOD);
            } else {
                setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_GOOD);
            }
            disconnectFromNeo(id + '-test');
        }, (error) => {
            // failure
            disconnectFromNeo(id + '-test');
            let errorMessage = '' + error;
            if (!encrypted && errorMessage.match(/An insecure WebSocket connection may not be initiated from a page loaded over HTTPS/)) {
                setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_PROXY);
                alert('Cannot connect directly to Neo4j.', ALERT_TYPES.WARNING, {},
                    `The browser is attempting to connect Neo4j, but Neo4j is not secured. Connecting to an unsecure Neo4j instance from a secure (HTTPS) 
                site is prevented by browser security. Turn on Proxy to proxy through the application server.`);
            } else {
                setConnectionStatus(DB_CONNECTION_STATUS.CONNECTION_BAD);
                alert(error);
            }
        });
    }

    const status = parseDBInfo(dbInfo);

    let publicPrivateText = (isPrivate) ? "Private" : "Public";
    let secureIcon = (isSecure(dbConnection)) ?
        <i title="Secure" style={{fontSize: ".8em", marginRight: "4px"}} className="fa fa-shield-alt"></i> : <></>;

    let proxyIcon = (proxyThroughAppServer) ?
        <i title="Proxied" style={{fontSize: ".8em", marginRight: "4px"}} className="fa fa-random"></i> : <></>;

    let badgeText =
        <>
            {secureIcon}
            {proxyIcon}
            <span>{publicPrivateText}</span>
        </>

    return (
        <div style={{ width: 350}}>
            {isShareDialogOpen &&
                <DatabaseSharing
                    maxWith={'md'}
                    open={isShareDialogOpen}
                    onClose={() => setIsShareDialogOpen(false)}
                    currentUser={currentUser}
                    userRoles={userRoles}
                    upsertUser={upsertUser}
                    removeUser={removeUser}
                    save={saveShare}
                />
            }
            {isEditingDatabase &&
                <EditDatabaseConnectionModal
                    isOpen={isEditingDatabase}
                    onClose={() => setIsEditingDatabase(!isEditingDatabase)}
                    dbConnection={dbConnection}
                    refetch={refetch}
                />
            }
            {isPermissionsModalOpen &&
                <MessageModal
                    isOpen={isPermissionsModalOpen}
                    onClose={() => {
                        setIsPermissionsModalOpen(!isPermissionsModalOpen)
                    }}
                    title={"Insufficient Permissions"}
                    message={"You don't have permission to do that."}
                />
            }
            {isDeleteWarningOpen && 
                <DeleteModal
                    isOpen={isDeleteWarningOpen}
                    isEditing={false}
                    headerContent="Delete Connection"
                    content="Are you sure you want to delete this database connection? This is not reversible."
                    onClose={() => setIsDeleteWarningOpen(!isDeleteWarningOpen)}
                    onDelete={() => {
                        runMutation(DELETE_DB_CONNECTION, {id: id}, () => {
                            refetch();
                            removeUsernameAndPasswordLocally(id);
                        }, (error) => {
                            alert(error);
                        });
                    }}
                />
            }
            <Paper>
                <ContentWrapper>
                    <TopGroup>
                        <HeaderWrapper>
                            <TitleWrapper>
                                <Title className="black text-med text-bold margin-right-tiny">
                                    {name}
                                </Title>
                            </TitleWrapper>
                            <Domain
                                className={
                                    isPrivate
                                        ? "blue-background-opaque blue"
                                        : "green-background-opaque green"
                                }
                            >
                                {badgeText}
                            </Domain>
                        </HeaderWrapper>
                        <ConnectionURL className="grey">
                            {url}
                        </ConnectionURL>
                        <DatabaseName className="grey">
                            {(databaseName) ? `Database: ${databaseName}` : 'Default database'}
                        </DatabaseName>
                    </TopGroup>
                    <UserGroup className={classes.userGroup}>
                        {users.slice(0, 3).map((user, idx) => {
                            if (user.picture) {
                                return (
                                    <div>
                                        <Tooltip title={user.email}>
                                            <Avatar key={idx} src={user.picture} alt={user.email.toUpperCase()}/>
                                        </Tooltip>
                                    </div>
                                )

                            } else {
                                return <Avatar key={idx}
                                               alt={user.name}>{user.email.substring(0, 1).toUpperCase()}</Avatar>
                            }
                        })}
                        <div className={classes.spacer}/>
                        <Tooltip title="Add User" placement="top">
                            <IconButton className={classes.addUserButton} variant="contained" title="Share connection" onClick={() => {
                                if (isFeatureLicensed(FEATURES.DATABASES.Share)) {
                                    setIsShareDialogOpen(true);
                                } else {
                                    showUpgradeLicenseMessage();
                                }
                            }}
                            >
                                <PersonAddIcon/>
                            </IconButton>
                        </Tooltip>
                    </UserGroup>
                    <div className={classes.buttonBar}>
                        <ButtonGroup>
                            <Tooltip title="Edit Connection">
                                <OutlinedStyledButton className={classes.button}
                                    onClick={() => setIsEditingDatabase(!isEditingDatabase)}
                                >
                                    <EditIcon className={classes.buttonIcon}/><span>Edit</span>
                                </OutlinedStyledButton>
                            </Tooltip>
                            <Tooltip title="Test Connection">
                                <OutlinedStyledButton className={classes.button}
                                    onClick={testConnection}
                                >
                                    {buttonIcon}
                                    <span>Test</span>                                
                                </OutlinedStyledButton>
                            </Tooltip>
                        </ButtonGroup>
                        <div className={classes.spacer}></div>
                        <Tooltip title="Delete Connection">
                            <OutlinedStyledButton className={classes.button}
                                onClick={() => {
                                    if (!dbConnection.canCurrentUserDelete) {
                                        setIsPermissionsModalOpen(!isPermissionsModalOpen)
                                    } else {
                                        setIsDeleteWarningOpen(!isDeleteWarningOpen)
                                    }

                                }}
                            >
                                <DeleteIcon className={classes.buttonIcon}/><span>Delete</span>
                            </OutlinedStyledButton>
                        </Tooltip>
                    </div>
                </ContentWrapper>
            </Paper>
        </div>
    );
};

DatabaseConnectionCard.propTypes = {
    dbConnection: PropTypes.shape({
        labels: PropTypes.array,
        id: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        isPrivate: PropTypes.bool.isRequired,
        dbInfo: PropTypes.shape({
            hasApoc: PropTypes.bool.isRequired,
            isConnected: PropTypes.bool.isRequired,
            license: PropTypes.oneOf(["ENTERPRISE", "COMMUNITY", "NA"])
        }),
        users: PropTypes.arrayOf(
            PropTypes.shape({
                role: PropTypes.string.isRequired,
                email: PropTypes.string.isRequired,
                picture: PropTypes.string
            })
        ).isRequired
    })
};

export default DatabaseConnectionCard;
