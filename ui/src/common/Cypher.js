
import neo4j, { Integer } from 'neo4j-driver';
import { encryptAsymmetricOnlyWithVersion, getUserNameAndPasswordLocally } from './encryption';
import { executeCypherQuery } from '../persistence/graphql/GraphQLDBConnection';
import { VERSION } from '../version';

// a map of { dbId: { driver: null, connectionInfo: null } }
var neoDrivers = {};
var mainDriverId = null;
var showNeoConnectionDialogRef = null;
//var connectionInfo = null;

export function setShowNeoConnectionDialogRef (showNeoConnectionDialogRefVar) {
    showNeoConnectionDialogRef = showNeoConnectionDialogRefVar;
}

export function showNeoConnectionDialog (properties) {
    if (showNeoConnectionDialogRef) {
        showNeoConnectionDialogRef(properties);
    }
}

export function getCurrentConnectionInfo (driverId) {
    if (!driverId) {
        driverId = mainDriverId;
    }
    if (neoDrivers[driverId] !== undefined) {
        return neoDrivers[driverId].connectionInfo;
    } else {
        return null;
    }
}

export const getConnectionInfoWithEncryptedUsernameAndPassword = async ({driverId, connectionInfo}) => {
    if (!driverId) {
        driverId = mainDriverId;
    }
    if (!connectionInfo) {
        connectionInfo = getCurrentConnectionInfo(driverId);
    }
    if (connectionInfo) {
        const { username, password } = await getUserNameAndPasswordLocally(driverId);        
        var encryptedUsername = encryptAsymmetricOnlyWithVersion(username);
        var encryptedPassword = encryptAsymmetricOnlyWithVersion(password);
        var connectionInfoCopy = { 
            ...connectionInfo,
            encryptedUsername: encryptedUsername.encryptedValue,
            encryptedUsernamePublicKey: encryptedUsername.publicKey,
            encryptedPassword: encryptedPassword.encryptedValue,
            encryptedPasswordPublicKey: encryptedPassword.publicKey
        };
        return connectionInfoCopy;
    } else {
        return null;
    }
}

export function currentlyConnectedToNeo (driverId) {
    if (!driverId) {
        driverId = mainDriverId;
    }
    if (neoDrivers[driverId] !== undefined) {
        return (
                (neoDrivers[driverId].neoDriver !== null && neoDrivers[driverId].neoDriver !== undefined)
                || neoDrivers[driverId].connectionInfo.graphQLNeoProxy
            );
    } else {
        return null;
    }
}

export function connectionIsProxied (driverId) {
    if (!driverId) {
        driverId = mainDriverId;
    }
    if (neoDrivers[driverId] !== undefined) {
        return neoDrivers[driverId].connectionInfo.graphQLNeoProxy;
    }
    return false;
}

function isTestId (id) {
    return (id && id.match && id.match(/test$/));
}

export function graphQLExecuteCypherQuery (driverId, connectionInfo, cypherQuery, cypherParameters, successCallback, errorCallback) {
    executeCypherQuery(driverId, connectionInfo, cypherQuery, cypherParameters, (response) => {
        const { success } = response;
        if (success) {
            const { headers, rows, numRows } = response;
            successCallback({ proxy: true, headers, rows, numRows });
        } else {
            const { error } = response;
            errorCallback(error);
        }
    });
}

function convertInt (integer) {    
    if (integer.low !== undefined && integer.high !== undefined) {
        return new Integer(integer.low && integer.high).toInt();
    } else {
        return integer;
    }
}

export function graphQLConnectToNeo (connectionInfo, successCallback, errorCallback) {
    const cypherQuery = 'MATCH (n) RETURN count(n) as count';
    // clear these out so they aren't sitting around in memory
    var encryptedUsername = encryptAsymmetricOnlyWithVersion(connectionInfo.username);
    var encryptedPassword = encryptAsymmetricOnlyWithVersion(connectionInfo.password);
    connectionInfo.encryptedUsername = encryptedUsername.encryptedValue;
    connectionInfo.encryptedUsernamePublicKey = encryptedUsername.publicKey;
    connectionInfo.encryptedPassword = encryptedPassword.encryptedValue;
    connectionInfo.encryptedPasswordPublicKey = encryptedPassword.publicKey;
    
    executeCypherQuery(connectionInfo.id, connectionInfo, cypherQuery, {}, (response) => {
        const { success } = response;
        if (success) {
            const { headers, rows, numRows } = response;
            if (headers.includes('count') && ((numRows === 1 && convertInt(rows[0]['count']) >= 0) || numRows === 0)) {
                neoDrivers[connectionInfo.id] = {
                    neoDriver: null,
                    connectionInfo: {
                        id: connectionInfo.id,
                        graphQLNeoProxy: true,
                        name: connectionInfo.name,
                        url: connectionInfo.url,
                        databaseName: connectionInfo.databaseName,
                        encrypted: connectionInfo.encrypted,
                        encryptedUsername: connectionInfo.encryptedUsername,
                        encryptedUsernamePublicKey: connectionInfo.encryptedUsernamePublicKey,
                        encryptedPassword: connectionInfo.encryptedPassword,
                        encryptedPasswordPublicKey: connectionInfo.encryptedPasswordPublicKey
                    }
                }                
                if (!isTestId(connectionInfo.id)) {
                    mainDriverId = connectionInfo.id;
                }
                console.log(`Connected and verified connection to name: ${connectionInfo.name}, url: ${connectionInfo.url}, database: ${connectionInfo.databaseName}`);
                successCallback({ proxy: true });
            } else {
                delete neoDrivers[connectionInfo.id];
                errorCallback("Unexpected return from server");
            }
        } else {
            const { error } = response;
            delete neoDrivers[connectionInfo.id];
            errorCallback(error);
        }
    });
}

