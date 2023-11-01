
import { 
    createUserSignUp
  } from "../models/users";
import dotenv from "dotenv";
import { setDriver } from '../util/run';
import neo4j from "neo4j-driver";
dotenv.config();

function initNeoDriver () {

    var driverConfig = {
        disableLosslessIntegers: true
    };
    if (!process.env.NEO4J_URI.match(/bolt\+s/) && !process.env.NEO4J_URI.match(/neo4j\+s/)) {
        driverConfig.encrypted = (process.env.NEO4J_ENCRYPTED === "true") ? true : false;
    }
      
    const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
    const user = process.env.NEO4J_USER || "neo4j";
    const pass = process.env.NEO4J_PASSWORD || "password";
    
    const driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, pass),
        driverConfig
      );
      setDriver(driver);
}
initNeoDriver();

var args = process.argv;
var commandLineArgs = args.slice(2);
console.log(commandLineArgs);

if (commandLineArgs.length < 4) {
    console.log("Usage: <primaryOrganization> <email> <password> <name> [adminEmail]");
    process.exit(1);
}

var primaryOrganization = commandLineArgs[0];
var email = commandLineArgs[1];
var password = commandLineArgs[2];
var name = commandLineArgs[3];
var adminEmail = commandLineArgs[4];
var picture = "";

async function callCreateUser () {
    try {
        var result = await createUserSignUp({
            primaryOrganization, 
            email, 
            password, 
            name, 
            picture
        },
        { email: adminEmail });
        console.log(result);
    } catch (e) {
        console.log(e);
    }
    process.exit(0);
}
callCreateUser();
