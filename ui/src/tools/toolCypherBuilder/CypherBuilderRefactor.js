import React, { Component } from "react";
import { Button, Drawer, Tabs, Tab, Typography, Tooltip } from "@material-ui/core";
//import { CypherEditor } from "graph-app-kit/components/Editor";
//import CypherEditor from "react-codemirror-cypher";
import { CypherEditor } from '@neo4j-cypher/react-codemirror'; 

import "@neo4j-cypher/codemirror/css/cypher-codemirror.css";

import "../../common/css/react-resizable.css";

import Timer from "../../common/util/timerUtil";
import { TabPanel } from "../../components/common/Components";
import FullScreenWaitOverlay from '../../components/common/FullScreenWaitOverlay';
import GeneralDialog from "../../components/common/GeneralDialog";
import GeneralTextDialog from "../../components/common/GeneralTextDialog";

import { getAuth } from "../../auth/authUtil";

import DataModel from "../../dataModel/dataModel";
import GraphCanvasControl from "../../components/canvas/GraphCanvasControl";
import { CANVAS_MESSAGES } from "../../components/canvas/d3/graphCanvas";
import { DataModelCanvasConfig } from "./components/graphCanvas/dataModelCanvasConfig";

import { serializeDataMappingsToJson } from "./components/dataProvider/dataMappingJson";
import { CypherBlockDataProvider } from "./components/dataProvider/cypherBlockDataProvider";
import { DataModelCanvasDataProvider } from "./components/dataProvider/dataModelCanvasDataProvider";
import { SyncedEventTypes } from "../../dataModel/syncedGraphDataAndView";
import CypherQueryList from "./components/CypherQueryList";

import ExecuteCypher from "../common/execute/executeCypher";
import LoadForm from "../common/edit/LoadForm";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import ResultsTable from "./components/results/ResultsTable";
import ValidationTable from "./components/validation/ValidationTable";
import LoadModelForm from "../../tools/toolModel/components/LoadModelForm";
import { ALERT_TYPES, USER_ROLE, COLORS } from "../../common/Constants";
import { SAVE_MODE } from "../common/toolConstants";

import SecurityRole, { SecurityMessages } from "../common/SecurityRole";
import Sharing from '../common/security/Sharing';
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

import { CypherVariableScope } from "../../dataModel/cypherVariableScope";
import { showNeoConnectionDialog } from "../../common/Cypher";

