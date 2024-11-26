import { ApolloClient } from "@apollo/client/core";
import { InMemoryCache } from '@apollo/client/cache';
import { HttpLink } from '@apollo/client';
import { gql } from "@apollo/client";

import { getAuth, getAuthMethod } from "../../auth/authUtil";
import { doRedirect } from "../../auth/history";
import { 
    GET_CURRENT_USER, 
    DECRYPT_ASYMMETRIC_ENCRYPTED_ITEMS,
    ACKNOWLEDGE_MESSAGES,
    GET_SYSTEM_MESSAGES
 } from './user';
import { getDynamicConfigValue } from '../../dynamicConfig';

const cache = new InMemoryCache({
    resultCaching: false
});

var link;

export const NETWORK_STATUS = {
    OFFLINE: "Offline",
    ONLINE: "Online",
    TRYING_TO_CONNECT: "TryingToConnect",
    NETWORK_RETRY: "NetworkRetry",
    UNSAVED: "Unsaved",
    SAVING: "Saving",
    SAVED: "Saved"
}

// see example: https://www.apollographql.com/docs/react/networking/authentication/
function getLink () {
    if (!link) {
        link = new HttpLink({
            uri: getDynamicConfigValue("REACT_APP_GRAPHQL_URI"),
            /* for testing purposes */
            /*
            headers: {
                authorization: auth.getIdToken() ? `Bearer bad token` : ""
            } */
            headers: {
                authorization: getAuth().getIdToken() ? `Bearer ${getAuth().getIdToken()}` : ""
            }
       });
    }
   return link;
}

function getTempLocalLicenseLink () {
    return new HttpLink({
        uri: getDynamicConfigValue("REACT_APP_GRAPHQL_URI"),
        /* for testing purposes */
        /*
        headers: {
            authorization: auth.getIdToken() ? `Bearer bad token` : ""
        } */
        headers: {
            authorization: `Bearer ${getAuth().getBearerJson('getLicenseInfo@workbench.local')}`
        }
   });
}

/* disable the cache because Apollo doesn't understand the updates I am performing */
const defaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all'
  },  
}

var client;

export function getClient (properties) {
    const { caller } = properties || {};
    const token = getAuth().getIdToken();
    //console.log('token: ' + token);
    if (token) {
        if (!client) {
            client = new ApolloClient({
              cache: cache,
              link: getLink(),
              defaultOptions: { ...defaultOptions }
            });
        }
        return client;
    } else {
        if (caller === 'getLicenseInfo') {
            // get temporary ApolloClient
            const tempClient = new ApolloClient({
                cache: cache,
                link: getTempLocalLicenseLink(),
                defaultOptions: { ...defaultOptions }
            });
            return tempClient;
        } else {
            if (getAuthMethod() === 'local') {
                doRedirect('/login', "GraphQLPersistence authMethod local");
            } else {
                throw new Error('Auth token not set');
            }
        }
    }
}

export async function handleTokenExpired (error) {
    console.log("handleTokenExpired");
    if (error && error.networkError && error.networkError.result) {
        if (error.networkError.result.errors.length > 0) {
            var message = error.networkError.result.errors[0].message;
            if (message && message.replace) {
                // "Context creation failed: {"name":"TokenExpiredError","message":"jwt expired"}"
                message = message.replace(/Context creation failed: /, '');
                try {
                    message = JSON.parse(message);
                    if (message.name === 'TokenExpiredError') {
                        // get new token or re-trigger login
                        console.log("getNewTokenOrLogin");
                        await getAuth().getNewTokenOrLogin();
                        return true;
                    }
                } catch (err) {
                    /*
                    var displayMessage = 'error message payload is not a JSON string, cannot parse message: ' + message;
                    console.log(displayMessage);
                    alert(displayMessage);
                    */
                   console.log(message);
                   alert(message);
                }
            }
        }
    }
    return false;
}

export const handleError = function (functionToReExecute, functionArguments, callback, error, doTokenExpiredErrorHandling) {

    // this function assumes that it is being called from a function that has
        // callback as its next to last argument and
        // doTokenExpiredErrorHandling as its last argument
        // the function declared in functionToReExecute will be called with a callback
        // the function declared in functionToReExecute may or may not have been called with doTokenExpiredErrorHandling

    //console.log('handleError called');
    if (doTokenExpiredErrorHandling && callback) {
        //console.log('doing handleTokenExpired');
        var result = handleTokenExpired(error);
        if (result) {
            // make new argument set by replacing the last argument
            //   in arguments (which is doTokenExpiredErrorHandling) with false instead of true
            var lastArgument = functionArguments[functionArguments.length-1];
            var numArgumentsToCopy = (typeof(lastArgument) === 'function') ? functionArguments.length : functionArguments.length - 1;
            var newArguments = [];
            for (var i = 0; i < numArgumentsToCopy; i++) {
                newArguments.push(functionArguments[i]);
            }
            newArguments.push(false);  // new value of doTokenExpiredErrorHandling
            functionToReExecute.apply(this, newArguments);
            //console.log('handleError return');
            return;
        }
    }
    //console.log('handleError callback');
    callback({ success: false, error: error });
}

