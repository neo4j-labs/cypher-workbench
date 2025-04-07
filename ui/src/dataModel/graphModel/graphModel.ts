
// this is to represent the JSON data model format that data importer uses

const getPrimaryKeyProperties = (nodeLabel : NodeLabel) : Property[] => {
    if (nodeLabel && nodeLabel.properties) {
        return nodeLabel.properties.filter(prop => prop.nodeKey === true)
    } else {
        return [];
    }
}

export const generateConstraints = (nodeLabels: NodeLabel[]) : Constraint[] => {
    return nodeLabels.map((nodeLabel, i) => {

        let keyProps = getPrimaryKeyProperties(nodeLabel);
        let keyPropStr = keyProps.map(x => x.token).join('_');

        return new Constraint({
            id: `c:${i+1}`,
            name: `${keyPropStr}_${nodeLabel.token}_uniq`,
            constraintType: 'uniqueness',
            entityType: 'node',
            nodeLabel: new NodeLabelRef(nodeLabel.$id),
            properties: keyProps.map(prop => new PropertyRef(prop.$id))
        })
    })
}

export const generateIndexes = (nodeLabels: NodeLabel[]) : Index[] => {
    return nodeLabels.map((nodeLabel, i) => {

        let keyProps = getPrimaryKeyProperties(nodeLabel);
        let keyPropStr = keyProps.map(x => x.token).join('_');

        return new Index({
            id: `i:${i+1}`,
            name: `${keyPropStr}_${nodeLabel.token}_uniq`,
            indexType: 'default',
            entityType: 'node',
            nodeLabel: new NodeLabelRef(nodeLabel.$id),
            properties: keyProps.map(prop => new PropertyRef(prop.$id))
        })
    })
}

export const generateKey = (nodeObject : NodeObjectType, nodeLabels : NodeLabel[]) : NodeKeyProperty => {

    // NodeKeyProperty only lets you pick 1 key property, 
    //  so we'll take the first NodeLabel
    //  and the first key property
    // console.log('generateKey nodeObject: ', nodeObject);

    let nodeLabel = nodeObject.labels.map(nodeLabelRef => 
        nodeLabels.find(nodeLabel => nodeLabelRef.getRefId() === nodeLabel.$id)
    )[0];
    // console.log('nodeLabel: ', nodeLabel);

    let keyProps = getPrimaryKeyProperties(nodeLabel);
    if (keyProps.length > 0) {
        return new NodeKeyProperty({
            node: new NodeRef(nodeObject.$id),
            keyProperty: new PropertyRef(keyProps[0].$id)
        })
    } else {
        return null;
    }
}

export class Ref {
    public $ref : string;

    constructor (id) {
        this.$ref = `#${id}`;
    }

    getRefId = () => this.$ref.substring(1);
}

export class NodeLabelRef extends Ref { }
export class NodeRef extends Ref { }
export class RelationshipTypeRef extends Ref { }
export class RelationshipRef extends Ref { }
export class PropertyRef extends Ref { }

export class Type {
    public type : string;

    constructor(type : string) {
        this.type = type;
    }
}

export class Position {
    public x : number;
    public y : number;

    constructor(x : number, y : number) {
        this.x = x;
        this.y = y;
    }
}

export class NodeVisualisation {
    public id : string;
    public position : Position;

    constructor(properties = {}) {
        const {
            id,
            position
        } = properties;
        this.id = id;
        this.position = position;
    }
}

export class Visualisation {
    public nodes : NodeVisualisation[];

    constructor(properties = {}) {
        const {
            nodes
        } = properties;
        this.nodes = nodes;
    }
}

export class NodeKeyProperty {
    public node : NodeRef;
    public keyProperty: PropertyRef;

    constructor(properties = {}) {
        const {
            node,
            keyProperty
        } = properties;
        this.node = node;
        this.keyProperty = keyProperty;
    }
}

export class Property {
    public $id : string;
    public token : string;
    public type: Type;
    public nullable: boolean;
    public nodeKey: boolean;
    public uniqueConstraint: boolean;

