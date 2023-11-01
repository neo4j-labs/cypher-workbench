import React, { Component } from 'react'
import {
    FormControl, IconButton, InputLabel,
    MenuItem, Select,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Tooltip
} from '@material-ui/core';
import { ALERT_TYPES } from '../../../common/Constants';

const NO_MAPPING = '__no_mapping__';

export const getNodePatternDescription = (nodePattern) => {
    var variable = nodePattern.variable || '';
    var nodeLabels = nodePattern.nodeLabels || [];
    nodeLabels = (nodeLabels.length > 0) ? `:${nodeLabels.join(':')}` : '';
    return `${variable}${nodeLabels}`;
}

export const getRelationshipPatternTypeDescription = (relationshipPattern) => {
    var relType = relationshipPattern.types[0] || '';
    relType = (relType) ? `:${relType}` : '';
    return relType;
}

export const getNodeRelNodePatternDescription = (nodeRelNodePattern) => {
    var start = getNodePatternDescription(nodeRelNodePattern.startNodePattern);
    var variable = nodeRelNodePattern.relationshipPattern.variable || '';
    var relType = getRelationshipPatternTypeDescription(nodeRelNodePattern.relationshipPattern);
    var end = getNodePatternDescription(nodeRelNodePattern.endNodePattern);
    var description = `(${start})-[${variable}${relType}]->(${end})`;
    return description;
}

export const getAvailableMappingDestinationDescription = (availableDestination) => {
    var description = '';
    var propName = availableDestination.propertyDefinition.name;
    if (availableDestination.nodePattern) {
        description = `${getNodePatternDescription(availableDestination.nodePattern)}.${propName}`;
    } else if (availableDestination.nodeRelNodePattern) {
        var start = getNodePatternDescription(availableDestination.nodeRelNodePattern.startNodePattern);
        var variable = availableDestination.nodeRelNodePattern.relationshipPattern.variable || '';
        var relType = getRelationshipPatternTypeDescription(availableDestination.nodeRelNodePattern.relationshipPattern);
        var end = getNodePatternDescription(availableDestination.nodeRelNodePattern.endNodePattern);
        description = `(${start})-[${variable}${relType}.${propName}]->(${end})`;
    }
    return description;
}

export default class DataSourceTableMapping extends Component {

    state = {
        headers: ['name', 'datatype'],
        availableMappingDestinations: [],
        dataMappingKeysMap: {}
    }

    componentDidMount = () => {
        var { getAvailableMappingDestinations } = this.props;
        this.setState({
            availableMappingDestinations: getAvailableMappingDestinations()
        });
    }

    reloadSavedMappings = () => {
        var { dataProvider } = this.props;
        var reloadedMap = dataProvider.getDataMappingKeysMap();
        var mapToSet = {};
        Object.keys(reloadedMap).map(key => {
            const { availableDestinationKey } = reloadedMap[key];
            mapToSet[key] = availableDestinationKey;
        });
        this.setState({
            dataMappingKeysMap: mapToSet
        });
    }    

    mapField = (event, columnDefinition) => {
        var { dataProvider } = this.props;
        var columnSourceKey;

        const availableDestinationKey = event.target.value;
        if (availableDestinationKey === NO_MAPPING) {
            var newMap = { ...this.state.dataMappingKeysMap }
            columnSourceKey = dataProvider.getColumnSourceKey({columnDefinition});
            delete newMap[columnSourceKey];
            this.setState({ 
                dataMappingKeysMap: newMap
            });
            dataProvider.removeDataMapping(columnSourceKey);
        } else {
            var { 
                dataMapping,
                dataMappingKey, 
                columnSourceKey
            } = dataProvider.getDataMapping({
                availableMappingDestinationKey: availableDestinationKey,
                columnDefinition
            });
    
            if (dataMapping && dataMappingKey && columnSourceKey) {
                //console.log('dataMapping: ', dataMapping);
                dataProvider.addDataMapping(dataMapping, {
                    dataMappingKey: dataMappingKey,
                    columnSourceKey: columnSourceKey,
                    columnDefinitionKey: columnDefinition.key,
                    availableDestinationKey: availableDestinationKey
                });
    
                this.setState({ 
                    dataMappingKeysMap: {
                        ...this.state.dataMappingKeysMap,
                        [columnSourceKey]: availableDestinationKey
                    }
                });
            } else {
                alert('Could not map field', ALERT_TYPES.WARNING);
            }
        }
    }

