import React, { Component } from 'react'
import {
    Button,
    Icon, InputLabel,
    MenuItem,
    FormControl, FormControlLabel,
    Select, Switch,
    TextField, Tooltip
} from '@material-ui/core';

import { USER_ROLE } from '../../../../common/Constants';
import { isFeatureLicensed, FEATURES } from '../../../../common/LicensedFeatures';

import SecurityRole from '../../../common/SecurityRole';
import PropertyDefinitionConstraints from './PropertyDefinitionConstraints';

export class PropertyDefinition extends Component {

    state = {};

    // from https://stackoverflow.com/questions/28889826/set-focus-on-input-after-render -and-
    // https://stackoverflow.com/questions/37949394/how-to-set-focus-to-a-materialui-textfield
    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.nameFocus = this.utilizeFocus();
    }

    componentDidMount () {
        this.setState({
            ...this.props.propertyDefinition
        }, () => {
            this.nameFocus.setFocus();
        })
    }

    setValue = (e) => {
        if (SecurityRole.canEdit()) {
            const mapKey = (e.target.id) ? e.target.id : e.target.name;
            const value = e.target.value;
            if (this.state[mapKey] != value) {
                this.setState({
                    [mapKey]: value
                });
            }
        }
    }

    setCheckedValue = (name) => (e) => {
        if (SecurityRole.canEdit()) {
            if (name === 'isPartOfKey' && e.target.checked) {
                this.setState({
                    isPartOfKey: true,
                    hasUniqueConstraint: true,
                    isIndexed: true,
                    mustExist: true
                }, () => this.savePropertyDefinition());
            } else if (name === 'hasUniqueConstraint' && (this.state.isPartOfKey || e.target.checked)) {
                // if isPartOfKey is already checked then hasUniqueConstraint and isIndexed must be true
                // if hasUniqueConstraint is checked then isIndexed must be true
                this.setState({
                    hasUniqueConstraint: true,
                    isIndexed: true
                }, () => this.savePropertyDefinition());
            } else if (name === 'isIndexed' && (this.state.isPartOfKey || this.state.hasUniqueConstraint || e.target.checked)) {
                // if isPartOfKey is already checked then isIndexed must be true
                // if hasUniqueConstraint is already checked then isIndexed must be true
                this.setState({
                    isIndexed: true
                }, () => this.savePropertyDefinition());
            } else if (name === 'mustExist' && (this.state.isPartOfKey || e.target.checked)) {
                this.setState({
                    mustExist: true
                }, () => this.savePropertyDefinition());
            } else {
                this.setState({
                    [name]: e.target.checked
                }, () => this.savePropertyDefinition());
            }
        }
    }

    savePropertyDefinition = () => {
        console.log('saving property definition');
        const { index } = this.props;
        var propertyDefinition = { ...this.state }
        this.props.savePropertyDefinition(index, propertyDefinition);
    }

    removePropertyDefinition = () => {
        const { index } = this.props;
        this.props.removePropertyDefinition(index);
    }

    render () {
        const { parentClassType, dataModel, showDescriptions } = this.props;
        const dataTypes = { ...dataModel.DataTypes };

        var { name, datatype, referenceData, description,
            isPartOfKey, isArray, isIndexed, mustExist, hasUniqueConstraint } = this.state;

        var name = (name) ? name : '';
        var datatype = (datatype) ? datatype : dataTypes.String;
        var referenceData = (referenceData) ? referenceData : '';
        var description = (description) ? description : '';

        return (
            <div style={{marginBottom: '5px'}} >
            <form>
            <FormControl style={{ display: 'flex', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em' }}>
                <div style={{ display: 'flex', flexFlow: 'column' }}> {/* columns */}
                    <div style={{ display: 'flex', flexFlow: 'row' }}>   {/* row 1 */}
                        <TextField id="name" label="Name" value={name}
                            inputRef={this.nameFocus.ref}
                            autoComplete='off'
                            onChange={this.setValue} onBlur={this.savePropertyDefinition}
                            margin="dense" style={{marginRight: '.5em'}}/>
                        <FormControl variant="outlined" style={{marginTop:'.375em'}}>
                        <InputLabel htmlFor="datatype-label" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                          Data Type
                        </InputLabel>
                            <Select
                              value={datatype}
                              onChange={this.setValue}
                              onBlur={this.savePropertyDefinition}
                              id="datatype"
                              inputProps={{
                                name: 'datatype',
                                id: 'datatype-label',
                              }}
                              style={{width:'10em', height: '3em', marginRight: '.5em'}}
                            >
                                {(dataTypes) && Object.keys(dataTypes).map((dataTypeKey, index) =>
                                    <MenuItem key={dataTypeKey} value={dataTypeKey}>{dataTypes[dataTypeKey]}</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                        {/*}
                        <FormControlLabel style={{marginLeft: '0.5em'}}
                            control={
                              <Switch size="small"
                                checked={isArray}
                                onChange={this.setCheckedValue('isArray')}
                                onBlur={this.savePropertyDefinition}
                                value="isArray"
                                color="primary"
                              />
                            }
                            label="Array"
                        />*/}
                        <TextField id="referenceData" label="Reference Data" value={referenceData}
                            autoComplete='off'
                            onChange={this.setValue} onBlur={this.savePropertyDefinition}
                            margin="dense" style={{marginRight: '.5em'}}/>
                            {isFeatureLicensed(FEATURES.MODEL.PropertyConstraints) &&
                                <PropertyDefinitionConstraints
                                    parentClassType={parentClassType}
                                    setCheckedValue={this.setCheckedValue}
                                    savePropertyDefinition={this.savePropertyDefinition}
                                    isPartOfKey={isPartOfKey}
                                    isArray={isArray} isIndexed={isIndexed}
                                    mustExist={mustExist} hasUniqueConstraint={hasUniqueConstraint}
                                />
                            }
                    </div>    {/* row 1 */}
                    {showDescriptions &&
                        <div style={{ display: 'flex', flexFlow: 'row' }}>   {/* row 2 */}
                            <TextField id="description" label='Description' value={description}
                                autoComplete='off'
                                onChange={this.setValue} onBlur={this.savePropertyDefinition}
                                margin="dense" style={{marginLeft: '0.5em', marginTop: '-.2em', width:'77.5em'}}/>
                        </div>
                    }
                </div> {/* columns */}
                <div>
                    {SecurityRole.canEdit() &&
                        <Tooltip enterDelay={600} arrow title="Delete Model">
                            <Button color={'primary'} style={{marginLeft: '1em'}} onClick={this.removePropertyDefinition}>
                                <span className="fa fa-trash"/>
                            </Button>
                        </Tooltip>
                    }
                </div>
            </FormControl>
            </form>
            </div>
        )
    }
}