export function grabModelLock (dataModelKey, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
          mutation GrabModelLock($dataModelKey:String) {
          	grabModelLock (dataModelKey:$dataModelKey)
          }
      `,
      variables: {
          dataModelKey: dataModelKey
      }
    })
    .then((result) => {
        var { data } = result;
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "GrabModelLock did not return true" });
        }
    })
    .catch((error) => {
        handleError(grabModelLock, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function deleteRemoteDataModel (dataModelKey, callback, doTokenExpiredErrorHandling = true) {
    //console.log("deleteRemoteDataModel");
    //console.log("key: " + dataModelKey);
    getClient().mutate({
      mutation: gql`
          mutation RemoveDataModel($dataModelKey:String) {
          	removeDataModel (dataModelKey:$dataModelKey)
          }
      `,
      variables: {
          dataModelKey: dataModelKey
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("deleteRemoteDataModel response");
        //console.log(data);
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "RemoveDataModel did not return true" });
        }
    })
    .catch((error) => {
        handleError(deleteRemoteDataModel, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function searchForTags (searchText, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`query FindTags ($searchText:String) { findTags(searchText: $searchText) { key tag } }`,
        variables: { searchText: searchText }
      })
      .then(result => {
          //var tags = result.data.findTags.map(x => x.tag);
          var tags = result.data.findTags;
          callback({ success: true, data: tags });
      })
      .catch(error => {
          handleError(searchForTags, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function searchForAuthors (searchText, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`query FindAuthors ($searchText:String) { findAuthors(searchText: $searchText) { key name } }`,
        variables: { searchText: searchText }
      })
      .then(result => {
          var authors = result.data.findAuthors;
          callback({ success: true, data: authors });
      })
      .catch(error => {
          handleError(searchForAuthors, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function searchForUsers (searchText, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`query FindUsers ($searchText:String) { findUsers(searchText: $searchText) { email } }`,
        variables: { searchText: searchText }
      })
      .then(result => {
          var users = result.data.findUsers;
          callback({ success: true, data: users });
      })
      .catch(error => {
          handleError(searchForUsers, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function searchForCustomers (searchText, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`query findCustomers ($searchText:String) { findCustomers(searchText: $searchText) { key name } }`,
        variables: { searchText: searchText }
      })
      .then(result => {
          var customers = result.data.findCustomers;
          callback({ success: true, data: customers });
      })
      .catch(error => {
          handleError(searchForCustomers, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

/* deprecated */
export function loadRemoteDataModelMetadata (callback, doTokenExpiredErrorHandling = true) {
  var client = getClient();
  if (client) {
      client.query({
          query: gql`
            {
                DataModel {
                  key
                  metadata {
                    key
                    cypherWorkbenchVersion
                    title
                    dateCreated
                    dateUpdated
                    description
                    tags {
                      key
                      tag
                    }
                    customers {
                      key
                      name
                    }
                    authors {
                      key
                      name
                    }
                  }
                }
            }
          `
        })
        .then(result => {
            callback({ success: true, data: result.data });
        })
        .catch((error) => {
            handleError(loadRemoteDataModelMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
        });
  } else {
      callback({ success: false, error: "Can't get GraphQL client" });
  }
}

export function updateUserRoles (dataModelKey, isPublic, userRoles, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
        mutation UpdateUserRoles($dataModelKey:String,$isPublic:Boolean,$userRoles:[UserRoleInput]) {
            updateUserRoles(dataModelKey:$dataModelKey, isPublic:$isPublic, userRoles:$userRoles)
        }
      `,
      variables: {
          dataModelKey: dataModelKey,
          isPublic: isPublic,
          userRoles: userRoles
      }
    })
    .then((result) => {
        var { data } = result;
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "Update user roles not successful" });
        }
    })
    .catch((error) => {
        handleError(updateUserRoles, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function updateUserRolesGraphDoc (key, isPublic, userRoles, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
        mutation UpdateUserRolesGraphDoc($key:String,$isPublic:Boolean,$userRoles:[UserRoleInput]) {
            updateUserRolesGraphDoc(key:$key, isPublic:$isPublic, userRoles:$userRoles)
        }
      `,
      variables: {
          key: key,
          isPublic: isPublic,
          userRoles: userRoles
      }
    })
    .then((result) => {
        var { data } = result;
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "Update user roles not successful" });
        }
    })
    .catch((error) => {
        handleError(updateUserRolesGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function updateDatabaseUserRoles (databaseId, userRoles, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
        mutation UpdateDatabaseUserRoles($databaseId:String,$userRoles:[UserRoleInput]) {
            updateDatabaseUserRoles(databaseId:$databaseId, userRoles:$userRoles)
        }
      `,
      variables: {
          databaseId: databaseId,
          userRoles: userRoles
      }
    })
    .then((result) => {
        var { data } = result;
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "Update user roles not successful" });
        }
    })
    .catch((error) => {
        handleError(updateDatabaseUserRoles, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function getUserRolesForDataModel (dataModelKey, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
          query GetUserRolesForDataModel($dataModelKey:String) {
              getUserRolesForDataModel(dataModelKey:$dataModelKey) {
                  email
                  role
                  isCreator
              }
          }
        `,
        variables: {
            dataModelKey: dataModelKey
        }
    })
    .then(result => {
        callback({ success: true, data: result.data.getUserRolesForDataModel });
    })
    .catch((error) => {
        handleError(getUserRolesForDataModel, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function getUserRolesForGraphDoc (key, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query GetUserRolesForGraphDoc($key:String) {
                getUserRolesForGraphDoc(key:$key) {
                    email
                    role
                    isCreator
                }
            }
          `,
          variables: {
              key: key
          }
      })
      .then(result => {
          callback({ success: true, data: result.data.getUserRolesForGraphDoc });
      })
      .catch((error) => {
          handleError(getUserRolesForGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
      });
  }

const listModelResult = `
    key
    metadata {
      key
      cypherWorkbenchVersion
      title
      dateCreated
      dateUpdated
      description
      notes
      isPublic
      isInstanceModel
      userRole
      userIsCreator
      tags {
        key
        tag
      }
      customers {
        key
        name
      }
      owners {
        email
      }
    }
`

export function listRemoteDataModelMetadata (includePublic, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
        query ListDataModel ($includePublic: Boolean, $myOrderBy: String, $orderDirection: String) {
      	  listDataModelsX(includePublic: $includePublic, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
              ${listModelResult}
      	  }
        }
        `,
        variables: {
            includePublic: includePublic,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection
        }
    })
    .then(result => {
        callback({ success: true, data: result.data });
    })
    .catch((error) => {
        //console.log("listRemoteDataModelMetadata error", error);
        handleError(listRemoteDataModelMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function listRemoteDataModelMetadataAndAddExplicitMatches (explicitKeysToSearchFor, includePublic, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
          query ListDataModel ($explicitKeysToSearchFor: [String], $includePublic: Boolean, $myOrderBy: String, $orderDirection: String) {
              listDataModelsAndAddExplicitMatches(explicitKeysToSearchFor: $explicitKeysToSearchFor, includePublic: $includePublic, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
                ${listModelResult}
              }
          }
          `,
          variables: {
              explicitKeysToSearchFor: explicitKeysToSearchFor,
              includePublic: includePublic,
              myOrderBy: myOrderBy,
              orderDirection: orderDirection
          }
      })
      .then(result => {
          callback({ success: true, data: result.data });
      })
      .catch((error) => {
          //console.log("listRemoteDataModelMetadata error", error);
          handleError(listRemoteDataModelMetadataAndAddExplicitMatches, arguments, callback, error, doTokenExpiredErrorHandling);
      });
  }

