
import { 
    analyzeValues, 
    getPropertyValueMap, 
    getRecommendedLabel, 
    isInteger,
    sortArray 
} from './propertyAnalyzer';

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