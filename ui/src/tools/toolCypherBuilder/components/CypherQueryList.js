import React, { Component } from 'react'
import {
    Button, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip
} from '@material-ui/core';

import { USER_ROLE } from '../../../common/Constants';
import { parseUxCypherSuite } from '../../../common/parse/cypherTemplate';
import CypherUxControl from './CypherUxControl';
import ActiveCypherQuery from './ActiveCypherQuery';


var uxCypherSuite_UsersAndSecurityOrganizations = `
// @CypherSuite Users and Security Organizations

// @Helper cypher.ux.find($nodeLabel, $property)
WITH $ux_value as searchTerm
MATCH (n:$nodeLabel) 
WHERE toLower(n.$property) CONTAINS toLower(searchTerm) 
RETURN n.$property as result;

// Create new Security Organization with name {ux_name}
/*  
    ux_name = TextField
*/
WITH $ux_name as orgName
MERGE (s:SecurityOrganization {name:orgName});

// Make Security Organization {ux_securityOrg} the DefaultPublic organization
/*
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH $ux_securityOrg as orgName
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
WITH $ux_securityOrg as orgName, $ux_emailDomain as emailDomain
MATCH (s:SecurityOrganization {name:orgName})
MERGE (domain:EmailDomain {name:emailDomain})
MERGE (domain)-[:BELONGS_TO]->(s);

// Remove an Email Domain {ux_emailDomain} from Security Organization {ux_securityOrg}
/*
    ux_emailDomain = Autocomplete:cypher.ux.find("EmailDomain", "name").result
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH $ux_securityOrg as orgName, $ux_emailDomain as emailDomain
MATCH (domain:EmailDomain {name:emailDomain})-[r:BELONGS_TO]->(s:SecurityOrganization {name:orgName})
DELETE r;

// Remove Security Organization {ux_securityOrg}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH $ux_securityOrg as orgName
MATCH (s:SecurityOrganization {name:orgName})
DETACH DELETE s;

// Assign Security Organization {ux_securityOrg} to License {ux_license}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
   ux_license = Autocomplete:cypher.ux.find("SoftwareEdition", "name").result
*/
WITH $ux_securityOrg as orgName, $ux_license as license
MATCH (s:SecurityOrganization {name:orgName})
MATCH (edition:SoftwareEdition {name: license})
MERGE (s)-[:LICENSED_FOR]->(edition);

// Switch Security Organization {ux_securityOrg} to license {ux_license}
/*
   ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
   ux_license = Autocomplete:cypher.ux.find("SoftwareEdition", "name").result
*/
WITH $ux_securityOrg as orgName, $ux_license as license
MATCH (s:SecurityOrganization {name:orgName})-[r:LICENSED_FOR]->(edition:SoftwareEdition)
DELETE r
WITH s, license
MATCH (edition:SoftwareEdition {name: license})
MERGE (s)-[:LICENSED_FOR]->(edition);

// Create user {ux_user}
/*
    ux_user = TextField
*/
WITH $ux_user as email
MERGE (u:User {email: email})
MERGE (settings:UserSettings {email: email})
MERGE (u)-[:HAS_USER_SETTINGS]->(settings);

// Assign existing user {ux_user} to Security Organization {ux_securityOrg}
/*
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
    ux_user = Autocomplete:cypher.ux.find("User", "email").result
*/
WITH $ux_securityOrg as orgName, $ux_user as email
MATCH (u:User {email: email}), (settings:UserSettings {email:email}), (s:SecurityOrganization {name:orgName})
SET u.primaryOrganization = s.name
MERGE (u)-[:MEMBER]->(s)
WITH *
CALL apoc.create.addLabels([u], [s.name]) YIELD node as user
WITH *
CALL apoc.create.addLabels([settings], [s.name]) YIELD node
RETURN user;

// Change user {ux_email} to new security organization {ux_securityOrg} (delete existing security organization membership)
/*
    ux_email = Autocomplete:cypher.ux.find("User", "email").result
    ux_securityOrg = Autocomplete:cypher.ux.find("SecurityOrganization", "name").result
*/
WITH $ux_securityOrg as newOrgName, $ux_email as email
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
WITH $ux_email as email, $ux_securityOrg as orgName
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
WITH $ux_email as email
MATCH (u:User {email: email})-[r:MEMBER]->(s:SecurityOrganization)
SET u.primaryOrganization = ''
DELETE r
WITH *
CALL apoc.create.removeLabels([u], [s.name]) YIELD node
RETURN node;
`

