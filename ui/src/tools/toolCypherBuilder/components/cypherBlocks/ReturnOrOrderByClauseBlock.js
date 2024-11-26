
import React, { Component } from 'react';
import {
    FormControl, FormControlLabel, FormLabel,
    Radio, RadioGroup,
    TextField 
} from '@material-ui/core';

import SearchableChips from '../../../../components/common/SearchableChips';
import ReturnItems from './ReturnOrOrderByItems';
import ReturnEditHelper from './ReturnEditHelper';
import OrderByEditHelper from './OrderByEditHelper';
import { 
    SimpleReturnItem, 
    returnItem,
    parseReturnItemText
} from '../../../../dataModel/cypherReturn';
import { 
    SimpleOrderByItem,
    orderByItem,
    ORDER_DIRECTION    
} from '../../../../dataModel/cypherOrderBy';

import { 
    getPropertyKeysForPatternItem,
    getResolvedPatternVariableItems
} from './DataModelUtil';
import { WithVariable } from '../../../../common/parse/antlr/withVariable';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';
import SecurityRole from '../../../common/SecurityRole';

export default class ReturnOrOrderByClauseBlock extends Component {

    state = {
        returnClause: null,
        dataModel: null,
    };

    constructor (props) {
        super(props);
        this.patternVariablesRef = React.createRef();
        this.propertiesRef = React.createRef();
        this.returnItemsRef = React.createRef();
        this.orderByItemsRef = React.createRef();
        this.dataProvider = props.dataProvider;
        this.returnEditHelper = new ReturnEditHelper({
            blockComponent: this
        });
        this.orderByEditHelper = new OrderByEditHelper({
            blockComponent: this
        });
        this.possibleReturnItems = [];
        this.possibleOrderByItems = [];

    }

    getScopedBlockProvider = () => {
        const { cypherBlockKey, dataProvider } = this.props;
        const scopedBlockProvider = dataProvider.getScopedBlockProvider(cypherBlockKey);
        return scopedBlockProvider;
    }

    componentDidMount = () => {
        const { dataModel } = this.props;
        this.setData(this.getScopedBlockProvider(), dataModel);
    }

    handleDataModel = (dataModel, dataModelKey) => {
        //this.getDataProvider().setDataModelKey(dataModelKey);                    
        this.setState({
            dataModel: dataModel
        }, () => {
            this.buildPossibleReturnAndOrderByItems();            
        });
    }

    getReturnClause = () => this.dataProvider.getReturnClause();
    getOrderByClause = () => this.dataProvider.getOrderByClause();

    getDataModel = () => this.state.dataModel;
    //getCypherPattern = () => this.state.cypherPattern;
    getVariableScope = () => this.getScopedBlockProvider().getVariableScope();

    getPossibleReturnItems = () => this.possibleReturnItems;

    getPreviousReturnItems = () => {
        var returnItems = [];
        var returnClauseDataProvider = this.getScopedBlockProvider()
                    .getNearestReturnClauseDataProvider(this.dataProvider.cypherBlockKey);
        if (returnClauseDataProvider) {
            returnItems = returnClauseDataProvider.getReturnClause().getReturnItems()
                //.filter(returnItem => returnItem.alias)
                .map(returnItem => (returnItem.alias) ? returnItem.alias : returnItem.getExpressionAsString())
        }        
        return returnItems;
    }

    getPossibleOrderByItems = () => {
        var extraItems = this.getPreviousReturnItems()
                .map(returnItemString => orderByItem(returnItemString, ORDER_DIRECTION.ASC));          

        return this.possibleOrderByItems.concat(extraItems)
    }

