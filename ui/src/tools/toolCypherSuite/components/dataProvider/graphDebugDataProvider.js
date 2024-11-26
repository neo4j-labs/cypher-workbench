
import { SyncedGraphDataAndView } from '../../../../dataModel/syncedGraphDataAndView';

export class GraphDebugDataProvider {

    nodeLabelStringToDisplayNodeMap = {};
    nodeRelNodeStringToDisplayRelationshipMap = {};
    displayRelationshipToRelationshipTypeMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            parentContainer
        } = properties;
        this.parentContainer = parentContainer;

        this.id = id;
        this.syncedGraphDataAndView = new SyncedGraphDataAndView({
            id: id
        });
    }

    data = () => this.syncedGraphDataAndView;

    dataChanged = (dataChangeType, details) => {
        this.syncedGraphDataAndView.dataChanged(dataChangeType, details);
    }

    getEventEmitter = () => this.syncedGraphDataAndView.getEventEmitter();

    isNodeLabelUsed = (nodeLabel, allUsedNodeLabelStrings) => allUsedNodeLabelStrings.includes(nodeLabel.label);

    search = (text) => {
        throw new Error('TODO: search not implemented')
    }
    
    getNodeDisplayText (displayNode) {
        const node = displayNode.getNode();
        var label = node.primaryNodeLabel;
        if (!label) {
            label = `${node.labels.join(':')} ${node.neoInternalId}`
        }
        return label;
    }

    getNodeDisplayAnnotationText (displayNode) {
        // TODO
        return '';
    }    

    getRelationshipDisplayAnnotationText (displayRelationship) {
        // TODO
        return '';
    }

    getRelationshipDisplayText (displayRelationship) {
        return displayRelationship.getRelationship().type;
    }

    newRelationshipBetweenExistingNodes = ({
        startNode,
        startNodeCoords,
        endNode,
        endNodeCoords,
        graphCanvas        
    }) => {
        throw new Error('TODO: newRelationshipBetweenExistingNodes not implemented')
    }

    newRelationshipToEmptyNode = ({
        coords,
        startNode,
        startNodeCoords,
        popupCoords,
        graphCanvas        
    }) => {
        throw new Error('TODO: newRelationshipToEmptyNode not implemented')
    }

    createNewNode = (displayProperties) => {
        throw new Error('TODO: createNewNode not implemented')
    }

    addNode = (newNode) => {
        throw new Error('TODO: addNode not implemented')
    }

    removeRelationshipsForNode (displayNodeKey) {
        throw new Error('TODO: removeRelationshipsForNode not implemented')
    }

    removeNode (displayNodeKey) {
        throw new Error('TODO: removeNode not implemented')
    }

    removeRelationship (displayRelationshipKey) {
        throw new Error('TODO: removeRelationship not implemented')
    }

    getConnectedRelationshipBetweenNodes = (startNode, endNode) => {
        throw new Error('TODO: getConnectedRelationshipBetweenNodes not implemented')
    }
    getNewRelationship = (properties) => {
        throw new Error('TODO: getNewRelationship not implemented')
    }

    nodeClick = (displayNode) => {
        //throw new Error('TODO: nodeClick not implemented')
        return false;
    }

    relationshipClick = (displayRelationship) => {
        //throw new Error('TODO: relationshipClick not implemented')
        return false;
    }
}
