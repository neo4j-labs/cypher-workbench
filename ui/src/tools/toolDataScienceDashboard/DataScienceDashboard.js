import React, { Component, useEffect, useState } from "react";
import { getAuth } from "../../auth/authUtil";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import { CommunicationHelper } from "../common/communicationHelper";
import { PersistenceHelper } from "../common/persistenceHelper";
import { getDynamicConfigValue } from '../../dynamicConfig';
import {
  getAllJobs, runWorkflow, getJobDetails
} from '../../persistence/graphql/GraphQLDataTransfer';
import { getAllJobDetails } from './JobDataProcessing';
// import { DataGrid } from '@material-ui/data-grid';
import { Typography } from '@material-ui/core';
// import PipelineDetails from "./PipelineDetails";
import BasicTabs from "./DataScienceTabs";
import GeneralDialog from "../../components/common/GeneralDialog";
import { StyledButton, OutlinedStyledButton } from "../../components/common/Components";
import {
  TOOL_HUMAN_NAME, DOCUMENT_NAME
} from "../toolDataMapping/DataMapping";
import {
  SUBGRAPH_MODEL,
  REMOTE_GRAPH_DOC_TYPE,
  LOCAL_STORAGE_KEY
} from "../toolDataMapping/dataProvider/dataMappingDataProvider";
import {
  loadRemoteGraphDoc,
  searchRemoteGraphDocMetadata,
  listRemoteGraphDocMetadata
} from '../../persistence/graphql/GraphQLGraphDoc';
import {
  NETWORK_STATUS,
} from "../../persistence/graphql/GraphQLPersistence";
import { GraphData } from '../../dataModel/graphData';
import LoadForm from "../common/edit/LoadForm";
import { ALERT_TYPES } from "../../common/Constants";
import { getAllDbConnectionsForUser } from '../../persistence/graphql/GraphQLDBConnection';

export default class DataScienceDashboard extends Component {
  serviceID = "bigquery-neo4j-incremental"

  handleDataMappingDialogClose = (options) => {
    this.setState(
      {
        showDataMappingDialog: false,
      },
      () => {
        // do nothing
      }
    );
  };

  showLoadDataMappingDialog = () => {
    this.getDataMappings(() => {
      this.setState({
        showDataMappingDialog: true
      });
    });
  };

  handleNeo4jDatabaseDialogClose = (options) => {
    this.setState(
      {
        showNeo4jDatabaseDialog: false,
      },
      () => {
        // do nothing
      }
    );
  };

  showLoadNeo4jDatabase = () => {
    this.getNeo4jDatabases(() => {
      this.setState({
        showNeo4jDatabaseDialog: true
      });
    });
  };


  closeGeneralDialog = () => {
    this.setState({
      generalDialog: { ...this.state.generalDialog, open: false },
    });
  };

  showGeneralDialog = (title, description, buttons) => {
    var { generalDialog } = this.state;
    this.setState({
      generalDialog: {
        ...generalDialog,
        open: true,
        title: title,
        description: description,
        buttons: buttons,
      },
    });
  };

  state = {
    jobStatusRowsArray: [],
    dashboardLastUpdated: null,
    rows: [],
    newRows: [],
    neo4jDatabaseMap: {},
    neo4jDatabaseMapUnfiltered: {},
    showDataMappingDialog: false,
    showNeo4jDatabaseDialog: false,
    selectedDataMapping: null,
    selectedDataMappingText: '<Select a data mapping>',
    selectedDatabase: null,
    selectedDatabaseText: '<Select a Neo4j database>',
    dataMappingMap: {},
    status: '',
    activityIndicator: false,
    loadDataMappingDialog: {
      searchText: "",
      myOrderBy: "dateUpdated",
      orderDirection: "DESC",
    },
    loadNeo4jDatabaseDialog: {
      searchText: "",
      myOrderBy: "title",
      orderDirection: "ASC",
    },
    generalDialog: {
      open: false,
      handleClose: this.closeGeneralDialog,
      title: "",
      description: "",
      buttons: [],
    },
    workflowResult: {},
  }

