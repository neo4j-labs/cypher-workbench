import React, { Component } from 'react'
import {
    Button, CircularProgress, Drawer, TextField, Tab, Tabs, Tooltip, Typography
} from '@material-ui/core';
import { marked } from 'marked';

import { getAuth } from "../../auth/authUtil";

import { TabPanel } from "../../components/common/Components";

import {
    deleteLocalDataModel,
    getLocalDataModelJSON,
    loadLocalDataModelMetadata,
    saveLocalDataModel
} from '../../persistence/LocalPersistence';
import {
    getUserSettings,
    updateUserSettings,
    deleteRemoteDataModel,
    grabModelLock,
    getUserRolesForDataModel,
    updateUserRoles,
    listRemoteDataModelMetadataAndAddExplicitMatches,
    searchRemoteDataModelMetadata,
    loadRemoteDataModel,
    loadLastOpenedModel,
    saveRemoteDataModelMetadata,
    saveRemoteDataModelWithFullMetadata,
    NETWORK_STATUS
} from '../../persistence/graphql/GraphQLPersistence';

import { Canvas } from '../../components/canvas/Canvas';
import { CONTAINER_CALLBACK_MESSAGES } from '../../components/canvas/d3/dataModelCanvas';
import DataModel, { CypherType, Neo4jVersion } from '../../dataModel/dataModel';
import { downloadUrlAsFile } from '../../common/util/download';
import {
    currentlyConnectedToNeo,
    getCurrentConnectionInfo,
    showNeoConnectionDialog
} from "../../common/Cypher";
import { parseCypher } from '../../common/parse/parseCypher';

import { ALERT_TYPES, USER_ROLE, COLORS } from '../../common/Constants';
import { SAVE_MODE } from '../common/toolConstants';
import { 
    anyFeatureLicensed, 
    isFeatureLicensed, 
    FEATURES, 
    TOOL_NAMES,
    showUpgradeLicenseMessage,
    showMaxReachedUpgradeLicenseMessage
 } from '../../common/LicensedFeatures';
import FullScreenWaitOverlay from '../../components/common/FullScreenWaitOverlay';
import GeneralDialog from '../../components/common/GeneralDialog';
import GeneralTextDialog from '../../components/common/GeneralTextDialog';
import GeneralTextDialogWithOptions from '../../components/common/GeneralTextDialogWithOptions';
import ModalVariableLabelsAndTypes from '../../components/common/ModalVariableLabelsAndTypes';
import { OutlinedStyledButton, StyledButton } from '../../components/common/Components';

import RelationshipCardinalityDialog from './components/cardinality/RelationshipCardinalityDialog';

import ModelValidation from './components/ModelValidation';
import DataExport from './components/DataExport';
import { ValidationStatus } from '../common/validation/ValidationStatus';
import { getValidationIcon } from '../common/validation/ValidationSection';
import ModelLayoutSettings from './components/layout/ModelLayoutSettings';
import RelationshipLayoutSettings from './components/layout/RelationshipLayoutSettings';
import SecondaryNodeLabelSettings from './components/layout/SecondaryNodeLabelSettings';

import PropertyDialog from './components/properties/PropertyDialog';

import SecurityRole from '../common/SecurityRole';
import Sharing from '../common/security/Sharing';

import EditHelper from '../common/edit/editHelper';
import LoadModelForm from './components/LoadModelForm';
import { SaveModelForm, getModelMetadata } from './components/SaveModelForm';

import { DbSchema } from './importexport/importCypherStatements';
import { getDataModelFromApocMetaSchema } from './importexport/importApocMeta';
import { getDataModelFromRawDbSchema } from './importexport/importDbSchema';
import { getDataModelFromArrows } from './importexport/importArrows';
import { 
    importFromDatabase, 
    enhanceDataModelWithConstraintsAndIndexes,
    runSecondaryNodeLabelPostProcessing
 } from './importexport/importFromDatabase';
import { convertMetadataToCurrentVersion } from './importexport/convert';
import { DataModelMarkdown } from './importexport/exportMarkdown';
import { getDynamicConfigValue, getAppName } from '../../dynamicConfig';

import { parseModelInput } from './parse/parseModelInput';
import { ModelPersistence, PERSISTENCE_STATE_ITEMS } from '../common/model/modelPersistence';

import {
    GraphDocChangeType,
  } from "../../dataModel/graphDataConstants";
  
export const MODEL_ACTIONS = {
    IMPORT_DATABASE_MODEL: "ImportDatabaseModel"
}
const NO_ACTIVE_MODEL_MESSAGE = 'No model is loaded. This option is unavailable when there is not an active model.';

const HighlightClasses = {
    HighlightNode: 'highlightNode', 
    HighlightRel: 'highlightRel'
  }
  
const TabIndexes = {
    Validation: 0,
    DataExport: 1
}
  
const DomIds = {
    ModelerCanvas: "modelerCanvas",
    ModelerCanvasArrow: "modelerCanvasArrow"
}

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

export const getExportData = (metadata, dataModel) => {
    metadata = {...metadata}
    delete metadata.key;
    delete metadata.isPublic;
    delete metadata.userRole;
    delete metadata.userIsCreator;
    delete metadata.__typename;    // this comes from Apollo

    var exportData = {
        metadata: metadata,
        dataModel: dataModel.toExportObject()
    }
    return exportData;
}

  
export default class Model extends Component {

    setArrowsSetChecked = null;     // a work-around to set the state of a nested menu item

    viewChanged = (changeType) => {
        if (this.isAModelSelected()) {
          this.dataModelChangeListener({
                dataChangeType: changeType
          });
        }
      }

    dataModelChangeListener = (message) => {
        var { isInstanceModel, dataModel } = this.state;
        var dataModelIsInstanceModel = dataModel.isInstanceModel();
        if (isInstanceModel !== dataModelIsInstanceModel) {
            this.setState({
                isInstanceModel: dataModelIsInstanceModel
            });
        }
        this.persistenceHelper.dataModelChangeListener(message);
    }

    getDataModel = () => {
        if (this.state && this.state.dataModel && this.persistenceHelper) {
            this.state.dataModel.removeDataChangeListener(this.dataModelChangeListener);
        }
        var dataModel = DataModel();
        if (this.persistenceHelper) {
            dataModel.addDataChangeListener(this.dataModelChangeListener);
        }
        return dataModel;
    }

    closeExportConstraintsDialog = () => {
        this.setState({ exportConstraintsDialog: { ...this.state.exportConstraintsDialog, open: false }});
    }

    closeExportCypherStatementDialog = () => {
        this.setState({ exportCypherStatementDialog: { ...this.state.exportCypherStatementDialog, open: false }});
    }

    closeImportExportDialog = () => {
        this.setState({ importExportDialog: { ...this.state.importExportDialog, open: false }});
    }

    closeParseDialog = () => {
        this.setState({ parseDialog: { ...this.state.parseDialog, open: false }});
    }

