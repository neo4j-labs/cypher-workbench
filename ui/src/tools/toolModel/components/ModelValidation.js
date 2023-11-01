import React, { Component } from 'react';
import {
    TextField, Typography
} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import { ValidationStatus } from '../../common/validation/ValidationStatus';
import ValidationSection from '../../common/validation/ValidationSection';
import { 
    sortValidationSections, 
    getOverallValidationStatus,
    sortValidations
} from '../../common/validation/ValidationUtil';
import { 
    findNodeLabelsWithNoProperties, 
    findNodeLabelsWithNoNodeKeys,
    findNodeLabelsWithNoRelationshipTypes,
    findNodeLabelsThatDoNotConformToStyleGuide,
    findRelationshipTypesThatDoNotConformToStyleGuide,
    findPropertiesThatDoNotConformToStyleGuide,
    findNodeLabelsWithNoNames,
    findSecondaryNodeLabelsWithNoNames,
    findRelationshipTypesWithNoNames,
    findPropertiesWithNoNames
 } from '../../../dataModel/validation/dataModelValidation';
import { 
    ORIENTATION
} from "../../../components/canvas/d3/graphCanvasGlyph";
import { 
    validateNodeLabelsAgainstDatabase,
    validateRelationshipTypesAgainstDatabase,
    validateConstraintsAgainstDatabase,
    validateIndexesAgainstDatabase
} from './ModelValidationAgainstDatabase';
import { containsSpaces } from "../../../common/text/textUtil";

export const SectionKeys = {
    DataModelNames: "DataModelNames",
    NodeLabelProperties: "NodeLabelProperties",
    NodeLabelNodeKeys: "NodeLabelNodeKeys",
    NodeLabelRelationshipTypes: "NodeLabelRelationshipTypes",
    ConformsToStyleGuide: "ConformsToStyleGuide",       
    ValidateNodeLabelsAgainstDatabase: "ValidateNodeLabelsAgainstDatabase",
    ValidateRelationshipTypesAgainstDatabase: "ValidateRelationshipTypesAgainstDatabase",
    ValidateConstraintsAgainstDatabase: "ValidateConstraintsAgainstDatabase",
    ValidateIndexesAgainstDatabase: "ValidateIndexesAgainstDatabase"
}

export const getNodeLabelDesc = (nodeLabel, includeParens) => {
    const label = (nodeLabel.label) ? `:${nodeLabel.label}` : '';
    return (includeParens) ? `(${label})` : label;
}

export const getRelationshipTypeDesc = (relationshipType, includeBrackets) => {
    const type = (relationshipType.type) ? `:${relationshipType.type}` : '';
    return (includeBrackets) ? `[${type}]` : type;
}

export const getRelationshipTypeDescWithNodeLabels = (relationshipType, skipEnd) => {
    const relType = getRelationshipTypeDesc(relationshipType, true);
    const start = getNodeLabelDesc(relationshipType.startNodeLabel, true);
    const end = getNodeLabelDesc(relationshipType.endNodeLabel, true);
    const desc = (skipEnd) ? `${start}-${relType}->()` : `${start}-${relType}->${end}`;
    return desc;
}

export const getPropertyDesc = ({propertyContainer, property}) => {
    const propName = (property && property.name) ? property.name : '';        
    const propContainerDesc = (propertyContainer.classType === 'NodeLabel')
        ? getNodeLabelDesc(propertyContainer)
        : getRelationshipTypeDesc(propertyContainer)

    const desc = `${propContainerDesc}.${propName}`;
    return desc;
}

export default class ModelValidation extends Component {

    // add back select icon, on select, highlight the issues
    // on click - highlight Node Labels / relationship types with issues
    // ? ability to ignore a specific error

    state = {
        filterInput: '',
        hasBeenValidated: false,
        missingNames: [],
        nodeLabelsWithNoProperties: [],
        nodeLabelsWithNoNodeKeys: [],
        nodeLabelsWithNoRelationshipTypes: [],
        badStyles: [],
        nodeLabelDatabaseValidations: [],
        relationshipTypeDatabaseValidations: [],
        constraintDatabaseValidations: [],
        indexDatabaseValidations: [],
        validationSectionEnabled: {}
    }    

