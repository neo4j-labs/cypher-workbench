//import antlr4 from 'antlr4/src/antlr4/index';
import antlr4 from 'antlr4';

import DataModel from '../../../dataModel/dataModel';
import {
    getNodeLabels,
    verifyNodeLabelProperties,
    verifyProperty
} from '../../test/testHelper';

import CypherLexer from './CypherLexer';
import CypherParser from './CypherParser';
import CypherStatementBuilderListener from './CypherStatementBuilderListener';
import CypherStatement from './CypherStatement';

var gamesOfThronesCypherSnippet = `
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/character-predictions.csv' AS row
WITH row,
     CASE WHEN row.isAlive = '0' THEN [1]
       ELSE []
       END AS dead_person,
     CASE WHEN row.isAliveMother = '0' THEN [1]
       ELSE []
       END AS dead_mother,
     CASE WHEN row.isAliveFather = '0' THEN [1]
       ELSE []
       END AS dead_father,
     CASE WHEN row.isAliveHeir = '0' THEN [1]
       ELSE []
       END AS dead_heir,
     CASE WHEN row.isAliveSpouse = '0' THEN [1]
       ELSE []
       END AS dead_spouse

MATCH (p:Person {name: row.name})

// Use OPTIONAL MATCH (mother:Person {name: row.mother}) not to stop the query if the Person is not found.
OPTIONAL MATCH (mother:Person {name: row.mother})
OPTIONAL MATCH (father:Person {name: row.father})
OPTIONAL MATCH (heir:Person {name: row.heir})
OPTIONAL MATCH (spouse:Spouse {name: row.spouse})

// Set the label Dead to each dead person.
FOREACH (d IN dead_person |
  SET p:Dead
)
FOREACH (d IN dead_mother |
  SET mother:Dead
)
FOREACH (d IN dead_father |
  SET father:Dead
)
FOREACH (d IN dead_heir |
  SET heir:Dead
)
FOREACH (d IN dead_spouse |
  SET spouse:Dead
);
`