    titleCase = (str) => (str && str.length >= 1) ? str.substring(0, 1).toUpperCase() + str.substring(1) : '';

    setAvailableMappingDestinations = (availableMappingDestinations) => {
        // in this case we are actually getting these mappingDestinations from somewhere else
        //  but we need to refresh them, so we will forceUpdate
        this.setState({
            availableMappingDestinations
        })
    }

    setDataMappingKeysMap = (dataMappingKeysMap) => {
        this.setState({
            dataMappingKeysMap
        });
    }

    render () {

        const { headers } = this.state;
        var { tableDefinition, getTableCatalog, dataProvider } = this.props;
        var { availableMappingDestinations, dataMappingKeysMap } = this.state;
        
        const tableCatalog = getTableCatalog();

        availableMappingDestinations = availableMappingDestinations
            .map(x => ({
                key: x.key,
                description: getAvailableMappingDestinationDescription(x)
            }))
            .sort((a, b) => {
                const aStartsWithNonLetter = a.description.match(/^\W/);
                const bStartsWithNonLetter = b.description.match(/^\W/);
                if (a.description === b.description) {
                    return 0;
                } else if (a.description < b.description) {
                    if (aStartsWithNonLetter && !bStartsWithNonLetter) {
                        // a starts with a ( or something, sort it later
                        return 1;
                    } else {
                        // normal
                        return -1;
                    }
                } else {
                    if (!aStartsWithNonLetter && bStartsWithNonLetter) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            });

        const columnDefinitions = tableDefinition.columnDefinitions;

        return (
            <div style={{ width: '100%' }}>
            {(headers.length !== 0) ?
                <div style={{
                    marginTop: '.5em',
                    //height: tableHeight, 
                    //overflowX: 'scroll',
                    //overflowY: 'scroll'
                }}>
                    <TableContainer style={{ /* maxHeight: 350 */ }}>
                        <Table stickyHeader aria-label="sticky table">
                            {
                                <TableHead>
                                    <TableRow>
                                        {headers.map((header, index) =>
                                            <TableCell key={index} style={{ paddingTop: '8px', paddingBottom: '8px' }}>{this.titleCase(header)}</TableCell>
                                        )}
                                        <TableCell style={{ paddingTop: '8px', paddingBottom: '8px' }}>Mapping</TableCell>
                                    </TableRow>
                                </TableHead>
                            }
                            <TableBody>
                                {columnDefinitions.map((columnDefinition, index) => {
                                    const columnSourceKey = dataProvider.getColumnSourceKey({tableCatalog, tableDefinition, columnDefinition});
                                    //console.log('columnSourceKey: ', columnSourceKey);
                                    //console.log('dataMappingKeysMap: ', dataMappingKeysMap);
                                    var selectedValue = dataMappingKeysMap[columnSourceKey] || '';
                                    //console.log('re-render selectedValue: ', selectedValue);
                                    //var selectedAvailableMappingDestination = availableMappingDestinations.find(x => x.key === selectedValue);
                                    //const selectedAvailableMappingDestinationDescription = (selectedAvailableMappingDestination) ? selectedAvailableMappingDestination.description : '';

                                    return (
                                        <TableRow key={index} hover={true}>
                                            {headers.map(header => {
                                                var value = columnDefinition[header];
                                                return (
                                                    <TableCell style={{ cursor: 'pointer' }} key={header}>
                                                        {value}
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell >
                                                {/*<Tooltip enterDelay={600} title={selectedAvailableMappingDestinationDescription}> */}
                                                <Select
                                                    value={selectedValue}
                                                    onChange={(e) => this.mapField(e, columnDefinition)}
                                                    //onBlur={this.savePropertyDefinition}
                                                    style={{ width: '23em', height: '2em', marginRight: '.5em' }}
                                                >
                                                    {availableMappingDestinations.map((availableMappingDestination) =>
                                                        <MenuItem key={availableMappingDestination.key} value={availableMappingDestination.key}>{availableMappingDestination.description}</MenuItem>
                                                    )}
                                                    <MenuItem key={NO_MAPPING} value={NO_MAPPING}>&lt;No Mapping&gt;</MenuItem>
                                                </Select>
                                                {/*</Tooltip>*/}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>
                :
                <div style={{ padding: '10px' }}>

                </div>
            }
        </div>
        )
    }
}