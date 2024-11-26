import React, { Component } from 'react'
import { ALERT_TYPES, USER_ROLE } from '../../../common/Constants';

import {
    grabModelLock,
    listRemoteDataModelMetadata,
    listRemoteDataModelMetadataAndAddExplicitMatches,
    searchRemoteDataModelMetadata,
    saveRemoteDataModel,
    NETWORK_STATUS
} from '../../../persistence/graphql/GraphQLPersistence';

const NUM_ERRORS_BEFORE_GOING_OFFLINE = 8;

export const PERSISTENCE_STATE_ITEMS = {
    DataModel: "DataModel",
    LoadedModelMetadata: "LoadedModelMetadata",
    ActiveModelKey: "ActiveModelKey",
    LoadDialog: "LoadDialog"
}

export class ModelPersistence extends Component {

    loading = false;
    dataChangeTimer = null;
    retryTimer = null;
    networkErrorMessageDisplayed = true;
    numNetworkErrors = 0;

    parentContainer;

    constructor (props) {
        super(props);
        this.parentContainer = this.props.parentContainer;
    }

    scheduleRetry = (message, modelMetadata, dataModel, numSeconds) => {
        console.log('scheduleRetry called');
        if (this.retryTimer) { clearTimeout(this.retryTimer); }
        this.retryTimer = setTimeout(() => this.saveDataModelChanges(message, modelMetadata, dataModel, true), numSeconds * 1000);
    }

    isOnline = () => {
        if (this.props.getNetworkStatus() === NETWORK_STATUS.ONLINE 
            || this.props.getNetworkStatus() === NETWORK_STATUS.UNSAVED        
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVING
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVED) {
            return true;
        } else {
            alert('Operation only permitted when online.', ALERT_TYPES.WARNING);
            return false;
        }
    }

    setNetworkStatus = (networkStatus) => {
        switch (networkStatus) {
            case NETWORK_STATUS.ONLINE:
                console.log('setOnline true')
                this.numNetworkErrors = 0;
                this.networkErrorMessageDisplayed = false;
                this.removeDataModelFromLocalStorage();
                break;
            case NETWORK_STATUS.OFFLINE:
                console.log('setOnline false')
                networkStatus = NETWORK_STATUS.OFFLINE;
                this.parentContainer.setStatus('Offline.', false);
                break;
            default:
                break;
        }
        this.props.setNetworkStatus(networkStatus);
    }

    removeDataModelFromLocalStorage = () => {
        // old
        localStorage.removeItem('localDataModel');

        // new
        const activeModelKey = this.props.getStateItem(PERSISTENCE_STATE_ITEMS.ActiveModelKey);
        if (activeModelKey) {
            localStorage.removeItem(`localDataModel_${activeModelKey}`);
            var localDataModelKeysString = localStorage.getItem('localDataModelKeys');
            if (localDataModelKeysString) {
                var localDataModelKeys = JSON.parse(localDataModelKeysString);
                var index = localDataModelKeys.indexOf(activeModelKey);
                if (index >= 0) {
                    localDataModelKeys.splice(index,1);
                    if (localDataModelKeys.length === 0) {
                        localStorage.removeItem('localDataModelKeys');
                    } else {
                        localStorage.setItem('localDataModelKeys', JSON.stringify(localDataModelKeys));
                    }
                }
            }
        }
    }

    getLocalStorageDataModelString = () => {
        // this is the old-way, pre 01/28/2021 - this is only here for 
        //  backward compatibility in case someone has this stored
        var localDataModelString = localStorage.getItem('localDataModel');
        if (!localDataModelString) {
            // this is the new way, post 01/28/2021
            var localDataModelKeysString = localStorage.getItem('localDataModelKeys');
            if (localDataModelKeysString) {
                var localDataModelKeys = JSON.parse(localDataModelKeysString);
                if (localDataModelKeys.length > 0) {
                    var lastKey = localDataModelKeys[localDataModelKeys.length - 1];
                    localDataModelString = localStorage.getItem(`localDataModel_${lastKey}`);
                }
            }
        }
        return localDataModelString;
    }

