
import React, { Component } from 'react';
import isEqual from 'lodash/isEqual';

import { OutlinedStyledButton } from '../../../../components/common/Components';
import WhereItem from './WhereItem';
import WhereItems from './WhereItems';
import WhereEditHelper from './WhereEditHelper';
import { 
    NodePattern, 
    RelationshipPattern
} from '../../../../dataModel/cypherPattern';
import { whereToken } from '../../../../dataModel/cypherWhere';
import Timer from '../../../../common/util/timerUtil';
import { 
    getPropertyDefinitionsForPatternItem,
    getResolvedPatternVariableItems
} from './DataModelUtil';
import SecurityRole from '../../../common/SecurityRole';

const TOKEN_BUTTONS = ['AND','OR','NOT','XOR','(',')'];

export default class WhereClauseBlock extends Component {
    
    state = {
        whereClause: null,
        dataModel: null,
        sizingDefaults: {
            maxWidth: 1200
        }
    };

    constructor (props) {
        super(props);
        this.whereItemRef = React.createRef();
        this.whereItemsRef = React.createRef();
        this.dataProvider = props.dataProvider;
        this.whereEditHelper = new WhereEditHelper({
            whereClauseComponent: this
        });
        this.possibleWhereItems = [];
    }

    getScopedBlockProvider = () => {
        const { cypherBlockKey, dataProvider } = this.props;
        const scopedBlockProvider = dataProvider.getScopedBlockProvider(cypherBlockKey);
        return scopedBlockProvider;
    }

    componentDidMount = () => {
        const { dataModel } = this.props;
        this.setState({
            dataModel: dataModel
        }, () => {
            this.refreshData();
        })
    }

    handleDataModel = (dataModel, dataModelKey) => {
        //this.getDataProvider().setDataModelKey(dataModelKey);                    
        this.setState({
            dataModel: dataModel
        }, () => {
            this.buildPossibleWhereItems();            
        });
    }

    getWhereClause = () => this.dataProvider.getWhereClause();
    getVariableScope = () => this.getScopedBlockProvider().getVariableScope();

    setCypherPatternCanvasDataProvider = (dataProvider) => this.dataProvider = dataProvider;

    getPossibleWhereItems = () => this.possibleWhereItems;

    buildPossibleWhereItems = () => {
        const { dataModel } = this.state;
        var scopedBlockProvider = this.getScopedBlockProvider();
        //var timer = new Timer("WhereClause.buildPossibleWhereItems").start();        
        var variables = scopedBlockProvider.getVariableSet();
        //timer.record("scopedBlockProvider.getVariableSet()");
        variables = Array.from(variables).sort();
        var allProperties = variables.map((variable, index) => {
            var list = getResolvedPatternVariableItems(this.getVariableScope(), variable, scopedBlockProvider);
            //timer.record(`this.dataProvider.getVariableScope().getVariableItemList variable: ${variable}, index: ${index}`);
            if (list && list.length > 0) {
                var propertyDefinitions = list
                    .map(listItem => getPropertyDefinitionsForPatternItem(listItem, dataModel, scopedBlockProvider))
                    //.reduce((acc,array) => acc.concat(array),[])
                    .reduce((allPropertyDefinitions, propertyDefinitions) => {
                        propertyDefinitions
                            .filter(x => {
                                const match = allPropertyDefinitions.find(existing => {
                                    isEqual(existing, x);
                                });
                                return (match) ? false : true;
                            })
                            .map(x => allPropertyDefinitions.push(x));
                        return allPropertyDefinitions;
                    }, []);
                //timer.record(`after getPropertyDefinitionsForPatternItem`);                    

                var properties = propertyDefinitions.map(propertyDefinitionObj => {
                        var propertyDefinition = propertyDefinitionObj.propertyDefinition;
                        return {
                            variable: variable,
                            type: propertyDefinitionObj.type,
                            nodeLabelString: (propertyDefinitionObj.nodeLabel) ? propertyDefinitionObj.nodeLabel.label : '',
                            startNodeLabelString: (propertyDefinitionObj.startNodeLabel) ? propertyDefinitionObj.startNodeLabel.label : '',
                            relationshipTypeString: (propertyDefinitionObj.relationshipType) ? propertyDefinitionObj.relationshipType.type : '',
                            endNodeLabelString: (propertyDefinitionObj.endNodeLabel) ? propertyDefinitionObj.endNodeLabel.label : '',
                            propertyExpression: propertyDefinition.name,
                            datatype: propertyDefinition.datatype,
                            text: `${variable}.${propertyDefinition.name}`
                        }
                    });
                //timer.record(`after propertyDefinitions map`);                                        

                if (properties.length > 0) {
                    properties.sort((a,b) => (a.text === b.text) ? 0 : (a.text > b.text) ? 1 : -1);
                } 
                //timer.record(`after sort`);                                        
                properties.unshift({
                    variable: `${variable}`,
                    propertyExpression: '',
                    datatype: null,
                    text: `${variable}`
                });
                return properties;
            } else {
                return [];
            }
        }).reduce((acc,array) => acc.concat(array),[]);
        //timer.stop(`after loop`);                                                

        this.possibleWhereItems = allProperties;
    }

