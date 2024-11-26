import React, { Component } from "react";
import { Button, Drawer, Tabs, Tab, Typography, Tooltip } from "@material-ui/core";
//import { CypherEditor } from "graph-app-kit/components/Editor";
//import CypherEditor from "react-codemirror-cypher";
import { CypherEditor } from '@neo4j-cypher/react-codemirror'; 
import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";

import "../../common/css/react-resizable.css";

import { 
  getConnectionInfoWithEncryptedUsernameAndPassword 
} from '../../common/Cypher';
import { exportResults } from "./components/exportResults";
import { TabPanel } from "../../components/common/Components";
import GeneralDialog from "../../components/common/GeneralDialog";
import GeneralTextDialog from '../../components/common/GeneralTextDialog';

import { ValidationStatus } from '../common/validation/ValidationStatus';
import { getValidationIcon } from '../common/validation/ValidationSection';
import CypherValidation from './components/CypherValidation'

import { getAuth } from "../../auth/authUtil";

import DataModel from "../../dataModel/dataModel";
import { CANVAS_MESSAGES } from "../../components/canvas/d3/graphCanvas";
import { GraphDebugCanvasConfig } from "./components/graphCanvas/graphDebugCanvasConfig";

import { CONTAINER_CALLBACK_MESSAGES } from '../../components/canvas/d3/dataModelCanvas';

import { GraphDebugDataProvider } from "./components/dataProvider/graphDebugDataProvider";
import { CypherBlockDataProvider } from "./components/dataProvider/cypherBlockDataProvider";
import { SyncedEventTypes } from "../../dataModel/syncedGraphDataAndView";

import ExecuteCypher from "../common/execute/executeCypher";
import LoadForm from "../common/edit/LoadForm";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import LoadModelForm from "../../tools/toolModel/components/LoadModelForm";
import ResultsTable from "../toolCypherBuilder/components/results/ResultsTable";
import ValidationTable from "../toolCypherBuilder/components/validation/ValidationTable";

import { ALERT_TYPES, USER_ROLE, COLORS } from "../../common/Constants";
import { SAVE_MODE } from "../common/toolConstants";
import { getAllDbConnectionsForUser } from '../../persistence/graphql/GraphQLDBConnection';

import PropertyDialog from '../toolModel/components/properties/PropertyDialog';
import RelationshipCardinalityDialog from '../toolModel/components/cardinality/RelationshipCardinalityDialog';
import ModalVariableLabelsAndTypes from '../../components/common/ModalVariableLabelsAndTypes';

import SecurityRole, { SecurityMessages } from "../common/SecurityRole";
import Sharing from '../common/security/Sharing';
import EditHelper from '../common/edit/editHelper';

import CypherStringConverter from "../../dataModel/cypherStringConverter";
import { Pattern } from "../../dataModel/cypherPattern";

import { splitCypherStatementsBySemicolon } from '../../common/parse/parseCypher';
import GraphCanvasControl from "../../components/canvas/GraphCanvasControl";
import { CANVAS_FEATURES } from "../../components/canvas/d3/graphCanvas";
import { tryAgain } from "../common/util";

import ModelDialogHelper, { 
  handleLoadModelDialogClose,
  showLoadModelDialog 
} from '../common/model/loadModelDialogHelper';

import {
  anyFeatureLicensed,
  isFeatureLicensed,
  showUpgradeLicenseMessage,
  showMaxReachedUpgradeLicenseMessage,
  FEATURES,
  TOOL_NAMES,
} from "../../common/LicensedFeatures";
import {
  GraphDocChangeType,
  GraphViewChangeType,
} from "../../dataModel/graphDataConstants";
import { OutlinedStyledButton } from "../../components/common/Components";

import {
  getUserSettings,
  loadRemoteDataModel,
  updateUserRolesGraphDoc,
  getUserRolesForGraphDoc,
  NETWORK_STATUS,
} from "../../persistence/graphql/GraphQLPersistence";

import { CommunicationHelper } from "../common/communicationHelper";
import { promptLockedDocument } from "../common/lockHelper";
import { PersistenceHelper } from "../common/persistenceHelper";

import { stopListeningTo, listenTo } from "../../dataModel/eventEmitter";
import AccordionBlock from "../common/blocks/AccordionBlock";
import { getDynamicConfigValue } from '../../dynamicConfig';
import { select } from "d3";
import ResultExportDialog, { ResultExportTypes } from "../common/mapping/ResultExportDialog";
import { downloadUrlAsFile } from '../../common/util/download';
import { getExportPayload } from "./components/exportResults";

const TOOL_HUMAN_NAME = "Cypher Suite";
const DOCUMENT_NAME = "Cypher Suite";
const NEW_DOCUMENT_TITLE = `New ${DOCUMENT_NAME}`;
const NEW_THING_NAME = "Cypher Statement";

const DomIds = {
  Main: "main",
  CypherSuite: "CypherSuite",
  AddCypher: "AddCypher",
  CypherSuiteAccordionContainer: "CypherSuiteAccordionContainer",
  CypherSuiteGraphDebug: "CypherSuiteGraphDebug"
};

const Sizes = {
  TitleBarHeight: "40px",
  BottomTitleBarHeight: "40px",
  DefaultBottomDrawerHeight: "250px",
  MaxBottomDrawerHeight: "650px",
  MinBottomDrawerHeight: "150px",
  BottomDrawerHeightIncrement: "100px",
  CypherEditorOffset: "95px",
  RightTop: "63px",
  RightTitleBarWidth: "30px",
  FloatingBarRightMargin: "120px",
  DefaultRightDrawerWidth: "800px",
  MaxRightDrawerWidth: "1200px",
  MinRightDrawerWidth: "400px",
  RightDrawerWidthIncrement: "100px",
  MainAreaPadding: "8px",
  PageBottomPadding: 800,
};

const pxVal = (px) =>
  typeof px === "string" ? parseInt(px.replace(/px$/, "")) : px;

const Drawers = {
  Bottom: "Bottom",
  Right: "Right",
};

const BottomTabIndexes = {
  Cypher: 0,
  Results: 1,
  Validation: 2
}

const DisplayMode = {
  Debug: "Debug",
  Normal: "Normal"
}

const NO_ACTIVE_DOCUMENT_MESSAGE = `No ${TOOL_HUMAN_NAME} document is loaded. This option is unavailable when there is not an active document.`;

export default class CypherSuite extends Component {
  GraphDocType = "CypherSuite";

  id = "cypherSuite";

  cypherBlockDataProvider = new CypherBlockDataProvider({
    id: this.id,
    cypherSuiteBuilder: this
  });

  executeCypher = new ExecuteCypher();

  graphDebugCanvasConfig = null;

  loading = false;
  dataChangeTimer = null;
  retryTimer = null;

  getCypher = () => this.state.cypherQuery;

  getDataProvider = () => this.cypherBlockDataProvider;

  getNewCypherBlockDataProvider = (graphDocMetadata) => {
    if (this.cypherBlockDataProvider) {
      stopListeningTo(this.cypherBlockDataProvider, this.id);
      // TODO: get variables to clear and pass them to variableScope.clearVariables
      //this.variableScope.clearVariables();
    }
    var cypherBlockDataProvider = new CypherBlockDataProvider({
      id: graphDocMetadata.key,
      cypherSuiteBuilder: this,
      //variableScope: this.variableScope
    });
    listenTo(cypherBlockDataProvider, this.id, this.dataChangeListener);
    console.log("listenTo called on cypherBlockDataProvider");
    return cypherBlockDataProvider;
  };

  getPropertyContainerDataItem = (propertyContainer, isPrimary) => {
    // this is used for variable chips
    const getDataItem = (item) => {
        return {
            key: item.key,
            getColor: () => item.getColor(),
            getFontColor: () => item.getFontColor(),
            getText: () => item.getText(),
            setText: (text) => item.setText(text),
            getSecondaryData: () => [],
            canDelete: () => true,
            isPrimary: () => false,
            getData: () => item
        }
    }

    var secondaryDataItems = propertyContainer.getSecondaryData()
        .map(secondaryDataItem => getDataItem(secondaryDataItem));

    var dataItem = getDataItem(propertyContainer);
    dataItem.getSecondaryData = () => secondaryDataItems;
    dataItem.canDelete = () => !isPrimary;
    dataItem.isPrimary = () => isPrimary;

    return dataItem;
  }

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

  setPropertyContainer = (propertyContainer) => {
    //console.log("Model setPropertyContainer");
    var { editHelper } = this.state;
    editHelper.setPrimaryPropertyContainer(propertyContainer);        
    this.propertyDialogRef.current.setPropertyContainer(propertyContainer, this.getPropertyContainerDataItem(propertyContainer, true));
  }

  setRelationshipType = (relationshipType) => {
    this.relationshipCardinalityDialogRef.current.setRelationshipType(relationshipType);
  }

