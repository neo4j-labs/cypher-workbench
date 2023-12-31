
import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import http from 'http'
import fs from "fs";
import https from "https";
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';
import { Analytics } from '@segment/analytics-node'

//import { makeAugmentedSchema } from "neo4j-graphql-js";
import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";

import dotenv from "dotenv";
import path from "path";
//import { fileLoader, mergeTypes, mergeResolvers } from "merge-graphql-schemas";
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge'
import { loadFilesSync } from '@graphql-tools/load-files'

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { runQuery, setDriver } from './util/run';
import { processResult, getFirstRowValue } from './models/resultHelper';
import bodyParser from 'body-parser';
import { 
  setLicenseDirectory, 
  isLicenseValid, 
  getLicenseError,
  getLicenseInfo
} from './license/license';
import { verifyUserPassword } from './models/users';
import { validateTokenExistsAndIsNotExpired } from './security/localSessions';
import { VERSION } from './version';

// set environment variables from ../.env
dotenv.config();

var analytics = null;

if (process.env.SEGMENT_WRITE_KEY) {
  console.log("SEGMENT_WRITE_KEY is present, will record API analytics");
  analytics = new Analytics({ writeKey: process.env.SEGMENT_WRITE_KEY })
} else {
  console.log("SEGMENT_WRITE_KEY is not present, API analytics printed to console");
}

var trackedActions = {};
var reportTimer = null;
var lastReportTimeRequest = null;
const reportDelay = 5000;   // 5 seconds
const maxDelay = 60000;
//const maxDelay = 0;


const trackAction = (email, action) => {  
  if (lastReportTimeRequest === null) {
    lastReportTimeRequest = new Date().getTime();
  }
  var userActions = trackedActions[email];
  if (!userActions) {
    userActions = {};
    trackedActions[email] = userActions;
  }
  if (userActions[action] === undefined) {
    userActions[action] = {
      firstTimeReported: new Date().getTime(),
      actionCount: 1
    }
  } else {
    userActions[action].actionCount = userActions[action].actionCount + 1;
  }

  const now = new Date().getTime();
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
  }
  if ((now - lastReportTimeRequest) >= maxDelay) {
    writeTrackedActions();
  } else {
    reportTimer = setTimeout(writeTrackedActions, reportDelay);
  }
}

const writeTrackedActions = () => {
  const allActions = [];
  Object.keys(trackedActions).forEach(email => {
    const actions = trackedActions[email];
    Object.keys(actions).forEach(action => {
      allActions.push({
        email: email,
        action: action,
        ...actions[action]
      })
    })
  })
  allActions.sort((a,b) => {
    if (a.firstTimeReported === b.firstTimeReported) return 0;
    if (a.firstTimeReported < b.firstTimeReported) 
      return -1;
    else 
      return 1;
  })

  allActions.forEach(actionEntry => {
    const { email, action, actionCount } = actionEntry;
    reportTrackedAction(email, action, actionCount)
  })
  
  trackedActions = {};
  lastReportTimeRequest = null;
}

const reportTrackedAction = (email, action, actionCount) => {  
  //console.log(`tracking action ${action} for ${email}`)
  const analyticsPayload = {
    userId: email,
    event: "WORKBENCH_API_REQUEST",
    properties: {
      action: action,
      actionCount: actionCount
    }
  }
  if (analytics) {
    analytics.track(analyticsPayload);
  } else {
    console.log('analytics not initialized, logging to console: ', JSON.stringify(analyticsPayload));
  }
}

var driverConfig = {
  userAgent: `neo4j-cypher-workbench-api/v${VERSION}`
};

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const pass = process.env.NEO4J_PASSWORD || "password";

