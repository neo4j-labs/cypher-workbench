import React, { Component } from "react";
import { Button, Drawer, Typography, Tooltip } from "@material-ui/core";
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import AdjustIcon from '@material-ui/icons/Adjust';

import GeneralDialog from "../../components/common/GeneralDialog";
import GeneralTextDialog from '../../components/common/GeneralTextDialog';
import Papa from 'papaparse';

import { getAuth } from "../../auth/authUtil";

import DataModel from "../../dataModel/dataModel";
import { diffDataModels } from "../../dataModel/dataModelDiff";
import { CANVAS_MESSAGES } from "../../components/canvas/d3/graphCanvas";

import { Canvas } from '../../components/canvas/Canvas';
import { CONTAINER_CALLBACK_MESSAGES } from '../../components/canvas/d3/dataModelCanvas';

import { ScenarioBlockDataProvider } from "./components/dataProvider/scenarioBlockDataProvider";
import { SyncedEventTypes } from "../../dataModel/syncedGraphDataAndView";
import ModalRelationship from "../../components/common/ModalRelationship";

import { 
  getDataModelFromCypherStatement, 
  validateCypherAgainstModel 
} from "../common/validation/CypherValidation";
import LoadForm from "../common/edit/LoadForm";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import { getModelMetadata } from '../toolModel/components/SaveModelForm';
import { ALERT_TYPES, USER_ROLE, COLORS } from "../../common/Constants";
import { SAVE_MODE } from "../common/toolConstants";

import PropertyDialog from '../toolModel/components/properties/PropertyDialog';
import RelationshipCardinalityDialog from '../toolModel/components/cardinality/RelationshipCardinalityDialog';
import ModalVariableLabelsAndTypes from '../../components/common/ModalVariableLabelsAndTypes';

