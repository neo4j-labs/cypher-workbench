import { encrypt, decrypt } from "../util/encryption";
import neo4j from "neo4j-driver";
import { getUserAsymmetricDecryptionKeys } from './users';
import { runQuery, runQueryWithDriverAndConfig } from "../util/run";
import { initializeDriver, runQueryExplicit } from "../util/db";
import { processResult, getFirstRowValue } from './resultHelper';
import { isCloudLicense, getLicenseRestriction, LicenseRestriction } from '../license/license';

export const allDBConnectionsForUser = async context => {
  const query = `
    WITH $email as email
    MATCH (u:User{email:email})
    MATCH (db:DBConnection)
    WHERE u.primaryOrganization IN labels(db)
      AND (EXISTS((u)<-[:OWNER|MEMBER|VIEWER]-(db)) OR db.isPrivate<>true OR u:Admin)
    RETURN 
      apoc.map.merge(properties(db), { 
        databaseName: CASE WHEN db.databaseName IS NOT NULL THEN db.databaseName ELSE '' END,
        proxyThroughAppServer: CASE WHEN db.proxyThroughAppServer IS NOT NULL THEN db.proxyThroughAppServer ELSE false END
      }) as db
    ORDER BY db.createdAt
  `;
  const result = await runQuery(query, { email: context.email });

  //console.log("result.records: ", result.records);
  const dbConnections = result.records.map(
    //record => record.get("db").properties
    record => record.get("db")
  );
  return dbConnections;
};

export const findDBConnection = async id => {
  const query = `
    WITH $id as id, $email as email
    MATCH (u:User{email:email})
    MATCH (db:DBConnection{id:id})
      CALL apoc.util.validate(u.primaryOrganization IN labels(db),"permission denied (wrong org)",[0])
    RETURN apoc.map.merge(properties(db), { 
        databaseName: CASE WHEN db.databaseName IS NOT NULL THEN db.databaseName ELSE '' END
      }) as db
  `;
  const result = await runQuery(query, { id });
  //const dbConnection = result.records[0].get("db").properties;
  const dbConnection = result.records[0].get("db");
  return dbConnection;
};

export const createDBConnection = async (
  { name, url, databaseName, encrypted, proxyThroughAppServer, user, password, isPrivate },
  context
) => {
  const isCloud = isCloudLicense();
  const maxNumberOfDatabases = (isCloud) ? 0 : getLicenseRestriction(LicenseRestriction.MaxNumberOfDatabases);
  const query = `
    WITH $email as email, $name as name, $url as url, $databaseName as databaseName,
        $encrypted as encrypted, $proxyThroughAppServer as proxyThroughAppServer, 
        $user as user, $password as password, $isPrivate as isPrivate,
        $maxNumberOfDatabases as maxNumberOfDatabases, $isCloud as isCloud,
        apoc.create.uuid() as uuid
    MATCH (u:User {email: email})

    CALL apoc.do.when(isCloud, 
      'MATCH (u)-[:MEMBER]->(s:SecurityOrganization)-[:LICENSED_FOR]->(l:SoftwareEdition)
      WHERE u.primaryOrganization = s.name
      WITH u, l,
        coalesce(split(u.email, "@")[1],"") as emailDomain, coalesce(s.enterpriseDomains,[]) as enterpriseDomains
      RETURN 
        CASE WHEN emailDomain IN enterpriseDomains
          THEN 999999999999
          ELSE l.maxNumberOfDatabases
        END as maxNumberOfDatabases',

      'RETURN coalesce(maxNumberOfDatabases,0) as maxNumberOfDatabases', 
      {u: u, maxNumberOfDatabases: maxNumberOfDatabases}
    ) YIELD value as licenseInfo
    WITH u, email, name, url, databaseName, encrypted, proxyThroughAppServer, 
      user, password, isPrivate, uuid,    
      licenseInfo.maxNumberOfDatabases as maxNumberOfDatabases

    OPTIONAL MATCH (u)<-[:CREATOR]-(existing:DBConnection)
    WHERE u.primaryOrganization IN labels(existing)
    WITH u, email, name, url, databaseName, encrypted, proxyThroughAppServer, 
      user, password, isPrivate, uuid,
      maxNumberOfDatabases, count(existing) as numExistingConnections
    CALL apoc.util.validate(NOT (u.primaryOrganization IS NOT NULL),"permission denied",[0])
    CALL apoc.util.validate(numExistingConnections >= maxNumberOfDatabases,"Max number of licensed database connections reached",[0])
    WITH *
    CREATE (db:DBConnection {id:uuid})
      WITH *
      CALL apoc.create.addLabels([db], [u.primaryOrganization]) YIELD node
    CREATE (u)<-[:CREATOR]-(db)
    CREATE (u)<-[:OWNER]-(db)
    SET db.createdAt = timestamp()
    SET db.name = name
    SET db.url = url
    SET db.databaseName = databaseName
    SET db.encrypted = encrypted
    SET db.proxyThroughAppServer = proxyThroughAppServer
    SET db.user = user
    SET db.password = password
    SET db.isPrivate= isPrivate
    RETURN apoc.map.merge(properties(db), { 
      databaseName: CASE WHEN db.databaseName IS NOT NULL THEN db.databaseName ELSE '' END
    }) as db
  `;
  var result = await runQuery(query, {
    name,
    url,
    databaseName,
    encrypted,
    proxyThroughAppServer,
    user: encrypt(user),
    password: encrypt(password),
    email: context.email,
    isPrivate,
    maxNumberOfDatabases,
    isCloud
  });
  result = processResult(result);
  var returnValue = getFirstRowValue(result, "db", "Error: Could not create db connection");
  //return returnValue.properties;
  return returnValue;
};

