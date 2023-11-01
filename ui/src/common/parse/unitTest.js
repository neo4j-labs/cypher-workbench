
function Assertion () {
    this.assertion = '';
    this.left = '';
    this.condition = '';
    this.right = '';
}

function TestCase () {
    this.name = '';
    this.cypher = '';
    this.returnVars = [];
    this.assertions = [];
}

function parseTestCypher (testCypher) {
    var lines = testCypher.split('\n');
    var nameCaptured = false;
    var inCommentBlock = false;

    var conditionals = ['<>','<=','>=','=','<','>','IS NULL','IS NOT NULL'];
    var regexes = {
        firstLine: /^\/\/(.+)/,
        beginComment: /^\/\*/,
        endComment: /\*\/$/,
        return: /^RETURN (.+)/i,
        expect: /^expect (.+)$/
    }

    var testCase = new TestCase();
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

            if (match && key === 'beginComment') {
                //console.log('beginComment');
                testCase.assertions = [];
                inCommentBlock = true;
            } else if (match && key === 'endComment') {
                //console.log('endComment');
                inCommentBlock = false;
            }

            if (inCommentBlock) {
                if (match && key === 'expect') {
                    var expect = match[1].trim();
                    var assertion = new Assertion();
                    testCase.assertions.push(assertion);
                    assertion.assertion = expect.replace("'","\\'");
                    for (var i = 0; i < conditionals.length; i++) {
                        var index = expect.indexOf(conditionals[i]);
                        if (index >= 0) {
                            assertion.left = expect.substring(0, index).trim();
                            assertion.condition = conditionals[i];
                            assertion.right = expect.substring(index + conditionals[i].length).trim();
                            break;
                        }
                    }
                }
            } else {
                if (match && key === 'firstLine' && !nameCaptured) {
                    //console.log('firstLine');
                    testCase.name = match[1].trim();
                    nameCaptured = true;
                } else if (match && key === 'return') {
                    //console.log('return');
                    var returnClause = match[1].trim();
                    testCase.returnVars = returnClause.split(',').map(x => x.trim());
                    testCase.cypher += (testCase.cypher) ? '\n' + x : x;
                } else {
                    testCase.cypher += (testCase.cypher) ? '\n' + x : x;
                }
            }
        });
    // for cypher delimit single quotes
    testCase.cypher = testCase.cypher.replace("'","\\'")    
    return testCase;
}

function renderTestCypher (testCase) {
    var assertions = testCase.assertions.map(x => x.assertion).join(',\n\t\t');
    var assertionCaseStatements = testCase.assertions.map((x,index) => `
        CASE WHEN ${x.assertion} THEN {
            assertion: testParams.assertions[${index}],
            pass: true
        } ELSE {
            assertion: testParams.assertions[${index}],
            pass: false,
            expected: ${x.right},
            actual: ${x.left}
        } END as assertion${index}
    `);
    
    var indexArray = Array.from(Array(testCase.assertions.length).keys()); // make an array like [0,1,2]
    var assertionResults = indexArray.map(x => `assertion${x}`);

    var cypherTest = `
        WITH {
            name: ${testCase.name},
            assertions: [
                ${assertions}
            ]
        } as testParams
        CALL apoc.cypher.run(
            ${testCase.cypher}, {}) YIELD value
        WITH testParams,
            ${assertionCaseStatements.join(',\n')}
        RETURN testParams.name as name, ${assertionResults.join(', ')}
    `
    return cypherTest;
}

module.exports = {
    parseTestCypher: parseTestCypher,
    renderTestCypher: renderTestCypher
};
