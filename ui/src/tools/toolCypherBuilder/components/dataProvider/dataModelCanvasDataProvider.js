
import chroma from 'chroma-js';
import DataTypes from '../../../../dataModel/DataTypes';
import { intersectsWithAnyNode, findOpenPosition } from '../../../../components/canvas/d3/graphCanvasHelpers';
import { ALERT_TYPES } from '../../../../common/Constants';
import { 
    nodePatternArrayDifference,
    nodeRelNodePatternArrayDifference,
    cloneNodePattern,
    cloneRelationshipPattern
} from '../../../../dataModel/cypherPattern';
import { SyncedGraphDataAndView } from '../../../../dataModel/syncedGraphDataAndView';
import { find } from 'lodash';

export class DataModelCanvasDataProvider {

    nodeLabelStringToDisplayNodeMap = {};
    nodeRelNodeStringToDisplayRelationshipMap = {};
    displayRelationshipToRelationshipTypeMap = {};

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            cypherBuilder,
            dataModel
        } = properties;
        this.cypherBuilder = cypherBuilder;

        this.id = id;
        this.existingNodePatterns = [];
        this.existingNodeRelNodePatterns = [];
        this.syncedGraphDataAndView = new SyncedGraphDataAndView({
            id: id
        });

        this.setDataModel(dataModel);
    }

    data = () => this.syncedGraphDataAndView;

    getCypherPatternInfo = () => {
        var cypherPatterns = this.cypherBuilder.getDataProvider().getAllCypherPatterns();
        //this.existingNodePatterns = cypherPattern.getAllNodePatterns();
        //this.existingNodeRelNodePatterns = cypherPattern.getAllNodeRelNodePatterns();
        var allNodePatterns = cypherPatterns
            .map(cypherPattern => cypherPattern.getAllNodePatterns())
            .reduce((acc, x) => acc.concat(x), []);

        var allUsedNodeLabelStrings = allNodePatterns
            .map(nodePattern => nodePattern.nodeLabels)
            .reduce((acc,nodeLabels) => acc.concat(nodeLabels), []);

        var allUsedNodeRelNodePatterns = cypherPatterns
            .map(cypherPattern => cypherPattern.getAllNodeRelNodePatterns())
            .reduce((acc, x) => acc.concat(x), []);

        return { allNodePatterns, allUsedNodeLabelStrings, allUsedNodeRelNodePatterns };
    }

    addToNodeLabelStringDisplayNodeMap = (nodeLabel, displayNode) => {
        var displayNodeArray = this.nodeLabelStringToDisplayNodeMap[nodeLabel.label];
        if (!displayNodeArray) {
            displayNodeArray = [];
            this.nodeLabelStringToDisplayNodeMap[nodeLabel.label] = displayNodeArray;
        }
        displayNodeArray.push(displayNode);
    }

    addToNodeRelNodeStringToDisplayRelationshipMap = (key, displayRelationship) => {
        var array = this.nodeRelNodeStringToDisplayRelationshipMap[key];
        if (!array) {
            array = [];
            this.nodeRelNodeStringToDisplayRelationshipMap[key] = array;
        }
        array.push(displayRelationship);
    }

    addToDisplayRelationshipToRelationshipTypeMap = (relationshipType, displayRelationship) => {
        var array = this.displayRelationshipToRelationshipTypeMap[displayRelationship.key];
        if (!array) {
            array = [];
            this.displayRelationshipToRelationshipTypeMap[displayRelationship.key] = array;
        }
        array.push(relationshipType);
    }

    setDataModel = (dataModel) => {
        this.dataModel = dataModel;
        if (dataModel) {
            this.syncedGraphDataAndView.clearData();

            const { allUsedNodeLabelStrings, allUsedNodeRelNodePatterns } = this.getCypherPatternInfo();

            const secondaryNodeLabels = dataModel.getNodeLabelArray().filter(nodeLabel => nodeLabel.isOnlySecondaryNodeLabel);
            const primaryNodeLabels = dataModel.getNodeLabelArray().filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel);
            
            primaryNodeLabels.map(nodeLabel => {
                    var displayNode = this.convertNodeLabelToDisplayNode(this.syncedGraphDataAndView, 
                        nodeLabel, allUsedNodeLabelStrings)
                    this.addToNodeLabelStringDisplayNodeMap(nodeLabel, displayNode);
                    this.syncedGraphDataAndView.addNode(displayNode, true);
                });

            var dataModelCanvas = this.cypherBuilder.getDataModelGraphCanvas();
            if (dataModelCanvas) {
                var canvasAttr = dataModelCanvas.getCanvasAttr();

                // Eric comment: it looks junky arbitrarily spacing them around the canvas. 
                // We can re-add them once we have annotations 
                /*
                secondaryNodeLabels.map(nodeLabel => {
                    var displayNode = this.convertNodeLabelToDisplayNode(this.syncedGraphDataAndView, 
                        nodeLabel, allUsedNodeLabelStrings)
                    this.addToNodeLabelStringDisplayNodeMap(nodeLabel, displayNode);                    
                    const { x, y, radius } = displayNode;
                    if (intersectsWithAnyNode(this, x, y, radius)) {
                        const openPosition = findOpenPosition(this, canvasAttr);        
                        displayNode.setX(openPosition.x);
                        displayNode.setY(openPosition.y);
                    }
                    this.syncedGraphDataAndView.addNode(displayNode, true);
                });
                */
            }

            dataModel.getRelationshipTypeArray()
                .map(relationshipType => {
                    var displayRelationship = this.convertRelationshipTypeToDisplayRelationship(this.syncedGraphDataAndView, 
                                                                                    relationshipType, allUsedNodeRelNodePatterns);
                    if (displayRelationship !== null) {
                        var key = `${relationshipType.startNodeLabel.label}_${relationshipType.type}_${relationshipType.endNodeLabel.label}`;
                        this.addToNodeRelNodeStringToDisplayRelationshipMap(key, displayRelationship);
                        this.addToDisplayRelationshipToRelationshipTypeMap(relationshipType, displayRelationship);
                        this.syncedGraphDataAndView.addRelationship(displayRelationship, true);
                    }
                });
        }
    }

    nodePatternAdded = (nodePattern, dataModelCanvas) => {
        if (this.dataModel) {
            nodePattern.nodeLabels.map(nodeLabelString => {
                var displayNodeArray = this.nodeLabelStringToDisplayNodeMap[nodeLabelString];
                var nodeLabels = this.dataModel.getNodeLabelsByLabel(nodeLabelString);
                if (displayNodeArray && displayNodeArray.length > 0 && nodeLabels && nodeLabels.length > 0) {
                    displayNodeArray.map(displayNode => {
                        var nodeLabel = nodeLabels.find(nodeLabel => nodeLabel.key === displayNode.key);
                        if (nodeLabel && displayNode) {
                            this.unghostNodeLabel(displayNode, nodeLabel);
                            if (dataModelCanvas) {
                                dataModelCanvas.reRenderNode(displayNode);
                            }
                        }
                    });
                }
            });
        }
    }

    unghostNodeLabel = (displayNode, nodeLabel) => {
        var display = (nodeLabel && nodeLabel.display) ? nodeLabel.display : {
            color: 'white',
            stroke: 'black',
            fontColor: 'black'
        }
        displayNode.color = display.color;
        displayNode.stroke = display.stroke;
        displayNode.fontColor = display.fontColor;

        displayNode.fillOpacity = 1;
        displayNode.strokeWidth = 4;
        displayNode.normalStrokeWidth = 4;
        displayNode.strokeOpacity = 1;        
        displayNode.strokeDashArray = '1,0'; 
        displayNode.fontOpacity = 1;
    }

    nodeRelNodePatternAdded = (nodeRelNodePattern, dataModelCanvas) => {
        if (this.dataModel) {
            // we need to find the displayRelationship
            nodeRelNodePattern.startNodePattern.nodeLabels.map(startNodeLabelString => {
                nodeRelNodePattern.relationshipPattern.types.map(relTypeString => {
                    nodeRelNodePattern.endNodePattern.nodeLabels.map(endNodeLabelString => {
                        var key = `${startNodeLabelString}_${relTypeString}_${endNodeLabelString}`;
                        var displayRelationships = this.nodeRelNodeStringToDisplayRelationshipMap[key];
                        if (displayRelationships && displayRelationships.length > 0) {
                            displayRelationships.map(displayRelationship => {
                                this.unghostRelationshipType(displayRelationship);
                                if (dataModelCanvas) {
                                    dataModelCanvas.reRenderRelationship(displayRelationship);
                                }
                            });
                        }
                    });
                });
            });            
        }
    }

    unghostRelationshipType = (displayRelationship) => {
        // TODO: eventually find relationshipType from dataModel, however, right now there is no way to style
        //   relationshipTypes in the UI, therefore they are all the same.  Just copy defaults here
        displayRelationship.color = "black";
        displayRelationship.strokeWidth = 3;
        displayRelationship.normalStrokeWidth = 3;
        displayRelationship.strokeOpacity = 1;        
        displayRelationship.strokeDashArray = '1,0';
    }

    nodeLabelUsedInOtherPatterns = (nodeLabelString, allNodePatterns) => 
        allNodePatterns
            .filter(nodePattern => nodePattern.nodeLabels && nodePattern.nodeLabels.length > 0)
            .find(nodePattern => nodePattern.nodeLabels.includes(nodeLabelString));

    nodePatternRemoved = (nodePattern, allNodePatterns, dataModelCanvas) => {
        if (this.dataModel) {
            nodePattern.nodeLabels.map(nodeLabelString => {
                var displayNodeArray = this.nodeLabelStringToDisplayNodeMap[nodeLabelString];
                //var nodeLabels = this.dataModel.getNodeLabelsByLabel(nodeLabelString);

                if (displayNodeArray && displayNodeArray.length > 0) {
                    if (!this.nodeLabelUsedInOtherPatterns(nodeLabelString, allNodePatterns)) {
                        displayNodeArray.map(displayNode => {
                            this.ghostNodeLabelProperties(displayNode);
                            if (dataModelCanvas) {
                                dataModelCanvas.reRenderNode(displayNode);
                            }
                        });
                    }
                }
            });
        }
    }

    nodeRelNodePatternRemoved = (nodeRelNodePattern, allNodeRelNodePatterns, dataModelCanvas) => {
        if (this.dataModel) {
            var affectedRelationshipTypes = this.dataModel.getRelationshipTypeArray()
                .filter(relationshipType => 
                    nodeRelNodePattern.startNodePattern.nodeLabels.includes(relationshipType.startNodeLabel.label) &&
                    (nodeRelNodePattern.relationshipPattern.types.includes(relationshipType.type) || !relationshipType.type) &&
                    nodeRelNodePattern.endNodePattern.nodeLabels.includes(relationshipType.endNodeLabel.label)
                );

            affectedRelationshipTypes
                .filter(relationshipType => {
                    // ensure that the node-rel-node pattern is still being used
                    const match = allNodeRelNodePatterns.find(pattern => 
                        pattern.startNodePattern.nodeLabels.includes(relationshipType.startNodeLabel.label) &&
                        (pattern.relationshipPattern.types.includes(relationshipType.type) || !relationshipType.type) &&
                        pattern.endNodePattern.nodeLabels.includes(relationshipType.endNodeLabel.label)
                    );
                    const isUsed = (match) ? true : false;
                    return !isUsed;
                })
                .map(relationshipType => {
                    // ghost unused relationship types
                    var key = `${relationshipType.startNodeLabel.label}_${relationshipType.type}_${relationshipType.endNodeLabel.label}`;
                    var displayRelationships = this.nodeRelNodeStringToDisplayRelationshipMap[key];
        
                    if (displayRelationships && displayRelationships.length > 0) {
                        displayRelationships.map(displayRelationship => {
                            this.ghostRelationshipTypeProperties(displayRelationship);
                            if (dataModelCanvas) {
                                dataModelCanvas.reRenderRelationship(displayRelationship);
                            }
                        });
                    }
                })
        }
    }

    updateCypherPatterns = (cypherPatterns, dataModelCanvas) => {

        //var newNodePatterns = cypherPattern.getAllNodePatterns();
        //var newNodeRelNodePatterns = cypherPattern.getAllNodeRelNodePatterns();

        var newNodePatterns = cypherPatterns
            .map(cypherPattern => cypherPattern.getAllNodePatterns())
            .reduce((acc, x) => acc.concat(x), []);

        var newNodeRelNodePatterns = cypherPatterns
            .map(cypherPattern => cypherPattern.getAllNodeRelNodePatterns())
            .reduce((acc, x) => acc.concat(x), []);


        // handle node patterns first
        var diff = nodePatternArrayDifference(this.existingNodePatterns, newNodePatterns);
        var deletedItems = diff.inLeftOnly;
        var addedItems = diff.inRightOnly;

        addedItems.map(nodePattern => this.nodePatternAdded(nodePattern, dataModelCanvas));
        deletedItems.map(nodePattern => this.nodePatternRemoved(nodePattern, newNodePatterns, dataModelCanvas));

        // now handle node rel node patterns
        diff = nodeRelNodePatternArrayDifference(this.existingNodeRelNodePatterns, newNodeRelNodePatterns);
        deletedItems = diff.inLeftOnly;
        addedItems = diff.inRightOnly;

        addedItems.map(nodeRelNodePattern => this.nodeRelNodePatternAdded(nodeRelNodePattern, dataModelCanvas));
        deletedItems.map(nodeRelNodePattern => this.nodeRelNodePatternRemoved(nodeRelNodePattern, newNodeRelNodePatterns, dataModelCanvas));

        this.existingNodePatterns = newNodePatterns.map(x => cloneNodePattern(x));
        this.existingNodeRelNodePatterns = newNodeRelNodePatterns.map(x => ({
            startNodePattern: cloneNodePattern(x.startNodePattern),
            relationshipPattern: cloneRelationshipPattern(x.relationshipPattern),
            endNodePattern: cloneNodePattern(x.endNodePattern)
        }));
    }

    dataChanged = (dataChangeType, details) => 
        this.syncedGraphDataAndView.dataChanged(dataChangeType, details);

    getEventEmitter = () => this.syncedGraphDataAndView.getEventEmitter();

    getGhostAlpha = (color) => {
        var color = color.toLowerCase();
        if (color === '#fff' || color === '#ffffff' || color === 'white') {
            return 0.8;
        } else {
            return 0.5;
        }
        // return chroma(color).alpha(.8);
    }

    ghostNodeLabelProperties = (properties) => {
        //properties.stroke = this.ghostColor(properties.stroke);
        properties.strokeOpacity = this.getGhostAlpha(properties.stroke);
        const strokeWidth = (properties.normalStrokeWidth) ? properties.normalStrokeWidth : properties.strokeWidth;
        properties.strokeWidth = (strokeWidth > 1) ? strokeWidth - 1 : 1; 
        properties.strokeDashArray = '3,3';

        //properties.color = this.ghostColor(properties.color);
        properties.fillOpacity = this.getGhostAlpha(properties.color);
        //properties.fontColor = this.ghostColor(properties.fontColor);
        properties.fontOpacity = this.getGhostAlpha(properties.fontColor);
    }

    ghostRelationshipTypeProperties = (properties) => {
        //properties.color = this.ghostColor(properties.color);
        properties.strokeOpacity = this.getGhostAlpha(properties.color);
        const strokeWidth = (properties.normalStrokeWidth) ? properties.normalStrokeWidth : properties.strokeWidth;
        properties.strokeWidth = (strokeWidth > 1) ? strokeWidth - 1 : 1; 
        properties.strokeDashArray = '3,3';
    }

    ghostNodeLabel (nodeLabel) {
        var properties = {
            ...nodeLabel.display
        };
        this.ghostNodeLabelProperties(properties);
        return properties;
    }

    ghostRelationshipType (relationshipType) {
        var properties = {
            ...relationshipType.display
        };
        this.ghostRelationshipTypeProperties(properties);
        return properties;
    }

    isNodeLabelUsed = (nodeLabel, allUsedNodeLabelStrings) => allUsedNodeLabelStrings.includes(nodeLabel.label);

    convertNodeLabelToDisplayNode (syncedView, nodeLabel, allUsedNodeLabelStrings) {

        var properties = null;
        if (this.isNodeLabelUsed(nodeLabel, allUsedNodeLabelStrings)) {
            properties = { 
                ...nodeLabel.display,
                key: nodeLabel.key
             };
        } else {
            properties = { 
                ...this.ghostNodeLabel(nodeLabel),
                key: nodeLabel.key
             };
        }

        var displayNode = syncedView.createNode({
            key: nodeLabel.key,
            primaryNodeLabel: nodeLabel.label,
            labels: [nodeLabel.label]
        }, properties);

        return displayNode;
    }

    isRelationshipTypeUsed (relationshipType, allUsedNodeRelNodePatterns) {
        var match = allUsedNodeRelNodePatterns.find(nodeRelNode =>
                nodeRelNode.startNodePattern.nodeLabels.includes(relationshipType.startNodeLabel.label) &&
                (nodeRelNode.relationshipPattern.types.includes(relationshipType.type) || !relationshipType.type) && 
                nodeRelNode.endNodePattern.nodeLabels.includes(relationshipType.endNodeLabel.label)
        );

        return (match) ? true : false;
    }

    convertRelationshipTypeToDisplayRelationship (syncedView, relationshipType, allUsedNodeRelNodePatterns) {

        var displayStartNodeArray = this.nodeLabelStringToDisplayNodeMap[relationshipType.startNodeLabel.label];
        var displayStartNode = null;
        if (displayStartNodeArray && displayStartNodeArray.length > 0) {
            displayStartNode = displayStartNodeArray.find(x => x.key === relationshipType.startNodeLabel.key);
        }

        var displayEndNodeArray = this.nodeLabelStringToDisplayNodeMap[relationshipType.endNodeLabel.label];
        var displayEndNode = null;
        if (displayEndNodeArray && displayEndNodeArray.length > 0) {
            displayEndNode = displayEndNodeArray.find(x => x.key === relationshipType.endNodeLabel.key);
        }

        var properties = null;

        if (this.isRelationshipTypeUsed(relationshipType, allUsedNodeRelNodePatterns)) {
            properties = { 
                ...relationshipType.display,
                startDisplayNode: displayStartNode,
                endDisplayNode: displayEndNode
             };
        } else {
            properties = { 
                ...this.ghostRelationshipType(relationshipType),
                startDisplayNode: displayStartNode,
                endDisplayNode: displayEndNode
             };
        }

        if (displayStartNode && displayEndNode) {
            var displayRelationship = syncedView.createRelationship({
                key: relationshipType.key,
                type: relationshipType.type,
                startNode: displayStartNode.getNode(),
                endNode: displayEndNode.getNode()
            }, properties);
            return displayRelationship;
        } else {
            if (!displayStartNode) {
                console.log('Cannot find displayStartNode for relationshipType: ', relationshipType);
            }
            if (!displayEndNode) {
                console.log('Cannot find displayEndNode for relationshipType: ', relationshipType);
            }
            return null;
        }
    }

    removeRelationshipsForNode (displayNodeKey) {
    }

    removeNode (displayNodeKey) {
    }

    removeRelationship (displayRelationshipKey) {
    }

    getCanvasDimensions = (graphCanvas) => {
        return {
            x: 0,
            y: 0, 
            width: graphCanvas.getCanvasWidth() * 2,
            height: graphCanvas.getCanvasHeight() * 2
        }
    }

    search = (text) => {}
    
    getNodeDisplayText (displayNode) {
        return displayNode.getNode().primaryNodeLabel;
    }

    getPropertiesAnnotationText (propertyContainer) {
        return '';
    }

    getNodeDisplayAnnotationText (displayNode) {
        return this.getPropertiesAnnotationText(displayNode.node);
    }

    getRelationshipDisplayText (displayRelationship) {
        return displayRelationship.getRelationship().type;
    }

    getRelationshipDisplayAnnotationText (displayRelationship) {
        return this.getPropertiesAnnotationText(displayRelationship.relationship);
    }

    getUnghostedDisplayNode = (displayNode) => {
        var displayNodeCopy = { ...displayNode };
        displayNodeCopy.x = 0;
        displayNodeCopy.y = 0;
        displayNodeCopy.key = null;
        var nodeLabel = this.dataModel.getNodeLabelByLabel(displayNode.getNode().primaryNodeLabel);
        this.unghostNodeLabel(displayNodeCopy, nodeLabel);
        return displayNodeCopy;
    }

    nodeRelNodePatternMatchesRelationshipType = (nodeRelNodePattern, relationshipTypeArray) => {
        var startMatch = true;
        var relMatch = true;
        var endMatch = true;
        
        relationshipTypeArray = (relationshipTypeArray && relationshipTypeArray.length > 0) ? relationshipTypeArray : [];
        if (nodeRelNodePattern.startNodePattern) {
            startMatch = relationshipTypeArray.find(relationshipType => 
                nodeRelNodePattern.startNodePattern.nodeLabels.includes(relationshipType.startNodeLabel.label)
            );
        }

        if (nodeRelNodePattern.relationshipPattern) {
            relMatch = relationshipTypeArray.find(relationshipType => 
                nodeRelNodePattern.relationshipPattern.types.includes(relationshipType.type)    
            );
        }

        if (nodeRelNodePattern.endNodePattern) {
            endMatch = relationshipTypeArray.find(relationshipType => 
                nodeRelNodePattern.endNodePattern.nodeLabels.includes(relationshipType.endNodeLabel.label)
            );
        }

        return (startMatch && relMatch && endMatch);
    }


    findAllPossibleRelationshipsToAdd = (displayNode) => {

        var clickedNodeLabelString = displayNode.getNode().primaryNodeLabel;

        const { allUsedNodeLabelStrings, allUsedNodeRelNodePatterns } = this.getCypherPatternInfo();        

        var clickedNodeLabel = this.dataModel.getNodeLabelByLabel(clickedNodeLabelString);
        var relationshipTypes = this.dataModel.getRelationshipTypesForNodeLabelByKey(clickedNodeLabel.key);

        // for each relationshipType connected to the clickedNodeLabel
        //   remove any usedNodeRelNodePatterns that match the relationshipType
        //   if any relationshipTypes left, then check to see if the opposite node (not the clicked one)
        //     is contained in allUsedNodeLabelStrings 
        //   for now - if more than 1 relationship exists between the same start and end node, just pick the first one
        //     TODO: prompt the user to see which one they want

        var startNodeLabelEndNodeLabelList = [];
        var returnRelationshipTypes = [];

        relationshipTypes
            .filter(relationshipType => {
                var match = allUsedNodeRelNodePatterns.find(nodeRelNodePattern => 
                        this.nodeRelNodePatternMatchesRelationshipType(nodeRelNodePattern, [relationshipType]));
                return (match) ? false : true;
            })
            .filter(relationshipType => {
                var nodeLabelToCheck = 
                    relationshipType.startNodeLabel.label === clickedNodeLabelString ? 
                            relationshipType.endNodeLabel : relationshipType.startNodeLabel;
                return (this.isNodeLabelUsed(nodeLabelToCheck, allUsedNodeLabelStrings));
            })
            .map(relationshipType => {
                var key = `${relationshipType.startNodeLabel.label}_${relationshipType.endNodeLabel.label}`;
                if (!startNodeLabelEndNodeLabelList.includes(key)) {
                    startNodeLabelEndNodeLabelList.push(key);
                    returnRelationshipTypes.push(relationshipType);
                }
            });
        
        return returnRelationshipTypes;
    }

    nodeClick = (displayNode) => {
        var possibleRelationshipTypes = this.findAllPossibleRelationshipsToAdd(displayNode);
        if (possibleRelationshipTypes.length === 0) {
            var displayNodeCopy = this.getUnghostedDisplayNode(displayNode);
            this.cypherBuilder.addNodePatternFromDataModel(displayNodeCopy);
        } else {
            possibleRelationshipTypes.map(relationshipType => {
                var key = `${relationshipType.startNodeLabel.label}_${relationshipType.type}_${relationshipType.endNodeLabel.label}`;
                var displayRelationships = this.nodeRelNodeStringToDisplayRelationshipMap[key];
                if (displayRelationships && displayRelationships.find) {
                    var displayRelationship = displayRelationships.find(x => 
                        x.startDisplayNode.key === displayNode.key || x.endDisplayNode.key === displayNode.key
                    );
                    if (displayRelationship) {
                        this.relationshipClick(displayRelationship);
                    }
                };
            });
        }
    }

    relationshipClick = (displayRelationship) => {
        const { allUsedNodeRelNodePatterns } = this.getCypherPatternInfo();
        var match = allUsedNodeRelNodePatterns.find(nodeRelNodePattern => {
            var relationshipTypeArray = this.displayRelationshipToRelationshipTypeMap[displayRelationship.key];
            return this.nodeRelNodePatternMatchesRelationshipType(nodeRelNodePattern, relationshipTypeArray);
        });
        if (!match) {
            var relationshipTypeArray = this.displayRelationshipToRelationshipTypeMap[displayRelationship.key];
            var startDisplayNodeCopy = this.getUnghostedDisplayNode(displayRelationship.getStartNode());
            var endDisplayNodeCopy = this.getUnghostedDisplayNode(displayRelationship.getEndNode());
            this.cypherBuilder.addNodeRelNodePatternFromDataModel(startDisplayNodeCopy, relationshipTypeArray, endDisplayNodeCopy);
        } else {
            alert('That has already been added', ALERT_TYPES.WARNING);
        }
    }
}