export function searchRemoteDataModelMetadata (searchText, includePublic, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
          query SearchDataModel ($searchText: String, $includePublic: Boolean, $myOrderBy: String, $orderDirection: String) {
          	searchDataModelsX(searchText: $searchText, includePublic: $includePublic, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
                ${listModelResult}
          	}
          }
        `,
        variables: {
            searchText: searchText,
            includePublic: includePublic,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection
        }
    })
    .then(result => {
        callback({ success: true, data: result.data });
    })
    .catch((error) => {
        handleError(searchRemoteDataModelMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

const dataModelResult = `
    key
    excludeValidationSections
    metadata {
        key
        title
        isPublic
        userRole
        viewSettings
    }
    nodeLabels {
      key
      label
      referenceData
      indexes
      description
      display
      properties {
        key
        name
        datatype
        referenceData
        description
        isPartOfKey
        isArray
        isIndexed
        hasUniqueConstraint
        mustExist
      }
    }
    relationshipTypes {
      key
      type
      startNodeLabel {
        key
      }
      endNodeLabel {
        key
      }
      referenceData
      description
      outMinCardinality
      outMaxCardinality
      inMinCardinality
      inMaxCardinality
      display
      properties {
        key
        name
        datatype
        referenceData
        description
        isArray
        mustExist
      }
    }
`;

function processLoadDataModelResult (dataModelResponse, callback, doTokenExpiredErrorHandling = true) {
    //console.log(dataModelResponse);
    if (dataModelResponse.metadata && dataModelResponse.metadata.viewSettings && typeof(dataModelResponse.metadata.viewSettings) === 'string') {
        dataModelResponse.metadata.viewSettings = JSON.parse(dataModelResponse.metadata.viewSettings);
    }
    dataModelResponse.nodeLabels.forEach(nodeLabel => {
        if (nodeLabel.referenceData) {
            nodeLabel.referenceData = (typeof(nodeLabel.referenceData) === 'string') ? JSON.parse(nodeLabel.referenceData) : nodeLabel.referenceData;
        }
        if (nodeLabel.referenceData) {
            nodeLabel.indexes = (typeof(nodeLabel.indexes) === 'string') ? JSON.parse(nodeLabel.indexes) : nodeLabel.indexes;
        }
        if (nodeLabel.display) {
            nodeLabel.display = (typeof(nodeLabel.display) === 'string') ? JSON.parse(nodeLabel.display) : nodeLabel.display;
        }
    });
    dataModelResponse.relationshipTypes.forEach(relationshipType => {
        if (relationshipType.referenceData) {
            relationshipType.referenceData = (typeof(relationshipType.referenceData) === 'string') ? JSON.parse(relationshipType.referenceData) : relationshipType.referenceData;
        }
        if (relationshipType.display) {
            relationshipType.display = (typeof(relationshipType.display) === 'string') ? JSON.parse(relationshipType.display) : relationshipType.display;
        }
        relationshipType.startNodeLabelKey = relationshipType.startNodeLabel.key;
        relationshipType.endNodeLabelKey = relationshipType.endNodeLabel.key;
    });
    callback(dataModelResponse);
}

export function loadRemoteDataModel (dataModelKey, updateLastOpenedModel, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query loadDataModel ($dataModelKey: String, $updateLastOpenedModel: Boolean) {
              loadDataModel(dataModelKey: $dataModelKey, updateLastOpenedModel: $updateLastOpenedModel) {
                ${dataModelResult}
              }
            }
            `,
        variables: {
            dataModelKey: dataModelKey,
            updateLastOpenedModel: updateLastOpenedModel
        }
      })
      .then(result => {
          processLoadDataModelResult(result.data.loadDataModel, callback);
      })
      .catch((error) => {
          handleError(loadRemoteDataModel, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function loadLastOpenedModel (callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query {
              loadLastOpenedModel {
                ${dataModelResult}
              }
            }
            `,
        variables: {}
      })
      .then(result => {
          processLoadDataModelResult(result.data.loadLastOpenedModel, callback);
      })
      .catch((error) => {
          handleError(loadLastOpenedModel, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

function hasBeenRemotelySaved (dataModelSaveObject) {
    return dataModelSaveObject.isRemotelyPersisted;
    /*
    return (Object.values(dataModelSaveObject.nodeLabels).some(nodeLabel => nodeLabel.key.match(ID_JOINER)) ||
        Object.values(dataModelSaveObject.relationshipTypes).some(relationshipType => relationshipType.key.match(ID_JOINER)))
    */
}

function getDataModelChangeObject (modelInfo, dataModelSaveObject, dataModel) {
    var changedItems = dataModel.getChangedItems();
    var deletedItems = dataModel.getDeletedItems();
    //console.log("changedItems");
    //console.log(changedItems);
    //console.log("deletedItems");
    //console.log(deletedItems);

    var model = {
        key: modelInfo.key,
        isInstanceModel: dataModel.isInstanceModel(),
        excludeValidationSections: dataModel.getExcludeValidationSections(),
        //relationshipIdCounter: dataModelSaveObject.relationshipIdCounter,
        upsertNodeLabels: getUpsertNodeLabels(modelInfo.key, changedItems.changedNodeLabels, dataModel, true),
        upsertRelationshipTypes: getUpsertRelationshipTypes(modelInfo.key, changedItems.changedRelationshipTypes, dataModel, true),
        removeNodeLabels: deletedItems.deletedNodeLabelKeys.map(key => {
            return { key: getRemoteKey(modelInfo.key, key, dataModel) }
        }),
    	removeRelationshipTypes: deletedItems.deletedRelationshipTypeKeys.map(key => {
            return { key: getRemoteKey(modelInfo.key, key, dataModel) }
        })
    }
    return model;
}

function getFullModelObject (modelInfo, dataModelSaveObject, dataModel) {
    return {
        key: modelInfo.key,
        isInstanceModel: dataModel.isInstanceModel(),
        excludeValidationSections: dataModel.excludeValidationSections,
        //relationshipIdCounter: dataModelSaveObject.relationshipIdCounter,
        upsertNodeLabels: getUpsertNodeLabels(modelInfo.key, Object.values(dataModelSaveObject.nodeLabels), dataModel),
        upsertRelationshipTypes: getUpsertRelationshipTypes(modelInfo.key, Object.values(dataModelSaveObject.relationshipTypes), dataModel)
    }
}

function getMetadata (dataModelMetadata, previousState) {
    var { key, cypherWorkbenchVersion, title, description, notes, dateCreated, dateUpdated, viewSettings, isPublic } = dataModelMetadata;

    var metadata = {
        key: key,
        cypherWorkbenchVersion: (cypherWorkbenchVersion) ? cypherWorkbenchVersion : "",
        title: title,
        description: description,
        notes: notes,
        dateCreated: (typeof(dateCreated) === 'string') ? dateCreated : (new Date(dateCreated)).getTime().toString(),
        dateUpdated: (typeof(dateUpdated) === 'string') ? dateUpdated : (new Date(dateUpdated)).getTime().toString(),
        viewSettings: JSON.stringify(viewSettings),
        isPublic: isPublic
    }

    if (previousState) {
        // use previous state to setup upsertTags / removeTags, etc
        computeUpsertRemove(metadata, dataModelMetadata, previousState, { arrayTagName: 'tags', arrayEntryPropName: 'key'});
        computeUpsertRemove(metadata, dataModelMetadata, previousState, { arrayTagName: 'authors', arrayEntryPropName: 'key'});
        computeUpsertRemove(metadata, dataModelMetadata, previousState, { arrayTagName: 'customers', arrayEntryPropName: 'key'});
    }

    return metadata;

}

function getRemoteKey (modelKey, objectKey, dataModel) {
    //console.log("getRemoteKey");
    //console.log(modelKey);
    //console.log(objectKey);
    //console.log(dataModel.ID_JOINER);
    return (objectKey.match(dataModel.ID_JOINER)) ? objectKey : modelKey + dataModel.ID_JOINER + objectKey;
}

function getUpsertNodeLabels (modelKey, nodeLabels, dataModel, justChangedProperties) {
    return nodeLabels.map(nodeLabel => {
        var properties = (justChangedProperties) ? nodeLabel.getChangedProperties() :
                    (nodeLabel.properties) ? Object.values(nodeLabel.properties) : [];
        return {
            key: getRemoteKey(modelKey, nodeLabel.key, dataModel),
            label: nodeLabel.label,
            display: JSON.stringify(nodeLabel.display),
            referenceData: JSON.stringify(nodeLabel.getReferenceData()),
            indexes: JSON.stringify(nodeLabel.indexes),
            description: nodeLabel.description,
            upsertPropertyDefinitions: properties.map(property => {
                return {
                    key: getRemoteKey(modelKey, property.key, dataModel),
                    name: property.name,
                    datatype: property.datatype,
                    referenceData: property.referenceData,
                    description: property.description,
                    isPartOfKey: property.isPartOfKey,
                    isArray: property.isArray,
                    isIndexed: property.isIndexed,
                    hasUniqueConstraint: property.hasUniqueConstraint,
                    mustExist: property.mustExist
                }
            }),
            removePropertyDefinitions: nodeLabel.getRemovedPropertyKeysSinceLastSave().map(key => {
                return {
                    key: getRemoteKey(modelKey, key, dataModel)
                }
            })
        }
    });
}

function getUpsertRelationshipTypes (modelKey, relationshipTypes, dataModel, justChangedProperties) {
    return relationshipTypes.map(relationshipType => {
        var properties = (justChangedProperties) ? relationshipType.getChangedProperties() :
                (relationshipType.properties) ? Object.values(relationshipType.properties) : [];

        var startNodeLabelKey = (relationshipType.startNodeLabelKey) ? relationshipType.startNodeLabelKey : relationshipType.startNodeLabel.key;
        var endNodeLabelKey = (relationshipType.endNodeLabelKey) ? relationshipType.endNodeLabelKey : relationshipType.endNodeLabel.key;

        return {
            key: getRemoteKey(modelKey, relationshipType.key, dataModel),
            type: relationshipType.type,
            display: JSON.stringify(relationshipType.display),
            referenceData: JSON.stringify(relationshipType.referenceData),
            description: relationshipType.description,
            outMinCardinality: relationshipType.outMinCardinality,
            outMaxCardinality: relationshipType.outMaxCardinality,
            inMinCardinality: relationshipType.inMinCardinality,
            inMaxCardinality: relationshipType.inMaxCardinality,
            startNodeLabelKey: getRemoteKey(modelKey, startNodeLabelKey, dataModel),
            endNodeLabelKey: getRemoteKey(modelKey, endNodeLabelKey, dataModel),
            upsertPropertyDefinitions: properties.map(property => {
                return {
                    key: getRemoteKey(modelKey, property.key, dataModel),
                    name: property.name,
                    datatype: property.datatype,
                    referenceData: property.referenceData,
                    description: property.description,
                    isArray: property.isArray,
                    mustExist: property.mustExist
                }
            }),
            removePropertyDefinitions: relationshipType.getRemovedPropertyKeysSinceLastSave().map(key => {
                return {
                    key: getRemoteKey(modelKey, key, dataModel)
                }
            })
        }
    })
}

export function updateNodePosition (modelInfo, dataModel, callback, doTokenExpiredErrorHandling = true) {
    //console.log("calling updateNodePosition with arguments.length of = " + arguments.length);
    //console.log("calling updateNodePosition with doTokenExpiredErrorHandling = " + doTokenExpiredErrorHandling);
    var nodeLabels = dataModel.getNodeLabelArray()
        .filter(nodeLabel => nodeLabel.displayChangedSinceLastSave)
        .map(nodeLabel => {
            return {
                key: getRemoteKey(modelInfo.key, nodeLabel.key, dataModel),
                display: JSON.stringify(nodeLabel.display)
            }
        });
    var saveTimestamp = new Date().getTime();

    //console.log("updateNodePosition: nodeLabels");
    //console.log(nodeLabels);

    // IMPORTANT: must reset here after creating the payload, but before the call
    //   otherwise stuff that gets changed during the call will be lost
    //dataModel.resetPositionUpdateFlags();
    getClient().mutate({
      mutation: gql`
          mutation SaveNodeLabelDisplay ($nodeLabels: [NodeLabelDisplayInput]) {
            saveNodeLabelDisplay(nodeLabels: $nodeLabels)
          }
      `,
      variables: {
          nodeLabels: nodeLabels
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("updateNodePosition response");
        //console.log(data);

        if (data) {
            // UPDATE 2/7/2020: reset here.  using a timestamp to reset saved changes without
                // getting rid of changes during network call
            dataModel.resetDataChangeFlags(saveTimestamp);
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveNodeLabelDisplay did not return true" });
        }
    })
    .catch((error) => {
        //console.log("updateNodePosition handling error", error);
        handleError(updateNodePosition, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

function computeUpsertRemove (persistMetadataObj, newMetadataObj, previousMetadataObj, tagNames) {

    var newValues = newMetadataObj[tagNames.arrayTagName];
    var previousValues = previousMetadataObj[tagNames.arrayTagName];
    newValues = (newValues) ? newValues : [];
    previousValues = (previousValues) ? previousValues : [];

    var upsertItems = newValues.filter(newValue => {
        var matches = previousValues.filter(previousValue => previousValue[tagNames.arrayEntryPropName] === newValue[tagNames.arrayEntryPropName]);
        if (matches && matches.length > 0) {
            // already exists - therefore we don't want to upsert it
            return false;
        } else {
            // does not exist - we need to add it
            return true;
        }
    })
    .map(x => {
        delete x.__typename;
        return x;
    }); // this gets added by Apollo but needs to be deleted before saving;

    var removeItems = previousValues.filter(previousValue => {
        var matches = newValues.filter(newValue => previousValue[tagNames.arrayEntryPropName] === newValue[tagNames.arrayEntryPropName]);
        if (matches && matches.length > 0) {
            // already exists - therefore we don't want to remove it
            return false;
        } else {
            // does not exist - we need to remove it
            return true;
        }
    })
    .map(x => {
        delete x.__typename;
        return x;
    }); // this gets added by Apollo but needs to be deleted before saving;

    var suffix = tagNames.arrayTagName[0].toUpperCase() + tagNames.arrayTagName.substr(1);
    var upsertPropName = 'upsert' + suffix;
    var removePropName = 'remove' + suffix;

    persistMetadataObj[upsertPropName] = upsertItems;
    persistMetadataObj[removePropName] = removeItems;
}

export function saveRemoteDataModelMetadata (dataModelMetadata, previousState, callback, doTokenExpiredErrorHandling = true) {

    //console.log("saveRemoteDataModelMetadata dataModelMetadata");
    //console.log(dataModelMetadata);

    var modelToSave;
    var metadata = getMetadata(dataModelMetadata, previousState);

    //console.log(metadata);

    getClient().mutate({
      mutation: gql`
          mutation SaveDataModelMetadata ($dataModelMetadata: DataModelMetadataInput) {
            saveDataModelMetadata(dataModelMetadata: $dataModelMetadata)
          }
      `,
      variables: {
          dataModelMetadata: metadata
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteDataModelMetadata response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveRemoteDataModelMetadata did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteDataModelMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function saveRemoteDataModelWithFullMetadata (modelInfo, dataModel, previousState, callback, doTokenExpiredErrorHandling = true) {
    //console.log("saveRemoteDataModelWithFullMetadata modelInfo");
    //console.log(modelInfo);
    //console.log("saveRemoteDataModelWithFullMetadata dataModel");
    var dataModelSaveObject = dataModel.toSaveObject();
    //console.log(dataModelSaveObject);

    var modelToSave;
    if (hasBeenRemotelySaved(dataModelSaveObject)) {
        modelToSave = getDataModelChangeObject(modelInfo, dataModelSaveObject, dataModel);
    } else {
        modelToSave = getFullModelObject(modelInfo, dataModelSaveObject, dataModel);
    }
    modelToSave.metadata = getMetadata(modelInfo, previousState);

    //console.log(modelToSave);

    getClient().mutate({
      mutation: gql`
          mutation SaveDataModelWithFullMetadata ($dataModel: DataModelInput) {
            saveDataModelWithFullMetadata (dataModel: $dataModel)
          }
      `,
      variables: {
          dataModel: modelToSave
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveDataModelWithFullMetadata response");
        //console.log(data);

        if (data) {
            // UPDATE 2/7/2020: reset here.  dataModelSaveObject has a timestamp to reset saved changes without
                // getting rid of changes during network call
            dataModel.resetDataChangeFlags(dataModelSaveObject);
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveDataModelWithFullMetadata did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteDataModelWithFullMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function saveRemoteDataModel (modelInfo, dataModel, callback, doTokenExpiredErrorHandling = true) {

    //console.log("saveRemoteDataModel modelInfo");
    //console.log(modelInfo);
    //console.log("saveRemoteDataModel dataModel");
    var dataModelSaveObject = dataModel.toSaveObject();
    //console.log(dataModelSaveObject);

    var modelToSave;
    if (hasBeenRemotelySaved(dataModelSaveObject)) {
        //console.log('GraphQL getDataModelChangeObject');
        modelToSave = getDataModelChangeObject(modelInfo, dataModelSaveObject, dataModel);
    } else {
        //console.log('GraphQL getFullModelObject');
        modelToSave = getFullModelObject(modelInfo, dataModelSaveObject, dataModel);
    }
    modelToSave.metadata = getMetadata(modelInfo);

    //console.log(modelToSave);
    // IMPORTANT: must reset here after creating the payload, but before the call
    //   otherwise stuff that gets changed during the call will be lost
    // UPDATE 2/7/2020: moving to after call with timestamp
    //dataModel.resetDataChangeFlags();

    getClient().mutate({
      mutation: gql`
          mutation SaveDataModel ($dataModel: DataModelInput) {
            saveDataModel(dataModel: $dataModel)
          }
      `,
      variables: {
          dataModel: modelToSave
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteDataModel response");
        //console.log(data);

        if (data && data.saveDataModel) {
            // UPDATE 2/7/2020: reset here.  dataModelSaveObject has a timestamp to reset saved changes without
                // getting rid of changes during network call
            dataModel.resetDataChangeFlags(dataModelSaveObject);
            callback({ success: true });
        } else {
            callback({ success: false, error: "Error saving. Could be due to service issues or insufficient permissions." });
        }
    })
    .catch((error) => {
        //console.log('saveRemoteDataModel error');
        //console.log(error);
        handleError(saveRemoteDataModel, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function loginUser (userInfo, callback, doTokenExpiredErrorHandling = true) {

    //console.log("loginUser userInfo");
    //console.log(userInfo);

    getClient().mutate({
      mutation: gql`
          mutation LoginUser($userInfo:UserInput) {
              loginUser(userInfo:$userInfo)
          }
      `,
      variables: {
          userInfo: userInfo
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("loginUser response");
        //console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "LoginUser did not return true" });
        }
    })
    .catch((error) => {
        handleError(loginUser, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function updateUserPrimaryOrganization (primaryOrganization, callback, doTokenExpiredErrorHandling = true) {

    getClient().mutate({
      mutation: gql`
            mutation UpdateUserPrimaryOrganization($primaryOrganization:String) {
                updateUserPrimaryOrganization(primaryOrganization:$primaryOrganization)
            }
          `,
      variables: {
        primaryOrganization: primaryOrganization
      }
    })
    .then((result) => {
        var { data } = result;

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "UpdateUserPrimaryOrganization did not return true" });
        }
    })
    .catch((error) => {
        handleError(updateUserPrimaryOrganization, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function updateUserSettings (userSettings, callback, doTokenExpiredErrorHandling = true) {

    //console.log("updateUserSettings userSettings");
    //console.log(userSettings);
    if (userSettings.canvasSettings) {
        userSettings.canvasSettings = JSON.stringify(userSettings.canvasSettings);
    }

    getClient().mutate({
      mutation: gql`
          mutation UpdateUserSettings($userSettings:UserSettingsCreateInput) {
              updateUserSettings(userSettings:$userSettings)
          }
      `,
      variables: {
          userSettings: userSettings
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("updateUserSettings response");
        //console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "UpdateUserSettings did not return true" });
        }
    })
    .catch((error) => {
        handleError(updateUserSettings, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function getUserSettings (email, callback, doTokenExpiredErrorHandling = true) {

    //console.log("getUserSettings email");
    //console.log(email);
    getClient().query({
      query: gql`
          query GetUserSettings($email: String) {
              getUserSettings(email: $email) {
                email
                canvasSettings
              }
          }
      `,
      variables: {
          email: email
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("getUserSettings response");
        //console.log(data);

        if (data && data.getUserSettings) {
            var userSettings = data.getUserSettings;
            if (userSettings.canvasSettings) {
                userSettings.canvasSettings = JSON.parse(userSettings.canvasSettings);
            }
            callback({ success: true, userSettings: data.getUserSettings });
        } else {
            callback({ success: true, userSettings: {} });
        }
    })
    .catch((error) => {
        handleError(getUserSettings, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export async function getLicensedFeatures () {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient().query({
              query: gql`
                  query GetLicensedFeatures {
                    features: getLicensedFeatures {
                        name
                    }
                  }
              `,
              variables: {}
            })
            .then((result) => {
                var { data } = result;
                if (data && data.features) {
                    //console.log('resolving ', data.features);
                    resolve({ success: true, features: data.features });
                } else {
                    //console.log('resolving []');
                    resolve({ success: true, features: [] });
                }
            })
            .catch((error) => {
                //console.log('resolving error');
                resolve({ success: false, error: error })
            });
        });
    }

    //console.log('awaiting');
    var licensedFeatures = await doGraphQLCall();
    //console.log('returning ', licensedFeatures);
    return licensedFeatures;
}

export async function getLicenseInfo () {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient({caller:'getLicenseInfo'}).query({
              query: gql`
                query GetLicenseInfo {
                licenseInfo: getLicenseInfo {
                    product
                    type
                    version
                    enterpriseDomains
                    licensedFeatures {
                        name
                    }
                }
              }`,
              variables: {}
            })
            .then((result) => {
                var { data } = result;
                if (data && data.licenseInfo) {
                    //console.log('resolving ', data.features);
                    resolve({ success: true, licenseInfo: data.licenseInfo });
                } else {
                    //console.log('resolving []');
                    resolve({ success: true, licenseInfo: {} });
                }
            })
            .catch((error) => {
                //console.log('resolving error');
                resolve({ success: false, error: error })
            });
        });
    }

    //console.log('awaiting');
    var licensedFeatures = await doGraphQLCall();
    //console.log('returning ', licensedFeatures);
    return licensedFeatures;
}

export async function decryptAsymmetricEncryptedItems (items) {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient().query({
              query: DECRYPT_ASYMMETRIC_ENCRYPTED_ITEMS,
              variables: {
                items: items
              }
            })
            .then((result) => {
                var { data } = result;
                if (data && data.decryptedItems) {
                    resolve({ success: true, decryptedItems: data.decryptedItems });
                } else {
                    resolve({ success: false, error: 'No items returned' });
                }
            })
            .catch((error) => {
                resolve({ success: false, error: error })
            });
        });
    }

    var user = await doGraphQLCall();
    //console.log('returning ', licensedFeatures);
    return user;

}

export async function getCurrentUser () {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient().query({
              query: GET_CURRENT_USER,
              variables: {}
            })
            .then((result) => {
                var { data } = result;
                if (data && data.user) {
                    resolve({ success: true, user: data.user });
                } else {
                    resolve({ success: true, user: [] });
                }
            })
            .catch((error) => {
                resolve({ success: false, error: error })
            });
        });
    }

    var user = await doGraphQLCall();
    //console.log('returning ', licensedFeatures);
    return user;
}

export async function getSystemMessages () {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient().query({
              query: GET_SYSTEM_MESSAGES,
              variables: {}
            })
            .then((result) => {
                var { data } = result;
                if (data && data.messages) {
                    resolve({ success: true, messages: data.messages });
                } else {
                    resolve({ success: true, messages: [] });
                }
            })
            .catch((error) => {
                resolve({ success: false, error: error })
            });
        });
    }

    var user = await doGraphQLCall();
    //console.log('returning ', licensedFeatures);
    return user;
}

export async function acknowledgeMessages (messageKeys) {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient().mutate({
                mutation: ACKNOWLEDGE_MESSAGES,
                variables: {
                  messageKeys: messageKeys
                }
              })
              .then((result) => {
                  var { data } = result;
                  if (data) {
                      resolve({ success: true });
                  } else {
                    resolve({ success: false, error: "acknowledgeMessages did not return true" });
                  }
              })
              .catch((error) => {
                resolve({ success: false, error: error });
            });
        });    
    }
    var response = await doGraphQLCall();
    return response;
}