if (!process.env.NEO4J_URI.match(/bolt\+s/) && !process.env.NEO4J_URI.match(/neo4j\+s/)) {
  driverConfig.encrypted = (process.env.NEO4J_ENCRYPTED === "true") ? true : false;
}
//console.log(uri, user, pass, driverConfig);
const driver = neo4j.driver(
  uri,
  neo4j.auth.basic(user, pass),
  driverConfig
);
setDriver(driver);

const licenseDirectory = process.env.LICENSE_DIR || './';
setLicenseDirectory(licenseDirectory);
if (!isLicenseValid()) {
  console.log("Error validating license: ", getLicenseError());
  process.exit(1);
} else {
  var licenseObj = getLicenseInfo();
  const licenseText = `License Info: ${licenseObj.licensed_product} ${licenseObj.license_version} - ${licenseObj.license_type}`;
  console.log(licenseText);
}

/*
 * Create an executable GraphQL schema object from GraphQL type definitions
 * including autogenerated queries and mutations.
 * Optionally a config object can be included to specify which types to include
 * in generated queries and/or mutations. Read more in the docs:
 * https://grandstack.io/docs\neo4j-graphql-js-api.html#makeaugmentedschemaoptions-graphqlschema
 */
/*
const typeDefs = fs
  .readFileSync(
    //process.env.GRAPHQL_SCHEMA || path.join(__dirname, "schema.graphql")
    path.join(__dirname, "./types/datamodel.graphql")
  )
  .toString("utf-8");
*/

// from https://www.graphql-tools.com/docs/migration/migration-from-merge-graphql-schemas
// this is to convert old mergeTypes calls from merge-graphql-schemas to mergeTypeDefs
export const mergeTypes = (types, options) => {
  const schemaDefinition = options && typeof options.schemaDefinition === 'boolean' ? options.schemaDefinition : true

  return mergeTypeDefs(types, {
    useSchemaDefinition: schemaDefinition,
    forceSchemaDefinition: schemaDefinition,
    throwOnConflict: true,
    commentDescriptions: true,
    reverseDirectives: true,
    ...options
  })
}

const typeDefs = mergeTypes(
  loadFilesSync(path.join(__dirname, "./**/types/*.js"))
);

const resolvers = mergeResolvers(
  loadFilesSync(path.join(__dirname, "./resolvers/*.js"))
);

const neo4jGraphQL = new Neo4jGraphQL({ 
  typeDefs, 
  resolvers,
  driver 
});

/*
const schema = makeAugmentedSchema({
  typeDefs,
  resolvers,
  config: {
      query: false,
      mutation: false
  }
});
*/

/*
 * Create a Neo4j driver instance to connect to the database
 * using credentials specified as environment variables
 * with fallback to defaults
 */

/*
 * Create a new ApolloServer instance, serving the GraphQL schema
 * created using makeAugmentedSchema above and injecting the Neo4j driver
 * instance into the context object so it is available in the
 * generated resolvers to connect to the database.
 */
const client = jwksClient({
  jwksUri: process.env.JWKS_URI
});

const options = {
  audience: process.env.CLIENT_ID,
  issuer: process.env.ISSUER,
  algorithms: [process.env.ALGO]
};

function getKey(header, cb) {
  client.getSigningKey(header.kid, function(err, key) {
    if (key) {
      var signingKey = key.publicKey || key.rsaPublicKey;
      cb(null, signingKey);
    }
  });
}

