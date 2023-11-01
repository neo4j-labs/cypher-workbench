
import { isFeatureLicensed, FEATURES } from '../../../common/LicensedFeatures';
import { ALERT_TYPES } from '../../../common/Constants';

import { RELATIONSHIP_DISPLAY } from '../toolConstants';
import { removeNodeArcs, updateArcIcon } from '../../../components/canvas/d3/nodeArcs';
import { DEFAULT_CONSTANTS } from '../../../components/canvas/d3/canvasConfigDefaultConstants';

import { GraphViewChangeType } from '../../../dataModel/graphDataConstants';

export const CONTAINER_CALLBACK_MESSAGES = {
    SHOW_PROPERTIES: 'showProperties',
    SHOW_RELATIONSHIP_CARDINALITY: 'showRelationshipCardinality',
    PROMPT_USER: 'promptUser'
}

var fontAwesomeUnicodeIconMap = {
    'expand': '\uf065',
    'lock': '\uf023',
    'unlock': '\uf09c',
    'trash': '\uf1f8',
    'reverse': '\uf337',
    'comment': '\uf075',
    'thlist': '\uf00b',
    'key': '\uf084',
    'shareAlt': '\uf1e0'
}

var getIconName = function (actionName) {
    if (actionName == 'delete') {
        return 'trash';
    } else if (actionName == 'unlockPosition') {
        return 'unlock';
    } else if (actionName == 'lockPosition') {
        return 'lock';
    } else if (actionName == 'annotate') {
        return 'thlist';
        //return 'comment';
    } else if (actionName == 'cardinality') {
        return 'shareAlt'
    } else {
        return actionName;
    }
}

