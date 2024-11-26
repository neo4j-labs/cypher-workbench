import React, { Component } from 'react'
import {
    FormControl, InputLabel, MenuItem, Select, TextField, Tooltip
} from '@material-ui/core';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import CachedIcon from '@material-ui/icons/Cached';
import AddIcon from '@material-ui/icons/Add';

import { ALERT_TYPES } from '../../../../common/Constants';

import { OutlinedStyledButton } from '../../../../components/common/Components';
import {
    getDatasets,
    getDatasetSchema,
} from '../../../../persistence/graphql/GraphQLDataTransfer';
import SecurityRole, { SecurityMessages } from '../../SecurityRole';
import { getTableCatalogFromDatasetSchemaResponse } from './BigQueryUtil';

export default class BigQuerySource extends Component {

    state = {
        tableCatalog: {},
        selectedTableKey: '',
        datasets: [],
        projectId: '',
        datasetId: '',
        projectIdPlaceholder: 'Enter a Project Id',
        minHeight: 0
    }

    reset = () => {
        this.setState({
            tableCatalog: {},
            selectedTableKey: '',
            datasets: [],
            projectId: '',
            datasetId: '',
            projectIdPlaceholder: 'Enter a Project Id',
            minHeight: 0
        });
    }

    addInputTable = () => {
        var { addDataSourceTableBlock } = this.props;
        console.log('addInputTable clicked at: ' + new Date().toLocaleTimeString());
        var selectedTableDefinition = this.getSelectedTableDefinition();
        if (!selectedTableDefinition) {
            alert('You need to select a table first', ALERT_TYPES.WARNING);
        }
        addDataSourceTableBlock({
            tableDefinition: selectedTableDefinition,
            position: 'end'
        });        
    }

    /*
    setTableCatalog = (catalog) => {
        this.setState({
            tableCatalog: catalog
        })
    }
    */

    setSelectedTableKey = (e) => {
        //if (SecurityRole.canEdit()) {
            var { getDataProvider } = this.props;            
            const value = e.target.value;
            if (this.state.selectedTableKey !== value) {
                this.setState({
                    selectedTableKey: value
                });
                getDataProvider().setSelectedTableKey(value);
                //getDataProvider().setTableDefinition(this.getSelectedTableDefinition(value));
            }
        //}
    }

    refreshDatasets = () => {
        const { projectId, datasetId } = this.state;
        const { getDataProvider } = this.props;
        if (projectId) {
            getDatasets(projectId, (results) => {
                const { success, data, error } = results;
                if (success) {
                    var datasets = data.map(x => x.schema_name);
                    var stateObj = { datasets }
                    if (datasets.length > 0 && datasetId === '') {
                        stateObj.datasetId = datasets[0];
                        this.refreshDatasetSchema(datasets[0]);
                        getDataProvider().setDatasetId(datasets[0]);
                    }
                    this.setState(stateObj);
                    getDataProvider().setDatasets(datasets);
                } else {
                    alert(`Error getting datasets: ${error}`);
                }
            });
        } else {
            alert('Project Id cannot be blank', ALERT_TYPES.WARNING);
        }
    }

    refreshDatasetSchema = (datasetId) => {
        const { projectId } = this.state;
        const { getDataProvider } = this.props;
        if (datasetId) {
            getDatasetSchema(projectId, datasetId, (results) => {
                const { success, data, error } = results;
                if (success) {
                    // get tableCatalog from data
                    var tableCatalog = getTableCatalogFromDatasetSchemaResponse(data, datasetId);
                    this.setState({
                        tableCatalog: tableCatalog
                    });
                    getDataProvider().setTableCatalog(tableCatalog);
                } else {
                    alert(`Error getting datasetSchema: ${error}`);
                }
            });
        }
    }   
    
    updateStateFromDataProvider = () => {
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();
        //alert('setting projectId to:' + dataProvider.getProjectId(), ALERT_TYPES.WARNING);
        const datasetId = dataProvider.getDatasetId();
        this.setState({
            projectId: dataProvider.getProjectId(),
            datasetId: datasetId || '',
            datasets: dataProvider.getDatasets(),
            tableCatalog: dataProvider.getTableCatalog(),
            selectedTableKey: dataProvider.getSelectedTableKey() || '',
        }, () => {
            //this.refreshDatasetSchema(datasetId);        
        });
    }

    refreshSchema = () => {
        const { datasetId } = this.state;
        this.refreshDatasetSchema(datasetId);
    }

    setDatasetId = (e) => {
        if (SecurityRole.canEdit()) {
            const { getDataProvider } = this.props;
            const newDatasetId = e.target.value;
            if (this.state.datasetId !== newDatasetId) {
                this.setState({
                    datasetId: newDatasetId
                });
            }
            this.refreshDatasetSchema(newDatasetId);
            getDataProvider().setDatasetId(newDatasetId);
        }
    }    

