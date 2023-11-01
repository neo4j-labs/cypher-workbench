
// create Neo4j security organization, add allowed email domains
MERGE (s:SecurityOrganization {name:'Neo4j'})
SET s.type = 'organization'
SET s.code = 'AAAABBBCC'
SET s.enterpriseDomains = ['neo4j.com','neo4j.com','neotechnology.com']
SET s:DefaultPublic

MERGE (neo1:EmailDomain {name:'neotechnology.com'})
MERGE (neo2:EmailDomain {name:'neo4j.com'})
MERGE (neo3:EmailDomain {name:'neo4j.org'})
MERGE (neo1)-[:BELONGS_TO]->(s)
MERGE (neo2)-[:BELONGS_TO]->(s)
MERGE (neo3)-[:BELONGS_TO]->(s);

WITH [
        { tool: 'model', feature: 'model.property.constraints' },
		{ tool: 'model', feature: 'model.export.model' },
		{ tool: 'model', feature: 'model.export.cypher' },
		{ tool: 'model', feature: 'model.export.constraints' , dependsOn: ['model.property.constraints']},
		{ tool: 'model', feature: 'model.export.markdown' },
		{ tool: 'model', feature: 'model.export.html' },
		{ tool: 'model', feature: 'model.export.svg' },
		{ tool: 'model', feature: 'model.parse.cypher' },
		{ tool: 'model', feature: 'model.import.model' },
		{ tool: 'model', feature: 'model.import.modelFromApoc' },
		{ tool: 'model', feature: 'model.import.modelFromArrows' },
		{ tool: 'model', feature: 'model.import.modelFromDatabase', dependsOn: ['databases.view'] },
		{ tool: 'model', feature: 'model.layout.forceLayout' },
		{ tool: 'model', feature: 'model.layout.leftToRight' },
		{ tool: 'model', feature: 'model.layout.topToBottom' },
		{ tool: 'model', feature: 'model.share' },
		{ tool: 'model', feature: 'model.validate' },
		{ tool: 'model', feature: 'model.relationshipCardinality' },
		{ tool: 'databases', feature: 'databases.view' },
		{ tool: 'databases', feature: 'databases.new' },
		{ tool: 'databases', feature: 'databases.share' },
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.view'},
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.share'},
		{ tool: 'scenarios', feature: 'scenarios.view'},
		{ tool: 'scenarios', feature: 'scenarios.share'},
		{ tool: 'projects', feature: 'projects.view'},
		{ tool: 'projects', feature: 'projects.share'},
		{ tool: 'datasciencedashboard', feature: 'datasciencedashboard.view'},
		{ tool: 'datamapping', feature: 'datamapping.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.share'},
		{ tool: 'dashboard', feature: 'dashboard.view'},
		{ tool: 'dashboard', feature: 'dashboard.share'}

] as licensedFeatures,
{
  Basic: [
        { tool: 'model', feature: 'model.property.constraints' },
		{ tool: 'model', feature: 'model.export.model' },
		{ tool: 'model', feature: 'model.export.cypher' },
		{ tool: 'model', feature: 'model.export.constraints'},
		{ tool: 'model', feature: 'model.export.markdown' },
		{ tool: 'model', feature: 'model.export.html' },
		{ tool: 'model', feature: 'model.export.svg' },
		{ tool: 'model', feature: 'model.parse.cypher' },
		{ tool: 'model', feature: 'model.import.model' },
		{ tool: 'model', feature: 'model.import.modelFromApoc' },
		{ tool: 'model', feature: 'model.import.modelFromArrows' },
		{ tool: 'model', feature: 'model.import.modelFromDatabase'},
		{ tool: 'model', feature: 'model.layout.forceLayout' },
		{ tool: 'model', feature: 'model.layout.leftToRight' },
		{ tool: 'model', feature: 'model.layout.topToBottom' },
		{ tool: 'model', feature: 'model.relationshipCardinality' },
		{ tool: 'databases', feature: 'databases.view' },
		{ tool: 'databases', feature: 'databases.new' },
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.view'}
        /*,
		{ tool: 'scenarios', feature: 'scenarios.view'},
		{ tool: 'projects', feature: 'projects.view'},
		{ tool: 'dashboard', feature: 'dashboard.view'}
        */
  ],
  Premium: [
		{ tool: 'model', feature: 'model.property.constraints' },
        { tool: 'model', feature: 'model.export.model' },
		{ tool: 'model', feature: 'model.export.cypher' },
		{ tool: 'model', feature: 'model.export.constraints' },
		{ tool: 'model', feature: 'model.export.markdown' },
		{ tool: 'model', feature: 'model.export.html' },
		{ tool: 'model', feature: 'model.export.svg' },
		{ tool: 'model', feature: 'model.parse.cypher' },
		{ tool: 'model', feature: 'model.import.model' },
		{ tool: 'model', feature: 'model.import.modelFromApoc' },
		{ tool: 'model', feature: 'model.import.modelFromArrows' },
		{ tool: 'model', feature: 'model.import.modelFromDatabase' },
		{ tool: 'model', feature: 'model.layout.forceLayout' },
		{ tool: 'model', feature: 'model.layout.leftToRight' },
		{ tool: 'model', feature: 'model.layout.topToBottom' },
		{ tool: 'model', feature: 'model.share' },
		{ tool: 'model', feature: 'model.validate' },
		{ tool: 'model', feature: 'model.relationshipCardinality' },
		{ tool: 'databases', feature: 'databases.view' },
		{ tool: 'databases', feature: 'databases.new' },
		{ tool: 'databases', feature: 'databases.share' },
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.view'},
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.share'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.share'},
		{ tool: 'datasciencedashboard', feature: 'datasciencedashboard.view'},
		{ tool: 'datamapping', feature: 'datamapping.view'}
        /*,
		{ tool: 'scenarios', feature: 'scenarios.view'},
		{ tool: 'scenarios', feature: 'scenarios.share'},
		{ tool: 'projects', feature: 'projects.view'},
		{ tool: 'projects', feature: 'projects.share'},
		{ tool: 'dashboard', feature: 'dashboard.view'},
		{ tool: 'dashboard', feature: 'dashboard.share'}
        */
  ],
  Enterprise: [
		{ tool: 'model', feature: 'model.property.constraints' },
        { tool: 'model', feature: 'model.export.model' },
		{ tool: 'model', feature: 'model.export.cypher' },
		{ tool: 'model', feature: 'model.export.constraints' },
		{ tool: 'model', feature: 'model.export.markdown' },
		{ tool: 'model', feature: 'model.export.html' },
		{ tool: 'model', feature: 'model.export.svg' },
		{ tool: 'model', feature: 'model.parse.cypher' },
		{ tool: 'model', feature: 'model.import.model' },
		{ tool: 'model', feature: 'model.import.modelFromApoc' },
		{ tool: 'model', feature: 'model.import.modelFromArrows' },
		{ tool: 'model', feature: 'model.import.modelFromDatabase' },
		{ tool: 'model', feature: 'model.layout.forceLayout' },
		{ tool: 'model', feature: 'model.layout.leftToRight' },
		{ tool: 'model', feature: 'model.layout.topToBottom' },
		{ tool: 'model', feature: 'model.share' },
		{ tool: 'model', feature: 'model.validate' },
		{ tool: 'model', feature: 'model.relationshipCardinality' },
		{ tool: 'databases', feature: 'databases.view' },
		{ tool: 'databases', feature: 'databases.new' },
		{ tool: 'databases', feature: 'databases.share' },
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.view'},
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.share'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.share'},
		{ tool: 'datasciencedashboard', feature: 'datasciencedashboard.view'},
		{ tool: 'datamapping', feature: 'datamapping.view'}
        /*,
		{ tool: 'dashboard', feature: 'dashboard.view'},
		{ tool: 'dashboard', feature: 'dashboard.share'},
		{ tool: 'projects', feature: 'projects.view'},
		{ tool: 'projects', feature: 'projects.share'},
		{ tool: 'scenarios', feature: 'scenarios.view'},
		{ tool: 'scenarios', feature: 'scenarios.share'}
        */
  ],
  EnterpriseTrial: [
		{ tool: 'model', feature: 'model.property.constraints' },
        { tool: 'model', feature: 'model.export.model' },
		{ tool: 'model', feature: 'model.export.cypher' },
		{ tool: 'model', feature: 'model.export.constraints' },
		{ tool: 'model', feature: 'model.export.markdown' },
		{ tool: 'model', feature: 'model.export.html' },
		{ tool: 'model', feature: 'model.export.svg' },
		{ tool: 'model', feature: 'model.parse.cypher' },
		{ tool: 'model', feature: 'model.import.model' },
		{ tool: 'model', feature: 'model.import.modelFromApoc' },
		{ tool: 'model', feature: 'model.import.modelFromArrows' },
		{ tool: 'model', feature: 'model.import.modelFromDatabase' },
		{ tool: 'model', feature: 'model.layout.forceLayout' },
		{ tool: 'model', feature: 'model.layout.leftToRight' },
		{ tool: 'model', feature: 'model.layout.topToBottom' },
		{ tool: 'model', feature: 'model.share' },
		{ tool: 'model', feature: 'model.validate' },
		{ tool: 'model', feature: 'model.relationshipCardinality' },
		{ tool: 'databases', feature: 'databases.view' },
		{ tool: 'databases', feature: 'databases.new' },
		{ tool: 'databases', feature: 'databases.share' },
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.view'},
		{ tool: 'cypherbuilder', feature: 'cypherbuilder.share'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.view'},
		{ tool: 'cyphersuite', feature: 'cyphersuite.share'},
		{ tool: 'datasciencedashboard', feature: 'datasciencedashboard.view'},
		{ tool: 'datamapping', feature: 'datamapping.view'}
        /*,
		{ tool: 'dashboard', feature: 'dashboard.view'},
		{ tool: 'dashboard', feature: 'dashboard.share'},
		{ tool: 'projects', feature: 'projects.view'},
		{ tool: 'projects', feature: 'projects.share'},
		{ tool: 'scenarios', feature: 'scenarios.view'},
		{ tool: 'scenarios', feature: 'scenarios.share'}
        */
  ]
} as softwareEditions

