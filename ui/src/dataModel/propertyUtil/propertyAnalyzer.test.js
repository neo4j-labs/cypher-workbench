
import { getDataType } from '../graphUtil';
import { 
    analyzeValues, 
    getPropertyValueMap, 
    getRecommendedLabel, 
    getRecommendedKey,
    isInteger,
    sortArray 
} from './propertyAnalyzer';
import DataTypes from '../DataTypes';

test('isInteger', () => {
    expect(isInteger(1)).toBe(true);
    expect(isInteger(1.1)).toBe(false);
    expect(isInteger(1.0)).toBe(true);
    expect(isInteger("1")).toBe(false);
    expect(isInteger("foo")).toBe(false);
});

test('test sort array', () => {
    let array = [
        {key: 'a', value: 2}, 
        {key: 'b', value: 1}, 
        {key: 'c', value: 3}, 
        {key: 'd', value: 0}
    ]

    let sortedArray = sortArray({array: array, key: 'value'});
    expect(sortedArray).toStrictEqual([
        {key: 'd', value: 0},
        {key: 'b', value: 1}, 
        {key: 'a', value: 2}, 
        {key: 'c', value: 3}
    ])

    let sortedArrayDesc = sortArray({array: array, key: 'value', desc: true});
    expect(sortedArrayDesc).toStrictEqual([
        {key: 'c', value: 3}, 
        {key: 'a', value: 2}, 
        {key: 'b', value: 1}, 
        {key: 'd', value: 0}
    ])
});

test('get property value map', () => {
    let propContainers = [
        {properties: {a: 'foo', b: 1, c: 'baz'}},
        {properties: {a: 'bar', b: 2, c: 'baz'}},
        {properties: {a: 'qux', b: 2, c: 'garply'}},
        {properties: {a: 'quux', b: 3, c: 'grault'}},
        {properties: {a: 'corge', b: 3, c: 'grault'}}
    ]
    let propValueMap = getPropertyValueMap(propContainers)  
    // console.log('propValueMap: ', propValueMap);

    expect(propValueMap).toStrictEqual({
        a: [ 'foo', 'bar', 'qux', 'quux', 'corge' ],
        b: [ 1, 2, 2, 3, 3 ],
        c: [ 'baz', 'baz', 'garply', 'grault', 'grault' ]
    });

    propValueMap = getPropertyValueMap(propContainers, 3)  
    // console.log('propValueMap: ', propValueMap);

    expect(propValueMap).toStrictEqual({
        a: [ 'foo', 'bar', 'qux' ],
        b: [ 1, 2, 2 ],
        c: [ 'baz', 'baz', 'garply' ]
    });
})

test('analyze values', () => {
    let valuesA = [ 'foo', 'bar', 'qux', 'quux', 'corge' ];
    let valuesB = [ 1, 2, 2, 3, 3 ];
    let valuesC = [ 'baz', 'baz', 'garply', 'grault', 'grault' ];
    let valuesD = [ 1, 3, 3, 'zero', 'n/a' ];

    let analysisA = analyzeValues('a', valuesA);

    expect(analysisA.totalSize).toBe(5);
    expect(analysisA.numberOfValues).toBe(5);
    expect(analysisA.numberOfEmpties).toBe(0);
    expect(analysisA.percentOfValues).toBe(1);
    expect(analysisA.percentUnique).toBe(1);
    expect(analysisA.numberOfStringValues).toBe(5);
    expect(analysisA.totalStringLength).toBe(18);
    expect(analysisA.averageStringLength).toBe(3.6);
    expect(analysisA.frequencyOfDataTypes).toStrictEqual({ string: 5 })
    expect(analysisA.frequencyOfValues).toStrictEqual({ foo: 1, bar: 1, qux: 1, quux: 1, corge: 1 });
    expect(analysisA.key).toBe('a');
    expect(analysisA.getTopDataType()).toBe('string');

    let analysisB = analyzeValues('b', valuesB);

    expect(analysisB.percentUnique).toBe(0.6);
    expect(analysisB.numberOfStringValues).toBe(0);
    expect(analysisB.frequencyOfDataTypes).toStrictEqual({ number: 5 })
    expect(analysisB.frequencyOfValues).toStrictEqual({ '1': 1, '2': 2, '3': 2 });
    expect(analysisB.getTopDataType()).toBe('number');

    let analysisC = analyzeValues('c', valuesC);

    expect(analysisC.percentUnique).toBe(0.6);
    expect(analysisC.numberOfStringValues).toBe(5);
    expect(analysisC.frequencyOfDataTypes).toStrictEqual({ string: 5 })
    expect(analysisC.frequencyOfValues).toStrictEqual({ baz: 2, garply: 1, grault: 2 });    
    expect(analysisC.getTopDataType()).toBe('string');

    let analysisD = analyzeValues('d', valuesD);
    // console.log('analysis: ', analysisD);

    expect(analysisD.percentUnique).toBe(0.8);
    expect(analysisD.numberOfStringValues).toBe(2);
    expect(analysisD.frequencyOfDataTypes).toStrictEqual({ number: 3, string: 2 })
    expect(analysisD.frequencyOfValues).toStrictEqual({ '1': 1, '3': 2, zero: 1, 'n/a': 1 });    
    expect(analysisD.getTopDataType()).toBe('number');

})

