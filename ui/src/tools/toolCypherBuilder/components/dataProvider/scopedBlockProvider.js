import React, { Component } from 'react';
import { CypherVariableScope } from '../../../../dataModel/cypherVariableScope';
import BlockUpdateType from './blockUpdateTypes';
import { ReturnClauseDataProvider } from './returnClauseDataProvider';

export default class ScopedBlockProvider extends Component {

    constructor (properties) {
        super(properties);
        properties = (properties) ? properties : {};

        var {
            variableScope,
            cypherBlocks,
            cypherBuilder,
        } = properties;

        this.cypherBuilder = cypherBuilder;
        this.cypherBlocks = (cypherBlocks) ? cypherBlocks : [];
        this.variableScope = (variableScope) ? variableScope : new CypherVariableScope();
    }

    getPreviousScopedBlockProvider = () => this.previousScopedBlockProvider;
    setPreviousScopedBlockProvider = (previousScopedBlockProvider) => this.previousScopedBlockProvider = previousScopedBlockProvider;

    getNextScopedBlockProvider = () => this.nextScopedBlockProvider;
    setNextScopedBlockProvider = (nextScopedBlockProvider) => this.nextScopedBlockProvider = nextScopedBlockProvider;

    getVariableScope = () => this.variableScope;
    getCypherBlocks = () => this.cypherBlocks.slice();

    setCypherBlocks = (cypherBlocks, options) => {
        options = options || {};
        var { skipUpdate } = options;
        this.cypherBlocks = (cypherBlocks && cypherBlocks.slice) ? cypherBlocks.slice() : [];
        this.cypherBlocks
            .filter(block => block.dataProvider && block.dataProvider.setVariableScope)
            .map(block => block.dataProvider.setVariableScope(this.variableScope))

        if (!skipUpdate) {
            this.cypherBlocks.map(block => this.handleSpecificBlockUpdated({
                block: block,
                cypherBlockKey: block.key,
                updateType: BlockUpdateType.ScopeChange
            }));
        }
    }

    removeBlockByIndex = (cypherBlockIndex) => {
        if (cypherBlockIndex !== -1) {
            this.cypherBlocks.splice(cypherBlockIndex, 1);
            this.cypherBlocks.map(block => this.handleSpecificBlockUpdated({
                block: block,
                cypherBlockKey: block.key,
                updateType: BlockUpdateType.ScopeChange
            }));
        } else {
            throw new Error('scopedBlockProvider.removeBlockByIndex: index is -1')
        }
    }

    addBlockAtIndex = (insertIndex, newBlock) => {
        if (insertIndex === -1) {
            // we'll add it to the end
            this.cypherBlocks.push(newBlock);
        } else {
            this.cypherBlocks.splice(insertIndex, 0, newBlock);
            if (newBlock.dataProvider && newBlock.dataProvider.setVariableScope) {
                newBlock.dataProvider.setVariableScope(this.variableScope);
            }

            //this.cypherBlocks.slice(insertIndex + 1).map(block => this.handleSpecificBlockUpdated({
            this.cypherBlocks.slice(insertIndex).map(block => this.handleSpecificBlockUpdated({
                block: block,
                cypherBlockKey: block.key,
                updateType: BlockUpdateType.ScopeChange
            }));
        }
    }

    getCypherPatterns = () => this.cypherBlocks
            .filter(block => block.dataProvider && block.dataProvider.getCypherPattern)
            .map(block => block.dataProvider.getCypherPattern());

    /*
    getVariableSet = () => this.getCypherPatterns()
            .map(pattern => pattern.getVariableSet())
            .reduce((totalSet, varSet) => {
                for (let varItem of varSet) {
                    totalSet.add(varItem);
                }
                return totalSet;
            }, new Set());
    */
    getVariableSet = () => this.variableScope.getVariableSet();

    getNodeRelNodePattern = (relationshipPatternItem) => {
        var cypherPatterns = this.getCypherPatterns().reverse();
        for (var i = 0; i < cypherPatterns.length; i++) {
            const cypherPattern = cypherPatterns[i];
            var nodeRelNode = cypherPattern.getNodeRelNodePattern(relationshipPatternItem);
            if (nodeRelNode) {
                return nodeRelNode;
            }
        }
    }

    containsCypherBlock = (cypherBlockKey) => {
        var match = this.cypherBlocks.find(block => block.key === cypherBlockKey);
        return (match) ? true : false;
    }

    renameVariable = (args) => {
        args = args || {};
        var {
            variablePreviousValue, 
            variable, 
            item
        } = args;

        this.getVariableScope().renameVariable(variablePreviousValue, variable, item);        

        this.getCypherBlocks()
            .filter(block => block.dataProvider && block.dataProvider.renameVariable)
            .map(block => block.dataProvider.renameVariable(args));
    }

    updateSubsequentBlocks = (args) => {
        args = args || {};
        const { cypherBlockKey } = args;
        const updatedBlockIndex = this.cypherBlocks.findIndex(block => block.key === cypherBlockKey);
        const blocksToUpdate = this.cypherBlocks.slice(updatedBlockIndex+1);
        blocksToUpdate
            .filter(block => block.dataProvider && block.dataProvider.handleBlockUpdated)
            .map(block => block.dataProvider.handleBlockUpdated({
                scopedBlockProvider: this,
                ...args
            }));
    }

    handleBlockUpdated = (args) => {
        args = args || {};
        const { cypherBlockKey} = args;
        this.cypherBlocks
            .filter(block => block.dataProvider && block.dataProvider.handleBlockUpdated)
            .filter(block => block.key !== cypherBlockKey)
            .map(block => block.dataProvider.handleBlockUpdated({
                scopedBlockProvider: this,
                ...args
            }));

        switch (args.updateType) {
            case BlockUpdateType.NodePatternUpdateVariable:
            case BlockUpdateType.RelationshipPatternUpdateVariable:
            case BlockUpdateType.RelationshipPatternUpdateRange:
                // don't update cypher pattern - update cypher only
                this.cypherBuilder.updateCypher();
                break;
            default: 
                this.cypherBuilder.updateCypherPattern();
                break;
        }
    }

    handleSpecificBlockUpdated = (args) => {
        args = args || {};
        const { block } = args;
        if (block.dataProvider && block.dataProvider.handleBlockUpdated) {
            block.dataProvider.handleBlockUpdated({
                scopedBlockProvider: this,
                ...args
            })            
        }
    }

    getNearestReturnClauseDataProvider = (cypherBlockKey) => {
        const requestingBlockIndex = this.cypherBlocks.findIndex(block => block.key === cypherBlockKey);

        var dataProvider = null;
        for (var i = requestingBlockIndex - 1; i >= 0; i--) {
            const cypherBlock = this.cypherBlocks[i];
            if (cypherBlock.dataProvider && cypherBlock.dataProvider instanceof ReturnClauseDataProvider) {
                dataProvider = cypherBlock.dataProvider;
                break;
            }
        }
        return dataProvider;
    }

    
}