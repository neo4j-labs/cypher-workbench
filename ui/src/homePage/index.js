import React, { Component, Suspense, lazy } from 'react'
import { VERSION } from '../version';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { withStyles } from '@material-ui/styles';
import {
    AppBar,
    Box, Button,
    CircularProgress, CssBaseline, ClickAwayListener,
    Drawer, Divider,
    Fade,
    Icon, IconButton,
    Paper, Popper, Snackbar,
    Tabs, Tab, Typography, Toolbar, Tooltip, Zoom
} from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import { CloudDone, CloudOff, CloudQueue, Sync, Edit } from '@material-ui/icons';
import SettingsIcon from '@material-ui/icons/Settings';
import CloseIcon from '@material-ui/icons/Close';
import Alert from '@material-ui/lab/Alert';

import { doRedirect } from "../auth/history";
import NeoConnectionForm from './components/NeoConnectionForm';
import GeneralSelectDialog from '../components/common/GeneralSelectDialog';
import GeneralDialog from '../components/common/GeneralDialog';
import SettingsForm from './components/SettingsForm';
import Menu from '../components/menu/Menu';
//import Databases from '../tools/toolDatabases/Databases';

import {
    currentlyConnectedToNeo,
    getCurrentConnectionInfo,
    setShowNeoConnectionDialogRef,
    showNeoConnectionDialog
} from '../common/Cypher';
import { setUserKeys } from "../common/encryption"; 
import { getAuth, getAuthMethod } from "../auth/authUtil";
import { track } from "../common/util/tracking";

import { TabPanel } from '../components/common/Components';
import { ALERT_TYPES, COLORS } from '../common/Constants';
import {
    haveLicensedFeaturesBeenSet,
    isFeatureLicensed,
    setLicensedFeatures,
    FEATURES,
    TOOL_NAMES,
    LICENSE_TYPES,
    BASIC_FEATURES,
    LABS_FEATURES,
    ENTERPRISE_FEATURES
} from '../common/LicensedFeatures';
import { 
    getCurrentUser, 
    //getLicensedFeatures, 
    getLicenseInfo,
    updateUserPrimaryOrganization,    
    NETWORK_STATUS 
} from '../persistence/graphql/GraphQLPersistence';
import { getDynamicConfigValue, getAppName, getAppNameFontSize } from '../dynamicConfig';


const drawerWidth = 240;
var closedDrawerWidth = 0;

const Defaults = {
    LogoHeight: 30
  }
  
// this is because the logoheight is sized for Hive, we need to adjust it for this demo
const LogoHeightMultiplier = 28/36;

const getLogoHeight = (logoheight) => {
var returnVal = '';
if (logoheight && typeof(logoheight) === 'number') {
    returnVal = Math.floor(LogoHeightMultiplier * logoheight);
} else {
    returnVal = Defaults.LogoHeight
}
return `${returnVal}px`;
}

  
const styles = (theme) => {
    closedDrawerWidth = theme.spacing(7);
    return {
        root: {
            display: 'flex',
            height: '100%',
            overflow: 'hidden'
        },
        tabLabel: {
            alignItems: 'initial',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            marginLeft: '.8em'
        },
        labelSpan: {
            verticalAlign: 'top',
            marginLeft: '1em'
        },
        labelSpanHidden: {
            display: 'none',
        },
        toolbar: {
            paddingRight: 24, // keep right padding when drawer closed
        },
        toolbarIcon: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 8px',
            ...theme.mixins.toolbar,
        },
        appBar: {
            zIndex: theme.zIndex.drawer + 1,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        },
        appBarShift: {
            marginLeft: drawerWidth,
            width: `calc(100% - ${drawerWidth}px)`,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
        },
        menuButton: {
            marginRight: 0,
        },
        leftDrawerOpenButton: {
            marginRight: 24,
        },
        menuButtonFarRight: {
            marginRight: 36,
        },
        menuButtonHidden: {
            display: 'none',
        },
        toolbarButton: {
            color: 'white'
        },
        toolbarMenuItem: {
            fontSize: '1em',
            minWidth: '8em',
            minHeight: '0px'
        },
        title: {
            //width: '250px'
            minWidth: '13em', 
            maxWidth: '30em'            
            /* flexGrow: 1, */
        },
        drawerPaper: {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: drawerWidth,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
        },
        drawerPaperClose: {
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            width: closedDrawerWidth,
            [theme.breakpoints.up('sm')]: {
                width: theme.spacing(9),
            },
        },
        appBarSpacer: theme.mixins.toolbar,
        content: {
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
        },
        container: {
            paddingTop: theme.spacing(4),
            paddingBottom: theme.spacing(4),
        },
        divider: {
            width:'1px',
            height: '2em',
            marginLeft: '1em',
            marginRight: '1.5em',
            backgroundColor: 'white'
        },
        spacer: {
            flexGrow: 1
        },
        paper: {
            padding: theme.spacing(2),
            display: 'flex',
            overflow: 'auto',
            flexDirection: 'column',
        },
        fixedHeight: {
            height: 240,
        },
    }
};

const LightTooltip = withStyles((theme) => ({
    tooltip: {
      backgroundColor: 'yellow',
      color: 'rgba(0, 0, 0, 0.87)',
      boxShadow: theme.shadows[1]
    },
    // https://stackoverflow.com/questions/62666269/custom-styling-for-material-ui-tooltip-arrow
    arrow: {
        "&:before": {
          border: "1px solid #E6E8ED"
        },
        color: 'yellow'
      }
}))(Tooltip);

const LightDarkTooltip = (props) => {
    const { type, children, ...rest } = props;
    return (type === 'light') 
        ? <LightTooltip {...rest}>{children}</LightTooltip>
        : <Tooltip {...rest}>{children}</Tooltip>
}

