

import { transform } from 'lodash';
import DataTypes from './DataTypes';
import { 
    deserializeObject, 
    getDataType, 
    serializeObject,
    findValues,
    findObjectsContainingKeys,
    findObjectsContainingAllKeys,
    transformObjectsContainingAllKeys,
    performFullTransform,
    findObjectsOfACertainClass
 } from './graphUtil';
 import { buildPattern } from './debugStatement.test';
import { NodePattern, RelationshipPattern, VariableContainer } from './cypherPattern';

test('test data types', () => {
    expect(getDataType('foo')).toBe(DataTypes.String);
    expect(getDataType(['foo','bar'])).toBe(DataTypes.StringArray);

    expect(getDataType(1)).toBe(DataTypes.Integer);
    expect(getDataType([1,2])).toBe(DataTypes.IntegerArray);

    expect(getDataType(1.1)).toBe(DataTypes.Float);
    expect(getDataType([1.1,2.2])).toBe(DataTypes.FloatArray);

    expect(getDataType(true)).toBe(DataTypes.Boolean);
    expect(getDataType([true,false])).toBe(DataTypes.BooleanArray);
});


test('test serialize object 1', () => {
    var obj = { a: 1, getSerializableId: () => 'myId' };
    var serializedObj = serializeObject(obj);
    const { objectSerializedId, objectKeyMap } = serializedObj;
    expect(objectSerializedId).toBe('Object_$$_1');
    var theObj = objectKeyMap['Object_$$_1'];
    expect(theObj).toStrictEqual({ a: 1 });
});

test('test serialize object 2', () => {
    var objA = { a: 1, c: 3, getSerializableId: () => 'a_id' };
    var objB = { b: 2, d: 4, getSerializableId: () => 'b_id'};
    objA.b_obj = objB;
    objB.a_obj = objA;

    var serializedObj = serializeObject(objA, {}, {}, {maxDepth: 5});
    const { objectSerializedId, objectKeyMap } = serializedObj;
    expect(objectSerializedId).toBe('Object_$$_1');
    var serializedAObj = objectKeyMap['Object_$$_1'];
    var serializedBObj = objectKeyMap['Object_$$_2'];
    //console.log('objectKeyMap: ', objectKeyMap);
    //console.log('serializedBObj: ', serializedBObj)

    expect(serializedAObj).toStrictEqual({ a: 1, c: 3, b_obj: { objectSerializedId: 'Object_$$_2' } });
    expect(serializedBObj).toStrictEqual({ b: 2, d: 4, a_obj: { objectSerializedId: 'Object_$$_1' } });

    const serializedJSON = JSON.stringify(serializedObj);
    //console.log(serializedJSON);
});

class Foo {
    constructor (properties) {
        properties = properties || {};

        this.myObjectName = 'Foo';

        const { id, a, c, bar } = properties;
        this.id = id;
        this.a = a;
        this.c = c;
        this.bar = bar;
    }
}

class Bar {
    constructor (properties) {
        properties = properties || {};

        this.myObjectName = 'Bar';

        const { id, b, d, foo } = properties;
        this.id = id;
        this.b = b;
        this.d = d;
        this.foo = foo;
    }
}

test('test serialize / deserialize object 3', () => {
    var foo = new Foo({ a: 1, c: 3, id: 'foo_id'});
    var bar = new Bar({ b: 2, d: 4, id: 'bar_id', foo: foo});
    foo.bar = bar;

    var serializedFoo = serializeObject(foo, {}, {}, {maxDepth: 20});
    const { objectSerializedId, objectKeyMap } = serializedFoo;
    expect(objectSerializedId).toBe('Foo_$$_1');
    var serializedAObj = objectKeyMap['Foo_$$_1'];
    var serializedBObj = objectKeyMap['Bar_$$_2'];

    expect(serializedAObj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id', a: 1, c: 3, bar: { objectSerializedId: 'Bar_$$_2' } });
    expect(serializedBObj).toStrictEqual({ myObjectName: 'Bar', id: 'bar_id', b: 2, d: 4, foo: { objectSerializedId: 'Foo_$$_1' } });

    var instanceMapper = {
        Foo: () => new Foo(),
        Bar: () => new Bar()
    }

    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);
    //console.log('deserializedFoo: ', deserializedFoo);
    expect(deserializedFoo.a).toBe(foo.a);
    expect(deserializedFoo.c).toBe(foo.c);
    expect(deserializedFoo.id).toBe(foo.id);

    var deserializedBar = deserializedFoo.bar;
    expect(deserializedBar.b).toBe(bar.b);
    expect(deserializedBar.d).toBe(bar.d);
    expect(deserializedBar.id).toBe(bar.id);
    expect(deserializedBar.foo).toBe(deserializedFoo);
});

