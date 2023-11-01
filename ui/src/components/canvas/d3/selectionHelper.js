
import * as d3 from "d3";
import { CANVAS_MESSAGES } from './graphCanvas';
import { NodeDisplay, RelationshipDisplay } from '../../../dataModel/graphDataView';

export class SelectionHelper {

    constructor (eventEmitter, highlightClasses) {
        highlightClasses = highlightClasses || {};

        this.nodeHighlightClass = highlightClasses.nodeHighlight || 'highlightNode';
        this.nodeTextHighlightClass = highlightClasses.nodeTextHighlight || 'highlightText';
        this.relHighlightClass = highlightClasses.relHighlight || 'highlightRel';
        this.relTextHighlightClass = highlightClasses.relTextHighlight || 'highlightText';

        this.eventEmitter = eventEmitter;
        this.selections = {};
    }

    getSelectionArray () {
        return Object.values(this.selections).map(x => x.graphDataItem);
    }

    getSelectedNodeArray () {
        return this.getSelectionArray().filter(x => x.classType === 'NodeDisplay');
    }

    getSelectedRelationshipArray () {
        return this.getSelectionArray().filter(x => x.classType === 'RelationshipDisplay');
    }

    isAnythingSelected () {
        return (Object.keys(this.selections).length > 0) ? true : false;
    }

    amISelected (item) {
        return (this.selections[item.key]) ? true : false;
    }

    addNodeSelection (nodeSvgEl, displayNode, dontNotify) {
        this.selections[displayNode.key] = {
            graphDataItem: displayNode,
            domEl: nodeSvgEl
        };
        var nodeEl = d3.select(nodeSvgEl)
            .raise();

        nodeEl
            .select(".displayCircle")
            .classed(this.nodeHighlightClass, true);

        nodeEl
            .select(".displayText")
            .classed(this.nodeTextHighlightClass, true);

        if (!dontNotify) {
            this.notifyCurrentSelectedNodes();
        }
    }

    removeNodeSelection (nodeSvgEl, displayNode, dontNotify) {
        delete this.selections[displayNode.key];
        var nodeEl = d3.select(nodeSvgEl)

        nodeEl.select(".displayCircle").classed(this.nodeHighlightClass, false);
        nodeEl.select(".displayText").classed(this.nodeTextHighlightClass, false);

        if (!dontNotify) {
            this.notifyCurrentSelectedNodes();
        }
    }

    addRelSelection (relSvgEl, relationship, dontNotify) {
        this.selections[relationship.key] = {
            graphDataItem: relationship,
            domEl: relSvgEl
        };
        var relEl = d3.select(relSvgEl)
            .raise();

        relEl
            .select(".relationshipLine")
            .classed(this.relHighlightClass, true);

        relEl
            .select(".displayText")
            .classed(this.relTextHighlightClass, true);

        if (!dontNotify) {
            this.eventEmitter.notifyListeners(
                CANVAS_MESSAGES.SELECTION_ADDED,
                {
                    relationshipKey: relationship.key, 
                    relationship: relationship
                }
            )
        }
    }

    removeRelSelection (relSvgEl, relationship, dontNotify) {
        delete this.selections[relationship.key];
        var relEl = d3.select(relSvgEl)
            .lower();

        relEl
            .select(".relationshipLine")
            .classed(this.relHighlightClass, false);

        relEl
            .select(".displayText")
            .classed(this.relTextHighlightClass, false);

        if (!dontNotify) {
            this.eventEmitter.notifyListeners(
                CANVAS_MESSAGES.SELECTION_REMOVED,
                {
                    relationshipKey: relationship.key, 
                    relationship: relationship
                }
            )
        }
    }

    clearSelections() {
        Object.values(this.selections).map(aSelection => {
            var domEl = null;
            if (aSelection.graphDataItem instanceof NodeDisplay) {
                domEl = d3.select(aSelection.domEl);

                domEl.select(".displayCircle").classed(this.nodeHighlightClass, false);
                domEl.select(".displayText").classed(this.nodeTextHighlightClass, false);

            } else if (aSelection.graphDataItem instanceof RelationshipDisplay) {
                domEl = d3.select(aSelection.domEl);
                
                domEl.select(".relationshipLine").classed(this.relHighlightClass, false);
                domEl.select(".displayText").classed(this.relTextHighlightClass, false);
            }
        });
        this.selections = {};
        this.notifyCurrentSelectedNodes();
    }

    notifyCurrentSelectedNodes () {
        var selectedNodes = this.getSelectedNodeArray();
        var selectedNodeKeys = selectedNodes.map(x => x.key);
        this.eventEmitter.notifyListeners(
            CANVAS_MESSAGES.CURRENT_SELECTED_ITEMS,
            {
                selectedNodeKeys: selectedNodeKeys, 
                selectedNodes: selectedNodes
            }
        )
    }

}

