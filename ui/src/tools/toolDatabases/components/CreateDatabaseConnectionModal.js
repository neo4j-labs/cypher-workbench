import React, {useState} from "react";
import PropTypes from "prop-types";
import {makeStyles} from "@material-ui/core/styles";
import FormModal from "../keyMakerComponents/FormModal";
import {
    showMaxReachedUpgradeLicenseMessage
} from "../../../common/LicensedFeatures";

import {
    runMutation,
    checkInputs,
    notNullUndefinedOrEmpty
} from "../util/helper";
import "../KeyMakerApp.css";

import {storeUserNameAndPasswordLocally} from "../../../common/encryption";
import {CREATE_DB_CONNECTION} from "../../../persistence/graphql/dbConnection";
import {FormControlLabel, FormGroup, Switch, TextField, Typography} from "@material-ui/core";

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        padding: 10
    },
    connectionRow: {
        display: 'flex',
        flexDirection: 'column'
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

const CreateDatabaseConnectionModal = ({isOpen, onClose, refetch}) => {
    const [formState, setFormState] = useState({
        url: '',
        dataBaseName: '',
        name: '',
        user: '',
        password: '',
        isPublic: false,
        proxyThroughAppServer: false,
        encrypted: false
    });
    const [showUrlError, setShowUrlError] = useState(false);
    const [showDatabaseNameError, setShowDatabaseNameError] = useState(false);
    const [showNameError, setShowNameError] = useState(false);
    const [showUserError, setShowUserError] = useState(false);
    const [showPasswordError, setShowPasswordError] = useState(false);

    // Handles multiple form inputs
    const handleChange = (e) => {
        let { name, value } = e.target;
        if(value === "true" || value === "false"){
            setFormState({...formState, [name]: e.target.checked})
        } else {
            setFormState({...formState, [name]: value})
        }
    }

    const classes = useStyles();

    const resetFields = () => {
        setFormState(
            {
                url: '',
                dataBaseName: '',
                name: '',
                user: '',
                password: '',
                isPublic: false,
                proxyThroughAppServer: false,
                encrypted: false
            })
    };

    const resetErrors = () => {
        setShowUrlError(false);
        setShowDatabaseNameError(false);
        setShowNameError(false);
        setShowUserError(false);
        setShowPasswordError(false);
    };

    const handleSubmit = () => {
        if (
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
                // currently no validation for databaseName, it is not a required field
                {
                    input: user,
                    functions: [],
                    onError: () => setShowUserError(true)
                },
                {
                    input: password,
                    functions: [],
                    onError: () => setShowPasswordError(true)
                }
            ])
        ) {
            const properties = { name, url, databaseName, encrypted, proxyThroughAppServer };
            properties.user = 'NOT_STORED_IN_SERVER';
            properties.password = 'NOT_STORED_IN_SERVER';
            properties.isPrivate = !isPublic;
            const variables = {input: properties};
            runMutation(CREATE_DB_CONNECTION, variables, (result) => {
                const databaseId = (result && result.data && result.data.dbConnection) ? result.data.dbConnection.id : null;
                if (!databaseId) {
                    alert('Database Id not returned, will not store username and password');
                } else {
                    storeUserNameAndPasswordLocally(databaseId, user, password);
                }
                onClose();
                resetFields();
                resetErrors();
                refetch();
            }, (error) => {
                const errorMessage = (error && error.message) ? error.message : `${error}`;
                if (errorMessage.match(/Max number of licensed (.+) reached/)) {
                    const maxedThing = errorMessage.match(/Max number of licensed (.+) reached/)[1];
                    showMaxReachedUpgradeLicenseMessage(maxedThing);
                } else {
                    alert(errorMessage);
                }
                //alert(error);
            });
        }
    };

    const {name, user, url, databaseName, encrypted, proxyThroughAppServer, isPublic, password} = formState;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={() => {
                onClose();
                resetFields();
                resetErrors();
            }}
            buttonName="Create"
            size={"tiny"}
            onSubmit={() => {
                resetErrors();
                handleSubmit();
            }}
        >
            <div className={classes.root}>
                <Typography variant="h5">
                    Create Connection
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
                            fullWidth
                        />
                        <TextField
                            variant='outlined'
                            label="Database Name"
                            value={databaseName}
                            error={showDatabaseNameError}
                            name="databaseName"
                            onChange={handleChange}
                            fullWidth
                        />
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
                                        color='primary'/>
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
                                    />
                                }
                                label="Proxy"
                            />
                        </FormGroup>
                    </div>

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
                </form>
            </div>
        </FormModal>
    );
};

CreateDatabaseConnectionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default CreateDatabaseConnectionModal;
