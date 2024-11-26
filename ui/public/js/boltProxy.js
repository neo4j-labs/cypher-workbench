
window.mainBoltProxyDriverId = null;
window.boltProxyNeoDrivers = {};

window.boltProxy = {
    isTestId: (id) => (id && id.match && id.match(/test$/)),
    connectToNeo: (connectionInfo, successCallback, errorCallback) => {
        try {
            if (!boltProxy.isTestId(connectionInfo.id)) {
                // for now, only allow one main driver - so check if any other drivers are connected and disconnect
                Object.keys(boltProxyNeoDrivers).map((id) => boltProxy.disconnectFromNeo(id));
            }
            //var driverConfig = (connectionInfo.encrypted) ? {encrypted: true} : undefined;
            var driverConfig = {};
            if (!connectionInfo.url.match(/bolt\+s/) && !connectionInfo.url.match(/neo4j\+s/)) {
                driverConfig = {encrypted: connectionInfo.encrypted};
            }
    
            var neoDriver = neo4j.driver(connectionInfo.url, neo4j.auth.basic(connectionInfo.username, connectionInfo.password), driverConfig);
            boltProxyNeoDrivers[connectionInfo.id] = {
                driver: neoDriver,
                connectionInfo: {
                    id: connectionInfo.id,
                    name: connectionInfo.name,
                    url: connectionInfo.url,
                    databaseName: connectionInfo.databaseName,
                    encrypted: connectionInfo.encrypted
                }
            }
    
            boltProxy.verifyConnection(connectionInfo, () => {
                if (!boltProxy.isTestId(connectionInfo.id)) {
                    mainBoltProxyDriverId = connectionInfo.id;
                }
                console.log(`Connected and verified connection to name: ${connectionInfo.name}, url: ${connectionInfo.url}, database: ${connectionInfo.databaseName}`);
                successCallback();
            }, (error) => {
                delete boltProxyNeoDrivers[connectionInfo.id];
                errorCallback(error);
            });
        } catch (error) {
            delete boltProxyNeoDrivers[connectionInfo.id];
            errorCallback('' + error + ', have you specified a bolt or neo4j url?');
        }
    },
    disconnectFromNeo: (driverId) => {
        if (!driverId) {
            driverId = mainBoltProxyDriverId;
        }
        var driverInfo = boltProxyNeoDrivers[driverId];
        if (driverInfo) {
            if (driverInfo.driver) {
                console.log(`Closed connection to name: ${driverInfo.connectionInfo.name}, url: ${driverInfo.connectionInfo.url}`);
                driverInfo.driver.close();
            }
            delete boltProxyNeoDrivers[driverId];
        }
        if (driverId === mainBoltProxyDriverId) {
            mainBoltProxyDriverId = null;
        }
    },
    getNeoDriver: (driverId, errorCallback, errorMessage) => {
        var neoDriver = boltProxyNeoDrivers[driverId];
        if (neoDriver) {
            return neoDriver.driver;
        } else {
            if (errorCallback) {
                errorMessage = (errorMessage) ? errorMessage : "No active connection to Neo4j. Please connect to Neo4j first.";
                errorCallback(errorMessage);
            }
        }
        return null;
    },
    verifyConnection: (connectionInfo, successCallback, errorCallback) => {
        var neoDriver = boltProxy.getNeoDriver(connectionInfo.id, errorCallback, "Error verifying connection");
        if (neoDriver) {
            const { databaseName } = connectionInfo;
            var session = (databaseName) ? neoDriver.session({ database: databaseName }) : neoDriver.session();  
            const result = session.run('MATCH (n) RETURN count(n)');
            if (!result || !result.subscribe) {
                errorCallback('Error verifying connection, have you specified a bolt or neo4j url?');
                return;
            }
            result.subscribe({
                onNext: (record) => {
                    // do nothing
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
        }
    },
    runCypherWithTransactionConfig: (cypher, parameters, transactionConfig, completionCallback, errorCallback) => {
        return boltProxy.runCypherWithDriverId(mainBoltProxyDriverId, cypher, parameters, transactionConfig, completionCallback, errorCallback);
    },
    runCypher: (cypher, parameters, completionCallback, errorCallback) => {
        return boltProxy.runCypherWithDriverId(mainDriverId, cypher, parameters, undefined, completionCallback, errorCallback);
    },
    runCypherWithDriverId (driverId, cypher, parameters, transactionConfig, completionCallback, errorCallback) {
        //console.log('running: ' + cypher);
        var neoDriver = boltProxy.getNeoDriver(driverId, errorCallback);
        if (neoDriver) {
            var connectionInfo = boltProxy.getCurrentConnectionInfo(driverId);        
            const databaseName = (connectionInfo) ? connectionInfo.databaseName : '';
            var session = (databaseName) ? neoDriver.session({ database: databaseName }) : neoDriver.session();
            var results = {headers: [], rows:[]}
    
            const result = session.run(cypher, parameters, transactionConfig);
            //console.log(result);
            result.subscribe({
                onNext: record => {
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
                    if (hasValues)
                        results.rows.push(row);
                },
                onCompleted: () => {
                    session.close();
                    if (completionCallback) {
                        completionCallback(results, cypher);
                    }
                },
                onError: (error) => {
                    //alert(error);
                    if (errorCallback) {
                        errorCallback(error, cypher);
                    }
                }
            });
        }
    },
    getCurrentConnectionInfo: (driverId) => {
        if (!driverId) {
            driverId = mainBoltProxyDriverId;
        }
        if (boltProxyNeoDrivers[driverId] !== undefined) {
            return boltProxyNeoDrivers[driverId].connectionInfo;
        } else {
            return null;
        }
    }
}
