import React, { Component } from "react";

import { getAuth } from "../../auth/authUtil";
import { SaveForm, getMetadata } from "../common/edit/SaveForm";
import { CommunicationHelper } from "../common/communicationHelper";
import { PersistenceHelper } from "../common/persistenceHelper";

import {
  anyFeatureLicensed,
  isFeatureLicensed,
  showUpgradeLicenseMessage,
  showMaxReachedUpgradeLicenseMessage,
  FEATURES,
  TOOL_NAMES,
} from "../../common/LicensedFeatures";

import { getDynamicConfigValue } from '../../dynamicConfig';

const TOOL_HUMAN_NAME = "Project";
const DOCUMENT_NAME = "Project";
const NEW_DOCUMENT_TITLE = `New ${DOCUMENT_NAME}`;
const NEW_THING_NAME = "Project";

const DomIds = {
  Main: "main",
  Project: "Project"
};

const NO_ACTIVE_DOCUMENT_MESSAGE = `No ${TOOL_HUMAN_NAME} document is loaded. This option is unavailable when there is not an active document.`;

export default class Projects extends Component {

  GraphDocType = "Project";

  id = "project";

  /*
  projectDataProvider = new ProjectDataProvider({
    id: this.id,
    projectBuilder: this
  });
  */

  state = {
    loadedMetadata: getMetadata(NEW_DOCUMENT_TITLE)
  }

  constructor(props) {
    super(props);
    props.setSureRef(this);
    /*

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
    */
  }  

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

    /*
    var fileMenu = {
      id: "project-file",
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
    */

    var importMenuItems = [];
    if (
      anyFeatureLicensed([
        FEATURES.MODEL.ImportModel, // TODO: change this
      ])
    ) {
      importMenuItems.push({ id: "import", text: "Import Cypher Set" });
    }

    var importMenu = {
      id: "project-import",
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
      exportMenuItems.push({ id: "export", text: "Export Cypher Set" });
    }
    if (needExportDivider) {
      exportMenuItems.push({ id: "divider", text: "_" });
    }
    if (isFeatureLicensed(FEATURES.MODEL.ExportSVG)) {
      exportMenuItems.push({ id: "downloadSvg", text: "Download SVG" });
    }

    var exportMenu = {
      id: "project-export",
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


  tryToGoOnline = () => this.communicationHelper.tryToGoOnline();

  tabActivated = (properties) => {
    properties = properties || {};
    const { setTitle, setMenus } = this.props;
    setTitle(this.getTitle());
    setMenus(this.getMenus(), () => {
    });
  }

  render = () => {
    return (
      <div>Project stuff goes here</div>
    )
  }

}
