

import DataTypes from './DataTypes';
import { deserializeObject, getDataType, serializeObject } from './graphUtil';

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