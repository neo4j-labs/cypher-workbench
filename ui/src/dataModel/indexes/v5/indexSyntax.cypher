
// version 5 syntax

// *******
// Indexes
// *******

// Creating a range index
CREATE [RANGE] INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName_1[,
    n.propertyName_2,
    ...
    n.propertyName_n])

CREATE [RANGE] INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName_1[,
    r.propertyName_2,
    ...
    r.propertyName_n])

// examples
CREATE INDEX node_range_index_name FOR (n:Person) ON (n.surname)
CREATE INDEX rel_range_index_name FOR ()-[r:KNOWS]-() ON (r.since)
CREATE INDEX composite_range_node_index_name FOR (n:Person) ON (n.age, n.country)
CREATE INDEX composite_range_rel_index_name FOR ()-[r:PURCHASED]-() ON (r.date, r.amount)
CREATE INDEX node_range_index_name IF NOT EXISTS FOR (n:Person) ON (n.surname)


// Creating a text index
CREATE TEXT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

CREATE TEXT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// examples
CREATE TEXT INDEX node_text_index_nickname FOR (n:Person) ON (n.nickname)
CREATE TEXT INDEX rel_text_index_name FOR ()-[r:KNOWS]-() ON (r.interest)
CREATE TEXT INDEX node_index_name IF NOT EXISTS FOR (n:Person) ON (n.nickname)
CREATE TEXT INDEX text_index_with_indexprovider FOR ()-[r:TYPE]-() ON (r.prop1)
  OPTIONS {indexProvider: 'text-2.0'}

// Creating a point index
CREATE POINT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName)
ON (n.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

CREATE POINT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME"]"-()
ON (r.propertyName)
[OPTIONS "{" option: value[, ...] "}"]

// options
spatial.cartesian.min
spatial.cartesian.max
spatial.cartesian-3d.min
spatial.cartesian-3d.max
spatial.wgs-84.min
spatial.wgs-84.max
spatial.wgs-84-3d.min
spatial.wgs-84-3d.max

// examples
CREATE POINT INDEX node_point_index_name FOR (n:Person) ON (n.sublocation)
CREATE POINT INDEX rel_point_index_name FOR ()-[r:STREET]-() ON (r.intersection)
CREATE POINT INDEX node_point_index IF NOT EXISTS FOR (n:Person) ON (n.sublocation)

CREATE POINT INDEX point_index_with_config
FOR (n:Label) ON (n.prop2)
OPTIONS {
  indexConfig: {
    `spatial.cartesian.min`: [-100.0, -100.0],
    `spatial.cartesian.max`: [100.0, 100.0]
  }
}


// Creating a token lookup index
CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR (n)
ON EACH labels(n)

CREATE LOOKUP INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r"]"-()
ON [EACH] type(r)

// examples
CREATE LOOKUP INDEX node_label_lookup_index FOR (n) ON EACH labels(n)
CREATE LOOKUP INDEX rel_type_lookup_index FOR ()-[r]-() ON EACH type(r)
CREATE LOOKUP INDEX node_label_lookup IF NOT EXISTS FOR (n) ON EACH labels(n)


// Create and configure full-text indexes
CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR (n:LabelName["|" ...])
ON EACH "[" n.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

CREATE FULLTEXT INDEX [index_name] [IF NOT EXISTS]
FOR ()-"["r:TYPE_NAME["|" ...]"]"-()
ON EACH "[" r.propertyName[, ...] "]"
[OPTIONS "{" option: value[, ...] "}"]

CREATE FULLTEXT INDEX titlesAndDescriptions FOR (n:Movie|Book) ON EACH [n.title, n.description]
CREATE FULLTEXT INDEX taggedByRelationshipIndex FOR ()-[r:TAGGED_AS]-() ON EACH [r.taggedByUser]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'url_or_email',
    `fulltext.eventually_consistent`: true
  }
}

// ***********
// Constraints
// ***********

// Create a node property uniqueness constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE n.propertyName IS [NODE] UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE (n.propertyName_1, ..., n.propertyName_n) IS [NODE] UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

// Create a relationship property uniqueness constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR ()-"["r:RELATIONSHIP_TYPE"]"-()
REQUIRE r.propertyName IS [REL[ATIONSHIP]] UNIQUE
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR ()-"["r:RELATIONSHIP_TYPE"]"-()
REQUIRE (r.propertyName_1, ..., r.propertyName_n) IS [REL[ATIONSHIP]] UNIQUE
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
REQUIRE n.propertyName IS [NODE] KEY
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR (n:LabelName)
REQUIRE (n.propertyName_1, ..., n.propertyName_n) IS [NODE] KEY
[OPTIONS "{" option: value[, ...] "}"]

// Create a relationship key constraint
CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR ()-"["r:RELATIONSHIP_TYPE"]"-()
REQUIRE r.propertyName IS [REL[ATIONSHIP]] KEY
[OPTIONS "{" option: value[, ...] "}"]

CREATE CONSTRAINT [constraint_name] [IF NOT EXISTS]
FOR ()-"["r:RELATIONSHIP_TYPE"]"-()
REQUIRE (r.propertyName_1, ..., r.propertyName_n) IS [REL[ATIONSHIP]] KEY
[OPTIONS "{" option: value[, ...] "}"]