const verifyLocalAuthInfo = async (localAuthInfo, query) => {
  return new Promise(async (resolve, reject) => {
    //console.log('localAuthInfo: ', localAuthInfo);
    if  (!localAuthInfo) {
      reject(new Error(`Bad authorization, No authorization header provided, expected JSON string with { type: 'Basic|SWToken', credentials: '...' }`))
    }
    query = (query || '').trim();
    var authInfo;
    try {
      authInfo = JSON.parse(localAuthInfo);
      if (!authInfo) {
        reject(new Error(`Bad authorization, expected JSON string with { type: 'Basic|SWToken', credentials: '...' }`))
        return;
      }
      //console.log('authInfo: ', authInfo);        
    } catch (e) {
      reject(new Error(`Bad authorization, expected JSON string with { type: 'Basic|SWToken', credentials: '...' }`))
      return;
    }
    //console.log(3);

    var verify = true;
    if (query.match(/mutation createUser/) 
      || query.match(/mutation LogInLocalUser/)
    ) {
      verify = false;
    }
    //console.log(4);

    let type = authInfo?.type;
    let credentials = authInfo?.credentials;

    if (!type || !credentials) {
      reject(getNewError('CREDENTIALS_ISSUE', 'Type or credentials not provided in authorization header'));
      return;
    }
    
    const decodedCredentials = Buffer.from(credentials, 'base64').toString();
    const tokens = decodedCredentials.split(':');
    const email = tokens[0];
    logAuth('credentials email: ', email);
    if (!email) {
      reject(getNewError('CREDENTIALS_ISSUE', 'Email must be provided in credentials'));
      return;
    }
    const passwordOrToken = tokens[1];
    //console.log('credentials passwordOrToken: ', passwordOrToken);

    logAuth("Verify: ", verify);       
    if (verify) {
      logAuth("Type: ", type);       
      if (type === 'Basic') {
        // credentials will be base-64 encoding of email:password
        //console.log(5);
        logAuth("Basic auth");
        const isPasswordValid = await verifyUserPassword(email, passwordOrToken);
        if (isPasswordValid) {
          logAuth("Basic auth verifyUserPassword succeeded, email: ", email);  
          resolve(email);
        } else {
          logAuth("Basic auth verifyUserPassword failed for email: ", email);  
          reject(getNewError('CREDENTIALS_ISSUE', 'Credentials are invalid'));
        }
        return;
      } else if (type === 'SWToken') {
        // credentials will be a token generated by localSessions.js
        //console.log(6);
        logAuth("SWToken auth, validating token");  
        const isOk = validateTokenExistsAndIsNotExpired(email, passwordOrToken);
        //console.log(7);
        if (isOk) {
          //console.log(9);
          logAuth("Token valid");  
          resolve(email);
        } else {
          //console.log(9.1);
          logAuth("Token invalid");  
          reject(getNewError('INVALID_TOKEN', 'User token is invalid or expired'));
        }
        return;
      } else {
        //console.log(9.2);
        logAuth("Bad auth type: ", type);          
        reject(getNewError('BAD_AUTH_TYPE', 'Authorization type must be Basic or SWToken'));
        return;
      }
    } else {
      //console.log(9.3);
      logAuth("Resolving email: ", email);          
      resolve(email);
    }
  });
}

const getNewError = (name, message) => {
  return new GraphQLError(message, { extensions: { code: name }});
  //return new Error(JSON.stringify({name: `${name}`, message: `${message}`}))
}

const validateApiKeyForOrgAndEmail = async (clientId, email) => {
  return new Promise(async (resolve, reject) => {
    const query = `
      MATCH (auth0:Auth0Api {clientId: $clientId})<-[:HAS_AUTH_API]-(org:SecurityOrganization)<-[:MEMBER]->(u:User {email: $email})
      WHERE org.name = u.primaryOrganization      
      RETURN org.name as orgName, u.email as email
    `;
    try {
        var result = await runQuery(query, {clientId: clientId, email: email});
        result = processResult(result);
        const orgName = getFirstRowValue(result, "name");
        const returnedEmail = getFirstRowValue(result, "email")
        if (returnedEmail === email) {
          resolve ({ orgName: orgName, email: email });
        } else {
          resolve({ error: getNewError("ACCESS_DENIED", `Email: ${email} cannot be accessed using clientId: ${clientId}`)});
        }
    } catch (error) {
      resolve ({ error: getNewError("CYPHER_ERROR", error)});
    }
  });
}

