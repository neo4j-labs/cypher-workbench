import React, { Component } from 'react'
import {
    Checkbox, Dialog, DialogTitle, DialogActions, DialogContent,
    FormControl, FormControlLabel, InputLabel,
    MenuItem, Select, Switch, TextField
} from '@material-ui/core';
import { track } from '../../common/util/tracking';

import { getAllDbConnectionsForUser } from '../../persistence/graphql/GraphQLDBConnection';
import { ALERT_TYPES } from '../../common/Constants';
import {
    connectToNeo,
    disconnectFromNeo,
    currentlyConnectedToNeo,
    getCurrentConnectionInfo
} from "../../common/Cypher";
import { StyledButton } from '../../components/common/Components';
import {
    getUserNameAndPasswordLocally,
    encryptAsymmetricOnlyWithVersion
} from "../../common/encryption";

const UserEntered = '<User Entered>';
const UserEnteredKey = '_user_entered_key_';

export default class NeoConnectionForm extends Component {

    onConnectCallback = null;
    onDisconnectCallback = null;
    isConnected = false;
    buttonText = 'Connect';
    keymakerDbConnection = null;

    state = {
        selectedDatabaseId: UserEntered,
        url: 'bolt://localhost:7687',
        databaseName: '',
        encrypted: false,
        proxyThroughAppServer: false,
        username: 'neo4j',
        password: '',
        dbConnections: [],
        showPublicConnections: false
    }

    constructor (props) {
        super(props);
    }

    setDbConnections = (value) => {
        var allConnections = this.addKeymakerConnection(value);
        this.setState({ dbConnections: allConnections });
        return allConnections;
    }

    getSampleDbConnections = () => {
        return [{ id: 'local', name: '<Configure saved connections in the Database tool>', url: 'bolt://localhost:7687'}];
    }

    addKeymakerConnection = (dbConnections) => {
        dbConnections = (dbConnections) ? dbConnections : [];
        if (this.keymakerDbConnection) {
            const keymakerConnection = {
                ...this.keymakerDbConnection,
                id: 'keymakerDbConnection'
            }
            dbConnections = [keymakerConnection].concat(dbConnections);
        }
        return dbConnections;
    }

    initializeConnectionDialog = (properties) => {
        var { onConnectCallback, onDisconnectCallback,
                buttonText, doCallbackOnWebSocketError, keymakerDbConnection 
        } = properties;
        this.onConnectCallback = onConnectCallback;
        this.onDisconnectCallback = onDisconnectCallback;
        this.doCallbackOnWebSocketError = doCallbackOnWebSocketError;
        this.keymakerDbConnection = (keymakerDbConnection) ? keymakerDbConnection : this.keymakerDbConnection;
        if (buttonText) this.buttonText = buttonText;
        var dbConnections = null;

        if (this.keymakerDbConnection) {
            if (currentlyConnectedToNeo()) {
                disconnectFromNeo();
                this.isConnected = false;
            }
        } else {
            this.isConnected = currentlyConnectedToNeo();
        }
        
        getAllDbConnectionsForUser((response) => {
            if (response.success) {
                dbConnections = response.data;
                if (dbConnections.length === 0) {
                    dbConnections = this.getSampleDbConnections();
                }
                dbConnections = this.setDbConnections(dbConnections);
                if (dbConnections && dbConnections.length > 0) {
                    var currentConnectionInfo = getCurrentConnectionInfo();
                    var currentId = (currentConnectionInfo && currentConnectionInfo.id) ? currentConnectionInfo.id : dbConnections[0].id;
                    this.setSelectedDatabase(currentId, dbConnections);
                }
            } else {
                console.log("Error fetching getAllDbConnectionsForUser: ", response.error);
                alert('' + response.error);
                this.setDbConnections(this.getSampleDbConnections());
            }
        })
    }

    handleDisconnect = () => {
        var { onClose } = this.props;
        disconnectFromNeo();
        if (this.onDisconnectCallback) {
            this.onDisconnectCallback();
        }
        onClose();
    }