    tryToGoOnline = () => {
        console.log('tryToGoOnline')
        this.setNetworkStatus(NETWORK_STATUS.TRYING_TO_CONNECT);
        //var localDataModelString = localStorage.getItem('localDataModel');
        var localDataModelString = this.getLocalStorageDataModelString();
        if (localDataModelString) {
            try {
                var localDataModel = JSON.parse(localDataModelString);
                var { message, modelMetadata, dataModel } = localDataModel;
                //dataModel = JSON.parse(dataModel);
                console.log('dataModel from local storage', dataModel);
                this.parentContainer.setActiveDataModel(modelMetadata, dataModel, true, (modelInfo, dataModel) => {
                    console.log('tryToGoOnline: scheduleRetry');
                    this.scheduleRetry(message, modelInfo, dataModel, 2);
                });
            } catch (err) {
                console.log(localDataModelString);
                var errorMessage = 'Found local data model, but has invalid JSON. JSON logged to console';
                alert(errorMessage);
                this.parentContainer.setStatus(errorMessage, false);
                console.log(err);
                // TODO: to some sort of network call to verify
                this.setNetworkStatus(NETWORK_STATUS.ONLINE);
            }
        } else {
            // TODO: to some sort of network call to verify
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        }
    }

    handleNetworkError = (message) => {
        this.parentContainer.setStatus(message, false);
        if (!this.networkErrorMessageDisplayed) {
            console.log('display network message');
            alert(message);
            this.networkErrorMessageDisplayed = true;
        }
        this.numNetworkErrors++;
        console.log('networkError:', this.numNetworkErrors);
        if (this.numNetworkErrors > NUM_ERRORS_BEFORE_GOING_OFFLINE) {
            console.log('tooManyNetworkErrors, calling setOnline(false)')
            if (this.retryTimer) { clearTimeout(this.retryTimer); }
            this.setNetworkStatus(NETWORK_STATUS.OFFLINE);
        } else {
            this.setNetworkStatus(NETWORK_STATUS.NETWORK_RETRY);
        }
    }

    storeLocallyAndScheduleRetry = (modelMetadata, dataModel) => {
        var dataChangeMessage = {dataChangeType:''};  // we want to force saveRemoteDataModel because it is a superset of updateNodePosition
        this.saveDataModelChangesLocally(dataChangeMessage, modelMetadata, dataModel);
        if (this.props.getNetworkStatus() === NETWORK_STATUS.ONLINE || this.props.getNetworkStatus() === NETWORK_STATUS.NETWORK_RETRY) {
            this.scheduleRetry(dataChangeMessage, modelMetadata, dataModel, 15);
        }
    }

    handleLockedModel = (errorStr, actions) => {
        var matches = errorStr.match(/locked by user '(.+)' at (.+)/);
        var description = 'Model is locked';
        if (matches[1] && matches[2]) {
            description = `Model was locked by ${matches[1]} at ${new Date(parseInt(matches[2])).toLocaleString()}.
                Your version may be out of date. Please consider reloading the model before editing. What would you like to do?`
        }
        this.parentContainer.showGeneralDialog('Model is Locked', description, actions);
    }

