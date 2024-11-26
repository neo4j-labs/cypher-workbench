
export class EventEmitter {
    constructor(id) {

        this.myObjectName = 'EventEmitter';    // because either Chrome or React is changing object.constructor.name
                
        this.id = id;
        this.listeners = [];
    }

    setId = (id) => this.id = id;

    addListener = (eventListener, replace) => {
        var existingListenerIndex = this.listeners.findIndex(x => x.id === eventListener.id);
        if (existingListenerIndex === -1) {
            this.listeners.push(eventListener);
        } else {
            if (replace) {
                this.listeners.splice(existingListenerIndex, 1);
                this.listeners.push(eventListener);
            }
        }
    }

    removeListener = (eventListener) => {
        for (var i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i].id === eventListener.id) {
                this.listeners.splice(i,1);
                break;
            }
        }
    }

    removeListenerById = (eventListenerId) => {
        for (var i = 0; i < this.listeners.length; i++) {
            if (this.listeners[i].id === eventListenerId) {
                this.listeners.splice(i,1);
                break;
            }
        }
    }

    getListeners = () => this.listeners.slice();

    notifyListeners = (messageName, messagePayload) => {
        this.listeners.map(listener => {
            try {
                listener.notifyEventEmitted(this.id, messageName, messagePayload);
            } catch (e) {
                console.log(`error notifying listener id: ${listener.id}`, e);
            }
        });
    }

    removeAllListeners = () => this.listeners = [];
}

export class EventListener {
    constructor (id, listener) {

        this.myObjectName = 'EventListener';    // because either Chrome or React is changing object.constructor.name

        this.id = id;
        // should receive id, messageName, messagePayload
        this.notifyEventEmitted = listener;
    }
}

export function listenTo (objectWithEventEmitter, id, listener, replace) {
    var eventListener = new EventListener(id, listener);
    if (objectWithEventEmitter.getEventEmitter) {
        objectWithEventEmitter.getEventEmitter().addListener(eventListener, replace);
    } else {
        //console.log("objectWithEventEmitter does not have method getEventEmitter: ", objectWithEventEmitter);
        throw new Error("objectWithEventEmitter does not have method getEventEmitter, check console");
    }
}

export function stopListeningTo (objectWithEventEmitter, id) {
    if (objectWithEventEmitter.getEventEmitter) {
        objectWithEventEmitter.getEventEmitter().removeListenerById(id);
    } else {
        //console.log("objectWithEventEmitter does not have method getEventEmitter: ", objectWithEventEmitter);
        throw new Error("objectWithEventEmitter does not have method getEventEmitter, check console");
    }
}

