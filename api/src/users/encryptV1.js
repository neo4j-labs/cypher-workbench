
import { encryptV1 } from "../util/encryption";

var args = process.argv;
var commandLineArgs = args.slice(2);
console.log(commandLineArgs);

if (commandLineArgs.length < 1) {
    console.log("Usage: <password>");
    process.exit(1);
}

console.log(encryptV1(commandLineArgs[0]));