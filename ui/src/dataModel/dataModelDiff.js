
export class GeneralDiff {
    constructor () {
        // an array of items that are in A, but not in B
        this.inAnotB = [];

        // an array of items that are in B, but not in A
        this.inBnotA = [];

        // items exists in both A and B, but is different. (example: same node label, but different properties)
        // Assuming A is master, this lists B items that are different 
        this.BdiffA = [];
    }

    anyDifference = () => {
        if (this.inAnotB.length === 0
            && this.inBnotA.length === 0
            && this.BdiffA.length === 0) {
                return false;
        } else {
            return true;
        } 
    }
}

export class NodeLabelDiff {
    constructor (props) {
        const { a, b } = props;

        // want to know if property name exists / doesn't exist - not doing detailed diff at moment
        this.a = a;
        this.b = b;
        this.propertyDiff = new GeneralDiff();
    }

    anyDifference = () => this.propertyDiff.anyDifference();
}

export class RelationshipTypeDiff {
    constructor (props) {
        const { a, b } = props;
        
        // want to know if property name exists / doesn't exist - not doing detailed diff at moment
        this.a = a;
        this.b = b;
        this.propertyDiff = new GeneralDiff();
    }

    anyDifference = () => this.propertyDiff.anyDifference();    
}

export class DataModelDiff {
    constructor () {
        this.nodeLabelDiff = new GeneralDiff();
        this.relationshipTypeDiff = new GeneralDiff();
    }

    anyDifference = () => this.nodeLabelDiff.anyDifference() || this.relationshipTypeDiff.anyDifference();

    removeAnons = () => {
        this.nodeLabelDiff.inAnotB = this.nodeLabelDiff.inAnotB.filter(x => x && x.label !== 'Anon');
        this.nodeLabelDiff.inBnotA = this.nodeLabelDiff.inBnotA.filter(x => x && x.label !== 'Anon');
        this.nodeLabelDiff.BdiffA = this.nodeLabelDiff.BdiffA.filter(x => x && x.label !== 'Anon');
        this.relationshipTypeDiff.inAnotB = this.relationshipTypeDiff.inAnotB.filter(x => x && x.type !== 'ANON');
        this.relationshipTypeDiff.inBnotA = this.relationshipTypeDiff.inBnotA.filter(x => x && x.type !== 'ANON');
        this.relationshipTypeDiff.BdiffA = this.relationshipTypeDiff.BdiffA.filter(x => x && x.type !== 'ANON');
    }
}

export const diffProperties = (A_properties, B_properties, diffObj) => {
    A_properties.map(A_prop => {
        const findResult = B_properties.find(B_prop => B_prop.name === A_prop.name);
        if (!findResult) {
            diffObj.propertyDiff.inAnotB.push(A_prop);
        }
    });
    B_properties.map(B_prop => {
        const findResult = A_properties.find(A_prop => A_prop.name === B_prop.name);
        if (!findResult) {
            diffObj.propertyDiff.inBnotA.push(B_prop);
        }
    });
}

export const diffNodeLabels = (nodeLabelA, nodeLabelB, modelA, modelB, config) => {
    config = config || {};
    
    var nodeLabelDiff = new NodeLabelDiff({ a: nodeLabelA, b: nodeLabelB});

    var A_properties = (nodeLabelA && nodeLabelA.properties) ? Object.values(nodeLabelA.properties) : [];
    var B_properties = (nodeLabelB && nodeLabelB.properties) ? Object.values(nodeLabelB.properties) : [];
    if (config.ensureOnlySecondaryNodeLabelsHavePrimaryProperties) {
        if (nodeLabelA.isOnlySecondaryNodeLabel) {
            A_properties = modelA.getAllSecondaryNodeLabelProperties(nodeLabelA);
        }
        if (nodeLabelB.isOnlySecondaryNodeLabel) {
            B_properties = modelB.getAllSecondaryNodeLabelProperties(nodeLabelB);
        }
    }
    
    diffProperties(A_properties, B_properties, nodeLabelDiff);
    return nodeLabelDiff;
}

