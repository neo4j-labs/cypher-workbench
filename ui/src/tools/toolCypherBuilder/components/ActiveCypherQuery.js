
import React, { Component } from 'react'

import {
    runCypherWithTransactionConfig,
    currentlyConnectedToNeo,
    getCurrentConnectionInfo,
    showNeoConnectionDialog
} from "../../../common/Cypher";
import { StyledButton } from '../../../components/common/Components';
import { parseUxCypherTitle, UserInput } from '../../../common/parse/cypherTemplate';
import CypherUxControl from './CypherUxControl';
import { Typography } from '@material-ui/core';

export default class ActiveCypherQuery extends Component {

    state = {
        uxValues: {},
        cypherResult: ''
    }

    /*
    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }*/

    constructor (props) {
        super(props);

        //this.textFocus = this.utilizeFocus();
    }

    /*
    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }*/

    setValue = (variableName) => (value) => {
        //value = (value && value.target) ? value.target.value : value;
        console.log('variableName: ', variableName, ' value: ', value);
        this.setState({
            uxValues: {
                ...this.state.uxValues,
                [variableName]: value
            }
        });
    }

    getDefaultValue = (userInput) => {
        if (userInput.uxControl === 'TextField') {
            return '';
        } else if (userInput.uxControl === 'Autocomplete') {
            return {key: '0', value: ''};
        } else {
            return '';
        }
    }

    executeCypher = () => {
        var { uxValues } = this.state;
        var { uxCypher } = this.props;
        this.setState({
            cypherResult: ''
        });

        var cypherToExecute = uxCypher.cypher;
        var cypherParameters = {};
        Object.values(uxCypher.userInputs).map(userInput => {
            var value = uxValues[userInput.variableName];
            value = (typeof(value) === 'object' && value.hasOwnProperty('key')) ? value.key : value;
            cypherParameters[userInput.variableName] = value;
        });
        console.log('cypherParameters: ', cypherParameters);

        runCypherWithTransactionConfig(cypherToExecute, cypherParameters, { timeout: 10000 }, (results) => {
                //callback({data: results});
                console.log('cypher execution results: ', results);
                this.setState({
                    cypherResult: 'Success'
                });
            }, (error) => {
                this.setState({
                    cypherResult: 'Error running cypher: ' + error
                });
                //alert('Error running cypher: ' + error);
            });
    }

    getSearchCypher = (userInput) => {
        console.log('userInput', userInput);
        if (!userInput.helperCall || Object.keys(userInput.helperCall).length === 0) {
            return {};
        } else {
            var { uxCypherSuite } = this.props;

            var helperCall = userInput.helperCall;
            var helperName = (helperCall) ? helperCall.helperName : null;
            var helperParamValues = (helperCall && helperCall.helperParamValues) ? helperCall.helperParamValues : [];
    
            var helper = uxCypherSuite.cypherHelpers[helperName];
            var cypher = (helper) ? helper.cypher : '';
            var cypherHelperParameters = (helper) ? helper.parameters : [];
            if (helperParamValues.length > 0 && helperParamValues.length === cypherHelperParameters.length) {
                cypherHelperParameters.map((helperParamKey, index) => {
                    var helperParamValue = helperParamValues[index];
                    helperParamKey = helperParamKey.replace('$', '\\$');
                    cypher = cypher.replace(new RegExp(helperParamKey, 'g'), helperParamValue);
                });
            }
            //console.log('cypher: ', cypher);
            //console.log('result: ', helperCall.returnName);
            /*
            var searchObject = {
                searchCypher: `
                WITH $searchText as searchText 
                MATCH (u:User) 
                WHERE toLower(u.email) CONTAINS searchText
                RETURN u.email as email`,
                resultKeyName: 'email',
                resultValueName: 'email'
            };*/
            var searchObject = {
                searchCypher: cypher,
                resultKeyName: helperCall.returnName,
                resultValueName: helperCall.returnName
            }
            return searchObject;
        }
}

    render () {
        var { uxCypher } = this.props;
        var { uxValues, cypherResult } = this.state;
        
        //inputRef={this.textFocus.ref}

        console.log('uxCypher: ', uxCypher);
        var parsedTitle = (uxCypher) ? parseUxCypherTitle(uxCypher) : [];

        return (
            <>
            {uxCypher !== null &&
                <div style={{border: '1px solid black', padding: '1em'}}>
                    <Typography variant="h6">Active Cypher Statement</Typography>
                    <div className='activeCypherControls' style={{display:'flex', flexDirection: 'row'}}>
                        {
                            parsedTitle.map((x, index) => {
                                if (typeof(x) === 'string') {
                                    return <div key={index} style={{marginRight: ".5em",marginTop: "1.5em"}}>{x}</div>
                                } else if (typeof(x) === 'object' && x instanceof UserInput) {
                                    var value = (uxValues[x.variableName]) ? (uxValues[x.variableName]) : this.getDefaultValue(x);
                                    var { searchCypher, resultKeyName, resultValueName } = this.getSearchCypher(x);
                                    return <CypherUxControl key={index} component={x.uxControl} label={x.variableName} 
                                        value={value} style={{
                                            width: '20em', 
                                            marginRight: '.5em'
                                        }}
                                        searchCypher={searchCypher}
                                        resultKeyName={resultKeyName}
                                        resultValueName={resultValueName}
                                        setValue={this.setValue(x.variableName)}/>
                                } else {
                                    return <></>
                                }
                            })
                        }
                    </div>
                    <div>
                        <StyledButton onClick={this.executeCypher} color="primary">
                            Execute
                        </StyledButton>
                        <div>Cypher Result: {cypherResult}</div>
                    </div>
                </div>
            }
        </>
        )
    }
}
