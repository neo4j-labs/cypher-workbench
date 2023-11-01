import React, { Component } from 'react'
import LoadForm from '../edit/LoadForm';
import { NETWORK_STATUS } from '../../../persistence/graphql/GraphQLPersistence';

export const getCypherStatementKey = (cypherStatement) => {
    var key = (cypherStatement.subKey) ? `${cypherStatement.key}_${cypherStatement.subKey}` : cypherStatement.key;
    return key;
}

export const SelectCypherStatementField = (props) => {
    const { 
        label, labelWidth, titleMaxWidth,
        selectedCypherStatementTitle, onClick 
    } = props;
    const labelStyle = {
        marginLeft: '1em',
        whiteSpace: "nowrap",
        fontWeight: 500,
        //paddingLeft: "0.5em",
        paddingRight: "0.5em",
    };
    if (labelWidth) {
        labelStyle.minWidth = labelWidth;
    }
    const titleStyle = {
        borderBottom: '1px solid gray',
        marginBottom: '.5em',
        cursor: 'pointer'
    }
    if (titleMaxWidth) {
        titleStyle.maxWidth = titleMaxWidth;
    }
    return (
        <div style={{ marginTop: '.6em', display: "flex", flexFlow: "row" }}>
        <span style={labelStyle}>
          {label}:{" "}
        </span>
        <span style={titleStyle} onClick={onClick}>
          {selectedCypherStatementTitle}
        </span>
      </div>        
    )
}

export default class SelectCypherStatement extends Component {

    state = {
        showDialog: false,
        cypherStatementMap: {},
        cypherStatementMapUnfiltered: {},
        dialogSettings: {
          searchText: "",
          myOrderBy: "dateUpdated",
          orderDirection: "DESC",
        }
    }

    showDialog = () => {
        this.getCypherStatements(() => {
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

    getCypherStatements = (callback) => {
        const { searchText, myOrderBy, orderDirection } = this.state.dialogSettings;
        const { setStatus, persistenceHelper } = this.props;
        if (searchText) {
          setStatus("Searching...", true);
          persistenceHelper.searchRemoteCypherStatements(
            searchText,
            myOrderBy,
            orderDirection,
            (response) => {
              setStatus("", false);
              this.handleCypherStatementResponse(response, "searchCypherStatementsX", callback);
            }
          );
        } else {
          setStatus("Loading...", true);
          persistenceHelper.listRemoteCypherStatements(
            myOrderBy,
            orderDirection,
            (response) => {
              setStatus("", false);
              this.handleCypherStatementResponse(response, "listCypherStatementsX", callback);
            }
          );
        }
      };

    performCypherStatementSearch = (searchText, myOrderBy, orderDirection) => {
        const { setStatus, persistenceHelper } = this.props;
        this.setState({
          dialogSettings: {
            ...this.state.dialogSettings,
            searchText: searchText,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection,
          },
        });
    
        if (searchText) {
          setStatus("Searching...", true);
          persistenceHelper.searchRemoteCypherStatements(
            searchText,
            myOrderBy,
            orderDirection,
            (response) => {
              setStatus("", false);
              this.handleCypherStatementResponse(response, "searchCypherStatementsX");
            }
          );
        } else {
          setStatus("Loading...", true);
          persistenceHelper.listRemoteCypherStatements(
            myOrderBy,
            orderDirection,
            (response) => {
              setStatus("", false);
              this.handleCypherStatementResponse(response, "listCypherStatementsX");
            }
          );
        }
      };

    handleCypherStatementResponse = (response, key, callback) => {
        const { communicationHelper } = this.props;
        if (response.success) {
          var data = response.data;
          var cypherStatementMap = {};
          //console.log(data);
          var cypherStatements = data && data[key] ? data[key] : [];
          cypherStatements.forEach(function (cypherStatement) {
            var key = getCypherStatementKey(cypherStatement);
            cypherStatementMap[key] = cypherStatement;
          });
          this.setState(
            {
              cypherStatementMap: cypherStatementMap,
            },
            () => {
              if (callback) {
                callback();
              }
            }
          );
        } else {
          var errorStr = "" + response.error;
          if (errorStr.match(/Network error/)) {
            communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
          }
          alert(response.error);
        }
      };

    render () {
        const { 
            cypherStatementMap,
            showDialog
        } = this.state;

        var { 
            title, 
            onSelectCypherStatement
        } = this.props;

        title = title || "Select Cypher Statement";   

        return (
            <LoadForm
                maxWidth={"lg"}
                open={showDialog}
                title={title}
                onClose={this.closeDialog}
                load={(cypherStatement) => {
                    this.closeDialog();
                    onSelectCypherStatement(cypherStatement);
                }}
                cancel={this.closeDialog}
                performSearch={this.performCypherStatementSearch}
                metadataMap={cypherStatementMap}
                headers={{
                    title: 'Title',
                    isPublic: 'Public',
                    dateUpdated: 'Date Updated',
                    owners: 'Owners',
                    isVisualCypher: 'Visual?',
                    cypher: 'Cypher'
                }}
                limitTextForKey='cypher'
                booleanKeys={['isPublic','isVisualCypher']}
                showActions={false}
            />
        )
    }
}