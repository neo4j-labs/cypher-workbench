import neo4j from "neo4j-driver";
import { decrypt, encrypt } from "./encryption";
import { performance } from "perf_hooks";
import { get } from "http";
import { VERSION } from '../version'

// map of dbConnection id -> driver for that db
// TODO: don't maintain application state in global variable,
// find a better way of managing a variable amount of drivers

const TRANSACTION_TIMEOUT_DEFAULT = 30 * 1000; // 30 seconds
const RESULT_LIMIT_DEFAULT = 1000;
const RESPONSE_SIZE_LIMIT_DEFAULT = 10 * 1024 * 1024; // 10 MB

const MAX_ACTIVE_DRIVERS_DEFAULT = 1000;
const IDLE_CONNETION_TIMEOUT_DEFAULT = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// for testing
//const MAX_ACTIVE_DRIVERS_DEFAULT = 1;
//const IDLE_CONNETION_TIMEOUT_DEFAULT = 15 * 1000; // 15 seconds
//const CLEANUP_INTERVAL = 5 * 1000; // 5 seconds

const drivers = {};
const dbConnectionCache = {};

export const ensureMaxDrivers = () => {
  const maxActiveDrivers = getMaxActiveDrivers();
  var activeDrivers = Object.values(drivers);
  if (Object.keys(drivers).length >= maxActiveDrivers - 1) {
    activeDrivers.sort((a, b) => b.lastAccessTime - a.lastAccessTime); // sort desc
    activeDrivers.slice(maxActiveDrivers - 1).map((driverObj) => {
      const { driver, id } = driverObj;
      closeDriver(driver, id);
    });
  }
};

export const initializeDriver = (dbConnection, userKeys, passwordKeys) => {
  const { id, url, encrypted, encryptedUser, encryptedPassword } = dbConnection;
  if (
    dbConnectionCache[id] !== undefined &&
    doDBConnectionsMatch(dbConnectionCache[id], dbConnection)
  ) {
    if (drivers[id]) {
      drivers[id].lastAccessTime = new Date().getTime();
    }
    return drivers[id];
  }

  ensureMaxDrivers();

  console.log(`Creating driver id ${id}...`);
  if (id in drivers) {
    drivers[id].driver.close();
  }
  const startTime = performance.now();
  var driverConfig = { 
    disableLosslessIntegers: true,
    userAgent: `neo4j-cypher-workbench-proxy/v${VERSION}`
  };
  if (!url.match(/bolt\+s/) && !url.match(/neo4j\+s/)) {
    driverConfig.encrypted = encrypted;
  }

  /* for testing */
  //console.log('decrypted user: ');
  //console.log(decrypt(encryptedUser, userKeys));
  //console.log('decrypted password: ');
  //console.log(decrypt(encryptedPassword, passwordKeys));
  const driver = neo4j.driver(
    url,
    neo4j.auth.basic(decrypt(encryptedUser, userKeys), decrypt(encryptedPassword, passwordKeys)),
    driverConfig
  );
  var driverObj = {
    id: id,
    driver: driver,
    lastAccessTime: new Date().getTime(),
  };
  drivers[id] = driverObj;
  dbConnectionCache[id] = dbConnection;
  const elapsed = performance.now() - startTime;
  console.log(`Finished creating driver in ${elapsed} ms`);
  return driverObj;
};

const doDBConnectionsMatch = (c1, c2) => {
  if (
    c1.url === c2.url &&
    c1.encrypted === c2.encrypted &&
    c1.encryptedPassword === c2.encryptedPassword &&
    c1.encryptedUser === c2.encryptedUser
  ) {
    return true;
  }
  return false;
};

export const runQuery = async (driverObj, query, args, database) => {
  let session;
  const { id, driver } = driverObj;
  if (drivers[id]) {
    drivers[id].lastAccessTime = new Date().getTime();
  }

  if (database === "default" || database === undefined) {
    session = driver.session();
  } else {
    session = driver.session({ database: database });
  }
  const txConfig = { timeout: getTransactionTimeout() };
  const result = await session.run(query, args, txConfig);
  session.close();
  return result;
};