    closeSaveAsDialog = () => {
        this.setState({ saveAsDialog: { ...this.state.saveAsDialog, open: false }});
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

    setImportExportText = (e) => {
        this.setState({ importExportDialog: { ...this.state.importExportDialog, text: e.target.value }});
    }

    setParseText = (e) => {
        this.setState({ parseDialog: { ...this.state.parseDialog, text: e.target.value }});
    }

    setSaveAsText = (e) => {
        this.setState({ saveAsDialog: { ...this.state.saveAsDialog, text: e.target.value }});
    }

    handleMetadataResponse = (response, key, callback) => {
        if (response.success) {
            var data = response.data;
            var modelMetadataMap = {};
            //console.log(data);
            var dataModels = (data && data[key]) ? data[key] : [];
            dataModels.forEach(function (dataModel) {
                modelMetadataMap[dataModel.key] = dataModel.metadata;
            })
            this.setState({
                modelMetadataMap: modelMetadataMap
            }, () => {
                if (callback) { callback() };
            })
        } else {
            var errorStr = '' + response.error;
            if (errorStr.match(/Network error/)) {
                this.persistenceHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
            }
            alert(response.error);
        }
    }

    performModelSearch = (searchText, includePublic, myOrderBy, orderDirection) => {
        this.setState({
            loadDialog: {
                ...this.state.loadDialog,
                searchText: searchText,
                includePublic: includePublic,
                myOrderBy: myOrderBy,
                orderDirection: orderDirection
            }
        });

        if (searchText) {
            this.setStatus('Searching...', {fullScreenBusy: true});
            searchRemoteDataModelMetadata(searchText, includePublic, myOrderBy, orderDirection, (response) => {
                this.setStatus('', false);
                this.handleMetadataResponse(response, 'searchDataModelsX');
            });
        } else {
            this.setStatus('Loading...', {fullScreenBusy: true});
            let { urlParamsId } = this.state;
            let urlParamsArray = (urlParamsId) ? [urlParamsId] : [];
            listRemoteDataModelMetadataAndAddExplicitMatches(urlParamsArray, includePublic, myOrderBy, orderDirection, (response) => {
                this.setStatus('', false);
                this.handleMetadataResponse(response, 'listDataModelsAndAddExplicitMatches');
            });
        }
    }

    setStatus = (message, active) => {
        var fullScreenBusy = false;
        if (typeof(active) === 'object') {
            fullScreenBusy = (active.fullScreenBusy) ? true : false;
            active = (fullScreenBusy) ? false : true;
        }
        message = (typeof(message) === 'string') ? message : '' + message;
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
    }

    closeGeneralDialog = () => {
        this.setState({ generalDialog: { ...this.state.generalDialog, open: false }});
    }

    state = {
        urlParamsId: '',
        modelInput: '',
        saved: false,
        status: '',
        rightDrawerOpen: false,
        rightDrawerOpenWidth: Sizes.DefaultRightDrawerWidth,
        validationMessage: 'Not validated',
        validationStatus: ValidationStatus.NotValidated,
        userSettings: {},
        activityIndicator: false,

        destinationTabIndex: 0,    

        fullScreenBusyIndicator: false,
        showSaveDialog: false,
        showLoadDialog: false,
        saveModelFormMode: '',
        activeModelKey: '',
        isInstanceModel: false,
        loadedModelMetadata: getModelMetadata(),
        componentLoadedAlready: false,
        cancelModelMetadata: {},    // to store the loadedModelMetadata so we can restore it on cancel
        editModelMetadata: {},
        //modelMetadataMap: loadLocalDataModelMetadata(),
        modelMetadataMap: {},
        dataModel: this.getDataModel(),
        editHelper: new EditHelper(),
        exportCypherString: '',
        exportConstraintsDialog: {
            open: false,
            handleClose: this.closeExportConstraintsDialog,
            title: '',
            text: '',
            placeholder: '',
            disableEditing: true,
            setText: () => {},
            buttons: [],
            defaultOptionValue: '',
            optionChanged: () => {},
            options: []
        },
        exportCypherStatementDialog: {
            open: false,
            handleClose: this.closeExportCypherStatementDialog,
            title: '',
            text: '',
            placeholder: '',
            disableEditing: true,
            setText: () => {},
            buttons: [],
            defaultOptionValue: '',
            optionChanged: () => {},
            options: []
        },
        importExportDialog: {
            open: false,
            handleClose: this.closeImportExportDialog,
            title: '',
            text: '',
            placeholder: '',
            disableEditing: false,
            setText: this.setImportExportText,
            buttons: []
        },
        parseDialog: {
            open: false,
            handleClose: this.closeParseDialog,
            title: '',
            text: '',
            placeholder: '',
            setText: this.setParseText,
            buttons: []
        },
        saveAsDialog: {
            open: false,
            handleClose: this.closeSaveAsDialog,
            title: '',
            text: '',
            placeholder: '',
            setText: this.setSaveAsText,
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
        },
        loadDialog: {
            searchText: '',
            myOrderBy: 'dateUpdated',
            orderDirection: 'DESC'
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
        generalDialog: {
            open: false,
            handleClose: this.closeGeneralDialog,
            title: '',
            description: '',
            buttons: []
        },
        propertyContainer: {}
    }

    changeDestinationTabIndex = (event, index) => {
        this.setState(
          {
            destinationTabIndex: index,
          },
          () => {
            this.viewChanged(GraphDocChangeType.ActiveTabChanged);
          }
        );
      };

    showGeneralDialog = (title, description, buttons) => {
        var { generalDialog } = this.state;
        this.setState({
            generalDialog: {
                ...generalDialog,
                open: true,
                title: title,
                description: description,
                buttons: buttons
            }
        });
    }

    showExportHtml = (title, displayHtml, downloadHtml, downloadAsFileName) => {

        var toggleHtmlView = () => {
            var { importExportDialog } = this.state;
            var { buttons, text, htmlText, htmlPreviewMode } = importExportDialog;

            var changedButtons = buttons.slice(0);
            if (htmlPreviewMode) {
                htmlText = null;
                htmlPreviewMode = false;
                changedButtons[0].text = 'Show Html Preview';
            } else {
                htmlText = text;
                htmlPreviewMode = true;
                changedButtons[0].text = 'Show Html Source';
            }

            this.setState({
                importExportDialog: {
                    ...this.state.importExportDialog,
                    htmlText: htmlText,
                    htmlPreviewMode: htmlPreviewMode,
                    buttons: changedButtons
                }
            })
        }

        var buttons = [];
        this.exportHtmlText = displayHtml;
        buttons.push({
            text: 'Show Html Source',
            onClick: (button, index) => toggleHtmlView(),
            autofocus: true
        });

        if (downloadAsFileName) {
            buttons.push({
                text: 'Download As File',
                onClick: this.downloadTextAsFile(downloadHtml, downloadAsFileName),
                autofocus: true
            });
        }
        buttons.push({
            text: 'OK',
            onClick: (button, index) => this.closeImportExportDialog(),
            autofocus: true
        });

        this.setState({
            importExportDialog: {
                ...this.state.importExportDialog,
                open: true,
                title: title,
                htmlText: displayHtml,
                htmlPreviewMode: true,
                disableEditing: true,
                text: displayHtml,
                placeholder: '',
                buttons: buttons
            }
        });
    }

    showExportConstraints = () => {
        let fileName = this.getExportFileName('cw_constraints', 'cypher');
        var buttons = [];
        buttons.push({
            text: 'Download As File',
            onClick: () => {
                const { exportConstraintsString } = this.state;
                let downloadFunc = this.downloadTextAsFile(exportConstraintsString, fileName)
                downloadFunc();
            },
            autofocus: true
        });
        buttons.push({
            text: 'OK',
            onClick: (button, index) => this.closeExportConstraintsDialog(),
            autofocus: true
        });

        var { dataModel } = this.state;
        let defaultValue = Neo4jVersion.v5;
        var constraints = dataModel.getConstraintStatements({ neo4jVersion: defaultValue });
        //console.log(constraints);

        this.setState({
            exportConstraintsString: constraints,
            exportConstraintsDialog: {
                ...this.state.exportConstraintsDialog,
                open: true,
                title: 'Export Constraints',
                text: constraints,
                placeholder: '',
                htmlText: '',
                htmlPreviewMode: false,
                disableEditing: true,
                buttons: buttons,
                optionChanged: (newValue) => { 
                    const newConstraints = dataModel.getConstraintStatements({ neo4jVersion: newValue });
                    this.setState({exportConstraintsString: newConstraints})
                },
                options: [{
                    value: Neo4jVersion.v5, 
                    label: Neo4jVersion.v5
                },
                {
                    value: Neo4jVersion.v4_4, 
                    label: Neo4jVersion.v4_4
                },
                {
                    value: Neo4jVersion.v4_3, 
                    label: Neo4jVersion.v4_3
                }],
                defaultOptionValue: defaultValue
            }
        }, () => {
            this.exportConstraintsRef.current.focusTextBox();
        });
    }

    showExportCypher = () => {
        let fileName = this.getExportFileName('cw_cypher', 'cypher');
        var buttons = [];
        buttons.push({
            text: 'Download As File',
            onClick: () => {
                const { exportCypherString } = this.state;
                let downloadFunc = this.downloadTextAsFile(exportCypherString, fileName)
                downloadFunc();
            },
            autofocus: true
        });
        buttons.push({
            text: 'OK',
            onClick: (button, index) => this.closeExportCypherStatementDialog(),
            autofocus: true
        });

        var { dataModel } = this.state;
        let defaultValue = CypherType.Create;
        var cypher = dataModel.toArrowsStyleCypher(dataModel, { cypherType: defaultValue });
        //console.log(cypher);

        this.setState({
            exportCypherString: cypher,
            exportCypherStatementDialog: {
                ...this.state.exportCypherStatementDialog,
                open: true,
                title: 'Export Cypher',
                text: cypher,
                placeholder: '',
                htmlText: '',
                htmlPreviewMode: false,
                disableEditing: true,
                buttons: buttons,
                optionChanged: (newValue) => { 
                    const newCypher = dataModel.toArrowsStyleCypher(dataModel, { cypherType: newValue });
                    this.setState({exportCypherString: newCypher})
                },
                options: [{
                    value: CypherType.Create, 
                    label: CypherType.Create
                },
                {
                    value: CypherType.Merge, 
                    label: CypherType.Merge
                }],
                defaultOptionValue: defaultValue
            }
        }, () => {
            this.exportCypherStatementRef.current.focusTextBox();
        });
    }

    showExportText = (title, text, downloadAsFileName) => {
        var buttons = [];
        if (downloadAsFileName) {
            buttons.push({
                text: 'Download As File',
                onClick: this.downloadTextAsFile(text, downloadAsFileName),
                autofocus: true
            });
        }
        buttons.push({
            text: 'OK',
            onClick: (button, index) => this.closeImportExportDialog(),
            autofocus: true
        });

        this.setState({
            importExportDialog: {
                ...this.state.importExportDialog,
                open: true,
                title: title,
                text: text,
                placeholder: '',
                htmlText: '',
                htmlPreviewMode: false,
                disableEditing: false,
                buttons: buttons
            }
        }, () => {
            this.importExportDialogRef.current.focusTextBox();
        });
    }

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }

    constructor (props) {
        super(props);
        //props.addTabActivationFunction(props.index, this.tabActivated);
        this.canvasRef = React.createRef();
        this.saveModelFormRef = React.createRef();
        this.modelValidationRef = React.createRef();
        this.shareDialogRef = React.createRef();
        this.saveAsDialogRef = React.createRef();
        this.importExportDialogRef = React.createRef();
        this.exportCypherStatementRef = React.createRef();
        this.exportConstraintsRef = React.createRef();
        this.parseDialogRef = React.createRef();
        this.propertyDialogRef = React.createRef();
        this.relationshipCardinalityDialogRef = React.createRef();
        this.modelLayoutSettingsRef = React.createRef();
        this.modelRelationshipLayoutSettingsRef = React.createRef();
        this.modelSecondaryNodeLabelSettingsRef = React.createRef();
        this.modalVariableLabelAndTypesRef = React.createRef();
        this.dataExportRef = React.createRef();
        this.textFocus = this.utilizeFocus();

        this.persistenceHelper = new ModelPersistence({
            getNetworkStatus: this.props.getNetworkStatus,
            setNetworkStatus: this.props.setNetworkStatus,
            getSecurityRole: () => SecurityRole,
            parentContainer: this,
            getStateItem: (key) => {
                var stateItem = null;
                switch (key) {
                    case PERSISTENCE_STATE_ITEMS.DataModel:
                        stateItem = this.state.dataModel;
                        break;
                    case PERSISTENCE_STATE_ITEMS.LoadedModelMetadata:
                        stateItem = this.state.loadedModelMetadata;
                        break;
                    case PERSISTENCE_STATE_ITEMS.ActiveModelKey:
                        stateItem = this.state.activeModelKey;
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
                            loadedModelMetadata: item
                        });
                        break;
                    default:
                        break;
                }
            }
        });
        if (this.state.dataModel) {
            this.state.dataModel.addDataChangeListener(this.dataModelChangeListener);
        }

