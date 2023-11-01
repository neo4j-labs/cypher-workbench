import { 
    parseUxCypher, 
    parseUxCypherTitle, 
    parseUxCypherHelper, 
    parseUxCypherSuite,
    UserInput
} from './cypherTemplate';

test('test helper', () => {
    var uxCypherHelper = `
    // @Helper cypher.ux.find($nodeLabel, $property)
    WITH ux_value as searchTerm
    MATCH (n:$nodeLabel)
    WHERE toLower(n.$property) CONTAINS toLower(searchTerm)
    RETURN n.$property as result;`;

    var result = parseUxCypherHelper(uxCypherHelper);
    expect(result.name).toBe('cypher.ux.find');
    expect(result.cypher).toBe(`WITH ux_value as searchTerm
MATCH (n:$nodeLabel)
WHERE toLower(n.$property) CONTAINS toLower(searchTerm)
RETURN n.$property as result;`);
    expect(result.parameters).toStrictEqual(["$nodeLabel","$property"]);
})

test('test parseUxCypher', () => {
    var uxCypher = `
        // Create user {ux_user}
        /*
            ux_user = TextField
        */
        WITH ux_user as email
        MERGE (u:User {email: email})
        MERGE (settings:UserSettings {email: email})
        MERGE (u)-[:HAS_USER_SETTINGS]->(settings)
    `;

    var result = parseUxCypher(uxCypher);
    //console.log('result ', result);
    expect(result.name).toBe('Create user {ux_user}');
    expect(result.cypher).toBe(`WITH ux_user as email
MERGE (u:User {email: email})
MERGE (settings:UserSettings {email: email})
MERGE (u)-[:HAS_USER_SETTINGS]->(settings)`);
    expect(Object.keys(result.userInputs).length).toBe(1);
    var userInput = Object.values(result.userInputs)[0];
    expect(userInput.variableName).toBe('ux_user');
    expect(userInput.uxControl).toBe('TextField');
    expect(userInput.helperCall).toStrictEqual({});
});

test('test parseUxCypher title', () => {
    var uxCypherString = `
    // Create user {ux_user}
    /*
        ux_user = TextField
    */
    WITH ux_user as email
    MERGE (u:User {email: email})
    MERGE (settings:UserSettings {email: email})
    MERGE (u)-[:HAS_USER_SETTINGS]->(settings)
    `;

    var uxCypher = parseUxCypher(uxCypherString);
    var parsedTitle = parseUxCypherTitle(uxCypher);
    expect(parsedTitle.length).toBe(2);
    expect(parsedTitle[0]).toBe("Create user ");
    var secondPart = parsedTitle[1];
    expect(secondPart instanceof UserInput).toBeTruthy();
    expect(secondPart.variableName).toBe('ux_user');
    expect(secondPart.uxControl).toBe('TextField');
});

test('test multi control cypher title', () => {
    var uxCypherString = `
    // Assign an email domain {ux_emailDomain} to a Security Organization {ux_securityOrg}
    /*
        ux_emailDomain = TextField
        ux_securityOrg = TextField
    */
    RETURN 'foo';
    `
    var uxCypher = parseUxCypher(uxCypherString);
    var parsedTitle = parseUxCypherTitle(uxCypher);
    expect(parsedTitle.length).toBe(4);
    expect(parsedTitle[0]).toBe("Assign an email domain ");

    var secondPart = parsedTitle[1];
    expect(secondPart instanceof UserInput).toBeTruthy();
    expect(secondPart.variableName).toBe('ux_emailDomain');
    expect(secondPart.uxControl).toBe('TextField');

    expect(parsedTitle[2]).toBe(" to a Security Organization ");

    var fourthPart = parsedTitle[3];
    expect(fourthPart instanceof UserInput).toBeTruthy();
    expect(fourthPart.variableName).toBe('ux_securityOrg');
    expect(fourthPart.uxControl).toBe('TextField');
    
});

test('test parseUxCypher 2', () => {
    var uxCypher = `
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
    RETURN user;`

    var result = parseUxCypher(uxCypher);
    //console.log('result ', result);
    expect(result.name).toBe('Change user {ux_email} to new security organization {ux_securityOrg} (delete existing security organization membership)');
    expect(result.cypher).toBe(`WITH ux_securityOrg as newOrgName, ux_email as email
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
RETURN user;`);
    expect(Object.keys(result.userInputs).length).toBe(2);
    var userInput1 = Object.values(result.userInputs)[0];
    var userInput2 = Object.values(result.userInputs)[1];
    expect(userInput1.variableName).toBe('ux_email');
    expect(userInput1.uxControl).toBe('Autocomplete');

    var helper1 = userInput1.helperCall;
    expect(helper1.helperName).toBe('cypher.ux.find');
    expect(helper1.helperParamValues).toStrictEqual(["User", "email"]);
    expect(helper1.returnName).toBe("result");

    expect(userInput2.variableName).toBe('ux_securityOrg');
    expect(userInput2.uxControl).toBe('Autocomplete');

    var helper2 = userInput2.helperCall;
    expect(helper2.helperName).toBe('cypher.ux.find');
    expect(helper2.helperParamValues).toStrictEqual(["SecurityOrganization", "name"]);
    expect(helper2.returnName).toBe("result");
});

test('test suite', () => {
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
        SET s:DefaultPublic;`
    
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

    expect(result.uxCyphers.length).toBe(2);
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