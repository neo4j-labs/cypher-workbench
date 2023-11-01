import React, { Component } from 'react'
import {
    FormControl, InputLabel,
    MenuItem, Select, TextField, Tooltip
} from '@material-ui/core';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import CachedIcon from '@material-ui/icons/Cached';
import { ALERT_TYPES } from '../../../../common/Constants';

import {
    getDatasets,
    getDatasetSchema,
} from '../../../../persistence/graphql/GraphQLDataTransfer'

import { getTableCatalogFromDatasetSchemaResponse } from './BigQueryUtil';
import { OutlinedStyledButton } from '../../../../components/common/Components';
import ComboBox from '../../../../components/common/ComboBox';

const DEFAULT_PROJECT_ID_KEY = "bigQueryDefaultProjectId";
const DEFAULT_DATASET_ID_KEY = "bigQueryDefaultDatasetId";

export default class BigQueryDestination extends Component {

    emptyComboValue = {name: ''};

    state = {
        tableCatalog: {},
        tableName: this.emptyComboValue,
        datasets: [],
        projectId: localStorage.getItem(DEFAULT_PROJECT_ID_KEY) || '',
        datasetId: localStorage.getItem(DEFAULT_DATASET_ID_KEY) || '',
        projectIdPlaceholder: 'Enter a Project Id'
    }

    constructor(props) {
        super(props)
        
        var { defaultProjectId, defaultDatasetId } = props;
        if (!defaultProjectId) {
            defaultProjectId = localStorage.getItem(DEFAULT_PROJECT_ID_KEY) || '';
        }

        if (!defaultDatasetId) {
            defaultDatasetId = localStorage.getItem(DEFAULT_DATASET_ID_KEY) || '';
        }

        var updateDesinationInfo = false;
        if (defaultProjectId) {
            this.state.projectId = defaultProjectId;
            updateDesinationInfo = true;
            this.refreshDatasets(defaultProjectId, defaultDatasetId);
        }
        if (defaultProjectId && defaultDatasetId) {
            this.state.datasetId = defaultDatasetId;
            updateDesinationInfo = true;
            this.refreshDatasetSchema({projectId: defaultProjectId, datasetId: defaultDatasetId});
        }
        if (updateDesinationInfo) {
            this.updateDesinationInfo();
        }
    }

    setProjectId = (e) => {
        const newProjectId = e.target.value;
        if (this.state.projectId !== newProjectId) {
            localStorage.setItem(DEFAULT_PROJECT_ID_KEY, newProjectId);            
            this.setState({
                projectId: newProjectId
            }, () => this.updateDesinationInfo());
        }
    }

    setDatasetId = (e) => {
        const newDatasetId = e.target.value;
        if (this.state.datasetId !== newDatasetId) {
            localStorage.setItem(DEFAULT_DATASET_ID_KEY, newDatasetId);            
            this.setState({
                datasetId: newDatasetId
            }, () => this.updateDesinationInfo());
        }
        this.refreshDatasetSchema({datasetId: newDatasetId});
    }

    refreshDatasets = (projectId, datasetId) => {
        if (!projectId || typeof(projectId) !== 'string') {
            projectId = this.state.projectId || '';
        }
        if (!datasetId || typeof(datasetId) !== 'string') {
            datasetId = this.state.datasetId || '';
        }
        if (projectId) {
            getDatasets(projectId, (results) => {
                const { success, data, error } = results;
                if (success) {
                    const datasets = data.map(x => x.schema_name);
                    var stateObj = { datasets }
                    if (datasets.length > 0 && datasetId === '') {
                        stateObj.datasetId = datasets[0];
                        this.refreshDatasetSchema({projectId, datasetId: datasets[0]});
                    }
                    this.setState(stateObj);
                } else {
                    alert(`Error getting datasets: ${error}`);
                }
            });
        } else {
            alert('Project Id cannot be blank', ALERT_TYPES.WARNING);
        }
    }

    refreshDatasetSchema = ({projectId, datasetId}) => {
        if (!projectId) {
            projectId = this.state.projectId;
        }
        if (datasetId) {
            getDatasetSchema(projectId, datasetId, (results) => {
                const { success, data, error } = results;
                if (success) {
                    // get tableCatalog from data
                    var tableCatalog = getTableCatalogFromDatasetSchemaResponse(data, datasetId);
                    this.setState({
                        tableCatalog: tableCatalog
                    });
                } else {
                    alert(`Error getting datasetSchema: ${error}`);
                }
            });
        }
    }

