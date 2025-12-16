
This file explains the docker build concepts and packaging process for building Cypher Workbench Labs.

# Building

There are several goals to the build process:

* Create a Local build, by putting in the proper .env and env-config.js files that correspond to the docker images
* Create an easily deployable file containing all info needed to re-create the required docker images
* Do a build in separate folder other than the api and ui folders

The `.env` file corresponds to the `cypher-workbench-api` image and the `env-config.js` corresponds to the `cypher-workbench-ui` image.

> Build instructions are for Mac/Linux. Windows instructions have not been created.

## Doing a build

Before doing a build, you must ensure the WORKBENCH_VERSION environment variable is set. You can run this command to set it:

```
    source ./getVersion.sh
```

This will read the ../ui/src/version.js file and use the value to set the WORKBENCH_VERSION environment variable.

To perform a build, run the following command:

```
    ./build_labs.sh
```

Running this will do the following:

* Run `./build_labs.sh` in the api folder
* Run `./build_labs.sh` in the ui folder
* Package up the resulting docker images using `docker save`
* Create an overall `.tar` file that contains all files including the docker-compose file and the `workbench_labs` shell script

## Docker images

In both the `./api` and `./ui` folders, the `build_labs.sh` file will copy the source code from the parent level api and ui folders, then will perform an npm install, an appropriate build, and package everything into a docker image.

The commands that create the docker images are:

```
docker build -f Dockerfile.ui ./ui/docker_context -t cypher-workbench-ui:${WORKBENCH_VERSION}_labs

docker build -f Dockerfile.api ./api -t cypher-workbench-api:${WORKBENCH_VERSION}_labs
```

The build script uses `docker save` to tar-gzip these docker images into the workbenchDocker.tar.gz file.

## Build artifacts

The build will create `./build` folder and copy the following files into it:

* docker-compose-labs.yml
* workbenchDocker.tar.gz
* workbench_labs
* envConfig.sh
* makeEnv.sh
* makeEnvConfig.sh

Once these files are there, they are tar-ed into a file called `cypherWorkbenchLabs.tar`. The `cypherWorkbenchLabs.tar` file is the only thing that needs to be shared with someone to perform a local install.

# Installation

## Unpacking

Unpacking involves creating a directory to run in (e.g. cypher_workbench), placing the `cypherWorkbenchLabs.tar` file in that directory, and un-tarring it.

This will expand into the 4 files mentioned under Build artifacts.

Once the 4 files are there you can run:

```
    ./workbench_labs unpack
```

## Database Setup

Follow the instructions in the main project README.md file in these sections

* Setup a Neo4j database
* Cypher initialization scripts

To setup a Neo4j database to use with Cypher Workbench. 

> Do not proceed without doing the steps above

Since you are doing the Docker install, you can skip these sections

* Build and run the API
* Build and run the UI

Don't try to login yet until you finish configuration and start the docker containers.

## Configuring

After unpacking, you need to modify the `docker-compose.yml` file and set the values to connect to your Neo4j database.

Change these settings to the Neo4j instance you set up to use with Cypher Workbench:

```
    - NEO4J_URI=bolt://host.docker.internal:7687
    - NEO4J_USER=neo4j
    - NEO4J_PASSWORD=password
    - NEO4J_DATABASE=neo4j
```

Note that if you are running the database on the same machine as the API docker image, you should use `host.docker.internal` instead of `localhost`.

### Advanced Configuration
If you need to change the hostnames or ports, you can do so in the `envConfig.sh` file. You'll see these settings:

How the React UI is exposed:
* WORKBENCH_PROTOCOL=http
* WORKBENCH_HOST=localhost
* WORKBENCH_PORT_EXTERNAL=80
* WORKBENCH_PORT_INTERNAL=80

How the GraphQL API is exposed:
* GRAPHQL_PROTOCOL=http
* GRAPHQL_HOST=cypher-workbench-api
* GRAPHQL_PORT=4000

If you change something and it doesn't work, you'll have to trace the configs through the workbench_labs `start` command which ends up creating artifacts like `.env` for the API and `env-config.js` for the UI. Also look at the notes in the `docker-compose.yml` file for advice/clues. 


## Running

To start, you can use the following command:

```
    ./workbench_labs start
```

This will call docker-compose to start up the docker images.    

## Logging in

To login, goto:

http://localhost/login

And enter:

* Username: admin
* Password: neo4j

And click `Continue`. These settings presume you haven't changed any of the default config values, so if you have changed something, please update the values appropriately.


## Stopping

To stop, you can use the following command:

```
    ./workbench_labs stop
```

## Checking Docker container status

To check status, you can use the following command:

```
    ./workbench_labs status
```

# Concepts

Cypher Workbench is a GRANDStack application. Architecturally, GRANDStack applications consist of three tiers: a Neo4j database tier, a GraphQL node.js service tier, and a React UI tier. From a packaging perspective, we want to create docker images for each of these tiers, and run them so that they can talk with one another.  

## Networking concerns

The node.js GraphQL server typically runs on port 4000, and the React UI typically runs on port 3000, but for our deployment, the React UI is being hosted on nginx under port 80.   

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
   * Browser (host) -> Nginx / React UI web pages (docker)

2. When React executes network calls from within the browser:  
   * Browser/React (host) -> Nginx / GraphQL Services (docker) -> Neo4j (your instance)

For (1), we need to expose nginx port `WORKBENCH_PORT_INTERNAL` (running inside docker) as another port `WORKBENCH_PORT_EXTERNAL` which does not conflict with host ports. These are currently set to 80 in `envConfig.sh`. Change the `WORKBENCH_PORT_EXTERNAL` to something like 37080 if you have a port conflict.

```
 cypher-workbench-ui:
  ports:
    - ${WORKBENCH_PORT_EXTERNAL}:${WORKBENCH_PORT_INTERNAL}
    #- "80:80"  # these are the default values
```

The browser can go to http://localhost:`WORKBENCH_PORT_EXTERNAL` (e.g. http://localhost:80) to access the web pages hosted by the nginx web server.

This is captured in the `env-config.js` for the React build:

```
    REACT_APP_BASE_URL=http://localhost:80
```

For (2), the browser has loaded the React UI into the browser, and the React UI needs to make service calls to the GraphQL service endpoints. Since the browser is running in the host, we need to connect to the GraphQL service endpoint through a port exposed to the host. This is configured in the `env-config.js` using the template:

```
REACT_APP_GRAPHQL_URI: "${WORKBENCH_PROTOCOL}://${WORKBENCH_HOST}:${WORKBENCH_PORT}/graphql
```

Which connects back to the nginx server hosting the React app. The nginx server has a proxy for the `/graphql` route:

```
    location /graphql {
        proxy_pass ${GRAPHQL_PROTOCOL}://${GRAPHQL_HOST}:${GRAPHQL_PORT}/graphql;
    }
```

Which corresponds to these settings in the `docker-compose.yml` file:

```
    - HOST_NAME=${GRAPHQL_HOST}
    - HOST_PROTOCOL=${GRAPHQL_PROTOCOL}
    - GRAPHQL_LISTEN_PORT=${GRAPHQL_PORT} 
```






