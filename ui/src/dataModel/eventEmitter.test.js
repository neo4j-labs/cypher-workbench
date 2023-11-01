
import { EventEmitter, EventListener, listenTo, stopListeningTo } from './eventEmitter';
import { deserializeObject, serializeObject } from './graphUtil';

test('test emitter and listener', () => {

    var emitter = new EventEmitter('a');
    var listener = new EventListener('b', (id, messageName, messagePayload) => {
        expect(id).toBe('a');
        expect(messageName).toBe('foo');
        expect(messagePayload).toStrictEqual({bar:'baz'});
    });

    emitter.addListener(listener);
    emitter.notifyListeners('foo', {bar: 'baz'});
});

test('test listener for dataModel changes', () => {

    var dataModel = new EventEmitter('dataModel');
    var canvas = new EventListener('canvas', (id, messageName, messagePayload) => {
        expect(id).toBe('dataModel');
        expect(messageName).toBe('NodeDataChanged');
        expect(messagePayload.id).toBe('123');
        expect(messagePayload.data).toStrictEqual({ name: 'abc'});
    });

    var codeEditor = new EventListener('codeEditor', (id, messageName, messagePayload) => {
        expect(id).toBe('dataModel');
        expect(messageName).toBe('NodeDataChanged');
        expect(messagePayload.id).toBe('123');
        expect(messagePayload.data).toStrictEqual({ name: 'abc'});
    });

    dataModel.addListener(canvas);
    dataModel.addListener(codeEditor);
    dataModel.notifyListeners('NodeDataChanged', {id: '123', data: { name: 'abc'}});
});

class Foo {
    constructor() {
        this.fooEmitter = new EventEmitter('fooEmitter');
    }

    getSerializableId = () => 'foo_id';

    getEventEmitter = () => this.fooEmitter;

    emitTestEvent = () => {
        this.fooEmitter.notifyListeners('TestEvent', {messageContents: 'foo'});        
    }
}

test('test listenTo', () => {
    var foo = new Foo();
    listenTo(foo, "fooListener", (id, messageName, messagePayload) => {
        expect(id).toBe("fooEmitter");
        expect(messageName).toBe("TestEvent");
        expect(messagePayload).toStrictEqual({messageContents: 'foo'});
    });

    foo.emitTestEvent();
});

test('test removeListener after listenTo', () => {
    var foo = new Foo();
    listenTo(foo, "fooListener", (id, messageName, messagePayload) => {
        // do nothing
    });

    expect(foo.getEventEmitter().getListeners().length).toBe(1);
    foo.getEventEmitter().removeListenerById('fooListener');
    expect(foo.getEventEmitter().getListeners().length).toBe(0);
});

test('test stop listening to', () => {
    var foo = new Foo();
    listenTo(foo, "fooListener", (id, messageName, messagePayload) => {
        // do nothing
    });

    expect(foo.getEventEmitter().getListeners().length).toBe(1);
    stopListeningTo(foo, "fooListener");
    expect(foo.getEventEmitter().getListeners().length).toBe(0);
});

test('replace listener', () => {
    var foo = new Foo();

    var firstListener = (id, messageName, messagePayload) => {}
    var secondListener = (id, messageName, messagePayload) => {}

    listenTo(foo, "fooListener", firstListener);

    expect(foo.getEventEmitter().getListeners().length).toBe(1);
    expect(foo.getEventEmitter().getListeners()[0]).toStrictEqual(
        new EventListener("fooListener", firstListener)
    );

    listenTo(foo, "fooListener", secondListener, true);

    expect(foo.getEventEmitter().getListeners().length).toBe(1);
    expect(foo.getEventEmitter().getListeners()[0]).toStrictEqual(        
        new EventListener("fooListener", secondListener)
    );
});

test('test bad listen to', () => {
    var anObject = {};
    var thrownError = null;
    try {
        listenTo(anObject, "object listener", () => {});
    } catch (e) {
        thrownError = e;
    }
    expect(thrownError).not.toBe(null);
});

test('serialize/deserialize', () => {
    var foo = new Foo();

    var instanceMapper = {
        Foo: () => new Foo(),
        EventEmitter: () => new EventEmitter()
    }

    var serializedFoo = serializeObject(foo);
    //console.log('serializedFoo: ', serializedFoo);
    var deserializedFoo = deserializeObject(serializedFoo, instanceMapper);

    listenTo(deserializedFoo, "fooListener", (id, messageName, messagePayload) => {
        //console.log('serialized/deserialize in listenTo')
        //expect(false).toBe(true);
        expect(id).toBe("fooEmitter");
        expect(messageName).toBe("TestEvent");
        expect(messagePayload).toStrictEqual({messageContents: 'foo'});
    });

    deserializedFoo.emitTestEvent();    

});