  canvasCallback = (message) => {
    if (message) {
      switch (message.message) {
          case CONTAINER_CALLBACK_MESSAGES.SHOW_PROPERTIES:
              //console.log(this.state.propertyDialog);
              this.setState({
                  propertyDialog: { ...this.state.propertyDialog, open: true },
                  propertyContainer: message.propertyContainer
              }, () => this.setPropertyContainer(message.propertyContainer));
              break;
          case CONTAINER_CALLBACK_MESSAGES.REQUEST_EDIT:
              if (this.modalVariableLabelAndTypesRef.current) {
                  this.setPropertyContainer(message.propertyContainer);
                  this.modalVariableLabelAndTypesRef.current.open(
                      message.canvasDimensions,
                      message.popupPosition, 
                      message.expectedTextLength,
                      this.getPropertyContainerDataItem(message.propertyContainer, true)                            
                  );
              }
              break;                    
          case CONTAINER_CALLBACK_MESSAGES.SHOW_RELATIONSHIP_CARDINALITY:
              this.setState({
                  relationshipCardinalityDialog: {
                      ...this.state.relationshipCardinalityDialog,
                      relationshipType: message.propertyContainer,
                      open: true
                  },
              }, () => this.setRelationshipType(message.propertyContainer));
              break;
          case CONTAINER_CALLBACK_MESSAGES.PROMPT_USER:
              this.showGeneralDialog(message.title, message.description, [{
                      text: 'Yes',
                      onClick: (button, index) => {
                          message.yesAction();
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
              break;
          default:
              //alert('canvasCallback: unhandled message ' + message.message);
              console.log('canvasCallback: unhandled message ' + message.message);
              break;
      }
    }
  }

  removeListenerBeforeDeserialize = (cypherBlockDataProvider) => 
    stopListeningTo(cypherBlockDataProvider, this.id);

  addListenerAfterDeserialize = (cypherBlockDataProvider) =>     
    listenTo(cypherBlockDataProvider, this.id, this.dataChangeListener, true);

  closeImportExportDialog = () => {
    this.setState({ importExportDialog: { ...this.state.importExportDialog, open: false }});
  }

  closeResultExportDialog = () => {
    this.setState({ resultExportDialog: { ...this.state.resultExportDialog, open: false }});
  }
  
  closeShareDialog = () => {
    this.setState({ shareDialog: { ...this.state.shareDialog, open: false }});
  }

  closePropertyDialog = () => {
    this.setState({ propertyDialog: { ...this.state.propertyDialog, open: false }});
    this.getDataModelCanvas().renderDataModel();
  }

  closeRelationshipCardinalityDialog = () => {
      this.setState({ relationshipCardinalityDialog: { ...this.state.relationshipCardinalityDialog, open: false }});
      this.getDataModelCanvas().reRenderRelationshipType(this.state.relationshipCardinalityDialog.relationshipType);
  }

  closeGeneralDialog = () => {
    this.setState({
      generalDialog: { ...this.state.generalDialog, open: false },
    });
  };

  setImportExportText = (e) => {
    this.setState({ importExportDialog: { ...this.state.importExportDialog, text: e.target.value }});
  }

  onImportExportPaste = (event, setText) => {
    // code from https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    let paste = (event.clipboardData || window.clipboardData).getData('text');

    // strip line numbers if pasting from keymaker
    if (paste && paste.split) {
      paste = paste.split('\n')
        // filter out things like "3" or "4" on a standalone line
        //   left side will create an int if possible, right side will cast to int 
        //   because using != instead of !==, therefore if only a single number exists 
        //   it should be filtered out
        .filter(x => {
          x = x.trim();
          const xInt = parseInt(x);
          const decision = xInt != x;
          //console.log(`x: '${x}', xInt: ${xInt}, decision: ${decision}`);
          return decision;
        }) 
        .join('\n');
    }

    //console.log('paste: ', paste);
    const syntheticEvent = {
      target: {
        value: paste
      }
    }
    setText(syntheticEvent);

    event.preventDefault();    
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

  utilizeFocus = () => {
    const ref = React.createRef();
    const setFocus = () => {
      ref.current && ref.current.focus();
    };
    return { ref: ref, setFocus: setFocus };
  };

  focusTextBox = () => {
    setTimeout(() => {
      this.textFocus.setFocus();
    }, 200);
  };

  constructor(props) {
    super(props);
    props.setSureRef(this);
    this.dataModelRef = React.createRef();
    this.saveFormRef = React.createRef();
    this.textFocus = this.utilizeFocus();
    this.propertyDialogRef = React.createRef();
    this.relationshipCardinalityDialogRef = React.createRef();
    this.modalVariableLabelAndTypesRef = React.createRef();
    this.shareDialogRef = React.createRef();
    this.importExportDialogRef = React.createRef();
    this.cypherValidationRef = React.createRef();
    this.graphDebugRef = React.createRef();

    this.cypherEditorRef = React.createRef();
    this.resultsTableRef = React.createRef();
    this.validationTableRef = React.createRef();
    this.modelDialogHelperRef = React.createRef();

    this.graphDebugDataProvider = new GraphDebugDataProvider({
      id: DomIds.CypherSuiteGraphDebug,
      parentContainer: this,
    });    

    this.graphDebugCanvasConfig = new GraphDebugCanvasConfig({
      dataProvider: this.graphDebugDataProvider,
      containerCallback: this.graphDebugCallback,
    });

    this.persistenceHelper = new PersistenceHelper({
      graphDocContainer: this,
      getNetworkStatus: this.props.getNetworkStatus,
      LOCAL_STORAGE_KEY: this.cypherBlockDataProvider.getLocalStorageKey(),
      REMOTE_GRAPH_DOC_TYPE: this.cypherBlockDataProvider.getRemoteGraphDocType(),
      SUBGRAPH_MODEL: this.cypherBlockDataProvider.getSubgraphModel(),
    });

    this.communicationHelper = new CommunicationHelper({
      graphDocContainer: this,
      persistenceHelper: this.persistenceHelper,
      getNetworkStatus: this.props.getNetworkStatus,
      setNetworkStatus: this.props.setNetworkStatus,
      setStatus: this.setStatus,
      showDialog: this.showGeneralDialog,
      GraphDocType: this.cypherBlockDataProvider.getRemoteGraphDocType(),
    });

  }

  //getDataModelCanvas = () => this.dataModelRef.current.getDataModelCanvas();

  getSelectedModelText = (modelInfo) => {
    var modelName = "";
    if (modelInfo) {
      modelName = modelInfo.title ? modelInfo.title : "Untitled";
    } else {
      modelName = "No Model Selected";
    }
    return modelName;
  };

  getDataModel = () => this.state.selectedDataModel;

  state = {
    //addButtonOpen: true,
    mode: DisplayMode.Normal,
    addButtonOpen: false,
    cypherBlocks: [],
    bottomActiveTabIndex: 0,
    rightActiveTabIndex: 0,
    cypherQuery: "",
    activeKey: "",
    status: "",
    bottomDrawerOpen: true,
    bottomDrawerOpenHeight: Sizes.DefaultBottomDrawerHeight,
    cypherEditorHeight: 100,
    rightDrawerOpen: false,
    rightDrawerOpenWidth: Sizes.DefaultRightDrawerWidth,
    validationMessage: 'Not validated',
    validationStatus: ValidationStatus.NotValidated,
    minHeight: Sizes.PageBottomPadding,

    selectedDatabase: null,
    selectedDatabaseText: '<Select a Neo4j database>',
    neo4jDatabaseMap: {},
    neo4jDatabaseMapUnfiltered: {},
    showNeo4jDatabaseDialog: false,

    selectedDataModel: null,
    selectedDataModelMetadata: null,
    selectedDataModelText: this.getSelectedModelText(),
    editHelper: new EditHelper(),
    activityIndicator: false,
    showSaveDialog: false,
    showLoadDialog: false,
    saveFormMode: "",
    editMetadata: {},
    metadataMap: {},
    modelMetadataMap: {},
    loadedMetadata: getMetadata(NEW_DOCUMENT_TITLE),
    cancelMetadata: {},
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
    importExportDialog: {
      open: false,
      handleClose: this.closeImportExportDialog,
      title: '',
      text: '',
      placeholder: '',
      onPaste: this.onImportExportPaste,
      disableEditing: false,
      setText: this.setImportExportText,
      buttons: []
    },
    resultExportDestinationInfo: {},
    resultExportDialog: {
      open: false,
      handleClose: this.closeResultExportDialog,
      title: 'Export Results to BigQuery',
      exportType: ResultExportTypes.BigQuery,
      buttons: [{
        text: 'View Mapping Json',
        onClick: (button, index) => this.viewMappingJson(),
        autofocus: true
      },{
        text: 'Export',
        onClick: (button, index) => this.exportResultsToBigQuery(),
        autofocus: true
      },{
        text: 'Cancel',
        onClick: (button, index) => this.closeResultExportDialog(),
        autofocus: false
      }]
    },
    propertyDialog: {
      open: false,
      handleClose: this.closePropertyDialog
    },
    relationshipCardinalityDialog: {
      relationshipType: null,
      open: false,
      handleClose: this.closeRelationshipCardinalityDialog
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
  };

  closeDebugCanvas = () => {
    this.setState({
      mode: DisplayMode.Normal
    })
  }

  toggleShowDebugCanvas = () => {
    const { mode } = this.state;
    var newMode = DisplayMode.Normal;
    if (mode === DisplayMode.Normal) {
      newMode = DisplayMode.Debug;
    } else if (mode == DisplayMode.Debug) {
      newMode = DisplayMode.Normal;
    }
    this.setState({
      mode: newMode
    })
  }

  // for receiving information back from ResultExportDialog
  setDestinationInfo = (destinationInfo) => {
    this.setState({
      resultExportDestinationInfo: destinationInfo
    })
  }
  // end stuff for ResultExportDialog

  dataModelChangeListener = () => {}

  componentDidMount() {
    window.addEventListener("resize", this.setDataModelCanvasSize);

    var { editHelper } = this.state;
    editHelper.setEditConfirmDelete(this.editConfirmDelete);
    editHelper.setParentContainer(this);
  }

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.setDataModelCanvasSize);
  };

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

  changeBottomTab = (event, index) => {
    this.setState({
        bottomActiveTabIndex: index,
    });
  };

  changeRightTab = (event, index) => {
    this.setState({
      rightActiveTabIndex: index,
    });
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

  saveCypherSuiteBuilderFromSaveForm = () => {
    var { loadedMetadata, editMetadata, saveFormMode } = this.state;
    var properties = { loadedMetadata, editMetadata, saveFormMode };
    return this.saveCypherSuiteBuilder(properties);
  };

  saveCypherSuiteBuilder = (properties) => {
    var { loadedMetadata, editMetadata, saveFormMode } = properties;
    var previousState = JSON.parse(JSON.stringify(loadedMetadata)); // deep copy

    if (
      saveFormMode === SAVE_MODE.TOTALLY_NEW ||
      saveFormMode === SAVE_MODE.NEW
    ) {
      this.reset(editMetadata);
      SecurityRole.setRole(USER_ROLE.OWNER);
    }

    var graphDocMetadata = {
      ...editMetadata,
      dateCreated: editMetadata.dateCreated
        ? editMetadata.dateCreated
        : new Date().getTime().toString(),
      dateUpdated: new Date().getTime().toString(),
      viewSettings: {
        cypherSuiteViewSettings: this.getCypherSuiteViewSettings(),
        //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
        //dataModelViewSettings: this.getDataModelCanvas().getViewSettings(),
      },
    };
    this.setState(
      {
        loadedMetadata: graphDocMetadata,
        activeKey: editMetadata.key,
      },
      () => {
        var { loadedMetadata } = this.state;
        this.saveRemoteMetadata(loadedMetadata, previousState);
      }
    );
    return graphDocMetadata;
  };

  saveRemoteMetadata = (loadedMetadata, previousState) => {
    this.setStatus("Saving...", true);
    this.persistenceHelper.saveRemoteGraphDocMetadata(
      loadedMetadata,
      previousState,
      (response) => {
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
    );
  };

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
    cypherBlockDataProvider
  ) => {
    // TODO: SyncedEventTypes shouldn't be even at this level, it should be in CypherBlockDataProvider
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
      } = this.cypherBlockDataProvider.getDataSaveObj();

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
            cypherBlockDataProvider.setIsRemotelyPersisted(true);
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
              cypherBlockDataProvider
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

  viewChanged = (changeType) => {
    if (this.isADocumentSelected()) {
      this.dataChangeListener("viewChanged", changeType, {});
    }
  }

  lastSave = new Date().getTime();
  maxUnsaveTime = 1000 * 15;

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
      var timeout = 2000;
      // clearing this timer because dataChangeTimer will pick up any relevant changes
      this.persistenceHelper.clearRetryTimer();
      if (this.dataChangeTimer) {
        clearTimeout(this.dataChangeTimer);
        var now = new Date().getTime();
        if (now - this.lastSave > this.maxUnsaveTime) {
          timeout = 10; // reset save timeout to 10 millis
        }
      }

      this.setStatus("", false);
      this.communicationHelper.setNetworkStatus(NETWORK_STATUS.UNSAVED); 
      this.dataChangeTimer = setTimeout(() => {
        this.lastSave = new Date().getTime();        
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
          var graphDocMetadata = {
            ...loadedMetadata,
            dateUpdated: new Date().getTime().toString(),
            viewSettings: {
              cypherSuiteViewSettings: this.getCypherSuiteViewSettings(),
              //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
              //dataModelViewSettings: this.getDataModelCanvas().getViewSettings(),
            },
          };
          if (validNetworkStatuses.includes(networkStatus)) {
            console.log("changeListener: online: calling saveChanges");
            this.saveChanges(
              messageName,
              messagePayload,
              graphDocMetadata,
              this.cypherBlockDataProvider
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
              this.cypherBlockDataProvider
            );
          }
        }
      }, timeout);
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
    this.setState({
      cypherBlocks: [],
    });
    this.cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
      graphDocMetadata
    );
    this.cypherBlockDataProvider.fromSaveObject({
      graphDocObj,
      serializedSaveObject: serializedDataSaveObj,
      keepDataChangeFlags},
      () => {
        console.log("after fromSaveObject");
        this.cypherBlockDataProvider.setIsRemotelyPersisted(true);
        this.finishLoading({
          graphDocMetadata,
          lockInfo,
          cypherBlockDataProvider: this.cypherBlockDataProvider,
          dontPushWebHistory: false,
          callback
        });
      }
    );
  };
/*
  setActiveCypherBlockDataProvider = (
    graphDocMetadata,
    graphDocObj,
    keepDataChangeFlags,
    callback
  ) => {
    this.setState({
      cypherBlocks: [],
    });
    this.cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
      graphDocMetadata
    );
    this.cypherBlockDataProvider.fromSaveObject(
      graphDocObj,
      keepDataChangeFlags,
      () => {
        console.log("after fromSaveObject");
        this.cypherBlockDataProvider.setIsRemotelyPersisted(true);
        this.finishLoading(
          graphDocMetadata,
          this.cypherBlockDataProvider,
          false,
          callback
        );
      }
    );
  };*/

  setCypherBlockDataProvider(cypherBlockDataProvider) {
    //this.getGraphCanvas().setDataProvider(cypherBlockDataProvider);
    this.cypherBlockDataProvider = cypherBlockDataProvider;
  }

  handleViewSettings = (canvasViewSettings, graphCanvas, canvasRef) => {
    /*
    graphCanvas.setViewSettings(canvasViewSettings);
    if (canvasViewSettings.scaleFactor && canvasViewSettings.scaleFactor != 1) {
      var scaleFactor = 100 * canvasViewSettings.scaleFactor;
      var howMuch = Math.round(Math.abs(100 - scaleFactor));
      if (scaleFactor > 100) {
        canvasRef.current.zoomIn(howMuch);
      } else {
        canvasRef.current.zoomOut(howMuch);
      }
    }
    */
  };

  reset = (graphDocMetadata) => {
    var cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
      graphDocMetadata
    );
    this.clearDataModel();
    this.resetValidateCypherSuite();
    this.setCypherBlockDataProvider(cypherBlockDataProvider);

    const loadedCypherBlocks = this.cypherBlockDataProvider.getCypherBlocks();
    this.setState({
      addButtonOpen: loadedCypherBlocks.length === 0 ? true : false,
      cypherBlocks: loadedCypherBlocks,
      resultExportDestinationInfo: {}
    });

    return cypherBlockDataProvider;
  };

  getCypherBlockByKey = (cypherBlockKey) => {
    const cypherBlocks = this.cypherBlockDataProvider.getCypherBlocks();
    return cypherBlocks.find((x) => x.key === cypherBlockKey);
  }

  executeCypherAndShowResults = (cypher, isDebug, callback) =>
    this.runQuery(cypher, isDebug, callback);

  runQuery = (cypherQueryToRun, isDebug, callback) => {
    var { cypherQuery } = this.state;
    cypherQueryToRun = cypherQueryToRun ? cypherQueryToRun : cypherQuery;

    var lastReturnClause = null;
    if (!isDebug) {
      const cypherStringConverter = new CypherStringConverter();
      try {
        var clauses = cypherStringConverter.convertToClauses(cypherQueryToRun);
        var returnClauses = clauses.filter(clause => clause.keyword === 'RETURN')
        if (returnClauses.length > 0) {
            lastReturnClause = returnClauses[returnClauses.length - 1].clauseInfo;
        } 
      } catch (e) {
        console.log("Cannot parse query", e);
      }
    }

    this.executeCypher.runQuery(cypherQueryToRun, {}, lastReturnClause, (results) => {
      this.resultsTableRef.current.setData(results, isDebug);
      if (callback) {
        callback();
      }
    }, { dontStringify: true });
  }  

  getCypherBlocks = () => {
    var { cypherQuery } = this.state;
    const cypherStringConverter = new CypherStringConverter();
    try {
      var { returnClauses, returnVariables } = cypherStringConverter.convertToClausesAndVariables(cypherQuery);

      returnClauses = returnClauses.reduce((acc, x) => {
          if (x.getOrderedClauses) {
            return acc.concat(x.getOrderedClauses());
          } else {
            return acc.concat([x]);
          }
      }, [])

      var blocks = returnClauses.map(clause => {
        return {
          getDebugCypherSnippets: (variableScope) => {
            returnVariables.forEach(variable => variableScope.addVariable(variable, {}));

            if (clause.clauseInfo && clause.clauseInfo.getDebugCypherSnippets) {
              if (clause.clauseInfo instanceof Pattern) {
                return clause.clauseInfo.getDebugCypherSnippets({ addMissingVars: true,  variableScope }).map(x => `${clause.keyword} ${x}`);
              } else {
                return clause.clauseInfo.getDebugCypherSnippets();
              }
            } else if (clause.getDebugCypherSnippets) {
                return clause.getDebugCypherSnippets();
            } else {
              return null;
            }
          },
          getCypher: (variableScope) => {
            if (clause.clauseInfo && clause.clauseInfo.toCypherString) {
              if (clause.clauseInfo instanceof Pattern) {
                return `${clause.keyword} ${clause.clauseInfo.toCypherString({addMissingVars: true, variableScope })}`
              } else {
                return clause.clauseInfo.toCypherString();
              }
            } else if (clause.toCypherString) {
              return clause.toCypherString();
            } else {
              return `${clause.keyword} ${clause.clauseInfo}`;
            }
          }
        }
      });
      return blocks;
    } catch (e) {
      alert(`Debugging not available. Error parsing query: ${e}`);
      return [];
    }
  }

  getBottomDrawerOpenHeight = () => {
    const { bottomDrawerOpenHeight } = this.state;
    return pxVal(bottomDrawerOpenHeight);
  };

  getSizeValue = (key) => pxVal(Sizes[key]);

  getCypherSuiteViewSettings = () => {
    const {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    } = this.state;

    var settings = {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    };
    return settings;
  };

  handleCypherSuiteViewSettings = (cypherSuiteViewSettings) => {
    cypherSuiteViewSettings = cypherSuiteViewSettings || {};
    var {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    } = cypherSuiteViewSettings;

    bottomDrawerOpen = bottomDrawerOpen !== undefined ? bottomDrawerOpen : true;
    rightDrawerOpen = rightDrawerOpen !== undefined ? rightDrawerOpen : false;

    bottomDrawerOpenHeight =
      bottomDrawerOpenHeight !== undefined
        ? bottomDrawerOpenHeight
        : Sizes.DefaultBottomDrawerHeight;
    rightDrawerOpenWidth =
      rightDrawerOpenWidth !== undefined
        ? rightDrawerOpenWidth
        : Sizes.DefaultRightDrawerWidth;

    var updateStateObject = {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    };

    this.setState(updateStateObject, () => this.resizePanelsOnLoad());
  };

  finishLoading = ({
      graphDocMetadata,
      lockInfo,
      cypherBlockDataProvider,
      dontPushWebHistory,
      callback
    }) => {
    this.clearDataModel();
    this.resetValidateCypherSuite();
    this.setCypherBlockDataProvider(cypherBlockDataProvider);
    var dataModelKey = cypherBlockDataProvider.getDataModelKey();
    if (dataModelKey) {
      this.loadRemoteModel({ key: dataModelKey });
    }

    var viewSettings = graphDocMetadata.viewSettings
      ? graphDocMetadata.viewSettings
      : {};
    var cypherSuiteViewSettings = viewSettings.cypherSuiteViewSettings
      ? viewSettings.cypherSuiteViewSettings
      : {};
    var canvasViewSettings = viewSettings.canvasViewSettings
      ? viewSettings.canvasViewSettings
      : {};
    var dataModelViewSettings = viewSettings.dataModelViewSettings
      ? viewSettings.dataModelViewSettings
      : {};

    //console.log("canvasViewSettings: " + JSON.stringify(canvasViewSettings));

    this.handleViewSettings(
      dataModelViewSettings,
      null, // this.getDataModelCanvas(), // to uncomment, get rid of null first
      this.dataModelRef
    );
    this.handleCypherSuiteViewSettings(cypherSuiteViewSettings);
    // TODO: have all accordions open/close/resize themselves appropriately

    var userRole = graphDocMetadata.userRole;
    if (graphDocMetadata.isPublic && !userRole) {
      userRole = USER_ROLE.VIEWER;
    }

    //this.getDataModelCanvas().bringAllNodesToTop();

    if (!dontPushWebHistory) {
      this.addToWebHistory(graphDocMetadata);
    }

    const loadedCypherBlocks = this.cypherBlockDataProvider.getCypherBlocks();
    console.log(
      "addButtonOpen: ",
      loadedCypherBlocks.length === 0 ? true : false
    );
    var cypherQuery = "";
    var selectedBlock = loadedCypherBlocks.find(x => x.selected);
    if (selectedBlock) {
      cypherQuery = selectedBlock.dataProvider.getCypher();
    }
    this.setState({
      loadedMetadata: graphDocMetadata,
      showLoadDialog: false,
      activeKey: graphDocMetadata.key,
      metadataMap: {
        ...this.state.metadataMap,
        [graphDocMetadata.key]: graphDocMetadata,
      },
      addButtonOpen: loadedCypherBlocks.length === 0 ? true : false,
      cypherBlocks: loadedCypherBlocks,
      cypherQuery: cypherQuery
    });
    /*
    if (this.cypherEditor) {
      this.setCypherEditorCypherQuery(cypherQuery);
    }
    */
    SecurityRole.setRole(userRole);

    this.props.setTitle(this.getTitle(graphDocMetadata));
    this.calculatePageSize();

    if (callback) {
      callback(graphDocMetadata, cypherBlockDataProvider);
    }

    if (lockInfo && lockInfo.lockIsActive) {
      promptLockedDocument({
        props: {
          setStatus: this.setStatus,
          persistenceHelper: this.persistenceHelper,
          GraphDocType: this.cypherBlockDataProvider.getRemoteGraphDocType(),
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

  loadCypherSuiteBuilder = (graphDocMetadata, dontPushWebHistory, callback) => {
    //  Must clear out blocks before loading, because later when iterating through
    //  cypherBlocks if a key matches between the currently loaded component
    //  and the new loaded component, react componentDidMount will not get called.
    //  For components with render logic in componentDidMount they would not render
    //  correctly.
    this.setState({
      cypherBlocks: [],
    });
    this.loadRemoteCypherSuiteBuilder(
      graphDocMetadata,
      dontPushWebHistory,
      callback
    );
  };

  loadRemoteCypherSuiteBuilder = (
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
            var message = "Error loading cypher suite: " + response.error;
            this.setStatus(message, false);
            alert(message);
          } else {
            this.setStatus("", false);
            graphDocMetadata.viewSettings = response.metadata.viewSettings;
            var cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
              graphDocMetadata
            );
            cypherBlockDataProvider.fromSaveObject({
                graphDocObj: response, keepDataChangeFlags: false
              }, () => {
              cypherBlockDataProvider.setIsRemotelyPersisted(true);
              this.finishLoading({
                graphDocMetadata,
                cypherBlockDataProvider,
                dontPushWebHistory,
                callback
              });
            });
          }
        }
      );
    } else {
      alert(
        "Unable to load cypher suite, the specified cypher suite may not exist"
      );
    }
  };

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

    fileMenuItems.push({id: 'share', text: 'Share'});
    //fileMenuItems.push({id: 'saveAs', text: `Clone ${TOOL_HUMAN_NAME}`});

    var fileMenu = {
      id: "cyphersuitebuilder-file",
      text: "File",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "new":
            if (this.communicationHelper.isOnline()) {
              this.new();
            }
            break;
          case "save":
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
                if (isFeatureLicensed(FEATURES.CYPHER_SUITE.Share)) {
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

    var layoutMenuId = "cyphersuitebuilder-layout";
    var layoutMenuItems = [];
    var atLeastOneLayoutLicensed = false;
    if (isFeatureLicensed(FEATURES.MODEL.ForceLayout)) {
      atLeastOneLayoutLicensed = true;
      layoutMenuItems.push({ id: "force", text: "Force Layout" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
      atLeastOneLayoutLicensed = true;
      layoutMenuItems.push({ id: "sideToSide", text: "Left to Right" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
      atLeastOneLayoutLicensed = true;
      layoutMenuItems.push({ id: "topBottom", text: "Top to Bottom" });
    }
    if (atLeastOneLayoutLicensed) {
      layoutMenuItems.push({ id: "divider1", text: "_" });
    }
    layoutMenuItems.push({
      id: "bringAllNodesToTop",
      text: "Bring All Nodes to Front",
    });

    /*
        layoutMenuItems.push(
            { component: <RelationshipLayoutSettings ref={this.modelRelationshipLayoutSettingsRef}
                    key={layoutMenuId + '_modelRelationshipLayoutSettings'}
                    saveUserSettings={this.saveUserSettings} menuId={layoutMenuId}
                    handleRelationshipDisplayChange={this.handleRelationshipDisplayChange} />}
        );

        layoutMenuItems.push({id: 'divider2', text: '_'});
        layoutMenuItems.push(
            { component: <ModelLayoutSettings ref={this.modelLayoutSettingsRef} key={layoutMenuId + '_modelLayoutSettings'}
                    saveUserSettings={this.saveUserSettings} menuId={layoutMenuId}/>}
        );
        */

    var layoutMenu = {
      id: layoutMenuId,
      text: "Layout",
      handler: (menu, menuItem) => {
        /*
                var canvas = this.getGraphCanvas();
                switch (menuItem.id) {
                    case 'force':
                        canvas.doForceLayout();
                        break;
                    case 'sideToSide':
                        //console.log('side to side');
                        canvas.doDagreLayout('side');
                        break;
                    case 'topBottom':
                        //console.log('top to bottom');
                        canvas.doDagreLayout('top');
                        break;
                    case 'bringAllNodesToTop':
                        canvas.bringAllNodesToTop();
                        break;
                    default:
                        break;
                }
                */
      },
      menuItems: layoutMenuItems,
    };
    /*
        if (layoutMenuItems.length > 0) {
            menus.push(layoutMenu);
        }*/

    var importMenuItems = [];
    if (
      anyFeatureLicensed([
        FEATURES.CYPHER_SUITE.View,
      ])
    ) {
      importMenuItems.push({ id: "import", text: `Import ${DOCUMENT_NAME}` });
    }

    var importMenu = {
      id: "cyphersuite-import",
      text: "Import",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "import":
            if (this.communicationHelper.isOnline()) {
              if (!this.isADocumentSelected()) {
                alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
              } else {
                this.showImportCypherSuite();
              }
            }
            break;
          default:
            break;
        }
      },
      menuItems: importMenuItems,
    };
    if (importMenuItems.length > 0) {
        menus.push(importMenu);
    }
    
    var exportMenuItems = [];
    var needExportDivider = false;

    if (isFeatureLicensed(FEATURES.CYPHER_SUITE.View) 
      && getDynamicConfigValue('REACT_APP_CYPHER_SUITE_EXPORT_TO_BIGQUERY_ENABLED')) {
      exportMenuItems.push({ id: "export", text: "Export to BigQuery" });
    }

    var exportMenu = {
      id: "cyphersuitebuilder-export",
      text: "Export",
      handler: (menu, menuItem) => {
                var { cypherQuery } = this.state;
                switch (menuItem.id) {
                    case 'export':
                        if (cypherQuery) {
                          this.showExportResultsToBigQuery();
                        } else {
                          alert('Please select a Cypher query first', ALERT_TYPES.WARNING);
                        }
                        break;
                    default:
                        break;
                }
                
      },
      menuItems: exportMenuItems,
    };
      if (exportMenuItems.length > 0) {
          menus.push(exportMenu);
      }

      var validationMenuItems = [];
      if (anyFeatureLicensed([
          FEATURES.CYPHER_SUITE.View
      ])) {
          validationMenuItems.push({id: 'validate', text: 'Validate Cypher Statements'});
          validationMenuItems.push({id: 'clearValidation', text: 'Clear Validation'});
      }

      var validateMenu = {
          id: 'cyphersuite-validate',
          text: 'Validate',
          handler: (menu, menuItem) => {
              switch (menuItem.id) {
                  case 'validate':
                      const { rightDrawerOpen } = this.state;
                      if (!rightDrawerOpen) {
                          this.toggleRightDrawer();
                      }
                      this.validateCypherSuite();
                      break;
                  case 'clearValidation':
                      this.resetValidateCypherSuite();
                      break;
                  default:
                      break;
              }
          },
          menuItems: validationMenuItems
      }
      if (validationMenuItems.length > 0) {
          menus.push(validateMenu);
      }

    return menus;
  };

  showImportCypherSuite () {

    var placeholder = `Paste several cypher statments ending in semi-colons here -or- a Keymaker JSON export file`;

    this.setState({
        importExportDialog: {
            ...this.state.importExportDialog,
            open: true,
            title: `Import ${TOOL_HUMAN_NAME}`,
            text: '',
            placeholder: placeholder,
            disableEditing: false,
            buttons: [{
                text: 'Import',
                onClick: (button, index) => this.importCypherSuite(),
                autofocus: true
            },{
                text: 'Cancel',
                onClick: (button, index) => this.closeImportExportDialog(),
                autofocus: false
            }]
        }
    }, () => {
        this.importExportDialogRef.current.focusTextBox();
    });
  }

  onBlockFocused = (cypherBlockKey) => {
    const focusedBlock = this.getCypherBlockByKey(cypherBlockKey);
    if (focusedBlock) {
      const selected = (focusedBlock && focusedBlock.selected) ? true : false;
      if (!selected) {
        this.selectAccordionPanel(focusedBlock)(); 
      }
    }
  }

  cypherStatementUpdated = ({ cypher, cypherBlockKey }) => {
    const cypherBlock = this.getCypherBlockByKey(cypherBlockKey)
    const selected = (cypherBlock && cypherBlock.selected) ? true : false;
    if (selected) { // because sometimes we get an update after the block is deselected
      //this.setCypherEditorCypherQuery(cypher);
      this.setState({
        cypherQuery: cypher
      });
    }
  }

  handleKeymakerImport = (phases) => {
    if (phases && phases.length > 0) {
      const cypherStatementArray = phases.map(phase => 
        `/* ${phase.name || 'No name'}\n${phase.phaseType || 'Type not defined'}\n${phase.description || ''} */\n${phase.cypherQuery || 'No cypher query'}`
      );
      this.addABunchOfCypherStatements(cypherStatementArray);
    } else {
      alert('No phases were detected in the Keymaker import file', ALERT_TYPES.WARNING);
    }
    this.closeImportExportDialog();
  }

  importCypherSuite = () => {
    var { text } = this.state.importExportDialog;

    // check for Keymaker import JSON format
    try {
      var keymakerObj = JSON.parse(text);
      if (keymakerObj.phases) {
        this.handleKeymakerImport(keymakerObj.phases);
        return;
      }
    } catch (e) {
      // not JSON
    }
    
    const cypherStatementArray = splitCypherStatementsBySemicolon(text);
    if (cypherStatementArray.length > 0) {
      this.addABunchOfCypherStatements(cypherStatementArray);
    } else {
      alert('No cypher to import', ALERT_TYPES.WARNING);
    }
    this.closeImportExportDialog();
  }

  getCypherStatementTitle = (cypher) => {
    const defaultTitleLen = 70;
    cypher = cypher || '';
    const firstLine = cypher.split('\n')[0].trim();
    // check for /* Comment */ or // Comment or /* Comment
    var commentMatch = firstLine.match(/^\/\*(.*)\*\//) 
      || firstLine.match(/\/\/(.*)/)
      || firstLine.match(/^\/\*(.*)/);
    var title = '';
    if (commentMatch) {
      title = commentMatch[1].trim();
    }
    if (!title) {
      title = (cypher.length > defaultTitleLen) ? cypher.substring(0,defaultTitleLen) : cypher;
    }
    return title;
  }

  addABunchOfCypherStatements = (cypherStatementArray, callback) => {
    var newBlocks = cypherStatementArray.map(x => this.cypherBlockDataProvider.getNewBlock({
      position: "end",
      scrollIntoView: false
    }));
    const { cypherBlocks } = this.state;
    var newCypherBlocks = cypherBlocks.slice();
    newCypherBlocks = newCypherBlocks.concat(newBlocks);

    newBlocks.map((newBlock, i) => {
      const newCypher = cypherStatementArray[i];
      const title = this.getCypherStatementTitle(newCypher);
      newBlock.dataProvider.setTitle(title);
      newBlock.dataProvider.setPlainTextCypherStatement(newCypher);
    });

    this.setState(
      {
        cypherBlocks: newCypherBlocks,
      },
      () => {
        this.calculatePageSize();
        if (callback) {
          callback();
        }
      }
    );

  }

  validateCypherSuite = () => {

    if (this.cypherValidationRef.current) {
      var { selectedDataModel } = this.state;
      var cypherObjArray = this.cypherBlockDataProvider.getCypherBlocks()
        .map(block => block.dataProvider)
        .filter(dataProvider => dataProvider)
        .map(dataProvider => ({
          key: dataProvider.getKey(),
          title: dataProvider.getTitle(),
          cypher: dataProvider.getCypher()
        }));
      
      this.cypherValidationRef.current.validateCypherStatements(cypherObjArray, selectedDataModel);
    }
  }

  saveShare = () => {
    var { activeKey, metadataMap, shareDialog  } = this.state;
    // changes made by dialog are persisted in shareDialog.isPublic, shareDialog.userRoles

    // user roles
    /*
    "userRoles": [
        { "email": "jim@jim.com", "role":"MEMBER" },
        { "email": "joe@joe.com", "removeUser":true },
        { "email": "eric.monk@neotechnology.com", "removeUser":true }
    ]
    */
    var userRoles = Object.values(shareDialog.userRoles).map(x => {
        var returnRole = { ...x };
        delete returnRole.__typename;
        delete returnRole.isCreator;
        return returnRole;
    });
    metadataMap[activeKey].isPublic = shareDialog.isPublic;
    this.setState({
        metadataMap: metadataMap
    });
    updateUserRolesGraphDoc (activeKey, shareDialog.isPublic, userRoles, () => {
        // TODO: do something?
        this.closeShareDialog();
    });
  }

  showShare = () => {
    var { activeKey, metadataMap, shareDialog } = this.state;
    this.setStatus('Loading...', true);
    getUserRolesForGraphDoc(activeKey, (response) => {
        this.setStatus('', false);
        if (response.success) {
            var userRoleArray = response.data;
            var userRoles = {};
            userRoleArray.map(x => userRoles[x.email] = x);
            this.setState({
                shareDialog: {
                    ...shareDialog,
                    open: true,
                    /*
                    [
                        { email: email, role: role, isCreator: isCreator}
                    ]
                    */
                    userRoles: userRoles,
                    isPublic: metadataMap[activeKey].isPublic
                }
            }/*, () => {
                this.shareDialogRef.current.focusTextBox();
            }*/)
        } else {
            var errorStr = '' + response.error;
            if (errorStr.match(/Network error/)) {
                this.communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
            }
            alert(response.error);
        }
    });
  }

  tryToGoOnline = () => this.communicationHelper.tryToGoOnline();

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
    this.focusTextBox();

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
          this.loadCypherSuiteBuilder(graphDocMetadata);
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
                    this.setActiveCypherBlockDataProvider(
                      graphDocMetadata,
                      graphDocResponse,
                      false
                    );*/
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
                alert("Error opening cypher suite: " + e.message);
                console.log(e);
              }
            }
          );
        }
      }
    });

    this.setCypherEditorSize();
    this.setBottomTableHeight();
  };

  toggleAddButtonOpen = (isOpen) => {
    const { cypherBlocks } = this.state;
    var newCypherBlocks = cypherBlocks.slice();
    newCypherBlocks.map((block) => (block.isAddButtonOpen = isOpen));
    this.setState({
      addButtonOpen: isOpen,
      cypherBlocks: newCypherBlocks,
    });
  };

  setBottomTableHeight = () => {
    var numTriesValidation = 0;
    var maxTriesValidation = 5;

    var numTriesResults = 0;
    var maxTriesResults = 5;

    const setValidationTableHeight = () => {
      if (this.validationTableRef.current) {
        this.validationTableRef.current.setTableHeight();
      } else {
        numTriesValidation++;
        if (numTriesValidation < maxTriesValidation) {
          setTimeout(setValidationTableHeight, 200);
        }
      }
    };

    const setResultsTableHeight = () => {
      if (this.resultsTableRef.current) {
        this.resultsTableRef.current.setResultTableHeight();
      } else {
        numTriesResults++;
        if (numTriesResults < maxTriesResults) {
          setTimeout(setResultsTableHeight, 200);
        }
      }
    };

    setValidationTableHeight();
    setResultsTableHeight();
  }

  setCypherEditorSize = () => {
    //console.log('setCypherEditorSize called');
    var numTries = 0;
    var maxTries = 5;

    var { bottomDrawerOpenHeight } = this.state;
    var height =
      pxVal(bottomDrawerOpenHeight) - pxVal(Sizes.CypherEditorOffset);
      const setHeight = () => {
      if (this.resultsTableRef.current) {
        this.setState({
          cypherEditorHeight: height
        });
        this.resultsTableRef.current.setCypherEditorSize();
      } else {
        numTries++;
        if (numTries < maxTries) {
          setTimeout(setHeight, 200);
        }
      }
    };
    setHeight();
    
    if (this.graphDebugRef.current) {
      this.graphDebugRef.current.updateDimensions();
    }
  };

  tabDeactivated = () => {
    // TODO
  };

  handleUserSettings = (userSettings) => {
    if (userSettings && userSettings.canvasSettings) {
      var { canvasSettings } = userSettings;
      console.log("handleUserSettings canvasSettings");
      console.log(canvasSettings);
      var maxTries = 5;
      var tryNum = 1;

      //var applySettings = () => {
      //    var graphCanvas = this.getGraphCanvas();
      //    if (graphCanvas !== null) {
      // TODO: uncomment and implement below
      /*
                    graphCanvas.setSnapToGrid(canvasSettings.snapToGrid);
                    graphCanvas.setDisplayAnnotations(canvasSettings.displayAnnotations);
                    graphCanvas.setRelationshipDisplay(canvasSettings.relationshipDisplay);
                    if (canvasSettings.showGrid) {
                        //console.log('showGrid');
                        graphCanvas.showGrid();
                    } else {
                        //console.log('hideGrid');
                        graphCanvas.hideGrid();
                    }
                    */
      //    } else {
      // waiting for getGraphCanvas() to not be null
      //        if (tryNum <= maxTries) {
      //            tryNum++;
      //            setTimeout(applySettings, 150);
      //        }
      //    }
      //}
      //applySettings();
    }
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

  showLoadDialog = () => {
    this.getMetadataMap(() => {
      this.setState({
        showLoadDialog: true,
      });
    });
  };

  toggleShowAdd = () => {
    var { addButtonOpen } = this.state;
    this.setState({
      addButtonOpen: !addButtonOpen,
    });
  };

  handleLoadDialogClose = (options) => {
    var { activeKey } = this.state;
    this.setState(
      {
        showLoadDialog: false,
      },
      () => {
        if (options && options.justCloseForDebugging) {
          // do nothing
        } else {
          /*
          if (!activeKey) {
            this.new();
          }
          */
        }
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
    const allKeys = [key].concat(
      this.cypherBlockDataProvider.getAllAssociatedGraphViewKeys()
    );
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
          this.handleLockedCypherSuiteBuilder(response.error.message, actions);
        } else {
          this.setStatus(response.error, false);
          alert(response.error);
        }
      }
    });
  };

  handleLockedCypherSuiteBuilder = (errorStr, actions) => {
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
    var url = `/tools/${TOOL_NAMES.CYPHER_SUITE}/${graphDocMetadata.key}`;
    var title = `${graphDocMetadata.title}`;
    console.log(`adding ${url} to history`);
    window.history.pushState(
      { tool: TOOL_NAMES.CYPHER_SUITE, modelKey: graphDocMetadata.key },
      title,
      url
    );
  };

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

  setValue = (e) => {
    if (SecurityRole.canEdit()) {
      this.setState({
        saved: false,
        [e.target.name]: e.target.value,
      });
    }
  };

  clearDataModel = () => {
    //this.cypherBlockDataProvider.setDataModelKey(null);
    this.setState({
      selectedDataModel: null,
      selectedDataModelMetadata: null,
      selectedDataModelText: this.getSelectedModelText(),
    });

    if (this.dataModelRef.current) {
      this.dataModelRef.current.resetCanvas();
    }
  };

  handleDataModel = (dataModel, dataModelResponse) => {
    //this.dataModelRef.current.resetCanvas();
    this.setState(
      {
        selectedDataModel: dataModel,
        selectedDataModelMetadata: dataModelResponse.metadata,
        selectedDataModelText: this.getSelectedModelText(
          dataModelResponse.metadata
        ),
      },
      () => {
        // do post data model load stuff here
        this.cypherBlockDataProvider.handleDataModel(
          dataModel,
          dataModelResponse.key
        );        
      }
    );
  };

  renderDataModelArea = () => {
    if (this.dataModelRef.current) {
      var dataModelCanvas = this.getDataModelCanvas();
      dataModelCanvas.renderDataModel();
    }
  };

  loadRemoteModel = (modelInfo) => {
    this.setStatus("Loading Model...", true);
    handleLoadModelDialogClose(this.modelDialogHelperRef, () => {
      if (modelInfo && modelInfo.key) {
        loadRemoteDataModel(modelInfo.key, false, (dataModelResponse) => {
          //console.log(dataModelResponse);
          if (dataModelResponse.success === false) {
            var message = "Error loading model: " + dataModelResponse.error;
            this.setStatus(message, false);
            alert(message);
          } else {
            this.setStatus("", false);
            var dataModel = DataModel();
            dataModel.fromSaveObject(dataModelResponse);
            this.handleDataModel(dataModel, dataModelResponse);
          }
        });
      } else {
        alert("Unable to load model, the specified model may not exist");
      }
    });    
  };

  sortByProperty = (property) => (a, b) =>
    a[property] === b[property] ? 0 : a[property] > b[property] ? 1 : -1;

  addNodePatternFromDataModel = (dataModelDisplayNode) =>
    this.cypherBlockDataProvider.addNodePatternFromDataModel(
      dataModelDisplayNode
    );

  addNodeRelNodePatternFromDataModel = () => {}
  /*
  addNodeRelNodePatternFromDataModel = (
    dataModelDisplayStartNode,
    relationshipTypeArray,
    dataModelDisplayEndNode
  ) =>
    this.cypherBlockDataProvider.addNodeRelNodePatternFromDataModel(
      dataModelDisplayStartNode,
      relationshipTypeArray,
      dataModelDisplayEndNode
    );
  */

  getBottomDrawerHeight = () => {
    const { bottomDrawerOpen, bottomDrawerOpenHeight } = this.state;
    return bottomDrawerOpen
      ? bottomDrawerOpenHeight
      : Sizes.BottomTitleBarHeight;
  };

  getRightDrawerWidth = () => {
    const { rightDrawerOpen, rightDrawerOpenWidth } = this.state;
    return rightDrawerOpen ? rightDrawerOpenWidth : Sizes.RightTitleBarWidth;
  };

  increaseBottomDrawerHeight = () => {
    var { bottomDrawerOpenHeight } = this.state;
    var newHeight =
      pxVal(bottomDrawerOpenHeight) + pxVal(Sizes.BottomDrawerHeightIncrement);
    newHeight =
      newHeight > pxVal(Sizes.MaxBottomDrawerHeight)
        ? pxVal(Sizes.MaxBottomDrawerHeight)
        : newHeight;
    this.setState(
      {
        bottomDrawerOpenHeight: `${newHeight}px`,
      },
      () => {
        this.setCypherEditorSize();
        this.setBottomTableHeight();
      }
    );
  };

  decreaseBottomDrawerHeight = () => {
    var { bottomDrawerOpenHeight } = this.state;
    var newHeight =
      pxVal(bottomDrawerOpenHeight) - pxVal(Sizes.BottomDrawerHeightIncrement);
    newHeight =
      newHeight < pxVal(Sizes.MinBottomDrawerHeight)
        ? pxVal(Sizes.MinBottomDrawerHeight)
        : newHeight;
    this.setState(
      {
        bottomDrawerOpenHeight: `${newHeight}px`,
      },
      () => {
        this.setCypherEditorSize();
        this.setBottomTableHeight();
      }
    );
  };

  setDataModelCanvasSize = () => {
    if (this.dataModelRef.current) {
      var { rightDrawerOpenWidth } = this.state;
      var currentSize = this.dataModelRef.current.getCurrentDimensions();
      this.dataModelRef.current.updateDimensions({
        width: pxVal(rightDrawerOpenWidth) - 50,
        height: currentSize.height,
      });
    }
  };

  increaseRightDrawerWidth = () => {
    var { rightDrawerOpenWidth } = this.state;
    var newWidth =
      pxVal(rightDrawerOpenWidth) + pxVal(Sizes.RightDrawerWidthIncrement);
    newWidth =
      newWidth > pxVal(Sizes.MaxRightDrawerWidth)
        ? pxVal(Sizes.MaxRightDrawerWidth)
        : newWidth;
    this.setState(
      {
        rightDrawerOpenWidth: `${newWidth}px`,
      },
      () => {
        this.setDataModelCanvasSize();
      }
    );
  };

  decreaseRightDrawerWidth = () => {
    var { rightDrawerOpenWidth } = this.state;
    var newWidth =
      pxVal(rightDrawerOpenWidth) - pxVal(Sizes.RightDrawerWidthIncrement);
    newWidth =
      newWidth < pxVal(Sizes.MinRightDrawerWidth)
        ? pxVal(Sizes.MinRightDrawerWidth)
        : newWidth;
    this.setState(
      {
        rightDrawerOpenWidth: `${newWidth}px`,
      },
      () => {
        this.setDataModelCanvasSize();
      }
    );
  };

  toggleBottomDrawer = () => {
    const { bottomDrawerOpen } = this.state;
    var open = !bottomDrawerOpen;
    this.setState(
      {
        bottomDrawerOpen: open,
      },
      () => {
        if (this.graphDebugRef.current) {
          this.graphDebugRef.current.updateDimensions();
        }
        this.viewChanged(
          open ? GraphDocChangeType.PanelOpen : GraphDocChangeType.PanelClose
        );
      }
    );
  };

  toggleRightDrawer = () => {
    const { rightDrawerOpen } = this.state;
    var open = !rightDrawerOpen;
    this.setState(
      {
        rightDrawerOpen: open,
      },
      () => {
        this.viewChanged(
          open ? GraphDocChangeType.PanelOpen : GraphDocChangeType.PanelClose
        );
      }
    );
  };

  resizePanelsOnLoad = () => {
    this.setCypherEditorSize();
    this.setBottomTableHeight();
    this.setDataModelCanvasSize();
  };

  drawerDrag = {
    resizing: false,
    drawer: null,
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
    time: null,
  };

  drawerMouseDown = (drawer) => (e) => {
    const { bottomDrawerOpen, rightDrawerOpen } = this.state;
    if (
      (drawer === Drawers.Bottom && bottomDrawerOpen) ||
      (drawer === Drawers.Right && rightDrawerOpen)
    ) {
      this.drawerDrag = {
        resizing: true,
        drawer: drawer,
        initialX: e.pageX,
        initialY: e.pageY,
        currentX: e.pageX,
        currentY: e.pageY,
        time: new Date().getTime(),
      };
    }
  };

  drawerMouseMove = (e) => {
    if (this.drawerDrag.resizing) {
      const { drawer, currentX, currentY } = this.drawerDrag;
      if (drawer === Drawers.Bottom) {
        const { bottomDrawerOpenHeight } = this.state;
        var increase = currentY - e.pageY;
        var newHeight = pxVal(bottomDrawerOpenHeight) + increase;
        newHeight =
          newHeight > pxVal(Sizes.MaxBottomDrawerHeight)
            ? pxVal(Sizes.MaxBottomDrawerHeight)
            : newHeight;
        newHeight =
          newHeight < pxVal(Sizes.MinBottomDrawerHeight)
            ? pxVal(Sizes.MinBottomDrawerHeight)
            : newHeight;
        this.setState(
          {
            bottomDrawerOpenHeight: `${newHeight}px`,
          },
          () => {
            this.setCypherEditorSize();
            this.setBottomTableHeight();            
            this.viewChanged(GraphDocChangeType.PanelResize);
          }
        );
        this.drawerDrag.currentY = e.pageY;
      } else if (drawer === Drawers.Right) {
        const { rightDrawerOpenWidth } = this.state;
        var increase = currentX - e.pageX;
        var newWidth = pxVal(rightDrawerOpenWidth) + increase;
        newWidth =
          newWidth > pxVal(Sizes.MaxRightDrawerWidth)
            ? pxVal(Sizes.MaxRightDrawerWidth)
            : newWidth;
        newWidth =
          newWidth < pxVal(Sizes.MinRightDrawerWidth)
            ? pxVal(Sizes.MinRightDrawerWidth)
            : newWidth;
        this.setState(
          {
            rightDrawerOpenWidth: `${newWidth}px`,
          },
          () => {
            this.setDataModelCanvasSize();
            this.viewChanged(GraphDocChangeType.PanelResize);
          }
        );
        this.drawerDrag.currentX = e.pageX;
      }
    }
  };

  conditionalToggleBottomDrawer = () => {
    const { initialY, currentY, time } = this.drawerDrag;
    const yDiff = initialY - currentY;
    var now = new Date().getTime();
    const timeDiff = now - time;
    if (yDiff === 0 || timeDiff < 250) {
      // it's a click, let's toggle it
      this.toggleBottomDrawer();
    }
  };

  conditionalToggleRightDrawer = () => {
    const { initialX, currentX, time } = this.drawerDrag;
    const xDiff = initialX - currentX;
    var now = new Date().getTime();
    const timeDiff = now - time;
    if (xDiff === 0 || timeDiff < 250) {
      // it's a click, let's toggle it
      this.toggleRightDrawer();
    }
  };

  drawerMouseUp = (e) => {
    const { drawer } = this.drawerDrag;
    this.drawerDrag.resizing = false;
  };

  addCypherBlockClick = ({ position }) => (scrollIntoView, callback) => {
    if (SecurityRole.canEdit()) {
      const { addButtonOpen } = this.state;
      scrollIntoView = (typeof(scrollIntoView) !== 'boolean') ? true: scrollIntoView;
      if (typeof position === "number" || position === "end") {
        var newBlock = this.cypherBlockDataProvider.getNewBlock({
          position,
          scrollIntoView: scrollIntoView
        });
        newBlock.isAddButtonOpen = addButtonOpen;
        const { cypherBlocks } = this.state;
        var newCypherBlocks = cypherBlocks.slice();
        if (position === "end") {
          newCypherBlocks.push(newBlock);
        } else {
          newCypherBlocks.splice(position, 0, newBlock);
        }

        this.setState(
          {
            cypherBlocks: newCypherBlocks,
          },
          () => {
            this.calculatePageSize();
            if (callback) {
              callback();
            }
          }
        );
      } else {
        alert(`addCypherBlockClick, bad position: ${position}`);
      }
    } else {
      alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
    }
  };

  toggleAccordionPanel = (cypherBlock) => () => {
    var { cypherBlocks } = this.state;
    var newCypherBlocks = cypherBlocks.slice();
    var index = newCypherBlocks.findIndex((x) => x.key === cypherBlock.key);
    var isExpanded = true;
    if (index >= 0) {
      const blockToToggle = newCypherBlocks[index];
      isExpanded = !blockToToggle.expanded;
      blockToToggle.expanded = isExpanded;

      this.setState(
        {
          cypherBlocks: newCypherBlocks,
        },
        () => {
          this.calculatePageSize();
          this.cypherBlockDataProvider.setBlockState({
            key: cypherBlock.key,
            expanded: isExpanded,
            selected: cypherBlock.selected,
          });
        }
      );
    }
  };

  selectAccordionPanel = (cypherBlock) => () => {
    var { cypherBlocks } = this.state;
    var newCypherBlocks = cypherBlocks.slice();
    var index = newCypherBlocks.findIndex((x) => x.key === cypherBlock.key);
    var isSelected = true;
    if (index >= 0) {
      newCypherBlocks.map((block, i) => {
        if (i !== index && block.selected) {
          // ignore the block we are selecting, it gets handled later
          // save it if we change a selected block to unselected
          this.cypherBlockDataProvider.setBlockState({
            key: block.key,
            expanded: block.expanded,
            selected: false,
          });
          block.selected = false;
        }
      });

      const blockToSelect = newCypherBlocks[index];
      isSelected = !blockToSelect.selected;
      blockToSelect.selected = isSelected;

      console.log('setting cypher: ', cypherBlock.dataProvider.getCypher());
      var cypherQueryString = cypherBlock.dataProvider.getCypher();
      //this.setCypherEditorCypherQuery(cypherQueryString);
      this.setState(
        {
          cypherQuery: cypherQueryString,
          cypherBlocks: newCypherBlocks
        },
        this.cypherBlockDataProvider.setBlockState({
          key: cypherBlock.key,
          expanded: cypherBlock.expanded,
          selected: isSelected,
        })
      );
    }
  };

  removeAccordionPanel = (cypherBlock) => () => {
    var { cypherBlocks } = this.state;
    var newCypherBlocks = cypherBlocks.slice();
    var index = newCypherBlocks.findIndex((x) => x.key === cypherBlock.key);

    if (index >= 0) {
      newCypherBlocks.splice(index, 1);
    }

    this.setState(
      {
        cypherBlocks: newCypherBlocks,
      },
      () => {
        this.calculatePageSize();
        this.cypherBlockDataProvider.removeBlock({
          key: cypherBlock.key,
        });
      }
    );
  };

  moveAccordionPanel = (draggedBlockKey, droppedOnBlockKey, position) => {
    // position will be 'before' or 'after'. Currently it is only 'after' if it is the last cypherBlock
    var newCypherBlocks = this.cypherBlockDataProvider.moveBlock({
      draggedBlockKey: draggedBlockKey,
      droppedOnBlockKey: droppedOnBlockKey,
      position: position,
    });

    if (newCypherBlocks) {
      this.setState({
        cypherBlocks: newCypherBlocks,
      });
    }
  };

  calculatePageSize = () => {
    setTimeout(() => {
      console.log("calculatePageSize called");
      var { cypherBlocks } = this.state;
      const newMinHeight = cypherBlocks
        .map((block) => {
          const el = document.getElementById(this.getBlockDomId(block.key));
          return el && el.getBoundingClientRect
            ? el.getBoundingClientRect().height
            : 0;
        })
        .reduce(
          (totalPageSize, blockPageSize) => totalPageSize + blockPageSize,
          Sizes.PageBottomPadding
        );

      this.setState({
        minHeight: newMinHeight,
      });
    }, 100);
  };

  getBlockDomId = (cypherBlockKey) => {
    return `block_${cypherBlockKey}`;
  };

  getPageSize = () => {
    const { minHeight } = this.state;
    return minHeight;
  };

  getScrollTop = () => {
    const mainEl = document.getElementById(DomIds.Main);
    return mainEl.scrollTop;
  };

  setScrollTop = (scrollTop) => {
    const mainEl = document.getElementById(DomIds.Main);
    return (mainEl.scrollTop = scrollTop);
  };

  scrollPane = (amount) => {
    const mainEl = document.getElementById(DomIds.Main);
    mainEl.scrollTop += amount;
  };

  scrollIntoView = ({ domElement, detailsDomElement }) => {
    const elementRect = domElement.getBoundingClientRect();
    const addControlElement = document.getElementById(
      DomIds.AddCypher
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
      detailsDomElement.classList.add("focusCypherBlock");
      setTimeout(
        () => detailsDomElement.classList.remove("focusCypherBlock"),
        250
      );
    }, 100);
  };

  isADocumentSelected = () => {
    var { activeKey } = this.state;
    return (activeKey) ? true : false;
  } 

  resetValidateCypherSuite = () => {
    if (this.cypherValidationRef.current) {
      
        this.cypherValidationRef.current.reset();

        this.setState({
            validationMessage: 'Not validated',
            validationStatus: ValidationStatus.NotValidated
        })
    }    
  }

  highlightItems = ({cypherKeys}) => {
    // we are only going to select the first entry in the array
    if (cypherKeys && cypherKeys.length > 0) {
      var { cypherBlocks } = this.state;
      var cypherBlock = cypherBlocks.find((x) => x.key === cypherKeys[0]);
      if (cypherBlock) {
        var domId = this.getBlockDomId(cypherBlock.key);
        var domElement = document.getElementById(domId);
        var detailsDomElement = document.getElementById(`${domId}_accordionDetails`);
        this.scrollIntoView({ domElement, detailsDomElement });

        // need the () below
        //  because the call to selectAccordionPanel returns a function, 
        //  so we then need to call it
        if (!cypherBlock.selected) {
          this.selectAccordionPanel(cypherBlock)(); 
        }
      }
    }
  }

  validateBigQueryExportDestinationInfo = (resultExportDestinationInfo) => {
    if (!resultExportDestinationInfo.projectId) {
      alert('You must select a Project Id exporting', ALERT_TYPES.WARNING);
      return false;
    }
    if (!resultExportDestinationInfo.datasetId) {
      alert('You must select a Dataset Id exporting', ALERT_TYPES.WARNING);
      return false;
    }
    if (!resultExportDestinationInfo.tableName) {
      alert('You must select a Table Name exporting', ALERT_TYPES.WARNING);
      return false;
    }
    return true;
  }

  validateResultExportDestinationInfo = (resultExportDestinationInfo) => {
    const { resultExportDialog } = this.state;
    if (resultExportDialog.exportType === ResultExportTypes.BigQuery) {
      return this.validateBigQueryExportDestinationInfo(resultExportDestinationInfo);
    }
    return false;
  }

  validateAndGetConnectionInfo = async () => {
    const { resultExportDestinationInfo, selectedDatabase } = this.state;
    if (!selectedDatabase) {
      alert('You must be select a database before exporting', ALERT_TYPES.WARNING);
      return;
    }
    const isValid = this.validateResultExportDestinationInfo(resultExportDestinationInfo);
    if (!isValid) {
      return;
    }

    const connectionInfo = await getConnectionInfoWithEncryptedUsernameAndPassword({
      driverId: selectedDatabase.id,
      connectionInfo: {
        databaseName: selectedDatabase.databaseName,
        encrypted: selectedDatabase.encrypted,
        id: selectedDatabase.id,
        name: selectedDatabase.name,
        url: selectedDatabase.url
      }
    });
    return connectionInfo;
  }

  exportResultsToBigQuery = async () => {
    const { cypherQuery, resultExportDestinationInfo } = this.state;
    const { activateTool } = this.props;
    const connectionInfo = await this.validateAndGetConnectionInfo();
    if (!connectionInfo) {
       return;
    }

    this.closeResultExportDialog();
    exportResults({
      cypherQuery, 
      neoConnectionInfo: connectionInfo, 
      bigQueryExportInfo: resultExportDestinationInfo
    }, (response) => {
      const { success, data, error } = response;
      if (success) {
        const { name, id } = data; // TODO: do something with this
        var customButton = (activateTool) ? {
            onClick: () => activateTool(TOOL_NAMES.DATA_SCIENCE_DASHBOARD),
            text: 'Monitor Job'
        } : null;
        alert('You export job has been submitted.', ALERT_TYPES.INFO, {}, customButton);
      } else {
        var errorMessage = (error && error.message) ? error.message : `${error}`
        console.log('error exporting data: ', error);
        alert(`An error occurred submitting the export job: ${errorMessage}`, ALERT_TYPES.ERROR);
      }
    });
  }

  showExportDataMappingJson = (mappingJsonString, fileName) => {
    this.setState({
      importExportDialog: {
          ...this.state.importExportDialog,
          open: true,
          title: `Export Data Mapping JSON`,
          text: mappingJsonString,
          placeholder: 'Data Mapping JSON',
          disableEditing: false,
          buttons: [        {
            text: 'Download As File',
            onClick: this.downloadTextAsFile(mappingJsonString, fileName),
            autofocus: true
          },
          {
              text: 'OK',
              onClick: (button, index) => this.closeImportExportDialog(),
              autofocus: false
          }]
      }
    }, () => {
        this.importExportDialogRef.current.focusTextBox();
    });
  }

  downloadTextAsFile = (text, fileName) => () => {
    var dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(text);
    downloadUrlAsFile(dataUrl, fileName);
  }  

  viewMappingJson = async () => {
    const { cypherQuery, resultExportDestinationInfo } = this.state;
    const connectionInfo = await this.validateAndGetConnectionInfo();
    if (!connectionInfo) {
       return;
    }
    this.closeResultExportDialog();

    const exportInfo = getExportPayload({
      cypherQuery, 
      neoConnectionInfo: connectionInfo, 
      bigQueryExportInfo: resultExportDestinationInfo});
    if (exportInfo) {
      const exportInfoJson = JSON.stringify(exportInfo, null, 2);
      var fileName = this.getExportFileName('data_mapping', 'json');
      this.showExportDataMappingJson(exportInfoJson, fileName);
    }
  }

  getExportFileName (defaultName, extension) {
    var title = this.getTitle();
    var fileName = title.replace(/[^A-Za-z0-9_]/g,'_')
    fileName = (fileName) ? `${fileName}.${extension}` : `${defaultName}.${extension}`;
    return fileName;
  }

  showExportResultsToBigQuery = () => {
    //if (!currentlyConnectedToNeo()) {
      // TODO: change this to include database selection in ResultExportDialog
      //alert('You must be connected to a Neo4j database first', ALERT_TYPES.WARNING);
    //} else {
      this.setState({
        resultExportDialog: {
            ...this.state.resultExportDialog,
            open: true,
        }
      });
    //}
  }

  /*
  setCypherEditor = (editor) => {
    this.cypherEditor = editor;
  }    

  setCypherEditorCypherQuery = (cypherQuery) => {
      tryAgain(() => {
        if (this.cypherEditor) {
            this.cypherEditor.setValue(cypherQuery);                
        }
      }, 5, 200);
  }
  */

  graphDebugCallback = (callbackMessage) => {
    console.log(callbackMessage);
    switch (callbackMessage.message) {
      case CANVAS_MESSAGES.EDIT_REQUESTED:
        // do nothing - edit not allowed
        break;
      default:
        //alert("TODO: graphDebugCallback handle this message (see console)");
        console.log("graphDebugCallback callbackMessage: ", callbackMessage);
    }
  };

  graphDebugCanvasWidth = () => {
    var canvasElement = document.getElementById(DomIds.CypherSuiteGraphDebug);
    var width = 0;
    if (canvasElement) {
        var rightDrawerWidth = this.getRightDrawerWidth();
        var left = canvasElement.getBoundingClientRect().left;
        width = window.innerWidth - left - pxVal(rightDrawerWidth) - pxVal(Sizes.MainAreaPadding);
    } else {
        width = window.innerWidth - pxVal(rightDrawerWidth) - pxVal(Sizes.MainAreaPadding) - 70;
    }
    return width;
  }

  graphDebugCanvasHeight = () => {
    var canvasElement = document.getElementById(DomIds.CypherSuiteGraphDebug);
    var height = 0;
    if (canvasElement) {
        var bottomDrawerHeight = this.getBottomDrawerHeight();
        var top = canvasElement.getBoundingClientRect().top;
        height = window.innerHeight - top - pxVal(bottomDrawerHeight) - pxVal(Sizes.MainAreaPadding);
    } else {
      height = window.innerHeight - pxVal(bottomDrawerHeight) - pxVal(Sizes.MainAreaPadding) - 70;
    }
    return height;
  }

  render() {
    var {
      mode,
      activeKey,
      selectedDataModel,
      cypherBlocks,
      showSaveDialog,
      showLoadDialog,
      saveFormMode,
      editMetadata,
      metadataMap,
      modelMetadataMap,
      selectedDataModelText,
      cypherEditorHeight,
      bottomActiveTabIndex,
      bottomDrawerOpen,
      rightDrawerOpen,
      rightDrawerOpenWidth,
      generalDialog,
      propertyDialog,
      relationshipCardinalityDialog,
      cypherQuery,
      editHelper,
      minHeight,
      shareDialog,
      importExportDialog,
      resultExportDialog,
      validationMessage,
      validationStatus,

      showNeo4jDatabaseDialog,
      selectedDatabaseText,
      neo4jDatabaseMap

    } = this.state;

    var { getLeftDrawerSize } = this.props;

    const exportResultsEnabled = getDynamicConfigValue('REACT_APP_CYPHER_SUITE_EXPORT_TO_BIGQUERY_ENABLED');

    const leftDrawerSize = getLeftDrawerSize();
    const selectedIndex = cypherBlocks.findIndex((x) => x.selected);
    const noneSelected = selectedIndex === -1;
    const position = noneSelected ? "end" : selectedIndex;

    return (
      <div
        id={DomIds.CypherSuite}
        style={{
          padding: Sizes.MainAreaPadding,
          paddingRight: Sizes.RightTitleBarWidth,
          background: "#E0E0E0",
        }}
        onMouseMove={this.drawerMouseMove}
        onMouseUp={this.drawerMouseUp}
      >
        <div
          style={{
            display: "flex",
            flexFlow: "row",
            background: "#F9F9F9",
            border: "1px solid #C6C6C6",
            position: "absolute",
            zIndex: 100,
            width: `calc(100% - ${Sizes.FloatingBarRightMargin})`,
          }}
        >
          {this.isADocumentSelected() ?
            <>
              {SecurityRole.getRole() === USER_ROLE.VIEWER &&
                <Tooltip enterDelay={600} arrow title="As a Viewer changes will not be saved">
                  <Button style={{
                    background: 'darkcyan', 
                    color: 'white', 
                    height: '2em',
                    marginTop: '.55em',
                    marginLeft: '.8em',
                    fontWeight: 600
                  }}>VIEWER</Button>
                </Tooltip>
              }
              <OutlinedStyledButton id={DomIds.AddCypher} style={{height: '2em'}}
                onClick={this.addCypherBlockClick({
                  position: position,
                })}
              >
                Add Cypher
              </OutlinedStyledButton>
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
                    }}
                  >
                    Data Model:{" "}
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {selectedDataModelText}
                  </span>
                </div>
                <OutlinedStyledButton
                  onClick={() => {
                    if (SecurityRole.canEdit()) {
                      showLoadModelDialog(this.modelDialogHelperRef);
                    } else {
                      alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
                    }
                  }}
                  style={{ marginLeft: "1em", height: "2em" }}
                  color="primary"
                >
                  <span style={{ whiteSpace: "nowrap" }}>Select Model...</span>
                </OutlinedStyledButton>
              </div>            
            </>
            :
            <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
              <span>No {TOOL_HUMAN_NAME} Document Loaded. Select 
                  <span className='textMenuReference'> File &gt; New {TOOL_HUMAN_NAME} </span> or
                  <span className='textMenuReference'> File &gt; Load {TOOL_HUMAN_NAME} </span>
                  to get started.
              </span>
            </Typography>
          }
        </div>
        {mode === DisplayMode.Debug ?
            <GraphCanvasControl
              ref={this.graphDebugRef}
              id={DomIds.CypherSuiteGraphDebug}
              domId={DomIds.CypherSuiteGraphDebug}
              dataProvider={this.graphDebugDataProvider}
              canvasConfig={this.graphDebugCanvasConfig}
              containerCallback={this.graphDebugCallback}
              snapToGrid={false}
              displayOptions={{
                displayColorPicker: true,
                displaySizeCircles: true,
                displayZoomControls: true,
                closeButton: true
              }}
              floatControls={true}
              floatControlsStyle={{
                marginLeftOffset: "1100px",
                marginTop: "1.0em"
              }}
              sizeCirclesStyle={{
                marginTop: '-.2em',
                marginRight: '2em'          
              }}
              zoomControlsStyle={{
                marginRight: "1.5em",
                marginTop: "-0.3em"
              }}
              additionalStyle={{
                border: "1px solid #CCC", 
                marginTop: "52px",
                background: "#ebebeb"
              }}
              canvasOptions={{
                [CANVAS_FEATURES.NODE_MOVE]: true,
                [CANVAS_FEATURES.DRAW_RELATIONSHIP]: false,
              }}
              getWidth={() => this.graphDebugCanvasWidth()}
              getHeight={() => this.graphDebugCanvasHeight()}
              closeCanvas={() => this.closeDebugCanvas()}
              parentContainer={this}
            />            
            :
            <div
              id={DomIds.CypherSuiteAccordionContainer}
              style={{ minHeight: `${minHeight}px`, marginTop: "2.5em" }}
            >
            <div
              style={{
                marginTop: "8px",
                border: "1px solid #C6C6C6",
                background: "#F9F9F9",
                width: "calc(100%-200px)",
              }}
            >
              {cypherBlocks.map((cypherBlock, index) => (
                <AccordionBlock
                  key={cypherBlock.key}
                  blockKey={cypherBlock.key}
                  domId={this.getBlockDomId(cypherBlock.key)}
                  expanded={cypherBlock.expanded}
                  selected={cypherBlock.selected}
                  noneSelected={noneSelected}
                  newItemName={NEW_THING_NAME}
                  scrollIntoView={cypherBlock.scrollIntoView}
                  showToggleTool={cypherBlock.showToggleTool}
                  parentBuilder={this}
                  dataProvider={cypherBlock.dataProvider}
                  selectAccordionPanel={this.selectAccordionPanel(cypherBlock)}
                  toggleAccordionPanel={this.toggleAccordionPanel(cypherBlock)}
                  removeAccordionPanel={this.removeAccordionPanel(cypherBlock)}
                  moveAccordionPanel={this.moveAccordionPanel}
                  addMode={cypherBlock.isAddButtonOpen}
                  rightWidthOffset={
                    pxVal(this.getRightDrawerWidth()) -
                    pxVal(Sizes.RightTitleBarWidth)
                  }
                  firstBlock={index === 0}
                  lastBlock={cypherBlocks.length - 1 === index ? true : false}
                >
                  {cypherBlock.blockElement}
                </AccordionBlock>
              ))}
            </div>
            </div>
        }

        <Drawer
          variant="permanent"
          anchor="right"
          onClose={() => {}}
          PaperProps={{
            style: {
              position: "absolute",
              top: Sizes.RightTop,
              border: "1px #C6C6C6 solid",
            },
          }}
        >
          <div
            className="box"
            style={{
              display: "flex",
              flexFlow: "row",
              width: this.getRightDrawerWidth(),
              height: "100%",
            }}
          >
            <div
              onMouseDown={this.drawerMouseDown(Drawers.Right)}
              onClick={this.conditionalToggleRightDrawer}
              onDoubleClick={this.toggleRightDrawer}
              style={{
                display: "flex",
                flexFlow: "column",
                cursor: "pointer",
                width: Sizes.RightTitleBarWidth,
                color: COLORS.toolBarFontColor,
                backgroundColor: COLORS.secondaryToolBarColor,
              }}
            >
              <div
                onClick={this.toggleRightDrawer}
                style={{
                  cursor: "pointer",
                  fontSize: "1.7em",
                  marginLeft: ".3em",
                }}
              >
                <span
                  className={`fa ${
                    rightDrawerOpen ? "fa-caret-right" : "fa-caret-left"
                  }`}
                  style={{ marginRight: "1.5em" }}
                />
              </div>
              <Typography
                    style={{
                    padding: "3px",
                    writingMode: "vertical-lr",
                    transform: "rotate(-180deg)",
                    }}
                >
                    Validation
              </Typography>  
              <div style={{ flexGrow: 1 }} />
            </div>
            <div style={{display: rightDrawerOpen ? 'flex' : 'none', flexFlow: 'column', 
                  width: '100%',paddingRight: '0px', paddingLeft: '10px'}}>
              <div style={{ padding: "10px", display: 'flex', flexFlow: 'row' }}>
                  <OutlinedStyledButton onClick={this.validateCypherSuite} color="primary"
                          style={{height:'2em'}}>
                      Validate
                  </OutlinedStyledButton>
                  <OutlinedStyledButton onClick={this.resetValidateCypherSuite} color="primary"
                          style={{height:'2em'}}>
                      Clear Validation
                  </OutlinedStyledButton>
                  <div style={{marginTop: '.7em'}}>
                      {getValidationIcon(validationStatus)}
                  </div>
                  <Typography style={{marginTop: '.7em', marginLeft: '.5em'}}
                  >
                      {validationMessage}
                  </Typography>
              </div>
              <div style={{overflowY: 'auto', paddingRight: '10px'}} >
                  <CypherValidation 
                      ref={this.cypherValidationRef}
                      highlightItems={this.highlightItems}
                      dataModel={selectedDataModel}
                      setValidationInfo={(validationMessage, validationStatus) => {
                          this.setState({
                              validationMessage,
                              validationStatus
                          })
                      }}
                  />
              </div>
          </div>
          </div>
        </Drawer>
        <Drawer
          variant="permanent"
          anchor="bottom"
          onClose={() => {}}
          PaperProps={{
            style: {
              position: "absolute",
              border: "1px #C6C6C6 solid",
              left: `${leftDrawerSize}px`,
              overflow: "hidden",
            },
          }}
        >
          <div className="box" style={{ height: this.getBottomDrawerHeight() }}>
            <div
              onMouseDown={this.drawerMouseDown(Drawers.Bottom)}
              onClick={this.conditionalToggleBottomDrawer}
              onDoubleClick={this.toggleBottomDrawer}
              style={{
                display: "flex",
                flexFlow: "row",
                cursor: "pointer",
                height: Sizes.BottomTitleBarHeight,
                color: COLORS.toolBarFontColor,
                backgroundColor: COLORS.secondaryToolBarColor,
              }}
            >
              <Typography
                style={{
                  marginLeft: ".5em",
                  marginTop: ".5em",
                }}
              >
                Cypher And Results
              </Typography>
              <div style={{ flexGrow: 1 }} />
              <div
                onClick={this.toggleBottomDrawer}
                style={{
                  cursor: "pointer",
                  fontSize: "1.7em",
                  marginTop: "0",
                }}
              >
                <span
                  className={`fa ${
                    bottomDrawerOpen ? "fa-caret-down" : "fa-caret-up"
                  }`}
                  style={{ marginRight: "1.5em" }}
                />
              </div>
            </div>
            <Tabs
              orientation="horizontal"
              variant="scrollable"
              value={bottomActiveTabIndex}
              onChange={this.changeBottomTab}
            >
              <Tab label="Cypher" />
              <Tab label="Results" />
              {/*<Tab label="Validation" />*/}
            </Tabs>
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Cypher}>
              <div style={{height: `${cypherEditorHeight}px`, 
                  borderBottom: '1px solid gray',
                  borderRight: '1px solid gray',
                  marginRight: '5px'
              }}>
                <CypherEditor
                    readOnly={true}
                    value={cypherQuery}
                    lineWrapping={true}
                    //onEditorCreated={this.setCypherEditor}
                    //cypherLanguage={false}
                    onSelectionChanged={(e) => {
                      console.log("Selection Changed (CypherSuite): ", e);
                    }}
                    classNames={["cypherEditor"]}
                />
                {/**
                <CypherEditor
                    readOnly={true}
                    initialValue={cypherQuery}
                    onEditorCreated={this.setCypherEditor}
                    //cypherLanguage={false}
                    classNames={["cypherEditor"]}
                />
                */}
              </div>

            </TabPanel>
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Results}>
              <ResultsTable 
                ref={this.resultsTableRef} 
                mykey="CypherSuiteResultTable"
                parentContainer={this} 
                exportResultsEnabled={exportResultsEnabled}
                exportResultsTitle={'Export Results to BigQuery'}
                showExportResultsDialog={this.showExportResultsToBigQuery}
                graphDebugCanvasControlRef={this.graphDebugRef}
                graphDebugCanvasDataProvider={this.graphDebugDataProvider}
              />
            </TabPanel>
            {/*}
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Validation}>
              <ValidationTable ref={this.validationTableRef} cypherBuilder={this} revalidate={this.validateCypher}/>
            </TabPanel>
              */}
          </div>
        </Drawer>

        <SaveForm
          maxWidth={"sm"}
          open={showSaveDialog}
          onClose={this.handleSaveDialogClose}
          ref={this.saveFormRef}
          save={this.saveCypherSuiteBuilderFromSaveForm}
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
          load={this.loadCypherSuiteBuilder}
          cancel={this.handleLoadDialogClose}
          delete={this.delete}
          toolHumanName={TOOL_HUMAN_NAME}
          performSearch={this.performSearch}
          metadataMap={metadataMap}
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
        <ModelDialogHelper 
          ref={this.modelDialogHelperRef}
          setStatus={this.setStatus}
          load={this.loadRemoteModel}
        />
        <GeneralDialog
          open={generalDialog.open}
          onClose={generalDialog.handleClose}
          title={generalDialog.title}
          description={generalDialog.description}
          buttons={generalDialog.buttons}
        />
        <PropertyDialog ref={this.propertyDialogRef}
                    editHelper={editHelper}
                    maxWidth={isFeatureLicensed(FEATURES.MODEL.PropertyConstraints) ? 'lg' : 'md'}
                    open={propertyDialog.open} onClose={propertyDialog.handleClose}
                    dataModel={selectedDataModel}/>
        <RelationshipCardinalityDialog ref={this.relationshipCardinalityDialogRef} maxWidth={'sm'} open={relationshipCardinalityDialog.open}
                    onClose={relationshipCardinalityDialog.handleClose}
                    relationshipType={relationshipCardinalityDialog.relationshipType}/>
        <ModalVariableLabelsAndTypes 
                    ref={this.modalVariableLabelAndTypesRef}
                    editHelper={editHelper}/>
        <Sharing maxWith={'md'} open={shareDialog.open} onClose={shareDialog.handleClose}
                    setIsPublic={shareDialog.setIsPublic} isPublic={shareDialog.isPublic}
                    userRoles={shareDialog.userRoles} docKey={activeKey}
                    toolUri={'/tools/cyphersuite/'}
                    upsertUser={shareDialog.upsertUser} removeUser={shareDialog.removeUser}
                    save={this.saveShare} ref={this.shareDialogRef} />
        <GeneralTextDialog maxWidth={'md'} open={importExportDialog.open} onClose={importExportDialog.handleClose}
                    ref={this.importExportDialogRef}
                    htmlText={importExportDialog.htmlText}
                    pasteHandler={importExportDialog.onPaste}
                    htmlPreviewMode={importExportDialog.htmlPreviewMode}
                    disableEditing={importExportDialog.disableEditing}
                    title={importExportDialog.title} placeholder={importExportDialog.placeholder}
                    text={importExportDialog.text} setText={importExportDialog.setText}
                    buttons={importExportDialog.buttons} rows={15} />
        <ResultExportDialog
          maxWidth={'md'} 
          parentContainer={this}
          selectedNeo4jDatabaseText={selectedDatabaseText}
          open={resultExportDialog.open} onClose={resultExportDialog.handleClose}        
          title={resultExportDialog.title}
          exportType={resultExportDialog.exportType}
          buttons={resultExportDialog.buttons}
        />
      </div>
    );
  }
}
