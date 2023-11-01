
import { getVariableArrayDifference, parseWith, variablesAreEqual } from './parseWith';
import { WithVariable } from './antlr/withVariable';

test('test simple cypher', () => {
    var cypher = 'WITH person';
    var results = parseWith(cypher);
    expect(results.lastVariable).toBe('person');
    expect(results.lastPropertyKey).toBeNull();
    expect(results.parseSuccessful).toBe(true);
});

test('test 2 variables', () => {
    var cypher = 'WITH person, movie';
    var results = parseWith(cypher);
    expect(results.lastVariable).toBe('movie');
    expect(results.lastPropertyKey).toBeNull();
    expect(results.parseSuccessful).toBe(true);

    expect(results.nextToLastToken).toBe(',');
    expect(results.thirdFromLastToken).toBe('person');
});

test('test property key', () => {
    var cypher = 'WITH person.name';
    var results = parseWith(cypher);
    expect(results.lastVariable).toBe('person');
    expect(results.lastPropertyKey).toBe('name');
    expect(results.parseSuccessful).toBe(true);

    expect(results.nextToLastToken).toBe('.');
    expect(results.thirdFromLastToken).toBe('person');
});

test('test just WITH', () => {
    var cypher = 'WITH ';
    var results = parseWith(cypher);
    //console.log('results: ', results);    
    expect(results.lastToken).toBe('WITH');
    expect(results.lastSymbolicName).toBeNull();
    expect(results.parseSuccessful).toBe(false);
});

test('test variable and .', () => {
    var cypher = 'WITH person.';
    var results = parseWith(cypher);
    expect(results.lastSymbolicName).toBe('person');
    //console.log('results: ', results);
    expect(results.lastToken).toBe('.');
    expect(results.nextToLastToken).toBe('person');
    expect(results.parseSuccessful).toBe(false);
});

test('test max(', () => {
    var cypher = 'WITH max(';
    var results = parseWith(cypher);
    expect(results.lastSymbolicName).toBe('max');
    expect(results.lastToken).toBe('(');
    expect(results.parseSuccessful).toBe(false);
});

test('test max(movie.ra', () => {
    var cypher = 'WITH max(movie.ra';
    var results = parseWith(cypher);
    expect(results.lastSymbolicName).toBe('ra');
    expect(results.lastToken).toBe('ra');
    expect(results.nextToLastToken).toBe('.');
    expect(results.thirdFromLastToken).toBe('movie');
    expect(results.parseSuccessful).toBe(false);
});

test('test max(movie.rating)', () => {
    var cypher = 'WITH max(movie.rating)';
    var results = parseWith(cypher);
    expect(results.lastVariable).toBe('movie');
    expect(results.lastPropertyKey).toBe('rating');
    expect(results.lastSymbolicName).toBe('rating');
    expect(results.lastToken).toBe(')');
    expect(results.parseSuccessful).toBe(true);
});

test('test max(movie.rating)', () => {
    var cypher = 'WITH max(movie.rating), count(*)';
    var results = parseWith(cypher);
    expect(results.lastVariable).toBe('movie');
    expect(results.lastPropertyKey).toBe('rating');
    expect(results.lastSymbolicName).toBe('rating');
    expect(results.lastToken).toBe(')');
    expect(results.nextToLastToken).toBe('*');
    expect(results.parseSuccessful).toBe(true);
});

/// test extract variables
test('test WITH person', () => {
    var cypher = 'WITH person';
    var results = parseWith(cypher);
    expect(results.withVariables).not.toBe(null);
    expect(results.withVariables.length).toBe(1);

    const variable = results.withVariables[0];
    expect(variable.variable).toBe('person');
    expect(variable.expression).toBe(null);
});

test('test WITH person as foo', () => {
    var cypher = 'WITH person as foo';
    var results = parseWith(cypher);
    expect(results.withVariables).not.toBe(null);
    expect(results.withVariables.length).toBe(1);

    const variable = results.withVariables[0];
    expect(variable.variable).toBe('foo');
    expect(variable.expression).toBe('person');
});

