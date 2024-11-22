
import { Neo4jVersion, Neo4jVersionValues } from './dataModel';
import { smartQuote } from './helper';

function getConstraintName (nodeLabel, property, prefix) {
    return `${prefix}_${nodeLabel.label.replace(/ /,'_')}_${property.name.replace(/ /,'_')}`.toLowerCase();
}

const validateOptions = (options) => {
    options = options || {};
    if (!options.neo4jVersion || !Neo4jVersionValues.has(options.neo4jVersion)) {
        options.neo4jVersion = Neo4jVersion.v5;
    }
    return options;
}

function getNodeKeyConstraint (nodeLabel, nodeKeyProperties, options) {
    options = validateOptions(options);
    //var constraintName = `nodeKey_${nodeLabel.label.replace(/ /,'_')}`.toLowerCase();
    var nodeKeyPropertiesString = nodeKeyProperties.map(x => 'n.' + smartQuote(x.name)).join(', ');
    //return `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT (${nodeKeyPropertiesString}) IS NODE KEY;\n`;

    let v5 = `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) REQUIRE (${nodeKeyPropertiesString}) IS NODE KEY;\n`;
    if (options.neo4jVersion === Neo4jVersion.v5 || options.neo4jVersion === Neo4jVersion.v4_4) {
        return v5;
    } else if (options.neo4jVersion === Neo4jVersion.v4_3) {
        return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT (${nodeKeyPropertiesString}) IS NODE KEY;\n`;
    } else {
        // default to 5 syntax
        return v5;
    }
}

function getUniqueConstraintStatement (nodeLabel, property, options) {
    options = validateOptions(options);
    //return `CREATE CONSTRAINT ${getConstraintName(nodeLabel,property,'unique')} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT n.${smartQuote(property.name)} IS UNIQUE;\n`    
    let v5 = `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) REQUIRE n.${smartQuote(property.name)} IS UNIQUE;\n`;
    if (options.neo4jVersion === Neo4jVersion.v5 || options.neo4jVersion === Neo4jVersion.v4_4) {
        return v5;
    } else if (options.neo4jVersion === Neo4jVersion.v4_3) {
        return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT n.${smartQuote(property.name)} IS UNIQUE;\n`    
    } else {
        // default to 5 syntax
        return v5;
    }
}

function getNodeLabelPropertyMustExistStatement (nodeLabel, property, options) {
    options = validateOptions(options);
    //return `CREATE CONSTRAINT ${getConstraintName(nodeLabel,property,'exist')} IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT exists(n.${smartQuote(property.name)});\n`
    let v5 = `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) REQUIRE n.${smartQuote(property.name)} IS NOT NULL;\n`;
    if (options.neo4jVersion === Neo4jVersion.v5 || options.neo4jVersion === Neo4jVersion.v4_4) {
        return v5;
    } else if (options.neo4jVersion === Neo4jVersion.v4_3) {
        return `CREATE CONSTRAINT IF NOT EXISTS ON (n:${smartQuote(nodeLabel.label)}) ASSERT n.${smartQuote(property.name)} IS NOT NULL;\n`
    } else {
        // default to 5 syntax
        return v5;
    }
}

function getNodeLabelIndexStatement (nodeLabel, property, options) {
    options = validateOptions(options);
    //return `CREATE INDEX ${getConstraintName(nodeLabel,property,'index')} IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (n.${smartQuote(property.name)});\n`;
    
    // syntax is the same for v5, v4_4, and v4_3
    return `CREATE INDEX IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (n.${smartQuote(property.name)});\n`;
}

function getCompositeIndexStatement (nodeLabel, indexDefinition, options) {
    options = validateOptions(options);

    var indexName = (indexDefinition.indexName) ? ` ${indexDefinition.indexName}` : '';
    var propertyNames = indexDefinition.propertyDefinitionKeys
        .map(key => nodeLabel.properties[key])
        .filter(propertyDefinition => propertyDefinition)
        .map(propertyDefinition => `n.${smartQuote(propertyDefinition.name)}`)
        .join(', ')

    // syntax is the same for v5, v4_4, and v4_3
    return `CREATE INDEX${indexName} IF NOT EXISTS FOR (n:${smartQuote(nodeLabel.label)}) ON (${propertyNames});\n`;
}

function getRelationshipTypePropertyMustExistStatement (relationshipType, property, options) {
    options = validateOptions(options);

    //var constraintName = `relationshipType_${relationshipType.type.replace(/ /,'_')}_${property.name.replace(/ /, '')}`.toLowerCase();
    //return `CREATE CONSTRAINT ${constraintName} IF NOT EXISTS ON ()-[r:${smartQuote(relationshipType.type)}]-() ASSERT exists(r.${smartQuote(property.name)});\n`;
    let v5 = `CREATE CONSTRAINT IF NOT EXISTS FOR ()-[r:${smartQuote(relationshipType.type)}]-() REQUIRE r.${smartQuote(property.name)} IS NOT NULL;\n`;
    if (options.neo4jVersion === Neo4jVersion.v5 || options.neo4jVersion === Neo4jVersion.v4_4) {
        return v5;
    } else if (options.neo4jVersion === Neo4jVersion.v4_3) {
        return `CREATE CONSTRAINT IF NOT EXISTS ON ()-[r:${smartQuote(relationshipType.type)}]-() ASSERT r.${smartQuote(property.name)} IS NOT NULL;\n`;
    } else {
        // default to 5 syntax
        return v5;
    }
}

export function getConstraintStatementsEx (nodeLabels, relationshipTypes, options) {
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
                nodeKeyConstraintsStatements.push(getNodeKeyConstraint(nodeLabel, nodeKeyProperties, options));
            }

            uniqueConstraintsStatements = uniqueConstraintsStatements.concat(Object.values(nodeLabel.properties)
                .filter(property => !property.isPartOfKey && property.hasUniqueConstraint)
                .map(property => getUniqueConstraintStatement(nodeLabel, property, options)));

            nodePropertyExistsStatements = nodePropertyExistsStatements.concat(Object.values(nodeLabel.properties)
                .filter(property => !property.isPartOfKey && property.mustExist)
                .map(property => getNodeLabelPropertyMustExistStatement(nodeLabel, property, options)));

            indexStatements = indexStatements.concat(Object.values(nodeLabel.properties)
                //.filter(property => !property.isPartOfKey && !property.hasUniqueConstraint && property.isIndexed)
                .filter(property => !property.isPartOfKey && !property.hasUniqueConstraint && property.isIndexed)
                .map(property => getNodeLabelIndexStatement(nodeLabel, property, options)));

            compositeIndexStatements = compositeIndexStatements.concat(nodeLabel.getIndexes()
                .map(indexDefinition => getCompositeIndexStatement(nodeLabel, indexDefinition, options)));
        }
    });

    Object.values(relationshipTypes).map(relationshipType => {
        if (relationshipType && relationshipType.properties) {
            relationshipPropertyExistsStatements = relationshipPropertyExistsStatements.concat(Object.values(relationshipType.properties)
                .filter(property => property.mustExist)
                .map(property => getRelationshipTypePropertyMustExistStatement(relationshipType, property, options)));
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
