// import DataModel as WorkbenchDataModel from "../dataModel"
import DataTypes from "../DataTypes"
import { 
    Type,    
    Constraint,
    DataImporterModel,
    DataModel,
    GraphMappingRepresentation,
    GraphSchema,
    GraphSchemaRepresentation,
    GraphSchemaExtensionsRepresentation,
    Index,
    NodeKeyProperty,
    NodeLabel,
    NodeLabelRef,
    NodeObjectType,
    NodeRef,
    NodeVisualisation,
    Position,
    Property,
    PropertyRef,
    RelationshipObjectType,
    RelationshipType,
    RelationshipTypeRef,
    Visualisation,
    RelationshipRef,
    DataSourceSchema
} from "./graphModel"

const ImporterVersions = {
    DataImporterModel: '2.3.0',
    DataModel: '2.3.0',
    GraphSchemaRepresentation: '1.0.0'
}

export const DataImporterDataTypes = {
    String: 'string',
    Integer: 'integer',
    Float: 'float',
    DateTime: 'datetime',
    Boolean: 'boolean'
}

export const IdPrefixes = {
    Property: 'p',
    NodeLabel: 'nl',
    RelationshipType: 'rt',
    NodeObject: 'n',
    RelationshipObject: 'r',
    Constraint: 'c',
    Index: 'i'
}

export const convertDataType = (dataType) : Type => {
    let returnType;
    switch (dataType) {
        case DataTypes.Boolean:
            returnType = DataImporterDataTypes.Boolean;
            break;
        case DataTypes.Integer:
            returnType = DataImporterDataTypes.Integer;
            break;
        case DataTypes.Float:
            returnType = DataImporterDataTypes.Float;
            break;
        case DataTypes.Date:
        case DataTypes.Time:
        case DataTypes.DateTime:
        case DataTypes.LocalTime:
        case DataTypes.LocalDateTime:
            returnType = DataImporterDataTypes.DateTime;
            break;
        default:
            returnType = DataImporterDataTypes.String;
    }
    return new Type(returnType);
}

