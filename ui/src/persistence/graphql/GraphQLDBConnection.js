import { gql } from "@apollo/client";

import { ALL_DB_CONNECTIONS_FOR_USER } from './dbConnection';
import { getClient, handleError } from './GraphQLPersistence';

export function getAllDbConnectionsForUser (callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: ALL_DB_CONNECTIONS_FOR_USER,
        variables: { }
      })
      .then(result => {
          callback({ success: true, data: result.data.dbConnections });
      })
      .catch(error => {
        handleError(getAllDbConnectionsForUser, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

/*
export function executeCypherQueryAsPromise (driverId, dbConnection, cypherQuery, cypherParameters) {
    return new Promise((resolve, reject) => {
        executeCypherQuery(driverId, dbConnection, cypherQuery, cypherParameters, (result) => {
            resolve(result);
        }, false)        
    });
}*/

export async function executeCypherQuery (driverId, dbConnection, cypherQuery, cypherParameters, callback, doTokenExpiredErrorHandling = true) {
    if (!dbConnection || !dbConnection.url) {
        callback({ success: false, error: 'Not connected'});
        return;
    }
    getClient().query({
        query: gql`query ExecuteCypherQuery ($input: CypherQueryInput) {
                    executeCypherQuery(input: $input) {
                        error 
                        headers
                        numRows
                        rows
                    }
                }`,
        variables: {
            input: {
                dbConnection: {
                    id: driverId,
                    url: dbConnection.url,
                    databaseName: dbConnection.databaseName,
                    encrypted: dbConnection.encrypted,
                    encryptedUser: dbConnection.encryptedUsername,
                    encryptedUserPublicKey: dbConnection.encryptedUsernamePublicKey,
                    encryptedPassword: dbConnection.encryptedPassword,
                    encryptedPasswordPublicKey: dbConnection.encryptedPasswordPublicKey
                },
                cypherQuery: cypherQuery,
                cypherParameters: cypherParameters
            }
        }
      })
      .then(result => {
          var returnValue = result.data.executeCypherQuery;
          const { error, headers, numRows, rows } = returnValue;
          if (error) {
            callback({ success: false, error });    
          } else {
            callback({ success: true, headers, rows, numRows });
          }
      })
      .catch(error => {
        handleError(executeCypherQuery, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export async function getDbSchema (dbConnection, callback, doTokenExpiredErrorHandling = true) {
    if (!dbConnection || !dbConnection.url) {
        callback({ success: false, error: 'Not connected'});
        return;
    }
    getClient().query({
        query: gql`query GetSchema($input: GetSchemaInput) {
                  getSchema(input: $input) {
                    cypherFunction
                    jsonSchema
                  }
                }`,
        variables: {
            input: {
                url: dbConnection.url,
                databaseName: dbConnection.databaseName,
                encrypted: dbConnection.encrypted,
                encryptedUser: dbConnection.encryptedUsername,
                encryptedUserPublicKey: dbConnection.encryptedUsernamePublicKey,
                encryptedPassword: dbConnection.encryptedPassword,
                encryptedPasswordPublicKey: dbConnection.encryptedPasswordPublicKey
        }
        }
      })
      .then(result => {
          var returnValue = result.data.getSchema;
          returnValue = { cypherFunction: returnValue.cypherFunction, jsonSchema: JSON.parse(returnValue.jsonSchema) };
          callback({ success: true, data: returnValue });
      })
      .catch(error => {
        handleError(getDbSchema, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}
