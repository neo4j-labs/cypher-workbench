CREATE CONSTRAINT ON (n:DataModel) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:DataModelMetadata) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:NodeLabel) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:RelationshipType) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:PropertyDefinition) ASSERT n.key IS UNIQUE;

CREATE CONSTRAINT ON (n:Customer) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:Author) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:Tag) ASSERT n.tag IS UNIQUE;
CREATE CONSTRAINT ON (n:Industry) ASSERT n.name IS UNIQUE;
CREATE CONSTRAINT ON (n:UseCase) ASSERT n.name IS UNIQUE;

CREATE CONSTRAINT ON (n:SecurityOrganization) ASSERT n.name IS UNIQUE;
CREATE CONSTRAINT ON (n:EmailDomain) ASSERT n.name IS UNIQUE;
CREATE CONSTRAINT ON (n:Tool) ASSERT n.name IS UNIQUE;
CREATE CONSTRAINT ON (n:Feature) ASSERT n.name IS UNIQUE;
CREATE CONSTRAINT ON (n:SoftwareEdition) ASSERT n.name IS UNIQUE;

CREATE INDEX ON :Customer(name);
CREATE INDEX ON :Author(name);

CREATE CONSTRAINT ON (n:User) ASSERT n.email IS UNIQUE;
CREATE CONSTRAINT ON (n:UserSettings) ASSERT n.email IS UNIQUE;

CREATE CONSTRAINT ON (n:DBConnection) ASSERT n.id IS UNIQUE;

// CALL db.index.fulltext.createNodeIndex("dataModelMetadata",
//     ["DataModelMetadata","Tag","UseCase","Industry","Author","Customer"],["title", "description","name","tag"]);
CREATE FULLTEXT INDEX dataModelMetadata FOR (n:DataModelMetadata|Tag|UseCase|Industry|Author|Customer)
ON EACH [n.title, n.description, n.name, n.tag];


CREATE CONSTRAINT ON (n:GraphDoc) ASSERT n.key IS UNIQUE;
CREATE CONSTRAINT ON (n:GraphDocMetadata) ASSERT n.key IS UNIQUE;

// CALL db.index.fulltext.createNodeIndex("graphDocCypherSearch",
//     ["GraphDocMetadata","Tag","Customer","CypherBuilder","CypherStatement"],["title", "description", "name", "tag", "cypherTitle", "cypherStatementSearchText"]);
CREATE FULLTEXT INDEX graphDocCypherSearch FOR (n:GraphDocMetadata|Tag|Customer|CypherBuilder|CypherStatement)
ON EACH [n.title, n.description, n.name, n.tag, n.cypherTitle, n.cypherStatementSearchText];