export default class PropertyDefinitions extends Component {

    state = {
        filterValue: '',
        activeCypherQuery: null,  
        uxSuite: {}      
    }

    showDeleteModelDialog = () => {

    }

    /*
        - click on a list item to put it in the run area
        - add a run area
          - component should be rendered like <p>Text</p><TextField/><p>More Text</p>etc
          - make a component that renders a react component based on input of TextField or Autocomplete
          - copy/modify Autocomplete from other code area (tags / customers)
            - auto complete will submit cypher directly to active Cypher connection
          - don't activate Run button until connected to a Neo4j database
          - TextField / Autocomplete should output ux_value
        - With ux_value, 
    */

    constructor () {
        super();
    }

    componentDidMount () {
        this.setState({
            uxSuite: parseUxCypherSuite(uxCypherSuite_UsersAndSecurityOrganizations)
        })
    }

    setValue = (stateProp) => (newVal) => {
        this.setState({
            ...this.state,
            [stateProp]: newVal
        });
    }

    makeQueryActive = (cypherQuery) => {
        //alert(JSON.stringify(cypherQuery));
        this.setState({
            activeCypherQuery: cypherQuery
        });
    }

    setFilterValue = (e) => {
        this.setState({
            filterValue: e.target.value
        })
    }

    render () {
        var { uxSuite, activeCypherQuery, filterValue } = this.state;
        var filterTokens = filterValue.toLowerCase().split(' ').map(x => x.trim());

        var headers = {
            name: {
                text: 'Name',
                minWidth: '400px'
            },
            cypher: {
                text: 'Cypher',
                minWidth: '400px'
            }
        };
        var cypherQueries = [];
        if (uxSuite && uxSuite.uxCyphers) {
            cypherQueries = uxSuite.uxCyphers
                .filter(x => {
                    var lowerX = x.name.toLowerCase();
                    return filterTokens.every(token => lowerX.indexOf(token) !== -1);
                })
                .map((x, index) => {
                    var returnVal = { ...x };
                    returnVal.id = index;
                    return returnVal;
                });
        }

        return (
            <div>
                <TextField id="ux_textField" label={'Filter'} style={{width:'20em'}}
                    value={filterValue} 
                    onChange={this.setFilterValue}
                    margin="dense"/>

                <ActiveCypherQuery uxCypher={activeCypherQuery} uxCypherSuite={uxSuite}/>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                    <TableRow>
                        {Object.keys(headers).map(headerKey =>
                            <TableCell key={headerKey} style={{minWidth:headers[headerKey].minWidth}}>{headers[headerKey].text}</TableCell>
                        )}
                        <TableCell>Actions</TableCell>
                    </TableRow>
                    </TableHead>
                    <TableBody>
                        {cypherQueries.map(cypherQuery =>
                            <TableRow key={cypherQuery.id} hover={true} onClick={() => this.makeQueryActive(cypherQuery)}>
                                {Object.keys(headers).map(headerKey =>
                                    <TableCell key={headerKey} style={{minWidth:headers[headerKey].minWidth}}>{cypherQuery[headerKey]}</TableCell>
                                )}
                                <TableCell>
                                {(cypherQuery.userRole === USER_ROLE.OWNER) &&
                                    <Tooltip enterDelay={600} arrow title="Delete Query">
                                        <Button color={'primary'} onClick={(event) => this.showDeleteModelDialog(event, cypherQuery.id)}>
                                            <span className="fa fa-trash"/>
                                        </Button>
                                    </Tooltip>
                                }
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        )
    }

}
