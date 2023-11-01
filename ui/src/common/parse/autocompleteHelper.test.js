
import {
    getWithPromptInfo, PROMPT_TYPE
} from './autocompleteHelper';

test('test WITH', () => {
    var cypher = 'WITH ';
    var results = getWithPromptInfo(cypher);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('');
});

test('test WITH person', () => {
    var cypher = 'WITH person';
    const variables = ['person', 'movie'];
    var results = getWithPromptInfo(cypher, variables);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('person');
});

test('test WITH person, m', () => {
    var cypher = 'WITH person, m';
    const variables = ['person', 'movie'];
    var results = getWithPromptInfo(cypher, variables);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('m');
});

test('test WITH person.', () => {
    var cypher = 'WITH person.';
    const variables = ['person', 'movie'];
    var results = getWithPromptInfo(cypher, variables);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableProperty);
    expect(results.variableOrFunction).toBe('person');
    expect(results.searchText).toBe('');
});

test('test WITH person.na', () => {
    var cypher = 'WITH person.na';
    const variables = ['person', 'movie'];
    var results = getWithPromptInfo(cypher, variables);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableProperty);
    expect(results.variableOrFunction).toBe('person');
    expect(results.searchText).toBe('na');
});

test('test WITH count(', () => {
    var cypher = 'WITH count(';
    const variables = ['person', 'movie'];
    var results = getWithPromptInfo(cypher, variables);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('');
});

test('test WITH co', () => {
    var cypher = 'WITH co';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('co');
});

test('test WITH apoc', () => {
    var cypher = 'WITH apoc';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('apoc');
});

test('test WITH apoc.coll', () => {
    var cypher = 'WITH apoc.coll';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('apoc.coll');
});

test('test WITH ap', () => {
    var cypher = 'WITH ap';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('ap');
});

test('test WITH apoc.', () => {
    var cypher = 'WITH apoc.';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('apoc.');
});

test('test WITH apoc.map.me', () => {
    var cypher = 'WITH apoc.map.me';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.map'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    //console.log('parseResults: ', results.parseResults);    
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('apoc.map.me');
});

test('test WITH apoc.map.', () => {
    var cypher = 'WITH apoc.map.';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.map'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    //console.log('parseResults: ', results.parseResults);    
    expect(results.promptType).toBe(PROMPT_TYPE.FunctionOnly);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('apoc.map.');
});

test('test WITH [x IN ', () => {
    var cypher = 'WITH [x IN';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.None);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('');
});

test('WITH (', () => {
    var cypher = 'WITH (';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('');
});

test('WITH (per', () => {
    var cypher = 'WITH (per';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('per');
});

test('WITH (person1.name, mo', () => {
    var cypher = 'WITH (person1.name, mo';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('mo');
});

test('WITH max(mo', () => {
    var cypher = 'WITH max(mo';
    const variables = ['person', 'movie'];
    const functionPrefixes = ['apoc', 'apoc.coll'];
    var results = getWithPromptInfo(cypher, variables, functionPrefixes);
    //console.log('parseResults: ', results.parseResults);
    expect(results.promptType).toBe(PROMPT_TYPE.VariableAndFunction);
    expect(results.variableOrFunction).toBe('');
    expect(results.searchText).toBe('mo');
});