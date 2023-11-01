import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import { VERSION } from '../version';

dotenv.config();
console.log('process.env.NEO4J_URI: ' + process.env.NEO4J_URI);


var driverConfig = {
    userAgent: `neo4j-cypher-workbench-api/v${VERSION}`
};
if (!process.env.NEO4J_URI.match(/bolt\+s/) && !process.env.NEO4J_URI.match(/neo4j\+s/)) {
    driverConfig.encrypted = (process.env.NEO4J_ENCRYPTED === "true") ? true : false;
}

var driver;
/*
export const driver = neo4j.driver(
    process.env.NEO4J_URI || "bolt://localhost:7687",
    neo4j.auth.basic(
      process.env.NEO4J_USER || "neo4j",
      process.env.NEO4J_PASSWORD || "password"
  ),
  driverConfig
);
*/

export const setDriver = (localDriver) => {
    driver = localDriver;
}

export const runQuery = async (query, args) => {
    const session = (process.env.NEO4J_DATABASE) ? 
        driver.session({database: process.env.NEO4J_DATABASE}) : driver.session();
    //const session = driver.session();

    try {
        const result= await session.run(query, args);
        session.close();
        return result;
    } catch (error) {
        //console.log(error);
        session.close();
        return error;
    }
};

export const runQueryWithDriverAndConfig = async(localDriver, sessionParams, query, args, config) => {
    const session = (sessionParams && sessionParams.databaseName) ? 
        localDriver.session({database: sessionParams.databaseName}) : localDriver.session();
    try {
        const result= await session.run(query, args, config);
        session.close();
        return result;
    } catch (error) {
        session.close();
        return error;
    }
}