    buildPossibleReturnAndOrderByItems = () => {
        //var { cypherPattern, dataModel } = this.state;
        var { dataModel } = this.state;
        var scopedBlockProvider = this.getScopedBlockProvider();
        
        //var variables = cypherPattern.getVariableSet();
        var variables = scopedBlockProvider.getVariableSet();
        variables = Array.from(variables).sort();
        var allProperties = variables.map(variable => {
            var list = getResolvedPatternVariableItems(this.getVariableScope(), variable, scopedBlockProvider);
            if (list && list.length > 0) {
                var propertyKeys = list
                    .map(listItem => getPropertyKeysForPatternItem(scopedBlockProvider, dataModel, listItem))                    
                    .reduce((allPropertyKeys, propertyKeys) => {
                        propertyKeys
                            .filter(x => !allPropertyKeys.includes(x))
                            .map(x => allPropertyKeys.push(x));
                        return allPropertyKeys;
                    }, []);

                var properties = propertyKeys.map(propertyKey => {
                        return {
                            variable: variable,
                            propertyExpression: propertyKey,
                            text: `${variable}.${propertyKey}`
                        }
                    });

                if (properties.length > 0) {
                    properties.sort((a,b) => (a.text === b.text) ? 0 : (a.text > b.text) ? 1 : -1);
                    properties.unshift({
                        variable: `${variable} (var)`
                    });
                } else {
                    properties.push({
                        variable: variable
                    });
                }
                return properties;
            } else {
                return [];
            }
        }).reduce((acc,array) => acc.concat(array),[]);

        this.possibleReturnItems = allProperties.map(property => {
            var associatedObjectKey = this.getAssociatedObjectKey(property.variable);
            var variable = property.variable;
            variable = (variable.match(/ \(var\)$/)) ? variable.replace(/ \(var\)$/, '') : variable;
            return returnItem(variable, property.propertyExpression, null, associatedObjectKey);
        });

        this.possibleOrderByItems = allProperties
            .map(property => {
                var associatedObjectKey = this.getAssociatedObjectKey(property.variable);
                var text = (property.text) ? property.text : property.variable;
                text = text.replace(/ \(var\)$/, '');
                return orderByItem(text, ORDER_DIRECTION.ASC, associatedObjectKey);
            });
    }

    setVariableChips = (scopedBlockProvider) => {
        /*
        console.log('setVariableChips called');
        try {
            throw new Error('capturing stack trace');
        } catch (e) {
            console.log(e);
        }
        console.log('scopedBlockProvider.getCypherBlocks(): ', scopedBlockProvider.getCypherBlocks());
        */
       const { blockKeyword } = this.props;
       if (this.patternVariablesRef.current) {
            var dataItems = [];
            if (scopedBlockProvider) {
                var variables = scopedBlockProvider.getVariableSet();
                if (blockKeyword === CypherBlockKeywords.ORDER_BY) {
                    this.getPreviousReturnItems().map(str => variables.add(str));          
                }
                variables = Array.from(variables).sort();
                dataItems = variables
                    .filter(variable => variable.trim())   // get rid of blank variables
                    .map(variable => {
                        return {
                            key: variable,
                            getText: () => variable, 
                            getFontColor: () => 'black',
                            getColor: () => 'white',
                            matches: (searchText) => {
                                if (searchText) {
                                    return variable.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                                } else {
                                    return true;
                                }
                            }
                        }
                    });
            }

            var data = {
                key: 'Return',
                dataItems: dataItems
            }
            //console.log('setVariableChips data: ', data);
            this.patternVariablesRef.current.setData(data);
        }
    }

    setPropertyChips = (variable, propertyKeys) => {
        if (this.propertiesRef.current) {
            var dataItems = [];
            if (variable && propertyKeys) {
                dataItems = propertyKeys.map(propertyKey => {
                    return {
                        key: propertyKey,
                        variable: variable,
                        getText: () => propertyKey, 
                        getFontColor: () => 'black',
                        getColor: () => 'white',
                        matches: (searchText) => {
                            if (searchText) {
                                return propertyKey.toLowerCase().indexOf(searchText.toLowerCase()) !== -1;
                            } else {
                                return true;
                            }
                        }
                    }
                });
            }

            var data = {
                key: variable,
                dataItems: dataItems
            }
            this.propertiesRef.current.setData(data);
        }
    }

    getNewReturnItemFromText = (text) => {
        var parseObj = this.parseReturnItemText(text);
        var associatedObjectKey = this.getAssociatedObjectKey(parseObj.variable);        

        return new SimpleReturnItem()
            .var(parseObj.variable)
            .propExpr(parseObj.propertyExpression)
            .setAlias(parseObj.alias)
            .setAssociatedObjectKey(associatedObjectKey);
    }