    constructor(properties = {}) {
        const {
            id,
            token,
            type,
            nullable,
            nodeKey,
            uniqueConstraint
        } = properties;
        this.$id = id;
        this.token = token;
        this.type = type;
        this.nullable = nullable;
        this.nodeKey = nodeKey;
        this.uniqueConstraint = uniqueConstraint;
    }     
}

export class NodeLabel {
    public $id : string;
    public token : string;
    public properties : Property[];

    constructor(propertiesArg = {}) {
        const {
            id,
            token,
            properties
        } = propertiesArg;
        this.$id = id;
        this.token = token;
        this.properties = properties;
    }     
}

export class RelationshipType {
    public $id : string;
    public token : string;
    public properties: Property[] = [];

    constructor(propertiesArg = {}) {
        const {
            id,
            token,
            properties
        } = propertiesArg;
        this.$id = id;
        this.token = token;
        this.properties = properties ? properties : this.properties;
    }     
}

export class NodeObjectType {
    public $id : string;
    public labels : NodeLabelRef[];  

    constructor(properties = {}) {
        const {
            id,
            labels
        } = properties;
        this.$id = id;
        this.labels = labels;
    }     
}

export class RelationshipObjectType {
    public $id : string;
    public type : RelationshipTypeRef;  
    public from : NodeLabelRef;
    public to : NodeLabelRef;

    constructor(properties = {}) {
        const {
            id,
            type,
            from,
            to
        } = properties;
        this.$id = id;
        this.type = type;
        this.from = from;
        this.to = to;
    }     
}

export class Constraint {
    public $id : string;
    public name : string;
    public constraintType : string;
    public entityType : string;
    public nodeLabel : NodeLabelRef;
    public properties : PropertyRef[];

    constructor(propertiesArg = {}) {
        const {
            id,
            name,
            constraintType,
            entityType,
            nodeLabel,
            properties
        } = propertiesArg;
        this.$id = id;
        this.name = name;
        this.constraintType = constraintType;
        this.entityType = entityType;
        this.nodeLabel = nodeLabel;
        this.properties = properties;
    }        
}

export class Index {
    public $id : string;
    public name : string;
    public indexType : string;
    public entityType : string;
    public nodeLabel : NodeLabelRef;
    public properties : PropertyRef[];

    constructor(propertiesArg = {}) {
        const {
            id,
            name,
            indexType,
            entityType,
            nodeLabel,
            properties
        } = propertiesArg;
        this.$id = id;
        this.name = name;
        this.indexType = indexType;
        this.entityType = entityType;
        this.nodeLabel = nodeLabel;
        this.properties = properties;
    }    
}

export class GraphSchema {
    public nodeLabels : NodeLabel[];
    public relationshipTypes : RelationshipType[];
    public nodeObjectTypes : NodeObjectType[];
    public relationshipObjectTypes : RelationshipObjectType[];
    public constraints : Constraint[];
    public indexes : Index[];

    constructor(properties = {}) {
        const {
            nodeLabels,
            relationshipTypes,
            nodeObjectTypes,
            relationshipObjectTypes,
            constraints,
            indexes
        } = properties;
        this.nodeLabels = nodeLabels;
        this.relationshipTypes = relationshipTypes;
        this.nodeObjectTypes = nodeObjectTypes;
        this.relationshipObjectTypes = relationshipObjectTypes;
        this.constraints = constraints;
        this.indexes = indexes;
    }    
}

export class GraphSchemaRepresentation {
    public version : string;
    public graphSchema : GraphSchema;

    constructor(properties = {}) {
        const {
            version,
            graphSchema
        } = properties;
        this.version = version;
        this.graphSchema = graphSchema;
    }
}

export class GraphSchemaExtensionsRepresentation {
    public nodeKeyProperties : NodeKeyProperty[];

    constructor(properties = {}) {
        const {
            nodeKeyProperties
        } = properties;
        this.nodeKeyProperties = nodeKeyProperties;
    }
}