    handleConnect = () => {
        var { selectedDatabaseId, url, databaseName, encrypted, proxyThroughAppServer, username, password, dbConnections } = this.state;
        var { onClose } = this.props;
        var dbConnection = dbConnections.filter(x => x.id === selectedDatabaseId)[0];

        var encryptedUsername = encryptAsymmetricOnlyWithVersion(username);
        var encryptedPassword = encryptAsymmetricOnlyWithVersion(password);
        
        var connectionInfo = {
            id: dbConnection?.id || dbConnection,
            name: (dbConnection) 
                ? `${dbConnection.name}: ${url} / ${databaseName}`
                : `${url} / ${databaseName}`,
            url: url,
            databaseName: databaseName,
            encrypted: encrypted,
            proxyThroughAppServer: proxyThroughAppServer,
            username: username,
            password: password,
            encryptedUsername: encryptedUsername.encryptedValue,
            encryptedUsernamePublicKey: encryptedUsername.publicKey,
            encryptedPassword: encryptedPassword.encryptedValue,
            encryptedPasswordPublicKey: encryptedPassword.publicKey
        }
        connectToNeo(connectionInfo, () => {
            onClose();
            track("DATABASE_CONNECT", { 
                toolName: 'MainToolbar'    
            });
            if (this.onConnectCallback) {
                this.onConnectCallback(connectionInfo);
            }
        }, (error) => {
            var errorMessage = '' + error;
            if (!encrypted && errorMessage.match(/An insecure WebSocket connection may not be initiated from a page loaded over HTTPS/)) {
                if (this.doCallbackOnWebSocketError) {
                    onClose();
                    if (this.onConnectCallback) {
                        this.onConnectCallback(connectionInfo);
                    }
                } else {
                    alert('Cannot connect directly to Neo4j.', ALERT_TYPES.WARNING, {}, 
                    `The browser is attempting to connect Neo4j, but Neo4j is not secured. Connecting to an unsecure Neo4j instance from a secure (HTTPS) 
                    site is prevented by browser security. Turn on Proxy to proxy through the application server.`);
                    }
            } else {
                alert('Error connecting. ' + error);
            }
        });
    }

    setValue = (e) => {
        this.setState({
            [e.target.id]: e.target.value
        })
    }

    setCheckedValue = (name) => (e) => {
        this.setState({
            [name]: e.target.checked
        })
    }

    setSelectedDatabase = async (databaseId, dbConnections) => {
        const { selectedDatabaseId } = this.state;
        if (!dbConnections) {
            dbConnections = this.state.dbConnections;
        }

        if (databaseId === UserEntered) {
            this.setState({
                selectedDatabaseId: UserEntered
            })
        } else if (selectedDatabaseId !== databaseId) {
            var dbConnection = dbConnections.filter(x => x.id === databaseId)[0];
            if (dbConnection) {
                const { username, password } = await getUserNameAndPasswordLocally(dbConnection.id);
                this.setState({
                    selectedDatabaseId: databaseId,
                    url: dbConnection.url,
                    databaseName: dbConnection.databaseName,
                    encrypted: dbConnection.encrypted,
                    proxyThroughAppServer: dbConnection.proxyThroughAppServer,
                    username: username,
                    password: password,
                });
            }
        }
    }

    toggleShowPublicConnections = () => {
        const { showPublicConnections } = this.state;
        this.setState({
            showPublicConnections: !showPublicConnections
        })
    }