export const diffRelationshipTypes = (relTypeA, relTypeB) => {
    var relationshipTypeDiff = new RelationshipTypeDiff({ a: relTypeA, b: relTypeB });

    var A_properties = (relTypeA && relTypeA.properties) ? Object.values(relTypeA.properties) : [];
    var B_properties = (relTypeB && relTypeB.properties) ? Object.values(relTypeB.properties) : [];

    diffProperties(A_properties, B_properties, relationshipTypeDiff);
    return relationshipTypeDiff;
}

const nodeLabelsMatch = (nodeLabelA, nodeLabelB, modelA, modelB, config) => {
    config = config || {};
    if (nodeLabelA && nodeLabelB) {
        if (nodeLabelA.label === nodeLabelB.label) {
            return true;
        } else {
            if (config.allowRelationshipAnonStartEndToMatch) {
                if (nodeLabelA.label === 'Anon' || nodeLabelB.label === 'Anon') {
                    return true;
                }
            }

            if (config.primaryNodeLabelRelationshipsIncludeSecondaryNodeLabels) {
                var A_labels = [nodeLabelA.label].concat(nodeLabelA.getSecondaryData().map(x => x.label));
                var B_labels = [nodeLabelB.label].concat(nodeLabelB.getSecondaryData().map(x => x.label));
    
                // checking for greater than 1 because already checked the first entries against each other previously
                if (A_labels.length > 1 || B_labels.length > 1) {   
                    var result = A_labels.find(x => B_labels.includes(x));
                    return (result) ? true : false;
                }
            }
        }
    }
    return false;
}

export const diffDataModels = (modelA, modelB, config) => {
    config = config || {};
    const removeAnons = (typeof(config.removeAnons) === 'boolean') ? config.removeAnons : true;

    var dataModelDiff = new DataModelDiff();

    var A_NodeLabels = (modelA && modelA.getNodeLabelArray) ? modelA.getNodeLabelArray() : [];
    var B_NodeLabels = (modelB && modelB.getNodeLabelArray) ? modelB.getNodeLabelArray() : [];

    A_NodeLabels.map((a) => {
        var found = false;
        for (var i = 0; i < B_NodeLabels.length; i++) {
            var b = B_NodeLabels[i];
            if (a.label === b.label) {
                // we have a match, compare properties 
                var diff = diffNodeLabels(a, b, modelA, modelB, config);
                if (diff.anyDifference()) {
                    dataModelDiff.nodeLabelDiff.BdiffA.push(diff);              
                }
                found = true;
                B_NodeLabels.splice(i,1);
                break;
            }
        }
        if (!found) {
            dataModelDiff.nodeLabelDiff.inAnotB.push(a);
        }
    });
    dataModelDiff.nodeLabelDiff.inBnotA = B_NodeLabels;

    var A_RelationshipTypes = (modelA && modelA.getRelationshipTypeArray) ? modelA.getRelationshipTypeArray() : [];
    var B_RelationshipTypes = (modelB && modelB.getRelationshipTypeArray) ? modelB.getRelationshipTypeArray() : [];

    A_RelationshipTypes.map(a => {
        var found = false;
        for (var j = 0; j < B_RelationshipTypes.length; j++) {
            var b = B_RelationshipTypes[j];
            if (a.type === b.type
                && nodeLabelsMatch(a.startNodeLabel, b.startNodeLabel, modelA, modelB, config)
                && nodeLabelsMatch(a.endNodeLabel, b.endNodeLabel, modelA, modelB, config)) {
                    var diff = diffRelationshipTypes(a, b);
                    if (diff.anyDifference()) {
                        dataModelDiff.relationshipTypeDiff.BdiffA.push(diff);              
                    }

                found = true;
                B_RelationshipTypes.splice(j,1);
                j--;
                //break;
                // we shouldn't break, instead keep going in case there are other variants
                //  that match and need to be removed, 
                //    e.g. A has (:Foo)-[:BAZ]->(:Bar) 
                //     and B has (:Foo)-[:BAZ]->(:Bar) and (:Foo)-[:BAZ]->()
                //   Both matching entries in B should be removed
            }
        }
        if (!found) {
            dataModelDiff.relationshipTypeDiff.inAnotB.push(a);
        }
    });
    dataModelDiff.relationshipTypeDiff.inBnotA = B_RelationshipTypes;
 
    if (removeAnons) {
        dataModelDiff.removeAnons();
    } 
    return dataModelDiff;
}