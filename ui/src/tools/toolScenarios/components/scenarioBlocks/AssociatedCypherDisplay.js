
import React, { Component } from 'react'
import {
    Button, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography
} from '@material-ui/core';

import { OTHER_COLORS } from '../../../../common/Constants';
import GeneralDialog from '../../../../components/common/GeneralDialog';
import SecurityRole from "../../../common/SecurityRole";
import {
    TOOL_NAMES,
    isToolLicensed,
    showUpgradeLicenseMessage
} from '../../../../common/LicensedFeatures';
import ShowMoreLessHelper from '../../../common/edit/showMoreLessHelper'
import { getValidationIcon } from '../../../common/validation/ValidationSection';

const DEFAULT_DISPLAY_CYPHER_LENGTH = 512;

export default class AssociatedCypherDisplay extends Component {

    closeGeneralDialog = () => {
        this.setState({ generalDialog: { ...this.state.generalDialog, open: false }});
    }

    state = {
        generalDialog: {
            open: false,
            handleClose: this.closeGeneralDialog,
            title: '',
            description: '',
            buttons: []
        },
        headers: {},
        nonValidationHeaders: {},
        showMoreKeys: [],
        suggestions: {}
    }

    constructor (props) {
        super(props);

        var { headers, dateFields, multiValuedKeys, booleanKeys } = props;

        if (!headers) {
            headers = {
                cypherTitle: 'Title',
                isVisualCypher: 'Visual?',
                cypherStatement: 'Cypher'
            }
        }

        if (!dateFields) {
            dateFields = [];
        }
        if (!multiValuedKeys) {
            multiValuedKeys = [];
        }
        if (!booleanKeys) {
            booleanKeys = ['isVisualCypher']
        }

        this.cypherKey = (this.props.cypherKey) ? this.props.cypherKey : 'cypherStatement';
        this.showMoreLessHelper = new ShowMoreLessHelper({
            getState: () => this.state,
            setState: (newState) => this.setState(newState),
            maxDisplayLength: (this.props.displayCypherLength) ? this.props.displayCypherLength : DEFAULT_DISPLAY_CYPHER_LENGTH,
            showMoreKeysStateKey: 'showMoreKeys'
        });
        
        this.state.headers = headers;
        this.state.nonValidationHeaders = headers;
        this.state.modelInfoKeys = Object.keys(headers);

        this.dateFields = dateFields;
        this.multiValuedKeys = multiValuedKeys;
        this.booleanKeys = booleanKeys;
        this.showActions = (typeof(props.showActions) === 'boolean') ? props.showActions : true;
    }

    showCypherValidationInfo = () => {
        var { headers } = this.state;
        var newHeaders = {
            validationStatus: 'Valid?',
            ...headers
        }
        this.setState({
            headers: newHeaders,
            modelInfoKeys: Object.keys(newHeaders)
        })
    }

    clearCypherValidationInfo = () => {
        var { nonValidationHeaders } = this.state;
        this.setState({
            headers: nonValidationHeaders,
            modelInfoKeys: Object.keys(nonValidationHeaders)
        })
    }

    formatMultiValue = (key, value) => {
        if (value && value.length > 0) {
            var propName;
            switch (key) {
                case 'owners':
                    propName = 'email';
                    break;
                case 'tags':
                    propName = 'tag';
                    break;
                default:
                    propName = 'name';
            }
            return value.map(x => x[propName]).join(', ');
        } else {
            return value;
        }
    }

    editCypher = (event, key) => {
        var { cypherAssociationsMap } = this.props;
        var cypherAssociationEntry = cypherAssociationsMap[key];
        var editUrl = '';
        if (cypherAssociationEntry.isVisualCypher) {
            if (isToolLicensed(TOOL_NAMES.CYPHER_BUILDER)) {
                editUrl = `/tools/${TOOL_NAMES.CYPHER_BUILDER}/${cypherAssociationEntry.cypherGraphDocKey}`;
                window.location.href = editUrl;
            } else {
                showUpgradeLicenseMessage();
            }
        } else {
            if (isToolLicensed(TOOL_NAMES.CYPHER_SUITE)) {
                editUrl = `/tools/${TOOL_NAMES.CYPHER_SUITE}/${cypherAssociationEntry.cypherGraphDocKey}`;
                window.location.href = editUrl;
            } else {
                showUpgradeLicenseMessage();
            }
        }
    }

