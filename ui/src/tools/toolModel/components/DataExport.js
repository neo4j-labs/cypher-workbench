import React, { Component } from 'react'
import {
    Checkbox, FormControlLabel, TextField
} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import AccordionBlockNoDrag from '../../common/blocks/AccordionBlockNoDrag';
import { OutlinedStyledButton } from '../../../components/common/Components';
import SelectNeo4jDatabase, { SelectDatabaseField } from '../../common/database/SelectNeo4jDatabase';
import { exportData, getExportDataJson } from '../../common/mapping/neo4j/exportNeoToNeo';
import PipelineOptionsButton from '../../common/mapping/PipelineOptions';
import {
    GraphDocChangeType
  } from "../../../dataModel/graphDataConstants";

export default class DataExport extends Component {

    state = {
        parallelRelationships: true,
        nodeLabelAccordionExpanded: true,
        relationshipTypeAccordionExpanded: true,
        selectAllNodeLabels: false,
        selectAllRelationshipTypes: false,
        nodeLabelKeysChecked: {},
        relationshipTypeKeysChecked: {},
        filterInput: '',
        sourceNeo4jDatabaseConnection: {},
        destNeo4jDatabaseConnection: {},
        sourceNeo4jDatabaseLabel: 'Neo4j Source Database',
        destNeo4jDatabaseLabel: 'Neo4j Destination Database',
    }

    constructor (props) {
        super(props);
        this.sourceNeo4jDatabaseRef = React.createRef();
        this.destNeo4jDatabaseRef = React.createRef();
    }

    handleExportSettings = (exportSettings) => {
        exportSettings = exportSettings || {};
        const parallelRelationships = (exportSettings.parallelRelationships !== null && exportSettings.parallelRelationships !== undefined) 
                                            ? exportSettings.parallelRelationships : true;
        const sourceNeo4jDatabaseConnection = (exportSettings.sourceNeo4jDatabaseConnection) ? exportSettings.sourceNeo4jDatabaseConnection : {};
        const destNeo4jDatabaseConnection = (exportSettings.destNeo4jDatabaseConnection) ? exportSettings.destNeo4jDatabaseConnection : {};

        this.setState({
            parallelRelationships, 
            sourceNeo4jDatabaseConnection, 
            destNeo4jDatabaseConnection 
        });
    }

    getExportSettings = () => {
        const { 
            parallelRelationships, 
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection
        } = this.state;

        return {
            parallelRelationships,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection
        }
    }

    selectAllNodeLabelsChangeHandler = (e) => {
        const { selectAllNodeLabels } = this.state;

        var newNodeLabelKeysChecked = { ...this.state.nodeLabelKeysChecked };
        const { dataModel } = this.props;
        if (dataModel) {
            var displayedNodeLabels = this.getFilteredNodeLabels(this.getNodeLabelArray(dataModel))
            if (selectAllNodeLabels) {
                // it's currently checked, and it's being unchecked
                displayedNodeLabels.map(nodeLabel => {
                    delete newNodeLabelKeysChecked[nodeLabel.key]
                    this.removeNodeHighlightInGraph(nodeLabel);
                });
            } else {
                // it's currently unchecked, and it's being checked
                displayedNodeLabels.map(nodeLabel => {
                    newNodeLabelKeysChecked[nodeLabel.key] = true
                    this.highlightNodeInGraph(nodeLabel);
                });
            }
        }
        this.setState({ 
            selectAllNodeLabels: !selectAllNodeLabels,
            nodeLabelKeysChecked: newNodeLabelKeysChecked
        })
    }