export const runQueryExplicit = async (
  driverObj,
  query,
  args,
  database,
  isRead
) => {
  let session;
  const { id, driver } = driverObj;
  if (drivers[id]) {
    drivers[id].lastAccessTime = new Date().getTime();
    //console.log(`${id} lastAccessTime ${drivers[id].lastAccessTime}`);
  }

  if (isRead) {
    if (database === "default" || database === undefined) {
      session = driver.session({ defaultAccessMode: neo4j.session.READ });
    } else {
      session = driver.session({
        database: database,
        defaultAccessMode: neo4j.session.READ,
      });
    }
  } else {
    if (database === "default" || database === undefined) {
      session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    } else {
      session = driver.session({
        database: database,
        defaultAccessMode: neo4j.session.WRITE,
      });
    }
  }
  const txConfig = { timeout: getTransactionTimeout() };
  //console.log('query: ', query);
  //console.log('args: ', args);
  const queryResult = session.run(query, args, txConfig);
  var processedResult = await processResults(queryResult, session);
  return processedResult;
};

// https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript/34332105
function byteLength(str) {
  // returns the byte length of an utf8 string
  var s = str.length;
  for (var i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s += 2;
    if (code >= 0xdc00 && code <= 0xdfff) i--; //trail surrogate
  }
  return s;
}

const processResults = (queryResult, session) => {
  var headers = [];
  var rows = [];
  var numRecordsProcessed = 0;
  var totalSizeProcessed = 0;
  var stopProcessing = false;

  var resultLimit = getResultLimit();
  var responseSizeLimit = getResponseSizeLimit();

  return new Promise((resolve, reject) => {
    queryResult.subscribe({
      onKeys: (keys) => (headers = keys),
      onNext: (record) => {
        if (!stopProcessing) {
          var hasValues = false;
          var row = {};
          record.keys.forEach(function (key) {
            var value = record.get(key);
            row[key] = value;
            if (value) {
              hasValues = true;
            }
          });
          var jsonRow = JSON.stringify(row);
          totalSizeProcessed += byteLength(jsonRow);
          if (hasValues) {
            rows.push(row);
          }
          numRecordsProcessed++;
        }

        if (
          numRecordsProcessed >= resultLimit ||
          totalSizeProcessed >= responseSizeLimit
        ) {
          stopProcessing = true;
        }
      },
      onCompleted: () => {
        session.close();
        resolve({ headers, rows, error: null, numRows: rows.length });
      },
      onError: (error) => {
        session.close();
        resolve({ error: error.toString(), headers: [], rows: [], numRows: 0 });
      },
    });
  });
};

const getIntEnvParam = (paramName, defaultValue) => {
  var paramValue = process.env[paramName];
  if (paramValue) {
    paramValue = parseInt(paramValue);
    if (isNaN(paramValue)) {
      paramValue = defaultValue;
    }
  } else {
    paramValue = defaultValue;
  }
  return paramValue;
};

const getTransactionTimeout = () =>
  getIntEnvParam("TRANSACTION_TIMEOUT", TRANSACTION_TIMEOUT_DEFAULT);
const getMaxActiveDrivers = () =>
  getIntEnvParam("MAX_ACTIVE_DRIVERS", MAX_ACTIVE_DRIVERS_DEFAULT);
const getIdleConnectionTimeout = () =>
  getIntEnvParam("IDLE_CONNETION_TIMEOUT", IDLE_CONNETION_TIMEOUT_DEFAULT);
const getResultLimit = () =>
  getIntEnvParam("RESULT_LIMIT", RESULT_LIMIT_DEFAULT);
const getResponseSizeLimit = () =>
  getIntEnvParam("RESPONSE_SIZE_LIMIT", RESPONSE_SIZE_LIMIT_DEFAULT);

const closeDriver = (driver, id) => {
  var now = new Date().getTime();
  try {
    driver.close();
    console.log(`Closed driver ${id} at ${new Date(now)}`);
  } catch (e) {
    console.log(`Error closing driver id ${id}`, e);
  }
  delete drivers[id];
  delete dbConnectionCache[id];
};

const cleanupConnections = () => {
  //console.log('cleanup connections called');
  setTimeout(cleanupConnections, CLEANUP_INTERVAL);
  const idleConnectionTimeout = getIdleConnectionTimeout();
  //console.log('idleConnectionTimeout', idleConnectionTimeout);
  var now = new Date().getTime();
  var expiredDriverTime = now - idleConnectionTimeout;
  //console.log('now: ', new Date(now));
  //console.log('expiredDriverTime', new Date(expiredDriverTime));

  const expiredDriverObjs = Object.values(drivers).filter(
    (driverObj) => driverObj.lastAccessTime < expiredDriverTime
  );

  //console.log('expiredDriverObjs.length: ', expiredDriverObjs.length);
  expiredDriverObjs.map((expiredDriverObj) => {
    const { driver, id } = expiredDriverObj;
    closeDriver(driver, id);
  });
};

cleanupConnections();