    showDeleteDialog = (event, key) => {
        //console.log(event);
        event.stopPropagation();
        var { generalDialog } = this.state;
        var { cypherAssociationsMap } = this.props;
        this.setState({
            generalDialog: {
                ...generalDialog,
                open: true,
                title: 'Remove Cypher Association',
                description: "Do you want to remove the association to '" + cypherAssociationsMap[key].cypherTitle + "'?",
                buttons: [{
                    text: 'Yes',
                    onClick: (button, index) => {
                        this.props.removeAssociation(cypherAssociationsMap[key]);
                        this.closeGeneralDialog();
                    },
                    autofocus: false
                },
                {
                    text: 'No',
                    onClick: (button, index) => this.closeGeneralDialog(),
                    autofocus: true
                }]
            }
        });
    }

    highlightCypher = (key) => {
        var { cypherAssociationsMap, highlightCypher } = this.props;
        var cypherAssociationEntry = cypherAssociationsMap[key];
        highlightCypher(cypherAssociationEntry, (dataModelDiff) => {
            //console.log(dataModelDiff);
            var { suggestions } = this.state;
            var newSuggestions = {
                //...suggestions,  /* for now we just want one active selection at a time
                [key]: {
                    suggestedNodeLabels: dataModelDiff.nodeLabelDiff.inBnotA,
                    suggestedRelationshipTypes: dataModelDiff.relationshipTypeDiff.inBnotA
                }
            }
            this.setState({ suggestions: newSuggestions })
        });
    }

    addNodeLabelToDataModel = (key, nodeLabel) => (e) => {
        const { addNodeLabelToDataModel } = this.props;
        const { suggestions } = this.state;
        const { suggestedNodeLabels, suggestedRelationshipTypes } = suggestions[key];
        e.stopPropagation();
        //console.log(nodeLabel);
        var result = addNodeLabelToDataModel(nodeLabel.label);
        if (result.success) {
            var index = suggestedNodeLabels.indexOf(nodeLabel);
            if (index >= 0) {
                var updatedSuggestions = { ...suggestions };
                var newNodeLabels = suggestedNodeLabels.slice();
                newNodeLabels.splice(index,1);
                updatedSuggestions[key] = { suggestedNodeLabels: newNodeLabels, suggestedRelationshipTypes };
                this.setState({
                    suggestions: updatedSuggestions
                })
            }
        } else {
            alert(result.message);
        }
    }

    addRelationshipTypeToDataModel = (key, relType) => (e) => {
        e.stopPropagation();
        const { addRelationshipTypeToDataModel } = this.props;
        const { suggestions } = this.state;
        const { suggestedNodeLabels, suggestedRelationshipTypes } = suggestions[key];

        //console.log(nodeLabel);
        var result = addRelationshipTypeToDataModel(relType.startNodeLabel.label, relType.type, relType.endNodeLabel.label);
        if (result.success) {
            var index = suggestedRelationshipTypes.indexOf(relType);
            if (index >= 0) {
                var updatedSuggestions = { ...suggestions };
                var newRelationshipTypes = suggestedRelationshipTypes.slice();
                newRelationshipTypes.splice(index,1);
                updatedSuggestions[key] = { suggestedNodeLabels, suggestedRelationshipTypes: newRelationshipTypes };
                this.setState({
                    suggestions: updatedSuggestions
                })
            }
        } else {
            alert(result.message);
        }
    }

    shouldShowSuggestions = (key) => {
        const { suggestions } = this.state;
        if (suggestions && suggestions[key]) {
            const { suggestedNodeLabels, suggestedRelationshipTypes } = suggestions[key];
            return (suggestedNodeLabels.length > 0 || suggestedRelationshipTypes.length > 0);
        } else {
            return false;
        }
    } 