var gamesOfThronesCypher = `
LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/battles.csv' AS row
MERGE (b:Battle {name: row.name})
  ON CREATE SET b.year = toInteger(row.year),
  b.summer = row.summer,
  b.major_death = row.major_death,
  b.major_capture = row.major_capture,
  b.note = row.note,
  b.battle_type = row.battle_type,
  b.attacker_size = toInteger(row.attacker_size),
  b.defender_size = toInteger(row.defender_size);

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/battles.csv' AS row

// Because there is only attacker_outcome in the data, do a CASE statement for defender_outcome.
WITH row,
     CASE WHEN row.attacker_outcome = 'win' THEN 'loss'
       ELSE 'win'
       END AS defender_outcome

// Match the battle
MATCH (b:Battle {name: row.name})

// All battles have at least one attacker, so you don't have to use FOREACH.
MERGE (attacker1:House {name: row.attacker_1})
MERGE (attacker1)-[a1:ATTACKER]->(b)
  ON CREATE SET a1.outcome = row.attacker_outcome

// Use FOREACH to skip the null values.
FOREACH
(ignoreMe IN CASE WHEN row.defender_1 IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (defender1:House {name: row.defender_1})
  MERGE (defender1)-[d1:DEFENDER]->(b)
    ON CREATE SET d1.outcome = defender_outcome
)
FOREACH
(ignoreMe IN CASE WHEN row.defender_2 IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (defender2:House {name: row.defender_2})
  MERGE (defender2)-[d2:DEFENDER]->(b)
    ON CREATE SET d2.outcome = defender_outcome
)
FOREACH
(ignoreMe IN CASE WHEN row.attacker_2 IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (attacker2:House {name: row.attacker_2})
  MERGE (attacker2)-[a2:ATTACKER]->(b)
    ON CREATE SET a2.outcome = row.attacker_outcome
)
FOREACH
(ignoreMe IN CASE WHEN row.attacker_3 IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (attacker2:House {name: row.attacker_3})
  MERGE (attacker3)-[a3:ATTACKER]->(b)
    ON CREATE SET a3.outcome = row.attacker_outcome
)
FOREACH
(ignoreMe IN CASE WHEN row.attacker_4 IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (attacker4:House {name: row.attacker_4})
  MERGE (attacker4)-[a4:ATTACKER]->(b)
    ON CREATE SET a4.outcome = row.attacker_outcome
);

LOAD CSV WITH HEADERS FROM
'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/battles.csv'
AS row
MATCH (b:Battle {name: row.name})

// Use coalesce to replace the null values with "Unknown".
MERGE (location:Location {name: coalesce(row.location, 'Unknown')})
MERGE (b)-[:IS_IN]->(location)
MERGE (region:Region {name: row.region})
MERGE (location)-[:IS_IN]->(region);

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/battles.csv' AS row

// Split the columns that may contain more than one person.
WITH row,
     split(row.attacker_commander, ',') AS att_commanders,
     split(row.defender_commander, ',') AS def_commanders,
     split(row.attacker_king, '/') AS att_kings,
     split(row.defender_king, '/') AS def_kings,
     row.attacker_outcome AS att_outcome,
     CASE WHEN row.attacker_outcome = 'win' THEN 'loss'
       ELSE 'win'
       END AS def_outcome
MATCH (b:Battle {name: row.name})

UNWIND att_commanders AS att_commander
MERGE (p:Person {name: trim(att_commander)})
MERGE (p)-[ac:ATTACKER_COMMANDER]->(b)
  ON CREATE SET ac.outcome = att_outcome

// To end the unwind and correct cardinality(number of rows), use any aggregation function ( e.g. count(*)).
WITH b, def_commanders, def_kings, att_kings, att_outcome, def_outcome,
     COUNT(*) AS c1
UNWIND def_commanders AS def_commander
MERGE (p:Person {name: trim(def_commander)})
MERGE (p)-[dc:DEFENDER_COMMANDER]->(b)
  ON CREATE SET dc.outcome = def_outcome

// Reset cardinality with an aggregation function (end the unwind).
WITH b, def_kings, att_kings, att_outcome, def_outcome, COUNT(*) AS c2
UNWIND def_kings AS def_king
MERGE (p:Person {name: trim(def_king)})
MERGE (p)-[dk:DEFENDER_KING]->(b)
  ON CREATE SET dk.outcome = def_outcome

// Reset cardinality with an aggregation function (end the unwind).
WITH b, att_kings, att_outcome, COUNT(*) AS c3
UNWIND att_kings AS att_king
MERGE (p:Person {name: trim(att_king)})
MERGE (p)-[ak:ATTACKER_KING]->(b)
  ON CREATE SET ak.outcome = att_outcome;

LOAD CSV WITH HEADERS FROM
'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/character-deaths.csv'
AS row

WITH row,
     CASE WHEN row.Nobility = '1' THEN 'Noble'
       ELSE 'Commoner'
       END AS status_value

// Remove House for better linking.
MERGE (house:House {name: replace(row.Allegiances, 'House ', '')})
MERGE (person:Person {name: row.Name})

SET person.gender = CASE WHEN row.Gender = '1' THEN 'male'
  ELSE 'female'
  END,
person.book_intro_chapter = row.\`Book Intro Chapter\`,
person.book_death_chapter = row.\`Death Chapter\`,
person.book_of_death = row.\`Book of Death\`,
person.death_year = toINT(row.\`Death Year\`)
MERGE (person)-[:BELONGS_TO]->(house)
MERGE (status:Status {name: status_value})
MERGE (person)-[:HAS_STATUS]->(status)

// Use FOREACH to skip the null values.
FOREACH
(ignoreMe IN CASE WHEN row.GoT = '1' THEN [1]
  ELSE []
  END |
  MERGE (book1:Book {sequence: 1})
    ON CREATE SET book1.name = 'Game of thrones'
  MERGE (person)-[:APPEARED_IN]->(book1)
)
FOREACH
(ignoreMe IN CASE WHEN row.CoK = '1' THEN [1]
  ELSE []
  END |
  MERGE (book2:Book {sequence: 2})
    ON CREATE SET book2.name = 'Clash of kings'
  MERGE (person)-[:APPEARED_IN]->(book2)
)
FOREACH
(ignoreMe IN CASE WHEN row.SoS = '1' THEN [1]
  ELSE []
  END |
  MERGE (book3:Book {sequence: 3})
    ON CREATE SET book3.name = 'Storm of swords'
  MERGE (person)-[:APPEARED_IN]->(book3)
)
FOREACH
(ignoreMe IN CASE WHEN row.FfC = '1' THEN [1]
  ELSE []
  END |
  MERGE (book4:Book {sequence: 4})
    ON CREATE SET book4.name = 'Feast for crows'
  MERGE (person)-[:APPEARED_IN]->(book4)
)
FOREACH
(ignoreMe IN CASE WHEN row.DwD = '1' THEN [1]
  ELSE []
  END |
  MERGE (book5:Book {sequence: 5})
    ON CREATE SET book5.name = 'Dance with dragons'
  MERGE (person)-[:APPEARED_IN]->(book5)
)
FOREACH
(ignoreMe IN CASE WHEN row.\`Book of Death\` IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: toInt(row.\`Book of Death\`)})
  MERGE (person)-[:DIED_IN]->(book)
);

LOAD CSV WITH HEADERS FROM
'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/character-predictions.csv'
AS row
MERGE (p:Person {name: row.name})
// Set properties on the person node.
SET p.title = row.title,
p.death_year = toINT(row.DateoFdeath),
p.birth_year = toINT(row.dateOfBirth),
p.age = toINT(row.age),
p.gender = CASE WHEN row.male = '1' THEN 'male'
  ELSE 'female'
  END

// Use FOREACH to skip the null values.
FOREACH
(ignoreMe IN CASE WHEN row.mother IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (mother:Person {name: row.mother})
  MERGE (p)-[:RELATED_TO {name: 'mother'}]->(mother)
)
FOREACH
(ignoreMe IN CASE WHEN row.spouse IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (spouse:Person {name: row.spouse})
  MERGE (p)-[:RELATED_TO {name: 'spouse'}]->(spouse)
)
FOREACH
(ignoreMe IN CASE WHEN row.father IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (father:Person {name: row.father})
  MERGE (p)-[:RELATED_TO {name: 'father'}]->(father)
)
FOREACH
(ignoreMe IN CASE WHEN row.heir IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (heir:Person {name: row.heir})
  MERGE (p)-[:RELATED_TO {name: 'heir'}]->(heir)
)

// Remove "House " from the value for better linking.
FOREACH
(ignoreMe IN CASE WHEN row.house IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (house:House {name: replace(row.house, 'House ', '')})
  MERGE (p)-[:BELONGS_TO]->(house)
);

LOAD CSV WITH HEADERS FROM
'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/character-predictions.csv'
AS row

MERGE (p:Person {name: row.name})

// Use FOREACH to skip the null values. Lower row.culture for better linking.
FOREACH
(ignoreMe IN CASE WHEN row.culture IS NOT NULL THEN [1]
  ELSE []
  END |
  MERGE (culture:Culture {name: lower(row.culture)})
  MERGE (p)-[:MEMBER_OF_CULTURE]->(culture)
)
FOREACH
(ignoreMe IN CASE WHEN row.book1 = '1' THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: 1})
  MERGE (p)-[:APPEARED_IN]->(book)
)
FOREACH
(ignoreMe IN CASE WHEN row.book2 = '1' THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: 2})
  MERGE (p)-[:APPEARED_IN]->(book)
)
FOREACH
(ignoreMe IN CASE WHEN row.book3 = '1' THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: 3})
  MERGE (p)-[:APPEARED_IN]->(book)
)
FOREACH
(ignoreMe IN CASE WHEN row.book4 = '1' THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: 4})
  MERGE (p)-[:APPEARED_IN]->(book)
)
FOREACH
(ignoreMe IN CASE WHEN row.book5 = '1' THEN [1]
  ELSE []
  END |
  MERGE (book:Book {sequence: 5})
  MERGE (p)-[:APPEARED_IN]->(book)
);

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/tomasonjo/neo4j-game-of-thrones/master/data/character-predictions.csv' AS row

WITH row,
     CASE WHEN row.isAlive = '0' THEN [1]
       ELSE []
       END AS dead_person,
     CASE WHEN row.isAliveMother = '0' THEN [1]
       ELSE []
       END AS dead_mother,
     CASE WHEN row.isAliveFather = '0' THEN [1]
       ELSE []
       END AS dead_father,
     CASE WHEN row.isAliveHeir = '0' THEN [1]
       ELSE []
       END AS dead_heir,
     CASE WHEN row.isAliveSpouse = '0' THEN [1]
       ELSE []
       END AS dead_spouse

MATCH (p:Person {name: row.name})

// Use OPTIONAL MATCH (mother:Person {name: row.mother}) not to stop the query if the Person is not found.
OPTIONAL MATCH (mother:Person {name: row.mother})
OPTIONAL MATCH (father:Person {name: row.father})
OPTIONAL MATCH (heir:Person {name: row.heir})
OPTIONAL MATCH (spouse:Spouse {name: row.spouse})

// Set the label Dead to each dead person.
FOREACH (d IN dead_person |
  SET p:Dead
)
FOREACH (d IN dead_mother |
  SET mother:Dead
)
FOREACH (d IN dead_father |
  SET father:Dead
)
FOREACH (d IN dead_heir |
  SET heir:Dead
)
FOREACH (d IN dead_spouse |
  SET spouse:Dead
);

MATCH (p:Person) where exists (p.death_year)
SET p:Dead;

MATCH (p:Person)-[:DEFENDER_KING|ATTACKER_KING]-()
SET p:King;

MATCH (p:Person) where lower(p.title) contains "king"
SET p:King;

MATCH (p:Person) where p.title = "Ser"
SET p:Knight;

// Map the names coming from the different data sources.
:param [map] => {
  RETURN
    {
      \`Aemon Targaryen (Maester Aemon)\`: 'Aemon Targaryen (son of Maekar I)',
      \`Arstan\`:                          'Barristan Selmy',
      \`Garin (orphan)\`:                  'Garin (Orphan)',
      \`Hareth (Moles Town)\`:             "Hareth (Mole's Town)",
      \`Jaqen Hghar\`:                     "Jaqen H'ghar",
      \`Lommy Greenhands\`:                'Lommy',
      \`Rattleshirt\`:                     'Lord of Bones',
      \`Thoros of Myr\`:                   'Thoros'
    } AS map
};

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/mathbeveridge/asoiaf/master/data/asoiaf-book1-edges.csv' AS row
WITH replace(row.Source, '-', ' ') AS srcName,
     replace(row.Target, '-', ' ') AS tgtName,
     toInteger(row.weight) AS weight
MERGE (src:Person {name: coalesce($map[srcName], srcName)})
MERGE (tgt:Person {name: coalesce($map[tgtName], tgtName)})
MERGE (src)-[i:INTERACTS {book: 1}]->(tgt)
  ON CREATE SET i.weight = weight
  ON MATCH SET i.weight = i.weight + weight
MERGE (src)-[r:INTERACTS_1]->(tgt)
  ON CREATE SET r.weight = weight, r.book = 1;

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/mathbeveridge/asoiaf/master/data/asoiaf-book2-edges.csv' AS row
WITH replace(row.Source, '-', ' ') AS srcName,
     replace(row.Target, '-', ' ') AS tgtName,
     toInteger(row.weight) AS weight
MERGE (src:Person {name: coalesce($map[srcName], srcName)})
MERGE (tgt:Person {name: coalesce($map[tgtName], tgtName)})
MERGE (src)-[i:INTERACTS {book: 2}]->(tgt)
  ON CREATE SET i.weight = weight
  ON MATCH SET i.weight = i.weight + weight
MERGE (src)-[r:INTERACTS_2]->(tgt)
  ON CREATE SET r.weight = weight, r.book = 2;

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/mathbeveridge/asoiaf/master/data/asoiaf-book3-edges.csv' AS row
WITH replace(row.Source, '-', ' ') AS srcName,
     replace(row.Target, '-', ' ') AS tgtName,
     toInteger(row.weight) AS weight
MERGE (src:Person {name: coalesce($map[srcName], srcName)})
MERGE (tgt:Person {name: coalesce($map[tgtName], tgtName)})
MERGE (src)-[i:INTERACTS {book: 3}]->(tgt)
  ON CREATE SET i.weight = weight
  ON MATCH SET i.weight = i.weight + weight
MERGE (src)-[r:INTERACTS_3]->(tgt)
  ON CREATE SET r.weight = weight, r.book = 3;

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/mathbeveridge/asoiaf/master/data/asoiaf-book4-edges.csv' AS row
WITH replace(row.Source, '-', ' ') AS srcName,
     replace(row.Target, '-', ' ') AS tgtName,
     toInteger(row.weight) AS weight
MERGE (src:Person {name: coalesce($map[srcName], srcName)})
MERGE (tgt:Person {name: coalesce($map[tgtName], tgtName)})
MERGE (src)-[i:INTERACTS {book: 4}]->(tgt)
  ON CREATE SET i.weight = weight
  ON MATCH SET i.weight = i.weight + weight
MERGE (src)-[r:INTERACTS_4]->(tgt)
  ON CREATE SET r.weight = weight, r.book = 4;

LOAD CSV WITH HEADERS FROM 'https://raw.githubusercontent.com/mathbeveridge/asoiaf/master/data/asoiaf-book5-edges.csv' AS row
WITH replace(row.Source, '-', ' ') AS srcName,
     replace(row.Target, '-', ' ') AS tgtName,
     toInteger(row.weight) AS weight
MERGE (src:Person {name: coalesce($map[srcName], srcName)})
MERGE (tgt:Person {name: coalesce($map[tgtName], tgtName)})
MERGE (src)-[i:INTERACTS {book: 5}]->(tgt)
  ON CREATE SET i.weight = weight
  ON MATCH SET i.weight = i.weight + weight
MERGE (src)-[r:INTERACTS_5]->(tgt)
  ON CREATE SET r.weight = weight, r.book = 5;
`

function parseStatement (cypherToParse) {
    var statement;
    if (cypherToParse) {
        var chars = new antlr4.InputStream(cypherToParse);
        var lexer = new CypherLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new CypherParser(tokens);
        var tree = parser.oC_Cypher();

        var builder = new CypherStatementBuilderListener();
        //var listener = new CypherListener();
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(builder, tree);

        statement = builder.getCypherStatement();
    }
    return statement;
}

test('test get NodeLabel from cypher', () => {
    var cypherStatements = gamesOfThronesCypher.split(';');
    var dataModel = DataModel();
    cypherStatements
        .filter((cypher) => {
            return (cypher.trim().length > 0 && !cypher.match(/:param ?\[/) && !cypher.match(/:params ?\[/)
                                             && !cypher.match(/:param ?\{/) && !cypher.match(/:params ?\{/))
        }).map(cypher => {
            //console.log("parsingStatement: " + cypher);
            var statement = parseStatement(cypher);
            statement.populateMatchGraph(dataModel, {useLabelAsId: true, useDataModel: true});
        });

    var nodeLabelArray = dataModel.getNodeLabelArray();
    //console.log(nodeLabelArray);
});