  constructor(props) {
    super(props);
    props.setSureRef(this);

    this.dataMappingPersistenceHelper = new PersistenceHelper({
      graphDocContainer: this,
      getNetworkStatus: this.props.getNetworkStatus,
      LOCAL_STORAGE_KEY: LOCAL_STORAGE_KEY,
      REMOTE_GRAPH_DOC_TYPE: REMOTE_GRAPH_DOC_TYPE,
      SUBGRAPH_MODEL: SUBGRAPH_MODEL,
    });

    this.communicationHelper = new CommunicationHelper({
      graphDocContainer: this,
      persistenceHelper: this.dataMappingPersistenceHelper,
      getNetworkStatus: this.props.getNetworkStatus,
      setNetworkStatus: this.props.setNetworkStatus,
      setStatus: this.setStatus,
      showDialog: this.showGeneralDialog,
      GraphDocType: REMOTE_GRAPH_DOC_TYPE
    });
  }

  componentDidMount() {
  }

  runWorkflow = () => {
    const { selectedDataMapping, workflowResult } = this.state;
    if (!selectedDataMapping) {
      alert('Please select a Data Mapping first', ALERT_TYPES.WARNING);
    } else {
      var mappingJson = selectedDataMapping.getGraphRootNode().getPropertyValueByKey('mappingJson');
      runWorkflow(this.serviceID, mappingJson, (response) => {
        this.setState({
          workflowResult: response,
        }, () => {
        });
      });
    };
  }

  setStatus = (message, active) => {
    message = typeof message === "string" ? message : "" + message;
    //console.log("status: " + message);
    const { status, activityIndicator } = this.state;
    if (message !== status || active !== activityIndicator) {
      this.setState({
        status: message,
        activityIndicator: active,
      });
    }

  };

  loadDataMapping = (graphDocMetadata, callback) => {
    this.loadRemoteDataMapping(
      graphDocMetadata,
      callback
    );
    this.handleDataMappingDialogClose();
  };

  loadRemoteDataMapping = (
    graphDocMetadata,
    callback
  ) => {
    this.setStatus(`Loading ...${TOOL_HUMAN_NAME}`, true);
    if (graphDocMetadata && graphDocMetadata.key) {
      loadRemoteGraphDoc(
        graphDocMetadata.key,
        (response) => {
          //console.log(response);
          if (response.success === false) {
            var message = `Error loading ${DOCUMENT_NAME} builder: ${response.error}`;
            this.setStatus(message, false);
            alert(message);
          } else {
            this.setStatus("", false);

            var mappingGraphData = new GraphData({
              id: graphDocMetadata.key,
              SUBGRAPH_MODEL: SUBGRAPH_MODEL
            });
            mappingGraphData.fromSaveObject(response, false);
            this.setState({
              selectedDataMappingText: graphDocMetadata.title,
              selectedDataMapping: mappingGraphData
            }, () => {
              if (callback) {
                callback();
              }
            })
          }
        }
      );
    } else {
      alert(
        `Unable to load ${DOCUMENT_NAME}, the specified ${DOCUMENT_NAME} may not exist`
      );
    }
  };

