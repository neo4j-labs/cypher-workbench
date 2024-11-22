
import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import { ReturnClause, returnItem } from './cypherReturn';
import { 
    DebugSteps,
    debugStep,
    DebugStepResult
} from './debugSteps';
import CypherStringConverter from './cypherStringConverter';
import CypherClause from './cypherClause';
import SubQueryClause from './cypherSubQuery';
import { OrderByClause, orderByItem, ORDER_DIRECTION } from './cypherOrderBy';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

export const buildPattern = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: '"Keanu"'})
    .link(
        cy.link()
            .rel('acted_in', ['ACTED_IN'])
            .node('movie', ['Movie'])
    )
    .link(
        cy.link()
            .rel('directed', ['DIRECTED']).left()
            .node('director', ['Director'])
    )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    return pattern;
}

export const buildOneNodePattern = () => {
    var path = cy.path()
        .node('person', ['Person'])
    
    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    return pattern;
}

export const buildNodeRelNodePattern = () => {
    var path = cy.path()
        .node('person', ['Person'], { name: '"Keanu"'})
        .link(
            cy.link()
                .rel('acted_in', ['ACTED_IN'])
                .node('movie', ['Movie'])
        )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    return pattern;
}

// same as above, but don't assign explicit variables for some items
const buildPatternSkipSomeVars = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: '"Keanu"'})
    .link(
        cy.link()
            .rel('', ['ACTED_IN'])
            .node('', ['Movie'])
    )
    .link(
        cy.link()
            .rel('', ['DIRECTED']).left()
            .node('director', ['Director'])
    )

    var part = cy.part().path(path);
    var pattern = cy.pattern().addPart(part);

    return pattern;
}

test ('debug MATCH and RETURN', () => {
    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('person', 'name')
        .item('movie', 'title')

    var pattern = buildPattern();

    var cypher = `MATCH ${pattern.toCypherString()}\n${returnClause.toCypherString()}`;
    expect(cypher).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

    var patternSnippets = pattern.getDebugCypherSnippets();  
    var returnSnippets = returnClause.getDebugCypherSnippets();

    //console.log('patternSnippets: ', patternSnippets);
    expect(patternSnippets.length).toBe(6);
    expect(returnSnippets.length).toBe(2);

    var matchClause = `MATCH ${pattern.toCypherString()}`;
    var matchClauseSnippets = patternSnippets.map(patternSnippet => `MATCH ${patternSnippet}`);
    var matchStep = debugStep(matchClause, matchClauseSnippets);
    var returnStep = debugStep(returnClause.toCypherString(), returnSnippets);
    
    var debugSteps = new DebugSteps();
    debugSteps.addStep(matchStep);
    debugSteps.addStep(returnStep);

    expect(debugSteps.getCypher()).toBe('');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person /* { name:"Keanu" } */) /* -[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" }) /* -[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->() /* (movie:Movie)<-[directed:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie) /* <-[directed:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-() /* (director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name /* , movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');
    
    var result = debugSteps.internalStepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

});

test ('debug MATCH and standalone ORDER BY', () => {
    var orderByClause = new OrderByClause();
    var simpleOrderBy = orderByItem('person.name', ORDER_DIRECTION.DESC);
    orderByClause.orderBy(simpleOrderBy);

    var pattern = buildOneNodePattern();

    var cypher = `MATCH ${pattern.toCypherString()}\n${orderByClause.toCypherString()}`;
    // console.log(cypher);
    // expect(cypher).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

    var patternSnippets = pattern.getDebugCypherSnippets();  
    var orderBySnippets = orderByClause.getDebugCypherSnippets();

    // console.log('patternSnippets: ', patternSnippets);
    // console.log('orderBySnippets: ', orderBySnippets);
    expect(patternSnippets.length).toBe(1);
    expect(orderBySnippets.length).toBe(1);

    var matchClause = `MATCH ${pattern.toCypherString()}`;
    var matchClauseSnippets = patternSnippets.map(patternSnippet => `MATCH ${patternSnippet}`);
    var matchStep = debugStep(matchClause, matchClauseSnippets);
    var orderByStep = debugStep(orderByClause.toCypherString(), orderBySnippets);
    
    var debugSteps = new DebugSteps();
    debugSteps.addStep(matchStep);
    debugSteps.addStep(orderByStep);

    expect(debugSteps.getCypher()).toBe('');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person)\n/* ORDER BY person.name DESC */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person)\nORDER BY person.name DESC');
    
    var result = debugSteps.internalStepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (person:Person)\nORDER BY person.name DESC');

});

test ('debug MATCH - add missing node and rel variables', () => {

    var returnClause = new ReturnClause({ limit: ''});
    returnClause
        .item('person', 'name')
        .item('movie', 'title')

    var pattern = buildPatternSkipSomeVars();
    //console.log('pattern: ', pattern);
    var cypher = `MATCH ${pattern.toCypherString()}\n${returnClause.toCypherString()}`;
    expect(cypher).toBe('MATCH (person:Person {name:"Keanu"})-[:ACTED_IN]->(:Movie)<-[:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

    const cypherStringConverter = new CypherStringConverter();
    var { returnVariables } = cypherStringConverter.convertToClausesAndVariables(cypher);

    var variableScope = new CypherVariableScope();
    returnVariables.forEach(variable => variableScope.addVariable(variable, {}));

    var patternSnippets = pattern.getDebugCypherSnippets({ addMissingVars: true,  variableScope });    
    var returnSnippets = returnClause.getDebugCypherSnippets();

    expect(patternSnippets.length).toBe(6);
    expect(returnSnippets.length).toBe(2);

    var matchClause = `MATCH ${pattern.toCypherString({ addMissingVars: true,  variableScope })}`;
    var matchClauseSnippets = patternSnippets.map(patternSnippet => `MATCH ${patternSnippet}`);
    //console.log('matchClauseSnippets: ', matchClauseSnippets);
    var matchStep = debugStep(matchClause, matchClauseSnippets);
    var returnStep = debugStep(returnClause.toCypherString(), returnSnippets);
    
    var debugSteps = new DebugSteps();
    debugSteps.addStep(matchStep);
    debugSteps.addStep(returnStep);

    //console.log('debugSteps: ', debugSteps);

    expect(debugSteps.getCypher()).toBe('');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person /* { name:"Keanu" } */) /* -[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');    
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" }) /* -[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[_gd_1:ACTED_IN]->() /* (_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[_gd_1:ACTED_IN]->(_gd_2:Movie) /* <-[_gd_3:DIRECTED]-(director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-() /* (director:Director) */\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person { name:"Keanu" })-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name /* , movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');
    
    var result = debugSteps.internalStepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

});

// test('debug SubQuery', () => {
//     var subQueryClause = new SubQueryClause()
//     var returnClause = new ReturnClause({ limit: ''});
//     returnClause
//         .item('person', 'name')
//         .item('movie', 'title')

//     var pattern = buildPattern();
//     var cypherMatchClause = new CypherClause({
//         keyword: 'MATCH',
//         clauseInfo: pattern
//     });

//     var withClause = new CypherClause({ keyword: 'WITH', clauseInfo: 'x' });
//     subQueryClause.clauses = [withClause, cypherMatchClause, returnClause];

//     // console.log(subQueryClause);

//     var cypher = subQueryClause.toCypherString();
//     console.log(cypher);
//     expect(cypher).toBe('CALL {\n    WITH x\n    MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\n    RETURN person.name, movie.title\n}');

//     var subquerySnippets = subQueryClause.getDebugCypherSnippets();
//     console.log('subquerySnippets: ', subquerySnippets);

// })