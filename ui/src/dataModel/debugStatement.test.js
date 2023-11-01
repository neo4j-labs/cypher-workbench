
import { CypherVariableScope } from './cypherVariableScope';
import { CypherStatementBuilder } from './cypherStatementBuilder';
import {  ReturnClause } from './cypherReturn';
import { 
    DebugSteps,
    debugStep,
    DebugStepResult
} from './debugSteps';
import CypherStringConverter from './cypherStringConverter';

const cy = new CypherStatementBuilder({
    variableScope: new CypherVariableScope()
});

const buildPattern = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu'})
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

// same as above, but don't assign explicit variables for some items
const buildPatternSkipSomeVars = () => {
    var path = cy.path()
    .node('person', ['Person'], { name: 'Keanu'})
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

    expect(patternSnippets.length).toBe(5);
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
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"}) // -[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->() // (movie:Movie)<-[directed:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie) // <-[directed:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-() // (director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name // , movie.title');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');
    
    var result = debugSteps.internalStepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (person:Person {name:"Keanu"})-[acted_in:ACTED_IN]->(movie:Movie)<-[directed:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

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

    expect(patternSnippets.length).toBe(5);
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
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"}) // -[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->() // (_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie) // <-[_gd_3:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-() // (director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\n/* RETURN person.name, movie.title */');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name // , movie.title');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher(true)).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');
    
    var result = debugSteps.internalStepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (person:Person {name:"Keanu"})-[_gd_1:ACTED_IN]->(_gd_2:Movie)<-[_gd_3:DIRECTED]-(director:Director)\nRETURN person.name, movie.title');

});