test('test serialize / deserialize object 4', () => {
    var foo = new Foo({ a: 1, c: 3, id: 'foo_id'});
    var foo2 = new Foo({ a: 11, c: null, id: 'foo_id2'});
    var bar = new Bar({ b: 2, d: 4, id: 'bar_id', foo: [foo, foo2]});
    foo.bar = {
        nestedBar: bar
    };

    var serializedFoo = serializeObject(foo, {}, {}, {maxDepth: 50});
    const { objectSerializedId, objectKeyMap } = serializedFoo;
    expect(objectSerializedId).toBe('Foo_$$_1');
    var serializedFooObj = objectKeyMap['Foo_$$_1'];
    var serializedFoo2Obj = objectKeyMap['Foo_$$_4'];
    var serializedBarObj = objectKeyMap['Bar_$$_3'];
    //console.log('serializedBarObj: ', serializedBarObj);

    expect(serializedFooObj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id', a: 1, c: 3, bar: {objectSerializedId: "Object_$$_2"} });
    expect(serializedFoo2Obj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id2', a: 11, c: null, bar: undefined });
    expect(serializedBarObj).toStrictEqual({ myObjectName: 'Bar', id: 'bar_id', b: 2, d: 4, foo: [{ objectSerializedId: 'Foo_$$_1' }, { objectSerializedId: 'Foo_$$_4' }] });
    //console.log('serializedFooObj: ', serializedFooObj);

    var instanceMapper = {
        Foo: () => new Foo(),
        Bar: () => new Bar()
    }

    //console.log(JSON.stringify(serializedFoo));

    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);
    //console.log('deserializedFoo: ', deserializedFoo);
    expect(deserializedFoo.a).toBe(foo.a);
    expect(deserializedFoo.c).toBe(foo.c);
    expect(deserializedFoo.id).toBe(foo.id);
    
    var deserializedBar = deserializedFoo.bar.nestedBar;
    expect(deserializedBar.b).toBe(bar.b);
    expect(deserializedBar.d).toBe(bar.d);
    expect(deserializedBar.id).toBe(bar.id);
    expect(deserializedBar.foo[0]).toBe(deserializedFoo);
});

test('test serialize / deserialize object 5', () => {
    var foo = new Foo({ a: 1, c: 3, id: 'foo_id'});
    var foo2 = new Foo({ a: 11, c: null, id: 'foo_id2'});
    var bar = new Bar({ b: 2, d: 4, id: 'bar_id', foo: [foo, foo2]});
    foo.bar = {
        nestedBar: bar
    };

    var serializedFoo = serializeObject(foo, {}, {}, {maxDepth: 50});
    const { objectSerializedId, objectKeyMap } = serializedFoo;
    expect(objectSerializedId).toBe('Foo_$$_1');
    var serializedFooObj = objectKeyMap['Foo_$$_1'];
    var serializedFoo2Obj = objectKeyMap['Foo_$$_4'];
    var serializedBarObj = objectKeyMap['Bar_$$_3'];
    //console.log('serializedBarObj: ', serializedBarObj);

    expect(serializedFooObj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id', a: 1, c: 3, bar: {objectSerializedId: "Object_$$_2"} });
    expect(serializedFoo2Obj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id2', a: 11, c: null, bar: undefined });
    expect(serializedBarObj).toStrictEqual({ myObjectName: 'Bar', id: 'bar_id', b: 2, d: 4, foo: [{ objectSerializedId: 'Foo_$$_1' }, { objectSerializedId: 'Foo_$$_4' }] });
    //console.log('serializedFooObj: ', serializedFooObj);

    var instanceMapper = {
        Foo: () => new Foo(),
        Bar: () => new Bar()
    }

    //console.log(JSON.stringify(serializedFoo));

    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);
    //console.log('deserializedFoo: ', deserializedFoo);
    expect(deserializedFoo.a).toBe(foo.a);
    expect(deserializedFoo.c).toBe(foo.c);
    expect(deserializedFoo.id).toBe(foo.id);
    
    var deserializedBar = deserializedFoo.bar.nestedBar;
    expect(deserializedBar.b).toBe(bar.b);
    expect(deserializedBar.d).toBe(bar.d);
    expect(deserializedBar.id).toBe(bar.id);
    expect(deserializedBar.foo[0]).toBe(deserializedFoo);

    // serialize foo again
    var serializedFoo2 = serializeObject(deserializedFoo, {}, {}, {maxDepth: 50});
    var deserializedFoo2 = deserializeObject(serializedFoo2, instanceMapper);

    expect(deserializedFoo2.a).toBe(foo.a);
    expect(deserializedFoo2.c).toBe(foo.c);
    expect(deserializedFoo2.id).toBe(foo.id);
    
    var deserializedBar2 = deserializedFoo2.bar.nestedBar;
    expect(deserializedBar2.b).toBe(bar.b);
    expect(deserializedBar2.d).toBe(bar.d);
    expect(deserializedBar2.id).toBe(bar.id);
    expect(deserializedBar2.foo[0]).toBe(deserializedFoo2);

});

test('test myObjectName', () => {
    var foo = new Foo({ a: 1, c: 3, id: 'foo_id'});
    var foo2 = new Foo({ a: 11, c: null, id: 'foo_id2'});
    var bar = new Bar({ b: 2, d: 4, id: 'bar_id', foo: [foo, foo2]});
    foo.bar = {
        nestedBar: bar
    };

    var serializedFoo = serializeObject(foo, {}, {}, {maxDepth: 50});
    const { objectSerializedId, objectKeyMap } = serializedFoo;
    expect(objectSerializedId).toBe('Foo_$$_1');
    var serializedFooObj = objectKeyMap['Foo_$$_1'];
    var serializedFoo2Obj = objectKeyMap['Foo_$$_4'];
    var serializedBarObj = objectKeyMap['Bar_$$_3'];
    //console.log('serializedBarObj: ', serializedBarObj);

    expect(serializedFooObj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id', a: 1, c: 3, bar: {objectSerializedId: "Object_$$_2"} });
    expect(serializedFoo2Obj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id2', a: 11, c: null, bar: undefined });
    expect(serializedBarObj).toStrictEqual({ myObjectName: 'Bar', id: 'bar_id', b: 2, d: 4, foo: [{ objectSerializedId: 'Foo_$$_1' }, { objectSerializedId: 'Foo_$$_4' }] });
    //console.log('serializedFooObj: ', serializedFooObj);

    var instanceMapper = {
        Foo: () => new Foo(),
        Bar: () => new Bar()
    }

    //console.log(JSON.stringify(serializedFoo));

    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);
    //console.log('deserializedFoo: ', deserializedFoo);
    expect(deserializedFoo.a).toBe(foo.a);
    expect(deserializedFoo.c).toBe(foo.c);
    expect(deserializedFoo.id).toBe(foo.id);
    
    var deserializedBar = deserializedFoo.bar.nestedBar;
    expect(deserializedBar.b).toBe(bar.b);
    expect(deserializedBar.d).toBe(bar.d);
    expect(deserializedBar.id).toBe(bar.id);
    expect(deserializedBar.foo[0]).toBe(deserializedFoo);

    // serialize foo again
    var serializedFoo2 = serializeObject(deserializedFoo, {}, {}, {maxDepth: 50});
    var deserializedFoo2 = deserializeObject(serializedFoo2, instanceMapper);

    expect(deserializedFoo2.a).toBe(foo.a);
    expect(deserializedFoo2.c).toBe(foo.c);
    expect(deserializedFoo2.id).toBe(foo.id);
    
    var deserializedBar2 = deserializedFoo2.bar.nestedBar;
    expect(deserializedBar2.b).toBe(bar.b);
    expect(deserializedBar2.d).toBe(bar.d);
    expect(deserializedBar2.id).toBe(bar.id);
    expect(deserializedBar2.foo[0]).toBe(deserializedFoo2);

});

test('test using myObjectName in a plain object', () => {
    var fooObj = { a: 1, c: 3, id: 'foo_id', myObjectName: 'Foo'};

    var serializedFoo = serializeObject(fooObj, {}, {}, {maxDepth: 50});
    const { objectSerializedId, objectKeyMap } = serializedFoo;
    expect(objectSerializedId).toBe('Foo_$$_1');
    var serializedFooObj = objectKeyMap['Foo_$$_1'];

    expect(serializedFooObj).toStrictEqual({ myObjectName: 'Foo', id: 'foo_id', a: 1, c: 3});

    var instanceMapper = {
        Foo: () => new Foo()
    }
    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);
    expect(deserializedFoo.a).toBe(fooObj.a);
    expect(deserializedFoo.c).toBe(fooObj.c);
    expect(deserializedFoo.id).toBe(fooObj.id);
    expect(deserializedFoo.constructor.name).toBe('Foo');

});

test('find values', () => {
    let item = {
        id: 'foo',
        items: [
            {id: 'bar'},
            {id: 'baz',
                items: [{id: 'qux'}]
            }
        ],
        more: [
            {id: 'qoph'},
        ]
    }
    let values = findValues(item, 'id');
    //console.log('values: ', values);
    expect(values).toStrictEqual(['foo','bar','baz','qux','qoph']);
});

test('find objects containing keys', () => {
    let bar = {id: 'bar'};
    let qux = {id: 'qux'};
    let baz = {id: 'baz',
        items: [qux]
    }
    let qoph = {id: 'qoph'};

    let foo = {
        id: 'foo',
        items: [bar, baz],
        more: [qoph]
    }
    let objects = findObjectsContainingKeys(foo, 'id');
    // console.log('objects: ', objects);
    expect(objects).toStrictEqual([foo, bar, baz, qux, qoph]);
});

test('find objects containing keys - test on non-objects', () => {
    let objects = findObjectsContainingKeys('string', 'id');
    expect(objects).toStrictEqual([]);

    objects = findObjectsContainingKeys(100, 'id');
    expect(objects).toStrictEqual([]);

    objects = findObjectsContainingKeys(true, 'id');
    expect(objects).toStrictEqual([]);
});

test('find objects containing all keys', () => {
    let fb = {
        start: 'foo',
        end: 'bar'
    };
    let qq = {
        start: 'qux',
        end: 'qoph'
    };

    let items = [
        fb,
        {
            path: qq
        },
        {
            start: 'baz'
        }
    ]
    let objects = findObjectsContainingAllKeys(items, ['start','end']);
    // console.log('objects: ', objects);
    expect(objects).toStrictEqual([fb, qq]);
});

test('transform objects containing all keys', () => {
    let fb = {
        start: 'foo',
        end: 'bar'
    };
    let qq = {
        start: 'qux',
        end: 'qoph'
    };

    let items = [
        fb,
        {
            path: qq
        },
        {
            start: 'baz'
        }
    ]

    let transform = (value) => `${value.start}->${value.end}`;
    let newObj = transformObjectsContainingAllKeys(items, ['start','end'], transform);
    // console.log('newObj: ', newObj);
    // expect(objects).toStrictEqual([fb, qq]);
    expect(newObj).toStrictEqual([ 'foo->bar', { path: 'qux->qoph' }, { start: 'baz' } ]);

});

test('performFullTransform', () => {
    let fb = {
        start: 'foo',
        end: 'bar'
    };
    let qq = {
        start: 'qux',
        end: 'qoph'
    };

    let items = [
        fb,
        {
            str: 'yo',
            path: qq
        },
        {
            start: 'baz'
        }
    ]

    let indentSpaces = '    ';

    let getIndent = (indent) => 
        [...Array(indent).keys()].reduce((runningIndent, _) => runningIndent + indentSpaces, '');

    let transformMap = {
        ArrayOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}<array>`,
        ArrayItemOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}`,
        ArrayItemSeparator: ({isLastItem}) => `${isLastItem ? '' : ','}`,
        ArrayClose: ({indentLevel}) => `\n${getIndent(indentLevel)}</array>`,
        ObjectOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}<object>`,
        ObjectKey: ({indentLevel, key}) => `\n${getIndent(indentLevel)}${key}`,
        ObjectKeySeparator: () => ': ',
        ObjectValueSeparator: ({isLastItem}) => `${isLastItem ? '' : ','}`,
        ObjectClose: ({indentLevel}) => `\n${getIndent(indentLevel)}</object>`,
        Value: ({item}) => `<val>${item}</val>`,
        // custom transforms
        StartEnd: {
            requiredKeys: ['start','end'],
            func: ({item,indentLevel}) => `${item.start}->${item.end}`
        }
    }

    let transformedItem = performFullTransform(items, transformMap);
    // console.log(transformedItem);
    let transformedText = transformedItem.join('');
    // console.log(transformedText);
    expect(transformedText).toEqual(`
<array>
    foo->bar,
    <object>
        str: <val>yo</val>,
        path: qux->qoph
    </object>,
    <object>
        start: <val>baz</val>
    </object>
</array>`)
});

test('performFullTransform - ObjectKeyValue transform', () => {
    let fb = {
        start: 'foo',
        end: 'bar'
    };
    let qq = {
        start: 'qux',
        end: 'qoph'
    };

    let items = [
        fb,
        {
            str: 'yo',
            path: qq
        },
        {
            start: 'baz'
        }
    ]

    let indentSpaces = '    ';

    let getIndent = (indent) => 
        [...Array(indent).keys()].reduce((runningIndent, _) => runningIndent + indentSpaces, '');

    let transformMap = {
        ArrayOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}<array>`,
        ArrayItemOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}`,
        ArrayItemSeparator: ({isLastItem}) => `${isLastItem ? '' : ','}`,
        ArrayClose: ({indentLevel}) => `\n${getIndent(indentLevel)}</array>`,
        ObjectOpen: ({indentLevel}) => `\n${getIndent(indentLevel)}<object>`,
        ObjectKeyValue: ({indentLevel, key, item, isLastItem}) => {
            let comma = isLastItem ? '' : ',';
            let str = `\n${getIndent(indentLevel)}${key}: ${item}${comma}`
            return str;
        },
        ObjectClose: ({indentLevel}) => `\n${getIndent(indentLevel)}</object>`,
        Value: ({item}) => `<val>${item}</val>`,
        // custom transforms
        StartEnd: {
            requiredKeys: ['start','end'],
            func: ({item,indentLevel}) => `${item.start}->${item.end}`
        }
    }

    let transformedItem = performFullTransform(items, transformMap);
    // console.log(transformedItem);
    let transformedText = transformedItem.join('');
    // console.log(transformedText);
    expect(transformedText).toEqual(`
<array>
    foo->bar,
    <object>
        str: <val>yo</val>,
        path: qux->qoph
    </object>,
    <object>
        start: <val>baz</val>
    </object>
</array>`)

    let item = {
        hour: 22,
        minute: 37,
        second: 0,
        nanosecond: 0,
        timeZoneOffsetSeconds: 0
    }
    transformedItem = performFullTransform(item, transformMap);
    transformedText = transformedItem.join('');
    // console.log(transformedText);

});

class TestClass {
    constructor(name) {
        this.name = name;
    }
}

test('findObjectsOfACertainClass', () => {
  
    let f = new TestClass('foo');
    let q = new TestClass('qux')

    let items = [
        f,
        {
            str: 'yo',
            path: q
        },
        {
            start: 'baz'
        }
    ]
    
    let matches = findObjectsOfACertainClass(items, TestClass);
    expect(matches.length).toBe(2);
    expect(matches[0]).toBe(f);
    expect(matches[1]).toBe(q);

})

test('findObjectsOfACertainClass for a Pattern', () => {

    let pattern = buildPattern();
    
    let matches = findObjectsOfACertainClass(pattern, VariableContainer);
    let nodePatterns = matches.filter(match => match instanceof NodePattern);
    let relPatterns = matches.filter(match => match instanceof RelationshipPattern)

    expect(nodePatterns.length).toBe(3);
    expect(relPatterns.length).toBe(2);

    let nodeVars = nodePatterns.map(x => x.variable);
    let relVars = relPatterns.map(x => x.variable);

    expect(nodeVars).toStrictEqual(['person','movie','director'])
    expect(relVars).toStrictEqual(['acted_in','directed'])

})

