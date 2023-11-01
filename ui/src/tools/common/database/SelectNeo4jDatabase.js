import React, { Component } from 'react'
import { getAllDbConnectionsForUser } from '../../../persistence/graphql/GraphQLDBConnection';
import LoadForm from '../edit/LoadForm';

export const SelectDatabaseField = (props) => {
    var { 
      label, labelStyle, 
      databaseStyle,
      selectedDatabaseText, 
      onClick 
    } = props;

    labelStyle = labelStyle || {};
    databaseStyle = databaseStyle || {};

    var compositeLabelStyle = {
        marginLeft: '1em',
        whiteSpace: "nowrap",
        fontWeight: 500,
        //paddingLeft: "0.5em",
        paddingRight: "0.5em",
        ...labelStyle
    };

    var compositeDatabaseStyle = {
        whiteSpace: "nowrap",
        borderBottom: '1px solid gray',
        marginBottom: '.5em',
        cursor: 'pointer',
        ...databaseStyle
    }
    
    return (
        <div style={{ marginTop: '.6em', display: "flex", flexFlow: "row" }}>
        <span style={compositeLabelStyle}>
          {label}:{" "}
        </span>
        <span style={compositeDatabaseStyle} onClick={onClick}>
          {selectedDatabaseText}
        </span>
      </div>        
    )
}

export default class SelectNeo4jDatabase extends Component {

    state = {
        showDialog: false,
        neo4jDatabaseMap: {},
        neo4jDatabaseMapUnfiltered: {},
        dialogSettings: {
          searchText: "",
          myOrderBy: "title",
          orderDirection: "ASC",
        }
    }

    showDialog = () => {
        this.getNeo4jDatabases(() => {
            this.setState({
                showDialog: true
            });
         });
    }

    closeDialog = () => {
        this.setState({
            showDialog: false
        });
    }

    getNeo4jDatabases = (callback) => {
        const { searchText, myOrderBy, orderDirection } = this.state.dialogSettings;
        const { setStatus } = this.props;
        console.log('searchText: ', searchText);
        console.log('myOrderBy, orderDirection: ', myOrderBy, orderDirection);
        // TODO: handle searchText, myOrderBy, etc
        setStatus("Loading...", true);
        getAllDbConnectionsForUser((response) => {
          setStatus("", false);
          if (response.success) {
            var dbConnections = response.data;
            this.sortDbConnections(dbConnections, myOrderBy, orderDirection);
            var dbConnectionMap = {};
            response.data.map(dbConnection => dbConnectionMap[dbConnection.id] = dbConnection);
            this.setState({
              neo4jDatabaseMap: dbConnectionMap,
              neo4jDatabaseMapUnfiltered: { ...dbConnectionMap }
            });
          } else {
            console.log("Error fetching getAllDbConnectionsForUser: ", response.error);
            this.setState({
              neo4jDatabaseMap: {},
              neo4jDatabaseMapUnfiltered: {}
            });
            alert('' + response.error);
          }
          if (callback) {
            callback();
          }
        })
      };
    
    sortDbConnections = (dbConnections, myOrderBy, orderDirection) => {
        if (myOrderBy === 'title') {
          if (orderDirection === 'ASC') {
            dbConnections.sort((a, b) => {
              return (a.name === b.name) ? 0 :
                (a.name < b.name) ? -1 : 1;
            })
          } else if (orderDirection === 'DESC') {
            dbConnections.sort((a, b) => {
              return (a.name === b.name) ? 0 :
                (a.name < b.name) ? 1 : -1;
            })
          }
        }
      }

    performNeo4jDatabaseSearch = (searchText, myOrderBy, orderDirection) => {
        var { neo4jDatabaseMapUnfiltered } = this.state;
    
        var filteredConnections = Object.values(neo4jDatabaseMapUnfiltered);
        if (searchText) {
          filteredConnections = filteredConnections.filter(x =>
            x.name.toLowerCase().indexOf(searchText) >= 0
            || x.url.toLowerCase().indexOf(searchText) >= 0
            || x.databaseName.toLowerCase().indexOf(searchText) >= 0
          )
        }
        this.sortDbConnections(filteredConnections, myOrderBy, orderDirection);
        var dbConnectionMap = {};
        filteredConnections.map(dbConnection => dbConnectionMap[dbConnection.id] = dbConnection);
        this.setState({
          neo4jDatabaseMap: dbConnectionMap
        });
      }
    
    render () {    
        const { 
            neo4jDatabaseMap,
            showDialog
        } = this.state;

        var { 
            title, 
            onSelectDatabase
        } = this.props;

        title = title || "Select Neo4j Database";

        return (
            <LoadForm
                maxWidth={"lg"}
                open={showDialog}
                title={title}
                onClose={this.closeDialog}
                load={(dbConnection) => {
                    this.closeDialog();
                    onSelectDatabase(dbConnection);
                }}
                cancel={this.closeDialog}
                performSearch={this.performNeo4jDatabaseSearch}
                metadataMap={neo4jDatabaseMap}
                headers={{
                    name: 'Title',
                    url: 'URL',
                    databaseName: 'Database Name'
                }}
                allowOnlyTitleSortOption={true}
                booleanKeys={[]}
                showActions={false}
            />
        )
    }
}