    finishedEditing = (chips) => {
        // TODO
    }

    clearData () {
        this.setState({
            dataModel: null
        }, () => {
            this.possibleWhereItems = [];
        });
        if (this.whereItemRef.current) {
            this.whereItemRef.current.clearData();
        }
        this.setWhereItems([]);        
    }

    saveChips = (chips) => {
        console.log('WhereClause saveChips: ', chips);
        var whereItems = chips.map(chip => chip.data.whereItem);
        this.dataProvider.setWhereItems(whereItems);
    }

    refreshData () {

        //var timer = new Timer("WhereClause.refreshData").start();
        /*
        timer.record("before setState");
        this.setState({
            cypherPattern: cypherPattern,
            dataModel: dataModel
        });
        */

        //timer.record("before buildPossibleWhereItems");
        this.buildPossibleWhereItems(); 
        //timer.record("after buildPossibleWhereItems");

        var whereClause = this.getWhereClause();
        //timer.record("before this.setWhereItems");
        this.setWhereItems(whereClause.getWhereItems());
        //timer.record("after this.setWhereItems").stop();
    }

    getDataItemForWhereItem = (whereItem) => {
        return {
            key: whereItem.key,
            whereItem: whereItem,
            getText: () => whereItem.toCypherString(), 
            setText: (newText) => {
                // TODO
                console.log('TODO getDataItemForWhereItem setText');
            },
            getFontColor: () => 'black',
            getColor: () => 'white'
        }
    }

    setWhereItems = (whereItems) => {
        if (this.whereItemsRef.current) {
            var dataItems = whereItems.map(whereItem => this.getDataItemForWhereItem(whereItem));
            var data = {
                key: 'Where',
                dataItems: dataItems
            }
            this.whereItemsRef.current.setData(data, this);
        }
    }

    addToken = (tokenString) => () => {
        if (SecurityRole.canEdit()) {
            var token = whereToken(tokenString);
            var whereClause = this.getWhereClause();
            whereClause.handleKey(token);
            this.addWhereItem(token);
        } 
    }

    addWhereItem = (whereItem) => {
        if (SecurityRole.canEdit()) {
            if (this.whereItemsRef.current) {
                var dataItem = this.getDataItemForWhereItem(whereItem);
                this.whereItemsRef.current.addWhereItem(dataItem);
            }
        } 
    }

    render () {
        
        return (
            <div>
                <div style={{display:'flex', flexWrap: 'wrap'}}>
                    <div style={{marginTop: '1em', fontWeight: 500, minWidth: '6em', width: '6em'}}>Add Item</div>
                    <WhereItem
                        ref={this.whereItemRef}
                        whereClauseComponent={this}
                        addWhereItem={this.addWhereItem}
                        editHelper={this.whereEditHelper}
                    />
                    <div style={{display:'flex'}}>
                        {TOKEN_BUTTONS.map(token => 
                            <OutlinedStyledButton key={token} style={{height: '2em', marginRight: '0em'}} onClick={this.addToken(token)} color="primary">
                                {token}
                            </OutlinedStyledButton>
                        )}
                    </div>
                </div>
                <div style={{display:'flex', paddingTop: '1em', borderTop: '1px solid #C6C6C6'}}>
                    <div style={{marginTop: '.4em', fontWeight: 500, minWidth: '6em', width: '6em'}}>WHERE</div>
                    <WhereItems
                        ref={this.whereItemsRef}
                        whereClauseComponent={this}
                        saveChips={this.saveChips}
                        onFinishEditing={this.finishedEditing}
                    />
                </div>
            </div>
        )
    }
}


