# Cypher Workbench API
The GraphQL and Cypher API code for Cypher Workbench.

## Install Dependencies 

Install dependencies:

Run:
```
npm install
```

## Configure the .env file
Create a `.env` file by copying the `.env.example` file to `.env`. For the Neo4j database you created, set your Neo4j connection string and credentials in `.env`. For example:

*.env*

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j
```

## Start the API

Start the service:

```
npm start
```

This will start the Workbench GraphQL service (by default on localhost:4000) that is required by the UI.

For more instructions see the README file in the parent directory.