    getNewOrderByItemFromText = (text) => {
        var parseObj = this.parseOrderByItemText(text);
        var associatedObjectKey = this.getAssociatedObjectKey(parseObj.variable);        

        return new SimpleOrderByItem()
            .expr(parseObj.expression)
            .dir(parseObj.direction)
            .setAssociatedObjectKey(associatedObjectKey);
    }

    parseReturnItemText = (text) => {
        if (text.endsWith('(var)')) {
            return {
                key: null,
                variable: text.replace('(var)', '').trim(),
                propertyExpression: '',
                alias: null
            }
        } else {
            return parseReturnItemText(text);
        }
    }

    parseOrderByItemText = (text) => {
        var expression = '';
        var variable = '';
        text = text.trim();
        var direction = ORDER_DIRECTION.ASC;
        var match = text.match(/(.*) (ASC$|ASCENDING$|DESC$|DESCENDING$)/i);
        if (match) {
            expression = match[1];
            const isDesc = match[2].match(/DESC/);
            direction = (isDesc) ? ORDER_DIRECTION.DESC : ORDER_DIRECTION.ASC;
        } else {
            expression = text;
        }

        var tokens = expression.split('.');
        if (tokens.length >= 2) {
            variable = tokens[0];
        }

        return {
            key: null,
            variable: variable,
            expression: expression,
            direction: direction
        }
    }

    getDataItemForReturnItem = (returnItem) => {
        return {
            key: returnItem.key,
            dataItem: returnItem,
            getText: () => returnItem.toCypherString(), 
            setText: (newText) => {
                var parseObj = this.parseReturnItemText(newText)
                returnItem
                    .var(parseObj.variable)
                    .propExpr(parseObj.propertyExpression)
                    .setAlias(parseObj.alias);

                if (!returnItem.key && parseObj.key) {
                    returnItem.setKey(parseObj.key);
                }
            },
            getFontColor: () => 'black',
            getColor: () => 'white'
        }
    }

    getDataItemForOrderByItem = (orderByItem) => {
        return {
            key: orderByItem.key,
            dataItem: orderByItem,
            getText: () => orderByItem.expression, 
            setText: (newText) => {
                var currentDirection = orderByItem.getOrderDirection();
                var parseObj = this.parseOrderByItemText(newText);

                orderByItem
                    .expr(parseObj.expression)
                    .dir(parseObj.direction)

                if (!orderByItem.key && parseObj.key) {
                    orderByItem.setKey(parseObj.key);
                }

                if (currentDirection !== parseObj.direction) {
                    // direction changed
                    if (this.orderByItemsRef.current) {
                        this.orderByItemsRef.current
                            .updateSortIcon(orderByItem, 
                                            orderByItem.getOrderDirection(), 
                                            `OrderBy_${orderByItem.key}`, 0);
                    }
                }
            },
            getFontColor: () => 'black',
            getColor: () => 'white'
        }
    }    

    setReturnItems = (returnItems) => {
        if (this.returnItemsRef.current) {
            var dataItems = returnItems.map(returnItem => this.getDataItemForReturnItem(returnItem));
            var data = {
                key: 'Return',
                dataItems: dataItems
            }
            this.returnItemsRef.current.setData(data);
        }
    }

    setOrderByItems = (orderByItems) => {
        if (this.orderByItemsRef.current) {
            var dataItems = orderByItems.map(orderByItem => this.getDataItemForOrderByItem(orderByItem));
            var data = {
                key: 'OrderBy',
                dataItems: dataItems
            }
            this.orderByItemsRef.current.setData(data);
        }
    }

    addReturnItem = (returnItem) => {
        if (this.returnItemsRef.current) {
            var dataItem = this.getDataItemForReturnItem(returnItem);
            this.returnItemsRef.current.addItem(dataItem);
        }
    }

    addOrderByItem = (orderByItem) => {
        if (this.orderByItemsRef.current) {
            var dataItem = this.getDataItemForOrderByItem(orderByItem);
            this.orderByItemsRef.current.addItem(dataItem);
        }
    }
    