test('get property value map', () => {
    let propContainers = [
        {properties: {a: 'foo', b: 1, c: 'baz'}},
        {properties: {a: 'bar', b: 2, c: 'baz'}},
        {properties: {a: 'qux', b: 2, c: 'garply'}},
        {properties: {a: 'quux', b: 3, c: 'grault'}},
        {properties: {a: 'corge', b: 3, c: 'grault'}}
    ]
    let recommendedLabel = getRecommendedLabel(propContainers)
    expect(recommendedLabel).toBe('a')
});

test('get recommended key', () => {
    let propContainers = [
        {properties: {a: 'foo', b: 1, c: 'baz'}},
        {properties: {a: 'bar', b: 2, c: 'baz'}},
        {properties: {a: 'qux', b: 2, c: 'garply'}},
        {properties: {a: 'quux', b: 3, c: 'grault'}},
        {properties: {a: 'corge', b: 3, c: 'grault'}}
    ]
    let recommendedKey = getRecommendedKey(propContainers)
    expect(recommendedKey).toBe('a')

    propContainers = [
        {properties: {a: 'foo', b: 1, c: 'baz'}},
        {properties: {a: 'bar', b: 2, c: 'baz'}},
        {properties: {a: 'qux', b: 3, c: 'garply'}},
        {properties: {a: 'quux', b: 4, c: 'grault'}},
        {properties: {a: 'corge', b: 5, c: 'grault'}}
    ]
    recommendedKey = getRecommendedKey(propContainers)
    expect(recommendedKey).toBe('b')    

    propContainers = [
        {properties: {a: 'fooby', b: 1, c: 'bay'}},
        {properties: {a: 'barby', b: 1, c: 'baz'}},
        {properties: {a: 'quxby', b: 3, c: 'gar'}},
        {properties: {a: 'quuxby', b: 3, c: 'gru'}},
        {properties: {a: 'corgeby', b: 5, c: 'gra'}}
    ]
    recommendedKey = getRecommendedKey(propContainers)
    expect(recommendedKey).toBe('c')   
    
    propContainers = [
        {properties: {a: 'fooby', b: 1, c: 'bay'}},
        {properties: {a: 'barby', b: null, c: 'baz'}},
        {properties: {a: 'quxby', b: 3, c: 'gar'}},
        {properties: {a: 'quuxby', b: null, c: 'gru'}},
        {properties: {a: 'corgeby', b: 5, c: 'gra'}}
    ]
    recommendedKey = getRecommendedKey(propContainers)
    expect(recommendedKey).toBe('c')    
});

test('determine date and time data types', () => {
    let dateVal = {year: 2019, month: 6, day: 21};
    let timeVal = {hour: 10, minute: 20, second: 30};
    let dateTimeVal = {
        year: 2019, month: 6, day: 21,
        hour: 10, minute: 20, second: 30
    }
    expect(getDataType(dateVal)).toBe(DataTypes.Date);
    expect(getDataType(timeVal)).toBe(DataTypes.Time);
    expect(getDataType(dateTimeVal)).toBe(DataTypes.DateTime);
});
