
import { 
    isUpperCase, 
    isLowerCase,
    isLowerCamelCase,
    isUpperCamelCase,
    camelCaseToWordArray 
} from "./textUtil";

test('isUpperCase', () => {
    expect(isUpperCase(null)).toBe(false);
    expect(isUpperCase("Foo")).toBe(false);
    expect(isUpperCase("")).toBe(false);
    expect(isUpperCase("FOO_bar")).toBe(false);
    expect(isUpperCase("foo")).toBe(false);

    expect(isUpperCase("FOO")).toBe(true);
    expect(isUpperCase("FOO_BAR")).toBe(true);
});

test('isLowerCase', () => {
    expect(isLowerCase(null)).toBe(false);
    expect(isLowerCase("Foo")).toBe(false);
    expect(isLowerCase("")).toBe(false);
    expect(isLowerCase("FOO_bar")).toBe(false);
    expect(isLowerCase("FOO")).toBe(false);

    expect(isLowerCase("foo")).toBe(true);
    expect(isLowerCase("foo_bar")).toBe(true);
});

test('isLowerCamelCase', () => {
    expect(isLowerCamelCase(null)).toBe(false);
    expect(isLowerCamelCase("Foo")).toBe(false);
    expect(isLowerCamelCase("")).toBe(false);
    expect(isLowerCamelCase("FOO_bar")).toBe(false);
    expect(isLowerCamelCase("FOO")).toBe(false);
    expect(isLowerCamelCase("foo_bar")).toBe(false);

    expect(isLowerCamelCase("foo")).toBe(true);
    expect(isLowerCamelCase("fooBar")).toBe(true);
    expect(isLowerCamelCase("aB")).toBe(true);
    expect(isLowerCamelCase("aBC")).toBe(true);
});

test('isUpperCamelCase', () => {
    expect(isUpperCamelCase(null)).toBe(false);
    expect(isUpperCamelCase("")).toBe(false);
    expect(isUpperCamelCase("FOO_bar")).toBe(false);
    expect(isUpperCamelCase("FOO")).toBe(false);

    expect(isUpperCamelCase("foo")).toBe(false);
    expect(isUpperCamelCase("fooBar")).toBe(false);
    expect(isUpperCamelCase("aB")).toBe(false);
    expect(isUpperCamelCase("aBC")).toBe(false);

    expect(isUpperCamelCase("Foo")).toBe(true);
    expect(isUpperCamelCase("FooBar")).toBe(true);
    expect(isUpperCamelCase("FooBarCCC")).toBe(true);

});

test('camelCaseToWordArray', () => {
    expect(camelCaseToWordArray('USState')).toStrictEqual(['US', 'State']);
    expect(camelCaseToWordArray('Network&ITOps')).toStrictEqual(['Network', '&', 'IT', 'Ops']);
    expect(camelCaseToWordArray('fooBar')).toStrictEqual(['foo', 'Bar']);
    expect(camelCaseToWordArray('foo_bar')).toStrictEqual(['foo_bar']);
    expect(camelCaseToWordArray('Foo Bar')).toStrictEqual(['Foo',' ','Bar']);
});