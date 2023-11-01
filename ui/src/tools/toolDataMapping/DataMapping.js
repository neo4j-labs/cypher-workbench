import React, { Component } from "react";
import { 
  Button, Drawer, 
  List, ListItem, ListItemText,
  Tabs, Tab, Typography, Tooltip 
} from "@material-ui/core";
import { OutlinedStyledButton } from "../../components/common/Components";

import uuidv4 from 'uuid/v4';
import { getAuth } from "../../auth/authUtil";

import { TabPanel } from "../../components/common/Components";

import DataModel from "../../dataModel/dataModel";
import { stopListeningTo, listenTo } from "../../dataModel/eventEmitter";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import LoadForm from "../common/edit/LoadForm";
import LoadModelForm from "../toolModel/components/LoadModelForm";
import { ALERT_TYPES, USER_ROLE, COLORS } from "../../common/Constants";
import { SAVE_MODE } from "../common/toolConstants";
import { CommunicationHelper } from "../common/communicationHelper";
import { promptLockedDocument } from "../common/lockHelper";
import { PersistenceHelper } from "../common/persistenceHelper";
import { getDynamicConfigValue } from '../../dynamicConfig';
import DataSource, { DataSourceTypes } from '../common/mapping/DataSource';
import { serializeDataMappingsToJson } from "../toolCypherBuilder/components/dataProvider/dataMappingJson"

import DataMappingDataProvider from './dataProvider/dataMappingDataProvider';
import GeneralDialog from "../../components/common/GeneralDialog";
import GeneralTextDialog from "../../components/common/GeneralTextDialog";
import { CanvasConfig } from '../common/graphCanvas/canvasConfig';
import DataMappingBlock from '../common/mapping/DataMappingBlock';
import PipelineOptionsButton from '../common/mapping/PipelineOptions';
import { 
  getNodePatternDescription,
  getNodeRelNodePatternDescription
 } from '../common/mapping/DataSourceTableMapping';
import AccordionBlockNoDrag from '../common/blocks/AccordionBlockNoDrag';

import SecurityRole, { SecurityMessages } from "../common/SecurityRole";
import DocumentSecurityRole from "../common/DocumentSecurityRole";
import Sharing from '../common/security/Sharing';
import EditHelper from '../common/edit/editHelper';
import { ModelPersistence, PERSISTENCE_STATE_ITEMS } from '../common/model/modelPersistence';
import SelectNeo4jDatabase, { SelectDatabaseField } from '../common/database/SelectNeo4jDatabase';

import { downloadUrlAsFile } from '../../common/util/download';

import { 
  getNeoConnection, 
  getNeoConnections,
  callExportService
} from '../common/mapping/neo4j/exportNeoToNeo';

import {
  getUserSettings,
  loadRemoteDataModel,
  listRemoteDataModelMetadata,
  searchRemoteDataModelMetadata,
  saveRemoteDataModelMetadata,
  updateUserRolesGraphDoc,
  getUserRolesForGraphDoc,
  NETWORK_STATUS,
} from "../../persistence/graphql/GraphQLPersistence";
import {
  getDataSourceSchema,
  runJob,
  runJobAsync,
  jobStatus,
  runWorkflow
} from "../../persistence/graphql/GraphQLDataTransfer";

import {
  anyFeatureLicensed,
  isFeatureLicensed,
  showUpgradeLicenseMessage,
  showMaxReachedUpgradeLicenseMessage,
  FEATURES,
  TOOL_NAMES,
} from "../../common/LicensedFeatures";
import { SyncedEventTypes } from "../../dataModel/syncedGraphDataAndView";
import {
  GraphDocChangeType,
  GraphViewChangeType,
} from "../../dataModel/graphDataConstants";

export const TOOL_HUMAN_NAME = "Data Mapping";
export const DOCUMENT_NAME = "Data Mapping";
const NEW_DOCUMENT_TITLE = `New ${DOCUMENT_NAME}`;
const NEW_THING_NAME = "Data Mapping";

const TabIndexes = {
  GraphDestination: 0,
  GraphLoadPattern: 1
}

export const DomIds = {
  Main: "main",
  DataMapping: "dataMapping",
  AddModelPattern: "addModelPattern"
};

const Sizes = {
  LeftWidthPercent: 39,
  RightWidthPercent: 59
}

const pxVal = (px) => typeof (px) === 'string' ? parseInt(px.replace(/px$/, '')) : px;

const NO_ACTIVE_DOCUMENT_MESSAGE = `No ${TOOL_HUMAN_NAME} document is loaded. This option is unavailable when there is not an active document.`;

export default class DataMapping extends Component {

  GraphDocType = 'DataMapping';
  id = 'dataMapping';

  dataMappingDataProvider = null;

  loading = false;
  dataChangeTimer = null;
  retryTimer = null;

  getDataProvider = () => this.dataMappingDataProvider;

  setDataMappingDataProvider(dataMappingDataProvider, dontRefreshRefs) {
    //alert('calling setDataMappingDataProvider', ALERT_TYPES.INFO);
    this.dataMappingDataProvider = dataMappingDataProvider;
    if (this.canvasConfig) {
      this.canvasConfig.setDataProvider(dataMappingDataProvider);
    }
    
    if (!dontRefreshRefs) {
      if (this.dataMappingBlockRef.current) {
        this.dataMappingBlockRef.current.updateDataProvider();
      }
  
      this.doWhen(
        () => {
          //alert('updateStateFromDataProvider', ALERT_TYPES.WARNING);
          this.dataSourceRef.current.updateStateFromDataProvider()
        },
        () => this.dataSourceRef.current,
        "Update DataSource data provider"
      );
    }
  }

  doWhen = (doWhat, whenCondition, description, params) => {
    var { maxTries, timeBetweenTries } = params || {};
    maxTries = (maxTries !== undefined) ? maxTries : 20;
    timeBetweenTries = (timeBetweenTries !== undefined ) ? timeBetweenTries : 100;
    var tryNumber = 1;

    const doThis = () => {
        if (whenCondition()) {
            console.log(`when condition satisfied, calling doWhat re: ${description}`);
            doWhat();
        } else {
            tryNumber++;
            console.log(`doWhen tryNumber ${tryNumber} re: ${description}`);
            if (tryNumber <= maxTries) {
                console.log(`calling setTimeout re: $${description}`);
                setTimeout(doThis, timeBetweenTries);    
            } else {
                console.log(`Error: DataMapping doWhen timed out re: ${description}`);
            }
        }
    }
    doThis();
  }   

  getNewDataMappingDataProvider = (properties) => {
    properties = properties || {};
    const { 
      key,
      patternId
    } = properties;

    var dataMappingDataProvider = this.getDataProvider();
    if (dataMappingDataProvider) {
      stopListeningTo(dataMappingDataProvider, dataMappingDataProvider.id);
    }

    dataMappingDataProvider = new DataMappingDataProvider({
        id: (key) ? key : uuidv4(),
        patternId: (patternId) ? patternId : uuidv4(),
        parentContainer: this
    });
    listenTo(dataMappingDataProvider, dataMappingDataProvider.id, this.dataChangeListener);
    return dataMappingDataProvider;
  }

  // called from canvas data provider when the cypher pattern has changed
  refreshAvailableMappingDestinations = (cypherPattern) => {
    if (this.dataMappingBlockRef.current) {
      this.dataMappingBlockRef.current.refreshAvailableMappingDestinations(cypherPattern);
    }
  }

  requestRelationshipPopup = (properties, callback) => {
    if (this.dataMappingBlockRef.current) {
      this.dataMappingBlockRef.current.requestRelationshipPopup(properties, callback);
    }
  }

  getGraphCanvas = () => {
    if (this.dataMappingBlockRef.current) {
      return this.dataMappingBlockRef.current.getGraphCanvas();
    } else {
      return null;
    }
  }

  handleLoadDialogClose = (options) => {
    this.setState(
      {
        showLoadDialog: false
      });
  };

  handleLoadModelDialogClose = () => {
    this.setState({
      showLoadModelDialog: false,
    });
  };

  handleSaveDialogClose = () => {
    var {
      loadedMetadata,
      cancelMetadata,
      saveFormMode,
      activeKey,
    } = this.state;
    if (
      saveFormMode === SAVE_MODE.NEW ||
      saveFormMode === SAVE_MODE.TOTALLY_NEW
    ) {
      loadedMetadata = cancelMetadata;
    }
    this.setState(
      {
        showSaveDialog: false,
        loadedMetadata: loadedMetadata,
      },
      () => {
        /*
        if (!activeKey) {
          this.showLoadDialog();
        }
        */
      }
    );
  };

  getSelectedModelText = (modelInfo) => {
    var modelName = "";
    if (modelInfo) {
      modelName = modelInfo.title ? modelInfo.title : "Untitled";
    } else {
      modelName = "<No Model Selected>";
    }
    return modelName;
  };

  saveRemoteMetadata = (loadedMetadata, previousState, { saveFormMode }) => {
    this.setStatus("Saving...", true);

    const dataMappingDataProvider = this.getDataProvider();

    const callback = (response) => {
        if (!response.success) {
          this.setStatus(response.error, false);
          const errorMessage = (response.error && response.error.message) ? response.error.message : `${response.error}`;
          if (errorMessage.match(/Max number of licensed (.+) reached/)) {
              var maxedThing = errorMessage.match(/Max number of licensed (.+) reached/)[1];
              showMaxReachedUpgradeLicenseMessage(maxedThing);
          } else {
              alert(errorMessage);
          }
        } else {
          this.setStatus("Saved.", false);
        }
        this.setState({
          metadataMap: {
            ...this.state.metadataMap,
            [loadedMetadata.key]: loadedMetadata,
          },
          showSaveDialog: false,
        });
        this.props.setTitle(this.getTitle(loadedMetadata));
    }

    if (saveFormMode === SAVE_MODE.NEW || saveFormMode === SAVE_MODE.TOTALLY_NEW) {
      const {
        mainGraphDoc,
        mainGraphDocKeyHelper,
        mainSubRelationshipType,
        subGraphDoc,
        subGraphDataView,
        subGraphModel
      } = dataMappingDataProvider.getInitialGraphDocSaveInfo(loadedMetadata);

      this.persistenceHelper.saveRemoteGraphDocWithChildGraphDocWithView(
        mainGraphDoc, 
        mainGraphDocKeyHelper,
        mainSubRelationshipType, 
        subGraphDoc, 
        subGraphDataView, 
        subGraphModel, 
        callback
      );
    } else {
      this.persistenceHelper.saveRemoteGraphDocMetadata(
        loadedMetadata,
        previousState,
        callback
      );
    }
  };