    handleGraphQLError = (response, modelMetadata, dataModel) => {
        var errorStr = '' + response.error;
        var message = '';

        if (errorStr.match(/You do not have sufficient permission for that operation/)) {
            alert(message, ALERT_TYPES.INFO,
            {
                topMargin: '0px',
                bottomMargin: '75px',
                vertical: 'bottom',
                horizontal: 'center'
            });
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        } else if (errorStr.match(/Failed to invoke procedure `apoc.util.validate`: Caused by: java.lang.RuntimeException: locked by user/)) {
            var actions = [
                {
                    text: 'Grab lock and Edit',
                    onClick: (button, index) => {
                        this.parentContainer.setStatus("Grabbing lock", true);
                        grabModelLock(modelMetadata.key, (response) => {
                            if (response.success) {
                                console.log('saving change after lock grant');
                                this.storeLocallyAndScheduleRetry(modelMetadata, dataModel);
                                this.parentContainer.setStatus('Lock grabbed', false);
                                alert('Lock grabbed', ALERT_TYPES.INFO);
                            } else {
                                this.parentContainer.setStatus(response.error, false);
                                alert(response.error);
                            }
                            this.parentContainer.closeGeneralDialog();
                        });
                    },
                    autofocus: false
                },
                {
                    text: 'Switch to Viewer',
                    onClick: (button, index) => {
                        this.parentContainer.setStatus('Temporarily switched to VIEWER', false);
                        this.props.getSecurityRole().setRole(USER_ROLE.VIEWER);
                        this.parentContainer.closeGeneralDialog();
                    },
                    autofocus: true
                }
            ];
            this.handleLockedModel(errorStr, actions);
        } else if (errorStr.match(/Network error/)) {
            //console.log('network error');
            message = response.error + ', will attempt to retry';
            this.handleNetworkError(message);
            console.log('network error setting retry timer');
            this.storeLocallyAndScheduleRetry(modelMetadata, dataModel);
        } else {
            alert(response.error);
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        }
    }

    addLocalDataModelKey = (key) => {
        var localDataModelKeysString = localStorage.getItem('localDataModelKeys');
        var localDataModelKeys = [];
        if (localDataModelKeysString) {
            localDataModelKeys = JSON.parse(localDataModelKeysString);
        }
        if (!localDataModelKeys.includes(key)) {
            localDataModelKeys.push(key);
            localStorage.setItem('localDataModelKeys', JSON.stringify(localDataModelKeys));
        }
    }

    saveDataModelChangesLocally = (message, modelMetadata, dataModel) => {
        dataModel = dataModel.toSaveObject();
        console.log("saveDataModelChangesLocally dataModel", dataModel);
        this.props.setStateItem(PERSISTENCE_STATE_ITEMS.LoadedModelMetadata, modelMetadata);
        var saveKey = `localDataModel_${modelMetadata.key}`;
        localStorage.setItem(saveKey, JSON.stringify({
            message: message,
            modelMetadata: modelMetadata,
            dataModel: dataModel
        }));
        this.addLocalDataModelKey(modelMetadata.key);
    }

    onlineNetworkStatusTimer = null;
    setNetworkStatusToOnline = (delayInSeconds) => {
      if (this.onlineNetworkStatusTimer)
        clearTimeout(this.onlineNetworkStatusTimer);
      this.onlineNetworkStatusTimer = setTimeout(() => {
        this.setNetworkStatus(NETWORK_STATUS.ONLINE);
      }, delayInSeconds * 1000);
    };
  
    saveDataModelChanges = (message, modelMetadata, dataModel, isRetry) => {
        this.props.setStateItem(PERSISTENCE_STATE_ITEMS.LoadedModelMetadata, modelMetadata);
        var statusMessage = (this.props.getNetworkStatus() === NETWORK_STATUS.NETWORK_RETRY) ? 'Retrying Autosave...' : 'Autosaving...';
        this.parentContainer.setStatus(statusMessage, true);
        
        if (this.props.getSecurityRole().canEdit() || isRetry) {
            this.setNetworkStatus(NETWORK_STATUS.SAVING);
            saveRemoteDataModel(modelMetadata, dataModel, (response) => {
                if (response.success) {
                    this.parentContainer.setStatus('Saved.', false);
                    //console.log('saveRemoteDataModel success, we are online');
                    dataModel.setIsRemotelyPersisted(true);
                    //this.setNetworkStatus(NETWORK_STATUS.ONLINE);
                    this.setNetworkStatus(NETWORK_STATUS.SAVED);
                    this.setNetworkStatusToOnline(5);
                } else {
                    //console.log('saveRemoteDataModel failure, calling handleGraphQLError');
                    this.handleGraphQLError(response, modelMetadata, dataModel);
                }
            });
        } else {
            this.parentContainer.setStatus("As a Viewer, these changes will not be saved");
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        }
    }