UNWIND licensedFeatures as featureInfo
MERGE (tool:Tool {name: featureInfo.tool})
MERGE (feature:Feature {name: featureInfo.feature})
MERGE (tool)-[:HAS_FEATURE]->(feature)
WITH *
CALL apoc.do.when(feature.dependsOn IS NOT NULL,
    "UNWIND $dependsOn as dependsOn
     MATCH (dependentFeature:Feature {name: dependsOn})
     MERGE (feature)-[:DEPENDS_ON]->(dependentFeature)
     WITH collect(dependsOn) as _
     RETURN 1
    ",
    "RETURN 0", { feature: feature, dependsOn: featureInfo.dependsOn}) YIELD value

WITH softwareEditions, collect(feature) as _
UNWIND keys(softwareEditions) as softwareEditionName
MERGE (softwareEdition:SoftwareEdition {name:softwareEditionName})
WITH *
UNWIND softwareEditions[softwareEditionName] as editionFeature
OPTIONAL MATCH (matchedFeature:Feature {name: editionFeature.feature})
CALL apoc.util.validate(matchedFeature IS NULL, "SoftwareEdition '" + softwareEditionName + "' has feature '" + editionFeature.feature + "' not in licensedFeatures list", [0])
WITH *
MERGE (softwareEdition)-[:HAS_FEATURE]->(matchedFeature);