    setProjectId = (e) => {
        if (SecurityRole.canEdit()) {
            const { getDataProvider } = this.props;
            const newProjectId = e.target.value;
            if (this.state.projectId !== newProjectId) {
                this.setState({
                    projectId: newProjectId
                });
                getDataProvider().setProjectId(newProjectId);
            }
        }
    }    

    getSelectedTableDefinition = (selectedTableKey) => {
        if (!selectedTableKey) {
            selectedTableKey = this.state.selectedTableKey;
        }
        var { tableCatalog } = this.state;
        var tableDefinitions = (tableCatalog && tableCatalog.tableDefinitions) ? tableCatalog.tableDefinitions : [];
        var selectedTableDefinition = tableDefinitions.find(x => x.key === selectedTableKey);
        return selectedTableDefinition;
    }    

    render () {
        var {
            tableCatalog, selectedTableKey, 
            datasetId, datasets,
            projectId, projectIdPlaceholder
        } = this.state;

        const sortedDatasets = datasets.slice().sort();
        //console.log(sortedDatasets);

        var tableDefinitions = (tableCatalog && tableCatalog.tableDefinitions) ? tableCatalog.tableDefinitions : [];
        const sortedTableDefinitions = tableDefinitions.slice().sort((a,b) => {
            if (a.name === b.name) return 0;
            if (a.name < b.name) return -1;
            return 1;
        });

        return (
            <>
                <div style={{ height: '2em', marginTop: '.4em', marginBottom: '.2em' }}>
                    <TextField name='projectId' id="projectId" label="Project Id" autoComplete="off"
                        value={projectId} onChange={this.setProjectId}
                        placeholder={projectIdPlaceholder} title={projectIdPlaceholder}
                        margin="dense" style={{
                            marginRight: '.5em', width: '20em',
                            height: '2em', marginTop: '-.5em'
                        }} />

                    <Tooltip enterDelay={600} arrow title={`Refresh Datasets`}>
                        <OutlinedStyledButton onClick={this.refreshDatasets} style={{ height: '2em', padding: '2px', minWidth: '0px' }}>
                            <KeyboardArrowRightIcon/>
                        </OutlinedStyledButton>
                    </Tooltip>
                </div>
                <FormControl variant="outlined" style={{ marginTop: '.575em' }}>
                    <InputLabel htmlFor="selectedDataset-label" style={{ transform: 'translate(3px, 3px) scale(0.75)' }}>
                        Select a Dataset
                    </InputLabel>
                    <Select
                        value={datasetId}
                        onChange={this.setDatasetId}
                        //onBlur={this.savePropertyDefinition}
                        id="selectedDataset"
                        inputProps={{
                            name: 'selectedDataset',
                            id: 'selectedDataset-label',
                        }}
                        style={{ width: '13em', height: '3em', marginRight: '.5em' }}
                    >
                        {sortedDatasets.map(dataset =>
                            <MenuItem key={dataset} value={dataset}>{dataset}</MenuItem>
                        )}
                    </Select>
                </FormControl>

                <Tooltip enterDelay={600} arrow title={`Refresh Dataset Schema`}>
                    <OutlinedStyledButton onClick={this.refreshSchema} style={{ marginTop: '1.3em', height: '2em', padding: '2px', minWidth: '0px' }}>
                        <CachedIcon/>
                    </OutlinedStyledButton>
                </Tooltip>
                <FormControl variant="outlined" style={{ marginLeft: '.3em', marginTop: '.575em' }}>
                    <InputLabel htmlFor="selectedTable-label" style={{ transform: 'translate(3px, 3px) scale(0.75)' }}>
                        Select a Table
                </InputLabel>
                    <Select
                        value={selectedTableKey}
                        onChange={this.setSelectedTableKey}
                        //onBlur={this.savePropertyDefinition}
                        id="selectedTable"
                        inputProps={{
                            name: 'selectedTable',
                            id: 'selectedTable-label',
                        }}
                        style={{ width: '13em', height: '3em', marginRight: '.5em' }}
                    >
                        {sortedTableDefinitions.map((tableDef) =>
                            <MenuItem key={tableDef.key} value={tableDef.key}>{tableDef.name}</MenuItem>
                        )}
                    </Select>
                </FormControl>
                <Tooltip enterDelay={600} arrow title={`Add Table`}>
                    <OutlinedStyledButton 
                        onClick={this.addInputTable} style={{ marginTop: '1.3em', height: '2em', padding: '2px', minWidth: '0px' }}>
                        <AddIcon/>
                    </OutlinedStyledButton>
                </Tooltip>
            </>
        )
    }
}