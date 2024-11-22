import React, {useEffect, useState} from "react";
import PropTypes from "prop-types";
import {makeStyles} from "@material-ui/core/styles";
import {getUserNameAndPasswordLocally, storeUserNameAndPasswordLocally} from "../../../common/encryption";
import {EDIT_DB_CONNECTION} from "../../../persistence/graphql/dbConnection";

import FormModal from "../keyMakerComponents/FormModal";
import {
    runMutation,
    checkInputs,
    notNullUndefinedOrEmpty
} from "../util/helper";
import {Button, FormControlLabel, FormGroup, Switch, TextField, Typography} from "@material-ui/core";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: 'column',
        padding: 10
    },
    connectionRow: {
        display: 'flex',
        flexDirection: 'column',
        rowGap: 10
    },
    formRow: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 10
    },
    input: {
        marginRight: 10,
        marginBottom: 10

    },
    text: {
        fontWeight: 600,
        padding: '0 0 5px 0',
        fontSize: '0.92857143em',
    },
    hr: {
        width: '100%',
        border: '1px black solid',
        marginBottom: 20
    }
});

const EditDatabaseConnectionModal = ({isOpen, onClose, dbConnection, refetch }) => {
    // console.log('dbConnection: ', dbConnection);
    const getFormState = (dbConnection) => {
        return {
            name : dbConnection.name,
            databaseName: dbConnection.databaseName,
            url: dbConnection.url,
            isPublic : !dbConnection.isPrivate,
            proxyThroughAppServer: dbConnection.proxyThroughAppServer || false,
            encrypted: dbConnection.encrypted,
            password: '',
            user: ''
        }    
    }

    const [formState, setFormState] = useState(getFormState(dbConnection));
    const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
    const [showUrlError, setShowUrlError] = useState(false);
    const [showDatabaseNameError, setShowDatabaseNameError] = useState(false);
    const [showNameError, setShowNameError] = useState(false);
    const [showUserError, setShowUserError] = useState(false);
    const [showPasswordError, setShowPasswordError] = useState(false);
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);
    const classes = useStyles();

    useEffect(() => {
        setFormState(getFormState(dbConnection))
    }, [dbConnection])

    const updateCredentials = async () => {
        // we need to pull them in because they weren't loaded previously
        const response = await getUserNameAndPasswordLocally(dbConnection.id);
        setFormState({
            ...formState, user: response.username || '',
            password: response.password || ''
        });
        setCredentialsLoaded(true);
    }
    if (!credentialsLoaded) {
        updateCredentials();
    }

    // Handles multiple form inputs
    const handleChange = (e) => {
        let { name, value } = e.target;
        // console.log(name, value)
        if(value === "true" || value === "false"){
            setFormState({...formState, [name]: e.target.checked})
        } else {
            setFormState({...formState, [name]: value})
        }
    }

    const resetFields = async () => {
        setFormState({
            name,
            databaseName,
            url,
            isPublic : !dbConnection.isPrivate,
            proxyThroughAppServer: proxyThroughAppServer || false,
            encrypted,
            password: '',
            user: ''
        });
        setIsUpdatingCredentials(false);
    };

    const resetErrors = () => {
        setShowUrlError(false);
        setShowDatabaseNameError(false);
        setShowNameError(false);
        setShowUserError(false);
        setShowPasswordError(false);
    };

    const submitForm = async () => {
            if (
                // if not updating credentials only check name and url
                (!isUpdatingCredentials &&
                    checkInputs([
                        {
                            input: name,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowNameError(true)
                        },
                        {
                            input: url,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowUrlError(true)
                        }
                    ])) ||
                // if updating credentials check all params
                (isUpdatingCredentials &&
                    checkInputs([
                        {
                            input: name,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowNameError(true)
                        },
                        {
                            input: url,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowUrlError(true)
                        },
                        {
                            input: user,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowUserError(true)
                        },
                        {
                            input: password,
                            functions: [notNullUndefinedOrEmpty],
                            onError: () => setShowPasswordError(true)
                        }
                    ]))
            ) {
                const properties = {name, url, databaseName, encrypted, proxyThroughAppServer};
                properties.user = 'NOT_STORED_IN_SERVER';
                properties.password = 'NOT_STORED_IN_SERVER';
                properties.isPrivate = !formState.isPublic;
                const variables = {
                    id: dbConnection.id,
                    properties: properties
                };

                if (dbConnection.canCurrentUserEdit) {
                    runMutation(EDIT_DB_CONNECTION, variables, (result) => {
                        storeUserNameAndPasswordLocally(dbConnection.id, user, password);
                        onClose();
                        resetErrors();
                        refetch();
                    }, (error) => {
                        alert(error);
                    });
                } else {
                    storeUserNameAndPasswordLocally(dbConnection.id, user, password);
                    onClose();
                    resetErrors();
                }
            }
    };

    const canEdit = !dbConnection.canCurrentUserEdit;

    const { name, url, databaseName, encrypted, proxyThroughAppServer, isPublic, password, user } = formState;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={() => {
                onClose();
                resetFields();
                resetErrors();
            }}
            buttonName={"Save"}
            size={"tiny"}
            onSubmit={async () => {
                resetErrors();
                submitForm();
            }}
        >
            <div className={classes.root}>
                <Typography variant="h5">
                    Edit Connection
                </Typography>
                <hr className={classes.hr}/>
                <form autoComplete='off'>
                    <div className={classes.connectionRow}>
                            <TextField
                                variant='outlined'
                                className={classes.input}
                                label="Name"
                                name='name'
                                value={name}
                                error={showNameError}
                                onChange={handleChange}
                                disabled={canEdit}
                                fullWidth
                            />
                            <TextField
                                variant='outlined'
                                className={classes.input}
                                label="Connection URL"
                                value={url}
                                name="url"
                                error={showUrlError}
                                onChange={handleChange}
                                disabled={canEdit}
                                fullWidth
                            />
                        <div>
                            <TextField
                                variant='outlined'
                                label="Database Name"
                                value={databaseName}
                                error={showDatabaseNameError}
                                name="databaseName"
                                onChange={handleChange}
                                disabled={canEdit}
                                fullWidth
                            />
                        </div>
                    </div>

                    <div>
                        <FormGroup className={classes.formRow}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isPublic}
                                        onChange={handleChange}
                                        value={isPublic}
                                        name="isPublic"
                                        color='primary'
                                        disabled={canEdit}
                                    />
                                }
                                label="Public"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={encrypted}
                                        value={encrypted}
                                        onChange={handleChange}
                                        name="encrypted"
                                        color='primary'
                                        disabled={canEdit}
                                    />
                                }
                                label="Encrypted"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={proxyThroughAppServer}
                                        value={proxyThroughAppServer}
                                        onChange={handleChange}
                                        name="proxyThroughAppServer"
                                        color='primary'
                                        disabled={canEdit}
                                    />
                                }
                                label="Proxy"
                            />
                        </FormGroup>
                    </div>
                    <div className={classes.formRow}>
                        <Button
                            variant='contained'
                            color='primary'
                            onClick={() => {
                                setIsUpdatingCredentials(!isUpdatingCredentials)
                            }}
                            fullWidth
                        >
                            Update Credentials
                        </Button>
                    </div>
                    {
                        isUpdatingCredentials ?
                            <div>
                                <Typography className={classes.text}>
                                    Username and password will be encrypted in local storage
                                </Typography>
                                <div className={classes.formRow}>
                                    <TextField
                                        label="Username"
                                        variant="outlined"
                                        className={classes.input}
                                        value={user}
                                        error={showUserError}
                                        autoComplete="off"
                                        name="user"
                                        onChange={handleChange}
                                    />
                                    <TextField
                                        label="Password"
                                        variant="outlined"
                                        value={password}
                                        error={showPasswordError}
                                        type="password"
                                        autoComplete="off"
                                        name="password"
                                        onChange={handleChange}
                                    />
                                </div>
                            </div> : null
                    }
                </form>
            </div>
        </FormModal>
    );
};

EditDatabaseConnectionModal.propTypes = {
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
    }).isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default EditDatabaseConnectionModal;