export const workbenchDataModelToImporterGraphModel = (model, options = {}) : DataImporterModel => {

    // onlySetSinglePropertyNodeKeys = if set to true, this will ensure only nodes with a 
    //   single property marked as a node key will have their node keys set
    //   this will enable logic where composite keys are generated to not have to undo erroneously generated node keys
    const { onlySetSinglePropertyNodeKeys } = options;

    let idCounter = Object.values(IdPrefixes).reduce((map, prefix) => { map[prefix] = 0; return map; }, {});
    let getNextId = (idType) : string => {
        let nextId = idCounter[idType] + 1;
        idCounter[idType] = nextId;
        return `${idType}:${nextId}`
    }

    const sortByProperty = (property) => (a,b) => (a[property] === b[property]) ? 0 : (a[property] > b[property]) ? 1 : -1

    const getNodeLabels = (model) => {
        var nodeLabels = model.getNodeLabelArray().filter(x => !x.isOnlySecondaryNodeLabel);
        nodeLabels.sort(sortByProperty('label'));
        return nodeLabels;
    }

    const getRelationshipTypes = (model) => {
        var relationshipTypes = model.getRelationshipTypeArray();
        relationshipTypes = relationshipTypes.filter(relationshipType => {
            if (relationshipType.startNodeLabel.isOnlySecondaryNodeLabel ||
                relationshipType.endNodeLabel.isOnlySecondaryNodeLabel) {
                return false;
            } else {
                return true;
            }
        });
        relationshipTypes.sort(sortByProperty('type'));
        return relationshipTypes;
    }

    const checkIsNodeLabel = (nodeLabelOrRelationshipType) : boolean => 
        (nodeLabelOrRelationshipType.classType === 'NodeLabel');

    const checkIsRelationshipType = (nodeLabelOrRelationshipType) : boolean => 
        (nodeLabelOrRelationshipType.classType === 'RelationshipType');

    const getProperties = (nodeLabelOrRelationshipType) : Property[] => {
        let properties = nodeLabelOrRelationshipType.properties;

        var propertyDefinitionArray = Object.values(properties);
        if (propertyDefinitionArray.length === 0) {
            return [];
        }
        propertyDefinitionArray.sort(sortByProperty('name'));

        let returnProps = propertyDefinitionArray.map(nodeProperty => {
            let propMap = {
                id: getNextId(IdPrefixes.Property), 
                token: nodeProperty.name,
                type: convertDataType(nodeProperty.datatype),
                nullable: true,
                nodeKey: nodeProperty.isPartOfKey,
                uniqueConstraint: nodeProperty.hasUniqueConstraint
                // cw_onlyIndexed: prop.isIndexed && !(prop.isPartOfKey || prop.hasUniqueConstraint)
            }
            let prop = new Property(propMap);
            return prop;
        })
        return returnProps;
    }

    // right now it's 1-to-1 NodeLabel to NodeObjectType
    let nodeLabelIdToImporterNodeObjectMap = {};
    let importerNodeLabels = [];
    let importerNodeObjects = [];
    let importerNodeVisualisations = [];
    let constraints = [];
    let indexes = [];
    let allNodeKeyProperties = [];

    // needed in order to construct the NodeMappings for a GraphMappingRepresentation 
    //  key is the NodeLabel literal, but the value is the NodeRef 
    let nodeRefByLabelMap = {};  

    // needed in order to construct the PropertyMappings for a NodeMapping
    //  key is the NodeLabel literal, but the value is a map where the key is the prop token, and the value is the PropertyRef
    /* example:
    {
        Person: {
            name: personNameRef
        }
    }

    where personNameRef is a PropertyRef(personName.$id)
    and personName is Property({ id: 'p:1', token: 'name'})
    */
    let nodePropRefsByLabelMap = {};

    // these are the relationship equivalent of the above two types
    let relRefByTypeMap = {};  
    let relPropRefsByTypeMap = {};

    
    let nodeLabels = getNodeLabels(model);
    nodeLabels.forEach(nodeLabel => {
        let nodeProperties = getProperties(nodeLabel);

        // used as the value for nodePropRefsByLabelMap (see comments above loop)
        let propRefsByPropNameMap = {};
        nodeProperties.forEach(nodeProperty => {
            propRefsByPropNameMap[nodeProperty.token] = new PropertyRef(nodeProperty.$id);
        })

        let nodeKeyProperties = nodeProperties.filter(prop => prop.nodeKey);
        if (nodeKeyProperties.length === 0) {
            nodeKeyProperties = nodeProperties.filter(prop => prop.uniqueConstraint);
        }
        let nodeKey = null;
        if (onlySetSinglePropertyNodeKeys) {
            if (nodeKeyProperties.length === 1) {
                nodeKey = nodeKeyProperties[0];
            }
            // else { the nodeKeyProperty isn't set - because it will be handled outside of this function }
        } else {
            // [0] because data importer only allows a single property as its node key right now
            nodeKey = nodeKeyProperties[0];
        }

        let importerNodeLabel = new NodeLabel({
            id: getNextId(IdPrefixes.NodeLabel), 
            token: nodeLabel.label, 
            properties: nodeProperties
        });

        if (!onlySetSinglePropertyNodeKeys) {
            // since a node key wasn't defined, and we haven't been told not to make one, we pick the first property
            if (!nodeKey && nodeProperties.length > 0) {
                nodeKey = nodeProperties[0];
            }
        }

        if (nodeKey) {
            let constraint = new Constraint({
                id: getNextId(IdPrefixes.Constraint),
                name: `${nodeKey.token}_${nodeLabel.label}_uniq`,
                constraintType: 'uniqueness',
                entityType: 'node',
                nodeLabel: new NodeLabelRef(importerNodeLabel.$id),
                properties: [new PropertyRef(nodeKey.$id)]
            })            
            constraints.push(constraint);

            let index = new Index({
                id: getNextId(IdPrefixes.Index),
                name: `${nodeKey.token}_${nodeLabel.label}_uniq`,
                indexType: 'default',
                entityType: 'node',
                nodeLabel: new NodeLabelRef(importerNodeLabel.$id),
                properties: [new PropertyRef(nodeKey.$id)]
            })
            indexes.push(index);
        }
        let otherIndexes = nodeProperties.filter(prop => prop.cw_onlyIndexed);
        otherIndexes.forEach(prop => {
            let index = new Index({
                id: getNextId(IdPrefixes.Index),
                name: `${prop.token}_${nodeLabel.label}`,
                indexType: 'default',
                entityType: 'node',
                nodeLabel: new NodeLabelRef(importerNodeLabel.$id),
                properties: [new PropertyRef(prop.$id)]
            })
            indexes.push(index);
        })

        let importerNodeObject = new NodeObjectType({
            id: getNextId(IdPrefixes.NodeObject),
            labels: [new NodeLabelRef(importerNodeLabel.$id)]
        });        
        
        nodePropRefsByLabelMap[nodeLabel.label] = propRefsByPropNameMap;
        nodeRefByLabelMap[nodeLabel.label] = new NodeRef(importerNodeObject.$id);

        if (nodeKey) {
            let nodeKeyProperty = new NodeKeyProperty({
                node: new NodeRef(importerNodeObject.$id),
                keyProperty: new PropertyRef(nodeKey.$id)
            })
            allNodeKeyProperties.push(nodeKeyProperty);
        }

        let importerNodeVisualisation = new NodeVisualisation({
            id: importerNodeObject.$id,
            position: new Position(nodeLabel.display.x, nodeLabel.display.y)
        })

        nodeLabelIdToImporterNodeObjectMap[nodeLabel.key] = importerNodeObject.$id;

        importerNodeLabels.push(importerNodeLabel);
        importerNodeObjects.push(importerNodeObject);
        importerNodeVisualisations.push(importerNodeVisualisation);

        // TODO: secondaryNodeLabelKeys
    });

    // right now it's 1-to-1 RelationshipType to RelationshipObjectType
    let importerRelationshipTypes = [];
    let importerRelationshipObjects = [];

    let relationshipTypes = getRelationshipTypes(model);
    relationshipTypes.forEach(relationshipType => {
        let relProperties = getProperties(relationshipType);

        // used as the value for nodePropRefsByLabelMap (see comments above loop)
        let propRefsByPropNameMap = {};
        relProperties.forEach(relProperty => {
            propRefsByPropNameMap[relProperty.token] = new PropertyRef(relProperty.$id);
        })

        let importerRelationshipType = new RelationshipType({
            id: getNextId(IdPrefixes.RelationshipType),
            token: relationshipType.type,
            properties: relProperties
        });

        let fromId = nodeLabelIdToImporterNodeObjectMap[relationshipType.startNodeLabel.key];
        let toId = nodeLabelIdToImporterNodeObjectMap[relationshipType.endNodeLabel.key];
        let importerRelationshipObject = new RelationshipObjectType({
            id: getNextId(IdPrefixes.RelationshipObject),
            type: new RelationshipTypeRef(importerRelationshipType.$id),
            from: new NodeRef(fromId),
            to: new NodeRef(toId)
        });

        importerRelationshipTypes.push(importerRelationshipType);
        importerRelationshipObjects.push(importerRelationshipObject);

        // the keys here need to be startLabel_type_endLabel
        let mapTypeKey = `${relationshipType.startNodeLabel.label}_${relationshipType.type}_${relationshipType.endNodeLabel.label}`;
        relPropRefsByTypeMap[mapTypeKey] = propRefsByPropNameMap;
        relRefByTypeMap[mapTypeKey] = new RelationshipRef(importerRelationshipObject.$id);

    })

    let graphSchema = new GraphSchema({
        nodeLabels: importerNodeLabels,
        relationshipTypes: importerRelationshipTypes,
        nodeObjectTypes: importerNodeObjects,
        relationshipObjectTypes: importerRelationshipObjects,
        constraints: constraints,
        indexes: indexes
    })

    let graphSchemaRepresentation = new GraphSchemaRepresentation({
        version: ImporterVersions.GraphSchemaRepresentation,
        graphSchema: graphSchema
    })

    let graphSchemaExtensionsRepresentation = new GraphSchemaExtensionsRepresentation({
        nodeKeyProperties: allNodeKeyProperties
    })

    let dataModel = new DataModel({
        version: ImporterVersions.DataModel,
        graphSchemaRepresentation: graphSchemaRepresentation,
        graphSchemaExtensionsRepresentation: graphSchemaExtensionsRepresentation,
        graphMappingRepresentation: new GraphMappingRepresentation({
            dataSourceSchema: new DataSourceSchema({
                type: null,
                tableSchemas: []
            })
        })
    });

    let visualisation = new Visualisation({
        nodes: importerNodeVisualisations
    });

    // full importer definition
    let dataImporterModel = new DataImporterModel({
        version: ImporterVersions.DataImporterModel,
        visualisation: visualisation,
        dataModel: dataModel
    });

    return {
        dataImporterModel,
        helperObjects: {
            nodeRefByLabelMap,
            nodePropRefsByLabelMap,
            relRefByTypeMap,
            relPropRefsByTypeMap
        }
    };
}