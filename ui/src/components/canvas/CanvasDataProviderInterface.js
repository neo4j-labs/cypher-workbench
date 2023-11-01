
export class CanvasDataProviderInterface {
    constructor () {}

    // each node should have a key property
    getNodes () {}  
    getNodeByKey (key) {}

    // each relationship should have a key property
    getRelationships () {}
    getRelationshipByKey (key) {}

    // called when the canvas needs to add a new node
    getNewNode () {}

    // called when the canvas needs to add a new relationship / node combination 
    getNewRelNode () {}
}