test('test 2 variables', () => {
    var cypher = 'WITH person, movie as m';
    var results = parseWith(cypher);

    expect(results.withVariables).not.toBe(null);
    expect(results.withVariables.length).toBe(2);

    const variable1 = results.withVariables[0];
    const variable2 = results.withVariables[1];

    expect(variable1.variable).toBe('person');
    expect(variable1.expression).toBe(null);

    expect(variable2.variable).toBe('m');
    expect(variable2.expression).toBe('movie');
});

test('test property key', () => {
    var cypher = 'WITH person.name as personName';
    var results = parseWith(cypher);

    expect(results.withVariables).not.toBe(null);
    expect(results.withVariables.length).toBe(1);

    const variable1 = results.withVariables[0];

    expect(variable1.variable).toBe('personName');
    expect(variable1.expression).toBe('person.name');
});

test('test WITH max(movie.rating), count(*)', () => {
    var cypher = 'WITH max(movie.rating), count(*)';
    var results = parseWith(cypher);

    expect(results.withVariables).not.toBe(null);
    expect(results.withVariables.length).toBe(2);

    const variable1 = results.withVariables[0];
    const variable2 = results.withVariables[1];

    expect(variable1.variable).toBe(null);
    expect(variable1.expression).toBe('max(movie.rating)');

    expect(variable2.variable).toBe(null);
    expect(variable2.expression).toBe('count(*)');

    expect(results.parseSuccessful).toBe(true);
});

test('test WITH max(movie.r', () => {
    var cypher = 'WITH max(movie.r';
    var results = parseWith(cypher);

    expect(results.withVariables).toBe(null);
    expect(results.parseSuccessful).toBe(false);
});

test('withVariable isEqualTo', () => {
    var var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var var2 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    expect(var1.isEqualTo(var2)).toBe(true);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 2, expression: 'foo', variable: 'bar' });
    expect(var1.isEqualTo(var2)).toBe(false);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 1, expression: null, variable: 'bar' });
    expect(var1.isEqualTo(var2)).toBe(false);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 1, expression: 'foo', variable: null });
    expect(var1.isEqualTo(var2)).toBe(false);
});

test('test parseWith variablesAreEquals', () => {
    var var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var var2 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    
    expect(variablesAreEqual(var1, var2)).toBe(true);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 2, expression: 'foo', variable: 'bar' });
    expect(variablesAreEqual(var1, var2)).toBe(false);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 1, expression: null, variable: 'bar' });
    expect(variablesAreEqual(var1, var2)).toBe(false);

    var1 = new WithVariable({ key: 1, expression: 'foo', variable: 'bar' });
    var2 = new WithVariable({ key: 1, expression: 'foo', variable: null });
    expect(variablesAreEqual(var1, var2)).toBe(false);

    expect(variablesAreEqual(null, null)).toBe(true);
    expect(variablesAreEqual(var1, var1)).toBe(true);
});

test('test getVariableArrayDifference', () => {
    var cypher1 = 'WITH person';
    var results1 = parseWith(cypher1);

    var cypher2 = 'WITH person, movie';
    var results2 = parseWith(cypher2);
    
    var diff = getVariableArrayDifference(results1.withVariables, results2.withVariables);
    expect(diff.inLeftOnly.length).toBe(0);
    expect(diff.inRightOnly.length).toBe(1);
    expect(diff.inRightOnly[0].variable).toBe('movie');

    diff = getVariableArrayDifference(results2.withVariables, results1.withVariables);
    expect(diff.inLeftOnly.length).toBe(1);
    expect(diff.inLeftOnly[0].variable).toBe('movie');
    expect(diff.inRightOnly.length).toBe(0);
});

test('test hasAsterisk', () => {
    var cypher1 = 'WITH *';
    var results1 = parseWith(cypher1);

    var cypher2 = 'WITH person, movie';
    var results2 = parseWith(cypher2);

    var cypher3 = 'WITH *, person, movie';
    var results3 = parseWith(cypher3);

    var cypher4 = 'WITH count(*) as count';
    var results4 = parseWith(cypher4);

    var cypher5 = 'WITH count(*) as count, *';
    var results5 = parseWith(cypher5);

    expect(results1.hasAsterisk).toBe(true);
    expect(results2.hasAsterisk).toBe(false);
    expect(results3.hasAsterisk).toBe(true);
    expect(results4.hasAsterisk).toBe(false);

    // parser expects * to be in first position
    expect(results5.hasAsterisk).toBe(false);
});