    constructor (props) {
        super(props);

        Object.values(SectionKeys).map(key => this.state.validationSectionEnabled[key] = true);
    }

    reset = () => {
        //this.initValidationMessages();
        this.setState({
            filterInput: '',
            hasBeenValidated: false,
            missingNames: [],
            nodeLabelsWithNoProperties: [],
            nodeLabelsWithNoNodeKeys: [],
            nodeLabelsWithNoRelationshipTypes: [],
            badStyles: [],
            nodeLabelDatabaseValidations: [],
            relationshipTypeDatabaseValidations: [],
            constraintDatabaseValidations: [],
            indexDatabaseValidations: []
        });
    }

    /*
    initValidationMessages = () => {
        const message = "Click Validate to validate the Data Model";
        this.setState({
            nodeLabelsWithNoProperties: [{
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: message
            }],
            nodeLabelsWithNoNodeKeys: [{
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: message
            }],
            nodeLabelsWithNoRelationshipTypes: [{
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: message
            }],
            badStyles: [{
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: message
            }]
        });
    }*/

    getNodeLabelValidationArray = ({ nodeLabels, nodeLabelValidationInfo, invalidMessage, allValidMessage, nothingToValidateMessage }) => {
        var validationArray = [];
        if (nodeLabelValidationInfo.length > 0) {
            nodeLabelValidationInfo.map(x => {
                validationArray.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `${getNodeLabelDesc(x, true)} ${invalidMessage}`,
                    nodeLabel: x 
                })
            })
        } else {
            if (nodeLabels.length > 0) {
                validationArray.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: allValidMessage
                });
            } else {
                validationArray.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: nothingToValidateMessage
                });
            }
        }
        return validationArray;
    }

    validateStyle = (dataModel) => {

        var nodeLabels = dataModel.getNodeLabelArray();

        var badStyles = [];
        var nodeLabelsBadStyle = findNodeLabelsThatDoNotConformToStyleGuide(dataModel);
        nodeLabelsBadStyle.map(x => {
            var message = `Node Label ${getNodeLabelDesc(x, true)} is not CamelCase`;
            message = (containsSpaces(x.label)) ? `${message}, it contains spaces` : message;
            badStyles.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: message,
                nodeLabel: x
            })
        });

        var relTypesBadStyle = findRelationshipTypesThatDoNotConformToStyleGuide(dataModel);
        relTypesBadStyle.map(x => {
            var message = `Relationship Type ${getRelationshipTypeDescWithNodeLabels(x, true)} is not UPPER_CASE`;
            message = (containsSpaces(x.type)) ? `${message}, it contains spaces` : message;
            badStyles.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: message,
                relationshipType: x
            })
        });

        var propsBadStyle = findPropertiesThatDoNotConformToStyleGuide(dataModel);
        propsBadStyle.map(x => {
            const propName = (x && x.property && x.property.name) ? x.property.name : '';
            var message = `Property ${getPropertyDesc(x)} is not camelCase`;
            message = (containsSpaces(propName)) ? `${message}, it contains spaces` : message;
            badStyles.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: message,
                propertyContainer: x.propertyContainer,
                property: x.property
            })
        });

        if (badStyles.length === 0) {
            if (nodeLabels.length > 0) {
                badStyles.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: "Data Model conforms to the style guide"
                });
            } else {
                badStyles.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "There is nothing to check"
                });
            }
        } 
        return badStyles;
    }

    validateMissingNames = (dataModel) => {
        var missingNames = [];
        
        const nodeLabelsNoNames = findNodeLabelsWithNoNames(dataModel);
        if (nodeLabelsNoNames.length > 0) {
            missingNames.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: `${nodeLabelsNoNames.length} Node Labels have no label`,
                nodeLabels: nodeLabelsNoNames
            });
        } else {
            if (dataModel.getNodeLabelArray().length === 0) {
                missingNames.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "There are no Node Labels to check",
                });
            } else {
                missingNames.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: "All Node Labels have names"
                });
            }
        }

        /*
        const secondaryNodeLabelsNoNames = findSecondaryNodeLabelsWithNoNames(dataModel);
        if (secondaryNodeLabelsNoNames.length > 0) {
            var referenceNodes = {};
            secondaryNodeLabelsNoNames.map(x => {
                var primaryNodeLabels = dataModel.getNodeLabelsWhereIAmSecondary(x);
                primaryNodeLabels.map(y => referenceNodes[y.key] = y);
            });
            var referenceNodeArray = Object.values(referenceNodes);

            missingNames.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: `${referenceNodeArray.length} Node Labels have a secondary node label with no name`,
                nodeLabels: referenceNodeArray
            });
        } else {
            missingNames.push({
                validationStatus: ValidationStatus.Valid,
                validationMessage: "All Secondary Node Labels have names"
            });
        }
        */

        const relationshipTypesNoNames = findRelationshipTypesWithNoNames(dataModel);
        if (relationshipTypesNoNames.length > 0) {
            missingNames.push({
                validationStatus: ValidationStatus.Invalid,
                validationMessage: `${relationshipTypesNoNames.length} Relationship Types have no name`,
                relationshipTypes: relationshipTypesNoNames
            });
        } else {
            if (dataModel.getRelationshipTypeArray().length === 0) {
                missingNames.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "There are no Relationship Types to check",
                });
            } else {
                missingNames.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: "All Relationship Types have names"
                });
            }
        }

        const propertiesNoNames = findPropertiesWithNoNames(dataModel);
        if (propertiesNoNames.length > 0) {
            var propertyContainers = {};
            propertiesNoNames.map(x => {
                var obj = propertyContainers[x.propertyContainer.key];
                if (!obj) {
                    obj = {
                        propertyContainer: x.propertyContainer,
                        properties: []
                    };
                    propertyContainers[x.propertyContainer.key] = obj;
                }
                obj.properties.push(x.property);
            });
            
            var nodePropContainers =   
                Object.values(propertyContainers)
                    .map(x => x.propertyContainer)
                    .filter(x => x.classType === 'NodeLabel')
                    .sort((a,b) => (a.label === b.label) 
                        ? 0 : (a.label < b.label) ? -1 : 1)

            var relPropContainers =   
                Object.values(propertyContainers)
                    .map(x => x.propertyContainer)
                    .filter(x => x.classType === 'RelationshipType')
                    .sort((a,b) => (a.type === b.type) 
                        ? 0 : (a.type < b.type) ? -1 : 1)
    
            var allPropContainers = nodePropContainers.concat(relPropContainers);
            allPropContainers.map(propertyContainer => {
                var propContainerKey = (propertyContainer.classType === 'NodeLabel') ? 'nodeLabel' : 'relationshipType';
                var propArray = propertyContainers[propertyContainer.key].properties;
                var message = (propertyContainer.classType === 'NodeLabel') 
                    ? `${getNodeLabelDesc(propertyContainer, true)} has ${propArray.length} properties with no name`
                    : `${getRelationshipTypeDesc(propertyContainer, true)} has ${propArray.length} properties with no name`

                missingNames.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: message,
                    [propContainerKey]: propertyContainer
                });
            })
        } else {
            const numProperties = dataModel.getNodeLabelArray()
                .concat(dataModel.getRelationshipTypeArray())
                .reduce((sum, container) => sum += Object.keys(container.properties).length, 0);
            if (numProperties === 0) {
                missingNames.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "There are no Properties to check",
                });
            } else {
                missingNames.push({
                    validationStatus: ValidationStatus.Valid,
                    validationMessage: "All Properties have names",
                });
            }
        }
        return missingNames;
    }

    howManyInvalid = (validations) => 
        validations.filter(x => x.validationStatus === ValidationStatus.Invalid).length;

    updateState = (dataModel) => (updateObj, dontUpdateValidationMessage) => {
        this.setState(updateObj, () => {
            if (!dontUpdateValidationMessage) {
                this.setValidationMessage(dataModel)
            }
        });
    }

    validateRelationshipTypesAgainstDatabase = (dataModel, validationSectionEnabled, sectionKey) => {
        const updateStateFunc = this.updateState(dataModel);

        if (validationSectionEnabled[sectionKey]) {
            validateRelationshipTypesAgainstDatabase(dataModel, (relationshipTypeDatabaseValidations, flags) => {
                const { hasBeenValidated, dontUpdateValidationMessage } = flags || {};
                updateStateFunc({
                    hasBeenValidated: hasBeenValidated,
                    relationshipTypeDatabaseValidations
                }, dontUpdateValidationMessage);
            })
        } else {
            updateStateFunc({
                relationshipTypeDatabaseValidations: [{
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "Section is not active",
                }]
            }, true);
        }        
    }

    validateNodeLabelsAgainstDatabase = (dataModel, validationSectionEnabled, sectionKey) => {
        const updateStateFunc = this.updateState(dataModel);

        if (validationSectionEnabled[sectionKey]) {
            validateNodeLabelsAgainstDatabase(dataModel, (nodeLabelDatabaseValidations, flags) => {
                const { hasBeenValidated, dontUpdateValidationMessage } = flags || {};
                updateStateFunc({
                    hasBeenValidated: hasBeenValidated,
                    nodeLabelDatabaseValidations
                }, dontUpdateValidationMessage);
            })
        } else {
            updateStateFunc({
                nodeLabelDatabaseValidations: [{
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "Section is not active",
                }]
            }, true);
        }
    }
    
    validateConstraintsAgainstDatabase = (dataModel, validationSectionEnabled, sectionKey) => {
        const updateStateFunc = this.updateState(dataModel);

        if (validationSectionEnabled[sectionKey]) {
            validateConstraintsAgainstDatabase(dataModel, (constraintDatabaseValidations, flags) => {
                const { hasBeenValidated, dontUpdateValidationMessage } = flags || {};
                updateStateFunc({
                    hasBeenValidated: hasBeenValidated,
                    constraintDatabaseValidations
                }, dontUpdateValidationMessage);
            })
        } else {
            updateStateFunc({
                constraintDatabaseValidations: [{
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "Section is not active",
                }]
            }, true);
        }
    }

    validateIndexesAgainstDatabase = (dataModel, validationSectionEnabled, sectionKey) => {
        const updateStateFunc = this.updateState(dataModel);

        if (validationSectionEnabled[sectionKey]) {
            validateIndexesAgainstDatabase(dataModel, (indexDatabaseValidations, flags) => {
                const { hasBeenValidated, dontUpdateValidationMessage } = flags || {};
                updateStateFunc({
                    hasBeenValidated: hasBeenValidated,
                    indexDatabaseValidations
                }, dontUpdateValidationMessage);
            })
        } else {
            updateStateFunc({
                indexDatabaseValidations: [{
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "Section is not active",
                }]
            }, true);
        }
    }

    runSectionIfEnabled = (validationSectionEnabled, sectionKey, validationFunc) => {
        if (validationSectionEnabled[sectionKey]) {
            return validationFunc();
        } else {
            return [{
                validationStatus: ValidationStatus.NotValidated,
                validationMessage: 'Section is not active'
            }]
        }
    }

    validateModel = (dataModel) => {

        this.setState({
            filterInput: ''
        });

        var nodeLabels = dataModel.getNodeLabelArray();

        const validationSectionEnabled = this.getValidationSectionEnabled();

        var nodeLabelsWithNoProperties = this.runSectionIfEnabled(
            validationSectionEnabled,
            SectionKeys.NodeLabelProperties,
            () => 
                this.getNodeLabelValidationArray({
                    nodeLabels: nodeLabels,
                    nodeLabelValidationInfo: findNodeLabelsWithNoProperties(dataModel),
                    invalidMessage: "has no properties",
                    allValidMessage: "All Node Labels have properties",
                    nothingToValidateMessage: "There are no Node Labels to check"
                })
        )

        var nodeLabelsWithNoNodeKeys = this.runSectionIfEnabled(
            validationSectionEnabled,
            SectionKeys.NodeLabelNodeKeys,
            () => 
                this.getNodeLabelValidationArray({
                    nodeLabels: nodeLabels,
                    nodeLabelValidationInfo: findNodeLabelsWithNoNodeKeys(dataModel, { acceptUniqueIndexedMustExistAsNodeKey: true }),
                    invalidMessage: "has no node key",
                    allValidMessage: "All Node Labels have node keys or are Unique+Indexed+Must Exist",
                    nothingToValidateMessage: "There are no Node Labels to check"
                })
        );

        var nodeLabelsWithNoRelationshipTypes = this.runSectionIfEnabled(
            validationSectionEnabled,
            SectionKeys.NodeLabelRelationshipTypes,
            () => 
                this.getNodeLabelValidationArray({
                    nodeLabels: nodeLabels,
                    nodeLabelValidationInfo: findNodeLabelsWithNoRelationshipTypes(dataModel),
                    invalidMessage: "has no relationships",
                    allValidMessage: "All Node Labels have relationships",
                    nothingToValidateMessage: "There are no Node Labels to check"
                })
        );

        var missingNames = this.runSectionIfEnabled(
            validationSectionEnabled,
            SectionKeys.DataModelNames,
            () => this.validateMissingNames(dataModel)
        );
          
        var badStyles = this.runSectionIfEnabled(
            validationSectionEnabled,
            SectionKeys.ConformsToStyleGuide,
            () => this.validateStyle(dataModel)
        );        

        this.validateNodeLabelsAgainstDatabase(dataModel, validationSectionEnabled, SectionKeys.ValidateNodeLabelsAgainstDatabase);
        this.validateRelationshipTypesAgainstDatabase(dataModel, validationSectionEnabled, SectionKeys.ValidateRelationshipTypesAgainstDatabase);
        this.validateConstraintsAgainstDatabase(dataModel, validationSectionEnabled, SectionKeys.ValidateConstraintsAgainstDatabase);
        this.validateIndexesAgainstDatabase(dataModel, validationSectionEnabled, SectionKeys.ValidateIndexesAgainstDatabase);

        this.setState({
            hasBeenValidated: true,
            missingNames,
            nodeLabelsWithNoProperties,
            nodeLabelsWithNoNodeKeys,
            nodeLabelsWithNoRelationshipTypes,
            badStyles
        }, () => {
            this.setValidationMessage(dataModel);
        });
    }

    setValidationMessageTimer = null;
    setValidationMessage = (dataModel) => {
        if (this.setValidationMessageTimer) {
            clearTimeout(this.setValidationMessageTimer);
        }
        this.setValidationMessageTimer = setTimeout(() => this.setValidationMessageImmediate(dataModel), 200);
    }

    setValidationMessageImmediate = (dataModel) => {
        const { setValidationInfo, getDataModelCanvas } = this.props;
        const {
            missingNames,
            nodeLabelsWithNoProperties,
            nodeLabelsWithNoNodeKeys,
            nodeLabelsWithNoRelationshipTypes,
            badStyles, 
            nodeLabelDatabaseValidations,
            relationshipTypeDatabaseValidations,
            constraintDatabaseValidations,
            indexDatabaseValidations
        } = this.state;

        const nonCountSections = [
            missingNames, 
            nodeLabelsWithNoProperties, 
            nodeLabelsWithNoNodeKeys, 
            nodeLabelsWithNoRelationshipTypes, 
            badStyles,
            constraintDatabaseValidations,
            indexDatabaseValidations
        ]

        const countSections = [
            nodeLabelDatabaseValidations,
            relationshipTypeDatabaseValidations
        ]

        const allValidationSections = nonCountSections.concat(countSections);
        
        const numInvalid = allValidationSections
            .map(x => this.howManyInvalid(x))
            .reduce((total,x) => total += x)

        const message = (numInvalid > 0) ? `Found ${numInvalid} issues` : 'All validations passed';
        const status = (numInvalid > 0) ? ValidationStatus.Invalid : ValidationStatus.Valid;
        setValidationInfo(message, status);
        this.setNodeLabelValidationGlyphs(dataModel, nonCountSections, nodeLabelDatabaseValidations);
        this.setRelationshipTypeValidationGlyphs(dataModel, nonCountSections, relationshipTypeDatabaseValidations);
        var dataModelCanvas = getDataModelCanvas();
        dataModelCanvas.renderDataModel();
    }

    getNodeLabelsFromValidation = (validation) => {
        if (validation.nodeLabels) {
            return validation.nodeLabels;
        } else if (validation.nodeLabel) {
            return [validation.nodeLabel];
        } else if (validation.propertyContainer && validation.propertyContainer.classType === 'NodeLabel') {
            return [validation.propertyContainer];
        } else {
            return [];
        }
    }

    getRelationshipTypesFromValidation = (validation) => {
        if (validation.relationshipTypes) {
            return validation.relationshipTypes;
        } else if (validation.relationshipType) {
            return [validation.relationshipType];
        } else if (validation.propertyContainer && validation.propertyContainer.classType === 'RelationshipType') {
            return [validation.propertyContainer];
        } else {
            return [];
        }
    }

    setNodeLabelValidationGlyphs = (dataModel, nonCountSections, nodeLabelDatabaseValidations) => {
        //console.log('nodeLabelDatabaseValidations length: ', nodeLabelDatabaseValidations.length)
        //console.log('nodeLabelDatabaseValidations: ', nodeLabelDatabaseValidations)
        var nodeLabelValidationMap = {};
        dataModel.getNodeLabelArray().map(nodeLabel => {
            nodeLabel.display.removeAllGlyphs();
            nodeLabelValidationMap[nodeLabel.key] = {
                nodeLabel: nodeLabel,
                valid: true,
                count: 0,
                countPresent: false
            };
        });

        nonCountSections.map(validations => {
            validations.map(validation => {
                if (validation.validationStatus === ValidationStatus.Invalid) {
                    var nodeLabels = this.getNodeLabelsFromValidation(validation);
                    nodeLabels.map(nodeLabel => {
                        //console.log(`setting nodeLabelValidationMap ${nodeLabel.key} valid to false`);
                        nodeLabelValidationMap[nodeLabel.key].valid = false
                    });
                }
            })
        });

        nodeLabelDatabaseValidations.map(validation => {
            var nodeLabels = this.getNodeLabelsFromValidation(validation);
            nodeLabels.map(nodeLabel => {
                var mapEntry = nodeLabelValidationMap[nodeLabel.key];
                if (validation.count === 0) {
                    mapEntry.valid = false;
                }
                mapEntry.count = validation.count;
                mapEntry.countPresent = true;
            });
        });

        Object.values(nodeLabelValidationMap).map(mapEntry => {
            const { nodeLabel, valid, count, countPresent } = mapEntry;
            //console.log('nodeLabel: ', nodeLabel);
            if (valid) {
                //console.log(`adding green glyph`);                
                nodeLabel.display.addGlyph({
                    orientation: ORIENTATION.TOP_RIGHT,
                    text: '',
                    color: 'white',
                    textColor: 'green',
                    icon: 'check-circle'
                });          
            } else {
                //console.log(`adding triangle glyph`);                
                nodeLabel.display.addGlyph({
                    orientation: ORIENTATION.TOP_RIGHT,
                    text: '',
                    color: 'white',
                    textColor: 'orange',
                    icon: 'exclamation-triangle'
                });          
            }
            if (countPresent) {
                const numberDisplay = this.abbreviateNumber(count);
                console.log(`count: ${count}, numberDisplay: ${numberDisplay}`);
                nodeLabel.display.addGlyph({
                    orientation: ORIENTATION.BOTTOM_RIGHT,
                    text: `${numberDisplay}`,
                    //color: '#C82266',     // darker shade of red
                    color: (count > 0) ? 'green' : '#e67e00',   // #e67e00 darker shade of orange
                    textColor: 'white'
                });
            }
        });
    }

    setRelationshipTypeValidationGlyphs = (dataModel, nonCountSections, relationshipTypeDatabaseValidations) => {
        var relationshipTypeValidationMap = {};
        dataModel.getRelationshipTypeArray().map(relationshipType => {
            relationshipType.display.glyph = null;
            relationshipTypeValidationMap[relationshipType.key] = {
                relationshipType: relationshipType,
                valid: true,
                count: 0,                  // used, but not displayed right now
                countPresent: false         
            };
        });

        nonCountSections.map(validations => {
            validations.map(validation => {
                if (validation.validationStatus === ValidationStatus.Invalid) {
                    var relationshipTypes = this.getRelationshipTypesFromValidation(validation);
                    relationshipTypes.map(relationshipType => {
                        relationshipTypeValidationMap[relationshipType.key].valid = false
                    });
                }
            })
        });

        relationshipTypeDatabaseValidations.map(validation => {
            var relationshipTypes = this.getRelationshipTypesFromValidation(validation);
            relationshipTypes.map(relationshipType => {
                var mapEntry = relationshipTypeValidationMap[relationshipType.key];
                if (validation.count === 0) {
                    mapEntry.valid = false;
                }
                mapEntry.count = validation.count;
                mapEntry.countPresent = true;
            });
        });

        Object.values(relationshipTypeValidationMap).map(mapEntry => {
            const { relationshipType, valid } = mapEntry;
            if (valid) {
                //console.log(`adding green glyph`);                
                relationshipType.display.setGlyph({
                    orientation: ORIENTATION.CENTER,
                    text: '',
                    color: 'white',
                    textColor: 'green',
                    icon: 'check-circle'
                });          
            } else {
                //console.log(`adding triangle glyph`);                
                relationshipType.display.setGlyph({
                    orientation: ORIENTATION.CENTER,
                    text: '',
                    color: 'white',
                    textColor: 'orange',
                    icon: 'exclamation-triangle'
                });          
            }
            
        });
    }

    // from https://stackoverflow.com/questions/10599933/convert-long-number-into-abbreviated-string-in-javascript-with-a-special-shortn
    abbreviateNumber = (value) => {
        var newValue = value;
        if (value >= 1000) {
            var suffixes = ["", "k", "m", "b","t"];
            var suffixNum = Math.floor( (""+value).length/3 );
            var shortValue = '';
            for (var precision = 2; precision >= 1; precision--) {
                shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
                var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
                if (dotLessShortValue.length <= 2) { break; }
            }
            if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(1);
            newValue = shortValue+suffixes[suffixNum];
        }
        return newValue;
    }

    setValue = (e) => {
        this.setState({
            filterInput: e.target.value
        }, () => {
        })
    }

    clearValue = (e) => {
        this.setState({
            filterInput: ''
        })
    }

    filter = (validations) => {
        const { filterInput } = this.state;
        sortValidations(validations);
        if (filterInput) {
            return validations.filter(x => x.validationMessage.toLowerCase().indexOf(filterInput.toLowerCase()) >= 0);
        } else {    
            return validations;
        }
    }

    setFilterValue = (filterValue) => this.setState({filterInput: filterValue});

    getValidationSectionEnabled = () => {
        var { dataModel } = this.props;
        var exclusions = dataModel.getExcludeValidationSections();
        var sectionsEnabled = {};
        Object.values(SectionKeys).map(key => 
            sectionsEnabled[key] = exclusions.includes(key) ? false : true);
        return sectionsEnabled;
    }

    toggleSectionEnabled = (sectionKey) => {
        var { dataModel } = this.props;
        var exclusions = dataModel.getExcludeValidationSections();
        var index = exclusions.indexOf(sectionKey);
        if (index >= 0) {
            // already excluded
            dataModel.removeValidationSectionToExclude(sectionKey);
        } else {
            // not excluded, add to exclusions
            dataModel.addValidationSectionToExclude(sectionKey);
        }
        this.forceUpdate();
    }

    render () {
        var {
            filterInput,
            hasBeenValidated,
            missingNames,
            nodeLabelsWithNoProperties,
            nodeLabelsWithNoNodeKeys,
            nodeLabelsWithNoRelationshipTypes,
            badStyles,
            nodeLabelDatabaseValidations,
            relationshipTypeDatabaseValidations,
            constraintDatabaseValidations,
            indexDatabaseValidations            
        } = this.state;

        var modelValidationSections = [
            {
                sectionKey: SectionKeys.DataModelNames,
                title: "Static: Data Model names", 
                validations: missingNames
            },
            {
                sectionKey: SectionKeys.NodeLabelProperties,
                title: "Static: Node Label Properties", 
                validations: nodeLabelsWithNoProperties
            },
            {
                sectionKey: SectionKeys.NodeLabelNodeKeys,
                title: "Static: Node Label Node Keys", 
                validations: nodeLabelsWithNoNodeKeys
            },
            {
                sectionKey: SectionKeys.NodeLabelRelationshipTypes,
                title: "Static: Node Label Relationship Types", 
                validations: nodeLabelsWithNoRelationshipTypes
            },
            {
                sectionKey: SectionKeys.ConformsToStyleGuide,
                title: "Static: Conforms to Style Guide", 
                validations: badStyles
            },
            {
                sectionKey: SectionKeys.ValidateNodeLabelsAgainstDatabase,
                title: "Database: Validate Node Labels", 
                validations: nodeLabelDatabaseValidations
            },
            {
                sectionKey: SectionKeys.ValidateRelationshipTypesAgainstDatabase,
                title: "Database: Validate Relationship Types", 
                validations: relationshipTypeDatabaseValidations
            },
            {
                sectionKey: SectionKeys.ValidateConstraintsAgainstDatabase,
                title: "Database: Validate Constraints", 
                validations: constraintDatabaseValidations
            },
            {
                sectionKey: SectionKeys.ValidateIndexesAgainstDatabase,
                title: "Database: Validate Indexes", 
                validations: indexDatabaseValidations
            }
        ];

        const validationSectionEnabled = this.getValidationSectionEnabled();

        filterInput = filterInput || '';
        const forceExpand = (filterInput.trim()) ? true : false;
        const placeholder = 'Filter';

        modelValidationSections.map(section => {
            section.validations = this.filter(section.validations);
            section.overallValidationStatus = getOverallValidationStatus(section.validations);
        });

        sortValidationSections(modelValidationSections);

        const { highlightItems } = this.props;

        return (
            (!hasBeenValidated) 
            ? 
                <Typography>Click Validate to validate the Data Model</Typography>
            : 
            <div>
                <div style={{display:'flex', flexFlow: 'row', marginTop: '-1.5em', marginBottom: '.5em'}}>
                    <TextField id="filter" label="Filter" autoComplete="off"
                        value={filterInput} onChange={this.setValue} 
                        placeholder={placeholder} 
                        title={placeholder}
                        margin="dense" style={{marginLeft: '1em', width: '250px'}}/>
                    <div style={{color:'#aaa', marginTop: '1.5em', cursor: 'pointer'}}>
                        <ClearIcon 
                            onClick={this.clearValue}>
                        </ClearIcon>
                    </div>
                </div>
                {modelValidationSections
                    .filter(section => section.validations.length > 0)
                    .map(section => 
                        <ValidationSection 
                            key={section.sectionKey}
                            sectionKey={section.sectionKey}
                            title={section.title}
                            overallValidationStatus={section.overallValidationStatus}
                            validations={section.validations}
                            highlightItems={highlightItems}
                            forceExpand={forceExpand}
                            isSectionEnabled={validationSectionEnabled[section.sectionKey]}
                            toggleSectionEnabled={this.toggleSectionEnabled}
                        />
                    )
                }
                <div style={{width: '10px', height: '120px'}}>
                    {/* so I can scroll down further */}
                </div>
            </div>
       )
    }    
}