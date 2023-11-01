import { last } from "lodash";

/*
A bit of history.  The dataModel.js was the original class used to support the modeler. It has a function
called getNewKey that will get keys locally, like Node0, Node1, etc and makes an assumption that the keyspace
is limited to the current data model document, which is all of the items 
  (NodeLabels, RelationshipTypes, PropertyDefinitions) that make up a DataModel.

These local keys were pre-pended with the DataModel key before saving (e.g. aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_Node0), 
then stripped back (Node0) when loading.  

The GraphDoc scheme was developed with the hope of saving sub-graphs as units (i.e. documents), and this 
KeyHelper class was to take the role of generating local keys and saving/loading them in much the same way
that the DataModel was, that is by prepending a local key with a UUID, and stripping it back off during load.

This works find in the general sense, when we are working with a single graph document, which by definition
has a single root node, and child nodes derive their keys by prepending the root node key in front of the local
key they have.  

Also on load, by generalizing relationships, we are able to swap out the relationship start key and relationship
end key with actual materialized nodes by creating a nodeMap[nodeKey] = node when loading.

This all works very well for normal well-defined GraphDocs.

However, a problem arises when we try to bend the rules a bit, and:

 (a) start providing links between GraphDocs
 (b) start pulling in GraphDocMetadata nodes which were originally not designed as part of the GraphDoc sub-node scheme

In (a), what can happen is if we modify the SUBGRAPH_MODEL to include nodes in another GraphDoc, if we
  strip off the UUID prefix, we can have node collisions, and then the relationship lookups don't work correctly

In (b), the key of GraphDocMetadata is actually the same key as the GraphDoc and since the local keys did not
include the NodeLabel as a prefix, then this also causes local key collisions.  

To fix these issues properly, a lot of refactoring is going to have to happen, followed by a 
lot of test writing and testing.  This work should eventually happen if this GraphDoc scheme is to be 
carried forward, however, it is unclear whether this design will remain, especially if this eventually moves
to another group.  Therefore, for now, in the interest of time, 2 fixes have been made:

(fix a) - to avoid local key collisions when providing links between GraphDocs, we will modify the SUBGRAPH_MODEL
to include a remoteNodeLabels array.  Any NodeLabel values present will not be converted to the local form
and therefore will keep the full remote key.  This should avoid node key collisions when the node key is used 
in a map.  Note that for saving relationships to remote graph docs, specific GraphQL endpoints will need to be made
or extra work with key handling will need to take place to formulate the proper payload for saving.

(fix b) - if a GraphDocMetadata node is loaded, when its key is used in a map, it will prepended with GraphDocMetadata_
to avoid collisions with the GraphDoc key. 



*/


export class KeyHelper {

    id = null;
    
    NEW_NODE_KEY_PREFIX = "Node";
    NEW_RELATIONSHIP_KEY_PREFIX = "Rel";

    INTERNAL_KEY_JOINER_DEFAULT = '$$';
    ID_JOINER_DEFAULT = '_cwid_';
    KEY_START_DEFAULT = 0;
    KEY_MAX_DEFAULT = 1000000;

    usedKeys = {};
    keyConfigMap = {};
    relKeyConfigMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        const {
            id,
            INTERNAL_KEY_JOINER,
            ID_JOINER,
            KEY_START,
            KEY_MAX,
            SUBGRAPH_MODEL
        } = properties;

        this.myObjectName = 'KeyHelper';    // because either Chrome or React is changing object.constructor.name

        this.id = id;
        this.INTERNAL_KEY_JOINER = (INTERNAL_KEY_JOINER) ? INTERNAL_KEY_JOINER : this.INTERNAL_KEY_JOINER_DEFAULT;
        this.ID_JOINER = (ID_JOINER) ? ID_JOINER : this.ID_JOINER_DEFAULT;
        this.KEY_START = (KEY_START) ? KEY_START : this.KEY_START_DEFAULT;
        this.KEY_MAX = (KEY_MAX) ? KEY_MAX : this.KEY_MAX_DEFAULT;