    renderSuggestions = (key) => {
        const { suggestions } = this.state;
        const { suggestedNodeLabels, suggestedRelationshipTypes } = suggestions[key];
        var nodeSuggestions = suggestedNodeLabels.map(nodeLabel => 
            <span key={`nl-${nodeLabel.key}`} onClick={this.addNodeLabelToDataModel(key, nodeLabel)} 
                style={{cursor: 'pointer', marginLeft: '.5em', color: OTHER_COLORS.ScenarioCypherValidationAddLink}}>
                <span style={{fontSize:'0.75em', marginRight:'0.1em'}} className='fa fa-plus'/> 
                {nodeLabel.label}
            </span>
        )
        var relSuggestions = suggestedRelationshipTypes.map(relType => 
            <span key={`nl-${relType.key}`} onClick={this.addRelationshipTypeToDataModel(key, relType)} 
                style={{cursor: 'pointer', marginLeft: '.5em', color: OTHER_COLORS.ScenarioCypherValidationAddLink}}>
                <span style={{fontSize:'0.75em', marginRight:'0.1em'}} className='fa fa-plus'/> 
                {`(:${(relType.startNodeLabel.label)})-[:${relType.type}]->(:${relType.endNodeLabel.label})`}
            </span>
        );
    
        var allSuggestions = nodeSuggestions.concat(relSuggestions);

        return (
            <span style={{color: 'gray', marginLeft: '.5em'}}>
                (<span style={{fontSize:'0.75em', marginRight:'0.15em', color: 'orange'}} className='fa fa-exclamation-triangle'/> 
                Items not found in model. Click to add. 
                {allSuggestions}
                )
            </span>
        )
    }

    clearDataModelDiff = () => {
        this.setState({
            suggestions: {}
        })
    }

    reRender = () => {
        this.forceUpdate();
    }

    render () {
        const { 
            generalDialog,
            headers, modelInfoKeys  
        } = this.state;
        const { cypherAssociationsMap } = this.props;

        return (
            <>
                {/*<div style={{fontWeight: 500, marginTop: '.7em', paddingLeft: '.3em'}}>Associated Cypher</div>*/}
                <div style={{marginTop: '.2em', overflow: 'auto'}}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                        <TableRow>
                            {modelInfoKeys.map(header =>
                                <TableCell key={header}>{headers[header]}</TableCell>
                            )}
                            {this.showActions &&
                                <TableCell>Actions</TableCell>
                            }
                        </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.keys(cypherAssociationsMap).map(key =>
                                <TableRow key={key} hover={true} onClick={() => this.highlightCypher(key)}>
                                    {modelInfoKeys.map(header => {
                                        var value = (cypherAssociationsMap[key]) ? cypherAssociationsMap[key][header] : undefined;
                                        if (value !== undefined) {
                                            if (header === this.cypherKey) {
                                                value = this.showMoreLessHelper.handleShowMoreLess(key, value);
                                            } else if (this.dateFields.includes(header)) {
                                                value = new Date(parseInt(value)).toLocaleString("en-US");
                                            } else if (this.multiValuedKeys.includes(header)) {
                                                value = this.formatMultiValue(header, value);
                                            } else if (this.booleanKeys.includes(header)) {
                                                value = (value === true) ? 'Yes' : '';
                                            } else if (header === 'validationStatus') {
                                                value = 
                                                    <Tooltip enterDelay={600} arrow title={cypherAssociationsMap[key]['validationMessage']}>
                                                        {getValidationIcon(value)}        
                                                    </Tooltip>
                                            }
                                        }
                                        return (
                                            <TableCell key={header} style={{cursor: 'pointer'}}>
                                                {value}
                                                {header === this.cypherKey && this.shouldShowSuggestions(key) &&
                                                    this.renderSuggestions(key)
                                                }
                                            </TableCell>
                                        )
                                    })}
                                    <TableCell>
                                    {this.showActions &&
                                    <div style={{display:'flex', flexFlow:'row'}}>
                                        <Tooltip enterDelay={600} arrow title={`Launch Cypher Editor`}>
                                            <Button style={{minWidth: '0px', padding: '6px 6px'}}
                                                color={'primary'} onClick={(event) => this.editCypher(event, key)}>
                                                <span className="fa fa-pen"/>
                                            </Button>
                                        </Tooltip>
                                        {(SecurityRole.canEdit()) &&
                                            <Tooltip enterDelay={600} arrow title={`Remove Cypher Association`}>
                                                <Button style={{minWidth: '0px', padding: '6px 6px'}}
                                                    color={'primary'} onClick={(event) => this.showDeleteDialog(event, key)}>
                                                    <span className="fa fa-trash"/>
                                                </Button>
                                            </Tooltip>
                                        }
                                    </div>
                                    }
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <GeneralDialog open={generalDialog.open} onClose={generalDialog.handleClose}
                            title={generalDialog.title} description={generalDialog.description}
                            buttons={generalDialog.buttons} />
            </>
        )
    }
}
 