        props.setSureRef(this);
    }

    getDataModelCanvas = () => this.canvasRef.current.getDataModelCanvas();

    loadFromWebHistory = (modelKey) => {
        var { modelMetadataMap } = this.state;
        var modelInfo = modelMetadataMap[modelKey];
        this.loadModel(modelInfo, true);
    }

    componentDidMount () {
        var { editHelper } = this.state;
        editHelper.setEditConfirmDelete(this.editConfirmDelete);
        editHelper.setParentContainer(this);
    }

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
        //alert('message from canvas');
        //console.log(message);
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

    setValue = (e) => {
        if (SecurityRole.canEdit()) {
            this.setState({
                saved: false,
                [e.target.name]: e.target.value
            })
        }
    }

    handleModelInputKeyPress = (e) => {
        var success;
        if (SecurityRole.canEdit()) {
            if (e.key === "Enter") {
                var dataModelCanvas = this.getDataModelCanvas();
                var result = parseModelInput(this.state.modelInput, this.state.dataModel, dataModelCanvas);
                //console.log(result);
                if (result.success) {
                    if (result.cypherParse) {
                        this.setState({
                            modelInput: ""
                        });
                        dataModelCanvas.renderDataModel();
                    } else {
                        var errorMessages = result.thingsToAdd.map(x => {
                            if (x.type === 'NodeLabel') {
                                return this.addNodeLabel(x.nodeLabel);
                            } else if (x.type === 'NodeRelNode') {
                                return this.addNodeRelNode (x.start, x.relationship, x.end);
                            } else {
                                return { success: false, message: 'Unknown type ' + x.type};
                            }
                        })
                        .filter(response => {
                            //console.log('filter response:');
                            //console.log(response);
                            return (!response.success);
                        })
                        .map(response => response.message);
                        //console.log('errorMessages');
                        //console.log(errorMessages);

                        if (errorMessages.length > 0) {
                            alert(errorMessages.join('\n'));
                        } else {
                            this.setState({
                                modelInput: ""
                            });
                        }
                    }
                } else {
                    alert(result.message);
                }
            }
        }
    }

    addNewNodeLabel = () => {
        if (SecurityRole.canEdit(true)) {
            this.getDataModelCanvas().createNewNodeLabel();
        }
    }

    addNodeLabel = (label) => {
        var success = true, message= '';
        try {
            this.getDataModelCanvas().addNodeLabel(label);
        } catch (e) {
            success = false;
            message = e.toString();
        }
        return { success, message };
    }

    addNodeRelNode = (startLabel, relType, endLabel) => {
        var success = true, message = '';
        var dataModelCanvas = this.getDataModelCanvas();
        try {
            var start = dataModelCanvas.getNodeLabel(startLabel);
            if (!start) {
                start = dataModelCanvas.addNodeLabel(startLabel);
            }
            var end = dataModelCanvas.getNodeLabel(endLabel);
            if (!end) {
                end = dataModelCanvas.addNodeLabel(endLabel);
            }
            dataModelCanvas.addRelationshipType(relType, start, end);
        } catch (e) {
            success = false;
            message = e.toString();
        }
        return { success, message };
    }

    handleMenu (menu, menuItem) {
        //console.log('Model: menu clicked: ' + menu.id + ':' + menuItem.id);
    }

    getCanvasSettings = () => ({...this.state.userSettings.canvasSettings });

    getMenus = () => {

        var menus = [];

        var fileMenuItems = [
            {id: 'new', text: 'New Model'},
            {id: 'load', text: 'Load Model'},
            {id: 'deleteModel', text: 'Delete Model'},
            {id: 'divider', text: '_'},
            {id: 'save', text: 'Edit Info'}
        ];

        fileMenuItems.push({id: 'share', text: 'Share'});
        fileMenuItems.push({id: 'saveAs', text: 'Clone Model'});

        var fileMenu = {
            id: 'model-file',
            text: 'File',
            handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'new':
                        if (this.persistenceHelper.isOnline()) {
                            this.newModel();
                        }
                        break;
                    case 'save':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            if (this.persistenceHelper.isOnline()) {
                                this.setState({
                                    editModelMetadata: JSON.parse(JSON.stringify(this.state.loadedModelMetadata)),
                                    saveModelFormMode: SAVE_MODE.EXISTS,
                                    showSaveDialog: true
                                }, () => {
                                    this.saveModelFormRef.current.focusTextBox();
                                });
                            }
                        }
                        break;
                    case 'deleteModel':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {
                            if (this.persistenceHelper.isOnline()) {
                                var { activeModelKey } = this.state;
                                var description = `Do you want to delete ${this.getTitle()}?`
                                this.showGeneralDialog('Delete Model', description, [{
                                        text: 'Yes',
                                        onClick: (button, index) => {
                                            this.deleteModel(activeModelKey, () => {
                                                //this.newModel();
                                            });
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
                        }
                        break;
                    case 'share':
                        if (isFeatureLicensed(FEATURES.MODEL.Share)) {
                            if (!this.isAModelSelected()) {
                                alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                            } else {
                                if (this.persistenceHelper.isOnline()) {
                                    this.showShare();
                                }
                            }
                        } else {
                            showUpgradeLicenseMessage();
                        }
                        break;
                    case 'saveAs':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            if (this.persistenceHelper.isOnline()) {
                                this.showSaveAs();
                            }
                        }
                        break;
                    case 'load':
                        if (this.persistenceHelper.isOnline()) {
                            this.showLoadModelDialog();
                        }
                        break;
                    default:
                        break;
                }
            },
            menuItems: fileMenuItems
        }
        if (fileMenuItems.length > 0) {
            menus.push(fileMenu);
        }

        var layoutMenuId = 'model-layout';
        var layoutMenuItems = [];
        var atLeastOneLayoutLicensed = false;
        if (isFeatureLicensed(FEATURES.MODEL.ForceLayout)) {
            atLeastOneLayoutLicensed = true;
            layoutMenuItems.push({id: 'force', text: 'Force Layout'});
        }
        if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
            atLeastOneLayoutLicensed = true;
            layoutMenuItems.push({id: 'sideToSide', text: 'Left to Right'});
        }
        if (isFeatureLicensed(FEATURES.MODEL.LeftToRightLayout)) {
            atLeastOneLayoutLicensed = true;
            layoutMenuItems.push({id: 'topBottom', text: 'Top to Bottom'});
        }
        if (atLeastOneLayoutLicensed) {
            layoutMenuItems.push({id: 'divider1', text: '_'});
        }
        layoutMenuItems.push({id: 'bringAllNodesToTop', text: 'Bring All Nodes to Front'});

        layoutMenuItems.push({
            menuId: layoutMenuId,
            checkmarkMenuItem: true,        // this will be set during handleUserSettings       
            menuItem: {
                id: 'showArrows', 
                text: 'Show Arrows',
                checked: true,
                onLoaded: (properties) => {
                    properties = properties || {};
                    var { setChecked } = properties;
                    this.setArrowsSetChecked = setChecked;
                },
                onClick: (properties) => {
                    properties = properties || {};
                    var { checked, setChecked } = properties;

                    const newValue = !checked;
                    //alert(`newValue of showArrows is ${newValue}`);
                    setChecked(newValue);
                    this.getDataModelCanvas().setShowArrows(newValue);                    
                    this.getDataModelCanvas().renderRelationships();                    

                    const canvasSettings = {
                        ...this.getCanvasSettings(),
                        showArrows: newValue
                    }

                    this.setState({
                        userSettings: {
                            ...this.state.userSettings,
                            canvasSettings: canvasSettings
                        }
                    }, () => {
                        this.saveUserSettings({
                            canvasSettings: canvasSettings
                        });
                    });
                }
            }
        });

        layoutMenuItems.push(
            { component: <RelationshipLayoutSettings ref={this.modelRelationshipLayoutSettingsRef}
                    key={layoutMenuId + '_modelRelationshipLayoutSettings'}
                    getCanvasSettings={this.getCanvasSettings}
                    saveUserSettings={this.saveUserSettings} menuId={layoutMenuId}
                    handleRelationshipDisplayChange={this.handleRelationshipDisplayChange} />}
        );

        /* TODO: fix this so it works
        layoutMenuItems.push(
            { component: <SecondaryNodeLabelSettings ref={this.modelSecondaryNodeLabelSettingsRef}
                    key={layoutMenuId + '_modelSecondaryNodeLabelSettings'}
                    saveUserSettings={this.saveUserSettings} menuId={layoutMenuId}
                    handleSecondaryNodeLabelChange={this.handleSecondaryNodeLabelChange} />}
        );
        */

        layoutMenuItems.push({id: 'divider2', text: '_'});
        layoutMenuItems.push(
            { component: <ModelLayoutSettings ref={this.modelLayoutSettingsRef} key={layoutMenuId + '_modelLayoutSettings'}
                    getCanvasSettings={this.getCanvasSettings}
                    saveUserSettings={this.saveUserSettings} menuId={layoutMenuId}/>}
        );

        var layoutMenu = {
            id: layoutMenuId,
            text: 'Layout',
            handler: (menu, menuItem) => {
                var canvas = this.getDataModelCanvas();
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
            },
            menuItems: layoutMenuItems
        }
        if (layoutMenuItems.length > 0) {
            menus.push(layoutMenu);
        }

        var parseMenuItems = [];
        if (isFeatureLicensed(FEATURES.MODEL.ParseCypher)) {
            parseMenuItems.push({id: 'parseCypher', text: 'Parse Cypher'});
        }
        /*
        {id: 'parseTriples', text: 'Parse Triples'},
        {id: 'parseGraphGist', text: 'Parse Graph Gist'} */

        var parseMenu = {
            id: 'model-parse',
            text: 'Parse',
            handler: (menu, menuItem) => {
                //console.log('TODO: handle parse for: ' + menuItem.id);
                switch (menuItem.id) {
                    case 'parseCypher':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            if (SecurityRole.canEdit(true)) {
                                this.showParseCypher();
                            }
                        }
                        break;
                    default:
                        break;
                }
            },
            menuItems: parseMenuItems
        }
        if (parseMenuItems.length > 0) {
            menus.push(parseMenu);
        }

        var importMenuItems = [];
        if (anyFeatureLicensed([
            FEATURES.MODEL.ImportModel,
            FEATURES.MODEL.ImportModelFromApoc,
            FEATURES.MODEL.ImportModelFromArrows
        ])) {
            importMenuItems.push({id: 'import', text: 'Import Model'});
        }
        if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromDatabase)) {
            importMenuItems.push({id: 'importFromDatabase', text: 'Import Model from Database'});
        }

        var importMenu = {
            id: 'model-import',
            text: 'Import',
            handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'import':
                        if (this.persistenceHelper.isOnline()) {
                            this.showImportModel();
                        }
                        break;
                    case 'importFromDatabase':
                        this.importFromDatabaseMenuItem();
                        break;
                    default:
                        break;
                }
            },
            menuItems: importMenuItems
        }
        if (importMenuItems.length > 0) {
            menus.push(importMenu);
        }

        var exportMenuItems = [];
        var needExportDivider = false;
        if (isFeatureLicensed(FEATURES.MODEL.ExportModel)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'export', text: 'Export Model'})
        }
        if (isFeatureLicensed(FEATURES.MODEL.ExportCypher)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'exportCypher', text: 'Export Cypher'})
        }
        if (isFeatureLicensed(FEATURES.MODEL.ExportConstraints)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'exportConstraints', text: 'Export Constraints'})
        }
        if (isFeatureLicensed(FEATURES.MODEL.ExportModel)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'exportLLMModel', text: 'Export LLM Model'})
        }

        //if (isFeatureLicensed(FEATURES.MODEL.ExportConstraints)) {
        if (this.isDataExportEnabled()) {
            if (needExportDivider) {
                exportMenuItems.push({id: 'divider0', text: '_'});            
            }
            exportMenuItems.push({id: 'getDataExportJson', text: 'Get Data Export Json'})
            exportMenuItems.push({id: 'dataExport', text: 'Data Export'})
            needExportDivider = true;
        }
        if (needExportDivider) {
            exportMenuItems.push({id: 'divider1', text: '_'});
        }
        needExportDivider = false;
        if (isFeatureLicensed(FEATURES.MODEL.ExportHtml)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'exportHtml', text: 'Export Html'})
        }
        if (isFeatureLicensed(FEATURES.MODEL.ExportMarkdown)) {
            needExportDivider = true;
            exportMenuItems.push({id: 'exportMarkdown', text: 'Export Markdown'})
        }
        if (needExportDivider) {
            exportMenuItems.push({id: 'divider2', text: '_'});
        }
        if (isFeatureLicensed(FEATURES.MODEL.ExportSVG)) {
            exportMenuItems.push({id: 'downloadSvg', text: 'Download SVG'})
        }

        var exportMenu = {
            id: 'model-export',
            text: 'Export',
            handler: (menu, menuItem) => {
                var { dataModel } = this.state;
                var fileName = '';
                switch (menuItem.id) {
                    case 'export':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            this.showExportModel();
                        }
                        break;
                    case 'exportConstraints':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            this.showExportConstraints();
                        }
                        break;
                    case 'exportLLMModel':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            var llmModel = dataModel.toLLMModelText(dataModel);
                            //console.log(constraints);
                            fileName = this.getExportFileName('cw_llm_model', 'txt');
                            this.showExportText('Export LLM Model', llmModel, fileName);
                        }
                        break;
                    case 'getDataExportJson':
                        var result = this.openDataExportTab();
                        if (result) {
                            const showDataMappingJson = async () => {
                                fileName = this.getExportFileName('cw_datamapping', 'json', '_datamapping');
                                if (this.dataExportRef.current) {
                                    var dataMappingJson = await this.dataExportRef.current.getExportDataJson();
                                    if (dataMappingJson) {
                                        var dataMappingJsonString = JSON.stringify(dataMappingJson, null, 2);
                                        this.showExportText('Export Data Mapping', dataMappingJsonString, fileName);
                                    }
                                }
                            }
                            showDataMappingJson();
                        }
                        break;
                    case 'dataExport':
                        this.openDataExportTab();
                        break;
                    case 'exportCypher':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            this.showExportCypher();
                        }
                        break;
                    case 'exportMarkdown':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            fileName = this.getExportFileName('cw_markdown', 'md');
                            this.showExportText('Export Markdown', this.getModelMarkdown(), fileName);
                        }
                        break;
                    case 'exportHtml':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            var displayHtml = marked(this.getModelMarkdown());        
                            var downloadHtml = this.getModelHtml();
                            fileName = this.getExportFileName('cw_model', 'html');
                            this.showExportHtml('Export Html', displayHtml, downloadHtml, fileName);
                        }
                        break;
                    case 'downloadSvg':
                        if (!this.isAModelSelected()) {
                            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
                        } else {                        
                            var modelTitle = (this.state.loadedModelMetadata && this.state.loadedModelMetadata.title) ?
                                                this.state.loadedModelMetadata.title : 'New Model';
                            modelTitle = modelTitle.replace(/ /g, '_');
                            this.saveSvg(this.getDataModelCanvas().getSvgElement(), modelTitle + '.svg');
                        }
                        break;
                    default:
                        break;
                }
            },
            menuItems: exportMenuItems
        }
        if (exportMenuItems.length > 0) {
            menus.push(exportMenu);
        }

        var validationMenuItems = [];
        if (anyFeatureLicensed([
            FEATURES.MODEL.ValidateModel
        ])) {
            validationMenuItems.push({id: 'validate', text: 'Validate Model'});
            validationMenuItems.push({id: 'clearValidation', text: 'Clear Validation'});
        }

        var validateMenu = {
            id: 'model-validate',
            text: 'Validate',
            handler: (menu, menuItem) => {
                switch (menuItem.id) {
                    case 'validate':
                        const { rightDrawerOpen } = this.state;
                        if (!rightDrawerOpen) {
                            this.toggleRightDrawer();
                        }
                        this.validateDataModel();
                        break;
                    case 'clearValidation':
                        this.resetValidateDataModel();
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
    }

    openDataExportTab = () => {
        if (!this.isAModelSelected()) {
            alert(NO_ACTIVE_MODEL_MESSAGE, ALERT_TYPES.WARNING);
            return false;
        } else {                        
            const { rightDrawerOpen } = this.state;
            if (!rightDrawerOpen) {
                this.toggleRightDrawer();
            }
            this.changeDestinationTabIndex(null, TabIndexes.DataExport);
            return true;
        }
    }

    getModelMarkdown = () => {
        var { dataModel } = this.state;        
        var dataModelMarkdown = new DataModelMarkdown({
            dataModel: dataModel,
            dataModelMetadata: this.state.loadedModelMetadata
        });
        var markdown = dataModelMarkdown.getMarkdown();
        return markdown;
    }

    getModelHtml = () => {
        var { dataModel } = this.state;        
        var dataModelMarkdown = new DataModelMarkdown({
            dataModel: dataModel,
            dataModelMetadata: this.state.loadedModelMetadata
        });
        var html = dataModelMarkdown.getHtmlWithFormatting();
        return html;
    }

    handleRelationshipDisplayChange = (value) => {
        this.getDataModelCanvas().setRelationshipDisplay(value);
        this.getDataModelCanvas().renderDataModel();
    }

    /*
    handleSecondaryNodeLabelChange = (value) => {
        this.getDataModelCanvas().setSecondaryNodeLabelDisplay(value);
        this.getDataModelCanvas().renderDataModel();
    } */   

    importFromDatabaseMenuItem = () => {
        if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromDatabase)) {
            if (this.persistenceHelper.isOnline()) {
                if (!currentlyConnectedToNeo()) {
                    showNeoConnectionDialog({
                        onConnectCallback: (connectionInfo) => {
                            this.importSchemaFromDatabase(connectionInfo);
                        }, 
                        buttonText: "Import",
                        doCallbackOnWebSocketError: true
                    });
                } else {
                    this.importSchemaFromDatabase();
                }
            }
        } else {
            alert('Not licensed to import schema from database');
        }
    }

    layoutAfterImport = () => {
        var dimensions = this.getDataModelCanvas().doDagreLayout("top");
        var scaleFactorX = 1, scaleFactorY = 1;
        if (dimensions.diagramWidth > dimensions.canvasWidth) {
            scaleFactorX = dimensions.canvasWidth / dimensions.diagramWidth;
        }
        if (dimensions.diagramHeight > dimensions.canvasHeight) {
            scaleFactorY = dimensions.canvasHeight / dimensions.diagramHeight;
        }
        var scaleFactor = (scaleFactorX < scaleFactorY) ? scaleFactorX : scaleFactorY;
        if (scaleFactor < 1) {
            scaleFactor = (scaleFactor < .1) ? .1 : scaleFactor;
            scaleFactor = Math.floor(10 * scaleFactor) * 10;
            this.canvasRef.current.zoomOut(100 - scaleFactor);
        }
        this.getDataModelCanvas().bringAllNodesToTop();
    }

    importSchemaFromDatabase = (connectionInfo) => {
        this.setStatus("Importing database schema...", {fullScreenBusy: true});

        const processCypherResult = async (cypherFunction, jsonSchema) => {
            var connectionInfo = (connectionInfo) ? connectionInfo : getCurrentConnectionInfo();
            var { modelMetadata, dataModel } = this.getImportDataModel(jsonSchema, cypherFunction, connectionInfo);

            // enhance imported model with calls to db.constraints() and db.indexes()

            // TODO: fix this for Neo4j 5
            // await enhanceDataModelWithConstraintsAndIndexes(dataModel, this.setStatus);

            // TODO: make optional!!
            //runSecondaryNodeLabelPostProcessing(dataModel);

            this.saveImportModel(modelMetadata, dataModel, () => {
                this.setStatus("Successfully imported schema", false);
                this.layoutAfterImport();
            }, () => {});
        }

        importFromDatabase(connectionInfo, processCypherResult, this.setStatus);
    }

    showLoadModelDialog = () => {
        let { urlParamsId } = this.state;
        let urlParamsArray = (urlParamsId) ? [urlParamsId] : [];
        this.persistenceHelper.getModelMetadataMapAndAddExplicitMatches(urlParamsArray, () => {
            this.setState({
                showLoadDialog: true
            });
        });
    }

    saveAsNewModel = () => {
        var modelJson = this.getExportData();
        try {
            var importModelObject = JSON.parse(modelJson);
            var { modelMetadata, dataModel } = this.getImportDataModel(importModelObject);
            modelMetadata.title = this.state.saveAsDialog.text;
            this.saveImportModel(modelMetadata, dataModel, () => {
                this.closeSaveAsDialog();
            }, () => {
                this.closeSaveAsDialog();
            });
        } catch (e) {
            alert(e);
        }
    }

    getDbSchemaModelMetadata = (cypherFunction, importFromDbInfo) => {
        var databaseTitle = (importFromDbInfo) ? `${importFromDbInfo.name}` : 'Unknown database';
        var databaseDescription = (importFromDbInfo) ? `${importFromDbInfo.name} (${importFromDbInfo.url})` : 'Unknown database';
        var modelMetadata = getModelMetadata();
        var now = new Date();
        modelMetadata.title = `Import from ${databaseTitle} (${now.toLocaleString()})`;
        modelMetadata.description = `Imported using ${cypherFunction} from ${databaseDescription}`;
        now = now.getTime().toString();
        modelMetadata.dateCreated = now;
        modelMetadata.dateUpdated = now;
        modelMetadata.userRole = USER_ROLE.OWNER;
        modelMetadata.userIsCreator = true;
        modelMetadata.isPublic = false;
        return modelMetadata;
    }

    getImportDataModel = (importModelObject, cypherFunction, importFromDbInfo) => {
        var { modelMetadataMap } = this.state;
        var doLayoutOnFinish = false;
        // validate model first
        // TODO: do more validation
        // generate a new key for the imported model
        var dataModel;
        var modelMetadata = {};
        if (cypherFunction) {
            modelMetadata = this.getDbSchemaModelMetadata(cypherFunction, importFromDbInfo);
            if (cypherFunction === 'apoc.meta.schema') {
                dataModel = getDataModelFromApocMetaSchema(importModelObject);
            } else if (cypherFunction === 'db.schema.visualization') {
                dataModel = getDataModelFromRawDbSchema(importModelObject);
            }
        } else if (importModelObject.metadata) {
            if (isFeatureLicensed(FEATURES.MODEL.ImportModel)) {
                modelMetadata = { ...importModelObject.metadata };
                modelMetadata = convertMetadataToCurrentVersion(modelMetadata);
                modelMetadata.key = getModelMetadata().key;
                var now = new Date().getTime().toString();
                modelMetadata.dateCreated = now;
                modelMetadata.dateUpdated = now;
                modelMetadata.userRole = USER_ROLE.OWNER;
                modelMetadata.userIsCreator = true;
                modelMetadata.isPublic = false;
                dataModel = DataModel();
                if (importModelObject.dataModel) {
                    dataModel.fromSaveObject(importModelObject.dataModel);
                } else {
                    throw new Error("Expected a field called 'dataModel'");
                }
            } else {
                throw new Error(`Not licensed to import from ${getAppName()} format`);
            }
        } else if (importModelObject.graph || (importModelObject.nodes && importModelObject.relationships)) {
            if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromArrows)) {
                // arrows
                modelMetadata = getModelMetadata();
                var now = new Date();
                modelMetadata.title = 'Import from Arrows (' + now.toLocaleString() + ')';
                now = now.getTime().toString();
                modelMetadata.dateCreated = now;
                modelMetadata.dateUpdated = now;
                modelMetadata.userRole = USER_ROLE.OWNER;
                modelMetadata.userIsCreator = true;
                modelMetadata.isPublic = false;
                dataModel = getDataModelFromArrows(importModelObject, this.getDataModelCanvas().getCanvasDimensions());
            } else {
                throw new Error('Not licensed to import from https://neo4j-arrows.appspot.com/');
            }
        } else {
            // check for apoc.meta.schema pasted in
            if (Object.values(importModelObject).filter(x => x.type === 'node').length > 0) {
                // it is apoc.meta.schema
                if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromApoc)) {
                    modelMetadata = this.getDbSchemaModelMetadata('apoc.meta.schema');
                    dataModel = getDataModelFromApocMetaSchema(importModelObject, { importFromJsonDirectly: true });
                    // TODO: make optional!!
                    //runSecondaryNodeLabelPostProcessing(dataModel);            
                    doLayoutOnFinish = true;
                } else {
                    throw new Error('Not licensed to import apoc.meta.schema');
                }
            } else {
                throw new Error("Invalid import format");
            }
        }

        return {
            dataModel: dataModel,
            modelMetadata: modelMetadata,
            doLayoutOnFinish: doLayoutOnFinish
        }
    }

    saveImportModel = (modelMetadata, dataModel, successCallback, errorCallback) => {
        // then save it
        this.setStatus('Saving...', {fullScreenBusy: true});
        saveRemoteDataModelWithFullMetadata(modelMetadata, dataModel, {}, (response) => {
            if (response.success) {
                this.setStatus('Saved.', false);
                dataModel.setIsRemotelyPersisted(true);
                //dataModel.resetDataChangeFlags();
                this.loadModel(modelMetadata, false, successCallback);
            } else {
                this.setStatus(response.error, false);
                alert(response.error);
                errorCallback(response.error);
            }
        });
    }

    importModel = () => {
        var importModelJSON = this.state.importExportDialog.text;
        try {
            var importModelObject = JSON.parse(importModelJSON);
            var { modelMetadata, dataModel, doLayoutOnFinish } = this.getImportDataModel(importModelObject);
            this.saveImportModel(modelMetadata, dataModel, () => {
                this.closeImportExportDialog();
                if (doLayoutOnFinish) {
                    this.layoutAfterImport();
                }
            }, () => {
                this.closeImportExportDialog();
            });
        } catch (e) {
            alert(e);
        }
    }

    showImportModel () {

        var allowedFormats = [];
        if (isFeatureLicensed(FEATURES.MODEL.ImportModel)) { allowedFormats.push(getAppName()); }
        if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromArrows)) { allowedFormats.push('https://neo4j-arrows.appspot.com/'); }
        if (isFeatureLicensed(FEATURES.MODEL.ImportModelFromApoc)) { allowedFormats.push('apoc.meta.schema'); }
        var placeholder = `Paste model JSON here (allowed formats: ${allowedFormats.join(', ')})`

        this.setState({
            importExportDialog: {
                ...this.state.importExportDialog,
                open: true,
                title: 'Import Model',
                text: '',
                placeholder: placeholder,
                disableEditing: false,
                buttons: [{
                    text: 'Import',
                    onClick: (button, index) => this.importModel(),
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

    downloadTextAsFile = (text, fileName) => () => {
        var dataUrl = "data:text/json;charset=utf-8," + encodeURIComponent(text);
        downloadUrlAsFile(dataUrl, fileName);
    }

    saveShare = () => {
        var { activeModelKey, modelMetadataMap, shareDialog  } = this.state;
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
        modelMetadataMap[activeModelKey].isPublic = shareDialog.isPublic;
        this.setState({
            modelMetadataMap: modelMetadataMap
        });
        this.setStatus('Saving...', {fullScreenBusy: true});
        updateUserRoles (activeModelKey, shareDialog.isPublic, userRoles, (response) => {
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
        var { activeModelKey, modelMetadataMap, shareDialog } = this.state;
        this.setStatus('Loading...', true);
        getUserRolesForDataModel(activeModelKey, (response) => {
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
                        isPublic: modelMetadataMap[activeModelKey].isPublic
                    }
                }/*, () => {
                    this.shareDialogRef.current.focusTextBox();
                }*/)
            } else {
                var errorStr = '' + response.error;
                if (errorStr.match(/Network error/)) {
                    this.persistenceHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
                }
                alert(response.error);
            }
        });
    }

    showSaveAs () {
        this.setState({
            saveAsDialog: {
                ...this.state.saveAsDialog,
                open: true,
                title: 'Clone Model As',
                text: '',
                placeholder: 'New Model Name',
                buttons: [{
                    text: 'Save',
                    onClick: (button, index) => {
                        var text = this.state.saveAsDialog.text;
                        if (!text) {
                            alert('Please enter a Model Name', ALERT_TYPES.WARNING);
                        } else {
                            this.saveAsNewModel();
                        }
                    },
                    autofocus: true
                },{
                    text: 'Cancel',
                    onClick: (button, index) => this.closeSaveAsDialog(),
                    autofocus: false
                }]
            }
        }, () => {
            this.saveAsDialogRef.current.focusTextBox();
        });
    }

    showParseCypher () {
        this.setState({
            parseDialog: {
                ...this.state.parseDialog,
                open: true,
                title: 'Parse',
                text: '',
                placeholder: 'Paste contents here',
                buttons: [{
                    text: 'Parse Cypher',
                    onClick: (button, index) => this.parseCypher(),
                    autofocus: true
                },/*{
                    text: 'Parse Triples',
                    onClick: (button, index) => this.parseTriples(),
                    autofocus: true
                },{
                    text: 'Parse Graph Gist',
                    onClick: (button, index) => this.parseGraphGist(),
                    autofocus: true
                },*/{
                    text: 'Cancel',
                    onClick: (button, index) => this.closeParseDialog(),
                    autofocus: false
                }]
            }
        }, () => {
            this.parseDialogRef.current.focusTextBox();
        });
    }

    getExportFileName (defaultName, extension, fileNamePostfix) {
        fileNamePostfix = (fileNamePostfix) ? fileNamePostfix : '';
        var title = this.getTitle();
        var fileName = title.replace(/[^A-Za-z0-9_]/g,'_')
        fileName = (fileName) ? `${fileName}${fileNamePostfix}.${extension}` : `${defaultName}.${extension}`;
        return fileName;
    }

    showExportModel () {
        var modelJson = this.getExportData();
        var fileName = this.getExportFileName('cw_export', 'json');
        this.showExportText('Export Model', modelJson, fileName);
    }

    showExportLLMModel () {
        var modelJson = this.getExportData();
        var fileName = this.getExportFileName('cw_export', 'json');
        this.showExportText('Export Model', modelJson, fileName);
    }

    getExportData = () => {
        var metadata = { ...this.state.loadedModelMetadata };
        const dataModel = this.state.dataModel;
        var exportData = getExportData(metadata, dataModel);
        var modelJson = JSON.stringify(exportData, null, 2);
        return modelJson;
    }

    parseCypher = () => {
        var cypher = this.state.parseDialog.text;
        /*
        this.newModel(() => {
            parseCypher(cypher, this.state.dataModel);
            var dataModelCanvas = this.getDataModelCanvas();
            dataModelCanvas.renderDataModel();
            dataModelCanvas.doForceLayout();
            this.closeParseDialog();
        });
        */
        var { dataModel } = this.state;

        var currentLockMap = {};
        var existingNodes = dataModel.getNodeLabelArray();
        existingNodes.map(x => {
            currentLockMap[x.key] = x.display.isLocked; // store current isLocked value
            x.display.isLocked = true;                  // lock it so when we do dagre layout we don't reposition everything
        });

        var result = parseCypher(cypher, dataModel);
        if (result.success) {
            var dataModelCanvas = this.getDataModelCanvas();
            dataModelCanvas.renderDataModel();
            dataModelCanvas.doDagreLayout();

            this.closeParseDialog();
            this.dataModelChangeListener({
            	dataChangeType: dataModel.DataChangeType.AddOrUpdateNodeLabel
            });
        } else {
            alert(result.message);
        }
        existingNodes.map(x => x.display.isLocked = currentLockMap[x.key]);
    }

    parseTriples = () => {
        var text = this.state.parseDialog.text;
        //console.log("parse triples");
        //console.log(text);
        this.closeParseDialog();
    }

    parseGraphGist = () => {
        var text = this.state.parseDialog.text;
        //console.log("parse graph gist");
        //console.log(text);
        this.closeParseDialog();
    }

    // https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an
    saveSvg (svg, name) {
        //get svg source.
        var serializer = new XMLSerializer();
        var source = serializer.serializeToString(svg);

        //add name spaces.
        if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        //add xml declaration
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

        //convert svg source to URI data scheme.
        var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

        //set url value to a element's href attribute.
        downloadUrlAsFile(url, name);
    }

    tabDeactivated = () => {
        // TODO
    }

    handleActionRequest = (actionRequest) => {
        if (actionRequest) {
            switch (actionRequest.action) {
                case MODEL_ACTIONS.IMPORT_DATABASE_MODEL:
                    this.importFromDatabaseMenuItem();
                    break;
            }
        }
    }

    tryToGoOnline = () => this.persistenceHelper.tryToGoOnline();

    tabDeactivated = () => {
        console.log('Model tool is deactivated');
    }

    tabActivated = (properties) => {
        properties = properties || {};
        this.props.setTitle(this.getTitle());
        this.props.setMenus(this.getMenus(), () => {
            var userInfo = getAuth().getLoggedInUserInfo();
            getUserSettings(userInfo.email, (result) => {
                if (result.success) {
                    this.setState({
                        userSettings: result.userSettings
                    })
                    this.handleUserSettings(result.userSettings);
                    if (this.modelLayoutSettingsRef.current) {
                        console.log('setting menu items checkmarks via ref')
                        this.modelLayoutSettingsRef.current.setUserSettings(result.userSettings);
                    }
                    if (this.modelRelationshipLayoutSettingsRef.current) {
                        this.modelRelationshipLayoutSettingsRef.current.setUserSettings(result.userSettings);
                    }
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

        var { urlParamsId } = properties;
        let urlParamsArray = (urlParamsId) ? [urlParamsId] : [];
        this.persistenceHelper.getModelMetadataMapAndAddExplicitMatches(urlParamsArray, () => {
            var { modelMetadataMap } = this.state;
            //var localDataModelString = localStorage.getItem('localDataModel');
            var localDataModelString = this.persistenceHelper.getLocalStorageDataModelString();
            if (localDataModelString) {
                this.persistenceHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
                // need to pull stuff from local storage and set the state appropriately
                //  just as if we had loaded it from the database
                var localDataModel = JSON.parse(localDataModelString);
                var { message, modelMetadata, dataModel } = localDataModel;
                //dataModel = JSON.parse(dataModel);
                /*
                this.setActiveDataModel(modelMetadata, dataModel, true, () => {
                    this.tryToGoOnline();
                });*/
                this.persistenceHelper.tryToGoOnline();
            } else {
                var { componentLoadedAlready, modelMetadataMap } = this.state;
                if (!componentLoadedAlready && urlParamsId && modelMetadataMap[urlParamsId]) {
                    var modelInfo = modelMetadataMap[urlParamsId];
                    this.setState({
                        componentLoadedAlready: true,
                        urlParamsId: urlParamsId
                    });
                    this.loadModel(modelInfo);
                } else {
                    if (!componentLoadedAlready && urlParamsId) {
                        alert('No permission or model does not exist for id ' + urlParamsId, ALERT_TYPES.WARNING);
                    }
                    loadLastOpenedModel((dataModelResponse) => {
                        try {
                            //console.log(dataModelResponse);
                            if (dataModelResponse.success === false) {
                                //console.log(dataModelResponse);
                                //this.newModel();
                            } else {
                                var modelInfo = modelMetadataMap[dataModelResponse.key];
                                if (modelInfo) {
                                    modelInfo.viewSettings = dataModelResponse.metadata.viewSettings;
                                    this.setActiveDataModel(modelInfo, dataModelResponse, false);
                                } else {
                                    //this.newModel();
                                }
                            }
                        } catch (e) {
                            alert('Error opening model: ' + e.message);
                            console.log(e);
                        }
                    });
                }
            }
        });
        /*
        if (this.canvasRef.current) {
            this.canvasRef.current.updateDimensions();
        }
        */
        this.setDataModelCanvasSize();
    }

    saveUserSettings = (userSettings) => {
        if (userSettings) {
            console.log('userSettings');
            console.log(userSettings);
            this.setState({
                userSettings: {
                    ...this.state.userSettings,
                    ...userSettings
                }
            });
            var saveObj = {
                email: getAuth().getLoggedInUserInfo().email,
                ...userSettings
            }
            this.handleUserSettings(saveObj);
            updateUserSettings(saveObj, (result) => {
                if (!result.success) {
                    alert("Error saving: " + result.error);
                }
            });
        }
    }

    handleUserSettings = (userSettings) => {
        if (userSettings && userSettings.canvasSettings) {
            var { canvasSettings } = userSettings;
            console.log('handleUserSettings canvasSettings');
            console.log(canvasSettings);
            var maxTries = 5;
            var tryNum = 1;

            var applySettings = () => {
                if (this.getDataModelCanvas() !== null) {
                    //console.log('setSnapToGrid: ' + canvasSettings.snapToGrid);
                    this.getDataModelCanvas().setSnapToGrid(canvasSettings.snapToGrid);
                    var showArrows = (typeof(canvasSettings.showArrows) === 'boolean') ? canvasSettings.showArrows : true;
                    this.getDataModelCanvas().setShowArrows(showArrows);
                    if (this.setArrowsSetChecked) {
                        this.setArrowsSetChecked(showArrows);
                    }
                    this.getDataModelCanvas().setDisplayAnnotations(canvasSettings.displayAnnotations);
                    this.getDataModelCanvas().setRelationshipDisplay(canvasSettings.relationshipDisplay);
                    this.getDataModelCanvas().setSecondaryNodeLabelDisplay(canvasSettings.displaySecondaryNodeLabels);
                    if (canvasSettings.showGrid) {
                        //console.log('showGrid');
                        this.getDataModelCanvas().showGrid();
                    } else {
                        //console.log('hideGrid');
                        this.getDataModelCanvas().hideGrid();
                    }
                } else {
                    // waiting for this.getDataModelCanvas() to not be null
                    if (tryNum <= maxTries) {
                        tryNum++;
                        setTimeout(applySettings, 150);
                    }
                }
            }
            applySettings();
        }
    }

    handleSaveDialogClose = () => {
        var { loadedModelMetadata, cancelModelMetadata, saveModelFormMode, activeModelKey } = this.state;
        if (saveModelFormMode === SAVE_MODE.NEW || saveModelFormMode === SAVE_MODE.TOTALLY_NEW) {
            loadedModelMetadata = cancelModelMetadata;
        }
        this.setState({
            showSaveDialog: false,
            loadedModelMetadata: loadedModelMetadata
        }, () => {
            /*
            if (!activeModelKey) {
                this.showLoadModelDialog();
            }
            */
        });
    }

    handleLoadDialogClose = () => {
        var { activeModelKey } = this.state;
        this.setState({
            showLoadDialog: false
        }, () => {
            /*
            if (!activeModelKey) {
                this.newModel();
            }
            */
        });
    }

    newModel = () => {
        var { modelMetadataMap, loadedModelMetadata } = this.state;
        var cancelModelMetadata = JSON.parse(JSON.stringify(loadedModelMetadata));

        var newModelMetadata = getModelMetadata();
        var deepMetadataCopy = JSON.parse(JSON.stringify(newModelMetadata));
        var saveModelFormMode = (Object.keys(modelMetadataMap).length > 0) ? SAVE_MODE.NEW : SAVE_MODE.TOTALLY_NEW;

        this.setState({
            urlParamsId: '',
            saveModelFormMode: saveModelFormMode,
            cancelModelMetadata: cancelModelMetadata,
            loadedModelMetadata: newModelMetadata,
            editModelMetadata: deepMetadataCopy,
            showSaveDialog: true
        }, () => {
            if (saveModelFormMode === SAVE_MODE.TOTALLY_NEW) {
                this.props.setTitle(this.getTitle());
            }
            this.saveModelFormRef.current.focusTextBox();
            this.addToWebHistory(newModelMetadata);
            //if (callback) { callback() };
        });
    }

    getTitle = (modelInfo) => {

        if (!modelInfo) {
            modelInfo = this.state.loadedModelMetadata;
        }

        var modelTitle = '';
        if (modelInfo) {
            modelTitle = (modelInfo.title) ? modelInfo.title : 'Untitled';
        } else {
            modelTitle = 'New Model';
        }
        //return 'Model: ' + modelTitle;
        return modelTitle;
    }

    recordModelMetadataChanges = (key, value) => {
        var { editModelMetadata } = this.state;
        this.setState({
            editModelMetadata: {
                ...editModelMetadata,
                [key]: value
            }
        })
    }

    resetDataModelAndCanvas = () => {
        var dataModel = this.getDataModel();
        this.canvasRef.current.resetCanvas();
        this.setDataModel(dataModel);
        this.resetValidateDataModel();
        this.resetDataExport();
        //this.getDataModelCanvas().createNewNodeLabel();
        return dataModel;
    }

    showBusy = ({busy}) => {
        this.setState({
            fullScreenBusyIndicator: busy
        });
    }

    saveModel = () => {
        var { loadedModelMetadata, editModelMetadata, saveModelFormMode, dataModel } = this.state;
        var { activeModelKey } = this.state;
        var previousState = JSON.parse(JSON.stringify(loadedModelMetadata));    // deep copy

        if (saveModelFormMode === SAVE_MODE.TOTALLY_NEW || saveModelFormMode === SAVE_MODE.NEW) {
            dataModel = this.resetDataModelAndCanvas();
            SecurityRole.setRole(USER_ROLE.OWNER);
        }

        this.setState({
            loadedModelMetadata: {
                ...editModelMetadata,
                dateCreated: (editModelMetadata.dateCreated) ? editModelMetadata.dateCreated : new Date().getTime().toString(),
                dateUpdated: new Date().getTime().toString(),
                viewSettings: {
                    canvasViewSettings: this.getDataModelCanvas().getViewSettings()
                }
            },
            activeModelKey: editModelMetadata.key,
            dataModel: dataModel,
            isInstanceModel: dataModel.isInstanceModel()
        }, () => {
            var { loadedModelMetadata } = this.state;
            this.saveRemoteModelMetadata(loadedModelMetadata, previousState, {
                mode: saveModelFormMode,
                previousActiveKey: activeModelKey
              });
        });
    }

    saveRemoteModelMetadata = (loadedModelMetadata, previousState, { mode, previousActiveKey }) => {
        this.setStatus('Saving...', {fullScreenBusy: true});
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
                if (
                    mode === SAVE_MODE.TOTALLY_NEW ||
                    mode === SAVE_MODE.NEW
                  ) {
                    this.setState({
                      showSaveDialog: false,
                    });
                    this.loadModel(this.state.modelMetadataMap[previousActiveKey]);
                  }
            } else {
                this.setState({
                    modelMetadataMap: {
                        ...this.state.modelMetadataMap,
                        [loadedModelMetadata.key]: loadedModelMetadata
                    },
                    showSaveDialog: false
                });
                this.props.setTitle(this.getTitle(loadedModelMetadata));
                this.setStatus('Saved.', false);
            }
        });
    }

    saveLocalModel = (loadedModelMetadata) => {
        saveLocalDataModel(loadedModelMetadata, this.state.dataModel);
        this.setState({
            modelMetadataMap: loadLocalDataModelMetadata(),
            showSaveDialog: false
        });
        this.props.setTitle(this.getTitle(loadedModelMetadata));
    }

    deleteModel = (modelKey, successCallback) => {
        //console.log("deleteModel: " + modelKey);
        this.deleteRemoteModel(modelKey, successCallback);
    }

    deleteLocalModel = (modelKey) => {
        var { modelMetadataMap } = this.state;
        delete modelMetadataMap[modelKey];
        deleteLocalDataModel(modelKey);
        this.setState({
            modelMetadataMap: modelMetadataMap
        });
        /*
        if (this.state.loadedModelMetadata && this.state.loadedModelMetadata.key === modelKey) {
            this.newModel();
        }
        */
    }

    deleteRemoteModel = (modelKey, successCallback) => {
        var { dataModel, modelMetadataMap, loadedModelMetadata, activeModelKey } = this.state;
        this.setStatus('Deleting...', {fullScreenBusy: true});
        deleteRemoteDataModel(modelKey, (response) => {
            if (response.success) {
                this.setStatus('Deleted.', false);
                delete modelMetadataMap[modelKey];
                if (loadedModelMetadata && loadedModelMetadata.key === modelKey) {
                    // we have deleted the currently active model, therefore we must set activeModelKey to ''
                    dataModel = this.resetDataModelAndCanvas();
                    activeModelKey = '';
                    loadedModelMetadata = getModelMetadata();
                }

                this.setState({
                    activeModelKey: activeModelKey,
                    modelMetadataMap: modelMetadataMap,
                    loadedModelMetadata: loadedModelMetadata,
                    dataModel: dataModel,
                    isInstanceModel: dataModel.isInstanceModel()
                }, () => {
                    this.props.setTitle(this.getTitle());
                });
                /*
                if (this.state.loadedModelMetadata && this.state.loadedModelMetadata.key === modelKey) {
                    this.newModel();
                }*/
                if (successCallback) {
                    successCallback();
                }
            } else {
                if (response.error.message.match(/Failed to invoke procedure `apoc.util.validate`: Caused by: java.lang.RuntimeException: locked by user/)) {
                    var actions = [
                        {
                            text: 'Grab lock and Delete',
                            onClick: (button, index) => {
                                this.setStatus("Grabbing lock", true);
                                grabModelLock(modelKey, (response) => {
                                    if (response.success) {
                                        console.log('deleting model after lock grant');
                                        alert('Lock grabbed. Deleting model.', ALERT_TYPES.INFO);
                                        this.deleteRemoteModel(modelKey, successCallback);
                                    } else {
                                        this.setStatus(response.error, false);
                                        alert(response.error);
                                    }
                                    this.closeGeneralDialog();
                                });
                            },
                            autofocus: false
                        }/*,
                        {
                            text: 'Cancel',
                            onClick: (button, index) => this.closeGeneralDialog(),
                            autofocus: true
                        }*/
                    ];
                    this.persistenceHelper.handleLockedModel(response.error.message, actions);
                } else {
                    this.setStatus(response.error, false);
                    alert(response.error);
                }
            }
        });
    }

    setModelMetadataMap = (modelMetadataMap) => {
        this.setState({
            modelMetadataMap: modelMetadataMap
        });
    }

    loadLocalModel = (modelInfo) => {
        //console.log('Model: loadLocalModel: ' + JSON.stringify(modelInfo));
        var dataModelJSON = getLocalDataModelJSON(modelInfo.key);
        //console.log(dataModelJSON);
        var dataModel = this.getDataModel();
        dataModel.fromJSON(dataModelJSON);
        this.finishLoadingModel(modelInfo, dataModel);
    }

    loadRemoteModel = (modelInfo, dontPushWebHistory, callback) => {
        this.setStatus('Loading Model...', {fullScreenBusy: true});
        if (modelInfo && modelInfo.key) {
            loadRemoteDataModel(modelInfo.key, true, (dataModelResponse) => {
                //console.log(dataModelResponse);
                if (dataModelResponse.success === false) {
                    var message = "Error loading model: " + dataModelResponse.error;
                    this.setStatus(message, false);
                    alert(message);
                } else {
                    this.setStatus('', false);
                    modelInfo.viewSettings = dataModelResponse.metadata.viewSettings;
                    var dataModel = this.getDataModel();
                    dataModel.fromSaveObject(dataModelResponse);
                    //console.log(1);
                    dataModel.setIsRemotelyPersisted(true);
                    //console.log(1);
                    this.finishLoadingModel(modelInfo, dataModel, dontPushWebHistory, callback);
                    //console.log(1);
                }
            })
        } else {
            alert('Unable to load model, the specified model may not exist');
        }
    }

    addToWebHistory = (modelInfo) => {
        var url = `/tools/${TOOL_NAMES.MODEL}/${modelInfo.key}`;
        var title = `${modelInfo.title}`;
        console.log(`adding ${url} to history`);
        window.history.pushState({tool: TOOL_NAMES.MODEL, modelKey: modelInfo.key}, title, url);
    }

    setActiveDataModel = (modelInfo, dataModelObj, keepDataChangeFlags, callback) => {
        var dataModel = this.getDataModel();
        dataModel.fromSaveObject(dataModelObj, keepDataChangeFlags);
        dataModel.setIsRemotelyPersisted(true);
        this.finishLoadingModel(modelInfo, dataModel, false, callback);
    }

    setDataModel (dataModel) {
        const { editHelper } = this.state;
        this.getDataModelCanvas().setDataModel(dataModel);
        editHelper.setDataModel(dataModel);
    }

    handleViewSettings = (viewSettings) => {
        viewSettings = viewSettings || {};
        var {
          rightDrawerOpen,
          rightDrawerOpenWidth,
          destinationTabIndex,
          exportSettings
        } = viewSettings;
    
        rightDrawerOpen = rightDrawerOpen !== undefined ? rightDrawerOpen : false;

        destinationTabIndex = destinationTabIndex !== undefined && this.isDataExportEnabled()
            ? destinationTabIndex : TabIndexes.Validation;
    
        rightDrawerOpenWidth =
          rightDrawerOpenWidth !== undefined
            ? rightDrawerOpenWidth
            : Sizes.DefaultRightDrawerWidth;
    
        var updateStateObject = {
          rightDrawerOpen,
          rightDrawerOpenWidth,
          destinationTabIndex
        };

        if (this.dataExportRef.current) {
            this.dataExportRef.current.handleExportSettings(exportSettings);
        }
    
        this.setState(updateStateObject, () => this.resizePanelsOnLoad());
      };

    finishLoadingModel = (modelInfo, dataModel, dontPushWebHistory, callback) => {
        this.canvasRef.current.resetCanvas();
        this.resetDataExport();
        this.resetValidateDataModel();

        //console.log(2);
        this.setDataModel(dataModel);
        //console.log(2);
        var viewSettings = modelInfo.viewSettings;

        var parentContainerViewSettings = (viewSettings && viewSettings.parentContainerViewSettings) ? viewSettings.parentContainerViewSettings : {};
        this.handleViewSettings(parentContainerViewSettings);

        var canvasViewSettings = (viewSettings && viewSettings.canvasViewSettings) ? viewSettings.canvasViewSettings : {};
        //console.log("canvasViewSettings: " + JSON.stringify(canvasViewSettings));
        this.getDataModelCanvas().setViewSettings(canvasViewSettings);
        if (canvasViewSettings.scaleFactor && canvasViewSettings.scaleFactor != 1) {
            var scaleFactor = 100 * canvasViewSettings.scaleFactor;
            var howMuch = Math.round(Math.abs(100 - scaleFactor));
            if (scaleFactor > 100) {
                this.canvasRef.current.zoomIn(howMuch);
            } else {
                this.canvasRef.current.zoomOut(howMuch);
            }
        }
        //console.log(2);
        this.getDataModelCanvas().bringAllNodesToTop();
        //console.log(2);
        var userRole = modelInfo.userRole;
        if (modelInfo.isPublic && !userRole) {
            userRole = USER_ROLE.VIEWER;
        }

        if (!dontPushWebHistory) {
            this.addToWebHistory(modelInfo);
        }

        this.setState({
            dataModel: dataModel,
            loadedModelMetadata: modelInfo,
            showLoadDialog: false,
            activeModelKey: modelInfo.key,
            isInstanceModel: dataModel.isInstanceModel(),
            modelMetadataMap: {
                ...this.state.modelMetadataMap,
                [modelInfo.key]: modelInfo
            },
            urlParamsId: modelInfo.key
        });
        SecurityRole.setRole(userRole);
        this.props.setTitle(this.getTitle(modelInfo));
        if (callback) {
            //console.log(2.1);
            callback(modelInfo, dataModel);
            //console.log(2.1);
        }
    }

    loadModel = (modelInfo, dontPushWebHistory, callback) => {
        this.loadRemoteModel(modelInfo, dontPushWebHistory, callback);
    }

    isAModelSelected = () => {
        var { activeModelKey } = this.state;
        return (activeModelKey) ? true : false;
    }

    getViewSettings = () => {
        const {
            rightDrawerOpen,
            rightDrawerOpenWidth,
            destinationTabIndex,
        } = this.state;

        var exportSettings = {};
        if (this.dataExportRef.current) {
            exportSettings = this.dataExportRef.current.getExportSettings();
        }
    
        var settings = {
            rightDrawerOpen,
            rightDrawerOpenWidth,
            destinationTabIndex,
            exportSettings
        };
        return settings;
    }    

    getRightDrawerWidth = () => {
        const { rightDrawerOpen, rightDrawerOpenWidth } = this.state;
        return rightDrawerOpen ? rightDrawerOpenWidth : Sizes.RightTitleBarWidth;
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

      resizePanelsOnLoad = () => {
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
    
      drawerMouseMove = (e) => {
        if (this.drawerDrag.resizing) {
          const { drawer, currentX, currentY } = this.drawerDrag;
          if (drawer === Drawers.Right) {
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

      getCanvasWidth = () => {
        var canvasElement = document.getElementById(DomIds.ModelerCanvas);
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

      setDataModelCanvasSize = () => {
        if (this.canvasRef.current) {
          var currentSize = this.canvasRef.current.getCurrentDimensions();
          var newSize = {
            width: this.getCanvasWidth(),
            height: currentSize.height,
          }
          this.canvasRef.current.updateDimensions(newSize);
        }
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
            this.setDataModelCanvasSize();
        }
        );
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

      validationNodeLabelClickHandler = (nodeLabel) => {
        if (this.modelValidationRef.current) {
            this.modelValidationRef.current.setFilterValue(nodeLabel.label);
        }
      }

      validationRelationshipTypeClickHandler = (relationshipType) => {
        if (this.modelValidationRef.current) {
            this.modelValidationRef.current.setFilterValue(relationshipType.type);
        }
      }

      validateDataModel = () => {
        if (this.modelValidationRef.current) {
            var { dataModel } = this.state;
            this.changeDestinationTabIndex(null, TabIndexes.Validation);
            this.modelValidationRef.current.validateModel(dataModel);
            var dataModelCanvas = this.getDataModelCanvas();
            dataModelCanvas.setContainerNodeLabelClick(this.validationNodeLabelClickHandler);
            dataModelCanvas.setContainerRelationshipTypeClick(this.validationRelationshipTypeClickHandler);
        }    
      }

      highlightItems = ({nodeLabels, relationshipTypes}) => {
        this.getDataModelCanvas().removeAllSubgraphHighlights(HighlightClasses.HighlightNode, HighlightClasses.HighlightRel);
        var tempDataModel = DataModel();
        nodeLabels = nodeLabels || [];
        relationshipTypes = relationshipTypes || [];
        nodeLabels.map(nodeLabel => tempDataModel.addNodeLabel(nodeLabel));
        relationshipTypes.map(relationshipType => tempDataModel.addRelationshipType(relationshipType));
        this.getDataModelCanvas().highlightSubgraph(tempDataModel, HighlightClasses.HighlightNode, HighlightClasses.HighlightRel);
      }

      resetDataExport = () => {
          if (this.dataExportRef.current) {
            this.dataExportRef.current.reset();
          }
      }

      resetValidateDataModel = () => {
        if (this.modelValidationRef.current) {
            var { dataModel } = this.state;
            dataModel.getNodeLabelArray().map(nodeLabel => nodeLabel.display.removeAllGlyphs());
            dataModel.getRelationshipTypeArray().map(relationshipType => relationshipType.display.setGlyph(null));

            var dataModelCanvas = this.getDataModelCanvas();
            dataModelCanvas.removeAllSubgraphHighlights(HighlightClasses.HighlightNode, HighlightClasses.HighlightRel);
            dataModelCanvas.removeAllGlyphs();
            dataModelCanvas.setContainerNodeLabelClick(null);
            dataModelCanvas.setContainerRelationshipTypeClick(null);

            //dataModelCanvas.renderDataModel();

            this.modelValidationRef.current.reset();

            this.setState({
                validationMessage: 'Not validated',
                validationStatus: ValidationStatus.NotValidated
            })
        }    
      }

    isDataExportEnabled = () => {
        const enabled = getDynamicConfigValue('REACT_APP_MODEL_DATA_EXPORT_ENABLED');
        //console.log(`isDataExportEnabled: ${enabled}`);
        //console.log(`typeof isDataExportEnabled: ${typeof(enabled)}`);
        
        if (enabled === true) {
            return true;
        } else {
            return false;
        }
    }

    render() {
        var { modelInput, dataModel, loadedModelMetadata,
            showSaveDialog, showLoadDialog, saveModelFormMode,
            editModelMetadata, modelMetadataMap, importExportDialog, 
            exportConstraintsDialog, exportConstraintsString,
            exportCypherStatementDialog, exportCypherString, parseDialog,
            saveAsDialog, shareDialog, propertyDialog, generalDialog,
            relationshipCardinalityDialog, 
            rightDrawerOpen,
            //propertyContainer,
            status, activityIndicator, fullScreenBusyIndicator, 
            activeModelKey, editHelper, validationMessage, validationStatus,
            destinationTabIndex
         } = this.state;

        const dataExportEnabled = this.isDataExportEnabled();
        var roleText = "Role: " + SecurityRole.getRoleDisplay();
        var isPublic = (modelMetadataMap && modelMetadataMap[activeModelKey]) ? modelMetadataMap[activeModelKey].isPublic : false;
        roleText = (isPublic) ? roleText + ' (Public)' : roleText;
        activeModelKey = (activeModelKey) ? activeModelKey : '';
        const isInstanceModel = dataModel.isInstanceModel();
        var roleMarginRight = `${pxVal(this.getRightDrawerWidth()) + 10}px`;

        const placeholder = 'Enter NodeLabel, :NodeLabel :RELATIONSHIP :NodeLabel, or Cypher snippet and then <Enter>';
        return (
          <div style={{padding:'5px'}}
            onMouseMove={this.drawerMouseMove}
            onMouseUp={this.drawerMouseUp}
          >
            {this.isAModelSelected() ?
                <div>
                    <TextField name='modelInput' id="modelInput" label="Model Input" autoComplete="off"
                            inputRef={this.textFocus.ref}
                            value={modelInput} onChange={this.setValue} onKeyPress={this.handleModelInputKeyPress}
                            placeholder={placeholder} title={placeholder}
                            margin="dense" style={{marginRight: '.5em', width: '670px'}}/>
                    <OutlinedStyledButton onClick={this.addNewNodeLabel} color="primary">
                        <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> Node Label
                    </OutlinedStyledButton>
                    {isInstanceModel &&
                        <Tooltip enterDelay={600} arrow title="Models with duplicate Node Labels are denoted as Instance Models">
                            <Button style={{
                            background: 'darkcyan', 
                            color: 'white', 
                            height: '2em',
                            marginLeft: '.8em',
                            fontWeight: 600
                            }}>Instance Model</Button>
                        </Tooltip>
                    }
                </div>
                :
                <Typography style={{padding: '1em'}} variant="body1" color="inherit" noWrap>
                    <span>No Model Loaded. Select 
                    <span className='textMenuReference'> File &gt; New Model</span>, 
                    <span className='textMenuReference'> File &gt; Load Model</span>, or 
                    <span className='textMenuReference'> Import </span>
                    to get started.
                    </span>
                </Typography>
            }
            <Canvas ref={this.canvasRef} 
                dataModel={dataModel} 
                canvasDomId={DomIds.ModelerCanvas}
                canvasArrowDomId={DomIds.ModelerCanvasArrow}
                getWidth={this.getCanvasWidth}
                containerCallback={this.canvasCallback}
            />
            <div style={{ marginLeft: '0.5em', display: 'flex', justifyContent: 'space-between', flexFlow: 'row', alignItems: 'center'}}>
                <div>
                    <span style={{fontSize: '0.8em'}}>{status}</span>
                    {activityIndicator &&
                        <CircularProgress style={{marginLeft: '.2em', width:'12px',height:'12px'}} color="primary"/>
                    }
                </div>
                <div>
                     <span style={{marginRight: roleMarginRight, fontSize: '0.8em'}}>
                        {roleText}
                      </span>
                </div>
            </div>
            <div id="pixelEmHelper" style={{height: 0, width: 0, outline: "none",
                                          border:"none", padding: "none", margin: "none"}}/>

            {anyFeatureLicensed([
            FEATURES.MODEL.ValidateModel
            ]) &&
            <Drawer
                variant="permanent"
                anchor="right"
                onClose={() => {}}
                PaperProps={{
                    style: {
                    position: "absolute",
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
                            Validation and Data Export
                        </Typography>
                        <div style={{ flexGrow: 1 }} />
                    </div>
                    <div style={{display: rightDrawerOpen ? 'flex' : 'none', flexFlow: 'column', 
                            width: '100%',paddingRight: '0px', paddingLeft: '10px'}}>
                        <Tabs
                            orientation="horizontal"
                            variant="scrollable"
                            value={destinationTabIndex}
                            onChange={this.changeDestinationTabIndex}
                        >
                            <Tab label="Validation" />
                            {dataExportEnabled &&
                                <Tab label="Data Export" />
                            }
                        </Tabs>
                        <TabPanel value={destinationTabIndex} index={TabIndexes.Validation}>
                            <div style={{ padding: "10px", display: 'flex', flexFlow: 'row' }}>
                                <OutlinedStyledButton onClick={this.validateDataModel} color="primary"
                                        style={{height:'2em'}}>
                                    Validate
                                </OutlinedStyledButton>
                                <OutlinedStyledButton onClick={this.resetValidateDataModel} color="primary"
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
                            <div style={{overflowY: 'auto', paddingRight: '10px', height: 'calc(100vh - 180px)'}} >
                                <ModelValidation 
                                    ref={this.modelValidationRef}
                                    highlightItems={this.highlightItems}
                                    dataModel={dataModel}
                                    getDataModelCanvas={() => {
                                        //console.log('before data model canvas');
                                        var dataModelCanvas = this.getDataModelCanvas();
                                        //console.log('after data model canvas');
                                        return dataModelCanvas;
                                    }}
                                    setValidationInfo={(validationMessage, validationStatus) => {
                                        this.setState({
                                            validationMessage,
                                            validationStatus
                                        })
                                    }}
                                />
                            </div>
                        </TabPanel>
                        {dataExportEnabled &&
                            <TabPanel value={destinationTabIndex} index={TabIndexes.DataExport}>
                                <DataExport 
                                    ref={this.dataExportRef}
                                    dataModel={dataModel} 
                                    dataModelMetadata={loadedModelMetadata}
                                    activateTool={this.props.activateTool}
                                    parentContainer={this}
                                />
                            </TabPanel>
                        }
                    </div>
                </div>
            </Drawer>
            }
            <SaveModelForm maxWidth={'sm'} open={showSaveDialog} onClose={this.handleSaveDialogClose}
                ref={this.saveModelFormRef}
                save={this.saveModel} cancel={this.handleSaveDialogClose} mode={saveModelFormMode}
                modelInfo={ editModelMetadata } recordModelMetadataChanges={ this.recordModelMetadataChanges }/>
            <LoadModelForm maxWidth={'lg'} open={showLoadDialog} onClose={this.handleLoadDialogClose}
                load={this.loadModel} cancel={this.handleLoadDialogClose}
                deleteModel={this.deleteModel} performModelSearch={this.performModelSearch}
                modelMetadataMap={ modelMetadataMap } />
            <Sharing maxWith={'md'} open={shareDialog.open} onClose={shareDialog.handleClose}
                        setIsPublic={shareDialog.setIsPublic} isPublic={shareDialog.isPublic}
                        userRoles={shareDialog.userRoles} docKey={activeModelKey}
                        toolUri={'/tools/model/'}
                        upsertUser={shareDialog.upsertUser} removeUser={shareDialog.removeUser}
                        save={this.saveShare} ref={this.shareDialogRef} />
            <GeneralTextDialog maxWidth={'sm'} open={saveAsDialog.open} onClose={saveAsDialog.handleClose}
                        ref={this.saveAsDialogRef}
                        title={saveAsDialog.title} placeholder={saveAsDialog.placeholder}
                        text={saveAsDialog.text} setText={saveAsDialog.setText}
                        buttons={saveAsDialog.buttons} rows={1} />
            <GeneralTextDialog maxWidth={'md'} open={importExportDialog.open} onClose={importExportDialog.handleClose}
                        ref={this.importExportDialogRef}
                        htmlText={importExportDialog.htmlText}
                        htmlPreviewMode={importExportDialog.htmlPreviewMode}
                        disableEditing={importExportDialog.disableEditing}
                        title={importExportDialog.title} placeholder={importExportDialog.placeholder}
                        text={importExportDialog.text} setText={importExportDialog.setText}
                        buttons={importExportDialog.buttons} rows={15} />
            <GeneralTextDialogWithOptions maxWidth={'md'} open={exportConstraintsDialog.open} onClose={exportConstraintsDialog.handleClose}
                        ref={this.exportConstraintsRef}
                        htmlText={exportConstraintsDialog.htmlText}
                        htmlPreviewMode={exportConstraintsDialog.htmlPreviewMode}
                        disableEditing={exportConstraintsDialog.disableEditing}
                        title={exportConstraintsDialog.title} placeholder={exportConstraintsDialog.placeholder}
                        text={exportConstraintsString} setText={exportConstraintsDialog.setText}
                        buttons={exportConstraintsDialog.buttons} rows={15} 
                        defaultOptionValue={exportConstraintsDialog.defaultOptionValue}
                        optionsLabel="Neo4j Version: "
                        options={exportConstraintsDialog.options}
                        optionChanged={exportConstraintsDialog.optionChanged}
                        />
            <GeneralTextDialogWithOptions maxWidth={'md'} open={exportCypherStatementDialog.open} onClose={exportCypherStatementDialog.handleClose}
                        ref={this.exportCypherStatementRef}
                        htmlText={exportCypherStatementDialog.htmlText}
                        htmlPreviewMode={exportCypherStatementDialog.htmlPreviewMode}
                        disableEditing={exportCypherStatementDialog.disableEditing}
                        title={exportCypherStatementDialog.title} placeholder={exportCypherStatementDialog.placeholder}
                        text={exportCypherString} setText={exportCypherStatementDialog.setText}
                        buttons={exportCypherStatementDialog.buttons} rows={15} 
                        defaultOptionValue={exportCypherStatementDialog.defaultOptionValue}
                        options={exportCypherStatementDialog.options}
                        optionChanged={exportCypherStatementDialog.optionChanged}
                        />
            <GeneralTextDialog maxWidth={'md'} open={parseDialog.open} onClose={parseDialog.handleClose}
                        ref={this.parseDialogRef}
                        title={parseDialog.title} placeholder={parseDialog.placeholder}
                        text={parseDialog.text} setText={parseDialog.setText}
                        buttons={parseDialog.buttons} rows={15} />
            <PropertyDialog ref={this.propertyDialogRef}
                        editHelper={editHelper}
                        maxWidth={isFeatureLicensed(FEATURES.MODEL.PropertyConstraints) ? 'lg' : 'md'}
                        open={propertyDialog.open} onClose={propertyDialog.handleClose}
                        dataModel={dataModel}/>
            <RelationshipCardinalityDialog ref={this.relationshipCardinalityDialogRef} maxWidth={'sm'} open={relationshipCardinalityDialog.open}
                        onClose={relationshipCardinalityDialog.handleClose}
                        relationshipType={relationshipCardinalityDialog.relationshipType}/>
            <GeneralDialog open={generalDialog.open} onClose={generalDialog.handleClose}
                        title={generalDialog.title} description={generalDialog.description}
                        buttons={generalDialog.buttons} />
            <ModalVariableLabelsAndTypes 
                        ref={this.modalVariableLabelAndTypesRef}
                        editHelper={editHelper}/>
            <FullScreenWaitOverlay open={fullScreenBusyIndicator} setOpen={(open) => this.showBusy({busy: open})}/>
          </div>
        )
    }
}