        this.setSubgraphModel(SUBGRAPH_MODEL);
    }

    setSubgraphModel = (subgraphModel) => {
        this.SUBGRAPH_MODEL = subgraphModel;
        this.initKeyConfigMap();
    }

    initKeyConfigMap = () => {
        this.keyConfigMap = {};
        this.relKeyConfigMap = {};
        if (this.SUBGRAPH_MODEL) {
            this.SUBGRAPH_MODEL.keyConfig
                .filter(config => config.nodeLabel) // get rid of relationshipTypes
                .map(config => this.keyConfigMap[config.nodeLabel] = config.propertyKeys);

            this.SUBGRAPH_MODEL.keyConfig
                .filter(config => config.relationshipType) // get rid of nodeLabels
                .map(config => this.relKeyConfigMap[config.relationshipType] = config.propertyKeys);
        }
    }

    getIdJoiner = () => this.ID_JOINER;

    addUsedKey = (usedKey) => {

        //console.log('usedKey: ', usedKey);
        usedKey = (typeof(usedKey) === 'string') ? usedKey : `${usedKey}`;
        this.usedKeys[usedKey] = usedKey;

        // decompose keys - this will add a local version of the key to the map, so 
        //   when we call getNewKey, we won't get duplicates given the scheme Node0, Node1, etc
        var tokens = usedKey.split(this.INTERNAL_KEY_JOINER);
        //console.log('tokens: ', tokens);
        var lastToken = (tokens && tokens.length > 0) ? tokens[tokens.length-1] : '';
        tokens = lastToken.split(this.ID_JOINER);
        //console.log('tokens 2: ', tokens);
        if (tokens && tokens.length > 0) {
            lastToken = tokens[tokens.length-1];
            if (lastToken) {
                this.usedKeys[lastToken] = lastToken;
            }
        }
    }

    clearUsedKeys = () => {
        this.usedKeys = {};
    }

    isRemoteNodeLabel = (nodeLabel) => {
        var remoteNodeLabels = (this.SUBGRAPH_MODEL && this.SUBGRAPH_MODEL.remoteNodeLabels) ? this.SUBGRAPH_MODEL.remoteNodeLabels : [];
        return remoteNodeLabels.includes(nodeLabel);
    }
    

    // NOTE: local keys have become problematic when trying to do things across more than 1
    //   graph document. We are encountering key collisions. A solution (for now) is to 
    //   put which node labels are from remote documents and not convert those to local keys 
    /*
    getLocalKeyAndAddIt = (key) => {
        var localKey = this.getLocalKey(key);
        this.addUsedKey(localKey);
        return localKey;
    }
    */

    getKeyAndAddIt = (key) => {
        var nodeLabel = (key && key.label) ? key.label : undefined;
        var newKey;
        if (this.isRemoteNodeLabel(nodeLabel)) {
            newKey = this.getNodeKey(key);
        } else {
            newKey = this.getLocalKey(key);
        }
        this.addUsedKey(newKey);
        return newKey;
    }

    // NOTE: local keys have become problematic when trying to do things across more than 1
    //   graph document. We are encountering key collisions.  Therefore we will not convert
    //   the remote keys into local keys
    /*
    getLocalRelKeyAndAddIt = (relType, keyProperties) => {
        //var localKey = this.getLocalRelKey(relType, keyProperties);
        //this.addUsedKey(localKey);
        //return localKey;
    }
    */

    getRelKeyAndAddIt = (relType, keyProperties) => {
        var key = this.getRelKey(relType, keyProperties);
        this.addUsedKey(key);
        return key;
    }

    getNodeKey = (key) => {
        /* example key
        "label": "NodeView",
        "properties": [
            {
                "key": "key",
                "datatype": "STRING",
                "value": "b45e2d86-8774-4e66-af10-b850c089f0f3"
            }
        ]
        */
        var configKeyProperties = this.keyConfigMap[key.label];
        if (configKeyProperties) {
            var keyValues = key.properties
                .filter(keyPropertyItem => configKeyProperties.includes(keyPropertyItem.key))
                .map(keyPropertyItem => keyPropertyItem.value);
            return keyValues.join(this.INTERNAL_KEY_JOINER);
        } else if (typeof(key) === 'string') {
            return key;
        } else {
            var keyString = (key.label) ? key.label : key;
            throw new Error(`Can't find configKeyProperties for key: ${keyString}`);
        }
    }

    getLocalKey = (key) => {
        /* example key
        "label": "NodeView",
        "properties": [
            {
                "key": "key",
                "datatype": "STRING",
                "value": "b45e2d86-8774-4e66-af10-b850c089f0f3"
            }
        ]
        */
        var configKeyProperties = this.keyConfigMap[key.label];
        if (configKeyProperties) {
            var keyValues = key.properties
                .filter(keyPropertyItem => configKeyProperties.includes(keyPropertyItem.key))
                .map(keyPropertyItem => {
                    // fix key
                    var keyValue = keyPropertyItem.value;
                    var tokens = keyValue.split(new RegExp(this.ID_JOINER));
                    if (tokens && tokens.length > 1) {
                        return tokens[1];
                    } else {
                        return keyValue;
                    }
                })
            return keyValues.join(this.INTERNAL_KEY_JOINER);
        } else if (typeof(key) === 'string') {
            var tokens = key.split(new RegExp(this.ID_JOINER));
            if (tokens && tokens.length > 1) {
                return tokens[1];
            } else {
                return key;
            }
        } else {
            var keyString = (key.label) ? key.label : key;
            throw new Error(`Can't find configKeyProperties for key: ${keyString}`);
        }
    }

    getRelKey = (relType, keyProperties) => {
        /* example keyProperties
        [
            {
                "key": "key",
                "datatype": "STRING",
                "value": "b45e2d86-8774-4e66-af10-b850c089f0f3_Rel0"
            }
        ]
        */
        var configKeyProperties = this.relKeyConfigMap[relType];
        var keyPropertyValues = '';
        if (configKeyProperties && keyProperties) {
            var keyValues = keyProperties
                .filter(keyPropertyItem => configKeyProperties.includes(keyPropertyItem.key))
                .map(keyPropertyItem => keyPropertyItem.value);
            keyPropertyValues = keyValues.join(this.INTERNAL_KEY_JOINER);
        } else if (typeof(keyProperties) === 'string') {
            keyPropertyValues = keyProperties;
        } else {
            throw new Error(`Can't find configKeyProperties for type: ${relType}`);
        }
        return `${keyPropertyValues}`;
    }

    getLocalRelKey = (relType, keyProperties) => {
        /* example keyProperties
        [
            {
                "key": "key",
                "datatype": "STRING",
                "value": "b45e2d86-8774-4e66-af10-b850c089f0f3_Rel0"
            }
        ]
        */
        var configKeyProperties = this.relKeyConfigMap[relType];
        if (configKeyProperties && keyProperties) {
            var keyValues = keyProperties
                .filter(keyPropertyItem => configKeyProperties.includes(keyPropertyItem.key))
                .map(keyPropertyItem => {
                    // fix key
                    var keyValue = keyPropertyItem.value;
                    var tokens = keyValue.split(new RegExp(this.ID_JOINER));
                    if (tokens && tokens.length > 1) {
                        return tokens[1];
                    } else {
                        return keyValue;
                    }
                })
            return keyValues.join(this.INTERNAL_KEY_JOINER);
        } else if (typeof(keyProperties) === 'string') {
            var tokens = keyProperties.split(new RegExp(this.ID_JOINER));
            if (tokens && tokens.length > 1) {
                return tokens[1];
            } else {
                return keyProperties;
            }
        } else {
            throw new Error(`Can't find configKeyProperties for type: ${relType}`);
        }
    }

    getNewNodeKey = () => {
        return this.getNewKey(this.NEW_NODE_KEY_PREFIX);
    }

    getNewRelationshipKey = () => {
        return this.getNewKey(this.NEW_RELATIONSHIP_KEY_PREFIX);
    }

    getNewKey = (prefix) => {
        for (var i = this.KEY_START; i < this.KEY_MAX; i++) {
            var candidateKey = prefix + i;
            if (!this.usedKeys[candidateKey]) {
                this.usedKeys[candidateKey] = candidateKey;
                this.KEY_START = i;
                return candidateKey;
            }
        }
        throw new Error("Could not get new key, id search space has been exhausted.");
    }
}

