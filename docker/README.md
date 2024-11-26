
This file explains the docker build concepts and packaging process for building Cypher Workbench Basic.

# Concepts

Cypher Workbench is a GRANDStack application. Architecturally, GRANDStack applications consist of three tiers: a Neo4j database tier, a GraphQL node.js service tier, and a React UI tier. From a packaging perspective, we want to create docker images for each of these tiers, and run them so that they can talk with one another.  

## Networking concerns

Standard Neo4j ports are 7474, 7473, and 7687. The node.js GraphQL server typically runs on port 4000, and the React UI typically runs on port 3000, but for our deployment, the React UI is being hosted on nginx under port 80.   

Our goal is to let the individual docker images talk with one another, but not conflict with ports on the host machine if at all possible.

To achieve this we use the feature in docker-compose to create a private network between the different instances, and use docker's `ports` configuration option to expose internal standard ports as different ports to the host machine.

When the following command is run to bring up the docker instances, the --project-name field tells docker to create a private network called `cypher-workbench`.

```
  docker-compose --project-name cypher-workbench up -d --remove-orphans
```

Within this private network, the individual processes can run on their standard ports and not conflict with the host machine. However, for the React UI, since it runs in a web browser it does not have access to the internal network and must use the ports exposed in the docker-compose.yml file.

For instance:

```
 ports:
 - "37400:4000"
```

Specifies that port 4000 in the internal `cypher-workbench` network, should be exposed to the host as port 37400. This is important from a configuration perspective and will be explained in more detail in the next section.

## Detailed Networking walk-through

We need to get this to work:

Browser -> Web UI -> GraphQL Services -> Neo4j

To clarify where things are running we need to be more specific:

1. When fetching pages:
   * Browser (host) -> React UI web pages (docker)

2. When React executes network calls from within the browser:  
   * Browser/React (host) -> GraphQL Services (docker) -> Neo4j (docker)

For (1), we need to expose nginx port 80 (running inside docker) as another port which does not conflict with host ports. We have chosen 37080, but this can be changed in docker-compose.yml if desired.

```
 cypher-workbench-ui:
  ports:
    - "37080:80"
```

The browser can go to http://localhost:37080 to access the web pages hosted by the nginx web server.

This is captured in the .env for the React build:

```
    REACT_APP_BASE_URL=http://localhost:37080
```

For (2), the browser has loaded the React UI into the browser, and the React UI needs to make service calls to the GraphQL service endpoints. Since the browser is running in the host, we need to connect to the GraphQL service endpoint through a port exposed to the host. I have chosen port 37400 as seen here:

```
 cypher-workbench-api:
  ports:
    - "37400:4000"
```

This is captured in the .env for the React build:

```
    REACT_APP_GRAPHQL_URI= http://localhost:37400/graphql
```

Continuing with (2), we need GraphQL node.js services (docker) to talk to Neo4j (docker).

* What not to do:
  * If we were to configure our .env file to connect to http://localhost:7687 or even http://localhost:37687 (if we exposed it as 37687:7687) intuitively it seems like it would work. But it does not work, because from the perspective of the GraphQL node.js process, localhost is the container it is running in, and it does not refer to the host machine.
    * If you do need to connect to the actual localhost, which is the machine running the docker container, then you use `host.docker.internal`. For instance, to connect to the Neo4j db running on the localhost machine, and not part of the docker-compose configuration, use: `http://host.docker.internal:7687`.

* What to do:
  * We need to rely on the internal network docker created for us called `cypher-workbench`. Within this network, the Neo4j database is known as the host `cypher-workbench-neo`. This name is picked up from the docker-compose file. We let `cypher-workbench-api` (the GraphQL service) know about `cypher-workbench-neo` using the `links:` section as defined below.

```
 cypher-workbench-neo:
   ports:
    - "37474:7474"
    - "37687:7687"
 cypher-workbench-api:
   links:
    - cypher-workbench-neo
```

  * In the docker-compose file we are exposing ports 7474 and 7687 to the host as 37474 and 37687, respectively. However, within the `cypher-workbench` internal network, we use the internal ports, not the exposed host ports. Therefore, you can see in the .env for the api build:

```
    NEO4J_URI=bolt://cypher-workbench-neo:7687
```

  * We are using `cypher-workbench-neo` and 7687 to talk to Neo4j.

