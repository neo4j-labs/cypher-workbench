
// ***********
// Indexes 4.4
// ***********
// Create a single-property index on nodes (Deprecated)
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// Create a single-property index on relationships (Deprecated)
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// Create a composite index on nodes (Deprecated)
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName_1,
    n.propertyName_2,
    ...
    n.propertyName_n)
[OPTIONS "{" option: value[, ...] "}"]

// Create a composite index on relationships Deprecated
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName_1,
    r.propertyName_2,
    ...
    r.propertyName_n)
[OPTIONS "{" option: value[, ...] "}"]

// Create a node label lookup index
CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR (n)
ON EACH labels(n)
[OPTIONS "{" option: value[, ...] "}"]

// Create a relationship type lookup index
CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r"]"-()
ON [EACH] type(r)
[OPTIONS "{" option: value[, ...] "}"]

// Create a text index on nodes
CREATE TEXT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// Create a text index on relationships
CREATE TEXT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// full-text index
CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName["|" ...])
ON EACH "[" n.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME["|" ...]"]"-()
ON EACH "[" r.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

// ***************
// Constraints 4.4
// ***************

// Create a unique node property constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE n.propertyName IS UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE (n.propertyName_1, ..., n.propertyName_n) IS UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

// Create a node property existence constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE n.propertyName IS NOT NULL
[OPTIONS "{" "}"]

// Create a relationship property existence constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR ()-"["r:RELATIONSHIP_TYPE"]"-()
REQUIRE r.propertyName IS NOT NULL
[OPTIONS "{" "}"]

// Create a node key constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE n.propertyName IS NODE KEY
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE (n.propertyName_1, ..., n.propertyName_n) IS NODE KEY
[OPTIONS "{" option: value[, ...] "}"]

// ***********
// Indexes 4.3
// ***********

// single property index for nodes
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// single property index for relationships
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// composite property index for nodes
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName_1,
    n.propertyName_2,
    …
    n.propertyName_n)
[OPTIONS "{" option: value[, ...] "}"]

// composite property index for relationships
CREATE [BTREE] INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName_1,
    r.propertyName_2,
    …
    r.propertyName_n)
[OPTIONS "{" option: value[, ...] "}"]

// token lookup index
CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR (n)
ON EACH labels(n)

CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r"]"-()
ON [EACH] type(r)

// full-text
CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName["|" ...])
ON EACH "[" n.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME["|" ...]"]"-()
ON EACH "[" r.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

// ***************
// Constraints 4.3
// ***************

// Create a unique node property constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
ON (n:LabelName)
ASSERT n.propertyName IS UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

// Create a node property existence constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
ON (n:LabelName)
ASSERT n.propertyName IS NOT NULL

// Create a relationship property existence constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
ON ()-"["R:RELATIONSHIP_TYPE"]"-()
ASSERT R.propertyName IS NOT NULL

// Create a node key constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
ON (n:LabelName)
ASSERT (n.propertyName_1,
n.propertyName_2,
…
n.propertyName_n)
IS NODE KEY
[OPTIONS "{" option: value[, ...] "}"]