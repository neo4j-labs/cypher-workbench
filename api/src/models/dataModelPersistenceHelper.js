
// functions copied from ui GraphQLPersistence.js
export function getFullModelObject (modelInfo, dataModelSaveObject, dataModel) {
    return {
        key: modelInfo.key,
        isInstanceModel: dataModel.isInstanceModel(),
        excludeValidationSections: dataModel.excludeValidationSections,
        //relationshipIdCounter: dataModelSaveObject.relationshipIdCounter,
        upsertNodeLabels: getUpsertNodeLabels(modelInfo.key, Object.values(dataModelSaveObject.nodeLabels), dataModel),
        upsertRelationshipTypes: getUpsertRelationshipTypes(modelInfo.key, Object.values(dataModelSaveObject.relationshipTypes), dataModel)
    }
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

function getRemoteKey (modelKey, objectKey, dataModel) {
    //console.log("getRemoteKey");
    //console.log(modelKey);
    //console.log(objectKey);
    //console.log(dataModel.ID_JOINER);
    return (objectKey.match(dataModel.ID_JOINER)) ? objectKey : modelKey + dataModel.ID_JOINER + objectKey;
}

export function getMetadata (dataModelMetadata) {
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

    // use previous state to setup upsertTags / removeTags, etc
    computeUpsertRemove(metadata, dataModelMetadata, {}, { arrayTagName: 'tags', arrayEntryPropName: 'key'});
    // computeUpsertRemove(metadata, dataModelMetadata, previousState, { arrayTagName: 'authors', arrayEntryPropName: 'key'});
    // computeUpsertRemove(metadata, dataModelMetadata, previousState, { arrayTagName: 'customers', arrayEntryPropName: 'key'});

    return metadata;
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