export class CanvasConfig {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            dataProvider,
            containerCallback
        } = properties

        this.dataProvider = dataProvider;
        this.containerCallback = containerCallback;

        // set when graphCanvas is initialized
        this.graphCanvas = undefined;
        this.selectionHelper = undefined;
        this.relationshipRibbon = undefined;

        this.canvasConstants = { 
            ...DEFAULT_CONSTANTS,
            DEFAULT_RELATIONSHIP_DISPLAY: RELATIONSHIP_DISPLAY.NORMAL
        };
    }

    setDataProvider = (dataProvider) => this.dataProvider = dataProvider;

    getConstants () {
        return this.canvasConstants;
    }

    setContainerCallback (containerCallback) {
        this.containerCallback = containerCallback;
    }

    getContainerCallback () {
        return this.containerCallback;
    }

    getGraphCanvas () {
        return this.graphCanvas;
    }

    setGraphCanvas (graphCanvas) {
        this.graphCanvas = graphCanvas;
        this.selectionHelper = graphCanvas.getSelectionHelper();
        this.relationshipRibbon = graphCanvas.getRelationshipRibbon();
    }

    getRibbonDefinitions (connectsToSelf) {
        var ribbonDefinitions = {
            /*
            annotate: {
                tooltip: 'Show Properties',
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('annotate')],
                onClick: (properties) => {
                    var { 
                        displayRelationship,
                        relationshipSvgEl
                    } = properties;

                    this.containerCallback({ 
                        message: CONTAINER_CALLBACK_MESSAGES.SHOW_PROPERTIES, 
                        propertyContainer: displayRelationship 
                    });
                    this.relationshipRibbon.removeRelRibbon({
                        relSvgEl: relationshipSvgEl
                    });
                }
            },
            */
            delete: {
                tooltip: 'Delete',
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('delete')],
                onClick: () => this.deleteSelectedItems()
            },
            reverse: {
                tooltip: 'Reverse Relationship',
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('reverse')],
                onClick: () => {
                    if (this.graphCanvas.getUserRole().canEditShowMessage()) {
                        this.selectionHelper.getSelectedRelationshipArray().map(displayRelationship => {
                            this.dataProvider.reverseRelationship(displayRelationship, true);
                        });
                        this.dataProvider.updateCurrentCypherAndPattern();
                    }
                }
            }
        }

        var keysToExclude = [];
        if (connectsToSelf) { keysToExclude.push('reverse')}    
        if (!isFeatureLicensed(FEATURES.MODEL.RelationshipCardinality)) { keysToExclude.push('cardinality') } 
        var returnActions = {};
        Object.keys(ribbonDefinitions)
            .filter(key => !keysToExclude.includes(key))
            .map(key => returnActions[key] = ribbonDefinitions[key])        

        return returnActions;
    }

    getArcDefinitions () {
        var arcDefinitions = {
            /*
            lockPosition: {
                tooltip: "Lock Position",
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('lockPosition')],
                onClick: (properties) => {
                    var { arcSvgEl, displayNode, graphCanvas } = properties;
                    displayNode.setIsLocked(!displayNode.getIsLocked());
                    var iconUnicode = (displayNode.getIsLocked()) ? 
                                            fontAwesomeUnicodeIconMap[getIconName('lockPosition')] : 
                                            fontAwesomeUnicodeIconMap[getIconName('unLockPosition')]
                    updateArcIcon(arcSvgEl, iconUnicode);
            
                    graphCanvas.getSelectedNodeArray()
                        .filter(selectedDisplayNode => selectedDisplayNode.key !== displayNode.key)
                        .map(selectedDisplayNode => {
                            if (selectedDisplayNode.getIsLocked() !== displayNode.getIsLocked()) {
                                selectedDisplayNode.setIsLocked(displayNode.getIsLocked())
                                var lockSvgEl = graphCanvas.getArcSvgEl(selectedDisplayNode, "lockPosition");
                                iconUnicode = (selectedDisplayNode.getIsLocked()) ? 
                                                fontAwesomeUnicodeIconMap[getIconName('lockPosition')] : 
                                                fontAwesomeUnicodeIconMap[getIconName('unLockPosition')]
                                updateArcIcon(lockSvgEl, iconUnicode);
                            }
                        });
                }
            },
            */
            delete: {
                tooltip: "Delete",
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('delete')],
                onClick: () => this.deleteSelectedItems()
            },
            /*
            annotate: {
                tooltip: "Show Properties",
                iconUnicode: fontAwesomeUnicodeIconMap[getIconName('annotate')],
                onClick: (properties) => {
                    var { 
                        displayNode,
                        nodeSvgEl
                    } = properties;

                    alert('This feature not implemented yet', ALERT_TYPES.WARNING);
                    
                    // this was block was commented out before I commented out annotate
                    this.containerCallback({ 
                        message: CONTAINER_CALLBACK_MESSAGES.SHOW_PROPERTIES, 
                        propertyContainer: displayNode 
                    });
                    removeNodeArcs({
                        nodeSvgEl: nodeSvgEl
                    });
                    // end block was commented out before I commented out annotate
                }
            }
            */
        }
        return arcDefinitions;
    }

    /*
    handleEdit () {
        if (this.graphCanvas.getUserRole().canEditShowMessage()) {
            //handleEdit(this);
            alert('TODO: fix handle edit');
        }
    }*/

    deleteSelectedItems () {
        if (this.graphCanvas.getUserRole().canEditShowMessage()) {
            var selectionArray = this.selectionHelper.getSelectionArray();

            var deleteItems = (() => {
                selectionArray.map(x => {
                    if (x.classType === 'NodeDisplay') {
                        this.dataProvider.removeRelationshipsForNode(x.key, true);
                        this.dataProvider.removeNode(x.key, true);
                    } else if (x.classType === 'RelationshipDisplay') {
                        this.dataProvider.removeRelationship(x.key, true);
                    }
                });
                this.dataProvider.reRenderAfterDelete();
            })

            if (selectionArray.length > 1) {
                // prompt user to confirm
                this.containerCallback({
                    message: CONTAINER_CALLBACK_MESSAGES.PROMPT_USER,
                    title: 'Delete Items',
                    description: `Do you want to delete the selected items?`,
                    yesAction: () => deleteItems()
                });
            } else {
                deleteItems();
            }
        }
    }

    getRelationshipDisplaySettings (relationshipDisplay) {
        var settings = {};
        switch (relationshipDisplay) {
            case RELATIONSHIP_DISPLAY.MEDIUM:
                settings = { color: 'gray', strokeWidth: '2' }
                break;
            case RELATIONSHIP_DISPLAY.LIGHT:
                settings = { color: 'lightgray', strokeWidth: '1' }
                break;
            case RELATIONSHIP_DISPLAY.NORMAL:
            default:
                settings = { color: 'black', strokeWidth: '3' }
                break;
        }
        return settings;
    }
}