import SecurityRole, { SecurityMessages } from "../common/SecurityRole";
import DocumentSecurityRole from "../common/DocumentSecurityRole";
import Sharing from '../common/security/Sharing';
import EditHelper from '../common/edit/editHelper';
import { ModelPersistence, PERSISTENCE_STATE_ITEMS } from '../common/model/modelPersistence';
import ModelDialogHelper, { 
  addModelMetadata, 
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
import { getDynamicConfigValue } from '../../dynamicConfig';


import {
  getUserSettings,
  loadRemoteDataModel,
  saveRemoteDataModelMetadata,
  updateUserRolesGraphDoc,
  getUserRolesForGraphDoc,
  NETWORK_STATUS,
} from "../../persistence/graphql/GraphQLPersistence";

import { CommunicationHelper } from "../common/communicationHelper";
import { promptLockedDocument } from "../common/lockHelper";
import { PersistenceHelper } from "../common/persistenceHelper";

import { stopListeningTo, listenTo } from "../../dataModel/eventEmitter";
import AccordionBlock from "../common/blocks/AccordionBlock";

const TOOL_HUMAN_NAME = "Scenario Set";
const DOCUMENT_NAME = "Scenario Set";
const NEW_DOCUMENT_TITLE = `New ${DOCUMENT_NAME}`;
const NEW_THING_NAME = "Scenario";

const HighlightClasses = {
  HighlightNode: 'highlightNode', 
  HighlightRel: 'highlightRel'
}

const DomIds = {
  Main: "main",
  Scenarios: "Scenarios",
  AddScenario: "AddScenario",
  ScenariosAccordionContainer: "ScenariosAccordionContainer"
};

const Sizes = {
  TitleBarHeight: "40px",
  BottomTitleBarHeight: "40px",
  DefaultBottomDrawerHeight: "250px",
  MaxBottomDrawerHeight: "650px",
  MinBottomDrawerHeight: "150px",
  BottomDrawerHeightIncrement: "100px",
  RightTop: "63px",
  RightTitleBarWidth: "30px",
  FloatingBarRightMargin: "120px",
  DefaultRightDrawerWidth: "800px",
  MaxRightDrawerWidth: "2400px",
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

const NO_ACTIVE_DOCUMENT_MESSAGE = `No ${TOOL_HUMAN_NAME} document is loaded. This option is unavailable when there is not an active document.`;
const ACTIVE_DOCUMENT_AND_MODEL_REQUIRED_MESSAGE = `Both a ${TOOL_HUMAN_NAME} document and a data model must be loaded to validate.`;

export default class Scenarios extends Component {
  GraphDocType = "ScenarioSet";

  id = "scenarioSet";

  scenarioBlockDataProvider = new ScenarioBlockDataProvider({
    id: this.id,
    scenarioSetBuilder: this
  });

  dataModelCanvasConfig = null;

  loading = false;
  dataChangeTimer = null;
  retryTimer = null;

  getDataProvider = () => this.scenarioBlockDataProvider;

  getNewScenarioBlockDataProvider = (graphDocMetadata) => {
    if (this.scenarioBlockDataProvider) {
      stopListeningTo(this.scenarioBlockDataProvider, this.id);
      // TODO: get variables to clear and pass them to variableScope.clearVariables
      //this.variableScope.clearVariables();
    }
    var scenarioBlockDataProvider = new ScenarioBlockDataProvider({
      id: graphDocMetadata.key,
      scenarioSetBuilder: this,
      //variableScope: this.variableScope
    });
    listenTo(scenarioBlockDataProvider, this.id, this.dataChangeListener);
    console.log("listenTo called on scenarioBlockDataProvider");
    return scenarioBlockDataProvider;
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
    /*
    return {
      label: dataItem.getText(),
      dataItem: dataItem
    }*/
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

  removeListenerBeforeDeserialize = (blockDataProvider) => 
    stopListeningTo(blockDataProvider, this.id);

  addListenerAfterDeserialize = (blockDataProvider) =>     
    listenTo(blockDataProvider, this.id, this.dataChangeListener, true);

  closeImportExportDialog = () => {
    this.setState({ importExportDialog: { ...this.state.importExportDialog, open: false }});
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
    this.modalRelationshipRef = React.createRef();
    this.shareDialogRef = React.createRef();
    this.importExportDialogRef = React.createRef();
    this.modelDialogHelperRef = React.createRef();

    this.persistenceHelper = new PersistenceHelper({
      graphDocContainer: this,
      getNetworkStatus: this.props.getNetworkStatus,
      LOCAL_STORAGE_KEY: this.scenarioBlockDataProvider.getLocalStorageKey(),
      REMOTE_GRAPH_DOC_TYPE: this.scenarioBlockDataProvider.getRemoteGraphDocType(),
      SUBGRAPH_MODEL: this.scenarioBlockDataProvider.getSubgraphModel(),
    });

    this.communicationHelper = new CommunicationHelper({
      graphDocContainer: this,
      persistenceHelper: this.persistenceHelper,
      getNetworkStatus: this.props.getNetworkStatus,
      setNetworkStatus: this.props.setNetworkStatus,
      setStatus: this.setStatus,
      showDialog: this.showGeneralDialog,
      GraphDocType: this.scenarioBlockDataProvider.getRemoteGraphDocType(),
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
    if (this.state.selectedDataModel) {
        this.state.selectedDataModel.addDataChangeListener(this.modelPersistenceHelper.dataModelChangeListener);
    }
  }

  getDataModelCanvas = () => this.dataModelRef.current.getDataModelCanvas();

  getSelectedModelText = (modelInfo) => {
    var modelName = "";
    if (modelInfo) {
      modelName = modelInfo.title ? modelInfo.title : "Untitled";
    } else {
      modelName = "No Model Selected";
    }
    return modelName;
  };

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

  state = {
    scenarioBlocks: [],
    bottomActiveTabIndex: 0,
    rightActiveTabIndex: 0,
    activeKey: "",
    status: "",
    bottomDrawerOpen: true,
    bottomDrawerOpenHeight: Sizes.DefaultBottomDrawerHeight,
    rightDrawerOpen: false,
    rightDrawerOpenWidth: Sizes.DefaultRightDrawerWidth,
    minHeight: Sizes.PageBottomPadding,
    selectedDataModelKey: "",
    selectedDataModel: this.getDataModel(),
    selectedDataModelMetadata: getModelMetadata(),
    selectedDataModelText: this.getSelectedModelText(),
    selectedModelSecurityRole: null,
    editHelper: new EditHelper(),
    activityIndicator: false,
    showSaveDialog: false,
    showLoadDialog: false,
    showAssociateCypherDialog: false,
    activeScenarioBlockKey: "", // used to track which block the cypher association dialog was launched from
    saveFormMode: "",
    editMetadata: {},
    metadataMap: {},
    cypherStatementMap: {},
    loadedMetadata: getMetadata(NEW_DOCUMENT_TITLE),
    cancelMetadata: {},
    loadDialog: {
      searchText: "",
      myOrderBy: "dateUpdated",
      orderDirection: "DESC",
    },
    associateCypherDialog: {
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

  saveScenarioSetBuilderFromSaveForm = () => {
    var { loadedMetadata, editMetadata, saveFormMode } = this.state;
    var properties = { loadedMetadata, editMetadata, saveFormMode };
    return this.saveScenarioSetBuilder(properties);
  };

  saveScenarioSetBuilder = (properties) => {
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
        scenarioSetViewSettings: this.getScenarioSetViewSettings(),
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
        this.saveRemoteMetadata(loadedMetadata, previousState, { saveFormMode });
      }
    );
    return graphDocMetadata;
  };

  saveRemoteMetadata = (loadedMetadata, previousState, { saveFormMode }) => {
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

        /*
        if (saveFormMode === SAVE_MODE.NEW || saveFormMode === SAVE_MODE.TOTALLY_NEW) {
          this.saveNewScenarioModel();
        }
        */
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
    scenarioBlockDataProvider
  ) => {
    // TODO: SyncedEventTypes shouldn't be even at this level, it should be in ScenarioBlockDataProvider
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
      } = this.scenarioBlockDataProvider.getDataSaveObj();

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
            scenarioBlockDataProvider.setIsRemotelyPersisted(true);
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
              scenarioBlockDataProvider
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

          //var dataModelViewSettings = this.getDataModelCanvas().getViewSettings();
          var graphDocMetadata = {
            ...loadedMetadata,
            dateUpdated: new Date().getTime().toString(),
            viewSettings: {
              scenarioSetViewSettings: this.getScenarioSetViewSettings(),
              //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
              //dataModelViewSettings: dataModelViewSettings,
            },
          };
          if (validNetworkStatuses.includes(networkStatus)) {
            console.log("changeListener: online: calling saveChanges");
            this.saveChanges(
              messageName,
              messagePayload,
              graphDocMetadata,
              this.scenarioBlockDataProvider
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
              this.scenarioBlockDataProvider
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
      scenarioBlocks: [],
    });
    this.scenarioBlockDataProvider = this.getNewScenarioBlockDataProvider(
      graphDocMetadata
    );
    this.scenarioBlockDataProvider.fromSaveObject({
      graphDocObj,
      serializedSaveObject: serializedDataSaveObj,
      keepDataChangeFlags},
      () => {
        console.log("after fromSaveObject");
        this.scenarioBlockDataProvider.setIsRemotelyPersisted(true);
        this.finishLoading({
          graphDocMetadata,
          lockInfo,
          scenarioBlockDataProvider: this.scenarioBlockDataProvider,
          dontPushWebHistory: false,
          callback
        });
      }
    );
  };

  setScenarioBlockDataProvider(scenarioBlockDataProvider) {
    //this.getGraphCanvas().setDataProvider(scenarioBlockDataProvider);
    this.scenarioBlockDataProvider = scenarioBlockDataProvider;
  }

  handleViewSettings = (canvasViewSettings, graphCanvas, canvasRef) => {
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
  };

  reset = (graphDocMetadata) => {
    var scenarioBlockDataProvider = this.getNewScenarioBlockDataProvider(
      graphDocMetadata
    );
    this.clearDataModel();
    this.setScenarioBlockDataProvider(scenarioBlockDataProvider);

    const loadedScenarioBlocks = this.scenarioBlockDataProvider.getScenarioBlocks();
    this.setState({
      scenarioBlocks: loadedScenarioBlocks
    });

    return scenarioBlockDataProvider;
  };

  getBottomDrawerOpenHeight = () => {
    const { bottomDrawerOpenHeight } = this.state;
    return pxVal(bottomDrawerOpenHeight);
  };

  getSizeValue = (key) => pxVal(Sizes[key]);

  getScenarioSetViewSettings = () => {
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

  handleScenarioSetViewSettings = (scenarioSetViewSettings) => {
    scenarioSetViewSettings = scenarioSetViewSettings || {};
    var {
      bottomDrawerOpen,
      bottomDrawerOpenHeight,
      rightDrawerOpen,
      rightDrawerOpenWidth,
    } = scenarioSetViewSettings;

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
    scenarioBlockDataProvider,
    dontPushWebHistory,
    callback
  }) => {
    this.clearDataModel();
    this.setScenarioBlockDataProvider(scenarioBlockDataProvider);
    var dataModelKey = scenarioBlockDataProvider.getDataModelKey();
    if (dataModelKey) {
      this.loadRemoteModel({ key: dataModelKey });
    }

    var viewSettings = graphDocMetadata.viewSettings
      ? graphDocMetadata.viewSettings
      : {};
    var scenarioSetViewSettings = viewSettings.scenarioSetViewSettings
      ? viewSettings.scenarioSetViewSettings
      : {};
    /*
    var canvasViewSettings = viewSettings.canvasViewSettings
      ? viewSettings.canvasViewSettings
      : {};
    */

    /* dataModelViewSettings are handled by modelPersistence, and are not part of the scenario data */
    /*
    var dataModelViewSettings = viewSettings.dataModelViewSettings
      ? viewSettings.dataModelViewSettings
      : {};
    */

    //console.log("canvasViewSettings: " + JSON.stringify(canvasViewSettings));

    this.handleScenarioSetViewSettings(scenarioSetViewSettings);
    // TODO: have all accordions open/close/resize themselves appropriately

    var userRole = graphDocMetadata.userRole;
    if (graphDocMetadata.isPublic && !userRole) {
      userRole = USER_ROLE.VIEWER;
    }
    //console.log("Scenarios SecurityRole.setRole(userRole): ", userRole)
    SecurityRole.setRole(userRole);

    this.getDataModelCanvas().bringAllNodesToTop();

    if (!dontPushWebHistory) {
      this.addToWebHistory(graphDocMetadata);
    }

    const loadedScenarioBlocks = this.scenarioBlockDataProvider.getScenarioBlocks();
    this.setState({
      loadedMetadata: graphDocMetadata,
      showLoadDialog: false,
      activeKey: graphDocMetadata.key,
      metadataMap: {
        ...this.state.metadataMap,
        [graphDocMetadata.key]: graphDocMetadata,
      },
      scenarioBlocks: loadedScenarioBlocks,
    });

    this.props.setTitle(this.getTitle(graphDocMetadata));
    this.calculatePageSize();

    if (callback) {
      callback(graphDocMetadata, scenarioBlockDataProvider);
    }

    if (lockInfo && lockInfo.lockIsActive) {
      promptLockedDocument({
        props: {
          setStatus: this.setStatus,
          persistenceHelper: this.persistenceHelper,
          GraphDocType: this.scenarioBlockDataProvider.getRemoteGraphDocType(),
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

  loadScenarioSetBuilder = (graphDocMetadata, dontPushWebHistory, callback) => {
    //  Must clear out blocks before loading, because later when iterating through
    //  scenarioBlocks if a key matches between the currently loaded component
    //  and the new loaded component, react componentDidMount will not get called.
    //  For components with render logic in componentDidMount they would not render
    //  correctly.
    this.setState({
      scenarioBlocks: [],
    });
    this.loadRemoteScenarioSetBuilder(
      graphDocMetadata,
      dontPushWebHistory,
      callback
    );
  };

  removeAssociatedCypherStatement = (scenarioBlockKey, cypherGraphDocKey, cypherKey, callback) => {
    const { activeKey } = this.state;
    this.persistenceHelper.removeScenarioToCypherAssociation(activeKey, scenarioBlockKey, 
                                                        cypherGraphDocKey, cypherKey, callback);
  }

  associateCypherStatement = (cypherMetadata) => {
    if (SecurityRole.canEdit()) {
      //console.log(cypherMetadata);
      const { activeKey, activeScenarioBlockKey } = this.state;
      this.persistenceHelper.associateScenarioToCypher(activeKey, activeScenarioBlockKey, 
          cypherMetadata.key, cypherMetadata.subKey, cypherMetadata.isVisualCypher, (result) => {
            const { success, error } = result;
            if (!success) {
              alert(error);
            } else {
              this.getDataProvider().addAssociatedCypher(activeScenarioBlockKey, {
                isVisualCypher: cypherMetadata.isVisualCypher,
                cypherGraphDocKey: cypherMetadata.key,
                cypherSubKey: cypherMetadata.subKey,
                cypherTitle: cypherMetadata.title,
                cypherStatement: cypherMetadata.cypher
              });
              this.reRender();
            }
      }) 
    } else {
      alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
    }
    this.handleAssociateCypherDialogClose();
  };

  loadRemoteScenarioSetBuilder = (
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
            var message = "Error loading scenario set builder: " + response.error;
            this.setStatus(message, false);
            alert(message);
          } else {
            this.setStatus("", false);
            graphDocMetadata.viewSettings = response.metadata.viewSettings;
            var scenarioBlockDataProvider = this.getNewScenarioBlockDataProvider(
              graphDocMetadata
            );
            scenarioBlockDataProvider.fromSaveObject({
              graphDocObj: response, keepDataChangeFlags: false
            }, () => {
              scenarioBlockDataProvider.setIsRemotelyPersisted(true);
              this.finishLoading({
                graphDocMetadata,
                scenarioBlockDataProvider,
                dontPushWebHistory,
                callback
              });
            });
          }
        }
      );
    } else {
      alert(
        "Unable to load scenario set, the specified scenario set may not exist"
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
      id: "scenariosetbuilder-file",
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
                if (isFeatureLicensed(FEATURES.SCENARIOS.Share)) {
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

    var modelMenuId = "scenariosetbuilder-model";
    var modelMenuItems = [];
    var atLeastOneLayoutLicensed = false;

    modelMenuItems.push({ id: "createAssociatedModel", text: "Create Model" });
    modelMenuItems.push({ id: "chooseModel", text: "Choose Model..." });
    modelMenuItems.push({ id: "divider0", text: "_" });
    if (isFeatureLicensed(FEATURES.MODEL.ForceLayout)) {
      atLeastOneLayoutLicensed = true;
      modelMenuItems.push({ id: "force", text: "Force Layout" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
      atLeastOneLayoutLicensed = true;
      modelMenuItems.push({ id: "sideToSide", text: "Left to Right" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
      atLeastOneLayoutLicensed = true;
      modelMenuItems.push({ id: "topBottom", text: "Top to Bottom" });
    }
    if (atLeastOneLayoutLicensed) {
      modelMenuItems.push({ id: "divider1", text: "_" });
    }
    modelMenuItems.push({
      id: "bringAllNodesToTop",
      text: "Bring All Nodes to Front",
    });

    /*
        modelMenuItems.push(
            { component: <RelationshipLayoutSettings ref={this.modelRelationshipLayoutSettingsRef}
                    key={modelMenuId + '_modelRelationshipLayoutSettings'}
                    saveUserSettings={this.saveUserSettings} menuId={modelMenuId}
                    handleRelationshipDisplayChange={this.handleRelationshipDisplayChange} />}
        );

        modelMenuItems.push({id: 'divider2', text: '_'});
        modelMenuItems.push(
            { component: <ModelLayoutSettings ref={this.modelLayoutSettingsRef} key={modelMenuId + '_modelLayoutSettings'}
                    saveUserSettings={this.saveUserSettings} menuId={modelMenuId}/>}
        );
        */

    var modelMenu = {
      id: modelMenuId,
      text: "Model",
      handler: (menu, menuItem) => {
                var canvas = (this.isThereAnAssociatedDataModel()) ? this.getDataModelCanvas() : null;
                switch (menuItem.id) {
                    case 'createAssociatedModel':
                      if (!this.isADocumentSelected()) {
                        alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
                      } else {
                        var { selectedDataModelKey } = this.state;
                        if (!selectedDataModelKey) {
                          this.saveNewScenarioModel();
                        } else {
                          alert('This option is only available if there is no associated model. You can create a new Model in the Model tool and then pick Choose Model to select it.', ALERT_TYPES.WARNING);
                        }
                      }
                      break;
                    case 'chooseModel':
                      if (!this.isADocumentSelected()) {
                        alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
                      } else {
                        showLoadModelDialog(this.modelDialogHelperRef);
                      }
                      break;
                    case 'force':
                        if (canvas) {
                          canvas.doForceLayout();
                        } else {
                          alert('This option is only available if there is an associated model.', ALERT_TYPES.WARNING);
                        }
                        break;
                    case 'sideToSide':
                        //console.log('side to side');
                        if (canvas) {
                          canvas.doDagreLayout('side');
                        } else {
                          alert('This option is only available if there is an associated model.', ALERT_TYPES.WARNING);
                        }
                        break;
                    case 'topBottom':
                        //console.log('top to bottom');
                        if (canvas) {
                          canvas.doDagreLayout('top');
                        } else {
                          alert('This option is only available if there is an associated model.', ALERT_TYPES.WARNING);
                        }
                        break;
                    case 'bringAllNodesToTop':
                        if (canvas) {
                          canvas.bringAllNodesToTop();
                        } else {
                          alert('This option is only available if there is an associated model.', ALERT_TYPES.WARNING);
                        }
                        break;
                    default:
                        break;
                }
      },
      menuItems: modelMenuItems,
    };
    if (modelMenuItems.length > 0) {
        menus.push(modelMenu);
    }

    var validateMenuId = "scenariosetbuilder-validate";
    var validateMenuItems = [];

    validateMenuItems.push({ id: "validateCypherAgainstModel", text: "Validate Cypher" });
    validateMenuItems.push({ id: "clearValidation", text: "Clear Validation" });

    var validateMenu = {
      id: validateMenuId,
      text: "Validate",
      handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'validateCypherAgainstModel':
                      if (this.isADocumentSelected() && this.isThereAnAssociatedDataModel()) {
                        this.validateAllCypherAgainstModel();
                      } else {
                        alert(ACTIVE_DOCUMENT_AND_MODEL_REQUIRED_MESSAGE, ALERT_TYPES.WARNING);
                      }
                      break;
                    case 'clearValidation':
                      if (this.isADocumentSelected() && this.isThereAnAssociatedDataModel()) {
                        this.clearCypherModelValidation();
                      } else {
                        alert(ACTIVE_DOCUMENT_AND_MODEL_REQUIRED_MESSAGE, ALERT_TYPES.WARNING);
                      }
                      break;
  
                    default:
                        break;
                }
      },
      menuItems: validateMenuItems,
    };
    if (validateMenuItems.length > 0) {
        menus.push(validateMenu);
    }

    var importMenuItems = [];
    if (
      anyFeatureLicensed([
        FEATURES.SCENARIOS.View,
      ])
    ) {
      importMenuItems.push({ id: "import", text: `Import ${DOCUMENT_NAME}` });
    }

    var importMenu = {
      id: "scenariosetbuilder-import",
      text: "Import",
      handler: (menu, menuItem) => {
        switch (menuItem.id) {
          case "import":
            if (this.communicationHelper.isOnline()) {
              if (!this.isADocumentSelected()) {
                alert(NO_ACTIVE_DOCUMENT_MESSAGE, ALERT_TYPES.WARNING);
              } else {
                this.showImportScenarios();
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
    if (isFeatureLicensed(FEATURES.MODEL.ExportModel)) {
      needExportDivider = true;
      exportMenuItems.push({ id: "export", text: `Export ${DOCUMENT_NAME}` });
    }
    if (needExportDivider) {
      exportMenuItems.push({ id: "divider", text: "_" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.ExportSVG)) {
      exportMenuItems.push({ id: "downloadSvg", text: "Download SVG" });
    }

    var exportMenu = {
      id: "scenariosetbuilder-export",
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

  showImportScenarios () {

    var placeholder = `Paste a single column from Excel or Google Sheets here`;

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
                onClick: (button, index) => this.importScenarios(),
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

  importScenarios = () => {
    var { text } = this.state.importExportDialog;
    var results = Papa.parse(text, { header: true });
    var rowsToImport = [];
    if (results && results.data && results.data.length > 0) {
      if (results.meta && results.meta.fields && results.meta.fields[0]) {
        const columnKey = results.meta.fields[0];
        rowsToImport = results.data.map(row => {
          var value = row[columnKey];
          if (row.__parsed_extra) {
            value += row.__parsed_extra.join('');
          }
          return value;
        })
        .filter(value => value);
      }
    }
    //console.log('rowsToImport:', rowsToImport);
    if (rowsToImport.length > 0) {
      this.addABunchOfScenarios(rowsToImport);
    } else {
      alert('No rows to import', ALERT_TYPES.WARNING);
    }
    this.closeImportExportDialog();
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

  resetDataModelAndCanvas = () => {
    const { editHelper } = this.state;

    var modelMetadata = getModelMetadata();
    var dataModel = this.getDataModel();
    editHelper.setDataModel(dataModel);

    this.dataModelRef.current.resetCanvas();
    this.getDataModelCanvas().setDisplayAnnotations(false);
    this.getDataModelCanvas().setDataModel(dataModel);

    return { dataModel, modelMetadata };
  }

  saveNewScenarioModel = () => {
    var { loadedMetadata } = this.state;
    var { dataModel, modelMetadata } = this.resetDataModelAndCanvas();
    var previousState = JSON.parse(JSON.stringify(modelMetadata));    // deep copy
    modelMetadata.title = this.getTitle(loadedMetadata);
    var selectedModelSecurityRole = new DocumentSecurityRole();
    selectedModelSecurityRole.setRole(USER_ROLE.OWNER);

    //var dataModelViewSettings = this.getDataModelCanvas().getViewSettings();

    this.setState({
        selectedModelSecurityRole: selectedModelSecurityRole,
        selectedDataModelMetadata: {
            ...modelMetadata,
            dateCreated: new Date().getTime().toString(),
            dateUpdated: new Date().getTime().toString(),
            viewSettings: {
                //canvasViewSettings: this.getDataModelCanvas().getViewSettings()
                //dataModelViewSettings: dataModelViewSettings
            }
        },
        selectedDataModelKey: modelMetadata.key,
        selectedDataModel: dataModel
    }, () => {
        var { selectedDataModelMetadata } = this.state;
        this.saveRemoteModelMetadata(selectedDataModelMetadata, previousState, { dataModel });
    });
  }

  saveRemoteModelMetadata = (loadedModelMetadata, previousState, { dataModel }) => {
    this.setStatus('Saving...', true);
    saveRemoteDataModelMetadata (loadedModelMetadata, previousState, (response) => {
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
            addModelMetadata(loadedModelMetadata, this.modelDialogHelperRef);
            this.setState({
                selectedDataModelText: loadedModelMetadata.title
            });
            this.scenarioBlockDataProvider.handleDataModel(
              dataModel,
              loadedModelMetadata.key
            );
            this.setStatus('Saved associated data model.', false);
        }
    });
  }
  

  validateAllCypherAgainstModel = () => {
    var scenarioBlocks = this.scenarioBlockDataProvider.getScenarioBlocks();
    var totalCypherStatements = 0;
    var dataModelCanvas = this.getDataModelCanvas();
    const { selectedDataModel } = this.state;

    scenarioBlocks.filter(block => {
        var associatedCypherArray = block.dataProvider.getAssociatedCypher() || [];
        totalCypherStatements += associatedCypherArray.length;
        associatedCypherArray.map(associatedCypher => {
          var result = validateCypherAgainstModel(associatedCypher.cypherStatement, selectedDataModel, dataModelCanvas);
          block.dataProvider.setValidationInfo(associatedCypher, result);
          if (block.ref.current) {
            block.ref.current.showCypherValidationInfo();
          }
        })
    });
    if (totalCypherStatements === 0) {
      alert('There are no associated cypher statements to validate', ALERT_TYPES.WARNING);
    }
  }

  clearCypherModelValidation = () => {
    var scenarioBlocks = this.scenarioBlockDataProvider.getScenarioBlocks();
    scenarioBlocks.filter(block => {
        if (block.ref.current) {
          block.ref.current.clearCypherValidationInfo();
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
          this.loadScenarioSetBuilder(graphDocMetadata);
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
                alert("Error opening scenario set builder: " + e.message);
                console.log(e);
              }
            }
          );
        }
      }
    });

    this.setBottomTableHeight();
  };

  setBottomTableHeight = () => {
  }

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

  getCypherStatements = (callback) => {
    const { searchText, myOrderBy, orderDirection } = this.state.associateCypherDialog;
    if (searchText) {
      this.setStatus("Searching...", true);
      this.persistenceHelper.searchRemoteCypherStatements(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleCypherStatementResponse(response, "searchCypherStatementsX", callback);
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.persistenceHelper.listRemoteCypherStatements(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleCypherStatementResponse(response, "listCypherStatementsX", callback);
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

  handleCypherStatementResponse = (response, key, callback) => {
    if (response.success) {
      var data = response.data;
      var cypherStatementMap = {};
      //console.log(data);
      var cypherStatements = data && data[key] ? data[key] : [];
      cypherStatements.forEach(function (cypherStatement) {
        var key = (cypherStatement.subKey) ? `${cypherStatement.key}_${cypherStatement.subKey}` : cypherStatement.key;
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

  showAssociateCypherDialog = (scenarioBlockKey) => {
    if (SecurityRole.canEdit()) {
      this.getCypherStatements(() => {
        this.setState({
          showAssociateCypherDialog: true,
          activeScenarioBlockKey: scenarioBlockKey
        });
      });
    } else {
      alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
    }
  };

  isThereAnAssociatedDataModel = () => {
    var { selectedDataModelKey } = this.state;
    return (selectedDataModelKey) ? true : false;
  }

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

  handleAssociateCypherDialogClose = (options) => {
    this.setState(
      {
        showAssociateCypherDialog: false,
      },
      () => {
        // do nothing
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
      this.scenarioBlockDataProvider.getAllAssociatedGraphViewKeys()
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
          this.handleLockedScenarioSetBuilder(response.error.message, actions);
        } else {
          this.setStatus(response.error, false);
          alert(response.error);
        }
      }
    });
  };

  handleLockedScenarioSetBuilder = (errorStr, actions) => {
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
    var url = `/tools/${TOOL_NAMES.SCENARIOS}/${graphDocMetadata.key}`;
    var title = `${graphDocMetadata.title}`;
    console.log(`adding ${url} to history`);
    window.history.pushState(
      { tool: TOOL_NAMES.SCENARIOS, modelKey: graphDocMetadata.key },
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
 
  performCypherStatementSearch = (searchText, myOrderBy, orderDirection) => {
    this.setState({
      associateCypherDialog: {
        ...this.state.associateCypherDialog,
        searchText: searchText,
        myOrderBy: myOrderBy,
        orderDirection: orderDirection,
      },
    });

    if (searchText) {
      this.setStatus("Searching...", true);
      this.persistenceHelper.searchRemoteCypherStatements(
        searchText,
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleCypherStatementResponse(response, "searchCypherStatementsX");
        }
      );
    } else {
      this.setStatus("Loading...", true);
      this.persistenceHelper.listRemoteCypherStatements(
        myOrderBy,
        orderDirection,
        (response) => {
          this.setStatus("", false);
          this.handleCypherStatementResponse(response, "listCypherStatementsX");
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
    //this.scenarioBlockDataProvider.setDataModelKey(null);
    this.setState({
      selectedDataModel: this.getDataModel(),
      selectedDataModelKey: "",
      selectedDataModelMetadata: null,
      selectedDataModelText: this.getSelectedModelText(),
    });

    if (this.dataModelRef.current) {
      this.dataModelRef.current.resetCanvas();
    }
  };

  /*
  runCanvasFunction = (functionToRun) => {
    var numTries = 0;
    var maxTries = 10;

    const runIt = () => {
      if (this.dataModelRef.current) {
        functionToRun();
      } else {
        numTries++;
        if (numTries < maxTries) {
          setTimeout(runIt, 200);
        }
      }
    };
    runIt();
  }  
  */

  handleDataModel = (dataModel, dataModelResponse) => {
    //this.scenarioBlockDataProvider.setDataModelKey(dataModelResponse.key);
    this.dataModelRef.current.resetCanvas();
    this.setState(
      {
        selectedDataModel: dataModel,
        selectedDataModelKey: dataModelResponse.metadata.key,
        selectedDataModelMetadata: dataModelResponse.metadata,
        selectedDataModelText: this.getSelectedModelText(
          dataModelResponse.metadata
        ),
      },
      () => {

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

        this.getDataModelCanvas().setDisplayAnnotations(false);
        this.getDataModelCanvas().setDataModel(dataModel);
        dataModel.setIsRemotelyPersisted(true);
        editHelper.setDataModel(dataModel);

        var canvasViewSettings = (modelInfo.viewSettings && modelInfo.viewSettings.canvasViewSettings) ? modelInfo.viewSettings.canvasViewSettings : {};        
        //this.renderDataModelArea();
        this.handleViewSettings(
          canvasViewSettings,
          this.getDataModelCanvas(),
          this.dataModelRef
        );

        this.getDataModelCanvas().bringAllNodesToTop();

        this.scenarioBlockDataProvider.handleDataModel(
          dataModel,
          dataModelResponse.key
        );
      }
    );
  };

  addNewNodeLabel = () => {
    var { selectedModelSecurityRole } = this.state;
    if (selectedModelSecurityRole.canEdit(true)) {
        this.getDataModelCanvas().createNewNodeLabel();
    }
  }

  addNodeLabel = (label) => {
    var { selectedModelSecurityRole } = this.state;
    if (selectedModelSecurityRole.canEdit(true)) {
      var success = true, message= '';
      try {
          this.getDataModelCanvas().addNodeLabel(label);
      } catch (e) {
          success = false;
          message = e.toString();
      }
      return { success, message };
    }
  }

  promptAddNodeRelNode = (relType, popupPosition) => {
    const scenariosEl = document.getElementById(DomIds.Scenarios);
    const boundingRect = scenariosEl.getBoundingClientRect();
    relType = (relType) ? relType : '';
    //const relTypeLen = (relType.length < 20) ? 20 : relType.length;
    const relTypeLen = 40;
    this.modalRelationshipRef.current.open(
      { width: boundingRect.width, height: boundingRect.height },
      popupPosition, 
      relTypeLen,
      { relationshipType: relType }
    );
  }

  addNodeRelNode = (startLabel, relType, endLabel) => {
    var { selectedModelSecurityRole } = this.state;
    if (selectedModelSecurityRole.canEdit(true)) {
      var success = true, message = '';
      var dataModelCanvas = this.getDataModelCanvas();
      try {
          var start = dataModelCanvas.getNodeLabel(startLabel);
          if (!start) {
              if (startLabel === '') {
                start = this.getDataModelCanvas().createNewNodeLabel();
              } else {
                start = dataModelCanvas.addNodeLabel(startLabel);
              }
          }
          var end = dataModelCanvas.getNodeLabel(endLabel);
          if (!end) {
              if (endLabel === '') {
                end = this.getDataModelCanvas().createNewNodeLabel();
              } else {
                end = dataModelCanvas.addNodeLabel(endLabel);
              }
          }
          dataModelCanvas.addRelationshipType(relType, start, end);
      } catch (e) {
          success = false;
          message = e.toString();
          //alert(`Error adding relationship ${message}`);
      }
      return { success, message };
    }
  }

  clearSuggestions = () => {
    var scenarioBlocks = this.scenarioBlockDataProvider.getScenarioBlocks();
    scenarioBlocks.filter(block => {
        if (block.ref.current) {
          block.ref.current.clearDataModelDiff();
        }
    });
  }

  highlightCypherStatementInDataModel = (cypherStatement, suggestCallback) => {
    this.clearSuggestions();
    const { selectedDataModel } = this.state;
    if (this.isThereAnAssociatedDataModel() && selectedDataModel && this.dataModelRef.current) {
      this.removeAllCypherStatementHighlightsInDataModel();

      var result = getDataModelFromCypherStatement(cypherStatement);
      if (!result.success) {
          alert(result.message, ALERT_TYPES.WARNING);
      } else {
        const highlightDataModel = result.dataModel;
        var dataModelCanvas = this.getDataModelCanvas();
        dataModelCanvas.highlightSubgraph(highlightDataModel, HighlightClasses.HighlightNode, HighlightClasses.HighlightRel);
        var diff = diffDataModels(selectedDataModel, highlightDataModel, {
          allowRelationshipAnonStartEndToMatch: true
        });
  
        if (diff.anyDifference()) {
          if (diff.nodeLabelDiff.inBnotA.length > 0 || diff.relationshipTypeDiff.inBnotA.length > 0) {
            suggestCallback(diff);
          }
        }
      }
    }
  }

  removeAllCypherStatementHighlightsInDataModel = () => {
    if (this.dataModelRef.current) {
      var dataModelCanvas = this.getDataModelCanvas();
      dataModelCanvas.removeAllSubgraphHighlights(HighlightClasses.HighlightNode, HighlightClasses.HighlightRel);
    }
  }

  renderDataModelArea = () => {
    if (this.dataModelRef.current) {
      var dataModelCanvas = this.getDataModelCanvas();
      dataModelCanvas.renderDataModel();
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
      handleLoadModelDialogClose(this.modelDialogHelperRef);
    } else {
      alert("Unable to load model, the specified model may not exist");
    }
  };

  sortByProperty = (property) => (a, b) =>
    a[property] === b[property] ? 0 : a[property] > b[property] ? 1 : -1;

  addNodePatternFromDataModel = (dataModelDisplayNode) =>
    this.scenarioBlockDataProvider.addNodePatternFromDataModel(
      dataModelDisplayNode
    );

  addNodeRelNodePatternFromDataModel = () => {}
  /*
  addNodeRelNodePatternFromDataModel = (
    dataModelDisplayStartNode,
    relationshipTypeArray,
    dataModelDisplayEndNode
  ) =>
    this.scenarioBlockDataProvider.addNodeRelNodePatternFromDataModel(
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
    if (this.isThereAnAssociatedDataModel()) {
      const { rightDrawerOpen, rightDrawerOpenWidth } = this.state;
      return rightDrawerOpen ? rightDrawerOpenWidth : Sizes.RightTitleBarWidth;
    } else {
      return Sizes.RightTitleBarWidth;
    }
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
    if (this.isThereAnAssociatedDataModel()) {
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
    }
  };

  resizePanelsOnLoad = () => {
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
            this.setBottomTableHeight();            
            this.viewChanged(GraphDocChangeType.PanelResize);
          }
        );
        this.drawerDrag.currentY = e.pageY;
      } else if (drawer === Drawers.Right) {
        if (this.isThereAnAssociatedDataModel()) {
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

  addABunchOfScenarios = (scenariosArray, callback) => {
    var newBlocks = scenariosArray.map(x => this.scenarioBlockDataProvider.getNewBlock({
      position: "end",
      scrollIntoView: false
    }));
    const { scenarioBlocks } = this.state;
    var newScenarioBlocks = scenarioBlocks.slice();
    newScenarioBlocks = newScenarioBlocks.concat(newBlocks);

    newBlocks.map((newBlock, i) => {
      const newScenario = scenariosArray[i];
      var title = newScenario.split(' ').slice(0,5).join(' ');
      newBlock.dataProvider.setTitle(title);
      newBlock.dataProvider.setPlainTextScenario(newScenario);
    });

    this.setState(
      {
        scenarioBlocks: newScenarioBlocks,
      },
      () => {
        this.calculatePageSize();
        if (callback) {
          callback();
        }
      }
    );

  }

  addScenarioBlockClick = ({ position }) => (scrollIntoView, callback) => {
    if (SecurityRole.canEdit()) {
      scrollIntoView = (typeof(scrollIntoView) !== 'boolean') ? true: scrollIntoView;
      if (typeof position === "number" || position === "end") {
        var newBlock = this.scenarioBlockDataProvider.getNewBlock({
          position,
          scrollIntoView: scrollIntoView
        });
        const { scenarioBlocks } = this.state;
        var newScenarioBlocks = scenarioBlocks.slice();
        if (position === "end") {
          newScenarioBlocks.push(newBlock);
        } else {
          newScenarioBlocks.splice(position, 0, newBlock);
        }
  
        this.setState(
          {
            scenarioBlocks: newScenarioBlocks,
          },
          () => {
            this.calculatePageSize();
            if (callback) {
              callback();
            }
          }
        );
      } else {
        alert(`addScenarioBlockClick, bad position: ${position}`);
      }
    } else {
      alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING);
    }
  };

  toggleAccordionPanel = (scenarioBlock) => () => {
    var { scenarioBlocks } = this.state;
    var newScenarioBlocks = scenarioBlocks.slice();
    var index = newScenarioBlocks.findIndex((x) => x.key === scenarioBlock.key);
    var isExpanded = true;
    if (index >= 0) {
      const blockToToggle = newScenarioBlocks[index];
      isExpanded = !blockToToggle.expanded;
      blockToToggle.expanded = isExpanded;

      this.setState(
        {
          scenarioBlocks: newScenarioBlocks,
        },
        () => {
          this.calculatePageSize();
          this.scenarioBlockDataProvider.setBlockState({
            key: scenarioBlock.key,
            expanded: isExpanded,
            selected: scenarioBlock.selected,
          });
        }
      );
    }
  };

  selectAccordionPanel = (scenarioBlock) => () => {
    var { scenarioBlocks } = this.state;
    var newScenarioBlocks = scenarioBlocks.slice();
    var index = newScenarioBlocks.findIndex((x) => x.key === scenarioBlock.key);
    var isSelected = true;
    if (index >= 0) {
      newScenarioBlocks.map((block, i) => {
        if (i !== index && block.selected) {
          // ignore the block we are selecting, it gets handled later
          // save it if we change a selected block to unselected
          this.scenarioBlockDataProvider.setBlockState({
            key: block.key,
            expanded: block.expanded,
            selected: false,
          });
          block.selected = false;
        }
      });

      const blockToSelect = newScenarioBlocks[index];
      isSelected = !blockToSelect.selected;
      blockToSelect.selected = isSelected;

      this.setState(
        {
          scenarioBlocks: newScenarioBlocks,
        },
        this.scenarioBlockDataProvider.setBlockState({
          key: scenarioBlock.key,
          expanded: scenarioBlock.expanded,
          selected: isSelected,
        })
      );
    }
  };

  removeAccordionPanel = (scenarioBlock) => () => {
    var { scenarioBlocks } = this.state;
    var newScenarioBlocks = scenarioBlocks.slice();
    var index = newScenarioBlocks.findIndex((x) => x.key === scenarioBlock.key);

    if (index >= 0) {
      newScenarioBlocks.splice(index, 1);
    }

    this.setState(
      {
        scenarioBlocks: newScenarioBlocks,
      },
      () => {
        this.calculatePageSize();
        this.scenarioBlockDataProvider.removeBlock({
          key: scenarioBlock.key,
        });
      }
    );
  };

  moveAccordionPanel = (draggedBlockKey, droppedOnBlockKey, position) => {
    // position will be 'before' or 'after'. Currently it is only 'after' if it is the last scenarioBlock
    var newScenarioBlocks = this.scenarioBlockDataProvider.moveBlock({
      draggedBlockKey: draggedBlockKey,
      droppedOnBlockKey: droppedOnBlockKey,
      position: position,
    });

    if (newScenarioBlocks) {
      this.setState({
        scenarioBlocks: newScenarioBlocks,
      });
    }
  };

  calculatePageSize = () => {
    setTimeout(() => {
      console.log("calculatePageSize called");
      var { scenarioBlocks } = this.state;
      const newMinHeight = scenarioBlocks
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

  getBlockDomId = (scenarioBlockKey) => {
    return `block_${scenarioBlockKey}`;
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
      DomIds.AddScenario
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
      detailsDomElement.classList.add("focusScenarioBlock");
      setTimeout(
        () => detailsDomElement.classList.remove("focusScenarioBlock"),
        250
      );
    }, 100);
  };

  isADocumentSelected = () => {
    var { activeKey } = this.state;
    return (activeKey) ? true : false;
  } 
  
  showCypherStatements = (scenarioBlockKey) => {
    this.showAssociateCypherDialog(scenarioBlockKey);
  }

  reRender = () => {
    this.forceUpdate();
  }

  render() {
    var {
      activeKey,
      selectedDataModel,
      scenarioBlocks,
      showSaveDialog,
      showLoadDialog,
      showAssociateCypherDialog,
      saveFormMode,
      editMetadata,
      metadataMap,
      cypherStatementMap,
      selectedDataModelText,
      rightDrawerOpen,
      rightDrawerOpenWidth,
      generalDialog,
      propertyDialog,
      relationshipCardinalityDialog,
      editHelper,
      minHeight,
      shareDialog,
      importExportDialog
    } = this.state;

    const selectedIndex = scenarioBlocks.findIndex((x) => x.selected);
    const noneSelected = selectedIndex === -1;
    const position = noneSelected ? "end" : selectedIndex;
    const { totalBlocks, totalWithAssociatedCypher } = this.scenarioBlockDataProvider.getAssociatedCypherMetrics();
    const associatedCypherTooltip = (totalWithAssociatedCypher > 0) ? 
          (totalBlocks === totalWithAssociatedCypher) ? 
            `All ${totalBlocks} scenario(s) have associated cypher` :
            `${totalWithAssociatedCypher} scenario(s) out of ${totalBlocks} have associated cypher`
          : `${totalBlocks} scenario(s)`;
    const associatedCypherMetric = (totalWithAssociatedCypher > 0) ? 
                        `(${totalWithAssociatedCypher}/${totalBlocks})` :
                        `(${totalBlocks})`;

    return (
      <div
        id={DomIds.Scenarios}
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
            <OutlinedStyledButton id={DomIds.AddScenario} style={{height: '2em'}}
              onClick={this.addScenarioBlockClick({
                position: position,
              })}
            >
              {`Add ${NEW_THING_NAME}`}
            </OutlinedStyledButton>
            {this.isThereAnAssociatedDataModel() && 
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
                    showLoadModelDialog(this.modelDialogHelperRef);
                  }}
                  style={{ marginLeft: "1em", height: "2em" }}
                  color="primary"
                >
                  <span style={{ whiteSpace: "nowrap" }}>Change Model...</span>
                </OutlinedStyledButton>
              </div>
            }
            <div style={{marginLeft: 'auto', marginRight: '1.5em', marginTop: '.7em', cursor: 'pointer'}}>
              <Tooltip enterDelay={600} arrow 
                title={associatedCypherTooltip}
              >
                <div style={{display:'flex', flexFlow: 'row'}}>
                  <div>{associatedCypherMetric}</div>
                  {(totalWithAssociatedCypher === totalBlocks && totalBlocks > 0) ?
                      <CheckCircleOutlineIcon style={{ color: 'green', fontSize: '1.3em', marginTop: '.1em', marginLeft: '.2em'}} 
                        onClick={(e) => {
                            e.stopPropagation();
                        }}/>
                      :
                      <AdjustIcon style={{ color: COLORS.primary, fontSize: '1.3em', marginTop: '.1em', marginLeft: '.2em'}} 
                        onClick={(e) => {
                            e.stopPropagation();
                        }}/>
                  }
                </div>
              </Tooltip>
            </div>
          </>
          :
          <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
            <span>No {TOOL_HUMAN_NAME} Document Loaded. Select 
                <span className='textMenuReference'> File &gt; New {TOOL_HUMAN_NAME}</span>,
                <span className='textMenuReference'> File &gt; Load {TOOL_HUMAN_NAME}</span>, or 
                <span className='textMenuReference'> Import </span>
                to get started.
            </span>
          </Typography>
        }
        </div>
        <div
          id={DomIds.ScenarioAccordionContainer}
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
            {scenarioBlocks.map((scenarioBlock, index) => (
              <AccordionBlock
                key={scenarioBlock.key}
                blockKey={scenarioBlock.key}
                domId={this.getBlockDomId(scenarioBlock.key)}
                expanded={scenarioBlock.expanded}
                selected={scenarioBlock.selected}
                noneSelected={noneSelected}
                newItemName={NEW_THING_NAME}
                scrollIntoView={scenarioBlock.scrollIntoView}
                workStatus={scenarioBlock.getWorkStatus()}
                workStatusMessage={scenarioBlock.getWorkMessage()}
                showToggleTool={scenarioBlock.showToggleTool}
                parentBuilder={this}
                dataProvider={scenarioBlock.dataProvider}
                selectAccordionPanel={this.selectAccordionPanel(scenarioBlock)}
                toggleAccordionPanel={this.toggleAccordionPanel(scenarioBlock)}
                removeAccordionPanel={this.removeAccordionPanel(scenarioBlock)}
                moveAccordionPanel={this.moveAccordionPanel}
                addMode={false}
                rightWidthOffset={
                  pxVal(this.getRightDrawerWidth()) -
                  pxVal(Sizes.RightTitleBarWidth)
                }
                firstBlock={index === 0}
                lastBlock={scenarioBlocks.length - 1 === index ? true : false}
              >
                {scenarioBlock.blockElement}
              </AccordionBlock>
            ))}
          </div>
        </div>
        <Drawer
          variant="permanent"
          anchor="right"
          onClose={() => {}}
          PaperProps={{
            style: {
              position: "absolute",
              opacity: (this.isThereAnAssociatedDataModel()) ? 1 : 0,
              top: Sizes.RightTop,
              overflowY: "hidden",
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
                cursor: (this.isThereAnAssociatedDataModel()) ? "pointer" : "default",
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
                Data Model
              </Typography>
              <div style={{ flexGrow: 1 }} />
            </div>
            <div style={{ padding: "10px" }}>
              <OutlinedStyledButton onClick={this.addNewNodeLabel} color="primary"
                    style={{height:'2em'}}>
                  <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> Node Label
              </OutlinedStyledButton>
              <OutlinedStyledButton onClick={this.removeAllCypherStatementHighlightsInDataModel} color="primary"
                    style={{height:'2em'}}>
                  Clear Highlights
              </OutlinedStyledButton>
              <Canvas 
                ref={this.dataModelRef} 
                dataModel={selectedDataModel} 
                canvasDomId={"scenarioModelerCanvas"}
                canvasArrowDomId={"scenarioModelerCanvasArrow"}
                canvasLeftOverride={pxVal(Sizes.RightTitleBarWidth) + 10}
                canvasTopOffset={-30}
                colorSizeTopOffset={5}
                zoomOnTop={true}
                containerCallback={this.canvasCallback}
                getWidth={() =>
                  `${
                    pxVal(rightDrawerOpenWidth) -
                    pxVal(Sizes.RightTitleBarWidth) -
                    20
                  }px`
                }
                getHeight={() => {
                  var height = (window.innerHeight - 170) 
                  if (height < 300) {
                      height = 300;
                  };
                  return height;
                }}
              />
            </div>
          </div>
        </Drawer>
        <SaveForm
          maxWidth={"sm"}
          open={showSaveDialog}
          onClose={this.handleSaveDialogClose}
          ref={this.saveFormRef}
          save={this.saveScenarioSetBuilderFromSaveForm}
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
          load={this.loadScenarioSetBuilder}
          cancel={this.handleLoadDialogClose}
          delete={this.delete}
          toolHumanName={TOOL_HUMAN_NAME}
          performSearch={this.performSearch}
          metadataMap={metadataMap}
        />
        <LoadForm
          maxWidth={"lg"}
          open={showAssociateCypherDialog}
          title={"Associate Cypher Statement"}
          onClose={this.handleAssociateCypherDialogClose}
          load={this.associateCypherStatement}
          cancel={this.handleAssociateCypherDialogClose}
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
                    toolUri={'/tools/scenarios/'}
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
        <ModalRelationship
                    ref={this.modalRelationshipRef}
                    addRelationship={this.addNodeRelNode}
                    editHelper={editHelper}/>                    
      </div>
    );
  }
}