const verifyApiKeyToken = async (id_token, email) => {
  return new Promise((resolve, reject) => {
    var verifyStart = new Date().getTime();
    logAuth('checking api key');
    try {
      jwt.verify(id_token, getKey, {
        audience: process.env.AUTH0_API_KEY_AUDIENCE,
        issuer: process.env.ISSUER,
        algorithms: [process.env.ALGO]
      }, async (err, decoded) => {
        if (err) {
          logAuth('api key not valid, probably a user jwt token');
          resolve({jwtVerifyError: err})
        } else {
          var now = new Date().getTime();
          logAuth(`verify api key took ${(now - verifyStart)/1000} seconds`);

          // Using decoded.azp confirm user has API access by ensuring there 
          //   is a Auth0Api.clientId with same value as decoded.azp
          const { azp } = decoded;
          const scope = decoded.scope || '';
          const scopeArray = scope.split(' ').map(x => x.trim());
          const validScopes = new Set(scopeArray);
          const operationsArray = scopeArray.map(x => {
            const operation = x.split(':')[1];
            return (operation) ? operation.trim() : ''
          }).filter(x => x);
          const validOperations = new Set(operationsArray);

          const orgResponse = await validateApiKeyForOrgAndEmail(azp, email);
          resolve({
            ...orgResponse,
            scopesSet: validScopes,
            validOperationsSet: validOperations
          });
        }      
      });
    } catch (e) {
      reject(`Error calling jwt.verify: ${e}`);
    }
  });
}

//var hasBeenRejected = false;
const verifyToken = async id_token => {
  return new Promise((resolve, reject) => {
    var verifyStart = new Date().getTime();
    jwt.verify(id_token, getKey, options, (err, decoded) => {
        /* Uncomment this for testing token expired
        if (!hasBeenRejected) {
            console.log('rejecting once');
            reject(new Error(JSON.stringify({name: 'TokenExpiredError', message: 'jwt expired'})));
            hasBeenRejected = true;
        } else {
            console.log('not rejecting');
        }*/
      if (err) {
        console.log('verify error', err);
        reject(getNewError(err.name, err.message));
        //reject(JSON.stringify({name: 'TokenExpiredError', message: 'test token expired'}));
      }
      //reject(new Error({name: 'TokenExpiredError', message: 'test token expired'}));
      var now = new Date().getTime();
      logAuth(`verify took ${(now - verifyStart)/1000} seconds`);
      resolve(decoded);
    });
  });
};

const stripToken = token => {
  if (token) {
    const id_token = token.replace("Bearer ", "");
    return id_token;
  } else {
    throw new Error(JSON.stringify({name: 'NoAuthorizationToken', message:'No authorization HEADER provided'}));
  }
};

const getGraphQLOperation = (graphQLRequest) => {
  try {
    const parsedGraphQLRequest = gql(graphQLRequest);
    const def = parsedGraphQLRequest.definitions[0];
    if (def) {
      const selection = def.selectionSet.selections[0];
      if (selection) {
        return selection.name.value;
      } else {
        console.log("Can't process graphQL definitions.selections");
        return null;
      }
    } else {
      console.log("Can't process graphQL definitions");
      return null;
    }
  } catch (e) {
    console.log("Error parsing graphQLRequest, error: ", e);
  }
}

function logAuth () {
  if (process.env.LOG_AUTH) {
    console.log.apply(null, arguments);
  }
}

var app, apollo;

