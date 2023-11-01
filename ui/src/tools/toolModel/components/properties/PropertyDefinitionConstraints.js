import React, { Component } from 'react'
import {
    FormControlLabel, Switch
} from '@material-ui/core';

export default class PropertyDefinitionConstraints extends Component {

    state = {};

    constructor (props) {
        super(props);
    }

    bool = (value) => {
        return (typeof(value) === 'boolean') ? value : false;
    }

    render () {
        var { parentClassType, setCheckedValue, savePropertyDefinition,
                isPartOfKey, isArray, isIndexed, mustExist, hasUniqueConstraint } = this.props;

        var isPartOfKey = this.bool(isPartOfKey);
        var isArray = this.bool(isArray);
        var isIndexed = this.bool(isIndexed);
        var mustExist = this.bool(mustExist)
        var hasUniqueConstraint = this.bool(hasUniqueConstraint);

        // don't use onBlur with Switch, Safari will not trigger the event
        return (
            <>
                {(parentClassType === 'NodeLabel') ?
                    <>
                        <FormControlLabel style={{marginLeft: '0.5em'}} label="Node Key" control={
                              <Switch size="small" checked={isPartOfKey} value="isPartOfKey" color="primary"
                                onChange={setCheckedValue('isPartOfKey')}/>
                            }
                        />
                        <FormControlLabel style={{marginLeft: '0.5em'}} label="Unique" control={
                              <Switch size="small" checked={hasUniqueConstraint} value="hasUniqueConstraint" color="primary"
                                onChange={setCheckedValue('hasUniqueConstraint')}/>
                            }
                        />
                        <FormControlLabel style={{marginLeft: '0.5em'}} label="Indexed" control={
                              <Switch size="small" checked={isIndexed} value="isIndexed" color="primary"
                                onChange={setCheckedValue('isIndexed')}/>
                            }
                            />
                        </>
                        :
                        <></>
                }
                <FormControlLabel style={{marginLeft: '0.5em'}} label="Must Exist" control={
                      <Switch size="small" checked={mustExist} value="mustExist" color="primary"
                        onChange={setCheckedValue('mustExist')}/>
                    }
                />
            </>
        )
    }
}