export const getSchema = async ({ url, databaseName, encrypted, 
    encryptedUser, encryptedUserPublicKey,
    encryptedPassword, encryptedPasswordPublicKey
 }, context) => {
    // open neo database connection cypher

    var driverConfig = {};
    if (!url.match(/bolt\+s/) && !url.match(/bolt\+ssc/)
      && !url.match(/neo4j\+s/) && !url.match(/neo4j\+ssc/)) {
         driverConfig.encrypted = encrypted;
    }
    
    var keysToFetch = [encryptedUserPublicKey, encryptedPasswordPublicKey];
    //console.log('keysToFetch: ', keysToFetch);
    const asymmetricDecryptionKeys = await getUserAsymmetricDecryptionKeys(keysToFetch, context.email);
    //console.log('asymmetricDecryptionKeys: ', asymmetricDecryptionKeys);
    
    const userKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[0] };
    //console.log('userKeys: ', userKeys);

    const passwordKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[1] };
    //console.log('passwordKeys: ', passwordKeys);
    var neoDriver = neo4j.driver(url, neo4j.auth.basic(decrypt(encryptedUser, userKeys), decrypt(encryptedPassword, passwordKeys)), driverConfig);
    try {
        var result = await runQueryWithDriverAndConfig(neoDriver, { databaseName: databaseName },
                                                        "CALL apoc.meta.schema()", {}, { timeout: 30000 });
        result = processResult(result);
        var returnValue = getFirstRowValue(result, "value");
        neoDriver.close();
        return {
            cypherFunction: 'apoc.meta.schema',
            jsonSchema: JSON.stringify(returnValue)
        }
    } catch (error) {
        return await handleApocSchemaError(neoDriver, databaseName, error);
    };
};

export const executeCypherQuery = async ({ dbConnection, cypherQuery, cypherParameters }, context) => {
  const { databaseName } = dbConnection;

  var keysToFetch = [dbConnection.encryptedUserPublicKey, dbConnection.encryptedPasswordPublicKey];
  const asymmetricDecryptionKeys = await getUserAsymmetricDecryptionKeys(keysToFetch, context.email);
  const userKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[0] };
  const passwordKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[1] };
  const driverObj = initializeDriver(dbConnection, userKeys, passwordKeys);
  var result = await runQueryExplicit(driverObj, cypherQuery, cypherParameters, databaseName, true);
  return result;
};

