
import { smartQuote } from './helper';

function getConstraintName (nodeLabel, property, prefix) {
    return `${prefix}_${nodeLabel.label.replace(/ /,'_')}_${property.name.replace(/ /,'_')}`.toLowerCase();
}

function getNodeKeyConstraint (nodeLabel, nodeKeyProperties) {
    //var constraintName = `nodeKey_${nodeLabel.label.replace(/ /,'_')}`.toLowerCase();
    var nodeKeyPropertiesString = nodeKeyProperties.map(x => 'n.' + smartQuote(x.name)).join(', ');
    //return `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT (${nodeKeyPropertiesString}) IS NODE KEY;\n`;
    return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT (${nodeKeyPropertiesString}) IS NODE KEY;\n`;
}

function getUniqueConstraintStatement (nodeLabel, property) {
    //return `CREATE CONSTRAINT ${getConstraintName(nodeLabel,property,'unique')} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT n.${smartQuote(property.name)} IS UNIQUE;\n`    
    return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT n.${smartQuote(property.name)} IS UNIQUE;\n`    
}

function getNodeLabelMustExistStatement (nodeLabel, property) {
    //return `CREATE CONSTRAINT ${getConstraintName(nodeLabel,property,'exist')} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT exists(n.${smartQuote(property.name)});\n`
    return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT exists(n.${smartQuote(property.name)});\n`
}

function getNodeLabelIndexStatement (nodeLabel, property) {
    //return `CREATE INDEX ${getConstraintName(nodeLabel,property,'index')} IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (n.${smartQuote(property.name)});\n`;
    return `CREATE INDEX IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (n.${smartQuote(property.name)});\n`;
}

function getCompositeIndexStatement (nodeLabel, indexDefinition) {
    var indexName = (indexDefinition.indexName) ? ` ${indexDefinition.indexName}` : '';
    var propertyNames = indexDefinition.propertyDefinitionKeys
        .map(key => nodeLabel.properties[key])
        .filter(propertyDefinition => propertyDefinition)
        .map(propertyDefinition => `n.${smartQuote(propertyDefinition.name)}`)
        .join(', ')
    
    return `CREATE INDEX${indexName} IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (${propertyNames});\n`;
}

function getRelationshipTypeIndexStatement (relationshipType, property) {
    //var constraintName = `relationshipType_${relationshipType.type.replace(/ /,'_')}_${property.name.replace(/ /, '')}`.toLowerCase();
    //return `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS ON ()-[r:${smartQuote(relationshipType.type)}]-() ASSERT exists(r.${smartQuote(property.name)});\n`;
    return `CREATE CONSTRAINT IF NOT EXISTS ON ()-[r:${smartQuote(relationshipType.type)}]-() ASSERT exists(r.${smartQuote(property.name)});\n`;
}

export function getConstraintStatementsEx (nodeLabels, relationshipTypes) {
    var nodeKeyConstraintsStatements = [];
    var uniqueConstraintsStatements = [];
    var nodePropertyExistsStatements = [];
    var relationshipPropertyExistsStatements = [];
    var indexStatements = [];
    var compositeIndexStatements = [];

    Object.values(nodeLabels).map(nodeLabel => {
        if (nodeLabel && nodeLabel.properties) {
            var nodeKeyProperties = Object.values(nodeLabel.properties).filter(property => property.isPartOfKey);
            if (nodeKeyProperties.length >= 1) {
                nodeKeyConstraintsStatements.push(getNodeKeyConstraint(nodeLabel, nodeKeyProperties));
            }

            uniqueConstraintsStatements = uniqueConstraintsStatements.concat(Object.values(nodeLabel.properties)
                .filter(property => !property.isPartOfKey && property.hasUniqueConstraint)
                .map(property => getUniqueConstraintStatement(nodeLabel, property)));

            nodePropertyExistsStatements = nodePropertyExistsStatements.concat(Object.values(nodeLabel.properties)
                .filter(property => !property.isPartOfKey && property.mustExist)
                .map(property => getNodeLabelMustExistStatement(nodeLabel, property)));

            indexStatements = indexStatements.concat(Object.values(nodeLabel.properties)
                //.filter(property => !property.isPartOfKey && !property.hasUniqueConstraint && property.isIndexed)
                .filter(property => !property.isPartOfKey && !property.hasUniqueConstraint && property.isIndexed)
                .map(property => getNodeLabelIndexStatement(nodeLabel, property)));

            compositeIndexStatements = compositeIndexStatements.concat(nodeLabel.getIndexes()
                .map(indexDefinition => getCompositeIndexStatement(nodeLabel, indexDefinition)));
        }
    });

    Object.values(relationshipTypes).map(relationshipType => {
        if (relationshipType && relationshipType.properties) {
            relationshipPropertyExistsStatements = relationshipPropertyExistsStatements.concat(Object.values(relationshipType.properties)
                .filter(property => property.mustExist)
                .map(property => getRelationshipTypeIndexStatement(relationshipType, property)));
        }
    });
    nodeKeyConstraintsStatements = (nodeKeyConstraintsStatements.length > 0) ? "// Node Keys\n" + [...new Set(nodeKeyConstraintsStatements)].join('') : '';
    uniqueConstraintsStatements = (uniqueConstraintsStatements.length > 0) ? "// Unique Constraints\n" + [...new Set(uniqueConstraintsStatements)].join('') : '';
    nodePropertyExistsStatements = (nodePropertyExistsStatements.length > 0) ? "// Node Properties Must Exist\n" + [...new Set(nodePropertyExistsStatements)].join('') : '';
    relationshipPropertyExistsStatements = (relationshipPropertyExistsStatements.length > 0) ? "// Relationship Properties Must Exist\n" + [...new Set(relationshipPropertyExistsStatements)].join('') : '';
    indexStatements = (indexStatements.length > 0) ? "// Indexes\n" + [...new Set(indexStatements)].join('') : '';
    compositeIndexStatements = (compositeIndexStatements.length > 0) ? "// Composite Indexes\n" + [...new Set(compositeIndexStatements)].join('') : '';

    var constraints = [nodeKeyConstraintsStatements, uniqueConstraintsStatements, nodePropertyExistsStatements, 
                                    relationshipPropertyExistsStatements, indexStatements, compositeIndexStatements]
                        .filter(s => s.length > 0) // if s = [] it will be filtered out
                        .join('\n');
    constraints = (constraints) ? constraints : '// No Constraints';
    return constraints;
}
