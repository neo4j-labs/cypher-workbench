// add system message to org
WITH {
    numDaysValid: 7,    // use 0 to not expire
    message: 'The system will be going down for maintenance on Friday, April 16 at 6PM Eastern time',
    orgName: 'Neo4j'
} as params
MATCH (org:SecurityOrganization {name: params.orgName})
MERGE (message:SystemMessage {key: apoc.create.uuid()})
SET message += {
	message: params.message,
    dateAdded: timestamp(),
    validUntil: timestamp() + params.numDaysValid*24*3600*1000
}
MERGE (org)-[:SYSTEM_MESSAGE]->(message)


// add system message to all orgs
WITH {
    numDaysValid: 7,    // use 0 to not expire
    message: 'The system will be going down for maintenance on Friday, April 16 at 6PM Eastern time',
    orgName: 'Neo4j'
} as params
MERGE (message:SystemMessage {key: apoc.create.uuid()})
SET message += {
	message: params.message,
    dateAdded: timestamp(),
    validUntil: timestamp() + params.numDaysValid*24*3600*1000
}
WITH params, message
MATCH (org:SecurityOrganization)
MERGE (org)-[:SYSTEM_MESSAGE]->(message)