    saveReturnItemChips = (chips, onSuccess) => {
        var returnItems = chips.map(chip => chip.data.dataItem);
        this.dataProvider.setReturnItems(returnItems);
    }

    saveOrderByItemChips = (chips, onSuccess) => {
        var orderByItems = chips.map(chip => chip.data.dataItem);
        this.dataProvider.setOrderByItems(orderByItems);
    }

    setOrderByItemSort = (orderByItem, sortDirection) => {
        this.dataProvider.setOrderByItemSort(orderByItem, sortDirection);
    };       

    finishedReturnItemEditing = (chips) => {
        this.saveReturnItemChips(chips);
    }

    finishedOrderByItemEditing = (chips) => {
        this.saveOrderByItemChips(chips);
    }

    clearData () {
        this.setState({
            dataModel: null
        }, () => {
            this.possibleReturnItems = [];
        })
        this.setVariableChips(null);
        this.setPropertyChips(null);
        this.setItems([]);
    }

    setItems = (items) => {
        const { blockKeyword } = this.props;
        if (blockKeyword === CypherBlockKeywords.RETURN) {
            this.setReturnItems(items);
        } else {
            this.setOrderByItems(items);
        }
    }

    getItems = () => {
        const { blockKeyword } = this.props;
        if (blockKeyword === CypherBlockKeywords.RETURN) {
            var returnClause = this.getReturnClause();
            return returnClause.getReturnItems();
        } else {
            var orderByClause = this.getOrderByClause();
            return orderByClause.getOrderByItems()
        }
    }

    refreshData = (scopedBlockProvider) => {
        this.buildPossibleReturnAndOrderByItems();            
        this.setVariableChips(scopedBlockProvider);
        this.setPropertyChips(null);
        this.setItems(this.getItems());
    }

    setData (scopedBlockProvider, dataModel) {
        this.setState({
            dataModel: dataModel
        }, () => {
            this.refreshData(scopedBlockProvider);            
        });
    }

    onVariableChipClick = (chip) => {
        //console.log('variable chip click: ', chip);
        var { dataModel } = this.state;
        var scopedBlockProvider = this.getScopedBlockProvider();

        var variable = chip.data.key;
        //var returnClause = this.getReturnClause();

        if (dataModel) {
            var list = getResolvedPatternVariableItems(this.getVariableScope(), chip.data.key, scopedBlockProvider);
            if (list) {
                var propertyKeys = list
                    .map(listItem => getPropertyKeysForPatternItem(scopedBlockProvider, dataModel, listItem))
                    .reduce((acc,array) => acc.concat(array),[]);
                if (propertyKeys.length > 0) {
                    propertyKeys.sort();
                    propertyKeys.unshift(`${variable} (var)`);
                    this.setPropertyChips(variable, propertyKeys);
                } else {
                    if (SecurityRole.canEdit()) {
                        this.setPropertyChips(null);
                        this.addVariableItem(variable);
                    }
                }
            }
        } else {
            if (SecurityRole.canEdit()) {
                this.setPropertyChips(null);
                this.addVariableItem(variable);
            }
        }
    }

    getAssociatedObjectKey = (variable) => {
        var variableMap = this.getVariableScope().getVariableMap();
        if (variableMap) {
            var associatedItems = variableMap[variable];
            return (associatedItems && associatedItems.length === 1) 
                ? associatedItems[0].key 
                : (associatedItems && associatedItems.length > 1) 
                    ? associatedItems[0].key
                    : null;
        } else {
            return null;
        }
    }

    addVariableItem = (variable) => {
        const { blockKeyword } = this.props;
        if (blockKeyword === CypherBlockKeywords.RETURN) {
            var newReturnItem = new SimpleReturnItem({
                variable: variable, 
                associatedObjectKey: this.getAssociatedObjectKey(variable)
            });
            this.addReturnItemIfNotExists(newReturnItem);
        } else if (blockKeyword === CypherBlockKeywords.ORDER_BY) {
            var newOrderByItem = new SimpleOrderByItem({
                expression: variable, 
                direction: ORDER_DIRECTION.ASC,
                associatedObjectKey: this.getAssociatedObjectKey(variable)
            });
            this.addOrderByItemIfNotExists(newOrderByItem);
        }
    }