    dataModelChangeListener = (message) => {
        //console.log('data model change');
        if (this.parentContainer.state) {
            if (this.retryTimer) { clearTimeout(this.retryTimer); } // clearing this timer because dataChangeTimer will pick up any relevant changes
            if (this.dataChangeTimer) { clearTimeout(this.dataChangeTimer); }

            this.parentContainer.setStatus('',false);
            this.setNetworkStatus(NETWORK_STATUS.UNSAVED);            
            this.dataChangeTimer = setTimeout(() => {
                this.dataChangeTimer = null;
                //console.log('saving data');
                var dataModel = this.props.getStateItem(PERSISTENCE_STATE_ITEMS.DataModel);
                var loadedModelMetadata = this.props.getStateItem(PERSISTENCE_STATE_ITEMS.LoadedModelMetadata);

                if (loadedModelMetadata) {
                    var modelMetadata = {
                        ...loadedModelMetadata,
                        dateUpdated: new Date().getTime().toString(),
                        viewSettings: {
                            parentContainerViewSettings: this.parentContainer.getViewSettings ? this.parentContainer.getViewSettings() : {},
                            canvasViewSettings: this.parentContainer.getDataModelCanvas().getViewSettings()
                        }
                    };
                    const networkStatus = this.props.getNetworkStatus();
                    const validNetworkStatuses = [
                        NETWORK_STATUS.ONLINE,
                        NETWORK_STATUS.NETWORK_RETRY,
                        NETWORK_STATUS.UNSAVED,
                        NETWORK_STATUS.SAVING,
                        NETWORK_STATUS.SAVED,
                      ];
            
                    if (validNetworkStatuses.includes(networkStatus)) {
                        console.log('dataModelChangeListener: online: calling saveDataModelChanges')
                        this.saveDataModelChanges(message, modelMetadata, dataModel);
                    } else {
                        console.log('dataModelChangeListener: online: calling saveDataModelChangesLocally')
                        this.parentContainer.setStatus('Offline. Saved changes locally.', false);
                        this.saveDataModelChangesLocally(message, modelMetadata, dataModel);
                    }
                }
            }, 2000);
        }
    }

    getModelMetadataMapAndAddExplicitMatches = (explicitKeysToSearchFor, callback) => {
        var loadDialog = this.props.getStateItem(PERSISTENCE_STATE_ITEMS.LoadDialog);
        const { includePublic, myOrderBy, orderDirection } = loadDialog;
        this.parentContainer.setStatus('Loading...', true);
        listRemoteDataModelMetadataAndAddExplicitMatches(explicitKeysToSearchFor, includePublic, myOrderBy, orderDirection, (response) => {
            this.parentContainer.setStatus('', false);
            this.parentContainer.handleMetadataResponse(response, 'listDataModelsAndAddExplicitMatches', callback);
        });
    }

    getModelMetadataMap = (callback) => {
        var loadDialog = this.props.getStateItem(PERSISTENCE_STATE_ITEMS.LoadDialog);
        const { searchText, includePublic, myOrderBy, orderDirection } = loadDialog;
        if (searchText) {
            this.parentContainer.setStatus('Searching...', true);
            searchRemoteDataModelMetadata(searchText, includePublic, myOrderBy, orderDirection, (response) => {
                this.parentContainer.setStatus('', false);
                this.parentContainer.handleMetadataResponse(response, 'searchDataModelsX', callback);
            });
        } else {
            this.parentContainer.setStatus('Loading...', true);
            listRemoteDataModelMetadata(includePublic, myOrderBy, orderDirection, (response) => {
                this.parentContainer.setStatus('', false);
                this.parentContainer.handleMetadataResponse(response, 'listDataModelsX', callback);
            });
        }
    }
}