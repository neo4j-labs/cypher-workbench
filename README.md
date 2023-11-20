
## Cypher Workbench
Cypher Workbench (also known as Solutions Workbench) is a cloud based tool that assists Neo4j developers in creating and maintaining solutions built on top of Neo4j. Cypher Workbench provides support throughout the entire solution development lifecycle from project inception through testing. Additionally, with its reverse engineering, validation, and debugging capabilities, it can be used to introspect existing Neo4j deployments to assist with maintenance, documentation, or troubleshooting.

Online help for Cypher Workbench can be found here: https://help.neo4j.solutions/neo4j-solutions/cypher-workbench/.

Neo4j runs Cypher Workbench as a SaaS offering for select Customers and Partners, and has been used by over one hundred customers to build thousands of data models. Neo4j elected to move the Cypher Workbench project to Neo4j labs, and to open source the code.

## Project Structure
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

### Updating the encryption key
When using the default `local` authentication scheme, there is a simple encryption process for encrypting a user's password. The encryption key used is set both at the UI and API layers. It is not required to modify this key, but it is recommended before creating any users. Once you have created users, do not modify it again.
* *api/.env*: ENCRYPTION_KEY=workbenchEncryptionKey
* *ui/.env*: REACT_APP_ENCRYPTION_KEY=workbenchEncryptionKey

Pick a new value, and make sure the new value is set in both files.

#### Docker Notes
If you build the docker images and you have changed the key, please change the encyption key value in:
* docker/sw-config/sw-config/sw-ui-template/env-config.js.template
* docker/workbench_labs_files/docker-compose-labs.yml

These settings can also be changed after doing a docker deployment.

### Creating the first user
You will need to create at least one user to use Cypher Workbench. In the *api* project, after you have setup the database and installed the code, run:

```
npm run createUser Neo4j <username> <password> "Full Name" ""
```

Example:
```
npm run createUser Neo4j admin.user@yourorg.com password "First Last" ""
```

Upon success, this will create a node in the database with the :User and :Admin label. To create additional users, you can run the same command, but in the last argument specify the `:Admin` user email, which is the first email address you created.

Example: 
```
npm run createUser Neo4j new.user@yourorg.com password "First Last" admin.user@yourorg.com
```

### Build and run the UI
Follow the instructions in the *ui* README file to build and run the UI.

## License File
Cypher Workbench was built with different licensing options in mind. Tools can be turned off or on depending on the license. The license that comes with the code is a Labs license, and only turns on the Modeler and the Database tools. 

You can dive into the license code to turn on the other tools, or if you are working with an existing team at Neo4j, request an upgraded license file.