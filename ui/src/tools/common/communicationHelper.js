
import { ALERT_TYPES, USER_ROLE } from '../../common/Constants';
import { NETWORK_STATUS } from '../../persistence/graphql/GraphQLPersistence';
import { ensureProperties } from './util';
import { promptLockedDocument } from './lockHelper';

const NUM_ERRORS_BEFORE_GOING_OFFLINE = 8;
//const NUM_ERRORS_BEFORE_GOING_OFFLINE = 1;    // for testing

export class CommunicationHelper {

    networkErrorMessageDisplayed = true;
    numNetworkErrors = 0;
    props = {};
    retryTimer = null;

    constructor (properties) {
        var requiredProperties = [
            'graphDocContainer',
            'persistenceHelper',
            'getNetworkStatus', 
            'setNetworkStatus', 
            'setStatus',
            'showDialog',
            'GraphDocType'
        ];
        requiredProperties.map(prop => {
            ensureProperties('CommunicationHelper', properties, prop);
        });
        this.props = properties;
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
                //console.log('setOnline true')
                this.numNetworkErrors = 0;
                this.networkErrorMessageDisplayed = false;
                this.props.persistenceHelper.removeGraphDocFromLocalStorage();
                break;
            case NETWORK_STATUS.OFFLINE:
                //console.log('setOnline false')
                networkStatus = NETWORK_STATUS.OFFLINE;
                this.props.setStatus('Offline.', false);
                break;
            default:
                break;
        }
        this.props.setNetworkStatus(networkStatus);
    }

    handleGraphQLError = (response, messageName, messagePayload, graphDocMetadata, dataProvider) => {
        var errorStr = '' + response.error;
        var message = '';

        if (errorStr.match(/You do not have sufficient permission for that operation/)) {
            /*
            if (this.state.modelRole === USER_ROLE.OWNER) {
                message = 'Insufficient permissions: Please clone this model to save your changes.'
                this.props.setStatus(message, false);
                this.setState({ modelRole: USER_ROLE.VIEWER });
            }*/
            alert(message, ALERT_TYPES.INFO,
            {
                topMargin: '0px',
                bottomMargin: '75px',
                vertical: 'bottom',
                horizontal: 'center'
            });
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        } else if (errorStr.match(/Failed to invoke procedure `apoc.util.validate`: Caused by: java.lang.RuntimeException: locked by user/)) {
            const messageContext = { messageName, messagePayload, graphDocMetadata, dataProvider };
            promptLockedDocument({
                props: this.props, 
                messageContext, 
                setNetworkStatus: this.setNetworkStatus, 
                errorStr
            });
        } else if (errorStr.match(/Network error/)) {
            //console.log('network error');
            message = response.error + ', will attempt to retry';
            this.handleNetworkError(message);
            console.log('network error setting retry timer');
            this.props.persistenceHelper.storeLocallyAndScheduleRetry(
                messageName, messagePayload, graphDocMetadata, dataProvider
            );
        } else {
            alert(response.error);
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        }
    }

    handleNetworkError = (message) => {
        this.props.setStatus(message, false);
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

    tryToGoOnline = () => {
        console.log('tryToGoOnline')
        this.setNetworkStatus(NETWORK_STATUS.TRYING_TO_CONNECT);
        var localGraphDocString = this.props.persistenceHelper.getLocalStorageGraphDocString();
        if (localGraphDocString) {
            try {
                var localGraphDoc = JSON.parse(localGraphDocString);
                const {
                    messageName,
                    messagePayload,
                    graphDocMetadata,
                    serializedDataSaveObj    
                } = localGraphDoc;

                this.props.graphDocContainer.setActiveGraphDoc({
                    graphDocMetadata,
                    serializedDataSaveObj,
                    keepDataChangeFlags: true
                }, (graphDocMetadata, graphDoc) => {
                    console.log('tryToGoOnline: scheduleRetry');
                    this.props.persistenceHelper.scheduleRetry(messageName, messagePayload, graphDocMetadata, this.props.graphDocContainer.getDataProvider(), 2);
                });
            } catch (err) {
                console.log(localGraphDocString);
                var errorMessage = 'Found local graph doc, but has invalid JSON. JSON logged to console';
                alert(errorMessage);
                console.log(err);
                this.props.setStatus(errorMessage, false);
                // TODO: to some sort of network call to verify
                this.setNetworkStatus(NETWORK_STATUS.ONLINE);
            }
        } else {
            // TODO: to some sort of network call to verify
            this.setNetworkStatus(NETWORK_STATUS.ONLINE);
        }
    }

}