import {
  loadRemoteDataModel,
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

import { editKeymakerPhase } from "../../persistence/graphql/GraphQLKeymaker";

import { CommunicationHelper } from "../common/communicationHelper";
import { promptLockedDocument } from "../common/lockHelper";
import { PersistenceHelper } from "../common/persistenceHelper";
import { stopListeningTo, listenTo } from "../../dataModel/eventEmitter";
import { CANVAS_FEATURES } from "../../components/canvas/d3/graphCanvas";
import CypherAccordionBlock from "./components/cypherBlocks/CypherAccordionBlock";
import { AddControl } from "./components/AddControl";
import { decodeObject } from "../../common/encryption";
import { validate } from "graphql";
import { getDynamicConfigValue } from '../../dynamicConfig';
import { json } from "d3";

const TOOL_HUMAN_NAME = "Cypher Builder";
const DOCUMENT_NAME = "Cypher";
const NEW_DOCUMENT_TITLE = `New ${DOCUMENT_NAME}`;

export const CypherBlockKeywords = {
  CYPHER: "CYPHER",
  //CREATE: "CREATE",
  //MERGE: "MERGE",
  MATCH: "MATCH",
  OPTIONAL_MATCH: "OPTIONAL MATCH",
  WHERE: "WHERE",
  RETURN: "RETURN",
  ORDER_BY: "ORDER BY",
  SKIP: "SKIP",
  LIMIT: "LIMIT",
};

const DomIds = {
  Main: "main",
  CypherBuilder: "CypherBuilder",
  CypherBuilderAddControl: "CypherBuilderAddControl",
  CypherBuilderAccordionContainer: "CypherBuilderAccordionContainer",
};

export const Sizes = {
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

const AccordionPanels = {
  Match: "MatchPanel",
  Cypher: "CypherPanel",
  Where: "WherePanel",
  Return: "ReturnPanel",
};

const Drawers = {
  Bottom: "Bottom",
  Right: "Right",
};

const BottomTabIndexes = {
  Cypher: 0,
  Results: 1,
  Validation: 2
}

const NO_ACTIVE_DOCUMENT_MESSAGE = `No ${TOOL_HUMAN_NAME} document is loaded. This option is unavailable when there is not an active document.`;

export default class CypherBuilder extends Component {
  GraphDocType = "CypherBuilder";

  id = "cypherBuilder";

  //variableScope = new CypherVariableScope();
  cypherBlockDataProvider = new CypherBlockDataProvider({
    id: this.id,
    cypherBuilder: this,
    //variableScope: this.variableScope
  });

  executeCypher = new ExecuteCypher();

  dataModelCanvasConfig = null;

  loading = false;
  dataChangeTimer = null;
  retryTimer = null;

  getDataProvider = () => this.cypherBlockDataProvider;

  getCypherBlockAddOptions = () => {
    return {
      key: "cypherBlockAddOptions",
      dataItems: Object.keys(CypherBlockKeywords).map((key) => {
        var keyword = CypherBlockKeywords[key];
        return {
          key: key,
          keyword: keyword,
          getText: () => (
            <>
              <span style={{ fontSize: "0.85em" }} className="fa fa-plus" />{" "}
              {keyword}
            </>
          ),
          getFontColor: () => "black",
          getColor: () => "white",
          matches: (searchText) =>
            keyword.toLowerCase().startsWith(searchText.toLowerCase()),
        };
      }),
    };
  };

  cypherBlockAddOptions = this.getCypherBlockAddOptions();

  getNewCypherBlockDataProvider = (graphDocMetadata) => {
    if (this.cypherBlockDataProvider) {
      stopListeningTo(this.cypherBlockDataProvider, this.id);
      // TODO: get variables to clear and pass them to variableScope.clearVariables
      //this.variableScope.clearVariables();
    }
    var cypherBlockDataProvider = new CypherBlockDataProvider({
      id: graphDocMetadata.key,
      cypherBuilder: this,
      //variableScope: this.variableScope
    });
    listenTo(cypherBlockDataProvider, this.id, this.dataChangeListener);
    console.log("listenTo called on cypherBlockDataProvider");
    return cypherBlockDataProvider;
  };

  removeListenerBeforeDeserialize = (cypherBlockDataProvider) =>
    stopListeningTo(cypherBlockDataProvider, this.id);

  addListenerAfterDeserialize = (cypherBlockDataProvider) =>
    listenTo(cypherBlockDataProvider, this.id, this.dataChangeListener, true);

  getDataModel = () => this.state.selectedDataModel;

  closeShareDialog = () => {
    this.setState({ shareDialog: { ...this.state.shareDialog, open: false } });
  }

  closeGeneralDialog = () => {
    this.setState({
      generalDialog: { ...this.state.generalDialog, open: false },
    });
  };

  closeGeneralTextDialog = () => {
    this.setState({ generalTextDialog: { ...this.state.generalTextDialog, open: false } });
  }

  setGeneralText = (e) => {
    this.setState({ generalTextDialog: { ...this.state.generalTextDialog, text: e.target.value } });
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

  showGeneralTextDialog({ title, text, includeExecuteButton = true }, action) {
    var buttons = [];
    if (includeExecuteButton) {
      buttons.push({
        text: 'Execute',
        onClick: (button, index) => {
          if (typeof (action) === 'function') {
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
    this.whereClauseRef = React.createRef();
    this.returnClauseRef = React.createRef();
    this.resultsTableRef = React.createRef();
    this.validationTableRef = React.createRef();
    this.saveFormRef = React.createRef();
    this.textFocus = this.utilizeFocus();
    this.cypherEditorRef = React.createRef();
    this.shareDialogRef = React.createRef();
    this.generalTextDialogRef = React.createRef();
    this.modelDialogHelperRef = React.createRef();

    this.queryParams = null;

    this.dataModelCanvasConfig = new DataModelCanvasConfig({
      dataProvider: this.dataModelCanvasDataProvider,
      containerCallback: this.dataModelCallback,
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

    this.dataModelCanvasDataProvider = new DataModelCanvasDataProvider({
      id: `${this.id}_dataModel`,
      cypherBuilder: this,
    });

    listenTo(
      this.dataModelCanvasDataProvider,
      this.id,
      this.dataChangeListener
    );
  }

  getSelectedModelText = (modelInfo) => {
    var modelName = "";
    if (modelInfo) {
      modelName = modelInfo.title ? modelInfo.title : "Untitled";
    } else {
      modelName = "No Model Selected";
    }
    return modelName;
  };

  getDefaultAccordionPanelState = () => {
    return {
      [AccordionPanels.Match]: true,
      [AccordionPanels.Cypher]: true,
      [AccordionPanels.Where]: false,
      [AccordionPanels.Return]: true,
    };
  };

  state = {
    addButtonOpen: true,
    cypherBlocks: [],
    bottomActiveTabIndex: 0,
    rightActiveTabIndex: 0,
    cypherInput: "",
    cypherQuery: "",
    activeKey: "",
    status: "",
    bottomDrawerOpen: true,
    bottomDrawerOpenHeight: Sizes.DefaultBottomDrawerHeight,
    cypherEditorHeight: 100,
    rightDrawerOpen: false,
    rightDrawerOpenWidth: Sizes.DefaultRightDrawerWidth,
    minHeight: Sizes.PageBottomPadding,
    selectedDataModel: null,
    selectedDataModelMetadata: null,
    selectedDataModelText: this.getSelectedModelText(),
    activityIndicator: false,
    fullScreenBusyIndicator: false,
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

  componentDidMount() {
    window.addEventListener("resize", this.setDataModelCanvasSize);
  }

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.setDataModelCanvasSize);
  };

  getActiveKey = () => this.state.activeKey;

  getCypher = () => this.cypherBlockDataProvider.getCypher();

  updateCypher = () => {
    const cypher = this.cypherBlockDataProvider.getCypher();
    this.setCypherQuery(cypher);
    if (this.resultsTableRef.current) {
      this.resultsTableRef.current.setCypherQuery(cypher, {
        source: "CypherBuilder",
      });
    }
  };

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

  setCypherQuery = (value, skipSettingInternalValue) => {
    /*
    if (!skipSettingInternalValue) {
      this.setCypherEditorCypherQuery(value);
    }
    if (!this.cypherEditor) {
      return;
    }
    */

    try {
      this.setState(
        {
          cypherQuery: value,
        },
        () => {
          //this.runQuery(value);
          this.resetDebuggingSession();
        }
      );
    } catch (e) {
      console.log('error calling setCypherQuery: ', e);
      this.resetDebuggingSession();
    }
  };

  updateResultPanelTimer = null;
  updateResultsPanelDelayed = (cypherQuery) => {
    if (this.updateResultPanelTimer) clearTimeout(this.updateResultPanelTimer);
    this.updateResultPanelTimer = setTimeout(this.updatedResultsPanel, 250);
  };

  executeCypherAndShowResults = (cypher, isDebug, callback) =>
    this.runQuery(cypher, callback);

  runQuery = (cypherQueryToRun, callback) => {
    var { cypherQuery } = this.state;
    cypherQueryToRun = cypherQueryToRun ? cypherQueryToRun : cypherQuery;
    var lastReturnClause = this.cypherBlockDataProvider.getLastReturnClause();

    this.executeCypher.runQuery(cypherQueryToRun, {}, lastReturnClause, (results) => {
      this.resultsTableRef.current.setData(results);
      if (callback) {
        callback();
      }
    });
  }

  resetDebuggingSession = () => {
    if (this.resultsTableRef.current) {
      if (this.resultsTableRef.current.areDebugging()) {
        this.resultsTableRef.current.startDebugging();
      }
    }
  };


  changeBottomTab = (event, index) => {
    this.setState(
      {
        bottomActiveTabIndex: index,
      },
      () => {
        if (index === 0) {
          setTimeout(() => {
            //this.cypherEditorRef.current.getCodeMirror().refresh();
          }, 100);
        } else if (index === 1) {
          setTimeout(() => {
            this.resultsTableRef.current.refreshCodeMirrorCode();
          }, 100);
        }
      }
    );
  };

  changeRightTab = (event, index) => {
    this.setState({
      rightActiveTabIndex: index,
    });
  };

  setStatus = (message, active) => {
    var fullScreenBusy = false;
    if (typeof (active) === 'object') {
      fullScreenBusy = (active.fullScreenBusy) ? true : false;
      active = (fullScreenBusy) ? false : true;
    }
    message = typeof message === "string" ? message : "" + message;
    //console.log("status: " + message);
    const { status, activityIndicator, fullScreenBusyIndicator } = this.state;
    if (message !== status || active !== activityIndicator || fullScreenBusy !== fullScreenBusyIndicator) {
      var stateObj = {
        status: message,
        activityIndicator: active,
        fullScreenBusyIndicator: fullScreenBusy
      }
      this.setState(stateObj);
    }
    /*
        [
            {time: 10, message: 'Loading taking longer than normal...'},
            {time: 30, message: 'Connection may have dropped. Consider reloading page.'}
        ]
        */
  };

  saveNewCypherBuilderFromKeymaker = (keymakerMetadataProperties) => {
    var editMetadata = getMetadata(NEW_DOCUMENT_TITLE);
    var keymakerMetadataProperties = keymakerMetadataProperties || {};
    SecurityRole.setRole(USER_ROLE.OWNER);
    var properties = {
      loadedMetadata: {},
      editMetadata: {
        ...editMetadata,
        ...keymakerMetadataProperties,
        userRole: USER_ROLE.OWNER,
      },
      saveFormMode: SAVE_MODE.NEW,
    };
    return this.saveCypherBuilder(properties);
  };

  saveCypherBuilderFromSaveForm = () => {
    var { loadedMetadata, editMetadata, saveFormMode } = this.state;
    var properties = { loadedMetadata, editMetadata, saveFormMode };
    return this.saveCypherBuilder(properties);
  };

  saveCypherBuilder = (properties) => {
    var { loadedMetadata, editMetadata, saveFormMode } = properties;
    var { activeKey } = this.state;
    var previousState = JSON.parse(JSON.stringify(loadedMetadata)); // deep copy

    if (
      saveFormMode === SAVE_MODE.TOTALLY_NEW ||
      saveFormMode === SAVE_MODE.NEW
    ) {
      this.reset(editMetadata);
      this.resetResultsTableResults();
      SecurityRole.setRole(USER_ROLE.OWNER);
    }

    var graphDocMetadata = {
      ...editMetadata,
      dateCreated: editMetadata.dateCreated
        ? editMetadata.dateCreated
        : new Date().getTime().toString(),
      dateUpdated: new Date().getTime().toString(),
      viewSettings: {
        cypherViewSettings: this.getCypherViewSettings(),
        //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
        dataModelViewSettings: (this.getDataModelGraphCanvas()) ? this.getDataModelGraphCanvas().getViewSettings() : {},
      },
    };
    this.setState(
      {
        loadedMetadata: graphDocMetadata,
        activeKey: editMetadata.key,
      },
      () => {
        var { loadedMetadata } = this.state;
        this.saveRemoteMetadata(loadedMetadata, previousState, {
          mode: saveFormMode,
          previousActiveKey: activeKey
        });
      }
    );
    return graphDocMetadata;
  };

  saveRemoteMetadata = (loadedMetadata, previousState, { mode, previousActiveKey }) => {
    this.setStatus("Saving...", { fullScreenBusy: true });
    //var graphDataView = this.cypherBlockDataProvider.data().getGraphDataView();
    //this.persistenceHelper.saveRemoteGraphDocMetadataWithView (loadedMetadata, graphDataView, previousState, (response) => {
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
          if (
            mode === SAVE_MODE.TOTALLY_NEW ||
            mode === SAVE_MODE.NEW
          ) {
            this.setState({
              showSaveDialog: false,
            });
            this.loadCypherBuilder(this.state.metadataMap[previousActiveKey]);
          }
        } else {
          this.setState({
            metadataMap: {
              ...this.state.metadataMap,
              [loadedMetadata.key]: loadedMetadata,
            },
            showSaveDialog: false,
          });
          this.props.setTitle(this.getTitle(loadedMetadata));
          this.setStatus("Saved.", false);
        }
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

  getDataModelGraphCanvas = () =>
    this.dataModelRef && this.dataModelRef.current
      ? this.dataModelRef.current.getGraphCanvas()
      : null;

  viewChanged = (changeType) => {
    if (this.isADocumentSelected()) {
      this.dataChangeListener("viewChanged", changeType, {});
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
          var graphDocMetadata = {
            ...loadedMetadata,
            dateUpdated: new Date().getTime().toString(),
            viewSettings: {
              cypherViewSettings: this.getCypherViewSettings(),
              //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
              dataModelViewSettings: (this.getDataModelGraphCanvas()) ? this.getDataModelGraphCanvas().getViewSettings() : {},
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
      }, 2000);
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
      keepDataChangeFlags
    },
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

  setCypherBlockDataProvider(cypherBlockDataProvider) {
    //this.getGraphCanvas().setDataProvider(cypherBlockDataProvider);
    this.cypherBlockDataProvider = cypherBlockDataProvider;
    if (this.whereClauseRef.current) {
      this.whereClauseRef.current.setCypherBlockDataProvider(
        cypherBlockDataProvider
      );
    }
    if (this.returnClauseRef.current) {
      this.returnClauseRef.current.setCypherBlockDataProvider(
        cypherBlockDataProvider
      );
    }
  }

  handleViewSettings = (canvasViewSettings, graphCanvas, canvasRef) => {
    if (graphCanvas) {
      graphCanvas.setViewSettings(canvasViewSettings);
    }
    if (canvasViewSettings.scaleFactor && canvasViewSettings.scaleFactor != 1) {
      var scaleFactor = 100 * canvasViewSettings.scaleFactor;
      var howMuch = Math.round(Math.abs(100 - scaleFactor));
      if (scaleFactor > 100) {
        canvasRef.current.zoomIn(howMuch);
      } else {
        canvasRef.current.zoomOut(howMuch);
      }
    }
  };

  reset = (graphDocMetadata) => {
    var cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
      graphDocMetadata
    );
    this.clearDataModel();
    this.setCypherQuery("");
    this.setCypherBlockDataProvider(cypherBlockDataProvider);

    const loadedCypherBlocks = this.cypherBlockDataProvider.getCypherBlocks();
    this.setState({
      addButtonOpen: loadedCypherBlocks.length === 0 ? true : false,
      cypherBlocks: loadedCypherBlocks,
    });

    if (this.whereClauseRef.current) {
      this.whereClauseRef.current.clearData();
    }
    if (this.returnClauseRef.current) {
      this.returnClauseRef.current.clearData();
    }
    return cypherBlockDataProvider;
  };

  getBottomDrawerOpenHeight = () => {
    const { bottomDrawerOpenHeight } = this.state;
    return pxVal(bottomDrawerOpenHeight);
  };

  getSizeValue = (key) => pxVal(Sizes[key]);

  getCypherViewSettings = () => {
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

  handleCypherViewSettings = (cypherViewSettings) => {
    cypherViewSettings = cypherViewSettings || {};
    var {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    } = cypherViewSettings;

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

  loadRemoteModelAndAdjustQueryParams = () => { };

  getCypherBlocks = () => this.cypherBlockDataProvider.getCypherBlocks();

  resetAndLoadRemoteModel = (modelInfo) => {
    this.clearDataModel();
    this.loadRemoteModel(modelInfo);
  }

  finishLoading = ({
    graphDocMetadata,
    lockInfo,
    cypherBlockDataProvider,
    dontPushWebHistory,
    callback
  }) => {
    this.clearDataModel();
    this.setCypherBlockDataProvider(cypherBlockDataProvider);
    var dataModelKey = this.queryParamDataModelKey
      ? this.queryParamDataModelKey
      : cypherBlockDataProvider.getDataModelKey();
    if (dataModelKey) {
      this.loadRemoteModel({ key: dataModelKey });
    } else {
      this.updateCypherPattern();
    }

    var viewSettings = graphDocMetadata.viewSettings
      ? graphDocMetadata.viewSettings
      : {};
    var cypherViewSettings = viewSettings.cypherViewSettings
      ? viewSettings.cypherViewSettings
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
      this.getDataModelGraphCanvas(),
      this.dataModelRef
    );
    this.handleCypherViewSettings(cypherViewSettings);
    // TODO: have all accordions open/close/resize themselves appropriately

    var userRole = graphDocMetadata.userRole;
    if (graphDocMetadata.isPublic && !userRole) {
      userRole = USER_ROLE.VIEWER;
    }

    const dataModelGraphCanvas = this.getDataModelGraphCanvas();
    if (dataModelGraphCanvas) {
      dataModelGraphCanvas.bringAllNodesToTop();
    }

    if (!dontPushWebHistory) {
      this.addToWebHistory(graphDocMetadata);
    }

    const loadedCypherBlocks = this.cypherBlockDataProvider.getCypherBlocks();
    console.log(
      "addButtonOpen: ",
      loadedCypherBlocks.length === 0 ? true : false
    );
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
    });

    SecurityRole.setRole(userRole);

    this.props.setTitle(this.getTitle(graphDocMetadata));
    this.calculatePageSize();
    this.resetResultsTableResults();

    if (callback) {
      callback(graphDocMetadata, cypherBlockDataProvider);
    }

    if (this.queryParams && this.queryParamDbConnection) {
      showNeoConnectionDialog({
        onConnectCallback: () => { },
        buttonText: "Connect",
        doCallbackOnWebSocketError: false,
        keymakerDbConnection: this.queryParamDbConnection,
      });
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

  resetResultsTableResults = () => {
    if (this.resultsTableRef.current) {
      const noResults = {
        headers: [],
        rows: [],
      };
      this.resultsTableRef.current.setData(noResults);
    }
  };

  renderDisplay = () => {
    // quick cypher
    //   search box / sort
    //   have a drop down to expand add / edit / run area
    //   list view gets filtered / ordered based on search box / sort
    //
    // draw canvas
    // draw code mirror renderer
    // for right now layout side-by-side or top-to-bottom
  };

  loadCypherBuilder = (graphDocMetadata, dontPushWebHistory, callback) => {
    //  Must clear out blocks before loading, because later when iterating through
    //  cypherBlocks if a key matches between the currently loaded component
    //  and the new loaded component, react componentDidMount will not get called.
    //  For components with render logic in componentDidMount they would not render
    //  correctly.
    this.setState({
      cypherBlocks: [],
    });
    this.loadRemoteCypherBuilder(
      graphDocMetadata,
      dontPushWebHistory,
      callback
    );
  };

  loadRemoteCypherBuilder = (
    graphDocMetadata,
    dontPushWebHistory,
    callback
  ) => {
    this.setStatus(`Loading ...${TOOL_HUMAN_NAME}`, { fullScreenBusy: true });
    if (graphDocMetadata && graphDocMetadata.key) {
      //this.persistenceHelper.loadRemoteGraphDocAndDefaultView(graphDocMetadata.key, (response) => {
      this.persistenceHelper.loadRemoteGraphDoc(
        graphDocMetadata.key,
        (response) => {
          //console.log(response);
          if (response.success === false) {
            var message = "Error loading cypher builder: " + response.error;
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
                lockInfo: response.lockInfo,
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
        "Unable to load cypher builder, the specified cypher may not exist"
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

    fileMenuItems.push({ id: 'share', text: 'Share' });
    //fileMenuItems.push({id: 'saveAs', text: `Clone ${TOOL_HUMAN_NAME}`});

    var fileMenu = {
      id: "cypherbuilder-file",
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
                if (isFeatureLicensed(FEATURES.CYPHER_BUILDER.Share)) {
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

    var layoutMenuId = "cypherbuilder-layout";
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

    // data transfer moved to Data Mapping tool
    /*
    var dataTransferMenuId = "cypherbuilder-datatransfer";
    var dataTransferMenuItems = [];
    dataTransferMenuItems.push({ id: "getDataSourceSchema", text: "Get Data Source Schema" });
    dataTransferMenuItems.push({ id: "runJob", text: "Run Job" });
    dataTransferMenuItems.push({ id: "runJobAsync", text: "Run Job Async" });
    dataTransferMenuItems.push({ id: "runWorkflow", text: "Run Workflow" });
    dataTransferMenuItems.push({ id: "jobStatus", text: "Job Status" });
    dataTransferMenuItems.push({ id: "getMappingJson", text: "Get Mapping Json" });

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
          case 'runWorkflow':
            this.runWorkflow();
            break;
          case 'getMappingJson':
            this.getMappingJson();
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
        FEATURES.MODEL.ImportModel, // TODO: change this
      ])
    ) {
      importMenuItems.push({ id: "import", text: `Import ${TOOL_HUMAN_NAME}` });
    }

    var importMenu = {
      id: "cypherbuilder-import",
      text: "Import",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "import":
            if (this.communicationHelper.isOnline()) {
              //this.showImportModel();
            }
            break;
          default:
            break;
        }
      },
      menuItems: importMenuItems,
    };
    /*
        if (importMenuItems.length > 0) {
            menus.push(importMenu);
        }
        */

    var exportMenuItems = [];
    var needExportDivider = false;
    if (isFeatureLicensed(FEATURES.MODEL.ExportModel)) {
      needExportDivider = true;
      exportMenuItems.push({ id: "export", text: `Export ${TOOL_HUMAN_NAME}` });
    }
    if (needExportDivider) {
      exportMenuItems.push({ id: "divider", text: "_" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.ExportSVG)) {
      exportMenuItems.push({ id: "downloadSvg", text: "Download SVG" });
    }

    var exportMenu = {
      id: "cypherbuilder-export",
      text: "Export",
      handler: (menu, menuItem) => {
        /*
                var { dataModel } = this.state;
                switch (menuItem.id) {
                    case 'export':
                        //this.showExportModel();
                        break;
                    case 'downloadSvg':
                        var title = (this.state.loadedMetadata && this.state.loadedMetadata.title) ?
                                            this.state.loadedMetadata.title : `New ${TOOL_HUMAN_NAME}`;
                        title = title.replace(/ /g, '_');
                        this.saveSvg(this.getGraphCanvas().getSvgElement(), title + '.svg');
                        break;
                    default:
                        break;
                }
                */
      },
      menuItems: exportMenuItems,
    };
    /*
        if (exportMenuItems.length > 0) {
            menus.push(exportMenu);
        }*/

    return menus;
  };

  getDataSourceSchema = () => {
    this.showGeneralTextDialog({ title: 'Get Schema' }, (text) => {
      getDataSourceSchema(text, (response) => {
        console.log('graphql response: ', response);
      })
      this.closeGeneralTextDialog();
    });
  }

  runJob = () => {
    this.showGeneralTextDialog({ title: 'Run Job' }, (text) => {
      runJob('BigQuery', { params: text }, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  runJobAsync = () => {
    this.showGeneralTextDialog({ title: 'Run Job Async' }, (text) => {
      runJobAsync('HopJob', { params: text }, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  jobStatus = () => {
    this.showGeneralTextDialog({ title: 'Job Status' }, (jobId) => {
      jobStatus(jobId, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  runWorkflow = () => {
    this.showGeneralTextDialog({ title: 'Run Workflow' }, (serviceId, maxRow) => {
      runWorkflow(serviceId, maxRow, (response) => {
        console.log('graphql response: ', response);
      });
      this.closeGeneralTextDialog();
    });
  }

  getMappingJson = () => {
    var { selectedDataModel, selectedDataModelMetadata } = this.state;
    if (!selectedDataModel) {
      alert('You need to select a data model first', ALERT_TYPES.WARNING);
    } else {
      var { projectId, dataMappingBlocks } = this.cypherBlockDataProvider.getDataMappingInfo();
      try {
        var mappingJson = serializeDataMappingsToJson({
          projectId,
          dataModel: selectedDataModel,
          dataModelMetadata: selectedDataModelMetadata,
          dataMappingBlocks
        });
      } catch (error) {
        alert(error, ALERT_TYPES.WARNING);
        return null;
      }

      this.showGeneralTextDialog({
        title: 'Mapping Json',
        text: JSON.stringify(mappingJson),
        includeExecuteButton: false
      });
    }
  }

  saveShare = () => {
    var { activeKey, metadataMap, shareDialog } = this.state;
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
    updateUserRolesGraphDoc(activeKey, shareDialog.isPublic, userRoles, (response) => {
      if (response.success) {
        this.setStatus('Saved.', false);
        this.closeShareDialog();
      } else {
        var errorStr = '' + response.error;
        if (errorStr.match(/Network error/)) {
          this.persistenceHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
        }
        alert(response.error);
      }
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

  resetQueryParams = () => {
    this.queryParams = null;
    this.queryParamDataModelKey = null;
    this.queryParamDbConnection = null;
    this.queryParamMetadata = null;
    this.queryParamKeymakerInfo = null;
  };

  handleQueryParams = () => {
    if (this.queryParams) {
      const queryParams = this.queryParams || {};
      const {
        metadata,
        dbConnection,
        dataModelKey,
        keymakerInfo,
      } = queryParams;
      if (dataModelKey) {
        this.queryParamDataModelKey = dataModelKey;
      }
      if (metadata) {
        this.queryParamMetadata = decodeObject(metadata);
      }
      if (dbConnection) {
        this.queryParamDbConnection = decodeObject(dbConnection);
      }
      if (keymakerInfo) {
        this.queryParamKeymakerInfo = decodeObject(keymakerInfo);
      }
    } else {
      this.resetQueryParams();
    }
  };

  setupKeymakerNewQuery = () => {
    const { rightDrawerOpen } = this.state;
    if (!rightDrawerOpen && this.queryParamDataModelKey) {
      this.toggleRightDrawer();
    }

    var addBlockFunc = this.addCypherBlockClick({ position: 'end' });
    addBlockFunc({ data: { keyword: CypherBlockKeywords.MATCH } }, false, () => {
      addBlockFunc({ data: { keyword: CypherBlockKeywords.RETURN } }, false);
    });
  }

  isKeymakerMode = () =>
    this.queryParams && this.queryParams.mode === "keymaker" ? true : false;

  tryToGoOnline = () => this.communicationHelper.tryToGoOnline();

  tabActivated = (properties) => {
    properties = properties || {};
    const { setTitle, setMenus } = this.props;
    setTitle(this.getTitle());
    setMenus(this.getMenus(), () => {
      var userInfo = getAuth().getLoggedInUserInfo();
      this.persistenceHelper.getUserSettings(userInfo.email, (result) => {
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
        this.resetQueryParams();

        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
        // need to pull stuff from local storage and set the state appropriately
        //  just as if we had loaded it from the database
        this.communicationHelper.tryToGoOnline();
      } else {
        var { urlParamsId, queryParams } = properties;
        this.queryParams = queryParams ? queryParams : null;

        this.handleQueryParams();

        //console.log('queryParams: ', queryParams);
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
          this.loadCypherBuilder(graphDocMetadata);
        } else {
          if (!componentLoadedAlready && urlParamsId) {
            alert(
              `No permission or ${this.GraphDocType} does not exist for id ${urlParamsId}`,
              ALERT_TYPES.WARNING
            );
          }

          if (this.isKeymakerMode()) {
            graphDocMetadata = this.saveNewCypherBuilderFromKeymaker(
              this.queryParamMetadata
            );
            this.cypherBlockDataProvider = this.getNewCypherBlockDataProvider(
              graphDocMetadata
            );
            this.finishLoading({
              graphDocMetadata,
              cypherBlockDataProvider: this.cypherBlockDataProvider,
              dontPushWebHistory: false,
              callback: this.setupKeymakerNewQuery
            });
          } else {
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
                  alert("Error opening cypher builder: " + e.message);
                  console.log(e);
                }
              }
            );
          }
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

  setCypherEditorReadOnly = () => {
    var numTries = 0;
    var maxTries = 5;

    const setReadOnly = () => {
      if (this.cypherEditorRef.current) {
        //var codeMirror = this.cypherEditorRef.current.getCodeMirror();
        //codeMirror.setOption("readOnly", true);
      } else {
        numTries++;
        if (numTries < maxTries) {
          setTimeout(setReadOnly, 200);
        }
      }
    };
    setReadOnly();
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

  dataModelCallback = (callbackMessage) => {
    console.log(callbackMessage);
    switch (callbackMessage.message) {
      case CANVAS_MESSAGES.EDIT_REQUESTED:
        // do nothing - edit not allowed
        break;
      default:
        //alert("TODO: dataModelCallback handle this message (see console)");
        console.log("dataModelCallback callbackMessage: ", callbackMessage);
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

  validateCypher = (properties) => {
    properties = properties || {};
    const { showAlert } = properties;
    var requiredReturnItems = this.queryParamKeymakerInfo
      ? this.queryParamKeymakerInfo.returnValues
      : [];

    // check if there are any required RETURN items
    var requiredAliases = Array.isArray(requiredReturnItems) ? requiredReturnItems.map(x => x.alias) : [];
    var setValidationMessages = false;

    if (requiredAliases.length > 0) {
      // get existing RETURN items
      var lastReturnClause = this.cypherBlockDataProvider.getLastReturnClause();
      var returnItems = lastReturnClause
        ? lastReturnClause.getReturnItems()
        : [];

      var returnItemNames = returnItems.map(x => x.alias ? x.alias : x.toCypherString());

      // search through our items and double check that they are all there
      var validationErrors = requiredAliases
        .filter(requiredAlias => !returnItemNames.includes(requiredAlias))
        .map(requiredAlias => `Return item '${requiredAlias}' is expected`);

      if (validationErrors.length > 0) {
        // if any are missing, scroll to the RETURN block if present
        const lastReturnBlock = this.cypherBlockDataProvider.getLastReturnBlock();
        if (lastReturnBlock) {
          const domId = this.getBlockDomId(lastReturnBlock.key);
          var domElement = document.getElementById(domId);
          var detailsDomElement = document.getElementById(`${domId}_accordionDetails`);
          this.scrollIntoView({ domElement, detailsDomElement });
        }

        // add validation messages to the validation tab
        if (this.validationTableRef.current) {
          setValidationMessages = true;
          var validationHeader = 'Validation Error';
          var headers = [validationHeader];
          var rows = validationErrors.map(x => ({
            [validationHeader]: x
          }));

          const validationData = {
            headers: headers,
            rows: rows
          };
          this.validationTableRef.current.setData(validationData);

          // activate the validation tab
          const { bottomActiveTabIndex } = this.state;
          if (bottomActiveTabIndex !== BottomTabIndexes.Validation) {
            this.changeBottomTab(null, BottomTabIndexes.Validation);
          }
        }

        if (showAlert) {
          alert('The cypher has been updated but there unresolved validation errors.', ALERT_TYPES.WARNING);
        }
        return false;
      }
    }

    if (!setValidationMessages) {
      const validationData = {
        headers: [],
        rows: []
      };
      this.validationTableRef.current.setData(validationData);
    }
    return true;
  }

  injectCypherIntoKeymaker = () => {
    const { cypherQuery, activeKey } = this.state;
    const phaseId = this.queryParamKeymakerInfo
      ? this.queryParamKeymakerInfo.phaseId
      : "";
    const keymakerOriginURL = this.queryParamKeymakerInfo
      ? this.queryParamKeymakerInfo.keymakerOriginURL
      : "";
    if (!phaseId) {
      alert("Keymaker phase id was not passed in");
    } else {
      var isValid = this.validateCypher({ showAlert: true });
      editKeymakerPhase(phaseId, cypherQuery, activeKey, (results) => {
        const { success } = results;
        if (!success) {
          alert(
            `Error saving cypher to phase id ${phaseId}, error: ${results.error}`
          );
        } else {
          if (window.opener) {
            window.opener.postMessage("Updated", keymakerOriginURL);
            if (isValid) {
              window.alert(
                "Select Keymaker tab to view edited Cypher",
                ALERT_TYPES.INFO
              );
            }
            window.blur();
          }
        }
      });
    }
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
    this.setStatus("Deleting...", { fullScreenBusy: true });
    //this.persistenceHelper.deleteRemoteGraphDocAndDefaultView(key, (response) => {
    // NOTE: we don't need the all of the subGraphDocKeys because the CypherPatterns will be
    //   be picked up when we delete the main document since they are part of the subgraph
    //const allKeys = [key].concat(this.cypherBlockDataProvider.getAllSubGraphDocKeys());

    // IMPORTANT:
    //  there is bad implementation bug below, until it's fixed we will prevent users
    //   from deleting anything except for the current document
    //
    //   issue is that getAllAssociatedGraphViewKeys is getting the currently loaded graph view keys,
    //    not necessarily the ones associated with the 'key' passed as an argument
    if (key !== activeKey) {
      alert('Issue Workaround: You can only delete the active document. To delete other documents, please load them first.', ALERT_TYPES.WARNING);
      this.setStatus("Delete cancelled", { fullScreenBusy: false });
      return;
    }

    // we want graphViewKeys first, because they will delegate security decisions to the main graphDoc
    const allKeys =
      this.cypherBlockDataProvider.getAllAssociatedGraphViewKeys().concat([key])

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
        /*
                if (this.state.loadedModelMetadata && this.state.loadedModelMetadata.key === modelKey) {
                    this.newModel();
                }*/
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
          this.handleLockedCypherBuilder(response.error.message, actions);
        } else {
          this.setStatus(response.error, false);
          alert(response.error);
        }
      }
    });
  };

  handleLockedCypherBuilder = (errorStr, actions) => {
    var matches = errorStr.match(/locked by user '(.+)' at (.+)/);
    var description = `${TOOL_HUMAN_NAME} is locked`;
    if (matches[1] && matches[2]) {
      description = `${TOOL_HUMAN_NAME} was locked by ${matches[1]
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
    var queryParamsString = "";
    if (this.queryParams) {
      Object.keys(this.queryParams).map((key) => {
        queryParamsString += queryParamsString ? "&" : "?";
        queryParamsString += `${key}=${this.queryParams[key]}`;
      });
    }
    var url = `/tools/${TOOL_NAMES.CYPHER_BUILDER}/${graphDocMetadata.key}${queryParamsString}`;
    var title = `${graphDocMetadata.title}`;
    console.log(`adding ${url} to history`);
    window.history.pushState(
      { tool: TOOL_NAMES.CYPHER_BUILDER, modelKey: graphDocMetadata.key },
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

  handleCypherInputKeyPress = (e) => {
    if (SecurityRole.canEdit()) {
      if (e.key === "Enter") {
        //var canvas = this.getGraphCanvas();
        alert("TODO: implement this");
      }
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
    //this.cypherBlockDataProvider.setDataModelKey(dataModelResponse.key);
    this.setState(
      {
        selectedDataModel: dataModel,
        selectedDataModelMetadata: dataModelResponse.metadata,
        selectedDataModelText: this.getSelectedModelText(
          dataModelResponse.metadata
        ),
      },
      () => {
        this.updateCypherPattern();
        this.renderDataModelArea();
        this.cypherBlockDataProvider.handleDataModel(
          dataModel,
          dataModelResponse.key
        );
        //this.buildAndSetDataModelChips(dataModel, dataModelResponse);
      }
    );
  };

  renderDataModelArea = () => {
    if (this.dataModelRef.current) {
      var { selectedDataModel } = this.state;
      this.dataModelCanvasDataProvider.setDataModel(selectedDataModel);
      var dataModelCanvas = this.getDataModelGraphCanvas();
      if (dataModelCanvas) {
        dataModelCanvas.setDataProvider(this.dataModelCanvasDataProvider);
      }
      //dataModelCanvas.render();
    }
  };

  updateCypherPattern = (args) => {
    args = args || {};
    //const { cypherBlockKey } = args;
    //var { selectedDataModel } = this.state;
    var timer = new Timer("CypherBuilder.updateCypherPattern");
    timer.start("start");
    var cypherPatterns = this.cypherBlockDataProvider.getAllCypherPatterns();
    timer.record("getCypherPattern");
    var dataModelCanvas = this.getDataModelGraphCanvas();
    this.dataModelCanvasDataProvider.updateCypherPatterns(
      cypherPatterns,
      dataModelCanvas
    );
    timer.record("updateCypherPattern");

    this.updateCypher();

    /*
        this.cypherBlockDataProvider.updateCypherPattern({
            cypherBlockKey: cypherBlockKey
        });
        */
    timer.stop("done");
  };

  loadRemoteModel = (modelInfo) => {
    this.setStatus("Loading Model...", { fullScreenBusy: true });
    if (modelInfo && modelInfo.key) {
      if (
        this.queryParams &&
        this.queryParamDataModelKey &&
        this.queryParamDataModelKey !== modelInfo.key
      ) {
        this.queryParamDataModelKey = null;
        delete this.queryParams.dataModelKey;
        var { metadataMap, activeKey } = this.state;
        var graphDocMetadata = metadataMap[activeKey];
        this.addToWebHistory(graphDocMetadata);
      }

      handleLoadModelDialogClose(this.modelDialogHelperRef, () => {
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
      });
    } else {
      alert("Unable to load model, the specified model may not exist");
    }
  };

  sortByProperty = (property) => (a, b) =>
    a[property] === b[property] ? 0 : a[property] > b[property] ? 1 : -1;

  addNodePatternFromDataModel = (dataModelDisplayNode) =>
    this.cypherBlockDataProvider.addNodePatternFromDataModel(
      dataModelDisplayNode
    );

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
    this.setCypherEditorReadOnly();
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

    /*
        if (drawer === Drawers.Bottom) {
            const { initialY, currentY } = this.drawerDrag;
            const yDiff = Math.abs(initialY - currentY);
            if (yDiff > 0) {
                this.setCypherEditorSize();
            }
        } else if (drawer === Drawers.Right) {
            const { initialX, currentX } = this.drawerDrag;
            const xDiff = Math.abs(initialX - currentX);
            if (xDiff > 0) {
                this.setDataModelCanvasSize();
            }
        }
        */
  };

  addCypherBlockClick = ({ position }) => (chip, scrollIntoView, callback) => {
    const { addButtonOpen } = this.state;
    scrollIntoView = (typeof (scrollIntoView) !== 'boolean') ? true : scrollIntoView;
    if (typeof position === "number" || position === "end") {
      const keyword = chip.data.keyword;
      var newBlock = this.cypherBlockDataProvider.getNewBlock({
        keyword,
        position,
        scrollIntoView: scrollIntoView,
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

      this.setState(
        {
          cypherBlocks: newCypherBlocks,
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

    /*
        const totalScrollTimeMillis = 2;
        var scrollTimeIncrement = Math.floor(totalScrollTimeMillis / amount);
        if (scrollTimeIncrement < 1) {
            scrollTimeIncrement = 1;
        } 
        const howManyTicks = totalScrollTimeMillis / scrollTimeIncrement;
        const scrollTickAmount = Math.floor(amount / howManyTicks);

        if (scrollTickAmount !== 0) {
            var amountScrolled = 0;

            const doScrollTick = () => {
                setTimeout(() => {
                    mainEl.scrollTop += scrollTickAmount;
                    amountScrolled += scrollTickAmount;
                    if (amountScrolled < amount) {
                        doScrollTick();
                    }
                }, scrollTimeIncrement);
            }
            doScrollTick();
        }
        */
    mainEl.scrollTop += amount;
  };

  scrollIntoView = ({ domElement, detailsDomElement }) => {
    const elementRect = domElement.getBoundingClientRect();
    const addControlElement = document.getElementById(
      DomIds.CypherBuilderAddControl
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

  showBusy = ({ busy }) => {
    this.setState({
      fullScreenBusyIndicator: busy
    });
  }

  render() {
    var {
      activeKey,
      cypherInput,
      addButtonOpen,
      cypherBlocks,
      addButtonOpen,
      showSaveDialog,
      showLoadDialog,
      saveFormMode,
      editMetadata,
      metadataMap,
      modelMetadataMap,
      selectedDataModel,
      selectedDataModelText,
      bottomActiveTabIndex,
      bottomDrawerOpen,
      rightDrawerOpen,
      rightDrawerOpenWidth,
      cypherEditorHeight,
      cypherQuery,
      generalDialog,
      generalTextDialog,
      minHeight,
      shareDialog,
      fullScreenBusyIndicator
    } = this.state;
    var { getLeftDrawerSize } = this.props;

    const placeholder = "Enter a Cypher Node Pattern";
    const leftDrawerSize = getLeftDrawerSize();
    const selectedIndex = cypherBlocks.findIndex((x) => x.selected);
    const noneSelected = selectedIndex === -1;
    const position = noneSelected ? "end" : selectedIndex;

    return (
      <div
        id={DomIds.CypherBuilder}
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
              <AddControl
                domId={DomIds.CypherBuilderAddControl}
                addOptionsData={this.cypherBlockAddOptions}
                toggleAddButtonOpen={this.toggleAddButtonOpen}
                addButtonOpen={addButtonOpen}
                onOptionClick={this.addCypherBlockClick({
                  position: position,
                })}
              />
              {/*<TextField name='cypherInput' id="cypherInput" label="Cypher Input" autoComplete="off"
                          inputRef={this.textFocus.ref}
                          value={cypherInput} 
                          onChange={this.setValue} 
                          onKeyPress={this.handleCypherInputKeyPress}
                          placeholder={placeholder} title={placeholder}
                          margin="dense" style={{marginRight: '.5em', width: '670px'}}/>*/}
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
              {this.isKeymakerMode() && (
                <OutlinedStyledButton
                  onClick={this.injectCypherIntoKeymaker}
                  style={{ marginLeft: "1em", height: "2em" }}
                  color="primary"
                >
                  <span style={{ whiteSpace: "nowrap" }}>Update Keymaker</span>
                </OutlinedStyledButton>
              )}
            </>
            :
            <Typography style={{ padding: '1em' }} variant="body1" color="inherit" noWrap>
              <span>No {TOOL_HUMAN_NAME} Document Loaded. Select
                <span className='textMenuReference'> File &gt; New {TOOL_HUMAN_NAME} </span> or
                <span className='textMenuReference'> File &gt; Load {TOOL_HUMAN_NAME} </span>
                to get started.
            </span>
            </Typography>
          }
        </div>
        <div
          id={DomIds.CypherBuilderAccordionContainer}
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
              <CypherAccordionBlock
                key={cypherBlock.key}
                blockKey={cypherBlock.key}
                domId={this.getBlockDomId(cypherBlock.key)}
                expanded={cypherBlock.expanded}
                selected={cypherBlock.selected}
                noneSelected={noneSelected}
                scrollIntoView={cypherBlock.scrollIntoView}
                showToggleTool={cypherBlock.showToggleTool}
                title={cypherBlock.title}
                cypherBuilder={this}
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
              </CypherAccordionBlock>
            ))}
          </div>
        </div>
        <Drawer
          variant="permanent"
          anchor="right"
          onClose={() => { }}
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
                  className={`fa ${rightDrawerOpen ? "fa-caret-right" : "fa-caret-left"
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
                Data Model
              </Typography>
              <div style={{ flexGrow: 1 }} />
            </div>
            <div style={{ padding: "10px" }}>
              <GraphCanvasControl
                ref={this.dataModelRef}
                key={`${this.id}_dataModel`}
                id={`${this.id}_dataModel`}
                domId={`${this.id}_dataModel`}
                dataProvider={this.dataModelCanvasDataProvider}
                canvasConfig={this.dataModelCanvasConfig}
                containerCallback={this.dataModelCallback}
                displayOptions={{
                  displayColorPicker: false,
                  displaySizeCircles: false,
                }}
                canvasOptions={{
                  [CANVAS_FEATURES.NODE_MOVE]: false,
                  [CANVAS_FEATURES.DRAW_RELATIONSHIP]: false,
                }}
                getWidth={() =>
                  `${pxVal(Sizes.DefaultRightDrawerWidth) -
                  pxVal(Sizes.RightTitleBarWidth) -
                  20
                  }px`
                }
                getHeight={() => "700px"}
              />
            </div>
          </div>
        </Drawer>

        <Drawer
          variant="permanent"
          anchor="bottom"
          onClose={() => { }}
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
                  className={`fa ${bottomDrawerOpen ? "fa-caret-down" : "fa-caret-up"
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
              <Tab label="Validation" />
            </Tabs>
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Cypher}>
              <div style={{height: `${cypherEditorHeight}px`, 
                  borderBottom: '1px solid gray',
                  borderRight: '1px solid gray',
                  marginRight: '5px'
              }}>
                <CypherEditor
                    readOnly={true}
                    //initialValue={cypherQuery}
                    value={cypherQuery}
                    //onValueChanged={(value) => this.setCypherQuery(value, true)}
                    //onEditorCreated={this.setCypherEditor}
                    //cypherLanguage={false}
                    onSelectionChanged={(e) => {
                      console.log("Selection Changed (CypherBuilderRefactor): ", e);
                    }}
                    classNames={["cypherEditor"]}                  
                />
              </div>
            </TabPanel>
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Results}>
              <ResultsTable mykey="CypherBuilderRefactorResultTable" ref={this.resultsTableRef} parentContainer={this} />
            </TabPanel>
            <TabPanel value={bottomActiveTabIndex} index={BottomTabIndexes.Validation}>
              <ValidationTable ref={this.validationTableRef} cypherBuilder={this} revalidate={this.validateCypher} />
            </TabPanel>
          </div>
        </Drawer>
        {/*
                <div>
                    <CypherQueryList/>
                </div>
                */}
        <SaveForm
          maxWidth={"sm"}
          open={showSaveDialog}
          onClose={this.handleSaveDialogClose}
          ref={this.saveFormRef}
          save={this.saveCypherBuilderFromSaveForm}
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
          load={this.loadCypherBuilder}
          cancel={this.handleLoadDialogClose}
          delete={this.delete}
          toolHumanName={TOOL_HUMAN_NAME}
          performSearch={this.performSearch}
          metadataMap={metadataMap}
        />
        <ModelDialogHelper 
          ref={this.modelDialogHelperRef}
          setStatus={this.setStatus}
          load={this.resetAndLoadRemoteModel}
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

        <Sharing maxWith={'md'} open={shareDialog.open} onClose={shareDialog.handleClose}
          setIsPublic={shareDialog.setIsPublic} isPublic={shareDialog.isPublic}
          userRoles={shareDialog.userRoles} docKey={activeKey}
          toolUri={'/tools/cypherbuilder/'}
          upsertUser={shareDialog.upsertUser} removeUser={shareDialog.removeUser}
          save={this.saveShare} ref={this.shareDialogRef} />
        <FullScreenWaitOverlay open={fullScreenBusyIndicator} setOpen={(open) => this.showBusy({ busy: open })} />
      </div>
    );
  }
}
