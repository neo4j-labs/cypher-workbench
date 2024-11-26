
import { isInteger, isDateString } from "./tableValueMap";

test('isInteger', () => {
    expect(isInteger(1)).toBe(true);
    expect(isInteger(1.1)).toBe(false);
    expect(isInteger(1.0)).toBe(true);
    expect(isInteger("1")).toBe(false);
    expect(isInteger("foo")).toBe(false);
});

test('isDateString', () => {
    expect(isDateString('02-02-2023')).toBe(true);
    expect(isDateString('02/02/2023')).toBe(true);
    expect(isDateString('02/32/2023')).toBe(false);
    expect(isDateString('20230202')).toBe(true);
    expect(isDateString('1P32')).toBe(false);
});