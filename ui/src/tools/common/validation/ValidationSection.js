import React, { Component } from 'react'

import {
    Accordion, AccordionDetails, AccordionSummary, Checkbox, CircularProgress,
    Table, TableBody, TableCell, TableRow, Tooltip, Typography
} from '@material-ui/core';

import { COLORS } from '../../../common/Constants';

import CropFreeIcon from '@material-ui/icons/CropFree';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ErrorOutlineOutlinedIcon from '@material-ui/icons/ErrorOutlineOutlined';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import AdjustIcon from '@material-ui/icons/Adjust';
import ReportProblemOutlinedIcon from '@material-ui/icons/ReportProblemOutlined';
import { ValidationStatus } from './ValidationStatus';

const Sizes = {
    TitleBarHeight: '2.5em',
}

export const getValidationIcon = (validationStatus, props) => {
    var isSectionEnabled = (props) ? props.isSectionEnabled : true;

    if (isSectionEnabled) {
        var icon = null;
        switch (validationStatus) {
            case ValidationStatus.NotValidated:
                icon = <AdjustIcon style={{color: COLORS.primary}}></AdjustIcon>
                break;                
            case ValidationStatus.ValidationInProgress:
                icon = <CircularProgress style={{color: COLORS.primary, width:'24px', height:'24px'}}/>
                break;                
            case ValidationStatus.Invalid:
                icon = <ReportProblemOutlinedIcon style={{color: 'orange'}}></ReportProblemOutlinedIcon>
                break;
            case ValidationStatus.Valid:
                icon = <CheckCircleOutlineIcon style={{color: 'green'}}></CheckCircleOutlineIcon>
                break;
            case ValidationStatus.Error:
                icon = <ErrorOutlineOutlinedIcon style={{color: 'red'}}></ErrorOutlineOutlinedIcon>
                break;
            default: 
                icon = <AdjustIcon style={{color: COLORS.primary}}></AdjustIcon>
                break;
        }
    } else {
        icon = <AdjustIcon style={{color: COLORS.primary}}></AdjustIcon>
    }
    return icon;
}

export default class ValidationSection extends Component {

    state = {
        hasBeenToggled: false,  // initial state so we can collapse the accordion initially if all checks pass 
        expanded: true
    }

    toggleAccordionPanel = () => {
        const { expanded, hasBeenToggled } = this.state;
        const { overallValidationStatus } = this.props;
        const { validationStatus } = overallValidationStatus;

        // initial state of all valid will have it collapsed, so we will want to expand it
        var newState = !expanded;
        if (!hasBeenToggled && 
                (validationStatus === ValidationStatus.Valid
                || validationStatus === ValidationStatus.NotValidated)) {
            newState = true;
        } 

        this.setState({
            hasBeenToggled: true,
            expanded: newState
        });
    }

    highlightAllValidationErrors = () => {
        const { highlightItems, validations } = this.props;
        var badNodes = validations
            .filter(x => x.nodeLabel)
            .map(x => x.nodeLabel);

        validations
            .filter(x => x.propertyContainer && x.propertyContainer.classType === 'NodeLabel')
            .map(x => {
                var badNode = x.propertyContainer;
                if (!badNodes.includes(badNode)) {
                    badNodes.push(badNode);
                }
            })
        
        var badRels = validations
            .filter(x => x.propertyContainer && x.propertyContainer.classType === 'RelationshipType')
            .map(x => x.propertyContainer);

        var badCypherKeys = validations
            .filter(x => x.cypherKey)
            .map(x => x.cypherKey);

        highlightItems({
            nodeLabels: badNodes, 
            relationshipTypes: badRels,
            cypherKeys: badCypherKeys
        });
    }

