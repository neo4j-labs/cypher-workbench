
import {
    CypherFunctionHelper
} from './cypherFunctionHelper';

test('test functions', () => {
    const functionHelper = new CypherFunctionHelper();
    const functions = functionHelper.getFunctions();

    // spot checks
    expect(functions.includes('count')).toBe(true);
    expect(functions.includes('abs')).toBe(true);
    expect(functions.includes('reduce')).toBe(true);
});


test('test function prefixes', () => {
    const functionHelper = new CypherFunctionHelper();
    const prefixes = functionHelper.getFunctionPrefixes();

    // spot checks
    expect(prefixes.includes('apoc')).toBe(true);
    expect(prefixes.includes('apoc.coll')).toBe(true);
    expect(prefixes.includes('datetime')).toBe(true);
});
