
// I can't seem to run the VS Code debugger through Jest
//  therefore I'm making this file so I can run a specific test and stop it in the debugger

import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';

import { WhereClause, whereItem } from './cypherWhere';
import { testConvertCypherAndReturnStrings } from './cypherStringConverter.test';
import CypherClause from './cypherClause';
import SubQueryClause from './cypherSubQuery';
import { ReturnClause } from './cypherReturn';
import { buildPattern, buildOneNodePattern, buildNodeRelNodePattern } from './debugStatement.test';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

const test = (desc, functionToTest) => {
    console.log(`running ${desc}`);
    functionToTest();
}

const runTest = () => {

    // test ('test QPP', () => {       
    //     testConvertCypherAndReturnStrings("MATCH ((x)-[r]->(z) WHERE z.p > x.p){2,3}");
    // });

    test('get subQuery debug snippets', () => {
        var subQueryClause = new SubQueryClause()
        var returnBody = new ReturnClause({ limit: ''});
        returnBody
            .item('person', 'name')
    
        var returnClause = new CypherClause({
            keyword: 'RETURN',
            clauseInfo: returnBody
        });
    
        // var pattern = buildOneNodePattern();
        var pattern = buildNodeRelNodePattern();
        var cypherMatchClause = new CypherClause({
            keyword: 'MATCH',
            clauseInfo: pattern
        });
    
        var withClause = new CypherClause({ keyword: 'WITH', clauseInfo: 'x' });
        subQueryClause.clauses = [withClause, cypherMatchClause, returnClause];
    
        var snippetSet = subQueryClause.getDebugCypherSnippetSet();
    })
    
}

runTest();