export const handleApocSchemaError = async (neoDriver, databaseName, error) => {
    try {
        var errorMessage = '' + error;
        if (errorMessage.match(/There is no procedure with the name `apoc.meta.schema` registered for this database instance/)
         || errorMessage.match(/apoc.meta.schema is unavailable/)
         || errorMessage.match(/The transaction has been terminated. Retry your operation in a new transaction/)
        ) {
            //console.log('calling CALL db.schema.visualization()');
            var result = await runQueryWithDriverAndConfig(neoDriver, { databaseName: databaseName },
                                                                    "CALL db.schema.visualization()", {})
            result = processResult(result);
            if (result && result.rows && result.rows.length > 0) {
                var firstRow = result.rows[0];
                var returnValue = JSON.stringify({ nodes: firstRow.nodes, relationships: firstRow.relationships});
                neoDriver.close();
                return {
                    cypherFunction: 'db.schema.visualization',
                    jsonSchema: returnValue
                }
            } else {
                neoDriver.close();
                return {
                    cypherFunction: 'db.schema.visualization',
                    jsonSchema: JSON.stringify({ nodes: [], relationships: []})
                }
            }
        } else {
            neoDriver.close();
            throw error;
        }
    } catch (error) {
        neoDriver.close();
        throw error;
    }
}

export const editDBConnection = async (id, properties, context) => {
  const isEditingCredentials =
    "user" in properties &&
    "password" in properties &&
    properties.user !== "" &&
    properties.password !== "";
  if (isEditingCredentials) {
    properties.user = encrypt(properties.user);
    properties.password = encrypt(properties.password);
  } else {
    delete properties.user;
    delete properties.password;
  }

  const query = `
      WITH $email as email, $id as id
      MATCH (u:User {email: email})
      MATCH (db:DBConnection {id: id})
      CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(db),"permission denied (wrong org)",[0])
      CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|:MEMBER]-(db)) OR u:Admin),"permission denied",[0])
      SET db += $properties
      RETURN apoc.map.merge(properties(db), { 
        databaseName: CASE WHEN db.databaseName IS NOT NULL THEN db.databaseName ELSE '' END
      }) as db
  `;
  const args = { id, properties, email: context.email };
  const result = await runQuery(query, args);
  //return result.records[0].get("db").properties;
  return result.records[0].get("db");
};

export const deleteDBConnection = async (id, context) => {
  const query = `
    WITH $email as email, $id as id
    MATCH (u:User {email: email})
    MATCH (db:DBConnection {id: id})
    CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(db),"permission denied (wrong org)",[0])
    CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER]-(db)) OR u:Admin),"permission denied",[0])
    DETACH DELETE db
  `;
  const result = await runQuery(query, { id, email: context.email });
  const wereNodesDeleted = result.summary.counters._stats.nodesDeleted > 0;
  if (wereNodesDeleted) {
    return { id };
  }
};

export const checkDBInfo = async (id, context) => {

    return {
      isConnected: false,
      license: "NA",
      versions: ["NA"],
      hasApoc: false
    };
};

export const getUsersForDB = async (id, context) => {
  const query = `
    WITH $email as email, $id as id
    MATCH (u:User {email: email})
    MATCH (db:DBConnection {id: id})
    CALL apoc.util.validate(NOT coalesce(u.primaryOrganization,'') IN labels(db),"permission denied (wrong org)",[0])
    MATCH (user:User)<-[rel:OWNER|MEMBER|VIEWER]-(db)
      WHERE u.primaryOrganization IN labels(user)
    RETURN {role: type(rel), email: user.email, picture: user.picture} AS user
  `;
  const result = await runQuery(query, { id, email: context.email });
  var resultSet = processResult(result);
  return resultSet.rows.map(row => row.user);
};

export const canCurrentUserEdit = async (id, context) => {
  const query = `
    WITH $email as email, $id as id
    MATCH (u:User {email: email})
    MATCH (db:DBConnection {id: id})
      WHERE u.primaryOrganization IN labels(db)
    RETURN (u:Admin OR EXISTS((db)-[:OWNER|MEMBER]->(u))) AS result
  `;
  const result = await runQuery(query, { id, email: context.email });
  var resultSet = processResult(result);
  var value = getFirstRowValue(resultSet, "result");
  return value ? value : false;
};

export const canCurrentUserDelete = async (id, context) => {
  const query = `
    WITH $email as email, $id as id
    MATCH (u:User {email: email})
    MATCH (db:DBConnection {id: id})
      WHERE u.primaryOrganization IN labels(db)
    RETURN (u:Admin OR EXISTS((db)-[:OWNER]->(u))) AS result
  `;
  const result = await runQuery(query, { id, email: context.email });
  var resultSet = processResult(result);
  var value = getFirstRowValue(resultSet, "result");
  return value ? value : false;
};