const DEFAULT_DATABASE_ICON_SETTINGS = {
    databaseTooltipOpen: false,
    databaseTooltipMessage: 'Not Connected to Neo4j Database'
}

class Homepage extends Component {

  closeGeneralSelectDialog = () => {
        this.setState({ generalSelectDialog: { ...this.state.generalSelectDialog, open: false }});
  }

  state = {
      currentUser: {},
      open: false,
      activeTabIndex: 0,
      title: getAppName(),
      menus: [],
      timeLastSuccessfulSave: null,
      networkStatus: NETWORK_STATUS.ONLINE,
      networkOpen: false,
      settingsOpen: false,
      cloudIconAnchor: null,
      settingsIconAnchor: null,
      showNeoConnectionDialog: false,
      generalSelectDialog: {
        open: false,
        handleClose: this.closeGeneralSelectDialog,
        title: '',
        message: <span></span>,
        selectLabel: '',        
        selectOptions: [],
        buttons: []
      },
      generalDialog: {
        open: false,
        handleClose: this.closeGeneralDialog,
        title: '',
        isReactEl: false,
        description: '',
        buttons: []
      },
      databaseIconSettings: {
          ...DEFAULT_DATABASE_ICON_SETTINGS
      },
      alertMessage: {
          display: false,
          message: '',
          level: 'error',   /* error, warning, info, success */
          actions: [],
          vertical: 'top',
          horizontal: 'center',
          topMargin: '100px',
          bottomMargin: '0px',
          moreInfo: null,
          close: () => {
              this.setState({
                  alertMessage: {
                      ...this.state.alertMessage,
                      display: false
                  }
              })
          }
      }
  }

  showNeoConnectionDialog = (properties) => {
      if (this.neoConnectionRef.current) {
          this.neoConnectionRef.current.initializeConnectionDialog(properties);
      }
      this.setState({
          showNeoConnectionDialog: true
      });
  }

  constructor (props) {
      super(props);
      this.settingsRef = React.createRef();
      this.neoConnectionRef = React.createRef();
      this.generalSelectDialogRef = React.createRef();

      setShowNeoConnectionDialogRef(this.showNeoConnectionDialog);
  }

  sureRefs = {};

  setSureRef = (toolName) => (sureRef) => {
      //console.log('sure ref for toolName ' + toolName + ' is being set with ', sureRef);
      this.sureRefs[toolName] = sureRef;
  }

  getSureRef = (toolName) => (callback) => {
      var maxTimesToTry = 20;
      var timesTried = 0;
      var callWhenSet = (timeToWait) => {
          setTimeout(() => {
              const sureRef = this.sureRefs[toolName];
              if (sureRef) {
                  callback(sureRef);
              } else {
                  if (timesTried <= maxTimesToTry) {
                      callWhenSet(100);
                  } else {
                      console.log("Cannot call sureRef for tool '" + toolName + "'");
                  }
              }
              timesTried++;
          }, timeToWait);
      }
      callWhenSet(0);
  }

  /*
  getSureRef = (toolName) => () => {
      const sureRef = this.sureRefs[toolName];
      console.log('toolName sureRef is ', sureRef);
      return sureRef;
  }*/

  handleNeoConnectionFormClose = () => {
      this.setState({
          showNeoConnectionDialog: false
      });
  }

  tools = [
      /*
      {
        name: TOOL_NAMES.PROJECTS,
        //component: Scenarios,
        sureRef: this.getSureRef(TOOL_NAMES.PROJECTS),
        setSureRef: this.setSureRef(TOOL_NAMES.PROJECTS),
        tabHeader: { icon: 'fa fa-folder', title: 'Projects', paddingLeft: '.1em' }
      },*/
      {
        name: TOOL_NAMES.DATA_SCIENCE_DASHBOARD,
        sureRef: this.getSureRef(TOOL_NAMES.DATA_SCIENCE_DASHBOARD),
        setSureRef: this.setSureRef(TOOL_NAMES.DATA_SCIENCE_DASHBOARD),
        tabHeader: { icon: 'fa fa-flask', title: 'Data Science', paddingLeft: '.1em' }
      },
      {
        name: TOOL_NAMES.DATA_MAPPING,
        overflowY: 'hidden',
        sureRef: this.getSureRef(TOOL_NAMES.DATA_MAPPING),
        setSureRef: this.setSureRef(TOOL_NAMES.DATA_MAPPING),
        tabHeader: { icon: 'fa fa-stream', title: 'Data Mapping', paddingLeft: '.1em' }
      },
      {
        name: TOOL_NAMES.SCENARIOS,
        //component: Scenarios,
        sureRef: this.getSureRef(TOOL_NAMES.SCENARIOS),
        setSureRef: this.setSureRef(TOOL_NAMES.SCENARIOS),
        tabHeader: { icon: 'far fa-question-circle', title: 'Business Scenarios', paddingLeft: '.1em' }
      },
      {
        name: TOOL_NAMES.MODEL,
        //component: Model,
        sureRef: this.getSureRef(TOOL_NAMES.MODEL),
        setSureRef: this.setSureRef(TOOL_NAMES.MODEL),
        tabHeader: { icon: 'fa fa-project-diagram', title: 'Model', paddingLeft: '0em' }
      },
      {
        name: TOOL_NAMES.CYPHER_SUITE,
        sureRef: this.getSureRef(TOOL_NAMES.CYPHER_SUITE),
        setSureRef: this.setSureRef(TOOL_NAMES.CYPHER_SUITE),
        tabHeader: { icon: 'fa fa-code', title: 'Cypher Suite', paddingLeft: '0.15em' }
      },
      {
        name: TOOL_NAMES.CYPHER_BUILDER,
        sureRef: this.getSureRef(TOOL_NAMES.CYPHER_BUILDER),
        setSureRef: this.setSureRef(TOOL_NAMES.CYPHER_BUILDER),
        tabHeader: { icon: 'fa fa-marker', title: 'Cypher Builder', paddingLeft: '0.15em' }
      },
      /*
      {
        name: TOOL_NAMES.DASHBOARD,
        //component: lazy(() => import('../tools/toolDatabases/Databases.js')),
        sureRef: this.getSureRef(TOOL_NAMES.DASHBOARD),
        setSureRef: this.setSureRef(TOOL_NAMES.DASHBOARD),
        tabHeader: { icon: 'fa fa-chart-line', title: 'Dashboard', paddingLeft: '0.15em' }
      },*/
      {
        name: TOOL_NAMES.DATABASES,
        //component: lazy(() => import('../tools/toolDatabases/Databases.js')),
        sureRef: this.getSureRef(TOOL_NAMES.DATABASES),
        setSureRef: this.setSureRef(TOOL_NAMES.DATABASES),
        tabHeader: { icon: 'fa fa-database', title: 'Databases', paddingLeft: '0.15em' }
      }
  ];