    highlightValidationError = (validation) => {
        const { highlightItems } = this.props;

        var badNodes = [];
        if (validation.nodeLabels) {
            badNodes = validation.nodeLabels.slice();
        } else {
            var nodeLabel = (validation.nodeLabel) 
            ? validation.nodeLabel
            : (validation.propertyContainer && validation.propertyContainer.classType === 'NodeLabel')
                ? validation.propertyContainer 
                : null;
            badNodes = (nodeLabel) ? [nodeLabel] : [];
        }

        var badRels = [];
        if (validation.relationshipTypes) {
            badRels = validation.relationshipTypes.slice();            
        } else {
            var relationshipType = (validation.propertyContainer && validation.propertyContainer.classType === 'RelationshipType')
            ? validation.propertyContainer 
            : null;

            badRels = (relationshipType) ? [relationshipType] : [];
        }

        var badCypherKeys = (validation.cypherKey) ? [validation.cypherKey] : [];

        highlightItems({
            nodeLabels: badNodes, 
            relationshipTypes: badRels,
            cypherKeys: badCypherKeys
        });
    }

    getOverallValidationStatusIcon = () => {
        var { isSectionEnabled, overallValidationStatus } = this.props;

        var message;

        var { howManyInvalid, validationStatus } = overallValidationStatus;
        if (isSectionEnabled) {
            switch (validationStatus) {
                case ValidationStatus.Valid:
                    message = `All validations pass`;
                    break;
                case ValidationStatus.Invalid:
                    message = `Found ${howManyInvalid} issues`;
                    break;
                case ValidationStatus.Error:
                    message = `Found ${howManyInvalid} errors`;
                    break;
                default:
                    message = `Not validated`;
                    break;
            }
        } else {
            message = 'Section not active';
            validationStatus = ValidationStatus.NotValidated;
        }

        return (
            <Tooltip enterDelay={600} arrow title={message}>
                {getValidationIcon(validationStatus, this.props)}
            </Tooltip>
        )
    }

    render () {
        const { title, validations, forceExpand, overallValidationStatus,
            sectionKey, isSectionEnabled, toggleSectionEnabled } = this.props;
        const { expanded, hasBeenToggled } = this.state;
        const { validationStatus } = overallValidationStatus;
        const accordionExpansion = 
            (forceExpand) 
                ? true
                : (!hasBeenToggled && 
                        (validationStatus === ValidationStatus.Valid 
                        || validationStatus === ValidationStatus.NotValidated)) 
                    ? false  // initially collapse accordion panel if everything is good or inactive
                    : expanded;

        const canBeDisabled = (toggleSectionEnabled) ? true : false;

        return (
            <Accordion expanded={accordionExpansion} 
                onChange={this.toggleAccordionPanel}
            >
                <AccordionSummary style={{background: '#E9E9E9', height: Sizes.TitleBarHeight, minHeight: Sizes.TitleBarHeight}}>
                    <div style={{display: 'flex', justifyContent: 'flex-start', flexFlow: 'row', width: '100%', padding: '5px', paddingTop: '11px'}}>
                        <div style={{marginRight: '.5em'}}>{this.getOverallValidationStatusIcon()}</div>
                        <Typography>{title}</Typography>
                        <div style={{marginLeft: 'auto', flex: '0 0 auto', display: 'flex', flexFlow: 'row' }}>
                            {canBeDisabled &&
                                <Tooltip enterDelay={600} arrow title="Uncheck to skip section">
                                <Checkbox 
                                    checked={isSectionEnabled} 
                                    color="primary"
                                    style={{marginTop: '-0.37em'}}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onChange={(e) => {
                                        toggleSectionEnabled(sectionKey)
                                    }}
                                />
                            </Tooltip>
                            }
                            <Tooltip enterDelay={600} arrow title="Click to Highlight Validation Errors">
                                <CropFreeIcon style={{ fontSize: '1.3em', marginTop: '.1em'}} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.highlightAllValidationErrors();
                                    }}/>
                            </Tooltip>
                            <div style={{height: '1em', width: '1em'}}/>     
                            {(accordionExpansion) 
                                ? <ExpandLessIcon/> 
                                : <ExpandMoreIcon />
                            }
                        </div>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <Table stickyHeader aria-label="sticky table">
                        <TableBody>
                            {validations.map((validation, i) =>
                                <TableRow key={i} hover={true} onClick={() => this.highlightValidationError(validation)}>
                                    <TableCell size='small' style={{cursor: 'pointer'}}>
                                        {getValidationIcon(validation.validationStatus, this.props)}        
                                    </TableCell>
                                    <TableCell style={{cursor: 'pointer'}}>
                                        {validation.validationMessage}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </AccordionDetails>
            </Accordion>
        )
    }    
}