    selectAllRelationshipTypesChangeHandler = (e) => {
        const { selectAllRelationshipTypes } = this.state;

        var newRelationshipTypeKeysChecked = { ...this.state.relationshipTypeKeysChecked };
        const { dataModel } = this.props;
        if (dataModel) {
            var relationshipTypesWithDisplayLabels = this.getRelationshipTypesWithDisplayLabels(dataModel.getRelationshipTypeArray());
            relationshipTypesWithDisplayLabels = this.getFilteredRelationshipTypesWithDisplayLabels(relationshipTypesWithDisplayLabels);
            if (selectAllRelationshipTypes) {
                // it's currently checked, and it's being unchecked
                relationshipTypesWithDisplayLabels.map(relationshipTypeWithDisplayLabel => {
                    delete newRelationshipTypeKeysChecked[relationshipTypeWithDisplayLabel.relationshipType.key];
                    this.removeRelHighlightInGraph(relationshipTypeWithDisplayLabel.relationshipType);
                });
            } else {
                // it's currently unchecked, and it's being checked
                relationshipTypesWithDisplayLabels.map(relationshipTypeWithDisplayLabel => {
                    newRelationshipTypeKeysChecked[relationshipTypeWithDisplayLabel.relationshipType.key] = true
                    this.highlightRelInGraph(relationshipTypeWithDisplayLabel.relationshipType);
                });
            }
        }

        this.setState({ 
            selectAllRelationshipTypes: !selectAllRelationshipTypes,
            relationshipTypeKeysChecked: newRelationshipTypeKeysChecked
        })
    }

    highlightNodeInGraph = (nodeLabel) => {
        const { parentContainer } = this.props;
        const dataModelCanvas = parentContainer.getDataModelCanvas();
        if (dataModelCanvas) {
            dataModelCanvas.addNodeHighlightAlt(nodeLabel);
        }
    }

    removeNodeHighlightInGraph = (nodeLabel) => {
        const { parentContainer } = this.props;
        const dataModelCanvas = parentContainer.getDataModelCanvas();
        if (dataModelCanvas) {
            dataModelCanvas.removeNodeHighlightAlt(nodeLabel);
        }
    }

    highlightRelInGraph = (relationshipType) => {
        const { parentContainer } = this.props;
        const dataModelCanvas = parentContainer.getDataModelCanvas();
        if (dataModelCanvas) {
            dataModelCanvas.addRelHighlightAlt(relationshipType);
        }
    }

    removeRelHighlightInGraph = (relationshipType) => {
        const { parentContainer } = this.props;
        const dataModelCanvas = parentContainer.getDataModelCanvas();
        if (dataModelCanvas) {
            dataModelCanvas.removeRelHighlightAlt(relationshipType);
        }
    }

    selectNodeLabelHandler = (nodeLabel) => (e) => {
        var newNodeLabelKeysChecked = { ...this.state.nodeLabelKeysChecked }
        if (newNodeLabelKeysChecked[nodeLabel.key]) {
            delete newNodeLabelKeysChecked[nodeLabel.key];
            this.removeNodeHighlightInGraph(nodeLabel);
        } else {
            newNodeLabelKeysChecked[nodeLabel.key] = true;
            this.highlightNodeInGraph(nodeLabel);
        }
        this.setState({
            nodeLabelKeysChecked: newNodeLabelKeysChecked
        })
    }

