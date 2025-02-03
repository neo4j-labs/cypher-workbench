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
    Visualisation
} from "./graphModel"

const ImporterVersions = {
    DataImporterModel: '2.3.0',
    DataModel: '2.3.0',
    GraphSchemaRepresentation: '1.0.0'
}

const DataImporterDataTypes = {
    String: 'string',
    Integer: 'integer',
    Float: 'float',
    DateTime: 'datetime',
    Boolean: 'boolean'
}

const IdPrefixes = {
    Property: 'p',
    NodeLabel: 'nl',
    RelationshipType: 'rt',
    NodeObject: 'n',
    RelationshipObject: 'r',
    Constraint: 'c',
    Index: 'i'
}

export const workbenchDataModelToImporterGraphModel = (model) : DataImporterModel => {

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

    const convertDataType = (dataType) : Type => {
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

    const getProperties = (nodeLabelOrRelationshipType) : Property[] => {
        let properties = nodeLabelOrRelationshipType.properties;

        var propertyDefinitionArray = Object.values(properties);
        if (propertyDefinitionArray.length === 0) {
            return [];
        }
        propertyDefinitionArray.sort(sortByProperty('name'));

        return propertyDefinitionArray.map(prop => 
            new Property({
                id: getNextId(IdPrefixes.Property), 
                token: prop.name,
                type: convertDataType(prop.datatype),
                nullable: true,
                cw_primaryKey: prop.isPartOfKey || prop.hasUniqueConstraint,
                cw_onlyIndexed: prop.isIndexed && !(prop.isPartOfKey || prop.hasUniqueConstraint)
            })
        )
    }

    // right now it's 1-to-1 NodeLabel to NodeObjectType
    let nodeLabelIdToImporterNodeObjectMap = {};
    let importerNodeLabels = [];
    let importerNodeObjects = [];
    let importerNodeVisualisations = [];
    let constraints = [];
    let indexes = [];
    let nodeKeyProperties = [];

    let nodeLabels = getNodeLabels(model);
    nodeLabels.forEach(nodeLabel => {
        let nodeProperties = getProperties(nodeLabel);

        // [0] it looks like data importer only allows a single property as its node key right now
        let primaryKey = nodeProperties.filter(prop => prop.cw_primaryKey)[0];
        let importerNodeLabel = new NodeLabel({
            id: getNextId(IdPrefixes.NodeLabel), 
            token: nodeLabel.label, 
            properties: nodeProperties
        });
        if (!primaryKey && nodeProperties.length > 0) {
            // pick the first property
            primaryKey = nodeProperties[0];
        }

        if (primaryKey) {
            let constraint = new Constraint({
                id: getNextId(IdPrefixes.Constraint),
                name: `${primaryKey.token}_${nodeLabel.label}_uniq`,
                constraintType: 'uniqueness',
                entityType: 'node',
                nodeLabel: new NodeLabelRef(importerNodeLabel.$id),
                properties: [new PropertyRef(primaryKey.$id)]
            })            
            constraints.push(constraint);

            let index = new Index({
                id: getNextId(IdPrefixes.Index),
                name: `${primaryKey.token}_${nodeLabel.label}_uniq`,
                indexType: 'default',
                entityType: 'node',
                nodeLabel: new NodeLabelRef(importerNodeLabel.$id),
                properties: [new PropertyRef(primaryKey.$id)]
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

        if (primaryKey) {
            let nodeKeyProperty = new NodeKeyProperty({
                node: new NodeRef(importerNodeObject.$id),
                keyProperty: new PropertyRef(primaryKey.$id)
            })
            nodeKeyProperties.push(nodeKeyProperty);
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
        let importerRelationshipType = new RelationshipType({
            id: getNextId(IdPrefixes.RelationshipType),
            token: relationshipType.type
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
        nodeKeyProperties: nodeKeyProperties
    })

    let dataModel = new DataModel({
        version: ImporterVersions.DataModel,
        graphSchemaRepresentation: graphSchemaRepresentation,
        graphSchemaExtensionsRepresentation: graphSchemaExtensionsRepresentation,
        graphMappingRepresentation: new GraphMappingRepresentation()
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

    return dataImporterModel;
}