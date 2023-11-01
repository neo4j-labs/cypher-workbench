import React, { Component } from 'react';
import {
    TextField, Typography
} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import { validateCypherAgainstModel } from '../../common/validation/CypherValidation';
import { ValidationStatus } from '../../common/validation/ValidationStatus';
import ValidationSection from '../../common/validation/ValidationSection';
import { 
    sortValidationSections, 
    getOverallValidationStatus,
    sortValidations
} from '../../common/validation/ValidationUtil';
import {
    currentlyConnectedToNeo,
    runCypher,
    connectionIsProxied
} from "../../../common/Cypher";
import CypherStringConverter from "../../../dataModel/cypherStringConverter";
import { Pattern } from "../../../dataModel/cypherPattern";
import { handleParseError } from "../../../common/parse/parseCypher";

export const SectionKeys = {
    NoDataModelSelected: "NoDataModelSelected",
    DatabaseNotConnected: "DatabaseNotConnected",
    NothingToValidate: "NothingToValidate"
}

export default class CypherValidation extends Component {

    state = {
        filterInput: '',
        hasBeenValidated: false,
        validationSections: {},
        asyncValidationSections: {}
    }    

    constructor (props) {
        super(props);
    }

    reset = () => {
        //this.initValidationMessages();
        this.setState({
            filterInput: '',
            hasBeenValidated: false,
            validationSections: {},
            asyncValidationSections: {}
        });
    }

    howManyInvalid = (validations) => 
        validations.filter(x => x.validationStatus === ValidationStatus.Invalid).length;

    getRelNodeLabelText = (relNodeLabel) => {
        relNodeLabel = relNodeLabel || { label: ''};
        return (relNodeLabel.label === 'Anon') ? '' : `:${relNodeLabel.label}`;
    }
      
    getRelTypeText = (relType) => 
        (relType === 'ANON') ? '' : `:${relType}`;

    validateCypherConformsToDataModel = (cypher, cypherKey, dataModel) => {
        var validations = [];
        var { success, message, valid, diff } = validateCypherAgainstModel(cypher, dataModel);
        if (!success) {
            validations.push({
                validationStatus: ValidationStatus.Error,
                validationMessage: message,
                cypher,
                cypherKey
            });
        } else if (!valid) {    
          //console.log('diff: ', diff);
          // get diff description  
          diff.nodeLabelDiff.inBnotA
            .map(x => {
                validations.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `Node Label '${x.label}' not in model`,
                    cypher,
                    cypherKey
                });        
            });

          diff.nodeLabelDiff.BdiffA
            .map(x => {
                if (x.propertyDiff.inBnotA.length > 0) {
                    const missingPropertyNames = x.propertyDiff.inBnotA.map(y => `'${y.name}'`).join(', ');
                    validations.push({
                        validationStatus: ValidationStatus.Invalid,
                        validationMessage: `For Node Label '${x.b.label}', properties ${missingPropertyNames} are not in the model`,
                        cypher,
                        cypherKey
                    });        
                }
            });

          diff.relationshipTypeDiff.inBnotA
            .map(x => {
                const desc = `(${this.getRelNodeLabelText(x.startNodeLabel)})-[${this.getRelTypeText(x.type)}]->(${this.getRelNodeLabelText(x.endNodeLabel)})`;
                validations.push({
                    validationStatus: ValidationStatus.Invalid,
                    validationMessage: `Relationship Type '${desc}' not in model`,
                    cypher,
                    cypherKey
                });        
            });

