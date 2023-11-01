CREATE CONSTRAINT FOR (n:DataModel) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:DataModelMetadata) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:NodeLabel) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:RelationshipType) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:PropertyDefinition) REQUIRE n.key IS UNIQUE;

CREATE CONSTRAINT FOR (n:Customer) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:Author) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:Tag) REQUIRE n.tag IS UNIQUE;
CREATE CONSTRAINT FOR (n:Industry) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT FOR (n:UseCase) REQUIRE n.name IS UNIQUE;

CREATE CONSTRAINT FOR (n:SecurityOrganization) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT FOR (n:EmailDomain) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT FOR (n:Tool) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT FOR (n:Feature) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT FOR (n:SoftwareEdition) REQUIRE n.name IS UNIQUE;

CREATE INDEX FOR (c:Customer) ON (c.name);
CREATE INDEX FOR (a:Author) ON (a.name);

CREATE CONSTRAINT FOR (n:User) REQUIRE n.email IS UNIQUE;
CREATE CONSTRAINT FOR (n:UserSettings) REQUIRE n.email IS UNIQUE;

CREATE CONSTRAINT FOR (n:DBConnection) REQUIRE n.id IS UNIQUE;

CREATE FULLTEXT INDEX dataModelMetadata FOR (n:DataModelMetadata|Tag|UseCase|Industry|Author|Customer)
ON EACH [n.title, n.description, n.name, n.tag];

CREATE CONSTRAINT FOR (n:GraphDoc) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT FOR (n:GraphDocMetadata) REQUIRE n.key IS UNIQUE;

CREATE FULLTEXT INDEX graphDocCypherSearch FOR (n:GraphDocMetadata|Tag|Customer|CypherBuilder|CypherStatement)
ON EACH [n.title, n.description, n.name, n.tag, n.cypherTitle, n.cypherStatementSearchText];