  licensedTools = null;

  getToolsArray = () => {
      if (haveLicensedFeaturesBeenSet()) {
          if (this.licensedTools === null) {
              // initialize licensed tools
              // go through FEATURES by TOOL, if any feature is licensed, allow the tool
              var allowedToolKeys = Object.keys(FEATURES).filter(toolKey => {
                  var licensedToolFeatures = Object.values(FEATURES[toolKey]).filter(feature => isFeatureLicensed(feature));
                  return licensedToolFeatures.length > 0;
              })
              //var licensedTools = [TOOL_NAMES.MODEL, TOOL_NAMES.DATABASES];
              var licensedTools = allowedToolKeys.map(toolKey => TOOL_NAMES[toolKey]);
              console.log('licensedTools: ', licensedTools);
              this.licensedTools = this.tools.filter(tool => licensedTools.includes(tool.name));
              this.licensedTools.map(tool => {
                if (!tool.component) {
                    switch (tool.name) {
                        case TOOL_NAMES.MODEL:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolModel/Model'));
                            break;
                        case TOOL_NAMES.DATABASES:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolDatabases/Databases'));
                            break;
                        case TOOL_NAMES.DASHBOARD:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolDashboard/Dashboard'));
                            break;
                        case TOOL_NAMES.CYPHER_BUILDER:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            //tool.component = lazy(() => import('../tools/toolCypherBuilder/CypherBuilder'));
                            tool.component = lazy(() => import('../tools/toolCypherBuilder/CypherBuilderRefactor'));
                            break;
                        case TOOL_NAMES.CYPHER_SUITE:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            //tool.component = lazy(() => import('../tools/toolCypherBuilder/CypherBuilder'));
                            tool.component = lazy(() => import('../tools/toolCypherSuite/CypherSuite'));
                            break;
                        case TOOL_NAMES.SCENARIOS:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolScenarios/Scenarios'));
                            break;
                        case TOOL_NAMES.PROJECTS:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolProjects/Projects'));
                            break;
                        case TOOL_NAMES.DATA_SCIENCE_DASHBOARD:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolDataScienceDashboard/DataScienceDashboard'));
                            break;
                        case TOOL_NAMES.DATA_MAPPING:
                            // import must be passed a string, and not a variable, or else Webpack cannot find it
                            tool.component = lazy(() => import('../tools/toolDataMapping/DataMapping'));
                            break;
        
                    }
                }
              })
          }
          return this.licensedTools
      } else {
          return [];
      }
  }

  getTabIndexForToolName = (toolName) => {
    return this.getToolsArray().findIndex(tool => tool.name === toolName);
  }

  getActiveToolName = () => {
      const { activeTabIndex } = this.state;
      var activeTool = this.getToolsArray().find((tool, index) => index === activeTabIndex);
      return activeTool.name;
  }

  getToolByName = (toolName) => {
      return this.getToolsArray().find(tool => tool.name === toolName);
  }

  getToolByIndex = (index) => {
      return this.getToolsArray()[index];
  }

  isToolActive = (tabIndex) => {
      return (this.state.activeTabIndex === tabIndex);
  }