    render () {
        const { selectedDatabaseId, url, databaseName, 
            encrypted, proxyThroughAppServer, username, password, 
            dbConnections, showPublicConnections
        } = this.state;

        var filteredDbConnections = dbConnections
          .filter(dbConnection => 
              dbConnection.isPrivate || 
              (!dbConnection.isPrivate && showPublicConnections            
          ))

        return (
            <Dialog open={this.props.open} onClose={this.props.onClose} fullWidth={true} maxWidth={this.props.maxWidth} >
                <DialogTitle id="alert-dialog-title">{"Neo4j Database Connection"}</DialogTitle>
                <DialogContent>
                    <div style={{marginBottom: '5px'}} >
                        <div style={{display:'flex', flexFlow: 'row'}}>
                            <FormControl variant="outlined" style={{minWidth: '30em', marginTop:'.375em'}}>
                            <InputLabel htmlFor="database-label" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                            Database
                            </InputLabel>
                                <Select
                                value={selectedDatabaseId}
                                onChange={(e) => this.setSelectedDatabase(e.target.value)}
                                id="selectedDatabaseId"
                                inputProps={{
                                    name: 'database',
                                    id: 'database-label',
                                }}
                                style={{height: '3em', marginRight: '.5em'}}
                                >
                                    <MenuItem 
                                        key={UserEnteredKey}
                                        value={UserEntered}
                                    >
                                        {UserEntered}
                                    </MenuItem>
                                    {filteredDbConnections
                                        .sort((a,b) => {
                                            let aName = a.name?.toLowerCase() || '';
                                            let bName = b.name?.toLowerCase() || '';
                                            if (aName === bName) return 0;
                                            if (aName < bName) return -1;
                                            return 1;
                                        })                                
                                        .map((dbConnection) => {
                                            let publicText = (dbConnection.isPrivate) ? '' : ' (public)';
                                            return <MenuItem key={dbConnection.id} value={dbConnection.id}>{`${dbConnection.name}${publicText}`}</MenuItem>
                                        }
                                            
                                    )}
                                </Select>
                            </FormControl>
                            <FormControlLabel style={{
                                // marginLeft: '3px'
                            }}
                                control={
                                <Checkbox
                                    checked={showPublicConnections}
                                    onChange={this.toggleShowPublicConnections}
                                    name="showPublicConnections"
                                    color="primary"
                                />
                                }
                                label={
                                    <span
                                        style={{
                                            fontSize: '0.75em',
                                            color: 'rgba(0,0,0,0.54)'
                                        }}
                                    >
                                        Show Public
                                    </span>
                                }
                            />
                        </div>
                        <div>
                            <TextField id="url" label="URL" value={url} onChange={this.setValue}
                                margin="dense" style={{width: '30em', marginRight: '.5em'}}/>
                        </div>
                        <div>
                            <TextField id="databaseName" label="Database Name" value={databaseName} onChange={this.setValue}
                                margin="dense" style={{width: '30em', marginRight: '.5em'}}/>
                        </div>
                        <div>
                            <FormControlLabel
                                control={
                                  <Switch
                                    checked={(encrypted) ? true: false}
                                    onChange={this.setCheckedValue('encrypted')}
                                    value="encrypted"
                                    color="primary"
                                  />
                                }
                                label="Encrypted"
                              />
                            <FormControlLabel
                                control={
                                  <Switch
                                    checked={(proxyThroughAppServer) ? true: false}
                                    onChange={this.setCheckedValue('proxyThroughAppServer')}
                                    value="proxyThroughAppServer"
                                    color="primary"
                                  />
                                }
                                label="Proxy"
                              />

                        </div>
                        <div>
                            <TextField id="username" label="Username" value={username} onChange={this.setValue}
                                margin="dense" style={{width: '30em', marginRight: '.5em'}}/>
                        </div>
                        <div>
                            <TextField id="password" label="Password" value={password} onChange={this.setValue} type="password"
                                margin="dense" style={{width: '30em', marginRight: '.5em'}}/>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions style={{display:"inline", marginLeft: ".5em"}}>
                    <div style={{display:"flex", flexDirection: "row", justifyContent: "space-between"}}>
                      <div>
                          {(this.isConnected) &&
                              <StyledButton onClick={this.handleDisconnect} color="primary" autoFocus>{"Disconnect"}</StyledButton>
                          }
                      </div>
                      <div>
                          <StyledButton onClick={this.handleConnect} color="primary" autoFocus>{this.buttonText}</StyledButton>
                          <StyledButton onClick={this.props.cancel} color="primary">Cancel</StyledButton>
                      </div>
                    </div>
                </DialogActions>
            </Dialog>
        )
    }
}