  setActiveGraphDoc = ({
    graphDocMetadata,
    lockInfo,
    graphDocObj,
    serializedDataSaveObj,
    keepDataChangeFlags
  },
    callback
  ) => {
    /*
    this.setState({
    });
    */
    const dataMappingDataProvider = this.getNewDataMappingDataProvider(
      graphDocMetadata
    );
    dataMappingDataProvider.fromSaveObject({
      graphDocObj,
      serializedSaveObject: serializedDataSaveObj,
      keepDataChangeFlags},
      () => {
        console.log("after fromSaveObject");
        dataMappingDataProvider.setIsRemotelyPersisted(true);
        this.finishLoading({
          graphDocMetadata,
          lockInfo,
          dataMappingDataProvider: dataMappingDataProvider,
          dontPushWebHistory: false,
          callback
        });
      }
    );
  };

  finishLoading = ({
    graphDocMetadata,
    lockInfo,
    dataMappingDataProvider,
    dontPushWebHistory,
    callback
  }) => {
    this.clearDataModel();
    this.setDataMappingDataProvider(dataMappingDataProvider);

    this.doWhen(
      () => {
        this.dataMappingBlockRef.current.resizePanelsOnLoad();
      },
      () => this.dataMappingBlockRef.current,
      "resize data mapping block"
    );

    this.doWhen(
      () => {
        //alert('updateStateFromDataProvider', ALERT_TYPES.WARNING);
        const dataSourceTableBlocksCopy = dataMappingDataProvider.getDataSourceTableBlocks().slice();
        this.dataSourceRef.current.setDataSourceTableBlocks(dataSourceTableBlocksCopy);
      },
      () => this.dataSourceRef.current,
      "setDataSourceTableBlocks from dataMappingDataProvider"
    );

    var dataModelKey = dataMappingDataProvider.getDataModelKey();
    if (dataModelKey) {
      this.loadRemoteModel({ key: dataModelKey });
    }

    var viewSettings = graphDocMetadata.viewSettings
      ? graphDocMetadata.viewSettings
      : {};

    //console.log('viewSettings: ', viewSettings);
    //this.handleViewSettings(viewSettings);    

    var userRole = graphDocMetadata.userRole;
    if (graphDocMetadata.isPublic && !userRole) {
      userRole = USER_ROLE.VIEWER;
    }
    //console.log("Scenarios SecurityRole.setRole(userRole): ", userRole)
    SecurityRole.setRole(userRole);

    if (!dontPushWebHistory) {
      this.addToWebHistory(graphDocMetadata);
    }

    this.setState({
      loadedMetadata: graphDocMetadata,
      showLoadDialog: false,
      activeKey: graphDocMetadata.key,
      parallelRelationships: this.dataMappingDataProvider.getParallelRelationships(),
      metadataMap: {
        ...this.state.metadataMap,
        [graphDocMetadata.key]: graphDocMetadata,
      },
      destNeo4jDatabaseConnection: this.dataMappingDataProvider.getNeo4jDestDatabase() || {},
      viewSettings: viewSettings
    });

    this.props.setTitle(this.getTitle(graphDocMetadata));
    //this.calculatePageSize();

    if (callback) {
      callback(graphDocMetadata, dataMappingDataProvider);
    }

    if (lockInfo && lockInfo.lockIsActive) {
      promptLockedDocument({
        props: {
          setStatus: this.setStatus,
          persistenceHelper: this.persistenceHelper,
          GraphDocType: dataMappingDataProvider.getRemoteGraphDocType(),
          showDialog: this.showGeneralDialog
        }, 
        messageContext: {
          graphDocMetadata: graphDocMetadata
        }, 
        lockInfo,
        setNetworkStatus: this.communicationHelper.setNetworkStatus, 
        skipStoreLocally: true,
        errorStr: ''
    })
    }
  };

  getViewSettings = () => this.state.viewSettings;

    /*
  handleViewSettings = (viewSettings) => {
    var canvasViewSettings = viewSettings.canvasViewSettings || {};
    this.doWhen(
      () => {
        //console.log('calling handleCanvasViewSettings', canvasViewSettings);
        this.dataMappingBlockRef.current.handleCanvasViewSettings(canvasViewSettings);
      },
      () => this.dataMappingBlockRef.current,
      "Update view settings of DataMappingBlock"
    );
  }
    */

  loadDataMapping = (graphDocMetadata, dontPushWebHistory, callback) => {
    /*
    this.setState({
    });
    */
    this.loadRemoteDataMapping(
      graphDocMetadata,
      dontPushWebHistory,
      callback
    );
  };

  loadRemoteDataMapping = (
    graphDocMetadata,
    dontPushWebHistory,
    callback
  ) => {
    this.setStatus(`Loading ...${TOOL_HUMAN_NAME}`, true);
    if (graphDocMetadata && graphDocMetadata.key) {
      //this.persistenceHelper.loadRemoteGraphDocAndDefaultView(graphDocMetadata.key, (response) => {
      this.persistenceHelper.loadRemoteGraphDoc(
        graphDocMetadata.key,
        (response) => {
          //console.log(response);
          if (response.success === false) {
            var message = `Error loading ${DOCUMENT_NAME} builder: ${response.error}`;
            this.setStatus(message, false);
            alert(message);
          } else {
            this.setStatus("", false);
            graphDocMetadata.viewSettings = response.metadata.viewSettings;
            var dataMappingDataProvider = this.getNewDataMappingDataProvider(
              graphDocMetadata
            );
            dataMappingDataProvider.fromSaveObject({
              graphDocObj: response, keepDataChangeFlags: false
            }, () => {
              dataMappingDataProvider.setIsRemotelyPersisted(true);
              this.finishLoading({
                graphDocMetadata,
                dataMappingDataProvider,
                dontPushWebHistory,
                callback
              });
            });
          }
        }
      );
    } else {
      alert(
        `Unable to load ${DOCUMENT_NAME}, the specified ${DOCUMENT_NAME} may not exist`
      );
    }
  };

