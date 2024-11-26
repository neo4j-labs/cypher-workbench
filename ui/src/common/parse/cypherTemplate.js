
function HelperCall () {
    // cypher.ux.find("User", "email").result
    this.helperName = '';   // cypher.ux.find
    this.helperParamValues = [];  // ["User", "email"]  
    this.returnName = '';    // result
} 

export function UserInput () {
    this.variableName = '';
    this.uxControl = '';
    this.helperCall = {};
}

function UxBlock () {
    this.name = '';
    this.cypher = '';
}

function UxCypher () {
    this.name = '';
    this.userInputs = {};
    this.cypher = '';
    this.referencedNodeLabels = [];
    this.tags = [];
}

function UxCypherHelper () {
    // cypher.ux.find($nodeLabel, $property)
    this.name = ''; // cypher.ux.find
    this.parameters = []; // ['$nodeLabel', '$property']
    this.cypher = '';
}

function UxCypherSuite () {
    this.name = '';
    this.uxCyphers = [];
    this.cypherHelpers = {};
}

function splitOnString (stringToSplit, splitOn) {
    var index = stringToSplit.indexOf(splitOn);
    if (index >= 0) {
        return [stringToSplit.substring(0,index).trim(), stringToSplit.substring(index+1).trim()];
    } else {
        return [stringToSplit, ''];
    }
}

