
import { gql } from "@apollo/client";
import { getClient, handleError } from './GraphQLPersistence';
import { GraphData, createNode, createRelationship } from '../../dataModel/graphData';
import { RelationshipTypes, NodeLabels, MINI_GRAPH_DOC_SUBGRAPH_MODEL } from '../../dataModel/graphDataConstants';
import DataTypes from "../../dataModel/DataTypes";
import { getGraphQLProperty } from "../../dataModel/graphUtil";

export function grabLock (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
          mutation GrabLock($graphDocKey:String) {
          	grabLock (graphDocKey:$graphDocKey)
          }
      `,
      variables: {
          graphDocKey: graphDocKey
      }
    })
    .then((result) => {
        var { data } = result;
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "GrabLock did not return true" });
        }
    })
    .catch((error) => {
        handleError(grabLock, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function deleteRemoteGraphDoc (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
    //console.log("deleteRemoteGraphDoc");
    //console.log("key: " + graphDocKey);
    getClient().mutate({
      mutation: gql`
          mutation RemoveGraphDoc($graphDocKey:String) {
          	removeGraphDoc (graphDocKey:$graphDocKey)
          }
      `,
      variables: {
          graphDocKey: graphDocKey
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("deleteRemoteGraphDoc response");
        //console.log(data);
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "RemoveGraphDoc did not return true" });
        }
    })
    .catch((error) => {
        handleError(deleteRemoteGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function deleteRemoteGraphDocs (graphDocKeys, callback, doTokenExpiredErrorHandling = true) {
    //console.log("deleteRemoteGraphDocs");
    //console.log("keys: " + graphDocKeys);
    getClient().mutate({
      mutation: gql`
          mutation RemoveGraphDocs($graphDocKeys:[String]) {
          	removeGraphDocs (graphDocKeys:$graphDocKeys)
          }
      `,
      variables: {
          graphDocKeys: graphDocKeys
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("deleteRemoteGraphDocs response");
        //console.log(data);
        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "RemoveGraphDocs did not return true" });
        }
    })
    .catch((error) => {
        handleError(deleteRemoteGraphDocs, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function deleteRemoteGraphDocAndDefaultView (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
        mutation: gql`
            mutation RemoveGraphDocAndDefaultView ($graphDocKey:String) {
                removeGraphDocAndDefaultView (graphDocKey:$graphDocKey)
            }
        `,
        variables: {
            graphDocKey: graphDocKey
        }
      })
      .then((result) => {
          var { data } = result;
          //console.log("deleteRemoteGraphDocAndDefaultView response");
          //console.log(data);
          if (data) {
              callback({ success: true });
          } else {
              callback({ success: false, error: "RemoveGraphDocAndDefaultView did not return true" });
          }
      })
      .catch((error) => {
          handleError(deleteRemoteGraphDocAndDefaultView, arguments, callback, error, doTokenExpiredErrorHandling);
      });
  }

export function updateUserRoles (graphDocKey, isPublic, userRoles, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
      mutation: gql`
        mutation UpdateUserRoles($graphDocKey:String,$isPublic:Boolean,$userRoles:[UserRoleInput]) {
            updateUserRoles(graphDocKey:$graphDocKey, isPublic:$isPublic, userRoles:$userRoles)
        }
      `,
      variables: {
          graphDocKey: graphDocKey,
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

export function getUserRolesForGraphDoc (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
          query GetUserRolesForGraphDoc($graphDocKey:String) {
              getUserRolesForGraphDoc(graphDocKey:$graphDocKey) {
                  email
                  role
                  isCreator
              }
          }
        `,
        variables: {
            graphDocKey: graphDocKey
        }
    })
    .then(result => {
        callback({ success: true, data: result.data.getUserRolesForGraphDoc });
    })
    .catch((error) => {
        handleError(getUserRolesForGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

const listResult = `
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

export function listRemoteGraphDocMetadata (graphDocType, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
        query ListGraphDoc ($graphDocType: String, $myOrderBy: String, $orderDirection: String) {
      	  listGraphDocsX(graphDocType: $graphDocType, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
              ${listResult}
      	  }
        }
        `,
        variables: {
            graphDocType: graphDocType,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection
        }
    })
    .then(result => {
        callback({ success: true, data: result.data });
    })
    .catch((error) => {
        //console.log("listRemoteGraphDocMetadata error", error);
        handleError(listRemoteGraphDocMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function searchRemoteGraphDocMetadata (graphDocType, searchText, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
  getClient()
    .query({
      query: gql`
          query SearchGraphDoc ($graphDocType: String, $searchText: String, $myOrderBy: String, $orderDirection: String) {
          	searchGraphDocsX(graphDocType: $graphDocType, searchText: $searchText, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
                ${listResult}
          	}
          }
        `,
        variables: {
            graphDocType: graphDocType,
            searchText: searchText,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection
        }
    })
    .then(result => {
        callback({ success: true, data: result.data });
    })
    .catch((error) => {
        handleError(searchRemoteGraphDocMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

const graphDocResult = `
    key
    isPrivate
    primaryNodeLabel
    metadata {
        viewSettings
    }
    lockInfo {
        lockedByUser
        lockTimestamp
        lockIsActive
    }
    graph {
        nodes {
            neoInternalId
            key {
                label
                properties {
                key
                datatype
                value
                }
            }
            primaryNodeLabel
            isRootNode
            labels
            properties {
                key
                datatype
                value
            }
        }
        relationships {
            neoInternalId
            type
            startNodeKey {
                label
                properties {
                    key
                    datatype
                    value
                }
            }
            endNodeKey {
                label
                properties {
                    key
                    datatype
                    value
                }
            }
            keyProperties {
                key
                datatype
                value
            }
            properties {
                key
                datatype
                value
            }
        }
    }
`;

function processLoadGraphDocResult (graphDocResponse, callback, doTokenExpiredErrorHandling = true) {
    console.log("GraphQLGraphDoc graphDocResponse: ", graphDocResponse);
    if (graphDocResponse.metadata && graphDocResponse.metadata.viewSettings && typeof(graphDocResponse.metadata.viewSettings) === 'string') {
        graphDocResponse.metadata.viewSettings = JSON.parse(graphDocResponse.metadata.viewSettings);
    }
    /*
    graphDocResponse.graph.relationships.forEach(relationship => {
        relationship.startNodeKey = relationship.startNode.key;
        relationship.endNodeKey = relationship.endNode.key;
    });
    */
    callback(graphDocResponse);
}

function processLoadGraphDocAndViewResult (graphDocAndViewResponse, callback, doTokenExpiredErrorHandling = true) {
    console.log("GraphQLGraphDoc graphDocAndViewResponse: ", graphDocAndViewResponse);
    if (graphDocAndViewResponse.graphDoc.metadata && graphDocAndViewResponse.graphDoc.metadata.viewSettings && typeof(graphDocAndViewResponse.graphDoc.metadata.viewSettings) === 'string') {
        graphDocAndViewResponse.graphDoc.metadata.viewSettings = JSON.parse(graphDocAndViewResponse.graphDoc.metadata.viewSettings);
    }
    /*
    graphDocResponse.graph.relationships.forEach(relationship => {
        relationship.startNodeKey = relationship.startNode.key;
        relationship.endNodeKey = relationship.endNode.key;
    });
    */
    callback(graphDocAndViewResponse);
}


export async function loadRemoteGraphDocAndDefaultView (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query loadGraphDocAndDefaultView ($graphDocKey: String) {
                loadGraphDocAndDefaultView(graphDocKey: $graphDocKey) {
                    graphDoc {
                        ${graphDocResult}
                    } 
                    graphDocView {
                        ${graphDocResult}
                    }
              }
            }
            `,
        variables: {
            graphDocKey: graphDocKey
        }
      })
      .then(result => {
          processLoadGraphDocAndViewResult(result.data.loadGraphDocAndDefaultView, callback);
      })
      .catch((error) => {
          handleError(loadRemoteGraphDocAndDefaultView, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function loadRemoteGraphDoc (graphDocKey, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query loadGraphDoc ($graphDocKey: String) {
              loadGraphDoc(graphDocKey: $graphDocKey) {
                ${graphDocResult}
              }
            }
            `,
        variables: {
            graphDocKey: graphDocKey
        }
      })
      .then(result => {
          processLoadGraphDocResult(result.data.loadGraphDoc, callback);
      })
      .catch((error) => {
          handleError(loadRemoteGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function loadLastOpenedGraphDocAndDefaultView (graphDocType, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query loadLastOpenedGraphDocAndDefaultView ($graphDocType: String) {
                loadLastOpenedGraphDocAndDefaultView (graphDocType: $graphDocType) {
                    graphDoc {
                        ${graphDocResult}
                    } 
                    graphDocView {
                        ${graphDocResult}
                    }
              }
            }
            `,
        variables: {
            graphDocType: graphDocType
        }
      })
      .then(result => {
          processLoadGraphDocAndViewResult(result.data.loadLastOpenedGraphDocAndDefaultView, callback);
      })
      .catch((error) => {
          handleError(loadLastOpenedGraphDocAndDefaultView, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

export function loadLastOpenedGraphDoc (graphDocType, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query loadLastOpenedGraphDoc ($graphDocType: String) {
              loadLastOpenedGraphDoc (graphDocType: $graphDocType) {
                ${graphDocResult}
              }
            }
            `,
        variables: {
            graphDocType: graphDocType
        }
      })
      .then(result => {
          processLoadGraphDocResult(result.data.loadLastOpenedGraphDoc, callback);
      })
      .catch((error) => {
          handleError(loadLastOpenedGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}

function hasBeenRemotelySaved (graphDocSaveObject) {
    return graphDocSaveObject.isRemotelyPersisted;
    /*
    return (Object.values(graphDocSaveObject.nodes).some(node => node.key.match(ID_JOINER)) ||
        Object.values(graphDocSaveObject.relationships).some(relationship => relationship.key.match(ID_JOINER)))
    */
}

function getGraphInput (idJoiner, graphDocChanges, graphDocDeletions) {

    /*
    input GraphInput {
        upsertNodes: [NodeInput]
        removeNodes: [NodeInput]
        upsertRelationships: [RelationshipInput]
        removeRelationships: [RelationshipInput]
    }
    */

    var graphDoc = {
        upsertNodes: getUpsertNodes(graphDocChanges.changedNodes, idJoiner),
        upsertRelationships: getUpsertRelationships(graphDocChanges.changedRelationships, idJoiner),
        removeNodes: graphDocDeletions.deletedNodeKeys.map(key => ({
            key: convertNodeKey(key, idJoiner)
        })),
    	removeRelationships: graphDocDeletions.deletedRelationshipKeys.map(key => {
            var convertedKey = {
                startNodeKey: convertNodeKey(key.startNodeKey, idJoiner),
                endNodeKey: convertNodeKey(key.endNodeKey, idJoiner),
                type: key.type
            }
            if (key.keyProperties) {
                convertedKey.keyProperties = convertKeyProperties(key.keyProperties, false, key.rootNodeKey, idJoiner)
            }
            return convertedKey;
        })
    }
    return graphDoc;
}

var convertNodeKey = (nodeKey, idJoiner) => {
    return {
        label: nodeKey.label,
        properties: convertKeyProperties(nodeKey.properties, nodeKey.isRootNode, nodeKey.rootNodeKey, idJoiner)
    }
}

var convertKeyProperties = (properties, isRootNode, graphDocKey, idJoiner) => {
    return properties.map(property => {
        // TODO: don't hard code check for 'key' - get it from subgraphModel or somewhere
        if (!isRootNode && property.key === 'key') {
            return {
                ...property,
                value: getRemoteKey(graphDocKey, property.value, idJoiner)
            }
        } else {
            return property;
        }
    })
}


var getRemoteKey = (graphDocKey, key, idJoiner) => {
    return (key.match(idJoiner)) ? key : graphDocKey + idJoiner + key;        
}

/*
function getFullGraphDocObject (graphDocMetadata, graphDocSaveObject, graphDoc) {
    return {
        key: graphDocMetadata.key,
        //relationshipIdCounter: graphDocSaveObject.relationshipIdCounter,
        upsertNodes: getUpsertNodes(Object.values(graphDocSaveObject.nodes), graphDoc),
        upsertRelationships: getUpsertRelationships(graphDocMetadata.key, Object.values(graphDocSaveObject.relationships), graphDoc)
    }
}
*/

function getMinimalMetadata (graphDocMetadata) {
    var { key, dateCreated, dateUpdated, viewSettings } = graphDocMetadata;

    var metadata = {
        key: key,
        dateCreated: (typeof(dateCreated) === 'string') ? dateCreated : (new Date(dateCreated)).getTime().toString(),
        dateUpdated: (typeof(dateUpdated) === 'string') ? dateUpdated : (new Date(dateUpdated)).getTime().toString(),
        viewSettings: JSON.stringify(viewSettings)
    };

    return metadata;
}

function getMetadata (graphDocMetadata, previousState) {
    var { key, cypherWorkbenchVersion, title, description, notes, dateCreated, dateUpdated, viewSettings, isPublic } = graphDocMetadata;

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
        computeUpsertRemove(metadata, graphDocMetadata, previousState, { arrayTagName: 'tags', arrayEntryPropName: 'key'});
        computeUpsertRemove(metadata, graphDocMetadata, previousState, { arrayTagName: 'customers', arrayEntryPropName: 'key'});
    }

    return metadata;

}

function getUpsertNodes (nodes, idJoiner) {
    /*
    return an array of NodeInput
    input NodeInput {
        key: NodeKeyInput
        primaryNodeLabel: String 
        isRootNode: Boolean   
        upsertLabels: [String]
        removeLabels: [String]
        upsertProperties: [PropertyInput]
        removeProperties: [String]  // remove property keys
    }
    */

    return nodes
        //.filter(graphNode => !graphNode.isRootNode)
        .map(graphNode => convertGraphNodeToGraphQLNode(graphNode, idJoiner));
}

function getUpsertRelationships (relationships, idJoiner) {
    /* 
    return an array of RelationshipInput
    input RelationshipInput {
        startNodeKey: NodeKeyInput
        endNodeKey: NodeKeyInput
        type: String
        upsertProperties: [PropertyInput]
        removeProperties: [String]
    }
    */

    return relationships
        .map(graphRelationship => 
            convertGraphRelationshipToGraphQLRelationship(graphRelationship, idJoiner));
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

export function saveRemoteGraphDocMetadata (graphDocMetadata, subgraphModel, previousState, callback, doTokenExpiredErrorHandling = true) {

    //console.log("saveRemoteGraphDocMetadata graphDoc");
    //console.log(graphDoc);

    var metadata = getMetadata(graphDocMetadata, previousState);
    var graphDoc = {
        key: graphDocMetadata.key,
		subgraphModel: subgraphModel,
        metadata: metadata
	};

    //console.log(metadata);

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDocMetadata ($graphDoc: GraphDocInput) {
            saveGraphDocMetadata(graphDoc: $graphDoc)
          }
      `,
      variables: {
          graphDoc: graphDoc
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteGraphDocMetadata response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveRemoteGraphDocMetadata did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteGraphDocMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function saveRemoteGraphDocWithView (graphDocKey, graphDataView, subgraphModel, securityDelegate, callback) {
    var graphDoc = {
        key: graphDocKey,
        securityDelegate: securityDelegate,
        subgraphModel: subgraphModel        
    }
    saveRemoteGraphDocWithViewInternal(graphDoc, graphDataView, subgraphModel, callback);
}

export function saveRemoteGraphDocMetadataWithView (graphDocMetadata, graphDataView, subgraphModel, previousState, callback) {
    var graphDoc = {
        key: graphDocMetadata.key,
        subgraphModel: subgraphModel,
        metadata: getMetadata(graphDocMetadata, previousState)
    };
    //console.log("saveRemoteGraphDocMetadata graphDoc");
    //console.log(graphDoc);
    saveRemoteGraphDocWithViewInternal(graphDoc, graphDataView, subgraphModel, callback);
}

export function saveRemoteGraphDocWithViewInternal (graphDoc, graphDataView, subgraphModel, callback, doTokenExpiredErrorHandling = true) {

    // this is need to construct the keys for the relationship between the 2 graph docs
    var tempGraphDoc = new GraphData({
        SUBGRAPH_MODEL: MINI_GRAPH_DOC_SUBGRAPH_MODEL
    });

    // needed for the relationship between the GraphView and the GraphDoc
    var graphDocNode = createNode({
        isRootNode: true,
        primaryNodeLabel: NodeLabels.GraphDoc,
        labels: [NodeLabels.GraphDoc],
        key: graphDoc.key
    });
    graphDocNode.addProperty("key", graphDoc.key);  // TODO: don't hardcode key, get from SUBGRAPH_MODEL
    graphDocNode.setGraphData(tempGraphDoc);

    var graphViewRootNode = graphDataView.getGraphViewRootNode();

    // deep copy
    var modifiedSubgraphModel = JSON.parse(JSON.stringify(graphDataView.getSubgraphModel()));
    // view model needs to include keyConfig info of the graphDoc, or keys are not reconstructed properly
    modifiedSubgraphModel.keyConfig = modifiedSubgraphModel.keyConfig.concat(subgraphModel.keyConfig);

    var graphViewGraphDoc = {
        key: graphViewRootNode.key,
        securityDelegate: graphDoc.securityDelegate,
		subgraphModel: modifiedSubgraphModel
    };

    var graphViewToGraphDocRelationship = createRelationship({
        type: RelationshipTypes.DEFAULT_GRAPH_VIEW_FOR,
        startNode: graphDataView.getGraphViewRootNode(),
        endNode: graphDocNode
    }, graphDataView.getKeyHelper());

    var idJoiner = graphDataView.getKeyHelper().getIdJoiner();
    var graphQlRelationship = convertGraphRelationshipToGraphQLRelationship(graphViewToGraphDocRelationship, idJoiner);

    var graphDocRoots = {
        graphDocs: [graphDoc, graphViewGraphDoc],
        graphDocInput: {
            key: graphViewRootNode.key,
            graph: {
                upsertRelationships: [graphQlRelationship]
            }
        }
    }
    //console.log(metadata);

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDocRootsWithMetadata ($graphDocRoots: GraphDocRootsInput) {
            saveGraphDocRootsWithMetadata(graphDocRoots: $graphDocRoots)
          }
      `,
      variables: {
        graphDocRoots: graphDocRoots
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteGraphDocMetadata response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveRemoteGraphDocMetadataWithView did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteGraphDocWithViewInternal, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

/* Yes, yes: the method names are getting pretty long here, are they not? 
    What this thing will do is make/save the following things
      GraphDocA - REL_A_B -> GraphDocB
      GraphDocB - DEFAULT_GRAPH_VIEW_FOR -> GraphDocViewB
      set GraphDocB securityDelegate to GraphDocA
      set GraphDocViewB securityDelegate to GraphDocA
*/
export function saveRemoteGraphDocWithChildGraphDocWithView (mainGraphDoc, mainGraphDocKeyHelper, mainSubRelationshipType, subGraphDoc, subGraphDataView, subgraphModel, callback, doTokenExpiredErrorHandling = true) {

    // this is need to construct the keys for the relationships between graph docs
    var tempGraphDoc = new GraphData({
        SUBGRAPH_MODEL: MINI_GRAPH_DOC_SUBGRAPH_MODEL
    });

    var mainGraphDocCopy = {
        ...mainGraphDoc,
        metadata: getMetadata(mainGraphDoc.metadata)
    }

    var mainGraphDocNode = createNode({
        isRootNode: true,
        primaryNodeLabel: NodeLabels.GraphDoc,
        labels: [NodeLabels.GraphDoc],
        key: mainGraphDoc.key
    });
    mainGraphDocNode.addProperty("key", mainGraphDoc.key);  // TODO: don't hardcode key, get from SUBGRAPH_MODEL
    mainGraphDocNode.setGraphData(tempGraphDoc);

    // needed for the relationship between the GraphView and the GraphDoc
    var subGraphDocNode = createNode({
        isRootNode: true,
        primaryNodeLabel: NodeLabels.GraphDoc,
        labels: [NodeLabels.GraphDoc],
        key: subGraphDoc.key
    });
    subGraphDocNode.addProperty("key", subGraphDoc.key);  // TODO: don't hardcode key, get from SUBGRAPH_MODEL
    subGraphDocNode.setGraphData(tempGraphDoc);

    var graphViewRootNode = subGraphDataView.getGraphViewRootNode();

    // deep copy
    var modifiedSubgraphModel = JSON.parse(JSON.stringify(subGraphDataView.getSubgraphModel()));
    // view model needs to include keyConfig info of the graphDoc, or keys are not reconstructed properly
    modifiedSubgraphModel.keyConfig = modifiedSubgraphModel.keyConfig.concat(subgraphModel.keyConfig);

    var graphViewGraphDoc = {
        key: graphViewRootNode.key,
        securityDelegate: mainGraphDoc.key,
		subgraphModel: modifiedSubgraphModel
    };

    var subGraphDocCopy = {
        ...subGraphDoc,
        securityDelegate: mainGraphDoc.key
    }

    var mainSubRelationship = createRelationship({
        type: mainSubRelationshipType,
        startNode: mainGraphDocNode,
        endNode: subGraphDocNode
    }, mainGraphDocKeyHelper);    

    var graphViewToGraphDocRelationship = createRelationship({
        type: RelationshipTypes.DEFAULT_GRAPH_VIEW_FOR,
        startNode: subGraphDataView.getGraphViewRootNode(),
        endNode: subGraphDocNode
    }, subGraphDataView.getKeyHelper());

    var idJoiner = mainGraphDocKeyHelper.getIdJoiner();
    var graphQlMainSubRelationship = convertGraphRelationshipToGraphQLRelationship(mainSubRelationship, idJoiner);

    var idJoinerView = subGraphDataView.getKeyHelper().getIdJoiner();
    var graphQlDefaultViewRelationship = convertGraphRelationshipToGraphQLRelationship(graphViewToGraphDocRelationship, idJoinerView);

    var graphDocRoots = {
        graphDocs: [mainGraphDocCopy, subGraphDocCopy, graphViewGraphDoc],
        graphDocInput: {
            key: subGraphDocCopy.key,
            graph: {
                upsertRelationships: [
                    graphQlMainSubRelationship,
                    graphQlDefaultViewRelationship
                ]
            }
        }
    }
    //console.log(metadata);

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDocRootsWithMetadata ($graphDocRoots: GraphDocRootsInput) {
            saveGraphDocRootsWithMetadata(graphDocRoots: $graphDocRoots)
          }
      `,
      variables: {
        graphDocRoots: graphDocRoots
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteGraphDocMetadata response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveRemoteGraphDocMetadataWithView did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteGraphDocWithChildGraphDocWithView, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

/*
export function saveRemoteGraphDocWithFullMetadata (graphDocMetadata, graphDoc, previousState, callback, doTokenExpiredErrorHandling = true) {
    //console.log("saveRemoteGraphDocWithFullMetadata graphDocMetadata");
    //console.log(graphDocMetadata);
    //console.log("saveRemoteGraphDocWithFullMetadata graphDoc");
    var graphDocSaveObject = graphDoc.toSaveObject();
    //console.log(graphDocSaveObject);

    var graphDocToSave;
    if (hasBeenRemotelySaved(graphDocSaveObject)) {
        graphDocToSave = getGraphInput(graphDocSaveObject, graphDoc);
    } else {
        graphDocToSave = getFullGraphDocObject(graphDocMetadata, graphDocSaveObject, graphDoc);
    }
    graphDocToSave.metadata = getMetadata(graphDocMetadata, previousState);

    //console.log(graphDocToSave);

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDocWithFullMetadata ($graphDoc: GraphDocInput) {
            saveGraphDocWithFullMetadata (graphDoc: $graphDoc)
          }
      `,
      variables: {
          graphDoc: graphDocToSave
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveGraphDocWithFullMetadata response");
        //console.log(data);

        if (data) {
            // UPDATE 2/7/2020: reset here.  graphDocSaveObject has a timestamp to reset saved changes without
                // getting rid of changes during network call
            graphDoc.resetDataChangeFlags(graphDocSaveObject);
            callback({ success: true });
        } else {
            callback({ success: false, error: "SaveGraphDocWithFullMetadata did not return true" });
        }
    })
    .catch((error) => {
        handleError(saveRemoteGraphDocWithFullMetadata, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}
*/

function getPropertyInput (property, graphNode, idJoiner) {
    if (property) {

        var keyValue = null; 
        if (graphNode && idJoiner && !graphNode.isRootNode) {
            var graphDocKey = graphNode.getGraphData().getGraphRootNode().key,
            keyValue = getRemoteKey(graphDocKey, property.value, idJoiner);
        } else {
            keyValue = property.value;
        }

        return getGraphQLProperty({
            key: property.key,
            datatype: (property.datatype) ? property.datatype : DataTypes.String,
            value: keyValue
        });
        
    } else {
        try {
            throw new Error("getPropertyInput property is null");
        } catch (e) {
            console.log(e);
        }

        return getGraphQLProperty({
            key: null,
            datatype: DataTypes.String,
            value: null
        });
    }
}

function getNodeKeyInput (graphNode, idJoiner) {

    var keyProperties = [];
    var graphData = graphNode.getGraphData();
    var subgraphModel = (graphData) ? graphData.getSubgraphModel() : null;
    if (subgraphModel) {
        var nodeKeyConfig = subgraphModel.keyConfig.find(x => x.nodeLabel === graphNode.primaryNodeLabel);
        if (nodeKeyConfig) {
            keyProperties = nodeKeyConfig.propertyKeys.map(propertyKey => {
                var keyProperty = graphNode.getPropertyByKey(propertyKey);
                return getPropertyInput(keyProperty, graphNode, idJoiner);
            });
        }
    }

    return {
        properties: keyProperties,
        label: graphNode.primaryNodeLabel
    }
}

function getRelationshipKeyProperties (graphRelationship, idJoiner) {

    var keyProperties = [];
    var graphData = graphRelationship.getGraphData();
    var subgraphModel = (graphData) ? graphData.getSubgraphModel() : null;
    if (subgraphModel) {
        var relationshipKeyConfig = subgraphModel.keyConfig.find(x => x.relationshipType === graphRelationship.type);
        if (relationshipKeyConfig) {
            keyProperties = relationshipKeyConfig.propertyKeys.map(propertyKey => {
                var keyProperty = graphRelationship.getPropertyByKey(propertyKey);
                return getPropertyInput(keyProperty, graphRelationship, idJoiner);
            });
        }
    }

    return keyProperties;
}

function convertGraphNodeToGraphQLNode (graphNode, idJoiner) {

    var graphQlProperties = graphNode.getChangedProperties().map(x => {
        // TODO: don't hard code check for 'key' - get it from subgraphModel or somewhere
        if (x.key === 'key') {
            return getPropertyInput(x, graphNode, idJoiner);
        } else {
            return getPropertyInput(x)
        }
    });
    return {
        key: getNodeKeyInput(graphNode, idJoiner),
        primaryNodeLabel: graphNode.primaryNodeLabel,
        isRootNode: graphNode.isRootNode,
        upsertLabels: graphNode.labels,
        upsertProperties: graphQlProperties
    }    
}

function convertGraphRelationshipToGraphQLRelationship (graphRelationship, idJoiner) {
    
    var startNodeKey = getNodeKeyInput(graphRelationship.startNode, idJoiner);
    var endNodeKey = getNodeKeyInput(graphRelationship.endNode, idJoiner);
    var keyProperties = getRelationshipKeyProperties(graphRelationship, idJoiner);
    var graphQlProperties = graphRelationship.getChangedProperties()
            // remove keyProperties from upsertProperties
            .filter(x => !keyProperties.find(keyProp => keyProp.key === x.key))
            .map(x => getPropertyInput(x));

    return {
        startNodeKey: startNodeKey,
        endNodeKey: endNodeKey,
        keyProperties: keyProperties,
        type: graphRelationship.type,
        upsertProperties: graphQlProperties
    }
}

/*
export function saveRemoteViewGraphDoc (graphDataView, graphDocMetadata, callback, doTokenExpiredErrorHandling = true) {

    // this represents the 
     var tempGraphDoc = new GraphData({
        SUBGRAPH_MODEL: MINI_GRAPH_DOC_SUBGRAPH_MODEL
    });

    var graphDocNode = createNode({
        primaryNodeLabel: NodeLabels.GraphDoc,
        labels: [NodeLabels.GraphDoc],
        key: graphDocMetadata.key
    });
    graphDocNode.addProperty("key", graphDocMetadata.key);  // TODO: don't hardcode key, get from SUBGRAPH_MODEL
    graphDocNode.setGraphData(tempGraphDoc);

    var graphViewToGraphDocRelationship = createRelationship({
        type: RelationshipTypes.DEFAULT_GRAPH_VIEW_FOR,
        startNode: graphDataView.getGraphViewRootNode(),
        endNode: graphDocNode
    }, graphDataView.getKeyHelper());

    var subgraphModel = graphDataView.getSubgraphModel(); 
    var graphViewRootNode = graphDataView.getGraphViewRootNode();
    var graphQlGraphViewRootNode = convertGraphNodeToGraphQLNode(graphViewRootNode);
    var graphQlRelationship = convertGraphRelationshipToGraphQLRelationship(graphViewToGraphDocRelationship);

    var graphDocInput = {
        key: graphDocMetadata.key,
        subgraphModel: subgraphModel,
        graph: {
            upsertNodes: [graphQlGraphViewRootNode],
            upsertRelationships: [graphQlRelationship]
        }
    };
    graphDocInput.metadata = getMinimalMetadata(graphDocMetadata);

    getClient().mutate({
        mutation: gql`
            mutation SaveGraphDoc ($graphDoc: GraphDocInput) {
              saveGraphDoc(graphDoc: $graphDoc)
            }
        `,
        variables: {
            graphDoc: graphDocInput
        }
      })
      .then((result) => {
          var { data } = result;
          if (data && data.saveGraphDoc) {
              callback({ success: true });
          } else {
              callback({ success: false, error: "Error saving. Could be due to service issues or insufficient permissions." });
          }
      })
      .catch((error) => {
          handleError(saveRemoteViewGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
      });
}
*/

export function saveGraphDocChanges (graphDocMetadata, idJoiner, graphDocChanges, graphDocDeletions, callback, doTokenExpiredErrorHandling = true) {

    /*
    input GraphDocInput {
        key: ID!
        isPrivate: Boolean                  // handled via !metadata.isPublic
        metadata: GraphDocMetadataInput     // already set up, just need minimal info
        subgraphModel: GraphModel           // already set up
        graph: GraphInput       
    }*/
    
    var graphDocInput = {
        key: graphDocMetadata.key
    };
    graphDocInput.graph = getGraphInput(idJoiner, graphDocChanges, graphDocDeletions);
    graphDocInput.metadata = getMinimalMetadata(graphDocMetadata);

    /*
    try {
        throw new Error('printing stack trace');
    } catch (e) {
        console.log(new Date().toLocaleTimeString());
        console.log(e);
    }*/

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDoc ($graphDoc: GraphDocInput) {
            saveGraphDoc(graphDoc: $graphDoc)
          }
      `,
      variables: {
          graphDoc: graphDocInput
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteGraphDoc response");
        //console.log(data);

        if (data && data.saveGraphDoc) {
            // UPDATE 2/7/2020: reset here.  graphDocSaveObject has a timestamp to reset saved changes without
                // getting rid of changes during network call

            // UPDATE 8/28/2020: moving to callback, will be called when success: true
            //graphDoc.resetDataChangeFlags(graphDocSaveObject);

            callback({ success: true });
        } else {
            callback({ success: false, error: "Error saving. Could be due to service issues or insufficient permissions." });
        }
    })
    .catch((error) => {
        //console.log('saveRemoteGraphDoc error');
        //console.log(error);
        handleError(saveGraphDocChanges, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

/*
export function saveRemoteGraphDoc (graphDocMetadata, graphDoc, callback, doTokenExpiredErrorHandling = true) {

    //console.log("saveRemoteGraphDoc graphDocMetadata");
    //console.log(graphDocMetadata);
    //console.log("saveRemoteGraphDoc graphDoc");
    var graphDocSaveObject = graphDoc.toSaveObject();
    //console.log(graphDocSaveObject);

    var graphDocToSave;
    if (hasBeenRemotelySaved(graphDocSaveObject)) {
        graphDocToSave = getGraphInput(graphDocSaveObject, graphDoc);
    } else {
        graphDocToSave = getFullGraphDocObject(graphDocMetadata, graphDocSaveObject, graphDoc);
    }
    graphDocToSave.metadata = getMetadata(graphDocMetadata);

    //console.log(graphDocToSave);
    // IMPORTANT: must reset here after creating the payload, but before the call
    //   otherwise stuff that gets changed during the call will be lost
    // UPDATE 2/7/2020: moving to after call with timestamp
    //graphDoc.resetDataChangeFlags();

    getClient().mutate({
      mutation: gql`
          mutation SaveGraphDoc ($graphDoc: GraphDocInput) {
            saveGraphDoc(graphDoc: $graphDoc)
          }
      `,
      variables: {
          graphDoc: graphDocToSave
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("saveRemoteGraphDoc response");
        //console.log(data);

        if (data && data.saveGraphDoc) {
            // UPDATE 2/7/2020: reset here.  graphDocSaveObject has a timestamp to reset saved changes without
                // getting rid of changes during network call
            graphDoc.resetDataChangeFlags(graphDocSaveObject);
            callback({ success: true });
        } else {
            callback({ success: false, error: "Error saving. Could be due to service issues or insufficient permissions." });
        }
    })
    .catch((error) => {
        //console.log('saveRemoteGraphDoc error');
        //console.log(error);
        handleError(saveRemoteGraphDoc, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

*/