  getMetadataMap = (callback) => {
    const { searchText, myOrderBy, orderDirection } = this.state.loadDialog;
    if (searchText) {
      this.setStatus("Searching...", true);
      this.persistenceHelper.searchRemoteGraphDocMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleMetadataResponse(response, "searchGraphDocsX", callback);
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.persistenceHelper.listRemoteGraphDocMetadata(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleMetadataResponse(response, "listGraphDocsX", callback);
        }
      );
    }
  };

  closeGeneralDialog = () => {
    this.setState({
      generalDialog: { ...this.state.generalDialog, open: false },
    });
  };

  closeGeneralTextDialog = () => {
    this.setState({ generalTextDialog: { ...this.state.generalTextDialog, open: false }});
  }

  setGeneralText = (e) => {
    this.setState({ generalTextDialog: { ...this.state.generalTextDialog, text: e.target.value }});
  }

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

  showGeneralTextDialog ({title, text, includeExecuteButton = true}, action) {
    var buttons = [];
    if (includeExecuteButton) {
        buttons.push({
          text: 'Execute',
          onClick: (button, index) => { 
            if (typeof(action) === 'function') {
              var text = this.state.generalTextDialog.text;
              action(text);
            }
          },
          autofocus: true
        })
    }
    buttons.push({
        text: 'Cancel',
        onClick: (button, index) => this.closeGeneralTextDialog(),
        autofocus: false
      });

    this.setState({
      generalTextDialog: {
            ...this.state.generalTextDialog,
            open: true,
            title: title,
            text: (text) ? text : '',
            placeholder: 'Paste contents here',
            buttons: buttons
        }
    }, () => {
        this.generalTextDialogRef.current.focusTextBox();
    });
  }

  performSearch = (searchText, myOrderBy, orderDirection) => {
    this.setState({
      loadDialog: {
        ...this.state.loadDialog,
        searchText: searchText,
        myOrderBy: myOrderBy,
        orderDirection: orderDirection,
      },
    });

    if (searchText) {
      this.setStatus("Searching...", true);
      this.persistenceHelper.searchRemoteGraphDocMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleMetadataResponse(response, "searchGraphDocsX");
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.persistenceHelper.listRemoteGraphDocMetadata(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleMetadataResponse(response, "listGraphDocsX");
        }
      );
    }
  };

  performModelSearch = (searchText, myOrderBy, orderDirection) => {
    this.setState({
      loadModelDialog: {
        ...this.state.loadModelDialog,
        searchText: searchText,
        myOrderBy: myOrderBy,
        orderDirection: orderDirection,
      },
    });

    if (searchText) {
      this.setStatus("Searching...", true);
      searchRemoteDataModelMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleModelMetadataResponse(response, "searchDataModelsX");
        }
      );
    } else {
      this.setStatus("Loading...", true);
      listRemoteDataModelMetadata(myOrderBy, orderDirection, (response) => {
        this.setStatus("", false);
        this.handleModelMetadataResponse(response, "listDataModelsX");
      });
    }
  };

  showLoadDialog = () => {
    this.getMetadataMap(() => {
      this.setState({
        showLoadDialog: true,
      });
    });
  };

  state = {
    activeKey: "",
    showSaveDialog: false,
    showLoadDialog: false,
    showLoadModelDialog: false,
    activityIndicator: false,

    destinationTabIndex: 0,    

    saveFormMode: "",
    editMetadata: {},
    metadataMap: {},
    loadedMetadata: getMetadata(NEW_DOCUMENT_TITLE),
    cancelMetadata: {},

    availableMappingDestinations: [],
    availableDestinationsByNodePattern: {},
    availableDestinationsByNodeRelNodePattern: {},

    modelMetadataMap: {},

    pipelineOptions: false,

    selectedDataModel: null,
    selectedDataModelKey: "",
    selectedDataModelMetadata: null,
    selectedDataModelText: this.getSelectedModelText(),
    selectedModelSecurityRole: null,
    editHelper: new EditHelper(),

    destNeo4jDatabaseConnection: {},
    destNeo4jDatabaseLabel: 'Neo4j Destination Database',

    viewSettings: {},

    status: "",
    generalDialog: {
      open: false,
      handleClose: this.closeGeneralDialog,
      title: "",
      description: "",
      buttons: [],
    },
    generalTextDialog: {
      open: false,
      handleClose: this.closeGeneralTextDialog,
      title: '',
      text: '',
      placeholder: '',
      setText: this.setGeneralText,
      buttons: []
    },
    loadDialog: {
      searchText: "",
      myOrderBy: "dateUpdated",
      orderDirection: "DESC",
    },
    loadModelDialog: {
      searchText: "",
      myOrderBy: "dateUpdated",
      orderDirection: "DESC",
    },
    shareDialog: {
      open: false,
      handleClose: this.closeShareDialog,
      userRoles: {},
      isPublic: false,
      setIsPublic: (isPublic) => {
          this.setState({
              shareDialog: {
                  ...this.state.shareDialog,
                  isPublic: isPublic
              }
          })
      },
      upsertUser: (email, role) => {
          var { shareDialog } = this.state;
          var { userRoles } = shareDialog;
          // prevent the creator role from being modied
          if (userRoles[email] && userRoles[email].isCreator) {
              // do nothing
          } else {
              userRoles[email] = { email: email, role: role };
              this.setState({
                  shareDialog: {
                      ...shareDialog,
                      userRoles: userRoles
                  }
              })
          }
      },
      removeUser: (email) => {
          var { shareDialog } = this.state;
          var { userRoles } = shareDialog;
          userRoles[email] = { email: email, removeUser: true };
          this.setState({
              shareDialog: {
                  ...shareDialog,
                  userRoles: userRoles
              }
          })
      }
    }
  }

  changeDestinationTabIndex = (event, index) => {
    this.setState(
      {
        destinationTabIndex: index,
      },
      () => {
      }
    );
  };

  convertAvailableMappingDestinations = (availableMappingDestinations) => {
    /*
    {
      key
      propertyDefinition
      nodePattern (optional)
      nodeRelNodePattern (optional)
    }
    */
    var availableDestinationsByNodePattern = {};
    var availableDestinationsByNodeRelNodePattern = {};
    availableMappingDestinations.map(x => {
      if (x.nodePattern) {
        var npArray = availableDestinationsByNodePattern[x.nodePattern.key];
        if (!npArray) {
          npArray = [];
          availableDestinationsByNodePattern[x.nodePattern.key] = npArray;
        }
        npArray.push(x);
      } else if (x.nodeRelNodePattern) {
        var key = `${x.nodeRelNodePattern.startNodePattern.key}_${x.nodeRelNodePattern.relationshipPattern.key}_${x.nodeRelNodePattern.endNodePattern.key}`
        var nrnpArray = availableDestinationsByNodeRelNodePattern[key];
        if (!nrnpArray) {
          nrnpArray = [];
          availableDestinationsByNodeRelNodePattern[key] = nrnpArray;
        }
        nrnpArray.push(x);
      }
    });
    return {
      availableDestinationsByNodePattern,
      availableDestinationsByNodeRelNodePattern
    }
  }

  getAvailableMappingDestinations = () => this.state.availableMappingDestinations;

  // called from the DataMappingBlock after it has processed changes to the cypher pattern 
  //   using the selected data model
  setAvailableMappingDestinations = (availableMappingDestinations) => {

    const { 
      availableDestinationsByNodePattern,
      availableDestinationsByNodeRelNodePattern
    } = this.convertAvailableMappingDestinations(availableMappingDestinations);
    //console.log('available mapping destinations have been updated')
    this.setState({
      availableMappingDestinations: availableMappingDestinations,
      availableDestinationsByNodePattern,
      availableDestinationsByNodeRelNodePattern
    }, () => {
      // we are really hoping that now, finally now, the availableMappingDestinations
      //  will be available for the mapping components to be reloaded
      this.dataMappingDataProvider.finishLoadingFromSaveObject();      
    });

    // setting the state above would have been enough to trigger the DataSource to refresh it's stuff
    //  however, to assist with reloading, etc the React chain is broken and now DataSource
    //  hosts an arbitrary object that then contains the thing that will actually display the 
    //  availableMappingDestinations.  Therefore, we need to explicitly call a refresh method on 
    //  it's ref
    if (this.dataSourceRef.current) {
      this.dataSourceRef.current.setAvailableMappingDestinations(availableMappingDestinations);
    }
  }

  dataChangeListener = (id, messageName, messagePayload) => {
    //console.log('data change');
    //console.log(id, messageName, messagePayload);
    /*
        try {
            throw new Error('printing stack trace');
        } catch (e) {
            console.log(e);
        }
        */
        if (this.state) {
          // clearing this timer because dataChangeTimer will pick up any relevant changes
          this.persistenceHelper.clearRetryTimer();
          if (this.dataChangeTimer) {
            clearTimeout(this.dataChangeTimer);
          }
    
          //this.updateGraphDestinationTab();

          this.setStatus("", false);
          this.communicationHelper.setNetworkStatus(NETWORK_STATUS.UNSAVED); 
          //console.log('setting status to UNSAVED')     ;
          this.dataChangeTimer = setTimeout(() => {
            this.dataChangeTimer = null;
            //console.log('saving data');
            var { loadedMetadata } = this.state;
    
            if (loadedMetadata) {
              const networkStatus = this.props.getNetworkStatus();
              const validNetworkStatuses = [
                NETWORK_STATUS.ONLINE,
                NETWORK_STATUS.NETWORK_RETRY,
                NETWORK_STATUS.UNSAVED,
                NETWORK_STATUS.SAVING,
                NETWORK_STATUS.SAVED,
              ];
              var canvasViewSettings = (this.dataMappingBlockRef.current) ? this.dataMappingBlockRef.current.getViewSettings() : {};
              var graphDocMetadata = {
                ...loadedMetadata,
                dateUpdated: new Date().getTime().toString(),
                viewSettings: {
                  canvasViewSettings: canvasViewSettings,
                },
              };
              if (validNetworkStatuses.includes(networkStatus)) {
                console.log("changeListener: online: calling saveChanges");
                this.saveChanges(
                  messageName,
                  messagePayload,
                  graphDocMetadata,
                  this.getDataProvider()
                );
              } else {
                console.log(
                  "changeListener: online: calling saveGraphDocChangesLocally"
                );
                this.setStatus("Offline. Saved changes locally.", false);
                this.persistenceHelper.saveChangesLocally(
                  messageName, 
                  messagePayload, 
                  graphDocMetadata, 
                  this.getDataProvider()
                );
              }
            }
          }, 2000);
        }    
    }

    onlineNetworkStatusTimer = null;
    setNetworkStatusToOnline = (delayInSeconds) => {
      if (this.onlineNetworkStatusTimer)
        clearTimeout(this.onlineNetworkStatusTimer);
      this.onlineNetworkStatusTimer = setTimeout(() => {
        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.ONLINE);
      }, delayInSeconds * 1000);
    };

    saveChanges = (
      messageName,
      messagePayload,
      graphDocMetadata,
      dataMappingDataProvider
    ) => {
      if (messageName === SyncedEventTypes.GraphDataViewEvent) {
        messageName = messagePayload.messageName;
        messagePayload = messagePayload.messagePayload;
      }
  
      this.setState({
        loadedMetadata: graphDocMetadata,
      });
      var statusMessage =
        this.props.getNetworkStatus() === NETWORK_STATUS.NETWORK_RETRY
          ? "Retrying Autosave..."
          : "Autosaving...";
      this.setStatus(statusMessage, true);
      if (SecurityRole.canEdit()) {
        var previousNetworkStatus = this.props.getNetworkStatus();
        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.SAVING);
  
        const {
          idJoiner,
          graphDocChanges,
          graphDocDeletions,
          resetDataFunc,
        } = dataMappingDataProvider.getDataSaveObj();
  
        this.persistenceHelper.saveRemoteGraphDoc(
          graphDocMetadata,
          idJoiner,
          graphDocChanges,
          graphDocDeletions,
          resetDataFunc,
          (response) => {
            if (response.success) {
              this.setStatus("Saved.", false);
              //console.log('saveRemoteGraphDoc success, we are online');
              dataMappingDataProvider.setIsRemotelyPersisted(true);
              this.communicationHelper.setNetworkStatus(NETWORK_STATUS.SAVED);
              this.setNetworkStatusToOnline(5);
            } else {
              //console.log('saveRemoteGraphDoc failure, calling handleGraphQLError');
              this.communicationHelper.setNetworkStatus(previousNetworkStatus);
              this.communicationHelper.handleGraphQLError(
                response,
                messageName,
                messagePayload,
                graphDocMetadata,
                dataMappingDataProvider
              );
            }
          }
        );
      } else {
        this.setStatus("As a Viewer, these changes will not be saved");
        var now = new Date().getTime();
        if (now > (this.timeBetweenViewerWarning + this.lastTimeViewerWarningDisplayed) 
            && !Object.values(GraphDocChangeType).includes(messageName)
            && messageName !== GraphViewChangeType.CanvasTransformUpdate) {
          alert('As a Viewer, these changes will not be saved', ALERT_TYPES.WARNING);
          this.lastTimeViewerWarningDisplayed = now;
        }
        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.ONLINE);
      }
    };

    timeBetweenViewerWarning = 60 * 1000;
    lastTimeViewerWarningDisplayed = 0;

  constructor(props) {
    super(props);
    props.setSureRef(this);
    this.dataMappingBlockRef = React.createRef();
    this.dataSourceRef = React.createRef();
    this.saveFormRef = React.createRef();
    this.dataModelRef = React.createRef();
    this.destNeo4jDatabaseRef = React.createRef();
    this.generalTextDialogRef = React.createRef();

    this.setDataMappingDataProvider(this.getNewDataMappingDataProvider(), true);
    this.canvasConfig = new CanvasConfig({
      dataProvider: this.dataMappingDataProvider
    });    

    this.persistenceHelper = new PersistenceHelper({
      graphDocContainer: this,
      getNetworkStatus: this.props.getNetworkStatus,
      LOCAL_STORAGE_KEY: this.dataMappingDataProvider.getLocalStorageKey(),
      REMOTE_GRAPH_DOC_TYPE: this.dataMappingDataProvider.getRemoteGraphDocType(),
      SUBGRAPH_MODEL: this.dataMappingDataProvider.getSubgraphModel()
    });

    this.communicationHelper = new CommunicationHelper({
      graphDocContainer: this,
      persistenceHelper: this.persistenceHelper,
      getNetworkStatus: this.props.getNetworkStatus,
      setNetworkStatus: this.props.setNetworkStatus,
      setStatus: this.setStatus,
      showDialog: this.showGeneralDialog,
      GraphDocType: this.dataMappingDataProvider.getRemoteGraphDocType(),
    });    

    this.modelPersistenceHelper = new ModelPersistence({
      getNetworkStatus: this.props.getNetworkStatus,
      setNetworkStatus: this.props.setNetworkStatus,
      getSecurityRole: () => this.state.selectedModelSecurityRole,
      parentContainer: this,
      getStateItem: (item) => {
        var stateItem = null;
        switch (item) {
            case PERSISTENCE_STATE_ITEMS.DataModel:
                stateItem = this.state.selectedDataModel;
                break;
            case PERSISTENCE_STATE_ITEMS.LoadedModelMetadata:
                stateItem = this.state.selectedDataModelMetadata;
                break;
            case PERSISTENCE_STATE_ITEMS.ActiveModelKey:
                stateItem = this.state.selectedDataModelKey;
                break;
            case PERSISTENCE_STATE_ITEMS.LoadDialog:
                stateItem = this.state.loadDialog;
                break;
            default:
                break;
        }
        return stateItem;
      },
      setStateItem: (key, item) => {
        switch (key) {
            case PERSISTENCE_STATE_ITEMS.LoadedModelMetadata:
                this.setState({
                  selectedDataModelMetadata: item
                });
                break;
            default:
                break;
        }
      }        
    });
  }

  getPersistenceHelper = () => this.persistenceHelper;
  getCommunicationHelper = () => this.communicationHelper;

  componentDidMount () {
    var { editHelper } = this.state;
    editHelper.setEditConfirmDelete(this.editConfirmDelete);
    editHelper.setParentContainer(this);
  }

  editConfirmDelete = (title, description, yesAction) => {
    this.showGeneralDialog(title, description, [{
            text: 'Yes',
            onClick: (button, index) => {
                yesAction();
                this.closeGeneralDialog();
            },
            autofocus: false
        },
        {
            text: 'No',
            onClick: (button, index) => this.closeGeneralDialog(),
            autofocus: true
        }]
    );
  }

  getActiveKey = () => this.state.activeKey;

  getTitle = (metadata) => {
    if (!metadata) {
      metadata = this.state.loadedMetadata;
    }

    var title = "";
    if (metadata) {
      title = metadata.title ? metadata.title : "Untitled";
    } else {
      title = `New ${TOOL_HUMAN_NAME}`;
    }
    return title;
  };

  getMenus = () => {
    var menus = [];

    var fileMenuItems = [
      { id: "new", text: `New ${TOOL_HUMAN_NAME}` },
      { id: "load", text: `Load ${TOOL_HUMAN_NAME}` },
      { id: "delete", text: `Delete ${TOOL_HUMAN_NAME}` },
      { id: "divider", text: "_" },
      { id: "save", text: "Edit Info" }
    ];

    //fileMenuItems.push({id: 'share', text: 'Share'});
    //fileMenuItems.push({id: 'saveAs', text: `Clone ${TOOL_HUMAN_NAME}`});

    var fileMenu = {
      id: "datamapping-file",
      text: "File",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "new":
            if (this.communicationHelper.isOnline()) {
              this.new();
            }
            break;
          case "save":
            if (!this.isADocumentSelected()) {
              alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
            } else {
              if (this.communicationHelper.isOnline()) {
                this.setState(
                  {
                    editMetadata: JSON.parse(
                      JSON.stringify(this.state.loadedMetadata)
                    ),
                    saveFormMode: SAVE_MODE.EXISTS,
                    showSaveDialog: true,
                  },
                  () => {
                    this.saveFormRef.current.focusTextBox();
                  }
                );
              }
            }
            break;
          case "delete":
            if (!this.isADocumentSelected()) {
              alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
            } else {
              if (this.communicationHelper.isOnline()) {
                var { activeKey } = this.state;
                var description = `Do you want to delete ${this.getTitle()}?`;
                this.showGeneralDialog("Delete Model", description, [
                  {
                    text: "Yes",
                    onClick: (button, index) => {
                      this.delete(activeKey, () => {
                        //this.new();
                      });
                      this.closeGeneralDialog();
                    },
                    autofocus: false,
                  },
                  {
                    text: "No",
                    onClick: (button, index) => this.closeGeneralDialog(),
                    autofocus: true,
                  },
                ]);
              }
            }
            break;
          case "share":
            if (!this.isADocumentSelected()) {
              alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
            } else {
              if (this.communicationHelper.isOnline()) {
                if (isFeatureLicensed(FEATURES.DATA_MAPPING.Share)) {
                  this.showShare();
                } else {
                  showUpgradeLicenseMessage();
                }
              }
            }
            break;
          case "saveAs":
            if (!this.isADocumentSelected()) {
              alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
            } else {
              if (this.communicationHelper.isOnline()) {
                //this.showSaveAs();
              }
            }
            break;
          case "load":
            if (this.communicationHelper.isOnline()) {
              this.showLoadDialog();
            }
            break;
          default:
            break;
        }
      },
      menuItems: fileMenuItems,
    };
    if (fileMenuItems.length > 0) {
      menus.push(fileMenu);
    }

    var modelMenuId = "datamapping-model";
    var modelMenuItems = [];

    modelMenuItems.push({ id: "chooseModel", text: "Choose Model..." });

    var modelMenu = {
      id: modelMenuId,
      text: "Model",
      handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'chooseModel':
                      //if (!this.isADocumentSelected()) {
                      //alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
                      //} else {
                        this.showLoadModelDialog();
                      //}
                      break;
                    default:
                        break;
                }
      },
      menuItems: modelMenuItems,
    }
    if (modelMenuItems.length > 0) {
        menus.push(modelMenu);
    }

    var dataTransferMenuId = "cypherbuilder-datatransfer";
    var dataTransferMenuItems = [];
    //dataTransferMenuItems.push({ id: "getDataSourceSchema", text: "Get Data Source Schema" });
    //dataTransferMenuItems.push({ id: "runJob", text: "Run Job" });
    //dataTransferMenuItems.push({ id: "runJobAsync", text: "Run Job Async" });
    //dataTransferMenuItems.push({ id: "jobStatus", text: "Job Status" });
    dataTransferMenuItems.push({ id: "getMappingJson", text: "Get Mapping Json" });
    //dataTransferMenuItems.push({ id: "writeMappingJson", text: "Write Mapping Json" });
    dataTransferMenuItems.push({ id: "exportData", text: "Export Data" });

    var dataTransferMenu = {
      id: dataTransferMenuId,
      text: "Data Transfer",
      handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'getDataSourceSchema':
                        this.getDataSourceSchema();
                        break;
                    case 'runJob':
                        //console.log('side to side');
                        this.runJob();
                        break;
                    case 'runJobAsync':
                        //console.log('top to bottom');
                        this.runJobAsync();
                        break;
                    case 'jobStatus':
                        this.jobStatus();
                        break;
                    case 'getMappingJson':
                        this.showMappingJson();
                        break;
                    case 'writeMappingJson':
                        this.writeMappingJson();
                        break;
                    case 'exportData':
                        this.exportData();
                        break;
                      default:
                        break;
                }
      },
      menuItems: dataTransferMenuItems,
    };
    if (dataTransferMenuItems.length > 0) {
        menus.push(dataTransferMenu);
    }

    return menus;
  };

  tryToGoOnline = () => { }

  handleUserSettings = (userSettings) => {

  }

  getDataSourceSchema = () => {
    this.showGeneralTextDialog({title:'Get Schema'}, (text) => {
      getDataSourceSchema(text, (response) => {
        console.log('graphql response: ', response);
      })
      this.closeGeneralTextDialog();
    });
  }

  runJob = () => {
    this.showGeneralTextDialog({title:'Run Job'}, (text) => {
      runJob('BigQuery', {params: text}, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  runJobAsync = () => {
    this.showGeneralTextDialog({title:'Run Job Async'}, (text) => {
      runJobAsync('HopJob', {params: text}, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  jobStatus = () => {
    this.showGeneralTextDialog({title:'Job Status'}, (jobId) => {
      jobStatus(jobId, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  getMappingJson = async () => {
    var { 
      selectedDataModel, 
      selectedDataModelMetadata,
      destNeo4jDatabaseConnection 
    } = this.state;
    if (!selectedDataModel) {
      alert('You need to select a data model first', ALERT_TYPES.WARNING);
      return null;
    } else {
      var { projectId, dataMappingBlocks } = this.dataMappingDataProvider.getDataMappingInfo();
      try {
        var mappingJson = serializeDataMappingsToJson({
          dataModel: selectedDataModel, 
          dataModelMetadata: selectedDataModelMetadata,
          dataMappingBlocks
        });
      } catch (error) {
        alert(error, ALERT_TYPES.WARNING);
        return null;
      }
      var destNeoConnectionInfo = null;
      if (destNeo4jDatabaseConnection && destNeo4jDatabaseConnection.id) {
        destNeoConnectionInfo = await getNeoConnection(destNeo4jDatabaseConnection);
      }
      mappingJson = {
        source: {
          projectId
        },
        dest: {
          neoConnectionInfo: destNeoConnectionInfo
        },
        ...mappingJson
      }
      if (!destNeoConnectionInfo) {
        delete mappingJson.dest;  // it will be added on a different form
      }
      return mappingJson;
    }
  }  

  downloadTextAsFile = (text, fileName) => () => {
    var dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(text);
    downloadUrlAsFile(dataUrl, fileName);
  }

  showMappingJson = async () => {
    //const mappingJson = await this.getMappingJson();
    const mappingJson = await this.getExportDataJson();
    const mappingJsonString = JSON.stringify(mappingJson, null, 2);    
    if (mappingJson) {
      var fileName = this.getExportFileName('data_mapping', 'json');
      var buttons = [
        {
          text: 'Download As File',
          onClick: this.downloadTextAsFile(mappingJsonString, fileName),
          autofocus: true
        },
        {
          text: 'OK',
          onClick: (button, index) => this.closeGeneralTextDialog(),
          autofocus: false
        }
      ];

      this.setState({
        generalTextDialog: {
            ...this.state.generalTextDialog,
            open: true,
            title: 'Mapping Json',
            text: mappingJsonString,
            placeholder: 'Paste contents here',
            buttons: buttons
        }
      }, () => {
        this.generalTextDialogRef.current.focusTextBox();
      });
    }
  }

  getExportFileName (defaultName, extension) {
    var title = this.getTitle();
    var fileName = title.replace(/[^A-Za-z0-9_]/g,'_')
    fileName = (fileName) ? `${fileName}.${extension}` : `${defaultName}.${extension}`;
    return fileName;
  }

  writeMappingJson = async () => {
      const mappingJson = await this.getMappingJson();
      const mappingJsonString = JSON.stringify(mappingJson)
      this.dataMappingDataProvider.writeMappingJson(mappingJsonString);
  }  

  tabActivated = (properties) => {
      properties = properties || {};
      const { setTitle, setMenus } = this.props;
      setTitle(this.getTitle());
      setMenus(this.getMenus(), () => {
        var userInfo = getAuth().getLoggedInUserInfo();
        getUserSettings(userInfo.email, (result) => {
          if (result.success) {
            this.setState({
              userSettings: result.userSettings,
            });
            this.handleUserSettings(result.userSettings);
            /* TODO: fix this
                      if (this.modelLayoutSettingsRef.current) {
                          console.log('setting menu items checkmarks via ref')
                          this.modelLayoutSettingsRef.current.setUserSettings(result.userSettings);
                      }
                      if (this.modelRelationshipLayoutSettingsRef.current) {
                          this.modelRelationshipLayoutSettingsRef.current.setUserSettings(result.userSettings);
                      }
                      */
            /*
                      if (this.modelSecondaryNodeLabelSettingsRef.current) {
                          this.modelSecondaryNodeLabelSettingsRef.current.setUserSettings(result.userSettings);
                      }
                      */
          } else {
            alert("Error retrieving user settings: " + result.error);
          }
        });
      });
      //this.focusTextBox();
  
      this.getMetadataMap(() => {
        var { metadataMap } = this.state;
        var localGraphDocString = this.persistenceHelper.getLocalStorageGraphDocString();
        //var localGraphDocString = null;
        if (localGraphDocString) {
          this.communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
          // need to pull stuff from local storage and set the state appropriately
          //  just as if we had loaded it from the database
          this.communicationHelper.tryToGoOnline();
        } else {
          var { urlParamsId } = properties;
          var { componentLoadedAlready, metadataMap } = this.state;
          var graphDocMetadata = null;
          if (
            !componentLoadedAlready &&
            urlParamsId &&
            metadataMap[urlParamsId]
          ) {
            graphDocMetadata = metadataMap[urlParamsId];
            this.setState({
              componentLoadedAlready: true,
            });
            this.loadDataMapping(graphDocMetadata);
          } else {
            if (!componentLoadedAlready && urlParamsId) {
              alert(
                `No permission or ${this.GraphDocType} does not exist for id ${urlParamsId}`,
                ALERT_TYPES.WARNING
              );
            }
  
            //this.persistenceHelper.loadLastOpenedGraphDocAndDefaultView((graphDocResponse) => {
            this.persistenceHelper.loadLastOpenedGraphDoc(
              (graphDocResponse) => {
                try {
                  //console.log("graphDocResponse", graphDocResponse);
                  //console.log("metadataMap", metadataMap);
                  if (graphDocResponse.success === false) {
                    //this.new();
                  } else {
                    var graphDocMetadata = metadataMap[graphDocResponse.key];
                    if (graphDocMetadata) {
                      graphDocMetadata.viewSettings =
                        graphDocResponse.metadata.viewSettings;
                        /*
                      this.setActiveScenarioBlockDataProvider(
                        graphDocMetadata,
                        graphDocResponse,
                        false
                      );
                      */
                      this.setActiveGraphDoc({
                        graphDocMetadata,
                        lockInfo: graphDocResponse.lockInfo,
                        graphDocObj: graphDocResponse,
                        keepDataChangeFlags: false
                      });
                    } else {
                      //this.new();
                    }
                  }
                } catch (e) {
                  alert(`Error opening ${TOOL_HUMAN_NAME}: ${e.message}`);
                  console.log(e);
                }
              }
            );
          }
        }
      });
  
      //this.setBottomTableHeight();
  }

  saveDataMappingFromSaveForm = () => {
    var { loadedMetadata, editMetadata, saveFormMode } = this.state;
    var properties = { loadedMetadata, editMetadata, saveFormMode };
    return this.saveDataMapping(properties);
  };

  saveDataMapping = (properties) => {
    var { loadedMetadata, editMetadata, saveFormMode } = properties;
    var previousState = JSON.parse(JSON.stringify(loadedMetadata)); // deep copy

    if (
      saveFormMode === SAVE_MODE.TOTALLY_NEW ||
      saveFormMode === SAVE_MODE.NEW
    ) {
      this.reset(editMetadata);
      SecurityRole.setRole(USER_ROLE.OWNER);
    }

    var canvasViewSettings = (this.dataMappingBlockRef.current) ? this.dataMappingBlockRef.current.getViewSettings() : {};

    var graphDocMetadata = {
      ...editMetadata,
      dateCreated: editMetadata.dateCreated
        ? editMetadata.dateCreated
        : new Date().getTime().toString(),
      dateUpdated: new Date().getTime().toString(),
      viewSettings: {
        canvasViewSettings: canvasViewSettings
      },
    };
    this.setState(
      {
        loadedMetadata: graphDocMetadata,
        activeKey: editMetadata.key,
      },
      () => {
        var { loadedMetadata } = this.state;
        this.saveRemoteMetadata(loadedMetadata, previousState, { saveFormMode });
      }
    );
    return graphDocMetadata;
  };

  resetRefs = () => {
    this.doWhen(
      () => {
        this.dataSourceRef.current.reset();        },
      () => this.dataSourceRef.current,
      "Reset data source"
    );

    this.doWhen(
      () => {
        this.dataMappingBlockRef.current.reset();
        //alert('calling resize panels on load')
        this.dataMappingBlockRef.current.resizePanelsOnLoad();
        },
      () => this.dataMappingBlockRef.current,
      "Reset data mapping block"
    );
  }

  reset = (graphDocMetadata) => {
    var dataProvider = this.getNewDataMappingDataProvider(
      graphDocMetadata
    );
    this.clearDataModel();
    this.setDataMappingDataProvider(dataProvider);

    this.setState({
      availableMappingDestinations: [],
      destNeo4jDatabaseConnection: {}      
    });
    this.resetRefs();

    return dataProvider;
  };

  showLoadModelDialog = () => {
    this.getModelMetadataMap(() => {
      this.setState({
        showLoadModelDialog: true,
      });
    });
  };

  addModelPattern = () => {
    const { selectedDataModel } = this.state;
    if (!selectedDataModel) {
      alert('You must select a data model first', ALERT_TYPES.WARNING);
    }

    if (this.dataMappingBlockRef.current) {
      var currentNode;
      var nodeLabelKeyToDisplayNodeMap = {};
      selectedDataModel.getNodeLabelArray().map(nodeLabel => {
        currentNode = this.dataMappingBlockRef.current.addNodePatternFromDataModelEx(nodeLabel, true);
        nodeLabelKeyToDisplayNodeMap[nodeLabel.key] = currentNode;
      });
      selectedDataModel.getRelationshipTypeArray().map(relationshipType => {
        const displayStartNode = nodeLabelKeyToDisplayNodeMap[relationshipType.startNodeLabel.key];
        const displayEndNode = nodeLabelKeyToDisplayNodeMap[relationshipType.endNodeLabel.key];
        
        this.dataMappingBlockRef.current.addRelationshipPatternFromDataModel(relationshipType.type, displayStartNode, displayEndNode, true);
      });
      this.dataMappingBlockRef.current.finishAddingNodes(currentNode);
    }
  }

  getModelMetadataMap = (callback) => {
    const {
      searchText,
      myOrderBy,
      orderDirection,
    } = this.state.loadModelDialog;
    if (searchText) {
      this.setStatus("Searching...", true);
      searchRemoteDataModelMetadata(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleModelMetadataResponse(
            response,
            "searchDataModelsX",
            callback
          );
        }
      );
    } else {
      this.setStatus("Loading...", true);
      listRemoteDataModelMetadata(myOrderBy, orderDirection, (response) => {
        this.setStatus("", false);
        this.handleModelMetadataResponse(response, "listDataModelsX", callback);
      });
    }
  };

  handleMetadataResponse = (response, key, callback) => {
    if (response.success) {
      var data = response.data;
      var metadataMap = {};
      //console.log(data);
      var graphDocs = data && data[key] ? data[key] : [];
      graphDocs.forEach(function (graphDoc) {
        metadataMap[graphDoc.key] = graphDoc.metadata;
      });
      this.setState(
        {
          metadataMap: metadataMap,
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

  handleModelMetadataResponse = (response, key, callback) => {
    if (response.success) {
      var data = response.data;
      var modelMetadataMap = {};
      //console.log(data);
      var dataModels = data && data[key] ? data[key] : [];
      dataModels.forEach((dataModel) => {
        modelMetadataMap[dataModel.key] = dataModel.metadata;
      });
      this.setState(
        {
          modelMetadataMap: modelMetadataMap,
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

  loadRemoteModel = (modelInfo) => {
    this.setStatus("Loading Model...", true);
    if (modelInfo && modelInfo.key) {
      loadRemoteDataModel(modelInfo.key, false, (dataModelResponse) => {
        //console.log(dataModelResponse);
        if (dataModelResponse.success === false) {
          var message = "Error loading model: " + dataModelResponse.error;
          this.setStatus(message, false);
          alert(message);
        } else {
          this.setStatus("", false);
          var dataModel = this.getDataModel();
          dataModel.fromSaveObject(dataModelResponse);
          dataModel.setIsRemotelyPersisted(true);          
          this.handleDataModel(dataModel, dataModelResponse);
        }
      });
      this.handleLoadModelDialogClose();
    } else {
      alert("Unable to load model, the specified model may not exist");
    }
  };

  getSelectedDataModel = () => this.state.selectedDataModel;  

  getDataModel = () => {
    if (this.state && this.state.selectedDataModel && this.modelPersistenceHelper) {
        this.state.selectedDataModel.removeDataChangeListener(this.modelPersistenceHelper.dataModelChangeListener);
    }
    var selectedDataModel = DataModel();
    if (this.modelPersistenceHelper) {
      selectedDataModel.addDataChangeListener(this.modelPersistenceHelper.dataModelChangeListener);
    }
    return selectedDataModel;
  }

  handleDataModel = (dataModel, dataModelResponse) => {
    //this.dataMappingDataProvider.setDataModelKey(dataModelResponse.key);
    if (this.dataModelRef.current) {
      this.dataModelRef.current.resetCanvas();
    }
    this.setState(
      {
        selectedDataModel: dataModel,
        selectedDataModelKey: dataModelResponse.key,
        selectedDataModelMetadata: dataModelResponse.metadata,
        selectedDataModelText: this.getSelectedModelText(
          dataModelResponse.metadata
        ),
      },
      () => {
        if (this.dataMappingBlockRef.current) {
          this.dataMappingBlockRef.current.handleDataModel(dataModel, dataModelResponse.key, () => {
            // finish loading everything that depends on the data model / availableMappingDestinations
            this.dataMappingDataProvider.finishLoadingFromSaveObject();
          });
        }

        const { editHelper } = this.state;
        var modelInfo = dataModelResponse.metadata;
        var userRole = modelInfo.userRole;
        if (modelInfo.isPublic && !userRole) {
            userRole = USER_ROLE.VIEWER;
        }
        var selectedModelSecurityRole = new DocumentSecurityRole();
        selectedModelSecurityRole.setRole(userRole);
        this.setState({
          selectedModelSecurityRole: selectedModelSecurityRole
        });  

        dataModel.setIsRemotelyPersisted(true);
        editHelper.setDataModel(dataModel);
        this.dataMappingDataProvider.handleDataModel(dataModel, dataModelResponse.key);
      }
    );
  };

  new = () => {
    var { metadataMap, loadedMetadata } = this.state;
    var cancelMetadata = JSON.parse(JSON.stringify(loadedMetadata));

    var newMetadata = getMetadata(NEW_DOCUMENT_TITLE);
    var deepMetadataCopy = JSON.parse(JSON.stringify(newMetadata));
    var saveFormMode =
      Object.keys(metadataMap).length > 0
        ? SAVE_MODE.NEW
        : SAVE_MODE.TOTALLY_NEW;

    this.setState(
      {
        saveFormMode: saveFormMode,
        cancelMetadata: cancelMetadata,
        loadedMetadata: newMetadata,
        editMetadata: deepMetadataCopy,
        showSaveDialog: true,
      },
      () => {
        if (saveFormMode === SAVE_MODE.TOTALLY_NEW) {
          this.props.setTitle(this.getTitle());
        }
        if (this.saveFormRef.current) {
          this.saveFormRef.current.focusTextBox();
        }
        this.addToWebHistory(newMetadata);
      }
    );
  };

  delete = (key, successCallback) => {
    var { metadataMap, loadedMetadata, activeKey } = this.state;
    this.setStatus("Deleting...", true);

    if (key !== activeKey) {
      alert('Issue Workaround: You can only delete the active document. To delete other documents, please load them first.', ALERT_TYPES.WARNING);
      this.setStatus("Delete cancelled", {fullScreenBusy: false});
      return;
    }

    const allKeys = [key, this.dataMappingDataProvider.getSubGraphViewKey()];

    this.persistenceHelper.deleteRemoteGraphDocs(allKeys, (response) => {
      if (response.success) {
        this.setStatus("Deleted.", false);
        delete metadataMap[key];
        if (loadedMetadata && loadedMetadata.key === key) {
          // we have deleted the currently active model, therefore we must set activeKey to ''
          var newMetadata = getMetadata(NEW_DOCUMENT_TITLE);
          this.reset(newMetadata);
          activeKey = "";
          loadedMetadata = newMetadata;
        }

        this.setState(
          {
            activeKey: activeKey,
            metadataMap: metadataMap,
            loadedMetadata: loadedMetadata,
          },
          () => {
            this.props.setTitle(this.getTitle());
          }
        );
        if (successCallback) {
          successCallback();
        }
      } else {
        if (
          response.error.message.match(
            /Failed to invoke procedure `apoc.util.validate`: Caused by: java.lang.RuntimeException: locked by user/
          )
        ) {
          var actions = [
            {
              text: "Grab lock and Delete",
              onClick: (button, index) => {
                this.setStatus("Grabbing lock", true);
                this.persistenceHelper.grabLock(key, (response) => {
                  if (response.success) {
                    console.log("deleting model after lock grant");
                    alert("Lock grabbed. Performing delete.", ALERT_TYPES.INFO);
                    this.delete(key, successCallback);
                  } else {
                    this.setStatus(response.error, false);
                    alert(response.error);
                  }
                  this.closeGeneralDialog();
                });
              },
              autofocus: false,
            } /*,
                        {
                            text: 'Cancel',
                            onClick: (button, index) => this.closeGeneralDialog(),
                            autofocus: true
                        }*/,
          ];
          this.handleLockedDataMapping(response.error.message, actions);
        } else {
          this.setStatus(response.error, false);
          alert(response.error);
        }
      }
    });
  };

  handleLockedDataMapping = (errorStr, actions) => {
    var matches = errorStr.match(/locked by user '(.+)' at (.+)/);
    var description = `${TOOL_HUMAN_NAME} is locked`;
    if (matches[1] && matches[2]) {
      description = `${TOOL_HUMAN_NAME} was locked by ${
        matches[1]
      } at ${new Date(parseInt(matches[2])).toLocaleString()}.
                Your version may be out of date. Please consider reloading before editing. What would you like to do?`;
    }
    this.showGeneralDialog(
      `${TOOL_HUMAN_NAME} is Locked`,
      description,
      actions
    );
  };

  recordMetadataChanges = (key, value) => {
    var { editMetadata } = this.state;
    this.setState({
      editMetadata: {
        ...editMetadata,
        [key]: value,
      },
    });
  };

  addToWebHistory = (graphDocMetadata) => {
    var url = `/tools/${TOOL_NAMES.DATA_MAPPING}/${graphDocMetadata.key}`;
    var title = `${graphDocMetadata.title}`;
    console.log(`adding ${url} to history`);
    window.history.pushState(
      { tool: TOOL_NAMES.DATA_MAPPING, modelKey: graphDocMetadata.key },
      title,
      url
    );
  };

  clearDataModel = () => {
    //this.scenarioBlockDataProvider.setDataModelKey(null);
    this.setState({
      selectedDataModel: null,
      selectedDataModelKey: "",
      selectedDataModelMetadata: null,
      selectedDataModelText: this.getSelectedModelText(),
    });

    if (this.dataModelRef.current) {
      this.dataModelRef.current.resetCanvas();
    }
  };

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

  isADocumentSelected = () => {
    var { activeKey } = this.state;
    return (activeKey) ? true : false;
  } 

  getBottomDrawerHeight = () => 0;
    
  scrollIntoView = ({ domElement, detailsDomElement }) => {
      const elementRect = domElement.getBoundingClientRect();
      const addControlElement = document.getElementById(
        DomIds.AddModelPattern
      );
      const addControlRect = addControlElement.getBoundingClientRect();
      const mainEl = document.getElementById(DomIds.Main);
  
      const topOfViewport = addControlRect.y + addControlRect.height + 20;
      const bottomOfViewport =
        window.innerHeight - pxVal(this.getBottomDrawerHeight()) - 30;
      var scrollChange = 0;
  
      if (elementRect.bottom > bottomOfViewport) {
        scrollChange = elementRect.bottom - bottomOfViewport;
      }
  
      // this one takes precedence
      if (elementRect.y - scrollChange < topOfViewport) {
        scrollChange = elementRect.y - topOfViewport;
      }
  
      if (scrollChange) {
        mainEl.scrollTop += scrollChange;
      }
  
      /*
          console.log('scrollChange: ', scrollChange);
          console.log('scrollTopMain: ', mainEl.scrollTop);
          console.log('newScrollTopMain: ', mainEl.scrollTop);
          console.log('elementRect: ', elementRect);
          console.log('addControlRect: ', addControlRect);
          */
  
      // - pulse new block
      setTimeout(() => {
        detailsDomElement.classList.add("focusBlock");
        setTimeout(
          () => detailsDomElement.classList.remove("focusBlock"),
          250
        );
      }, 100);
  };

  setNeo4jDestDatabase = (dbConnection) => {
    this.setState({
        destNeo4jDatabaseConnection: dbConnection
    })
    this.dataMappingDataProvider.setNeo4jDestDatabase(dbConnection);
  }

  buildNodeKeyPropMap = (dataMapping) => {
    // for each item in nodeDataMappings, make a map with NodeLabel String as key, NodeLabel key property keys as the values

    var nodePatternToKeyPropMap = {};
    Object.values(dataMapping.nodeDataMappings).map(nodeDataMapping => {
      
      var nodeLabelVariable = nodeDataMapping.destination.nodePattern.variable;
      var nodeLabelString = nodeDataMapping.destination.nodePattern.nodeLabels[0];
      var mapKey = `${nodeLabelVariable}_${nodeLabelString}`;
      var keyPropMap = nodePatternToKeyPropMap[mapKey];
      if (!keyPropMap) {
        keyPropMap = {
          nodeLabelString: nodeLabelString,
          nodeLabelVariable: nodeLabelVariable,
          keyPropList: []
        };
        nodePatternToKeyPropMap[mapKey] = keyPropMap;
      }
  
      const propDef = nodeDataMapping.destination.propertyDefinition;
      //if (propDef.isPartOfKey || propDef.hasUniqueConstraint) {
      // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects                        
      if (propDef.isPartOfKey) {  
        if (!keyPropMap.keyPropList.includes(propDef.key)) {
          keyPropMap.keyPropList.push(propDef.key);
        }
      }
    });
    return nodePatternToKeyPropMap;
  }

  addNodeLabelNotFoundError = (nodeLabelString, nodeLabelVariable, errors) => {
    var errorMessage = '';
    if (nodeLabelString) {
      errorMessage = `Cannot find '${nodeLabelString}' in data model`;
    } else {
      errorMessage = `No Node Label defined for '${nodeLabelVariable || '<no variable>'}'`;
    }
    if (!errors.includes(errorMessage)) {
      errors.push(errorMessage);
    }
}

  validateNodeMappings = (dataMappings) => {
    const { selectedDataModel } = this.state;
    var errors = [];

    // each dataMapping block has a copy of the cypherPattern
    //   just in case it is different (as of 11/02/2021 it shouldn't be) we will combine into one master map
    var completeNodePatternMap = {};
    dataMappings.map(dataMapping => {
      Object.keys(dataMapping.cypherPatterns.nodePatternMap).map(nodePatternKey => {
        var nodePattern = dataMapping.cypherPatterns.nodePatternMap[nodePatternKey];
        var nodeKey = `${nodePattern.variable}_${nodePattern.nodeLabels[0]}`
        completeNodePatternMap[nodeKey] = dataMapping.cypherPatterns.nodePatternMap[nodePatternKey];
      });
    });

    var badResult = null;
    Object.values(completeNodePatternMap).map(nodePattern => {
      // we must find the node key for the given node pattern
      
      var foundIt = false;
      var errorMessage = '';

      const nodeLabelVariable = nodePattern.variable;
      const nodeLabelString = nodePattern.nodeLabels[0];
      var nodeKey = `${nodeLabelVariable}_${nodeLabelString}`

      const nodeLabel = selectedDataModel.getNodeLabelByLabel(nodeLabelString);
      if (!nodeLabel) {
        this.addNodeLabelNotFoundError(nodeLabelString, nodeLabelVariable, errors);
      }

      if (nodeLabel) {
        for (var i = 0; i < dataMappings.length; i++) {
          var dataMapping = dataMappings[i];
          var nodePatternToKeyPropMap = this.buildNodeKeyPropMap(dataMapping);

          var mapEntry = nodePatternToKeyPropMap[nodeKey];
          var keyPropList = (mapEntry && mapEntry.keyPropList) ? mapEntry.keyPropList : [];
          var result = this.checkIfNodeKeysMapped(nodeLabel, keyPropList);
          if (result.isMapped) {
            foundIt = true;
            break;
          } else {
            badResult = result;
          }
        }
      }

      if (!foundIt) {
        errors.push(this.getMissingNodeKeyErrorMessage(nodeLabelVariable, nodeLabelString, badResult));
      }
    });

    return errors;
  }

  validateRelationships = (dataMappings) => {
    const { selectedDataModel } = this.state;
    // each dataMapping block has a copy of the cypherPattern
    //   just in case it is different (as of 11/02/2021 it shouldn't be) we will combine into one master map
    var completeRelPatternMap = {};
    dataMappings.map(dataMapping => {
      Object.keys(dataMapping.cypherPatterns.relationshipPatternMap).map(relationshipPatternKey => {
        completeRelPatternMap[relationshipPatternKey] = dataMapping.cypherPatterns.relationshipPatternMap[relationshipPatternKey];
      });
    });

    var errors = [];
    var badStartResult = null;
    var badEndResult = null;

    Object.values(completeRelPatternMap).map(relPattern => {
      // look for defined relationship type
        // within the same dataMapping block, we must find the node key for
        // both the start and end relationship. 
      
      var foundIt = false;
      var errorMessage = '';

      const startNodeLabelVariable = relPattern.startNodePattern.variable;
      const startNodeLabelString = relPattern.startNodePattern.nodeLabels[0];
      var startKey = `${startNodeLabelVariable}_${startNodeLabelString}`

      const endNodeLabelVariable = relPattern.endNodePattern.variable;
      const endNodeLabelString = relPattern.endNodePattern.nodeLabels[0];
      var endKey = `${endNodeLabelVariable}_${endNodeLabelString}`

      const startNodeLabel = selectedDataModel.getNodeLabelByLabel(startNodeLabelString);
      if (!startNodeLabel) {
        this.addNodeLabelNotFoundError(startNodeLabelString, startNodeLabelVariable, errors);        
      }
      const endNodeLabel = selectedDataModel.getNodeLabelByLabel(endNodeLabelString);
      if (!endNodeLabel) {
        this.addNodeLabelNotFoundError(endNodeLabelString, endNodeLabelVariable, errors);        
      }
      if (startNodeLabel && endNodeLabel) {
        for (var i = 0; i < dataMappings.length; i++) {
          var dataMapping = dataMappings[i];
          var nodePatternToKeyPropMap = this.buildNodeKeyPropMap(dataMapping);

          var startMapEntry = nodePatternToKeyPropMap[startKey];
          var endMapEntry = nodePatternToKeyPropMap[endKey];

          var startKeyPropList = (startMapEntry && startMapEntry.keyPropList) ? startMapEntry.keyPropList : [];
          var endKeyPropList = (endMapEntry && endMapEntry.keyPropList) ? endMapEntry.keyPropList : [];

          var startResult = this.checkIfNodeKeysMapped(startNodeLabel, startKeyPropList);
          var endResult = this.checkIfNodeKeysMapped(endNodeLabel, endKeyPropList);
          if (startResult.isMapped && endResult.isMapped) {
            foundIt = true;
            break;
          } else {
            if (!startResult.isMapped) badStartResult = startResult;
            if (!endResult.isMapped) badEndResult = endResult;
          }
        }
      } 
      if (!foundIt) {
        var relType = relPattern.relationshipPattern.type;
        var relString = `(:${startNodeLabelString})-[:${relType}]->(:${endNodeLabelString})`;
        var errorMessage = `For '${relString}', start and end node keys must be mapped in the same block: `;
        var startResultError = false;
        if (!startResult.isMapped) {
          errorMessage += this.getMissingNodeKeyErrorMessage(startNodeLabelVariable, startNodeLabelString, startResult);
          startResultError = true;
        }
        if (!endResult.isMapped) {
          if (startResultError) {
            errorMessage += '. ';
          }
          errorMessage += this.getMissingNodeKeyErrorMessage(endNodeLabelVariable, endNodeLabelString, endResult);
        }
        errors.push(errorMessage);            
      }
    });
    return errors;
  }

  validateDataMappings = (dataMappings) => {
    if (dataMappings.length === 0) {
      alert('You need at least 1 data mapping', ALERT_TYPES.WARNING);
      return false;
    }
    const { selectedDataModel } = this.state;
    if (!selectedDataModel) {
      alert('You must select a data model', ALERT_TYPES.WARNING);
      return false;
    }

    var errors = this.validateNodeMappings(dataMappings);
    errors = errors.concat(this.validateRelationships(dataMappings));

    // TODO: remove below line when finished with validations
    //var errors = [];
  
    if (errors.length > 0) {
      const errorMsg = errors.map((x, i) => {
        return (
          <ListItem>
            <ListItemText primary={`${i+1}) ${x}`} />
          </ListItem>          
        )
      });
      alert("There are validation errors", ALERT_TYPES.WARNING, {}, <List>{errorMsg}</List>);
      return false;
    } else {
      return true;
    }
  }

  getMissingNodeKeyErrorMessage = (nodeLabelVariable, nodeLabelString, nodeKeyCheckResult) => {

    nodeKeyCheckResult = nodeKeyCheckResult || { missingProps: [] };
    var propList = nodeKeyCheckResult.missingProps.map(x => x.name).join(', ')

    if (nodeKeyCheckResult.type === 'nodeKey') {
      return `These properties need to be mapped for '${nodeLabelVariable}:${nodeLabelString || ''}': ${propList}`;
    } else if (nodeKeyCheckResult.type === 'nodeKeyNotDefined') {
      return `You need to define a node key for '${nodeLabelString}' in the data model`;
    } else if (nodeKeyCheckResult.type === 'uniqueConstraint') {
      return `At least 1 of these properties needs to be mapped for '${nodeLabelVariable}:${nodeLabelString || ''}': ${propList}`;
    } else {
      return `Node key properties not mapped for '${nodeLabelVariable}:${nodeLabelString || ''}'`;
    }
  }

  checkIfNodeKeysMapped = (nodeLabel, propKeysMapped) => {
    const nodeLabelProps = Object.values(nodeLabel.properties);
    const nodeKeyProps = nodeLabelProps.filter(x => x.isPartOfKey);
    if (nodeKeyProps.length > 0) {
      const missingProps = nodeKeyProps  
        .filter(x => !propKeysMapped.includes(x.key));
      if (missingProps.length > 0) {
        return {
          isMapped: false,
          type: 'nodeKey',
          missingProps
        };
      } else {
        return {
          isMapped: true
        };
      }
    } else {
      /*
      const uniqueConstraintProps = nodeLabelProps.filter(x => x.hasUniqueConstraint)
      const atLeastOneUniquePropMapped = uniqueConstraintProps.some(x => propKeysMapped.includes(x.key));
      if (atLeastOneUniquePropMapped) {
        return {
          isMapped: true
        } 
      } else {
        return {
          isMapped: false,
          type: 'uniqueConstraint',
          missingProps: uniqueConstraintProps
        }
      }*/
      // Eric Note 2/25/2022: changing to just isPartOfKey because that is what Hop expects      
      return {
        isMapped: false,
        type: 'nodeKeyNotDefined',
        missingProps: []
      }
    }
  }

  exportData = () => {
    if (this.dataSourceRef.current) {
      const dataSourceType = this.dataSourceRef.current.getDataSourceType() || DataSourceTypes.BigQuery;
      if (dataSourceType === DataSourceTypes.BigQuery) {
        this.exportBigQueryToNeo();
      } else if (dataSourceType === DataSourceTypes.Neo4j) {
        this.exportNeoToNeo();
      }
    }
  }

  getExportDataJson = async () => {
    var json = {};
    if (this.dataSourceRef.current) {
      const dataSourceType = this.dataSourceRef.current.getDataSourceType() || DataSourceTypes.BigQuery;
      if (dataSourceType === DataSourceTypes.BigQuery) {
        json = await this.getExportBigQueryToNeoJson();
      } else if (dataSourceType === DataSourceTypes.Neo4j) {
        json = await this.getExportNeoToNeoJson();
      }
    }
    return json;
  }

  getExportBigQueryToNeoJson = async () => {
    const { destNeo4jDatabaseConnection, destNeo4jDatabaseLabel } = this.state;
    const mappingJson = await this.getMappingJson();
    if (mappingJson) {
      const isValid = this.validateDataMappings(mappingJson.dataMappings)
      if (isValid) {
        if (destNeo4jDatabaseConnection && destNeo4jDatabaseConnection.id) {
          const destNeoConnectionInfo = await getNeoConnection(destNeo4jDatabaseConnection);
  
          const newMappingJson = {
            pipelineOptions: this.getPipelineOptions(),
            source: mappingJson.source,
            dest: {
              neoConnectionInfo: destNeoConnectionInfo
            },
            ...mappingJson
          }
          return newMappingJson;
        } else {
          alert(`You must select a ${destNeo4jDatabaseLabel}`, ALERT_TYPES.WARNING);
        }
      } 
    }
    return null;
  }

  exportBigQueryToNeo = async () => {
    const serviceID = "bigquery-neo4j-incremental";
    const newMappingJson = await this.getExportBigQueryToNeoJson();
    if (newMappingJson) {
      const mappingJsonString = JSON.stringify(newMappingJson);

      const { activateTool } = this.props;
      
      runWorkflow(serviceID, mappingJsonString, (response) => {
        var customButton = (activateTool) ? {
          onClick: () => activateTool(TOOL_NAMES.DATA_SCIENCE_DASHBOARD),
          text: 'Monitor Job'
        } : null;
        alert('The BigQuery to Neo4j job has been submitted', ALERT_TYPES.INFO, {}, customButton);
      });
    }
  }

  getExportNeoToNeoJson = async () => {
    const {
      destNeo4jDatabaseConnection,
      destNeo4jDatabaseLabel,
      selectedDataModel, 
      selectedDataModelMetadata          
    } = this.state;

    var sourceNeo4jDatabaseConnection = null;
    var sourceNeo4jDatabaseLabel = null;

    if (this.dataSourceRef.current) {
      sourceNeo4jDatabaseConnection = this.dataSourceRef.current.getNeo4jDatabaseConnection();
      sourceNeo4jDatabaseLabel = this.dataSourceRef.current.getNeo4jDatabaseLabel();
    }

    var { dataMappingBlocks } = this.dataMappingDataProvider.getDataMappingInfo();
    try {
      var mappingJson = serializeDataMappingsToJson({
        dataModel: selectedDataModel, 
        dataModelMetadata: selectedDataModelMetadata,
        dataMappingBlocks,
        dataSourceType: DataSourceTypes.Neo4j
      });
    } catch (error) {
      alert(error, ALERT_TYPES.WARNING);
      return null;
    }
    const isValid = this.validateDataMappings(mappingJson.dataMappings)
    if (isValid) {
      var connections = await getNeoConnections({
        sourceNeo4jDatabaseConnection,
        sourceNeo4jDatabaseLabel,
        destNeo4jDatabaseConnection,
        destNeo4jDatabaseLabel
      });

      if (connections) {
        const {
          sourceNeoConnectionInfo,
          destNeoConnectionInfo
        } = connections;

        var mappingJsonWithSourceDest = {
          sourceIsCypher: "true",   // to let Hop know to expect a Cypher statement as the source input, to switch the workflow handling
          pipelineOptions: this.getPipelineOptions(),
          source: {
            neoConnectionInfo: sourceNeoConnectionInfo
          },
          dest: {
              neoConnectionInfo: destNeoConnectionInfo
          },
          metadata: mappingJson.metadata,
          dataModel: mappingJson.dataModel,
          dataMappings: mappingJson.dataMappings
        }
        return mappingJsonWithSourceDest;
      }
    }
    return null;
  }

  getPipelineOptions = () => {
    const { parallelRelationships } = this.state;
    return { parallelRelationships };
  }

  exportNeoToNeo = async () => {
    const mappingJsonWithSourceDest = await this.getExportNeoToNeoJson();
    if (mappingJsonWithSourceDest) {
      callExportService(mappingJsonWithSourceDest, this.props.activateTool);
    }
  }

  setParallelRelationships = (value) => {
    const dataProvider = this.getDataProvider();
    this.setState({
      parallelRelationships: value
    })
    dataProvider.setParallelRelationships(value);
  }

  render = () => {
    const { 
      selectedDataModel, 
      selectedDataModelText,
      availableMappingDestinations,
      availableDestinationsByNodePattern,
      availableDestinationsByNodeRelNodePattern,
      generalDialog,
      generalTextDialog,
      showSaveDialog,
      showLoadDialog,
      showLoadModelDialog,
      modelMetadataMap,
      saveFormMode,
      editMetadata,
      metadataMap,
      destinationTabIndex,
      destNeo4jDatabaseConnection,
      destNeo4jDatabaseLabel,
      parallelRelationships
    } = this.state;

    const destNeo4jDatabaseName = destNeo4jDatabaseConnection.name || '<Select a Neo4j database>'

    return (

      <div id={DomIds.DataMapping} style={{
          display: 'flex', 
          flexFlow: 'row', 
          height: 'calc(100vh - 80px)',
          margin: '4px',
        }}>
        {this.isADocumentSelected() ?
          <>
            <div style={{width: `${Sizes.LeftWidthPercent}%`, margin: '4px', padding: '2px', borderRight: '1px solid lightgray'}}>
              <DataSource 
                  ref={this.dataSourceRef}
                  dataModel={selectedDataModel}
                  getDataProvider={this.getDataProvider}
                  parentContainer={this}
                  availableMappingDestinations={availableMappingDestinations}
              />
              
            </div>
            <div style={{width: `${Sizes.RightWidthPercent}%`, margin: '4px'}}>
              <div style={{ display: "flex", flexFlow: "row" }}>
                  <SelectDatabaseField
                    label={destNeo4jDatabaseLabel}
                    labelStyle={{minWidth: '14em', marginLeft: '0em', paddingLeft: "0.5em" }}
                    databaseStyle={{minWidth: '20em'}}
                    selectedDatabaseText={destNeo4jDatabaseName}
                    onClick={() => {
                        if (this.destNeo4jDatabaseRef.current) {
                            this.destNeo4jDatabaseRef.current.showDialog();
                        } else {
                            alert('Error showing database dialog, ref is not current');
                        }
                    }}
                />
                <OutlinedStyledButton onClick={this.exportData} color="primary"
                        style={{marginLeft: '1em', height:'2em'}}>
                    Export Data
                </OutlinedStyledButton>
                <PipelineOptionsButton style={{marginLeft: '-.5em', marginTop: '-.1em'}}
                  parallelRelationships={parallelRelationships} 
                  setParallelRelationships={this.setParallelRelationships}
                />
              </div>
              <div style={{ display: "flex", flexFlow: "row" }}>
                <div
                  style={{ display: "flex", flexFlow: "row", marginTop: ".7em" }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                      paddingLeft: "0.5em",
                      paddingRight: "0.5em",
                      minWidth: '14em'
                    }}
                  >
                    Data Model:{" "}
                  </span>
                  <span style={{
                    whiteSpace: "nowrap",
                    borderBottom: '1px solid gray',
                    marginBottom: '.5em',
                    cursor: 'pointer',
                    minWidth: '20em'
                  }} onClick={this.showLoadModelDialog}>
                    {selectedDataModelText}
                  </span>
                </div>
                <Tooltip enterDelay={600} arrow title={`Add entire model as graph pattern`}>
                  <OutlinedStyledButton
                    id={DomIds.AddModelPattern}
                    onClick={this.addModelPattern}
                    style={{ marginLeft: "1em", height: "2em" }}
                    color="primary"
                  >
                    <span style={{ whiteSpace: "nowrap" }}>Add Model Pattern</span>
                  </OutlinedStyledButton>
                </Tooltip>
              </div>
              <Tabs
                orientation="horizontal"
                variant="scrollable"
                value={destinationTabIndex}
                onChange={this.changeDestinationTabIndex}
              >
                <Tab label="Graph Destination" />
                <Tab label="Graph Load Pattern" />
              </Tabs>
              <TabPanel value={destinationTabIndex} index={TabIndexes.GraphDestination}>
                <DataMappingBlock
                      key='DataMapping_dataMappingBlock'
                      ref={this.dataMappingBlockRef}
                      cypherBlockKey='key1'
                      blockId='dataMappingBlock'
                      getViewSettings={this.getViewSettings}
                      getDataProvider={this.getDataProvider}
                      dataChangeListener={this.dataChangeListener}
                      widthPercent={Sizes.RightWidthPercent}
                      canvasConfig={this.canvasConfig}
                      parentContainer={this}
                  />
              </TabPanel>
              <TabPanel value={destinationTabIndex} index={TabIndexes.GraphLoadPattern}>
                {
                  Object.values(availableDestinationsByNodePattern).map((array,index) => {
                    const nodePattern = array[0].nodePattern;
                    return (
                      <AccordionBlockNoDrag
                        key={nodePattern.key}
                        blockKey={nodePattern.key}
                        domId={`np_accordion_${nodePattern.key}`}
                        expanded={true}
                        selected={false}
                        scrollIntoView={() => {}}
                        toggleAccordionPanel={() => {}}
                        selectAccordionPanel={() => {}}
                        removeAccordionPanel={() => {}}
                        showToggleTool={false}
                        parentContainer={this}
                        dataProvider={{
                          getTitle: () => getNodePatternDescription(nodePattern)
                        }}
                        addMode={false}
                        rightWidthOffset={0}                
                        firstBlock={index === 0}
                    >
                      <div style={{display:'flex', flexFlow: 'column'}}>
                        {
                          array.map(mapping => 
                            <div style={{borderBottom: '1px solid lightgray'}}>
                              {mapping.propertyDefinition.name}
                            </div>
                          )
                        }
                      </div>
                    </AccordionBlockNoDrag>
                    )
                  })
                }
                {
                  Object.keys(availableDestinationsByNodeRelNodePattern).map((key,index) => {
                    var array = availableDestinationsByNodeRelNodePattern[key];
                    const nodeRelNodePattern = array[0].nodeRelNodePattern;
                    return (
                      <AccordionBlockNoDrag
                        key={key}
                        blockKey={key}
                        domId={`nrnp_accordion_${key}`}
                        expanded={true}
                        selected={false}
                        scrollIntoView={() => {}}
                        toggleAccordionPanel={() => {}}
                        selectAccordionPanel={() => {}}
                        removeAccordionPanel={() => {}}
                        showToggleTool={false}
                        parentContainer={this}
                        dataProvider={{
                          getTitle: () => getNodeRelNodePatternDescription(nodeRelNodePattern)
                        }}
                        addMode={false}
                        rightWidthOffset={0}                
                        firstBlock={index === 0}
                    >
                      <div style={{display:'flex', flexFlow: 'column'}}>
                        {
                          array.map(mapping => 
                            <div style={{borderBottom: '1px solid lightgray'}}>
                              {mapping.propertyDefinition.name}
                            </div>
                          )
                        }
                      </div>
                    </AccordionBlockNoDrag>
                    )
                  })
                }
              </TabPanel>
            </div>
          </>
        :
        <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
          <span>No {TOOL_HUMAN_NAME} Document Loaded. Select 
              <span className='textMenuReference'> File &gt; New {TOOL_HUMAN_NAME}</span> or 
              <span className='textMenuReference'> File &gt; Load {TOOL_HUMAN_NAME}</span> 
              {/*}
              , or 
              <span className='textMenuReference'> Import </span>
              */}
              &nbsp;to get started.
          </span>
        </Typography>
        }
        <SaveForm
          maxWidth={"sm"}
          open={showSaveDialog}
          onClose={this.handleSaveDialogClose}
          ref={this.saveFormRef}
          save={this.saveDataMappingFromSaveForm}
          cancel={this.handleSaveDialogClose}
          mode={saveFormMode}
          graphDocMetadata={editMetadata}
          documentName={DOCUMENT_NAME}
          recordMetadataChanges={this.recordMetadataChanges}
        />
        <LoadForm
          maxWidth={"lg"}
          open={showLoadDialog}
          onClose={this.handleLoadDialogClose}
          load={this.loadDataMapping}
          cancel={this.handleLoadDialogClose}
          delete={this.delete}
          toolHumanName={TOOL_HUMAN_NAME}
          performSearch={this.performSearch}
          metadataMap={metadataMap}
        />
        <LoadModelForm
          maxWidth={"lg"}
          open={showLoadModelDialog}
          onClose={this.handleLoadModelDialogClose}
          load={this.loadRemoteModel}
          cancel={this.handleLoadModelDialogClose}
          disableDelete={true}
          performModelSearch={this.performModelSearch}
          modelMetadataMap={modelMetadataMap}
        />
        <GeneralDialog
          open={generalDialog.open}
          onClose={generalDialog.handleClose}
          title={generalDialog.title}
          description={generalDialog.description}
          buttons={generalDialog.buttons}
        />
        <GeneralTextDialog maxWidth={'md'} open={generalTextDialog.open} onClose={generalTextDialog.handleClose}
          ref={this.generalTextDialogRef}
          title={generalTextDialog.title} placeholder={generalTextDialog.placeholder}
          text={generalTextDialog.text} setText={generalTextDialog.setText}
          buttons={generalTextDialog.buttons} rows={15} />
        <SelectNeo4jDatabase                 
            ref={this.destNeo4jDatabaseRef}       
            setStatus={this.setStatus}                 
            onSelectDatabase={this.setNeo4jDestDatabase}
        />
      </div>
    )
  }

}
