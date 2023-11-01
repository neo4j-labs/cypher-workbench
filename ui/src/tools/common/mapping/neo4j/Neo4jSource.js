import React, { Component } from 'react'
import { Tooltip } from '@material-ui/core';

import AddIcon from '@material-ui/icons/Add';

import { ALERT_TYPES } from '../../../../common/Constants';
import { TableDefinition, ColumnDefinition } from '../../../../dataModel/dataSource/generalDataSource';

import { OutlinedStyledButton } from '../../../../components/common/Components';
import SecurityRole, { SecurityMessages } from '../../SecurityRole';
import SelectNeo4jDatabase, { SelectDatabaseField } from '../../database/SelectNeo4jDatabase';
import SelectCypherStatement, { SelectCypherStatementField, getCypherStatementKey } from '../../cypher/SelectCypherStatement';
import { getCypherQueryInfo } from "../../cypher/processCypher";

export default class Neo4jSource extends Component {

    state = {
        neo4jDatabaseConnection: {},
        neo4jDatabaseLabel: 'Neo4j Database',
        cypherStatement: {},
        cypherStatementLabel: 'Cypher Statement'
    }

    constructor (props) {
        super(props);
        this.neo4jDatabaseRef = React.createRef();
        this.cypherStatementRef = React.createRef();
    }

    reset = () => {
        this.setState({
            neo4jDatabaseConnection: {},
            neo4jDatabaseLabel: 'Neo4j Database',
            cypherStatement: {},
            cypherStatementLabel: 'Cypher Statement'
        });
    }

    getNeo4jDatabaseConnection = () => {
        return this.state.neo4jDatabaseConnection;
    }
    
    getNeo4jDatabaseLabel = () => {
        return this.state.neo4jDatabaseLabel;
    }

    convertCypherToTableDefinition = (cypherStatement) => {
        const queryInfo = getCypherQueryInfo(cypherStatement.cypher);
        if (!queryInfo) {
            return null;
        };
        
        var { outputFields, cypher } = queryInfo;
        cypher = cypher || '';
        cypher = cypher.replace(/\n/g, ' ');

        var columnDefinitions = outputFields.map((x,i) => {
            return new ColumnDefinition({
                key: x.name,
                name: x.name,
                datatype: x.type, 
                ordinalPosition: (i+1)
            });
        });

        var tableDefinition = new TableDefinition({
            key: getCypherStatementKey(cypherStatement),
            name: cypherStatement.title,
            columnDefinitions,
            metadata: {
                originalCypher: cypherStatement.cypher,
                rewrittenCypher: cypher
            }
        });
        return tableDefinition;
    }    

    addInputTable = () => {
        const { cypherStatement } = this.state;
        var { addDataSourceTableBlock } = this.props;
        //console.log('addInputTable clicked at: ' + new Date().toLocaleTimeString());
        if (!cypherStatement.cypher) {
            alert('You need to select a Cypher Statement first', ALERT_TYPES.WARNING);
        }

        var tableDefinition = this.convertCypherToTableDefinition(cypherStatement);
        if (tableDefinition && tableDefinition.columnDefinitions && tableDefinition.columnDefinitions.length > 0) {
            addDataSourceTableBlock({
                tableDefinition: tableDefinition,
                position: 'end'
            });        
        } else {
            alert('Ensure that your Cypher Statement has a RETURN clause and returns properties', ALERT_TYPES.WARNING);
        }
    }
    
    updateStateFromDataProvider = () => {
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();
        this.setState({
            neo4jDatabaseConnection: dataProvider.getNeo4jSourceDatabase() || {},
            cypherStatement: dataProvider.getCypherStatement() || {}
        }, () => {
            //this.refreshDatasetSchema(datasetId);        
        });
    }

    setNeo4jDatabase = (dbConnection) => {
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();
        this.setState({
            neo4jDatabaseConnection: dbConnection
        });
        getDataProvider().setNeo4jSourceDatabase(dbConnection);
    }

    setCypherStatement = (cypherStatement) => {
        const { getDataProvider } = this.props;
        const dataProvider = getDataProvider();
        this.setState({
            cypherStatement: cypherStatement
        });
        dataProvider.setCypherStatement(cypherStatement);
    }

    render () {
        var {
            neo4jDatabaseConnection,
            neo4jDatabaseLabel,
            cypherStatementLabel,
            cypherStatement
        } = this.state;

        const { 
            parentContainer,
            persistenceHelper,
            communicationHelper
        } = this.props;

        const neo4jDatabaseName = neo4jDatabaseConnection.name || '<Select a Neo4j database>'
        const selectedCypherStatementTitle = cypherStatement.title || '<Select a Cypher statement>'

        return (
            <>
                <div style={{ marginTop: '.4em', marginBottom: '.2em' }}>
                    <SelectDatabaseField
                        label={neo4jDatabaseLabel}
                        labelStyle={{minWidth: '10em'}}
                        selectedDatabaseText={neo4jDatabaseName}
                        onClick={() => {
                            if (this.neo4jDatabaseRef.current) {
                                this.neo4jDatabaseRef.current.showDialog();
                            }
                            else {
                                alert('Error showing database dialog, ref is not current');
                            }
                        }}
                    />
                    <div style={{display:'flex', flexFlow: 'row'}}>
                        <SelectCypherStatementField
                            label={cypherStatementLabel}
                            labelWidth={'10em'}
                            titleMaxStyle={'22em'}
                            selectedCypherStatementTitle={selectedCypherStatementTitle}
                            onClick={() => {
                                if (this.cypherStatementRef.current) {
                                    this.cypherStatementRef.current.showDialog();
                                }
                                else {
                                    alert('Error showing cypher dialog, ref is not current');
                                }
                            }}
                        />
                        <Tooltip enterDelay={600} arrow title={`Add Table`}>
                            <OutlinedStyledButton 
                                onClick={this.addInputTable} style={{ marginLeft: '1em', height: '2em', padding: '2px', minWidth: '0px' }}>
                                <AddIcon/>
                            </OutlinedStyledButton>
                        </Tooltip>
                    </div>
                </div>
                    
                <SelectNeo4jDatabase       
                    ref={this.neo4jDatabaseRef}
                    setStatus={parentContainer.setStatus}                 
                    onSelectDatabase={this.setNeo4jDatabase}
                />
                <SelectCypherStatement
                    ref={this.cypherStatementRef}
                    setStatus={parentContainer.setStatus}                 
                    persistenceHelper={persistenceHelper}
                    communicationHelper={communicationHelper}
                    onSelectCypherStatement={this.setCypherStatement}
                />
            </>
        )
    }
}