
import React, { Component } from 'react'
import {
    TextField
} from '@material-ui/core';
import ComboBox from '../../../components/common/ComboBox';

import {
    runCypherWithTransactionConfig,
    currentlyConnectedToNeo,
    getCurrentConnectionInfo,
    showNeoConnectionDialog
} from "../../../common/Cypher";

export default class CypherUxControl extends Component {

    state = {
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

    setValue = (e) => {
        //console.log('uxControl setValue e: ', e);
        this.props.setValue(e.target.value);
    }

    setComboValue = (value) => {
        this.props.setValue(value);
    }

    /*
    setMultiValueWithKey = (value, propName) => {
        value = value.map(x => (typeof(x) === 'string') ? { key: uuidv4(), [propName]: x } : x);
        this.preventDuplicateValue(value, propName);
        this.props.setValue(value);
    }*/

    searchForValue = (searchText, callback, errorCallback) => {
        var { searchCypher, resultKeyName, resultValueName } = this.props;

        //console.log("searchText = ", searchText);
        runCypherWithTransactionConfig(searchCypher, 
        { ux_value: searchText }, { timeout: 10000 }, (results) => {
            if (results && results.rows && results.rows.length > 0) {
                 //var users = results.rows.map(x => { return { key: x.email, value: x.email }});
                 var comboResults = results.rows.map(x => { return { key: x[resultKeyName], value: x[resultValueName] }});
                 callback({data: comboResults});
            } else {
                //setStatus("The cypher call did not return any data", false);
                //alert("no data returned");
                errorCallback();
            }
        }, (error) => {
            //setStatus(error, false);
            errorCallback(error);
            alert('Error running cypher: ' + error);
        });

        // TODO: call cypher
        /*
        var values = {
            data: [
                {
                    key:"0b3b66de-e20d-4048-8722-89fe8f9c7c83",
                    value:"Sports"
                },
                {
                    key:"222",
                    value:"Pizza"
                }
            ]
        }
        callback(values)
        */
    }

    /*
    preventDuplicateValue = (value, propName) => {
        if (value && value.length >= 2) {
            var lastValue = value[value.length-1];
            // for now prevent multiple selections of same name
            var matches = value.slice(0,value.length-1).filter(x => x[propName] === lastValue[propName]);
            if (matches && matches.length > 0) {
                value.splice(value.length-1);
            }
        }
    }*/

    render () {
        var { label, value, component, helperCall, style } = this.props;
        //var defaultStyle = {width: '30em', marginRight: '.5em'}
        //inputRef={this.textFocus.ref}

        return (
            <>
                {component === 'TextField' &&
                    <TextField id="ux_textField" label={label} style={style}
                        value={value} 
                        onChange={this.setValue}
                        margin="dense"/>
                }
                {component === 'Autocomplete' &&
                    <ComboBox search={this.searchForValue} label={label} style={style}
                        displayProp={'value'} 
                        value={value}
                        setValue={this.setComboValue} />
                }
            </>
        )
    }
}