          diff.relationshipTypeDiff.BdiffA
            .map(x => {
                if (x.propertyDiff.inBnotA.length > 0) {
                    const missingPropertyNames = x.propertyDiff.inBnotA.map(y => `'${y.name}'`).join(', ');
                    const desc = `(${this.getRelNodeLabelText(x.b.startNodeLabel)})-[${this.getRelTypeText(x.b.type)}]->(${this.getRelNodeLabelText(x.b.endNodeLabel)})`;
                    validations.push({
                        validationStatus: ValidationStatus.Invalid,
                        validationMessage: `For Relationship Type '${desc}', properties ${missingPropertyNames} are not in the model`,
                        cypher,
                        cypherKey
                    });        
                }
            });
        } else {
            validations.push({
                validationStatus: ValidationStatus.Valid,
                validationMessage: "Cypher conforms to data model",
                cypher,
                cypherKey
            });
        }
        return validations;
    }

    updateState = (validationSectionToUpdate) => (validations, dontUpdateValidationMessage) => {
        const { asyncValidationSections } = this.state;

        const { sectionKey } = validationSectionToUpdate;
        var newValidationSection = { ...validationSectionToUpdate };
        newValidationSection.validations = validations;
        this.setState({
            asyncValidationSections: {
                ...asyncValidationSections,
                [sectionKey]: newValidationSection
            }
        }, () => {
            if (!dontUpdateValidationMessage) {
                this.setValidationMessage()
            }
        });
    }

    getDebugPatternStatements = (cypher) => {
        const cypherStringConverter = new CypherStringConverter();
        try {
          var clauses = cypherStringConverter.convertToClauses(cypher);
          var statements = [];
          clauses
            .filter(clause => clause.clauseInfo 
                    && clause.clauseInfo.getValidationCypherSnippets
                    && clause.clauseInfo instanceof Pattern)
            .map(clause => {
                clause.clauseInfo.getValidationCypherSnippets().map(snippet => {
                    const cypherSnippet = `${clause.keyword} ${snippet} \nRETURN * \nLIMIT 1`;
                    statements.push(cypherSnippet);
                })
            });

          // also get rid of any duplicates but maintain ordering (therefore not using Set)
          for (var i = 0; i < statements.length; i++) {
            var statement = statements[i];
            for (var j = i+1; j < statements.length; j++) {
                var statementToCheck = statements[j]; 
                if (statement == statementToCheck) {
                    statements.splice(j,1);
                    i--;
                    break;
                }
            }
          }

          // now get rid of any OPTIONAL MATCHes that check 
          //  for the same thing as a regular MATCH

          for (i = 0; i < statements.length; i++) {
            var statement = statements[i];
            if (statement.match(/^OPTIONAL/i)) {
                var nonOptionalMatch = statement.substring('OPTIONAL '.length);
                if (statements.includes(nonOptionalMatch)) {
                    statements.splice(i,1);
                    i--;
                }
            }
          }
          //console.log('statements: ', statements);
          return {
                success: true,
                statements
          }
        } catch (error) {
            return { 
                success: false,
                error
            }
        }
    }

    validateCypherDataExistsInDatabase = (title, cypher, cypherKey, sectionKey) => {

        const validationSectionToUpdate = {
            sectionKey,
            cypherKey,
            title: `Database: ${title}`,
            validations: []
        };        
        const updateStateFunc = this.updateState(validationSectionToUpdate);
        var validations = [];
        if (currentlyConnectedToNeo()) {
            if (connectionIsProxied()) {
                validations.push({
                    validationStatus: ValidationStatus.NotValidated,
                    validationMessage: "Cypher data validation not allowed on proxied connections",
                    cypher,
                    cypherKey
                });
                updateStateFunc(validations, {hasBeenValidated: true});
                return;                
            }

            updateStateFunc([{
                validationStatus: ValidationStatus.ValidationInProgress,
                validationMessage: "Running database validation queries",
                cypher,
                cypherKey
            }], {dontUpdateValidationMessage: true});
    
            var { success, statements, error } = this.getDebugPatternStatements(cypher);
            if (success) {
                //console.log('statements: ', statements);
                if (statements.length > 0) {
                    statements.map((statement, i) => {
                        runCypher(statement, {}, (results) => {
                            //console.log("reltype validation: ", results);
                            if (results.rows.length === 1) {
                                validations.push({
                                    validationStatus: ValidationStatus.Valid,
                                    validationMessage: `${statement} returned data`,
                                    cypher,
                                    cypherKey,
                                    rank: i + 1
                                });
                            } else {
                                validations.push({
                                    validationStatus: ValidationStatus.Invalid,
                                    validationMessage: `${statement} returned no data`,
                                    cypher,
                                    cypherKey,
                                    rank: i + 1
                                });
                            }
                            updateStateFunc(validations, {hasBeenValidated: true});    
                        }, (error) => {
                            validations.push({
                                validationStatus: ValidationStatus.Error,
                                validationMessage: `Error ${error.message}`,
                                cypher,
                                cypherKey, 
                                rank: i + 1
                            });
                            updateStateFunc(validations, {hasBeenValidated: true});
                        });
                    })
                } else {
                    validations.push({
                        validationStatus: ValidationStatus.Valid,
                        validationMessage: `No data model information to check`,
                        cypher,
                        cypherKey,
                        rank: 0
                    });
                    updateStateFunc(validations, {hasBeenValidated: true});                    
                }

            } else {
                const parserError = handleParseError(error, cypher);
                validations.push({
                    validationStatus: ValidationStatus.Error,
                    validationMessage: (parserError.success) ? 'Unknown parse error' : parserError.message,
                    cypher,
                    cypherKey
                });
                updateStateFunc(validations, {hasBeenValidated: true});
              }
        }
    }

    validateCypherStatements = (cypherObjArray, dataModel) => {

        var validationSections = {};
        var sectionKey;
        const isConnected = currentlyConnectedToNeo();
        
        if (cypherObjArray && cypherObjArray.length > 0) {
            cypherObjArray.map(cypherObj => {
                const { key, title, cypher } = cypherObj;
                var validations = [];
                if (dataModel) {
                    validations = this.validateCypherConformsToDataModel(cypher, key, dataModel);
                    sectionKey = `${key}_validateAgainstModel`
                    validationSections[sectionKey] = {
                        sectionKey: sectionKey,
                        cypherKey: key,
                        title: `Model: ${title}`,
                        validations
                    };
                }
                
                if (isConnected) {
                    sectionKey = `${key}_validateAgainstDatabase`;
                    // this is an async call, when finished it will lookup the above
                    //  validationSection by sectionKey and set the validations
                    this.validateCypherDataExistsInDatabase(title, cypher, key, sectionKey);                    
                }
            });

            if (!dataModel) {
                sectionKey = SectionKeys.NoDataModelSelected;
                validationSections[sectionKey] = {
                    sectionKey: sectionKey,
                    title: 'No Data Model selected',
                    overallValidationStatus: ValidationStatus.NotValidated,
                    validations: [
                        {
                            validationStatus: ValidationStatus.NotValidated,
                            validationMessage: "Please select a model to validate cypher statements against the model"
                        }
                    ]
                }
            }
            if (!isConnected) {
                sectionKey = SectionKeys.DatabaseNotConnected;
                validationSections[sectionKey] = {
                    sectionKey: sectionKey,
                    title: 'Database not connected',
                    overallValidationStatus: ValidationStatus.NotValidated,
                    validations: [
                        {
                            validationStatus: ValidationStatus.NotValidated,
                            validationMessage: "Please connect to a database to validate cypher statements against the database"
                        }
                    ]
                }
            }

        } else {
            sectionKey = SectionKeys.NothingToValidate;
            validationSections[sectionKey] = {
                sectionKey: sectionKey,
                title: 'Nothing to validate',
                overallValidationStatus: ValidationStatus.NotValidated,
                validations: [
                    {
                        validationStatus: ValidationStatus.NotValidated,
                        validationMessage: "Add cypher statements to validate"
                    }
                ]
            }
        }

        this.setState({
            hasBeenValidated: true,
            validationSections: validationSections
        }, () => {
            this.setValidationMessage();
        });
    }

    setValidationMessageTimer = null;
    setValidationMessage = () => {
        if (this.setValidationMessageTimer) {
            clearTimeout(this.setValidationMessageTimer);
        }
        this.setValidationMessageTimer = setTimeout(() => this.setValidationMessageImmediate(), 200);
    }

    setValidationMessageImmediate = () => {
        const { setValidationInfo } = this.props;
        var {
            validationSections, 
            asyncValidationSections
        } = this.state;

        validationSections = validationSections || {};
        asyncValidationSections = asyncValidationSections || {};
        const allSections = Object.values(validationSections)
            .concat(Object.values(asyncValidationSections));

        const numInvalid = allSections
            .map(x => this.howManyInvalid(x.validations))
            .reduce((total,x) => total += x)

        const message = (numInvalid > 0) ? `Found ${numInvalid} issues` : 'All validations passed';
        const status = (numInvalid > 0) ? ValidationStatus.Invalid : ValidationStatus.Valid;
        setValidationInfo(message, status);
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

    setValue = (e) => {
        this.setState({
            filterInput: e.target.value
        }, () => {
            //console.log('TODO: run filter')
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

    render () {
        var {
            filterInput,
            hasBeenValidated,
            validationSections,
            asyncValidationSections
        } = this.state;

        const forceExpand = (filterInput.trim()) ? true : false;
        const placeholder = 'Filter';

        var validationSectionArray = Object.values(validationSections)
            .concat(Object.values(asyncValidationSections));

        validationSectionArray.map(section => {
            section.filteredValidations = this.filter(section.validations);
            section.overallValidationStatus = getOverallValidationStatus(section.validations);
        });

        sortValidationSections(validationSectionArray);

        const { highlightItems } = this.props;

        return (
            (!hasBeenValidated) 
            ? 
                <Typography>Click Validate to validate the Cypher Statements</Typography>
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
                {validationSectionArray
                    .filter(section => section.filteredValidations.length > 0)
                    .map(section => 
                        <ValidationSection 
                            key={section.sectionKey}
                            sectionKey={section.sectionKey}
                            title={section.title}
                            overallValidationStatus={section.overallValidationStatus}
                            validations={section.filteredValidations}
                            isSectionEnabled={true}
                            highlightItems={highlightItems}
                            forceExpand={forceExpand}
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