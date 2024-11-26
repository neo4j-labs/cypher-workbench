
import { skipIfComment, stripComments } from "./commentUtil";

const trimLines = (str) => 
        str.split('\n')
            .map(x => x.trim())
            .filter(x => x)
            .join('\n');

test('find comment in middle', () => {
    var origString = 'How // Comment \nare you?';

    let newIndex = skipIfComment(origString, 4);
    expect(newIndex).toBe(16);
});

test('find /* multiline */ in middle', () => {
    var origString = 'How /* Comment */ are you?';

    let newIndex = skipIfComment(origString, 4);
    expect(newIndex).toBe(17);
});

test('strip comments - undefined', () => {
    let newStr = stripComments(undefined);
    expect(newStr).toBe(undefined)    
});

test('strip comments - empty string', () => {
    let newStr = stripComments('');
    expect(newStr).toBe('')    
});

test('strip comments - no comments', () => {
    let newStr = stripComments(`
        MATCH (n)
        RETURN n
    `);
    expect(newStr).toBe(`
        MATCH (n)
        RETURN n
    `)    
});

test('strip comments - multiline in single line', () => {
    var origString = 'How /* Comment */ are you?';

    let newStr = stripComments(origString);
    expect(newStr).toBe('How  are you?')
})

test('strip comments - multiline in single line', () => {
    var origString = '// foo';

    let newStr = stripComments(origString);
    expect(newStr).toBe('')
})

test('strip comments - trailing comment', () => {
    var origString = `
        MATCH (n) 
        RETURN n
        // foo
    `;

    let newStr = stripComments(origString);
    expect(trimLines(newStr)).toBe(trimLines(`
        MATCH (n)
        RETURN n
    `))
})

test('strip comments - trailing comment multiline', () => {
    var origString = `
        MATCH (n) 
        RETURN n
        /* foo
           bar
        */
    `;

    let newStr = stripComments(origString);
    expect(trimLines(newStr)).toBe(trimLines(`
        MATCH (n)
        RETURN n
    `))
})

test('strip comments - leading comment multiline', () => {
    var origString = `
        /* foo
           bar
        */
        MATCH (n) 
        RETURN n
    `;

    let newStr = stripComments(origString);
    expect(trimLines(newStr)).toBe(trimLines(`
        MATCH (n)
        RETURN n
    `))
})

test('strip comments - middle comment multiline', () => {
    var origString = `
        MATCH (n) 
        /* foo
           bar
        */
        RETURN n
    `;

    let newStr = stripComments(origString);
    expect(trimLines(newStr)).toBe(trimLines(`
        MATCH (n)
        RETURN n
    `))
})

test('strip comments - lots of comments', () => {
    var origString = `
        // this is cypher
        MATCH (n) /* we are matching n */
        // let's return something
        RETURN n    /* we are returning n */
        /* now we
        are done */
    `;

    let newStr = stripComments(origString);
    expect(trimLines(newStr)).toBe(trimLines(`
        MATCH (n)
        RETURN n
    `))
})