export function connectToNeo (connectionInfo, successCallback, errorCallback) {
    // these 2 lines were for testing
    //const graphQLNeoProxy = true;
    //connectionInfo.graphQLNeoProxy = graphQLNeoProxy;
    //if (true) {
    if (connectionInfo && (connectionInfo.graphQLNeoProxy || connectionInfo.proxyThroughAppServer)) {
        return graphQLConnectToNeo(connectionInfo, successCallback, errorCallback);
    }

    try {
        if (!isTestId(connectionInfo.id)) {
            // for now, only allow one main driver - so check if any other drivers are connected and disconnect
            Object.keys(neoDrivers).map((id) => disconnectFromNeo(id));
        }
        //var driverConfig = (connectionInfo.encrypted) ? {encrypted: true} : undefined;
        var driverConfig = { 
            // disableLosslessIntegers: true,
            userAgent: `neo4j-cypher-workbench-ui/v${VERSION}`
        };
        if (!connectionInfo.url.match(/bolt\+s/) && !connectionInfo.url.match(/bolt\+ssc/)
         && !connectionInfo.url.match(/neo4j\+s/) && !connectionInfo.url.match(/neo4j\+ssc/)) {
            driverConfig.encrypted = connectionInfo.encrypted;
        }

        var neoDriver = neo4j.driver(connectionInfo.url, neo4j.auth.basic(connectionInfo.username, connectionInfo.password), driverConfig);
        neoDrivers[connectionInfo.id] = {
            neoDriver: neoDriver,
            connectionInfo: {
                id: connectionInfo.id,
                graphQLNeoProxy: false,
                name: connectionInfo.name,
                url: connectionInfo.url,
                databaseName: connectionInfo.databaseName,
                encrypted: connectionInfo.encrypted
            }
        }

        verifyConnection(connectionInfo, () => {
            if (!isTestId(connectionInfo.id)) {
                mainDriverId = connectionInfo.id;
            }
            console.log(`Connected and verified connection to name: ${connectionInfo.name}, url: ${connectionInfo.url}, database: ${connectionInfo.databaseName}`);
            successCallback();
        }, (error) => {
            /*
            if (isInsecureWebSocketError(connectionInfo, error) && !connectionInfo.graphQLNeoProxy) {
                useGraphQLNeoProxyConnection(connectionInfo);
                graphQLConnectToNeo(connectionInfo, successCallback, (error) => {
                    delete neoDrivers[connectionInfo.id];
                    errorCallback(error);
                });
            } else {
                */
                delete neoDrivers[connectionInfo.id];
                errorCallback(error);
            //}
        });
    } catch (error) {
        delete neoDrivers[connectionInfo.id];
        errorCallback('' + error + ', have you specified a bolt or neo4j url?');
    }
}

export function disconnectFromNeo (driverId) {
    if (!driverId) {
        driverId = mainDriverId;
    }
    var driverInfo = neoDrivers[driverId];
    if (driverInfo) {
        if (!driverInfo.graphQLNeoProxy && driverInfo.neoDriver) {
            console.log(`Closed connection to name: ${driverInfo.connectionInfo.name}, url: ${driverInfo.connectionInfo.url}`);
            driverInfo.neoDriver.close();
        }

        delete neoDrivers[driverId];
    }
    if (driverId === mainDriverId) {
        mainDriverId = null;
    }
}

function getNeoDriver (driverId, errorCallback, errorMessage) {
    var neoDriver = neoDrivers[driverId];
    if (neoDriver && (neoDriver.neoDriver || neoDriver.connectionInfo.graphQLNeoProxy)) {
        return neoDriver;
    } else {
        if (errorCallback) {
            errorMessage = (errorMessage) ? errorMessage : "No active connection to Neo4j. Please connect to Neo4j first.";
            errorCallback(errorMessage);
        }
    }
    return null;
}

function verifyConnection (connectionInfo, successCallback, errorCallback) {
    var neoDriverObj = getNeoDriver(connectionInfo.id, errorCallback, "Error verifying connection");
    var { neoDriver } = neoDriverObj;
    if (neoDriver) {
        const { databaseName } = connectionInfo;
        var session = (databaseName) ? neoDriver.session({ database: databaseName }) : neoDriver.session();        
        const result = session.run('MATCH (n) RETURN count(n)');
        var hasValues = false;
        if (!result || !result.subscribe) {
            errorCallback('Error verifying connection, have you specified a bolt or neo4j url?');
            return;
        }
        result.subscribe({
            onNext: record => {
                record.keys.forEach(function (key) {
                    var value = record.get(key);
                    if (value || value === 0)
                        hasValues = true;
                })
            },
            onCompleted: () => {
                session.close();
                if (successCallback) {
                    successCallback();
                }
            },
            onError: (error) => {
                neoDriver = null;
                if (errorCallback) {
                    errorCallback(error);
                }
            }
        });
    } else {
        errorCallback('No driver associated with id');
    }
}

