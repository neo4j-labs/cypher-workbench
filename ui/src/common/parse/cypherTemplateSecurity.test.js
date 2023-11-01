import { parseUxCypher, parseUxCypherHelper, parseUxCypherSuite } from './cypherTemplate';

var uxCypherSuite = `
// @CypherSuite Users and Security Organizations

// @Helper cypher.ux.find($nodeLabel, $property)
WITH ux_value as searchTerm
MATCH (n:$nodeLabel) 
WHERE toLower(n.$property) CONTAINS toLower(searchTerm) 
RETURN n.$property as result;

// Create new Security Organization with name {ux_name}
/*  
    ux_name = TextField
*/
WITH ux_name as orgName
MERGE (s:SecurityOrganization {name:orgName});

// Make Security Organization {ux_securityOrg} the DefaultPublic organization
/*
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_securityOrg as orgName
MATCH (s:SecurityOrganization:DefaultPublic)
REMOVE s:DefaultPublic
WITH orgName
MATCH (s:SecurityOrganization {name:orgName})
SET s:DefaultPublic;

// Assign an email domain {ux_emailDomain} to a Security Organization {ux_securityOrg}
/*
    ux_emailDomain = TextField
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_securityOrg as orgName, ux_emailDomain as emailDomain
MATCH (s:SecurityOrganization {name:orgName})
MERGE (domain:EmailDomain {name:emailDomain})
MERGE (domain)-[:BELONGS_TO]->(s);

// Remove an Email Domain {ux_emailDomain} from Security Organization {ux_securityOrg}
/*
    ux_emailDomain = Autocomplete:cypher.ux.find("EmailDomain", "name").result
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_securityOrg as orgName, ux_emailDomain as emailDomain
MATCH (domain:EmailDomain {name:emailDomain})-[r:BELONGS_TO]->(s:SecurityOrganization {name:orgName})
DELETE r;

// Remove Security Organization {ux_securityOrg}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_securityOrg as orgName
MATCH (s:SecurityOrganization {name:orgName})
DETACH DELETE s;

// Assign Security Organization {ux_securityOrg} to License {ux_license}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
   ux_license = Autocomplete:cypher.ux.find("SoftwareEdition", "name").result
*/
WITH ux_securityOrg as orgName, ux_license as license
MATCH (s:SecurityOrganization {name:orgName})
MATCH (edition:SoftwareEdition {name: license})
MERGE (s)-[:LICENSED_FOR]->(edition);

// Switch Security Organization {ux_securityOrg} to license {ux_license}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
   ux_license = Autocomplete:cypher.ux.find("SoftwareEdition", "name").result
*/
WITH ux_securityOrg as orgName, ux_license as license
MATCH (s:SecurityOrganization {name:orgName})-[r:LICENSED_FOR]->(edition:SoftwareEdition)
DELETE r
WITH s, license
MATCH (edition:SoftwareEdition {name: license})
MERGE (s)-[:LICENSED_FOR]->(edition);

// Create user {ux_user}
/*
    ux_user = TextField
*/
WITH ux_user as email
MERGE (u:User {email: email})
MERGE (settings:UserSettings {email: email})
MERGE (u)-[:HAS_USER_SETTINGS]->(settings);

// Assign existing user {ux_user} to Security Organization {ux_securityOrg}
/*
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
    ux_user = TextField
*/
WITH ux_securityOrg as orgName, ux_user as email
MATCH (u:User {email: email}), (s:SecurityOrganization {name:orgName})
SET u.primaryOrganization = s.name
MERGE (u)-[:MEMBER]->(s)
WITH *
CALL apoc.create.addLabels([u], [s.name]) YIELD node
RETURN node;

// Change user {ux_email} to new security organization {ux_securityOrg} (delete existing security organization membership)
/*
    ux_email = Autocomplete:cypher.ux.find("User", "email").result
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_securityOrg as newOrgName, ux_email as email
MATCH (u:User {email: email})
MATCH (settings:UserSettings {email: email})
OPTIONAL MATCH (u)-[r:MEMBER]->(s:SecurityOrganization)
CALL apoc.do.when(r IS NOT NULL,
    "WITH r, u, s, settings
    DELETE r
    WITH *
    CALL apoc.create.removeLabels([u], [s.name]) YIELD node as user
    WITH *
    CALL apoc.create.removeLabels([settings], [s.name]) YIELD node
    RETURN node
    ",
    "RETURN u",
    {r:r, u:u, s:s, settings:settings}) YIELD value
WITH u, newOrgName, settings
MATCH (s:SecurityOrganization {name:newOrgName})
SET u.primaryOrganization = s.name
MERGE (u)-[:MEMBER]->(s)
WITH *
CALL apoc.create.addLabels([u], [s.name]) YIELD node as user
WITH *
CALL apoc.create.addLabels([settings], [s.name]) YIELD node
RETURN user;

// Remove user {ux_email} from security organization {ux_securityOrg}
/*
    ux_email = Autocomplete:cypher.ux.find("User", "email").result
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH ux_email as email, ux_securityOrg as orgName
MATCH (u:User {email: email})-[r:MEMBER]->(s:SecurityOrganization {name: orgName})
CALL apoc.do.when(u.primaryOrganization = s.name,
  "SET u.primaryOrganization = '' RETURN 1",
  "RETURN 0",
  {u: u}
) YIELD value
WITH *
DELETE r
WITH *
CALL apoc.create.removeLabels([u], [s.name]) YIELD node
RETURN node;

// Remove user {ux_email} from all security organizations
/*
    ux_email = Autocomplete:cypher.ux.find("User", "email").result
*/
WITH ux_email as email
MATCH (u:User {email: email})-[r:MEMBER]->(s:SecurityOrganization)
SET u.primaryOrganization = ''
DELETE r
WITH *
CALL apoc.create.removeLabels([u], [s.name]) YIELD node
RETURN node;
`