WITH
{
	Basic: { 
		maxNumberOfModels: 10,
		maxNumberOfDatabases: 10,
		maxNumberOfGraphDocs_Project: 10,
		maxNumberOfGraphDocs_CypherBuilder: 25,
		maxNumberOfGraphDocs_ScenarioSet: 10,
		maxNumberOfGraphDocs_CypherSuite: 10,
		maxNumberOfGraphDocs_Dashboard: 5
	},
	Premium: {
		maxNumberOfModels: 50,
		maxNumberOfDatabases: 50,
		maxNumberOfGraphDocs_Project: 50,
		maxNumberOfGraphDocs_CypherBuilder: 150,
		maxNumberOfGraphDocs_ScenarioSet: 50,
		maxNumberOfGraphDocs_CypherSuite: 50,
		maxNumberOfGraphDocs_Dashboard: 25
	},
  	Enterprise: {
		maxNumberOfModels: 999999999999,
		maxNumberOfDatabases: 999999999999,
		maxNumberOfGraphDocs_Project: 999999999999,
		maxNumberOfGraphDocs_CypherBuilder: 999999999999,
		maxNumberOfGraphDocs_ScenarioSet: 999999999999,
		maxNumberOfGraphDocs_CypherSuite: 999999999999,
		maxNumberOfGraphDocs_Dashboard: 999999999999
	},
  	EnterpriseTrial: {
		maxNumberOfModels: 999999999999,
		maxNumberOfDatabases: 999999999999,
		maxNumberOfGraphDocs_Project: 999999999999,
		maxNumberOfGraphDocs_CypherBuilder: 999999999999,
		maxNumberOfGraphDocs_ScenarioSet: 999999999999,
		maxNumberOfGraphDocs_CypherSuite: 999999999999,
		maxNumberOfGraphDocs_Dashboard: 999999999999
	} 
} as softwareEditionRestrictions

UNWIND keys(softwareEditionRestrictions) as softwareEditionName
MERGE (softwareEdition:SoftwareEdition {name:softwareEditionName})
SET softwareEdition += softwareEditionRestrictions[softwareEditionName];

// add Neo4j as licensed for Enterprise
MERGE (enterprise:SoftwareEdition {name: 'Enterprise'})
MERGE (s:SecurityOrganization {name:'Neo4j'})
MERGE (s)-[:LICENSED_FOR]->(enterprise);