    addReturnItemIfNotExists = (returnItem) => {
        var returnClause = this.getReturnClause();
        if (!returnClause.returnItemExists(returnItem)) {
            returnClause.handleReturnItemKey(returnItem);
            this.addReturnItem(returnItem);
        }
    }

    addOrderByItemIfNotExists = (orderByItem) => {
        var orderByClause = this.getOrderByClause();
        if (!orderByClause.orderByItemExists(orderByItem)) {
            orderByClause.handleOrderByItemKey(orderByItem);
            this.addOrderByItem(orderByItem);
        }
    }

    onPropertyChipClick = (chip) => {
        if (SecurityRole.canEdit()) {
            //console.log('property chip click: ', chip);
            var property = chip.data.key;
            if (property.match(/\(var\)$/)) {
                property = null;
            }

            const { blockKeyword } = this.props;
            if (blockKeyword === CypherBlockKeywords.RETURN) {
                var newReturnItem = new SimpleReturnItem({
                    variable: chip.data.variable, 
                    propertyExpression: property,
                    associatedObjectKey: this.getAssociatedObjectKey(chip.data.variable)
                });
                this.addReturnItemIfNotExists(newReturnItem);
            } else if (blockKeyword === CypherBlockKeywords.ORDER_BY) {
                var expression = (property) ? `${chip.data.variable}.${property}` : chip.data.variable;
                var newOrderByItem = new SimpleOrderByItem({
                    expression: expression, 
                    direction: ORDER_DIRECTION.ASC,
                    associatedObjectKey: this.getAssociatedObjectKey(chip.data.variable)
                });
                this.addOrderByItemIfNotExists(newOrderByItem);
            }
        } 
    }

    render () {
        var { dataModel } = this.state;
        var { blockKeyword } = this.props;
        
        return (
            <div>
                <div style={{display:'flex'}}>
                    <div style={{marginTop: '.4em', fontWeight: 500, minWidth: '6em'}}>Variables:</div>
                    <SearchableChips 
                        ref={this.patternVariablesRef}
                        style={{marginTop: '-1.2em'}}
                        onChipClick={this.onVariableChipClick}
                        noValueMessage={'No variables'}
                        displaySearch={true}
                        additionalStyle={{
                            overflowY: 'auto', 
                            height: '2.6em',
                            marginTop: '1em', 
                            marginRight: '5px'                                            
                        }}
                    />                        
                </div>
                {dataModel &&
                    <div style={{display:'flex'}}>
                        <div style={{marginTop: '.4em', fontWeight: 500, minWidth: '6em'}}>Properties:</div>
                        <SearchableChips 
                            ref={this.propertiesRef}
                            style={{marginTop: '-1.2em'}}
                            onChipClick={this.onPropertyChipClick}
                            noValueMessage={'No properties'}
                            displaySearch={true}
                            additionalStyle={{
                                overflowY: 'auto', 
                                height: '2.6em',
                                marginTop: '1em', 
                                marginRight: '5px'                                            
                            }}
                        />                        
                    </div>
                }
                {(blockKeyword === CypherBlockKeywords.RETURN) ?
                    <div style={{display:'flex', paddingTop: '1em', borderTop: '1px solid #C6C6C6'}}>
                        <div style={{marginTop: '.4em', fontWeight: 500, minWidth: '6em', width: '6em'}}>RETURN</div>
                        <ReturnItems
                            ref={this.returnItemsRef}
                            editHelper={this.returnEditHelper}
                            onFinishEditing={this.finishedReturnItemEditing}
                        />
                    </div>
                :            
                    <div style={{display:'flex', paddingTop: '1em', borderTop: '1px solid #C6C6C6'}}>
                        <div style={{marginTop: '.4em',
                            fontWeight: 500, minWidth: '6em', width: '6em'}}>ORDER BY</div>
                        <ReturnItems
                            ref={this.orderByItemsRef}
                            editHelper={this.orderByEditHelper}
                            onFinishEditing={this.finishedOrderByItemEditing}
                        />
                    </div>
                }
            </div>
        )
    }
}