export function isInsecureWebSocketError (connectionInfo, error) {
    //console.log('isInsecureWebSocketError error', error);
    var errorMessage = '';
    if (typeof(error) === 'string') {
        errorMessage = error;
    } else if (error && error.message && typeof(error.message) === 'string') {
        errorMessage = error.message;
    }
    return (!connectionInfo.encrypted && errorMessage.match(/An insecure WebSocket connection may not be initiated from a page loaded over HTTPS/));
}

export function runCypherWithTransactionConfig (cypher, parameters, transactionConfig, completionCallback, errorCallback) {
    return runCypherWithDriverId(mainDriverId, cypher, parameters, transactionConfig, completionCallback, errorCallback);
}

export function runCypherWithTransactionConfigAsPromise (cypher, parameters, transactionConfig) {
    return new Promise((resolve, reject) => {
        runCypherWithTransactionConfig(cypher, parameters, transactionConfig, (results, cypher) => {
            resolve({ results, cypher });
        }, (error, cypher) => {
            reject({ error, cypher })
        });
    });
}

export function runCypher (cypher, parameters, completionCallback, errorCallback) {
    return runCypherWithDriverId(mainDriverId, cypher, parameters, undefined, completionCallback, errorCallback);
}

export function runCypherAsPromise (cypher, parameters) {
    return new Promise((resolve, reject) => {
        runCypher(cypher, parameters, (results, cypher) => {
            resolve({ results, cypher });
        }, (error, cypher) => {
            reject({ error, cypher })
        });
    });
}

var mainSession = null;
// in order to stop the executing query by user request
export function closeMainDriverCurrentSession () {
    if (mainSession) {
        mainSession.close();
    }
}

export function runCypherWithDriverId (driverId, cypher, parameters, transactionConfig, completionCallback, errorCallback) {
    //console.log('running: ' + cypher);
    var connectionInfo = getCurrentConnectionInfo(driverId);        
    //if (true) {
    if (connectionInfo && connectionInfo.graphQLNeoProxy) {
        return graphQLExecuteCypherQuery (driverId, connectionInfo, cypher, parameters, completionCallback, errorCallback);
    }
    var neoDriverObj = getNeoDriver(driverId, errorCallback);
    var { neoDriver } = neoDriverObj;
    if (neoDriver) {
        const databaseName = (connectionInfo) ? connectionInfo.databaseName : '';
        var session = (databaseName) ? neoDriver.session({ database: databaseName }) : neoDriver.session();
        mainSession = session;
        var results = {headers: [], rows:[]}

        transactionConfig = transactionConfig || {};
        let resultLimit = transactionConfig.resultLimit;
        delete transactionConfig.resultLimit;
        if (!resultLimit || isNaN(resultLimit)) {
            resultLimit = 1000;
        }
        var numRecordsProcessed = 0;
        var stopProcessing = false;

        const result = session.run(cypher, parameters, transactionConfig);
        //console.log(result);
        result.subscribe({
            onNext: (record) => {
                if (!stopProcessing) {
                    if (results.headers.length === 0) {
                        results.headers = (record.keys) ? record.keys.filter(key => key !== 'null') : [];
                    }
                    var hasValues = false;
                    var row = {};
                    record.keys.forEach(function (key) {
                        var value = record.get(key);
                        row[key] = value;
                        if (value)
                            hasValues = true;
                    })
                    if (hasValues) {
                        results.rows.push(row);
                    }
                    numRecordsProcessed++;
                }
                if (numRecordsProcessed >= resultLimit) {
                    stopProcessing = true;
                }                
            },
            onCompleted: () => {
                session.close();
                if (completionCallback) {
                    completionCallback(results, cypher);
                }
            },
            onError: function (error) {
                // the underscore reference is to get around a stange react compile bug that seems to recognize useGraphQLNeoProxyConnection as a React Hook
                /*
                var _useGraphQLNeoProxyConnection = useGraphQLNeoProxyConnection;
                if (isInsecureWebSocketError(connectionInfo, error) && !connectionInfo.graphQLNeoProxy) {
                    _useGraphQLNeoProxyConnection(connectionInfo);
                    return graphQLExecuteCypherQuery (driverId, connectionInfo, cypher, parameters, completionCallback, errorCallback);
                } else {
                    if (errorCallback) {
                        errorCallback(error, cypher);
                    }
                }
                */
                if (errorCallback) {
                    errorCallback(error, cypher);
                }
            }
        });
    }
}

const useGraphQLNeoProxyConnection = (connectionInfo) => {
    var driver = neoDrivers[connectionInfo.id];
    if (driver) {
        driver.connectionInfo.graphQLNeoProxy = true;
    }
}