function startServer() {
  neo4jGraphQL.getSchema().then(async (schema) => {
    apollo = new ApolloServer({
      schema: schema,
      introspection: (process.env.APOLLO_SERVER_INTROSPECTION === 'true'),
      playground: (process.env.APOLLO_SERVER_PLAYGROUND === 'true'),
      cors: true,
      context: async ({ req }) => {
        /*
        Object.keys(req)
          .filter(key => !key.match(/_/) && key !== 'res' & key !== 'socket' && key !== 'client')
          .map(key => console.log(`${key}: `, req[key]));
        */
        //console.log('-- *** ---');
        const graphQLOperation = getGraphQLOperation(req.body.query);
        
        //console.log(req.body);
        //console.log(req.body.variables);
        //console.log(req.body.operationName);
        const token = req.headers.authorization;
        const baseContext = {
          driver,
          driverConfig: { database: process.env.NEO4J_DATABASE || 'neo4j' }
        };        
          if (process.env.AUTH_METHOD=="auth0") {
            const id_token = stripToken(token);
            if (process.env.AUTH0_API_KEY_AUDIENCE) {
                const solutionsWorkbenchEmail = req.headers['solutions-workbench-email'] || req.headers['cypher-workbench-email'];
                logAuth('solutionsWorkbenchEmail: ', solutionsWorkbenchEmail);
                const response = await verifyApiKeyToken(id_token, solutionsWorkbenchEmail);
                // responses with jwtVerifyError should be fine, they are just regular users coming through
                if (!response.jwtVerifyError) {
                  if (response.error) {
                    throw response.error;
                  } else {
                    if (response.validOperationsSet.has(graphQLOperation)) {
                      trackAction(response.email, graphQLOperation);
                      return { ...baseContext, email: response.email, picture: '', name: '' };      
                    } else {
                      throw getNewError("ACCESS_DENIED", `The operation '${graphQLOperation}' you requested is not authorized`);
                    }
                  }
                }
              }

              // default logic of handling user tokens
              const profile = await verifyToken(id_token);
              var { email,picture,name } = profile;
              return { ...baseContext, email ,picture, name};

          } else if (process.env.AUTH_METHOD == "local") {
              const localAuthInfo = stripToken(token);
              //console.log(1);
              var email = await verifyLocalAuthInfo(localAuthInfo, req.body.query);
              //console.log(2);
              logAuth('verifyLocalAuthInfo email: ', email);
              return { ...baseContext, email };
          } else {
              return {};
          }
      }
    });

    /* start Apollo  server*/
    await apollo.start();

    app = express();
    //app.use(bodyParser.json({limit: '1mb'}));
    app.use(bodyParser.json({limit: '10mb', extended: true}))
    app.use(bodyParser.urlencoded({limit: '10mb', extended: true}))
  
    apollo.applyMiddleware({ app });

    var server = http.createServer(app);

    var protocolOk = true;
    if (process.env.HOST_PROTOCOL === "http") {
      server = http.createServer(app);
    } else if (process.env.HOST_PROTOCOL === "https") {
      const credentials = {
        key: fs.readFileSync(
          `${process.env.CERTIFICATE_DIR}/${process.env.CERTIFICATE_KEY}`
        ),
        cert: fs.readFileSync(
          `${process.env.CERTIFICATE_DIR}/${process.env.CERTIFICATE_CRT}`
        ),
      };
      server = https.createServer(credentials, app);
    } else {
      console.log(`unknown HOST_PROTOCOL ${process.env.HOST_PROTOCOL}`);
      var protocolOk = false;
    }
  
    if (protocolOk) {
      const port = (process.env.GRAPHQL_LISTEN_PORT) ? process.env.GRAPHQL_LISTEN_PORT : 4000;
      server.listen({ port: port }, () =>
        console.log(
          '🚀 Server ready at',
          `${process.env.HOST_PROTOCOL}://${process.env.HOST_NAME}:${port}${apollo.graphqlPath}`
        )
      );
    }
  });  
}

startServer();

const testDbConnection = async function () {
    var query = "MATCH (n) RETURN count(n) as numNodes"
    try {
        var result = await runQuery(query, {});
        result = processResult(result);
        var numNodes = getFirstRowValue(result, "numNodes");
        console.log("testDbConnection num nodes: " + numNodes);
    } catch (error) {
        console.log("testDbConnection error connecting to database");
        console.log(error);
    }
}

//testDbConnection();
