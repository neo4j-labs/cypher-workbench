
export class Source {
    constructor (properties) {
        properties = properties || {};
    }
}

export class ColumnSource extends Source {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var {
            key,
            tableData,
            tableCatalog,
            tableDefinition,
            columnDefinition,
            columnIndex
        } = properties;

        this.key = key;
        this.tableData = tableData;
        this.tableCatalog = tableCatalog;
        this.tableDefinition = tableDefinition;
        this.columnDefinition = columnDefinition;
        this.columnIndex = columnIndex;
    }
}

export class Destination {
    constructor (properties) {
        properties = properties || {};
    }
}

export class GraphDestination extends Destination {
    constructor (properties) {
        super(properties);
        properties = properties || {};
        var {
            key,
            dataModel,
            // either nodePattern / nodeLabel will be populated
            nodePattern,
            nodeLabel,
            // -or- nodeRelNodePattern / relationshipType will be populated
            nodeRelNodePattern,
            relationshipType,
            propertyDefinition
        } = properties;

        this.key = key;
        this.dataModel = dataModel;
        this.nodePattern = nodePattern;
        this.nodeLabel = nodeLabel;
        this.nodeRelNodePattern = nodeRelNodePattern;
        this.relationshipType = relationshipType;
        this.propertyDefinition = propertyDefinition;
    }
}

export class DataMapping {
    constructor (properties) {
        properties = properties || {};
        var {
            key,
            source,
            destination
        } = properties;

        this.key = key;
        this.source = source;
        this.destination = destination;
    }
}