NOTE: We have exposed the Neo4j ports externally for access to the database from the Neo4j browser.

# Building

There are several goals to the build process:

* Create a Basic build, by taking away enterprise features
* Create a Local build, by putting in the proper .env files that correspond to the docker images
* Create an easily deployable file containing all info needed to re-create the required docker images and the seed database
* Do a build in separate folder, other than the api and ui folders, since files need to be deleted to create the Basic build

## Doing a build

Before doing a build, you must ensure the WORKBENCH_VERSION environment variable is set. You can run this command to set it:

```
    source ./getVersion.sh
```

This will read the ../ui/src/version.js file and use the value to set the WORKBENCH_VERSION environment variable.

To perform a build, run the following command:

```
    ./build_basic.sh
```

Running this will do the following:

* Run ./build_basic.sh in the api folder
* Run ./build_basic.sh in the ui folder
* Package up the resulting docker images using `docker save`
* Package up the seed database located in the `seedDatabase` directory
* Create an overall .tar file that contains all files including the docker-compose file and the 'workbench' shell script

## Basic build

As part of the ./build_basic.sh script, a command `node build_basic.js` is run. This command will search through all of the source directories looking for `build_basic.txt` files. Any `build_basic.txt` files it encounters are run as shell scripts. Typically, these files will delete files that are Enterprise version only, and swap in a stubbed out Basic version of the file.

## Local build

When running ./build_basic.sh in the api and the ui folder, we copy in the special api.env and ui.env files. These files not only contain the proper network settings, but also specify:

```
    REACT_APP_AUTH_METHOD=local (ui.env) - and -
    AUTH_METHOD=local (api.env)
```

This enables local authentication, turning off the auth0 authentication. The .env parameters needed by auth0 are not even included in the local build.     

## Docker images

In both the ./api and ./ui folders, the build_basic.sh file will copy the source code from the parent level api and ui folders, then will perform an npm install, an appropriate build, and package everything into a docker image.

The commands that create the docker images are:

* docker build -f Dockerfile.ui ./ui/docker_context -t cypher-workbench-ui:${WORKBENCH_VERSION}_basic
* docker build -f Dockerfile.api ./api -t cypher-workbench-api:${WORKBENCH_VERSION}_basic

The build script uses `docker save` to tar-gzip these docker images into the workbenchDocker.tar.gz file.

## Seed database

The seedDatabase folder contains the following directories:

* database/neo4j/data
* database/neo4j/logs
* database/neo4j/plugins

These directories are specified in the docker-compose file as `volumes` for the Neo4j docker image. The contents of each folder are as follows:

* database/neo4j/data
  * External to project: a seed database was created with the following items:
    * All Constraints and Indexes required by Cypher Workbench
    * A single node which has the SecurityOrganization and DefaultPublic labels, and is named Neo4jLocal
  * The data folder of the external seed database was copied to database/neo4j/data
* database/neo4j/logs
  * this folder is empty and is mounted for troubleshooting purposes
* database/neo4j/plugins
  * this folder contains the apoc plugin jar

During build, this directory gets tar-gzipped as seedDatabase.tar.gz and is packaged as part of the overall build.

## Build artifacts

The build will create ./build folder and copy the following files into it:

* docker-compose.yml
* seedDatabase.tar.gz
* workbenchDocker.tar.gz
* workbench

Once these files are there, they are tar-ed into a file called cypherWorkbenchBasic.tar. The cypherWorkbenchBasic.tar file is the only thing that needs to be shared with someone to perform a local install.

# Unpacking and Running

## Unpacking

Unpacking involves creating a directory to run in (e.g. cypher_workbench), placing the cypherWorkbenchBasic.tar file in that directory, and un-tarring it.

This will expand into the 4 files mentioned under Build artifacts.

Once the 4 files are there you can run:

```
    ./workbench unpack
```

This will expand the seed database into the `database` folder and the use `docker load` to load the docker images into the local directory.

## Running

To start, you can use the following command:

```
    ./workbench start
```

This will call docker-compose to start up the docker images. When running it is assumed that the seed database has been unzipped under the `database` folder so that the volume mounts specified in docker-compose.yml will work.   

To stop, you can use the following command:

```
    ./workbench stop
```

To check status, you can use the following command:

```
    ./workbench status
```
