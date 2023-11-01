
export function getNodeLabels (dataModel) {
    return dataModel.getNodeLabelArray().map(x => x.label);
}

function getDataTypeMap (dataModel) {
    var dataTypeMap = {};
    Object.values(dataModel.DataTypes).map(dataType => {
        dataTypeMap[dataType.toLowerCase()] = dataType;
    });
    return dataTypeMap;
}

export function verifyNodeLabelProperties (dataModel, nodeLabelString, properties) {
    //console.log('nodeLabelString: ', nodeLabelString);
    //console.log('properties: ', properties);
    var dataTypeMap = getDataTypeMap(dataModel);
    var nodeLabel = dataModel.getNodeLabelByLabel(nodeLabelString);
    var nodeLabelProperties = Object.values(nodeLabel.properties);
    var keys = Object.keys(properties);
    expect(nodeLabelProperties.length).toBe(keys.length);

    keys.map(key => {
        var value = properties[key];
        var potentialDatatype = dataTypeMap[value.toLowerCase()];
        var modelProperty = nodeLabel.getPropertyByName(key);
        expect(modelProperty.name).toBe(key);
        if (potentialDatatype) {
            expect(modelProperty.datatype).toBe(potentialDatatype);
        } else {
            expect(modelProperty.referenceData).toBe(value);
        }
        //expect(modelProperty.isPartOfKey).toBe(property.isPartOfKey);
    })
}

export function verifyRelationshipTypeProperties (dataModel, relationshipType, properties) {
    var dataTypeMap = getDataTypeMap(dataModel);
    var relationshipTypeProperties = Object.values(relationshipType.properties);
    var keys = Object.keys(properties);
    expect(relationshipTypeProperties.length).toBe(keys.length);

    keys.map(key => {
        var value = properties[key];
        var potentialDatatype = dataTypeMap[value.toLowerCase()];
        var modelProperty = relationshipType.getPropertyByName(key);
        expect(modelProperty.name).toBe(key);
        if (potentialDatatype) {
            expect(modelProperty.datatype).toBe(potentialDatatype);
        } else {
            expect(modelProperty.referenceData).toBe(value);
        }
        //expect(modelProperty.isPartOfKey).toBe(property.isPartOfKey);
    })
}

export function verifyProperty (property, name, datatype, referenceData, isPartOfKey) {
    //console.log('property: ', property);
    expect(property.name).toBe(name);
    expect(property.datatype).toBe(datatype);
    expect(property.referenceData).toBe(referenceData);
    expect(property.isPartOfKey).toBe(isPartOfKey);
}
