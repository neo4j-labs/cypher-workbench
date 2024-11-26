
import { grabLock } from '../../persistence/graphql/GraphQLGraphDoc';
import SecurityRole from './SecurityRole';
import { ALERT_TYPES, USER_ROLE } from '../../common/Constants';
import { NETWORK_STATUS } from '../../persistence/graphql/GraphQLPersistence';


/* args:
    props:
        setStatus: function to set a status message in calling app
        persistenceHelper: persistence helper for the Graph Doc
        GraphDocType: GraphDocType that we asking if locked 
        showDialog: function to show dialog to user
    messageContext:
        messageName: from a data save message
        messagePayload: from a data save message
        graphDocMetadata: metadata for the graph doc
        dataProvider: data provider for the graph doc
    setNetworkStatus: utility function to set network status in toolbar
    lockInfo: lock info returned from graph doc graphql call
    errorStr: error string from communication helper
    skipStoreLocally: if true, don't try to store locally, 
        therefore invalidating need for messageName, messagePayload, dataProvider
*/

export const promptLockedDocument = ({props, messageContext, setNetworkStatus, skipStoreLocally, lockInfo, errorStr}) => {
    const { messageName, messagePayload, graphDocMetadata, dataProvider } = messageContext;
    var actions = [
        {
            text: 'Grab lock and Edit',
            onClick: (button, index, closeDialog) => {
                props.setStatus("Grabbing lock", true);
                grabLock(graphDocMetadata.key, (response) => {
                    if (response.success) {
                        if (!skipStoreLocally) {
                            console.log('saving change after lock grant');
                            props.persistenceHelper.storeLocallyAndScheduleRetry(
                                messageName, messagePayload, graphDocMetadata, dataProvider
                            );
                        }
                        props.setStatus('Lock grabbed', false);
                        alert('Lock grabbed', ALERT_TYPES.INFO);
                    } else {
                        props.setStatus(response.error, false);
                        alert(response.error);
                    }
                    closeDialog();
                });
            },
            autofocus: false
        },
        {
            text: 'Switch to Viewer',
            onClick: (button, index, closeDialog) => {
                props.setStatus('Temporarily switched to VIEWER', false);
                alert('Any changes you make will not be saved.', ALERT_TYPES.WARNING);
                SecurityRole.setRole(USER_ROLE.VIEWER);
                setNetworkStatus(NETWORK_STATUS.ONLINE);
                closeDialog();
            },
            autofocus: true
        }
    ];
    handleLockedModel({props, lockInfo, errorStr, actions});
}

const handleLockedModel = ({props, lockInfo, errorStr, actions}) => {
    var lockedByUser = '';
    var lockTimestamp = 0; 
    if (lockInfo) {
        lockedByUser = lockInfo.lockedByUser;
        lockTimestamp = lockInfo.lockTimestamp;
    } else if (errorStr) {
        var matches = errorStr.match(/locked by user '(.+)' at (.+)/);
        var description = `${props.GraphDocType} is locked`;
        if (matches[1] && matches[2]) {
            lockedByUser = matches[1];
            lockTimestamp = matches[2];
        }
    }
    var firstPartOfDescription = `${props.GraphDocType} is locked`;
    if (lockedByUser && lockTimestamp) {
        firstPartOfDescription = `${props.GraphDocType} was locked by ${lockedByUser} at ${new Date(parseInt(lockTimestamp)).toLocaleString()}`
    } else if (lockedByUser) {
        firstPartOfDescription = `${props.GraphDocType} was locked by ${lockedByUser}`
    } 
    var description = `${firstPartOfDescription}. Your version may be out of date. Please consider reloading the ${props.GraphDocType} before editing. What would you like to do?`;
    props.showDialog(`${props.GraphDocType} is Locked`, description, actions);
}