    searchForTables = (searchText, callback) => {
        /* matchingTables expected format
            [{name: ''}, {name: ''}, ...]
        */
        const { tableCatalog } = this.state;
        if (tableCatalog && tableCatalog.tableDefinitions) {
            var matchingTables = tableCatalog.tableDefinitions;
            if (searchText) {
                const searchRegEx = new RegExp(searchText, 'i');
                matchingTables = matchingTables
                    .filter(tableDef => tableDef.name.match(searchRegEx))
                    
            } 
            matchingTables = matchingTables.map(tableDef => ({name: tableDef.name}));
        }
            
        callback({ success: true, data: matchingTables });
    }

    setTableName = (value) => {
        if (!value) {
            return;
        }
        //console.log(`setTableName: ${JSON.stringify(value)}`);

        var data = undefined;
        if (typeof(value) === 'string') {
            data = {
                name: value
            }
        } else {
            data = value;
        }
        this.setState({
            tableName: data
        }, () => this.updateDesinationInfo())
    }

    updateDesinationInfo = () => {
        const { parentContainer } = this.props;
        const { projectId, datasetId, tableName } = this.state;
        const tableNameString = (tableName && tableName.name) ? tableName.name : '';

        parentContainer.setDestinationInfo({
            projectId,
            datasetId,
            tableName: tableNameString
        });
    }

    showDatabases = () => {
        const { parentContainer } = this.props;
        if (parentContainer.showLoadNeo4jDatabase) {
            parentContainer.showLoadNeo4jDatabase();
        } else {
            alert("Parent container has not implemented method 'showLoadNeo4jDatabase'", ALERT_TYPES.WARNING);
        }
    }

    render() {
        var {
            tableName, tableCatalog,
            datasetId, datasets,
            projectId, projectIdPlaceholder
        } = this.state;

        var tableDefinitions = (tableCatalog && tableCatalog.tableDefinitions) ? tableCatalog.tableDefinitions : [];

        return (
            <>
                <div style={{ padding: '3px' }}>
                    <div style={{ height: '2em', marginTop: '.4em', marginBottom: '1.5em' }}>
                        <TextField name='neo4jDatabase' id="neo4jDatabase" label="Select a database" 
                            autoComplete="off"
                            value={this.props.selectedNeo4jDatabaseText}
                            onClick={this.showDatabases}                        
                            placeholder={'<Select a database>'} 
                            title={'<Select a database>'}
                            margin="dense" 
                            style={{
                                marginRight: '.5em', width: '40em',
                                height: '2em', marginTop: '-1.2em',
                                cursor: 'pointer'
                            }} 
                            inputProps={
                                { readOnly: true,
                                  style: {cursor: 'pointer'}
                                }
                            }                            
                        />
                    </div>
                    <div style={{ height: '2em', marginTop: '.4em', marginBottom: '1.5em' }}>
                        <TextField name='projectId' id="projectId" label="Project Id" autoComplete="off"
                            value={projectId} onChange={this.setProjectId}
                            placeholder={projectIdPlaceholder} title={projectIdPlaceholder}
                            margin="dense" style={{
                                marginRight: '.5em', width: '40em',
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
                            id="selectedDataset"
                            inputProps={{
                                name: 'selectedDataset',
                                id: 'selectedDataset-label',
                            }}
                            style={{ width: '35em', height: '3em', marginRight: '.5em' }}
                        >
                            {datasets.map(dataset =>
                                <MenuItem key={dataset} value={dataset}>{dataset}</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    <Tooltip enterDelay={600} arrow title={`Refresh Dataset Schema`}>
                        <OutlinedStyledButton onClick={this.refreshSchema} style={{ marginTop: '1.3em', height: '2em', padding: '2px', minWidth: '0px' }}>
                            <CachedIcon/>
                        </OutlinedStyledButton>
                    </Tooltip>
                    <ComboBox search={this.searchForTables} label={"Table Name"} 
                        style={{
                            marginTop: '.3em',
                            width: '40em'
                        }}
                        freeSolo={true}
                        displayProp={'name'} 
                        value={tableName}
                        setValue={this.setTableName} />
                </div>
            </>
        )
    }
}