test('test security suite', () => {
    var result = parseUxCypherSuite(uxCypherSuite);
    expect(result.name).toBe("Users and Security Organizations");
    expect(Object.keys(result.cypherHelpers).length).toBe(1);

    var helper = result.cypherHelpers['cypher.ux.find'];
    expect(helper.name).toBe('cypher.ux.find');
    expect(helper.cypher).toBe(`WITH ux_value as searchTerm
MATCH (n:$nodeLabel)
WHERE toLower(n.$property) CONTAINS toLower(searchTerm)
RETURN n.$property as result;`);
    expect(helper.parameters).toStrictEqual(["$nodeLabel","$property"]);

    expect(result.uxCyphers.length).toBe(12);
    var cypher = result.uxCyphers[0];
    expect(cypher.name).toBe('Create new Security Organization with name {ux_name}');
    expect(cypher.cypher).toBe(`WITH ux_name as orgName
MERGE (s:SecurityOrganization {name:orgName});`);
    expect(Object.keys(cypher.userInputs).length).toBe(1);
    var userInput = Object.values(cypher.userInputs)[0];
    expect(userInput.variableName).toBe('ux_name');
    expect(userInput.uxControl).toBe('TextField');
    expect(userInput.helperCall).toStrictEqual({});

    cypher = result.uxCyphers[1];        
    expect(cypher.name).toBe('Make Security Organization {ux_securityOrg} the DefaultPublic organization');
    expect(cypher.cypher).toBe(`WITH ux_securityOrg as orgName
MATCH (s:SecurityOrganization:DefaultPublic)
REMOVE s:DefaultPublic
WITH orgName
MATCH (s:SecurityOrganization {name:orgName})
SET s:DefaultPublic;`);
    expect(Object.keys(cypher.userInputs).length).toBe(1);
    var userInput = Object.values(cypher.userInputs)[0];
    expect(userInput.variableName).toBe('ux_securityOrg');
    expect(userInput.uxControl).toBe('Autocomplete');

    var helper1 = userInput.helperCall;
    expect(helper1.helperName).toBe('cypher.ux.find');
    expect(helper1.helperParamValues).toStrictEqual(["SecurityOrganization", "name"]);
    expect(helper1.returnName).toBe("result");
});