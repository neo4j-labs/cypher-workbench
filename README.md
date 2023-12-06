
## Cypher Workbench
Cypher Workbench (also known as Solutions Workbench) is a cloud based tool that assists Neo4j developers in creating and maintaining solutions built on top of Neo4j. Cypher Workbench provides support throughout the entire solution development lifecycle from project inception through testing. Additionally, with its reverse engineering, validation, and debugging capabilities, it can be used to introspect existing Neo4j deployments to assist with maintenance, documentation, or troubleshooting.

Online help for Cypher Workbench can be found here: https://help.neo4j.solutions/neo4j-solutions/cypher-workbench/.

Neo4j runs Cypher Workbench as a SaaS offering for select Customers and Partners, and has been used by over one hundred customers to build thousands of data models. Neo4j elected to move the Cypher Workbench project to Neo4j labs, and to open source the code.

## Running Cypher Workbench
The project is divided into 3 main folders:
* *api*: contains the GraphQL and Cypher server code
* *ui*: contains the React UI
* *docker*: build scripts to bundle the API and UI as docker containers

To run the code locally, you will need to do 3 things:
* Setup a Neo4j database
* Build and configure the *api*
* Build and configure the *ui*

### Setup a Neo4j database
You will need to setup an Aura instance or a Neo4j database to use as the backend storage for Cypher Workbench. 

* If you are running Aura or Neo4j Community, you will use the default database `neo4j`.
* If you are running Neo4j Enterprise Edition, you can:
  * Use the default database `neo4j`
  * Create a new database. See this [link](https://neo4j.com/docs/cypher-manual/current/administration/databases/#administration-databases-create-database) for instructions on how to create a Neo4j database.
* For Neo4j Community or Enterprise Edition, you will also need to install APOC Core. For instructions on how to do this, please follow this [link](https://neo4j.com/docs/apoc/current/installation/). 
  * Aura users will already have this installed.

### Cypher initialization scripts
Within the folder `docker/sw-config/sw-config/sw-db-setup/` you will find a few Cypher scripts:

* cypher_constraints_v4.3.cypher
* cypher_constraints_v4.4_to_5.cypher
* cypher_init_data.cypher

Pick the cypher_constraints file that matches the database version you are running. If you are running a version older than 4.3, you may have to manually adjust the syntax to match the expected syntax of your Neo4j version.

Follow these steps to run the Cypher:

* Run either Neo4j Browser or Workspace and connect to your Neo4j database
* Copy/paste the correct `cypher_constraints_vX.X.cypher` into Browser/Workspace and execute it
  * If running in Browser, make sure this setting is checked: "Enable multi statement query editor"
* Copy/paste the `cypher_init_data.cypher` file into Browser/Workspace and execute it

Your database is now ready to be used.

### Build and run the API
Follow the instructions in the *api* README file to build and run the API.

### Build and run the UI
Follow the instructions in the *ui* README file to build and run the UI.

### Login
Assuming you installed this locally, use your web browser to navigate to http://localhost:3000. You will be presented with a login screen. 

Enter `admin` for email and `neo4j` for password and hit `<Enter>` or click the `Continue` button. You should now be logged in.

## Advanced topics
These sections describe further optional configuration.

### Updating the encryption key
When using the default `local` authentication scheme, there is a simple encryption process for encrypting a user's password. The encryption key used is set both at the UI and API layers. It is not required to modify this key, but it is recommended before creating any users. Once you have created users, do not modify it again.
* *api/.env*: ENCRYPTION_KEY=workbenchEncryptionKey
* *ui/.env*: REACT_APP_ENCRYPTION_KEY=workbenchEncryptionKey

Pick a new value, and make sure the new value is set in both files. You will need to restart the api and ui projects if they are running.

Additionally, the default `admin` user will no longer work. See *Creating Users* below on how to fix this.

#### Docker Notes
If you build the docker images and you have changed the key, please change the encyption key value in:
* docker/sw-config/sw-config/sw-ui-template/env-config.js.template
* docker/workbench_labs_files/docker-compose-labs.yml

These settings can also be changed after doing a docker deployment.

### Creating users
The `cypher_init_data.cypher` created the default `admin` user. If you want to create additional users, in the *api* project, after you have setup the database and installed the code, run:

```
npm run createUser Neo4j <username> <password> "Full Name" "admin"
```

Example:
```
npm run createUser Neo4j first.last@yourorg.com password "First Last" "admin"
```

Upon success, this will create a node in the database with the :User.

#### Updating admin user password after encryption key change
If you changed the encryption key, the default `admin` user's password can no longer be decrypted. To fix this run the following:
```
npm run createUser Neo4j admin neo4j "Workspace Admin" "admin"
```
This will update the `neo4j` password to use the new encryption key. You can also change the default `neo4j` password to something else using this technique.
