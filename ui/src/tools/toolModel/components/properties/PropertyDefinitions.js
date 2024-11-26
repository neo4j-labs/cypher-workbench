import React, { Component } from 'react'
import {
    Tabs, Tab
} from '@material-ui/core';

import { TabPanel } from '../../../../components/common/Components';
import { isFeatureLicensed, FEATURES } from '../../../../common/LicensedFeatures';
import { PropertyDefinition } from './PropertyDefinition';
import PropertyIndexes from './PropertyIndexes';

export default class PropertyDefinitions extends Component {

    state = {
        tabIndex: 0,
        minHeight: 100,
        propertyDefinitions: [],
        propertyContainer: {}
    }

    constructor (props) {
        super(props);
        this.propertyDivRef = React.createRef();
        this.propertyIndexesRef = React.createRef();
    }

    changeTab = (event, index) => {
        this.setState({
            tabIndex: index
        }, () => {
            var { hideActions, showActions } = this.props;
            if (index === 0) {
                showActions();
            } else if (index === 1) {
                hideActions();
                if (this.propertyIndexesRef.current) {
                    const { propertyContainer } = this.state;
                    this.propertyIndexesRef.current.setPropertyContainer(propertyContainer);
                }
            }
        });

    }

    setPropertyContainer (propertyContainer) {
        //console.log("PropertyDefinitions setPropertyContainer");
        var propertyDefinitions = [];
        if (propertyContainer && propertyContainer.properties) {
            propertyDefinitions = Object.keys(propertyContainer.properties)
                .map(key => propertyContainer.properties[key]);

            propertyDefinitions.sort((a,b) => (a.name === b.name) ? 0 
                                            : (a.name > b.name) ? 1 : -1 )
                
        }
        //console.log(propertyDefinitions);
        var stateProperties = {
            propertyDefinitions: propertyDefinitions,
            propertyContainer: propertyContainer
        }

        this.setState(stateProperties, () => setTimeout(this.setMinHeight(), 200));
    }

    setMinHeight = () => {
        if (this.propertyDivRef.current) {
            var boundingRect = this.propertyDivRef.current.getBoundingClientRect();    
            this.setState({
                minHeight: boundingRect.height
            });
        }
    }

    addPropertyDefiniton = () => {
        const { propertyDefinitions } = this.state;
        var { dataModel } = this.props;
        var newPropertyDefinitons = propertyDefinitions.slice(0);
        newPropertyDefinitons.push(dataModel.getNewPropertyDefinition());
        this.setState({
            propertyDefinitions: newPropertyDefinitons
        }, () => this.setMinHeight())
    }

    savePropertyDefinition = (index, propertyDefinition) => {
        const { propertyDefinitions, propertyContainer } = this.state;
        propertyDefinitions[index] = propertyDefinition;
        this.setState({
            propertyDefinitions: propertyDefinitions
        })
        var { key, name, datatype, referenceData, description,
            isPartOfKey, isIndexed, isArray, mustExist, hasUniqueConstraint } = propertyDefinition;
        var booleanFlags = {
            isPartOfKey: isPartOfKey,
            isIndexed: isIndexed,
            isArray: isArray,
            mustExist: mustExist,
            hasUniqueConstraint: hasUniqueConstraint
        };
        var propertyMap = { key, name, datatype, referenceData, description };
        propertyContainer.addOrUpdateProperty(propertyMap, booleanFlags);
    }

    removePropertyDefinition = (index) => {
        var { propertyDefinitions, propertyContainer } = this.state;
        var definitionToRemove = propertyDefinitions.splice(index, 1)[0];
        this.setState({
            propertyDefinitions: propertyDefinitions
        }, () => this.setMinHeight())
        propertyContainer.removeProperty(definitionToRemove.key);
    }

    getClassType = () => {
        var { propertyContainer } = this.state;
        return (propertyContainer) ? propertyContainer.classType : 'NodeLabel';
    }

    getPropertyDefinitions = () => {
        var { propertyDefinitions, propertyContainer } = this.state;
        //console.log("propertyDefinitions");
        //console.log(propertyDefinitions);

        var { dataModel, showDescriptions } = this.props;
        var classType = this.getClassType();

        return propertyDefinitions.map((def, index) => {
            var propertyDefinition = { ...def } // explicit clone of object
            //console.log("propertyDefinition");
            //console.log(propertyDefinition);
            return (
                <PropertyDefinition key={propertyDefinition.key}
                    index={index} dataModel={dataModel}
                    showDescriptions={showDescriptions}                            
                    propertyDefinition={propertyDefinition} parentClassType={classType}
                    savePropertyDefinition={this.savePropertyDefinition}
                    removePropertyDefinition={this.removePropertyDefinition}/>
            )
        })
    }

    render () {
        const { tabIndex, minHeight } = this.state;
        var { dataModel } = this.props;
        const classType = this.getClassType();

        return (
            <div style={{padding: '10px'}}>
                <div style={{minHeight: minHeight}}>
                    <div ref={this.propertyDivRef}>
                    {(isFeatureLicensed(FEATURES.MODEL.PropertyConstraints) && classType === 'NodeLabel')
                    ?
                    <>
                        <Tabs orientation="horizontal" variant="scrollable" value={tabIndex} onChange={this.changeTab}>
                            <Tab label="Properties"/>
                            <Tab label="Composite Indexes"/>
                        </Tabs>
                        <TabPanel value={tabIndex} index={0}>
                            <div style={{borderTop: '1px solid gray'}}>
                                {this.getPropertyDefinitions()}
                            </div>
                        </TabPanel>
                        <TabPanel value={tabIndex} index={1}>
                            <div style={{borderTop: '1px solid gray'}}>
                                <PropertyIndexes 
                                    ref={this.propertyIndexesRef}
                                    dataModel={dataModel}
                                />
                            </div>
                        </TabPanel>
                    </>
                    :
                        this.getPropertyDefinitions()
                    }
                    </div>
                </div>
            </div>
        )
    }
}
