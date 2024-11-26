import React, { Component } from 'react';

import {
    Button,
    InputLabel,
    MenuItem,
    FormControl, 
    Select
} from '@material-ui/core';

import { StyledButton } from '../../../../components/common/Components';
import ComboBox from '../../../../components/common/ComboBox';
import { whereItem } from '../../../../dataModel/cypherWhere';
import DataTypes from '../../../../dataModel/DataTypes';

const NO_OPERATOR = '<no operator>';
const OPERATOR_OPTIONS = [
    NO_OPERATOR, '=','<>','<','>','<=','>=','=~','IS NULL','IS NOT NULL',
    'IN','STARTS WITH','ENDS WITH','CONTAINS'
];

export default class WhereItem extends Component {

    emptyComboValue = {label: '', data: {}};

    labelComboValueMap = {};

    state = {
        operator: '=',
        leftComboValue: this.emptyComboValue,
        rightComboValue: this.emptyComboValue
    }

    clearData = () => {
        this.setState({
            operator: '=',
            leftComboValue: this.emptyComboValue,
            rightComboValue: this.emptyComboValue
        });
    }

    canEdit = () => {
        // TODO: this does not seem to be populated correctly on load, need to revisit
        //return SecurityRole.canEdit();
        return true;
    }

    setOperator = (e) => {
        this.setState({
            operator: e.target.value
        });
    }
    
    setComboValue = (leftOrRight) => (value) => {
        if (this.canEdit()) {
            // when selecting an item from the list the value is an object like { label: ..., data: {...}},
            //  but on blur, the object.label gets passed in a string value, therefore clearing the data
            //  therefore we will store the object values in a map for later
            if (typeof(value) === 'object' && value && value.label) {
                this.labelComboValueMap[value.label] = value;
            }

            if (leftOrRight === 'left') {
                this.setState({
                    leftComboValue: value
                });
            } else if (leftOrRight === 'right') {
                this.setState({
                    rightComboValue: value
                });
            }
        }
    }

    addWhereItem = () => {
        var { addWhereItem, whereClauseComponent } = this.props;
        var { operator, leftComboValue, rightComboValue } = this.state;

        if (operator === NO_OPERATOR) {
            operator = '';
        }

        var leftValue = (typeof(leftComboValue) === 'string') 
            ? leftComboValue 
            : (leftComboValue) ? leftComboValue.label : '';
        var rightValue = (typeof(rightComboValue) === 'string') 
            ? rightComboValue 
            : (rightComboValue) ? rightComboValue.label : '';

        /* TODO: there are more business rules that need to be implemented
        var leftObj = this.labelComboValueMap[leftValue];
        
        //  such as no quotes for IN, but yes quotes for STARTS WITH, etc
        //  but only if right hand side is a string literal, not a reference to a variable 
        if (leftObj && leftObj.data && leftObj.data.datatype === DataTypes.String) {
            if (!rightValue) {
                rightValue = "''";
            } else if (rightValue.trim && !rightValue.trim().match(/^['"].*['"]$/)) {
                rightValue = `'${rightValue}'`;
            } 
        } */
        
        var variable = this.getWhereVariable(leftComboValue);
        var associatedObjectKey = null;
        if (variable) {
            associatedObjectKey = this.getAssociatedObjectKey(variable);
        }
        var newWhereItem = whereItem(leftValue, operator, rightValue, associatedObjectKey);
        var whereClause = whereClauseComponent.getWhereClause();
        whereClause.handleKey(newWhereItem);
        addWhereItem(newWhereItem);
    }

    getWhereVariable = (leftComboValue) => {
        //console.log('getWhereVariable leftComboValue: ', leftComboValue);
        var leftObj = this.labelComboValueMap[leftComboValue];
        if (leftObj && leftObj.data && leftObj.data.variable) {
            return leftObj.data.variable;
        } else if (typeof(leftComboValue) === 'string') {
            var tokens = leftComboValue.split('.');
            return (tokens.length > 1) ? tokens[0] : null;
        } 
        return null;
    }

    getAssociatedObjectKey = (variable) => {
        var { whereClauseComponent } = this.props;
        var variableMap = whereClauseComponent.getVariableScope().getVariableMap();
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

    rightHandSearch = (searchText, callback) => {
        var { editHelper } = this.props;
        var { performSearch, performCypherSearch } = editHelper;
        var { operator, leftComboValue } = this.state;        

        var leftValue = (typeof(leftComboValue) === 'string') 
            ? leftComboValue 
            : (leftComboValue) ? leftComboValue.label : '';
        var leftObj = this.labelComboValueMap[leftValue];        

        if (operator === '=' && leftObj && leftObj.data && leftObj.data.propertyExpression) {
            performCypherSearch(searchText, leftObj.data, callback);
        } else {
            performSearch(searchText, callback);
        }
    }

    render () {
        var { editHelper } = this.props;
        var { leftComboValue, rightComboValue, operator } = this.state;
        var { getConfig, performSearch } = editHelper;
        var { leftDisplayLabel, rightDisplayLabel } = getConfig();

        operator = (operator === '') ? NO_OPERATOR : operator;

        return (
            <div style={{ marginTop: '-.3em', paddingBottom: '10px', display: 'flex', flexFlow: 'row' }}>   {/* row 1 */}
                <ComboBox search={performSearch} 
                    label={leftDisplayLabel} 
                    clearOnBlur={false}
                    freeSolo={true}
                    style={{
                        minWidth: '20em',
                        width: '20em', 
                        marginTop: '5px',
                        marginRight: '.5em'
                    }}
                    displayProp={'label'} 
                    value={leftComboValue}
                    setValue={this.setComboValue('left')} />
                        
                <FormControl variant="outlined" style={{marginTop:'.375em'}}>
                    <InputLabel htmlFor="operator-label" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                    Operator
                    </InputLabel>
                        <Select
                        value={operator}
                        onChange={this.setOperator}
                        id="operator"
                        inputProps={{
                            name: 'operator',
                            id: 'operator-label',
                        }}
                        style={{width:'10em', height: '3em', marginRight: '.5em'}}
                        >
                            {OPERATOR_OPTIONS.map((operatorOption, index) =>
                                <MenuItem key={index} value={operatorOption}>{operatorOption}</MenuItem>
                            )}
                        </Select>
                </FormControl>
                <ComboBox search={this.rightHandSearch} 
                    label={rightDisplayLabel} 
                    clearOnBlur={false}
                    freeSolo={true}
                    style={{
                        minWidth: '20em',
                        width: '20em', 
                        marginTop: '5px',
                        marginRight: '.5em'
                    }}
                    displayProp={'label'} 
                    value={rightComboValue}
                    setValue={this.setComboValue('right')} />
                <StyledButton onClick={this.addWhereItem} color="primary">
                    Add
                </StyledButton>

            </div>
        )
    }
}