const parseParam = (param) => {
    var match = param.match(/['"](.*)['"]/);
    if (match) {
        return match[1];
    } else if (param === 'true') {
        return true;
    } else if (param === 'false') {
        return false;
    } else {
        var intValue = parseInt(param);
        var floatValue = parseFloat(param);
        if (intValue == floatValue) {
            return intValue;
        } else {
            if (!isNaN(floatValue)) {
                return floatValue;
            } else {
                return { variable: param }
            }
        }
    }
}

export const parseUxCypherHelper = (uxCypherHelperString) => {
    var uxCypherHelper = new UxCypherHelper();
    var uxBlock = parseUxBlock(uxCypherHelperString, uxCypherHelper);
    var helperText = uxBlock.name.match(/@Helper (.+)/)[1];
    var helperTokens = helperText.match(/(.*)\((.+)\)/);
    uxCypherHelper.name = helperTokens[1];
    uxCypherHelper.parameters = helperTokens[2].split(/,/).map(param => param.trim());
    uxCypherHelper.cypher = uxBlock.cypher;
    return uxCypherHelper;
}

export const parseUxCypher = (uxCypherString) => {
    var uxCypher = new UxCypher();
    var uxBlock = parseUxBlock(uxCypherString, uxCypher, (destinationObject, line) => {
        var userInput = new UserInput();
        var tokens = splitOnString(line, '=');
        userInput.variableName = tokens[0];
        var secondTokens = splitOnString(tokens[1], ':');
        userInput.uxControl = secondTokens[0];
        var helperCall = new HelperCall();
        var helperTokens = secondTokens[1].match(/(.*)\((.+)\)\.(.+)/);
        if (helperTokens) {
            helperCall.helperName = helperTokens[1];
            helperCall.helperParamValues = helperTokens[2].split(/,/)
                                                .map(param => parseParam(param.trim()));
            helperCall.returnName = helperTokens[3];
            userInput.helperCall = helperCall;
        }
        destinationObject.userInputs[userInput.variableName] = userInput;
    });
    uxCypher.name = uxBlock.name;
    uxCypher.cypher = uxBlock.cypher;
    return uxCypher;
}

export const parseUxCypherTitle = (uxCypher) => {
    var controls = uxCypher.name.match(/{[^{}]+}/g)
        .map(match => { 
            return [match, match.substring(1,match.length-1)];
        });
        
    var currentIndex = 0;
    var parts = [];
    for (var i = 0; i < controls.length; i++) {
        var control = controls[i];
        //console.log(control);
        var index = uxCypher.name.indexOf(control[0]);
        parts.push(uxCypher.name.substring(currentIndex, index));
        parts.push(uxCypher.userInputs[control[1]]);
        currentIndex = index + control[0].length;
    }
    //console.log('currentIndex: ', currentIndex);
    //console.log('uxCypher.name.length: ', uxCypher.name.length);
    if (currentIndex + 1 < uxCypher.name.length) {
        parts.push(uxCypher.name.substring(currentIndex));
    }
    //console.log(JSON.stringify(parts));
    return parts;
}

export const parseUxBlock = (uxCypher, destinationObject, commentLineHandler) => {

    var lines = uxCypher.split('\n');
    var nameCaptured = false;
    var capturedFirstCommentBlock = false;
    var inCommentBlock = false;

    var regexes = {
        firstLine: /^\/\/(.+)/,
        beginComment: /^\/\*/,
        endComment: /\*\/$/
        //,
        //return: /^RETURN (.+)/i
        //,
        //display: /^display (.+)$/
    }

    var uxCypher = new UxBlock();
    lines.map(x => x.trim())
        .filter(x => x)
        .map(x => {
            var matchResult = Object.keys(regexes)
                .map(key => {
                    //console.log('line = ' + x);
                    //console.log(`key ${key} checking regex: ${regexes[key]}`);
                    return { key: key, result: x.match(regexes[key])}
                })
                .find(keyValuePair => keyValuePair.result);

            var key, match;
            if (matchResult) {
                //console.log('match result ', matchResult);
                key = matchResult.key;
                //console.log('setting key to ' + key);
                match = matchResult.result;
                //console.log(' is match value truthy? ' + match ? true : false);
            }

            if (match && !capturedFirstCommentBlock 
                && !inCommentBlock && key === 'beginComment') {
                //console.log('beginComment');
                uxCypher.userInputs = {};
                inCommentBlock = true;
            } else if (match && inCommentBlock && key === 'endComment') {
                //console.log('endComment');
                inCommentBlock = false;
                capturedFirstCommentBlock = true;
            } else {
                if (inCommentBlock && !capturedFirstCommentBlock) {
                    if (commentLineHandler) {
                        commentLineHandler(destinationObject, x);
                    }
                    //console.log('userInput ', userInput);
                } else {
                    if (match && key === 'firstLine' && !nameCaptured) {
                        //console.log('firstLine');
                        uxCypher.name = match[1].trim();
                        nameCaptured = true;
                    } else {
                        //console.log('adding to cypher');
                        uxCypher.cypher += (uxCypher.cypher) ? '\n' + x.trim() : x.trim();
                    }
                } 
            }
        });
    return uxCypher;
}

export const parseUxCypherSuite = (cypherSuiteString) => {

    var suiteRegex = /^\/\/\s*@CypherSuite\s*(.+)/;
    var helperRegex = /^\/\/\s*@Helper\s*(.+)/;
    var endStatementIndex = /;$/;

    var lines = cypherSuiteString.split('\n');

    var inHelper = false;
    var inCypherStatement = false;
    var currentCypher = '';

    var uxCypherSuite = new UxCypherSuite();
    lines.map(x => x.trim())
        .filter(x => x)
        .map(x => {
            var match = x.match(suiteRegex);
            if (match) {
                uxCypherSuite.name = match[1];
            } else {
                if (inCypherStatement) {
                    currentCypher += '\n' + x;
                    if (x.match(endStatementIndex)) {
                        inCypherStatement = false;
                        if (inHelper) {
                            var cypherHelper = parseUxCypherHelper(currentCypher);
                            uxCypherSuite.cypherHelpers[cypherHelper.name] = cypherHelper;
                        } else {
                            uxCypherSuite.uxCyphers.push(parseUxCypher(currentCypher));
                        }
                        inHelper = false;
                        currentCypher = '';
                    }
                } else if (x.match(helperRegex)) {
                    inHelper = true;
                    inCypherStatement = true;
                    currentCypher = x;
                } else {
                    inCypherStatement = true;
                    currentCypher = x;
                }
            }
        });
    return uxCypherSuite;
}