  getDataMappings = (callback) => {
    const { searchText, myOrderBy, orderDirection } = this.state.loadDataMappingDialog;
    if (searchText) {
      this.setStatus("Searching...", true);
      this.dataMappingPersistenceHelper.searchRemoteGraphDocMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleDataMappingStatementResponse(response, "searchGraphDocsX", callback);
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.dataMappingPersistenceHelper.listRemoteGraphDocMetadata(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleDataMappingStatementResponse(response, "listGraphDocsX", callback);
        }
      );
    }
  };

  selectNeo4jDatabase = (databaseData, callback) => {
    var databaseName = databaseData.databaseName ? ` db:${databaseData.databaseName}` : '';
    this.setState({
      selectedDatabase: databaseData,
      selectedDatabaseText: `${databaseData.name} (${databaseData.url}${databaseName})`
    })
    this.handleNeo4jDatabaseDialogClose();
    if (callback) {
      callback();
    }
  }

  getNeo4jDatabases = (callback) => {
    const { searchText, myOrderBy, orderDirection } = this.state.loadNeo4jDatabaseDialog;
    console.log('searchText: ', searchText);
    console.log('myOrderBy, orderDirection: ', myOrderBy, orderDirection);
    // TODO: handle searchText, myOrderBy, etc
    this.setStatus("Loading...", true);
    getAllDbConnectionsForUser((response) => {
      this.setStatus("", false);
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

  performDataMappingSearch = (searchText, myOrderBy, orderDirection) => {
    this.setState({
      loadDataMappingDialog: {
        ...this.state.loadDataMappingDialog,
        searchText: searchText,
        myOrderBy: myOrderBy,
        orderDirection: orderDirection,
      },
    });

    if (searchText) {
      this.setStatus("Searching...", true);
      this.dataMappingPersistenceHelper.searchRemoteGraphDocMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleDataMappingStatementResponse(response, "searchGraphDocsX");
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.dataMappingPersistenceHelper.listRemoteGraphDocMetadata(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleDataMappingStatementResponse(response, "listGraphDocsX");
        }
      );
    }
  };

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

  handleDataMappingStatementResponse = (response, key, callback) => {
    if (response.success) {
      var data = response.data;
      var dataMappingMap = {};
      //console.log(data);
      var dataMappings = data && data[key] ? data[key] : [];
      dataMappings.forEach(function (dataMapping) {
        dataMappingMap[dataMapping.key] = dataMapping.metadata;
      });
      this.setState(
        {
          dataMappingMap: dataMappingMap,
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
        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
      }
      alert(response.error);
    }
  };

  getTitle = (metadata) => {
    return 'Data Science Dashboard'
  };

  getMenus = () => {
    var menus = [];

    /*
    var placeholderMenuItems = [];
    placeholderMenuItems.push({ id: "placeholder", text: "Place holder" });
   
    var placeholderMenu = {
      id: "dataScienceDashboard-import",
      text: "Placeholder",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "placeholder":
            alert('TODO');
            break;
          default:
            break;
        }
      },
      menuItems: placeholderMenuItems,
    };
    menus.push(placeholderMenu);
    */
    return menus;
  };

  tryToGoOnline = () => { }

  tabActivated = (properties) => {
    properties = properties || {};
    const { setTitle, setMenus } = this.props;
    setTitle(this.getTitle());
    setMenus(this.getMenus(), () => {
    });
    this.updateJobStatus()
  }

  tabDeactivated = () => {
    clearTimeout(this.updateJobStatusTimer)
    this.updateJobStatusTimer = null;
  }

  updateJobStatus = () => {
    // This function makes a gql call to fetch all the workflows and chains the response to getAllJobDetails for pipeline details
    getAllJobs(async (res) => {
      if (this.updateJobStatusTimer) {
        clearTimeout(this.updateJobStatusTimer);
        this.updateJobStatusTimer = null;
      }
      if (res && res.data && res.data.getAllJobs) {
        const rowsArray = await getAllJobDetails(res.data.getAllJobs.workflowStatusList)
        this.setState({
          jobStatusRowsArray: rowsArray
        })
      }
      // refreshes the data science dashboard every 5 second
      this.updateJobStatusTimer = setTimeout(this.updateJobStatus, 5000)
    })
  }

  render() {
    const {
      rows,
      jobStatusRowsArray,
      dashboardLastUpdated,
      showDataMappingDialog,
      showNeo4jDatabaseDialog,
      selectedDataMappingText,
      selectedDatabaseText,
      neo4jDatabaseMap,
      dataMappingMap,
      generalDialog
    } = this.state
    return (
      <div>
        <div
          style={{
            display: "flex",
            flexFlow: "row",
            background: "#F9F9F9",
            border: "1px solid #C6C6C6",
            //position: "absolute",
            margin: '5px',
            zIndex: 100,
            width: `100%`,
          }}
        >
          <div style={{ display: "flex", flexFlow: "column" }}>
            <div style={{ display: "flex", flexFlow: "row", marginBottom: '-5px' }}>
              {/* <div style={{ marginTop: '.6em', display: "flex", flexFlow: "row" }}>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    paddingLeft: "0.5em",
                    paddingRight: "0.5em",
                  }}
                >
                  Data Mapping:{" "}
                </div>
                <div style={{
                  whiteSpace: "nowrap",
                  borderBottom: '1px solid gray',
                  marginBottom: '.5em',
                  cursor: 'pointer'
                }} onClick={this.showLoadDataMappingDialog}>
                  {selectedDataMappingText}
                </div>
              </div> */}
              {/*<div>
                    <OutlinedStyledButton
                      onClick={this.showLoadDataMappingDialog}
                      style={{ marginLeft: "1em", height: "2em" }}
                      color="primary"
                    >
                      <span style={{ whiteSpace: "nowrap" }}>Mapping...</span>
                    </OutlinedStyledButton>
                </div>*/}
              {/* <div style={{ marginTop: '.6em', display: "flex", flexFlow: "row" }}>
                <span
                  style={{
                    marginLeft: '1em',
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                    paddingLeft: "0.5em",
                    paddingRight: "0.5em",
                  }}
                >
                  Neo4j Database:{" "}
                </span>
                <span style={{
                  whiteSpace: "nowrap",
                  borderBottom: '1px solid gray',
                  marginBottom: '.5em',
                  cursor: 'pointer'
                }} onClick={this.showLoadNeo4jDatabase}>
                  {selectedDatabaseText}
                </span>
              </div> */}
              {/*<div style={{width: '15em'}}>
                    <OutlinedStyledButton
                      onClick={this.showLoadNeo4jDatabase}
                      style={{ marginLeft: "1em", height: "2em" }}
                      color="primary"
                    >
                      <span style={{ whiteSpace: "nowrap" }}>Neo4j Database...</span>
                    </OutlinedStyledButton>
                  </div>*/}
            </div>
          </div>
        </div>
        <div style={{ overflowY: 'scroll', height: 'calc(100vh)', width: '100%' }}>
          <BasicTabs jobStatusRowsArray={jobStatusRowsArray} />
          {/* <StyledButton onClick={this.updateJobsForInterval}>Update Status</StyledButton> */}

        </div>
        {/* <span>Last update: {dashboardLastUpdated}</span> */}
        {/* </div> */}
        {/* </div> */}
        <GeneralDialog
          open={generalDialog.open}
          onClose={generalDialog.handleClose}
          title={generalDialog.title}
          description={generalDialog.description}
          buttons={generalDialog.buttons}
        />
        <LoadForm
          maxWidth={"lg"}
          open={showDataMappingDialog}
          title={"Load Data Mapping"}
          onClose={this.handleDataMappingDialogClose}
          load={this.loadDataMapping}
          cancel={this.handleDataMappingDialogClose}
          performSearch={this.performDataMappingSearch}
          metadataMap={dataMappingMap}
          headers={{
            title: 'Title',
            isPublic: 'Public',
            dateUpdated: 'Date Updated',
            owners: 'Owners'
          }}
          booleanKeys={['isPublic']}
          showActions={false}
        />
        <LoadForm
          maxWidth={"lg"}
          open={showNeo4jDatabaseDialog}
          title={"Select Neo4j Database"}
          onClose={this.handleNeo4jDatabaseDialogClose}
          load={this.selectNeo4jDatabase}
          cancel={this.handleNeo4jDatabaseDialogClose}
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
      </div>
    );
  };
};