    selectRelationshipTypeHandler = (relationshipType) => (e) => {
        var newRelationshipTypeKeysChecked = { ...this.state.relationshipTypeKeysChecked }
        if (newRelationshipTypeKeysChecked[relationshipType.key]) {
            delete newRelationshipTypeKeysChecked[relationshipType.key];
            this.removeRelHighlightInGraph(relationshipType);
        } else {
            newRelationshipTypeKeysChecked[relationshipType.key] = true;
            this.highlightRelInGraph(relationshipType);
        }
        this.setState({
            relationshipTypeKeysChecked: newRelationshipTypeKeysChecked
        })
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

    getNodeLabelArray = (dataModel) => 
        dataModel.getNodeLabelArray().filter(nodeLabel => !nodeLabel.isOnlySecondaryNodeLabel);

    reset = () => {
        this.setState({
            parallelRelationships: true,            
            sourceNeo4jDatabaseConnection: {},
            destNeo4jDatabaseConnection: {},
            selectAllNodeLabels: false,
            selectAllRelationshipTypes: false,
            nodeLabelKeysChecked: {},
            relationshipTypeKeysChecked: {},
            filterInput: ''
        })
    }

    clearSelections = () => {
        const { dataModel, parentContainer } = this.props;
        const { nodeLabelKeysChecked, relationshipTypeKeysChecked } = this.state;

        const dataModelCanvas = parentContainer.getDataModelCanvas();
        if (dataModelCanvas) {
            this.getNodeLabelArray(dataModel)   
                .filter(x => nodeLabelKeysChecked[x.key])
                .map(x => dataModelCanvas.removeNodeHighlightAlt(x))

            dataModel.getRelationshipTypeArray()
                .filter(x => relationshipTypeKeysChecked[x.key])
                .map(x => dataModelCanvas.removeRelHighlightAlt(x))
        }

        this.setState({
            selectAllNodeLabels: false,
            selectAllRelationshipTypes: false,
            nodeLabelKeysChecked: {},
            relationshipTypeKeysChecked: {},
            filterInput: ''
        });
    }

    getFilteredNodeLabels = (nodeLabels) => {
        const { filterInput } = this.state;
        if (filterInput) {
            const filterRegex = new RegExp(filterInput, 'i');
            return nodeLabels.filter(x => x.label.match(filterRegex));
        } else {
            return nodeLabels;
        }
    }

    getFilteredRelationshipTypesWithDisplayLabels = (relationshipTypesWithDisplayLabels) => {
        const { filterInput } = this.state;
        if (filterInput) {
            const filterRegex = new RegExp(filterInput, 'i');
            return relationshipTypesWithDisplayLabels.filter(x => x.displayLabel.match(filterRegex));
        } else {
            return relationshipTypesWithDisplayLabels;
        }
    }

    getRelationshipTypesWithDisplayLabels = (relationshipTypes) => {
        return relationshipTypes.map(relationshipType => {
            var relType = (relationshipType.type) ? relationshipType.type : `<${relationshipType.key}>`;
            return {
                relationshipType,
                displayLabel: `(:${relationshipType.startNodeLabel.label})-[:${relType}]->(:${relationshipType.endNodeLabel.label})`
            }
        });
    }

    setNeo4jSourceDatabase = (dbConnection) => {
        const { parentContainer } = this.props;
        this.setState({
            sourceNeo4jDatabaseConnection: dbConnection
        })
        parentContainer.viewChanged(GraphDocChangeType.ExportSettingsChanged);        
    }

    setNeo4jDestDatabase = (dbConnection) => {
        const { parentContainer } = this.props;
        this.setState({
            destNeo4jDatabaseConnection: dbConnection
        })
        parentContainer.viewChanged(GraphDocChangeType.ExportSettingsChanged);        
    }

    setParallelRelationships = (parallelRelationships) => {
        const { parentContainer } = this.props;
        this.setState({
            parallelRelationships: parallelRelationships
        });
        parentContainer.viewChanged(GraphDocChangeType.ExportSettingsChanged);        
    }

    getPipelineOptions = () => {
        const { parallelRelationships } = this.state;
        return { parallelRelationships };
    }

    getExportDataJson = async () => {
        const {
            nodeLabelKeysChecked,
            relationshipTypeKeysChecked,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection,
            sourceNeo4jDatabaseLabel,
            destNeo4jDatabaseLabel
        } = this.state;

        const {
            dataModel,
            dataModelMetadata
        } = this.props;

        const json = await getExportDataJson({
            pipelineOptions: this.getPipelineOptions(),
            nodeLabelKeysChecked,
            relationshipTypeKeysChecked,
            dataModel,
            dataModelMetadata,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection,
            sourceNeo4jDatabaseLabel,
            destNeo4jDatabaseLabel
        });
        return json;
    }

    exportData = () => {
        const {
            nodeLabelKeysChecked,
            relationshipTypeKeysChecked,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection,
            sourceNeo4jDatabaseLabel,
            destNeo4jDatabaseLabel
        } = this.state;

        const {
            dataModel,
            dataModelMetadata,
            activateTool
        } = this.props;

        exportData({
            pipelineOptions: this.getPipelineOptions(),
            nodeLabelKeysChecked,
            relationshipTypeKeysChecked,
            dataModel,
            dataModelMetadata,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection,
            sourceNeo4jDatabaseLabel,
            destNeo4jDatabaseLabel,
            activateTool
        });
    }

    reRender () {
        this.forceUpdate();
    }

    render () {
        const placeholder = 'Filter';

        const { 
            nodeLabelAccordionExpanded, 
            relationshipTypeAccordionExpanded,
            selectAllNodeLabels,
            selectAllRelationshipTypes,
            nodeLabelKeysChecked,
            relationshipTypeKeysChecked,
            filterInput,
            sourceNeo4jDatabaseConnection,
            destNeo4jDatabaseConnection,
            sourceNeo4jDatabaseLabel,
            destNeo4jDatabaseLabel,
            parallelRelationships
        } = this.state;
        var { dataModel, parentContainer } = this.props;
        var nodeLabels = [];
        var relationshipTypesWithDisplayLabels = [];

        const sourceNeo4jDatabaseName = sourceNeo4jDatabaseConnection.name || '<Select a Neo4j database>'
        const destNeo4jDatabaseName = destNeo4jDatabaseConnection.name || '<Select a Neo4j database>'

        if (dataModel) {
            nodeLabels = this.getNodeLabelArray(dataModel)
                .sort((a,b) => {
                    if (a.label === b.label) return 0;
                    if (a.label > b.label) return 1;
                    return -1;
                });
            nodeLabels = this.getFilteredNodeLabels(nodeLabels);

            relationshipTypesWithDisplayLabels = this.getRelationshipTypesWithDisplayLabels(dataModel.getRelationshipTypeArray());
            relationshipTypesWithDisplayLabels
                .sort((a,b) => {
                    if (a.displayLabel === b.displayLabel) return 0;
                    if (a.displayLabel > b.displayLabel) return 1;
                    return -1;
                });
            relationshipTypesWithDisplayLabels = this.getFilteredRelationshipTypesWithDisplayLabels(relationshipTypesWithDisplayLabels);
        }
        
        const nodeLabelAccordionKey = 'dataExportNodeLabels';
        const relationshipTypeAccordionKey = 'dataExportRelationshipTypes';
        const selectAllLabel = (filterInput) ? 'Select All (displayed)' : 'Select All';
        const selectAllWidth = (filterInput) ? '13em' : '8em';

        return (
          <>
            <SelectDatabaseField
                label={sourceNeo4jDatabaseLabel}
                labelStyle={{minWidth: '14em'}}
                selectedDatabaseText={sourceNeo4jDatabaseName}
                onClick={() => {
                    if (this.sourceNeo4jDatabaseRef.current) {
                        this.sourceNeo4jDatabaseRef.current.showDialog();
                    }
                    else {
                        alert('Error showing database dialog, ref is not current');
                    }
                }}
            />
            <SelectDatabaseField
                label={destNeo4jDatabaseLabel}
                labelStyle={{minWidth: '14em'}}         
                selectedDatabaseText={destNeo4jDatabaseName}
                onClick={() => {
                    if (this.destNeo4jDatabaseRef.current) {
                        this.destNeo4jDatabaseRef.current.showDialog();
                    } else {
                        alert('Error showing database dialog, ref is not current');
                    }
                }}
            />
            <div style={{ paddingBottom: "5px", display: 'flex', flexFlow: 'row' }}>
                <div style={{display:'flex', flexFlow: 'row', marginTop: '-.9em', 
                    marginRight: '.5em'
                }}>
                    <TextField id="filter" label="Filter" autoComplete="off"
                        value={filterInput} onChange={this.setValue} 
                        placeholder={placeholder} 
                        title={placeholder}
                        margin="dense" style={{marginLeft: '1em', width: '200px'}}/>
                    <div style={{color:'#aaa', marginTop: '1.5em', cursor: 'pointer'}}>
                        <ClearIcon 
                            onClick={this.clearValue}>
                        </ClearIcon>
                    </div>
                </div>
                <OutlinedStyledButton onClick={this.exportData} color="primary"
                        style={{height:'2em'}}>
                    Export Data
                </OutlinedStyledButton>
                <PipelineOptionsButton style={{marginLeft: '-.6em', marginTop: '-.1em'}}
                  parallelRelationships={parallelRelationships} 
                  setParallelRelationships={this.setParallelRelationships}
                />
                <OutlinedStyledButton onClick={this.clearSelections} color="primary"
                        style={{height:'2em'}}>
                    Clear
                </OutlinedStyledButton>
            </div>
            <div style={{overflowY: 'scroll', maxHeight: 'calc(100vh - 250px)', 
                    border: '1px dashed lightgray', paddingLeft: '5px', paddingBottom: '.5em'}}>
                <AccordionBlockNoDrag
                    key={nodeLabelAccordionKey}
                    blockKey={nodeLabelAccordionKey}
                    domId={`dataexport_accordion_${nodeLabelAccordionKey}`}
                    expanded={nodeLabelAccordionExpanded}
                    selected={false}
                    scrollIntoView={() => {}}
                    showToggleTool={false}
                    toggleAccordionPanel={() => 
                        this.setState({ nodeLabelAccordionExpanded: !nodeLabelAccordionExpanded })
                    }
                    parentContainer={this}
                    dataProvider={{
                        getTitle: () => 'Node Labels'
                    }}
                    addMode={false}
                    rightWidthOffset={10}                
                    firstBlock={true}
                >
                    <div style={{display:'flex', flexFlow: 'column', width: '100%'}}>
                        <div style={{ display: 'flex', flexFlow: 'row', width: selectAllWidth,
                                        borderBottom: '1px dashed lightgray' 
                        }}>
                            <FormControlLabel
                                control={
                                <Checkbox
                                    checked={selectAllNodeLabels}
                                    onChange={this.selectAllNodeLabelsChangeHandler}
                                    name="selectAllNodeLabels"
                                    color="primary"
                                />
                                }
                                label={selectAllLabel}
                            />
                        </div>
                        <div>
                            {
                                nodeLabels.map((nodeLabel,index) => {
                                    return (
                                        <div key={index} style={{
                                            borderBottom: '1px solid lightgray',
                                            marginTop: '.2em'
                                        }}>
                                            <FormControlLabel
                                                control={
                                                <Checkbox
                                                    checked={nodeLabelKeysChecked[nodeLabel.key] || false}
                                                    onChange={this.selectNodeLabelHandler(nodeLabel)}
                                                    color="primary"
                                                />
                                                }
                                                label={nodeLabel.label}
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </AccordionBlockNoDrag>

                <AccordionBlockNoDrag
                    key={relationshipTypeAccordionKey}
                    blockKey={relationshipTypeAccordionKey}
                    domId={`dataexport_accordion_${relationshipTypeAccordionKey}`}
                    expanded={relationshipTypeAccordionExpanded}
                    selected={false}
                    scrollIntoView={() => {}}
                    showToggleTool={false}
                    toggleAccordionPanel={() => 
                        this.setState({ relationshipTypeAccordionExpanded: !relationshipTypeAccordionExpanded })
                    }
                    parentContainer={this}
                    dataProvider={{
                        getTitle: () => 'Relationship Types'
                    }}
                    addMode={false}
                    rightWidthOffset={10}                
                    firstBlock={true}
                >
                    <div style={{display:'flex', flexFlow: 'column', width: '100%'}}>
                        <div style={{ display: 'flex', flexFlow: 'row', width: selectAllWidth,
                                        borderBottom: '1px dashed lightgray' 
                        }}>
                            <FormControlLabel
                                control={
                                <Checkbox
                                    checked={selectAllRelationshipTypes}
                                    onChange={this.selectAllRelationshipTypesChangeHandler}
                                    name="selectAllRelationshipTypes"
                                    color="primary"
                                />
                                }
                                label={selectAllLabel}
                            />
                        </div>
                        <div>
                            {
                                relationshipTypesWithDisplayLabels.map((relationshipTypesWithDisplayLabel,index) => {
                                    return (
                                        <div key={index} style={{
                                            borderBottom: '1px solid lightgray',
                                            marginTop: '.2em'
                                        }}>
                                            <FormControlLabel
                                                control={
                                                <Checkbox
                                                    checked={relationshipTypeKeysChecked[relationshipTypesWithDisplayLabel.relationshipType.key] || false}
                                                    onChange={this.selectRelationshipTypeHandler(relationshipTypesWithDisplayLabel.relationshipType)}
                                                    color="primary"
                                                />
                                                }
                                                label={relationshipTypesWithDisplayLabel.displayLabel}
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </AccordionBlockNoDrag>
            </div>
            <SelectNeo4jDatabase       
                ref={this.sourceNeo4jDatabaseRef}
                setStatus={parentContainer.setStatus}                 
                onSelectDatabase={this.setNeo4jSourceDatabase}
            />
            <SelectNeo4jDatabase                 
                ref={this.destNeo4jDatabaseRef}       
                setStatus={parentContainer.setStatus}                 
                onSelectDatabase={this.setNeo4jDestDatabase}
            />
          </>
        )
    }
}