export class TableSchemaField {
    public name : string;
    public sample: string;
    public recommendedType: Type;

    constructor(properties = {}) {
        const {
            name,
            sample, 
            recommendedType
        } = properties;

        this.name = name;
        this.sample = sample;
        this.recommendedType = recommendedType;
    }
}

export class TableSchema {
    public name : string;
    public expanded: boolean;
    public fields: TableSchemaField[] = [];

    constructor(properties = {}) {
        const {
            name,
            expanded,
            fields
        } = properties;

        this.name = name;
        this.expanded = expanded;
        this.fields = fields;
    }
}

export class DataSourceSchema {
    public type : string;
    public tableSchemas : TableSchema[] = [];

    constructor(properties = {}) {
        const {
            type,
            tableSchemas
        } = properties;
        this.type = type;
        this.tableSchemas = tableSchemas;
    }
}

export class PropertyMapping {
    public fieldName : string;
    public property: PropertyRef;

    constructor(properties = {}) {
        const {
            fieldName,
            property
        } = properties;
        this.fieldName = fieldName;
        this.property = property;
    }    
}

export class NodeMapping {
    public node : NodeRef;
    public tableName : string;
    public propertyMappings : PropertyMapping[] = [];

    constructor(properties = {}) {
        const {
            node,
            tableName,
            propertyMappings
        } = properties;

        this.node = node;
        this.tableName = tableName;
        this.propertyMappings = propertyMappings;
    }        
}

export class RelationshipEndpointField {
    public fieldName : string;

    constructor (properties = {}) {
        const {
            fieldName
        } = properties;

        this.fieldName = fieldName;
    }
}

export class RelationshipMapping {
    public relationship : RelationshipRef;
    public tableName : string;
    public propertyMappings : PropertyMapping[] = [];
    public fromMapping : RelationshipEndpointField;
    public toMapping : RelationshipEndpointField;

    constructor(properties = {}) {
        const {
            relationship,
            tableName,
            propertyMappings,
            fromMapping,
            toMapping
        } = properties;
        this.relationship = relationship;
        this.tableName = tableName;
        this.propertyMappings = propertyMappings;
        this.fromMapping = fromMapping;
        this.toMapping = toMapping;
    }            
}

export class GraphMappingRepresentation {

    public dataSourceSchema : DataSourceSchema;
    public nodeMappings : NodeMapping[] = [];
    public relationshipMappings : RelationshipMapping[] = [];

    constructor(properties = {}) {
        const {
            dataSourceSchema, 
            nodeMappings,
            relationshipMappings
        } = properties;    
    
        this.dataSourceSchema = dataSourceSchema ? dataSourceSchema : this.dataSourceSchema;
        this.nodeMappings = nodeMappings ? nodeMappings : this.nodeMappings;
        this.relationshipMappings = relationshipMappings ? relationshipMappings : this.relationshipMappings;
    }
}

export class DataModel {
    public version : string;
    public graphSchemaRepresentation : GraphSchemaRepresentation;
    public graphSchemaExtensionsRepresentation : GraphSchemaExtensionsRepresentation;
    public graphMappingRepresentation : GraphMappingRepresentation;
    public configurations = {
        idsToIgnore: []
    }

    constructor(properties = {}) {
        const {
            version, 
            graphSchemaRepresentation,
            graphSchemaExtensionsRepresentation, 
            graphMappingRepresentation,
            configurations
        } = properties;
        this.version = version;
        this.graphSchemaRepresentation = graphSchemaRepresentation;
        this.graphSchemaExtensionsRepresentation = graphSchemaExtensionsRepresentation;
        this.graphMappingRepresentation = graphMappingRepresentation;
        this.configurations = configurations ? configurations : this.configurations;
    }

}

export class DataImporterModel {
    public version : string;
    public visualisation : Visualisation;
    public dataModel : DataModel;

    constructor(properties = {}) {
        const {
            version, visualisation, dataModel
        } = properties; 
        this.version = version;
        this.visualisation = visualisation;
        this.dataModel = dataModel;
    }

}