  closeGeneralDialog = () => {
    this.setState({ generalDialog: { ...this.state.generalDialog, open: false }});
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
            isReactEl: React.isValidElement(description)      
        }
    });
  }

  showDetailedMessage = (title, description) => {
    this.showGeneralDialog(title, description, [{
        text: 'OK',
        onClick: () => this.closeGeneralDialog(),
        autofocus: true
      }]
    );

  } 

  showDatabaseHelpMessage = (helpMessage) => {
    this.setState({
        databaseIconSettings: {
            databaseTooltipOpen: true,
            databaseTooltipMessage: helpMessage
        }
    });
  }  

  componentDidMount = async () => {
      // for online - double check they have accepted, if not - redirect them back to /terms

      var localUser = localStorage.getItem("user");            
      var primaryOrganizationRequiresEULA = true;
      if (localUser) {
        var userObj = JSON.parse(localUser);
        primaryOrganizationRequiresEULA = (userObj && userObj.primaryOrganizationRequiresEULA !== undefined) ? userObj.primaryOrganizationRequiresEULA : true;
      }

      if (getDynamicConfigValue("REACT_APP_EULA") === 'eula' && primaryOrganizationRequiresEULA) {
        if (getAuth().currentUserHasAcceptedEula && !getAuth().currentUserHasAcceptedEula()) {
            doRedirect("/terms", "index.js current user has not accepted eula")
        }
      }

      const tabIndexToActivate = this.state.activeTabIndex;
      window.alert = (message, level, uiConfig, detailedMessage) => {
          message = (typeof(message) === 'string') ? message : '' + message;
          level = (level) ? level : ALERT_TYPES.ERROR;
          uiConfig = (uiConfig) ? uiConfig : {};
          console.log(new Date() + ': alert: level: ' + level + ', message: ' + message);
          if (level === 'error') {
            try {
              throw new Error('stack trace');
            } catch (e) {
              console.log(e);
            }
          }
          const { alertMessage } = this.state;
          console.log(typeof(detailedMessage));
          console.log(detailedMessage);
          const moreInfo = (detailedMessage && typeof(detailedMessage) === 'string'
                                            || React.isValidElement(detailedMessage)) ? 
                () => {
                    alertMessage.close();
                    this.showDetailedMessage(message, detailedMessage);
                }: null;

          const customButton = (detailedMessage && typeof(detailedMessage) === 'object' 
                        && detailedMessage.onClick && detailedMessage.text) ? detailedMessage : null;

          this.setState({
              alertMessage: {
                  topMargin: '100px',
                  bottomMargin: '0px',
                  ...alertMessage,
                  ...uiConfig,
                  moreInfo: moreInfo,
                  customButton: customButton,
                  display: true,
                  message: message,
                  level: level
              }
          })
      }

      // TODO: need to replace things with window.performance for more precision and to eliminate clock resets via NNTP, etc
      //window.timestamp = () => window.performance ? performance.now() : new Date().getTime();

      window.showDatabaseHelpMessage = this.showDatabaseHelpMessage;

      window.addEventListener('popstate', (event) => {
          //console.log(event);
          //console.log(window.history.state);
          var state = window.history.state;
          if (state) {
              const modelToolIndex = this.getTabIndexForToolName(TOOL_NAMES.MODEL);
              if (state.tool === TOOL_NAMES.MODEL) {
                if (!this.isToolActive(modelToolIndex)) {
                    var properties = { index: modelToolIndex, urlParamsId: null, addHistory: false };                    
                    this.setStateAndActivateTab(properties, () => {
                        if (state.modelKey) {
                            console.log('activating modelKey (after activate): ' + state.modelKey)
                            //this.getToolByName(TOOL_NAMES.MODEL).sureRef().loadModelFromWebHistory(state.modelKey);
                            this.getToolByName(TOOL_NAMES.MODEL).sureRef(ref => ref.loadFromWebHistory(state.modelKey));
                        }
                    })
                } else {
                    if (state.modelKey) {
                        console.log('activating modelKey: ' + state.modelKey)
                        //this.getToolByName(TOOL_NAMES.MODEL).sureRef().loadModelFromWebHistory(state.modelKey);
                        this.getToolByName(TOOL_NAMES.MODEL).sureRef(ref => ref.loadFromWebHistory(state.modelKey));
                    }
                }
              } else if (state.tool === TOOL_NAMES.DATABASES) {
                const databaseToolIndex = this.getTabIndexForToolName(TOOL_NAMES.DATABASES);
                var properties = { index: databaseToolIndex, urlParamsId: null, addHistory: false };                    
                this.setStateAndActivateTab(properties);
              } else if (state.tool === TOOL_NAMES.DASHBOARD) {
                const dashboardToolIndex = this.getTabIndexForToolName(TOOL_NAMES.DASHBOARD);
                var properties = { index: dashboardToolIndex, urlParamsId: null, addHistory: false };                    
                this.setStateAndActivateTab(properties);
              }
          }
      }, false);

      this.initialize();
  }

  initialize = async () => {
      /*
    let licensedFeaturesResult = await getLicensedFeatures();
    if (licensedFeaturesResult.success) {
        console.log(licensedFeaturesResult.features);
        setLicensedFeatures(licensedFeaturesResult.features.map(x => x.name));
    } else {
        alert('Could not retrieve license information. Error: ' + licensedFeaturesResult.error);
    }*/
    var licenseInfo = await getLicenseInfo();
    if (licenseInfo.success) {
        licenseInfo = licenseInfo.licenseInfo;
        window.licenseInfo = licenseInfo;
        //console.log(licensedFeaturesResult.features);
        if (licenseInfo.type === LICENSE_TYPES.Basic) {
            setLicensedFeatures(BASIC_FEATURES);
        } else if (licenseInfo.type === LICENSE_TYPES.Labs) {
            setLicensedFeatures(LABS_FEATURES);            
        } else if (licenseInfo.type === LICENSE_TYPES.Enterprise || licenseInfo.type === LICENSE_TYPES.EnterpriseTrial) {
            setLicensedFeatures(ENTERPRISE_FEATURES);
        } else {
            setLicensedFeatures(licenseInfo.licensedFeatures.map(x => x.name));
        }
    } else {
        alert('Could not retrieve license information. Error: ' + licenseInfo.error);
    }

    let currentUserResult = await getCurrentUser();
    if (currentUserResult.success) {
        //console.log(currentUser.user);
        const { browserSymmetricKey, browserAsymmetricEncryptionKey } = currentUserResult.user;
        var userKeys = { browserSymmetricKey, browserAsymmetricEncryptionKey };
        //console.log('userKeys: ', userKeys);
        setUserKeys(userKeys);
        this.setState({
          currentUser: (currentUserResult.user) ? currentUserResult.user : {}
        });
    }

    var urlParams = this.getUrlParams();
    var queryParams = this.getQueryParams();
    if (urlParams && urlParams.tool) {
        var index = this.getTabIndexForToolName(urlParams.tool);
        if (index !== -1) {
            console.log(`activating ${urlParams.tool} (index ${index})`);
            var properties = { index, urlParamsId: urlParams.id, addHistory: true, queryParams: queryParams };
            this.setStateAndActivateTab(properties);
        } else {
            alert(`You are not licensed for tool '${urlParams.tool}' or tool does not exist`);
        }
    } else {
        var index = this.getTabIndexForToolName(TOOL_NAMES.MODEL);
        console.log(`activating model tool as default, index = ${index}`);
        var tools = this.getToolsArray();
        if (tools.length > 0) {
            var properties = { index, urlParamsId: urlParams.id, addHistory: true };
            this.setStateAndActivateTab(properties);
        } else {
            alert('There are no licensed tools');
        }
    }
  }

  setStateAndActivateTab = (properties, callback) => {
      var existingActiveTabIndex = this.state.activeTabIndex;
      var { index, urlParamsId, addHistory, queryParams } = properties;
      this.setState({
          activeTabIndex: index
      }, () => {
          this.deactivateTab(existingActiveTabIndex);
          this.activateTab(this.state.activeTabIndex, urlParamsId, queryParams);
          if (addHistory) {
              var toolName = this.getActiveToolName();
              toolName = (toolName) ? toolName : 'Unknown Tool';
              if (toolName !== TOOL_NAMES.MODEL) {
                  var upperToolName = toolName.substring(0,1).toUpperCase() + toolName.substring(1);
                  var url = `/tools/${toolName}`;
                  console.log(`adding ${url} to history`);
                  window.history.pushState({tool: toolName}, `${getAppName()} ${upperToolName}`, url);
              }
          }
          if (callback) callback();
      })
  }

  handleDrawerOpen = () => {
      this.setState({
          open: true,
          settingsOpen: false
      })
  };

  handleDrawerClose = () => {
      this.setState({
          open: false
      })
  };

  handleChange = (event, newValue) => {
      var properties = { index: newValue, urlParamsId: null, addHistory: true };
      this.setStateAndActivateTab(properties);
  };

  setTitle = (title) => {
      document.title = title;      
      this.setState({
          title: title
      })
  }

  helpMenu = {
          id: 'cypherworkbench-help',
          text: 'Help',
          handler: (menu, menuItem) => {
              switch (menuItem.id) {
                  case 'help':
                      var win = window.open(getDynamicConfigValue("REACT_APP_HELP_URL"), '_blank');
                      win.focus();
                      break;
                  default:
                      break;
              }
          },
          menuItems: [
              {id: 'help', text: 'Link to Help'}
          ]
  }

  setMenus = (menus, callback) => {
      if (menus) {
          menus = menus.slice();
          menus.push(this.helpMenu);

          this.setState({
              menus: menus
          }, () => {
              if (callback) {
                  callback();
              }
          })
      }
  }

  getLeftDrawerSize = () => {
    const { open } = this.state;
    return (open) ? drawerWidth : closedDrawerWidth + 15;
  }

  getNetworkStatus = () => (this.state) ? this.state.networkStatus : NETWORK_STATUS.OFFLINE;

  setNetworkStatus = (networkStatus) => {
      //console.log('setNetworkStatus:' + networkStatus);
      var stateProperties = {
        networkStatus: networkStatus,
      }
      if (networkStatus === NETWORK_STATUS.SAVED) {
        stateProperties.timeLastSuccessfulSave = new Date().toLocaleString()
      }
      this.setState(stateProperties)
  }

  goOnline = () => {
      if (this.state.networkStatus === NETWORK_STATUS.OFFLINE) {
          //this.getToolByName(TOOL_NAMES.MODEL).sureRef().tryToGoOnline();
          this.getToolByName(TOOL_NAMES.MODEL).sureRef(ref => ref.tryToGoOnline());
      }
  }

  otherToolActionRequest = (toolName, actionRequest) => {
      /*
      var tabIndex = this.getTabIndexForToolName(toolName);
      if (!this.isToolActive(tabIndex)) {
          this.setStateAndActivateTab(tabIndex, null, true, () => {
              this.getToolByIndex(tabIndex).sureRef().handleActionRequest(actionRequest);
          });
      }
      */
  }

  activateTool = (toolName) => {
    var tabIndex = this.getTabIndexForToolName(toolName);
    if (!this.isToolActive(tabIndex)) {
        var properties = { index: tabIndex, urlParamsId: null, addHistory: true };        
        this.setStateAndActivateTab(properties);
    }
}


  //requiredFunctions = ['tryToGoOnline', 'tabActivated', 'loadFromWebHistory'];
  requiredFunctions = ['tryToGoOnline', 'tabActivated'];

  confirmToolInterface = (activeTool, ref) => {
    const missingFuncs = this.requiredFunctions.filter(func => typeof(ref[func]) !== 'function');
    if (missingFuncs.length > 0) {
        alert(`Cannot activate tool ${activeTool.name}, implementation missing for functions ${missingFuncs.join(', ')}`);
        return false;
    } else {
        return true;
    }
  }

  activateTab = (activeTabIndex, urlParamsId, queryParams) => {
      var activeTool = this.getToolsArray()[activeTabIndex];
      //activeTool.sureRef().tabActivated();
      activeTool.sureRef(ref => {
          if (this.confirmToolInterface(activeTool, ref)) {
            ref.tabActivated({urlParamsId: urlParamsId, queryParams: queryParams})
            track("WORKBENCH_TAB_ACTIVATED", { 
                toolName: activeTool.name                
            });
          } 
      });
  };

  deactivateTab = (tabIndex) => {
    var tool = this.getToolsArray()[tabIndex];
    tool.sureRef(ref => {
        if (ref.tabDeactivated) {
            ref.tabDeactivated();
        } 
    });
  }

  handleConnect = (event) => {
      this.setState({
          cloudIconAnchor: event.currentTarget,
          networkOpen: !this.state.networkOpen
      })
  }

  handleSettings = (event) => {
      this.setState({
          settingsIconAnchor: event.currentTarget,
          settingsOpen: !this.state.settingsOpen
      });
  }

  closeNeoConnectionForm = () => {
      this.setState({
          networkOpen: false
      })
  }

  closeSettingsForm = () => {
      this.setState({
          settingsOpen: false
      })
  }

  logout = () => {
      getAuth().logout();
  }

  //const fixedHeightPaper = clsx(classes.paper, classes.fixedHeight);
  getNetworkIcon = () => {
      var { networkStatus } = this.state;
      var icon;
      switch (networkStatus) {
        case NETWORK_STATUS.OFFLINE:
            icon =
                <Tooltip enterDelay={600} arrow title="Offline. Click to Connect.">
                    <CloudOff />
                </Tooltip>
            break;
        case NETWORK_STATUS.UNSAVED:
            icon =
                <Tooltip enterDelay={600} arrow title="Unsaved changes...">
                    <Edit />
                </Tooltip>
            break;
        case NETWORK_STATUS.SAVING:
            icon =
                <Tooltip enterDelay={600} arrow title="Saving...">
                    <Sync />
                </Tooltip>
            break;
        case NETWORK_STATUS.SAVED:
            icon =
                <Tooltip enterDelay={600} arrow title="Saved.">
                    <CloudDone />
                </Tooltip>
            break;

        case NETWORK_STATUS.NETWORK_RETRY:
            icon =
                <Tooltip enterDelay={600} arrow title="Will try to reconnect.">
                    <CloudQueue />
                </Tooltip>
            break;
        case NETWORK_STATUS.TRYING_TO_CONNECT:
            icon =
                <Tooltip enterDelay={600} arrow title="Trying to Connect">
                    <span style={{color:'#FFFFFF'}}>
                        <CircularProgress style={{marginLeft: '.2em', width:'24px',height:'24px'}} color="inherit"/>
                    </span>
                </Tooltip>
            break;
        case NETWORK_STATUS.ONLINE:
        default:
            var { timeLastSuccessfulSave } = this.state;
            var lastSaveMessage = (timeLastSuccessfulSave) ? ` Last Saved ${timeLastSuccessfulSave}.` : '';
            var title = `Online.${lastSaveMessage}`
            icon =
                <Tooltip enterDelay={600} arrow title={title}>
                    <CloudDone />
                </Tooltip>
            break;
      }
      return icon;
  }

  promptConnectToNeo = () => {
      showNeoConnectionDialog({
        onConnectCallback: () => {}, 
        buttonText: "Connect",
        doCallbackOnWebSocketError: false
      });
  }

  getQueryParams = () => {
      var url = new URL(window.location.href);
      var queryParams = {};
      if (url && url.searchParams) {
        for (let p of url.searchParams) { 
            var key = p[0];
            var value = p[1];
            if (key) {
                queryParams[key] = value;
            }
        }
      }
      return queryParams;
  }

  getUrlParams = () => {
      //console.log("this.props.match: " + JSON.stringify(this.props.match));
      //console.log(this.props.match.params.id);
      var { match } = this.props;
      return (match && match.params) ? match.params : {};
  }

  showSwitchOrganizations = async () => {
    var { currentUser } = this.state;
    
    this.closeSettingsForm();

    let currentUserResult = await getCurrentUser();
    if (currentUserResult.success) {
        currentUser = (currentUserResult.user) ? currentUserResult.user : currentUser;
        this.setState({
          currentUser: currentUser
        });
    }

    var primaryOrganization = (currentUser.primaryOrganization) ? currentUser.primaryOrganization : 'Unknown';
    var authorizedOrganizations = (currentUser.authorizedOrganizations) ? currentUser.authorizedOrganizations : []
    var selectOptions = authorizedOrganizations.sort().map(org => {
        return {
            value: org,
            text: org
        }
    });

    if (this.generalSelectDialogRef.current) {
        this.generalSelectDialogRef.current.setSelectedValue(primaryOrganization);
    }

    const message = 
        <span>
            Clicking Switch will change your organization and <span style={{fontWeight: "bold", textDecoration: "underline"}}>log you out</span>. When you re-login you will be in the selected organization.
        </span>

    this.setState({
        generalSelectDialog: {
            ...this.state.generalSelectDialog,
            open: true,
            title: 'Switch Organizations',
            message: message,
            selectLabel: "Switch to Organization",
            selectOptions: selectOptions,
            buttons: [{
                text: 'Switch',
                onClick: (button, index, selectedValue) => this.switchOrganizations(selectedValue),
                autofocus: true
            },{
                text: 'Cancel',
                onClick: (button, index) => this.closeGeneralSelectDialog(),
                autofocus: false
            }]
        }
    });
  }

  switchOrganizations = (newOrganization) => {
    const { currentUser } = this.state;
    var primaryOrganization = (currentUser.primaryOrganization) ? currentUser.primaryOrganization : 'Unknown';

    this.closeGeneralSelectDialog();
    if (newOrganization !== primaryOrganization) {
        updateUserPrimaryOrganization(newOrganization, (result) => {
            if (result.success) {
                this.logout();
            } else {
                alert(result.error);
            }
        })
    }
  }

  onDatabaseTooltipClose = () => {
      this.setState({
          databaseIconSettings: DEFAULT_DATABASE_ICON_SETTINGS
      });
  }


  render () {
      const { classes } = this.props;
      const { open, activeTabIndex, title, menus, currentUser, 
          generalSelectDialog, generalDialog, databaseIconSettings,
          networkOpen, settingsOpen, cloudIconAnchor,
          settingsIconAnchor, alertMessage, showNeoConnectionDialog } = this.state;

      const { brandingInfo } = this.props;
      var { logourl, logoheight, primaryColor, secondaryColor  } = 
      brandingInfo.logourl !== undefined
      ? brandingInfo
      : {
          logourl:
            "https://storage.googleapis.com/neo4j-solutions-public/neo4j/Neo4j-logo_white.png",
          logoheight: 36,
        };
      const navBarStyle = { background: COLORS.primary }
      const textStyle = { color: COLORS.secondary };
      const secondaryBackgroundStyle = { background: COLORS.secondary }

      var alertMessageMargins = {};

      const { databaseTooltipMessage, databaseTooltipOpen } = databaseIconSettings;

      if (alertMessage.topMargin !== '0px') {
          alertMessageMargins.marginTop = alertMessage.topMargin;
      }
      if (alertMessage.bottomMargin !== '0px') {
          alertMessageMargins.marginBottom = alertMessage.bottomMargin;
      }

      const currentConnectionInfo = getCurrentConnectionInfo();
      const activeNeoConnectionName = (currentConnectionInfo) 
        ? `Currently connected to Neo4j Database: ${currentConnectionInfo.name}${(currentConnectionInfo.graphQLNeoProxy) ? ' (proxied)' : ''}`
        : 'Unknown connection';

      return (
        <div className={classes.root}>
          <CssBaseline />
          <AppBar position="absolute" 
                className={clsx(classes.appBar, open && classes.appBarShift)}
                style={navBarStyle}
          >
            <Toolbar className={classes.toolbar}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="open drawer"
                onClick={this.handleDrawerOpen}
                className={clsx(classes.leftDrawerOpenButton, open && classes.menuButtonHidden)}
                style={textStyle}
              >
                <MenuIcon />
              </IconButton>
              {logourl &&
                <img
                    height={getLogoHeight(logoheight)}
                    width="auto"
                    src={logourl}
                    alt="Logo"
                    style={{marginRight: '18px'}}
                />
              }
              <Tooltip enterDelay={600} arrow title={title}>
                <Typography 
                    variant="h6" color="inherit" noWrap className={classes.title} style={textStyle}>
                    {title}
                </Typography>
              </Tooltip>
              <div className={classes.divider} style={secondaryBackgroundStyle}/>
              {menus.map(menu =>
                  <Menu key={menu.id} classes={classes} menu={menu}
                    additionalStyle={textStyle}
                  />
              )}
              <div className={classes.spacer}/>
              {/*
                  <Typography variant="body1" color="inherit" noWrap className={classes.title}>
                    {getAuth().getLoggedInUserInfo().email}
                  </Typography>
              */}
              {isFeatureLicensed(FEATURES.DATABASES.View) &&
                  <IconButton
                    edge="end"
                    color="inherit"
                    aria-label="online"
                    onClick={this.promptConnectToNeo}
                    className={clsx(classes.menuButton, open && classes.menuButtonHidden)}
                  >
                    {currentlyConnectedToNeo() 
                        ?
                        <Tooltip enterDelay={600} arrow title={activeNeoConnectionName}>
                            <div className='cylinder' style={secondaryBackgroundStyle}>
                                <i className="fas fa-check fa-stack-1x"
                                    style={{transform: "translate(0px, 3px)", fontSize: '.45em', color: COLORS.primary}}></i>
                            </div>
                        </Tooltip>
                        : 
                        (databaseTooltipOpen) 
                            ? 
                            <ClickAwayListener onClickAway={this.onDatabaseTooltipClose}>
                                <div>
                                <LightDarkTooltip type={'light'}
                                    open={true}
                                    onClose={this.onDatabaseTooltipClose}
                                    arrow title={databaseTooltipMessage}>
                                    <div className='cylinder' style={secondaryBackgroundStyle}>
                                        <i className="fas fa-times fa-stack-1x"
                                            style={{transform: "translate(0px, 3px)", fontSize: '.45em', color: COLORS.primary}}></i>
                                    </div>
                                </LightDarkTooltip>
                                </div>
                            </ClickAwayListener>
                            :
                            <LightDarkTooltip enterDelay={600} type={'dark'}
                                arrow title={databaseTooltipMessage}>
                                <div className='cylinder' style={secondaryBackgroundStyle}>
                                    <i className="fas fa-times fa-stack-1x"
                                        style={{transform: "translate(0px, 3px)", fontSize: '.45em', color: COLORS.primary}}></i>
                                </div>
                            </LightDarkTooltip>
                    }
                  </IconButton>
              }
              <IconButton
                edge="end"
                color="inherit"
                aria-label="online"
                onClick={this.goOnline}
                className={clsx(classes.menuButton, open && classes.menuButtonHidden)}
                style={textStyle}
              >
                {this.getNetworkIcon()}
              </IconButton>
              <IconButton
                edge="end"
                color="inherit"
                aria-label="connect"
                onClick={this.handleSettings}
                className={clsx(classes.menuButtonFarRight, open && classes.menuButtonHidden)}
                style={textStyle}
              >
                    <Tooltip enterDelay={600} arrow title="User Info">
                        <SettingsIcon />
                    </Tooltip>
              </IconButton>

              {/*<IconButton
                edge="end"
                color="inherit"
                aria-label="connect"
                onClick={this.handleConnect}
                className={clsx(classes.menuButton, open && classes.menuButtonHidden)}
              >
                (connected) ?
                    <CloudDoneIcon />
                    :
                    <CloudOffIcon />
              </IconButton>
              */}
            </Toolbar>
          </AppBar>
          {/*
          <Popper open={networkOpen} anchorEl={cloudIconAnchor} placement={'bottom-end'}
                    style={{zIndex: 10000}} transition>
              {({ TransitionProps }) => (
                <Fade {...TransitionProps} timeout={350}>
                  <ClickAwayListener onClickAway={this.closeNeoConnectionForm}>
                      <Paper style={{background: '#F6F6F6', border: '1px solid gray',
                                        paddingLeft: '10px',
                                        paddingTop: '4px',
                                        paddingRight: '4px',
                                        paddingBottom: '4px'}}>
                          <NeoConnectionForm connect={this.doConnect}/>
                      </Paper>
                  </ClickAwayListener>
                </Fade>
              )}
          </Popper>
          */}
          <Popper open={settingsOpen} anchorEl={settingsIconAnchor} placement={'bottom-end'}
                    style={{zIndex: 10000}} transition>
              {({ TransitionProps }) => (
                <Fade {...TransitionProps} timeout={350}>
                  {/*}<ClickAwayListener onClickAway={this.closeSettingsForm}>*/}
                      <Paper style={{background: '#F6F6F6', border: '1px solid gray',
                                        paddingLeft: '10px',
                                        paddingTop: '4px',
                                        paddingRight: '4px',
                                        paddingBottom: '4px'}}>
                          <SettingsForm email={getAuth().getLoggedInUserInfo().email}
                                        currentUser={currentUser}
                                        showSwitchOrganizations={this.showSwitchOrganizations}
                                        logout={this.logout} ref={this.settingsRef}/>
                      </Paper>
                  {/*}</ClickAwayListener>*/}
                </Fade>
              )}
          </Popper>
          <Drawer
            variant="permanent"
            classes={{
              paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
            }}
            open={open}>
            <div className={classes.toolbarIcon} style={{lineHeight: '1.2em', background:'#CCEECC'}}>
              <div style={{fontSize: '1.35em',marginRight:'10px'}} className={"fa fa-wrench"}></div>
              <div>
                <span style={{fontSize: getAppNameFontSize() || '1em', fontWeight:500}}>{getAppName()}</span>
                <br/>
                <span style={{fontSize: '0.8em'}}>v{VERSION} (powered by Neo4j)</span>
              </div>
              <IconButton onClick={this.handleDrawerClose}>
                <ChevronLeftIcon />
              </IconButton>
            </div>
            <Divider />
            <Tabs orientation="vertical" variant="scrollable" value={activeTabIndex} onChange={this.handleChange}>
                {this.getToolsArray().map((tool, index) => {
                    const { tabHeader } = tool;
                    return (
                        <Tab key={index} style={{
                            background: (activeTabIndex === index) ? '#e4e4e4' : 'white'
                        }} label={<span className={classes.tabLabel}>
                            <Icon style={{paddingLeft: tabHeader.paddingLeft}} className={clsx(classes.listIcon, tabHeader.icon)}/>
                            <span className={clsx(!open && classes.labelSpanHidden, classes.labelSpan)}>{tabHeader.title}</span></span>}
                        />
                    )
                })}
            </Tabs>
          </Drawer>
          <div id="drawer-container" style={{position: "relative", left: `${drawerWidth}px`}}>
            
          </div>                
          <main id='main' className={classes.content}>
              <Box mt={8} p={0} width="100%" height="100%">
                  <Snackbar open={alertMessage.display} style={alertMessageMargins}
                        anchorOrigin={{vertical: alertMessage.vertical, horizontal: alertMessage.horizontal}}
                        autoHideDuration={6000} onClose={alertMessage.close}>
                      <Alert variant="filled" severity={alertMessage.level} style={{position:'absolute', zIndex:1000, minWidth:'600px'}}
                        action={
                            <>
                                {alertMessage.moreInfo && 
                                    <Button aria-label="close" color="inherit" size="small" onClick={alertMessage.moreInfo}>More Info</Button>
                                }
                                {alertMessage.customButton && 
                                    <Button aria-label="close" color="inherit" size="small" onClick={alertMessage.customButton.onClick}>{alertMessage.customButton.text}</Button>
                                }
                                <IconButton aria-label="close" color="inherit" size="small" onClick={alertMessage.close}>
                                    <CloseIcon fontSize="inherit" />
                                </IconButton>
                            </>
                        }
                      >
                        {alertMessage.message}
                      </Alert>
                  </Snackbar>
                  {
                      this.getToolsArray().map((tool, index) =>
                          <TabPanel key={index} value={activeTabIndex} 
                            index={index}
                            style={{
                                overflowX: (tool.overflowX) ? tool.overflowX : "hidden",
                                overflowY: (tool.overflowY) ? tool.overflowY : "auto"
                            }}
                          >
                            <Suspense fallback={<div>Loading...</div>}>
                            {
                                React.createElement(tool.component, {
                                    index: index,
                                    setSureRef: tool.setSureRef,
                                    setTitle: this.setTitle,
                                    setMenus: this.setMenus,
                                    getLeftDrawerSize: this.getLeftDrawerSize,
                                    otherToolActionRequest: this.otherToolActionRequest,
                                    activateTool: this.activateTool,
                                    getNetworkStatus: this.getNetworkStatus,
                                    setNetworkStatus: this.setNetworkStatus
                                }, null)
                            }
                            </Suspense>
                          </TabPanel>
                      )
                  }
              </Box>
              <NeoConnectionForm maxWidth={'sm'} open={showNeoConnectionDialog} onClose={this.handleNeoConnectionFormClose}
                    ref={this.neoConnectionRef} cancel={this.handleNeoConnectionFormClose}/>
              <GeneralSelectDialog maxWidth={'sm'} open={generalSelectDialog.open} onClose={generalSelectDialog.handleClose}
                            ref={this.generalSelectDialogRef}
                            title={generalSelectDialog.title} 
                            message={generalSelectDialog.message}
                            selectLabel={generalSelectDialog.selectLabel}
                            selectOptions={generalSelectDialog.selectOptions}
                            buttons={generalSelectDialog.buttons} />
              <GeneralDialog open={generalDialog.open} onClose={generalDialog.handleClose}
                    title={generalDialog.title} 
                    isReactEl={generalDialog.isReactEl}
                    description={generalDialog.description}
                    buttons={generalDialog.buttons} />

          </main>
        </div>
    );
  }
}

export default withStyles(styles)(Homepage);
