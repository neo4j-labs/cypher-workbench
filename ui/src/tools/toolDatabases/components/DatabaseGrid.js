import React, { Component } from 'react';
//import { Query } from "react-apollo";
import styled from "styled-components";
import { Typography } from '@material-ui/core';
import { getAllDbConnectionsForUser } from '../../../persistence/graphql/GraphQLDBConnection';
import DatabaseConnectionCard from "./DatabaseConnectionCard";

const GridContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
  margin-bottom: 15px;
`;

export default class DatabaseGrid extends Component {

    state = {
        isLoading: false,
        dbConnections: []
    }

    setIsLoading = (value) => this.setState({ isLoading: value });
    setDbConnections = (value) => this.setState({ dbConnections: value });

    constructor (props) {
        super(props);
    }

    componentDidMount () {
        this.refetch();
    }

    refetch = () => {
        this.setIsLoading(true);
        getAllDbConnectionsForUser((response) => {
            this.setIsLoading(false);
            if (response.success) {
                this.setDbConnections(response.data);
            } else {
                console.log("Error fetching getAllDbConnectionsForUser: ", response.error);
                alert('' + response.error);
                this.setDbConnections([]);
            }
        })
    }

    render () {
        const { dbConnections } = this.state;
        const { filterValue, showPublicCards } = this.props;

        var filteredDbConnections = dbConnections;

        filteredDbConnections = filteredDbConnections
          .filter(dbConnection => 
              dbConnection.isPrivate || (!dbConnection.isPrivate && showPublicCards))

        if (filterValue) {
          filteredDbConnections = filteredDbConnections
            .filter(dbConnection => {
                var { name, url, databaseName } = dbConnection;
                const filterRegex = new RegExp(filterValue, 'i');
                name = name || '';
                url = url || '';
                databaseName = databaseName || '';
                return (name.match(filterRegex) 
                      || url.match(filterRegex)
                      || databaseName.match(filterRegex));
              })
        }
        filteredDbConnections.sort((a,b) => {
          let aName = a.name?.toLowerCase() || '';
          let bName = b.name?.toLowerCase() || '';
          if (aName === bName) return 0;
          if (aName < bName) return -1;
          return 1;
        })

        return (
            <div style={{padding:'10px', height: 'calc(100vh - 130px)', overflowY: 'scroll'}}>
              {(filteredDbConnections.length > 0) ?
                  <GridContainer>
                      {filteredDbConnections.map(dbConnection => (
                          <DatabaseConnectionCard
                            otherToolActionRequest={this.props.otherToolActionRequest}
                            dbConnection={dbConnection}
                            refetch={this.refetch}
                          />
                      ))}
                  </GridContainer>
                  :
                  (dbConnections.length > 0) ?
                      <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
                        <span>{`No Databases match the filter '${filterValue}'`}</span>
                      </Typography>
                    :
                      <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
                        <span>No Databases configured. Select 
                          <span className='textMenuReference'> File &gt; New Connection </span>
                        to create one</span>
                      </Typography>
              }
            </div>
        );
    }
};
