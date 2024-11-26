import React, { Component } from "react";
import { Route, withRouter } from "react-router-dom";
import { MuiThemeProvider, createTheme } from "@material-ui/core/styles";

import Callback from "./auth/callback";
import Eula from "./common/eula/Eula";
import Email from "./common/eula/Email";
import PrivateRoute from "./auth/privateRoute";
import { getAuth, getAuthMethod } from "./auth/authUtil";
import { doRedirect } from "./auth/history";
import localAuth from "./auth/localAuth";
import { DEFAULT_COLORS, updateConstColors } from "./common/Constants";
import SystemMessages from "./common/messages/SystemMessages"
import EulaOnline from "./common/eula/EulaOnline"
import { getEulaFile } from './common/eula/eulaHelper';
import { getDynamicConfigValue } from './dynamicConfig';
import Homepage from "./homePage";
import { getSystemMessages } from './persistence/graphql/GraphQLPersistence';
import { fetchBrandingInfo } from './persistence/graphql/getBrandingInfo';


import "./App.css";

const getQueryParams = () => {
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

export const isDebuggingEnabled = () => {
  if (appQueryParams) {
    return appQueryParams.debug === 'true' || appQueryParams.debug === true;
  } else {
    return false;
  }
}
export const printDebug = (message, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) => {
  if (isDebuggingEnabled()) {
    var args = [`DEBUG: ${message}`, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8].filter(x => x);
    console.log.apply(null, args);
  }
}

export const getUrlQueryString = () => {
  const params = Object.keys(appQueryParams).map(x => `${x}=${appQueryParams[x]}`).join('&');
  return params ? `?${params}` : '';
}

var licenseEulaFile;
var appQueryParams;

class App extends Component {

  brandingInfo = JSON.parse(localStorage.getItem('brandingInfo') || '{}');

  constructTheme = ({primary, secondary}) => {
    const theme = createTheme({
      palette: {
        primary: {
          main: primary
        },
        secondary: {
          main: secondary
        }    
      },
      overrides: {
        MuiTooltip: {
              tooltip: {
                fontSize: "0.9em"
            }
        }
      }
    });
    
    return theme;    
  }

  state = {
    brandingInfo: this.brandingInfo,
    theme: this.constructTheme({ 
      //primary: this.brandingInfo.primaryColor || DEFAULT_COLORS.primary, 
      primary: DEFAULT_COLORS.primary, 
      secondary: DEFAULT_COLORS.secondary // for now we don't want to use the secondary color from branding because it doesn't align with this theme
    })
  }

  async getBrandingInfo() {
    var brandingInfo = JSON.parse(localStorage.getItem('brandingInfo') || '{}');
    if (localStorage.getItem("id_token")) {
      brandingInfo = await fetchBrandingInfo();
      localStorage.setItem('brandingInfo', JSON.stringify(brandingInfo));
    } 
    this.setState({
      brandingInfo: brandingInfo,
      theme: this.constructTheme({ 
        //primary: brandingInfo.primaryColor || DEFAULT_COLORS.primary
        primary: DEFAULT_COLORS.primary, 
        secondary: DEFAULT_COLORS.secondary
      })
    });
    this.handleColors(brandingInfo);    
  }

  handleColors = (brandingInfo) => {
    brandingInfo = (brandingInfo) ? brandingInfo : this.state.brandingInfo;
    const primary = brandingInfo.primaryColor || DEFAULT_COLORS.primary;
    const secondary = brandingInfo.secondaryColor || DEFAULT_COLORS.toolBarFontColor;
    updateConstColors({primary, secondary});
  }

  postLoginOk = async () => {
    if (getDynamicConfigValue('REACT_APP_RUN_MODE') === 'partner') {
      //alert("Calling getBrandingInfo")
      await this.getBrandingInfo();
    }
    this.forceUpdate();
  }

  async componentDidMount() {

    /*
    setTimeout(() => {
      const newTheme = this.constructTheme({primary: '#222'});
      this.setState({
        theme: newTheme
      })
    }, 30*1000);
    */

    this.handleColors();

    appQueryParams = getQueryParams();
    const authMethod = getAuthMethod();
    if (authMethod === "auth0") {
      // if using auth0 attemp silent auth
      if (this.props.location.pathname === "/callback") {
        // if we are on the /callback route let it render
        return;
      }
      try {
        // try silent auth, if successful re-render
        await getAuth().silentAuth();
        var acknowledgeError = localStorage.getItem('systemMessagesAcknowledgeError');
        if (acknowledgeError) {
          localStorage.removeItem('systemMessagesAcknowledgeError');
          this.forceUpdate();
          return;
        }

        var systemMessages = await getSystemMessages();
        //console.log('systemMessages: ', systemMessages);
        if (systemMessages.success && systemMessages.messages && systemMessages.messages.length > 0) {
          var messageToStore = JSON.stringify(systemMessages.messages);
          //console.log('messageToStore: ', messageToStore);
          localStorage.setItem('systemMessages', messageToStore);
          if (this.props.location.pathname !== "/messages") {
            doRedirect("/messages", "App.js systemMessages exist");
          } else {
            // commenting out for emergency troubleshooting 2/2/2023
            /*
            licenseEulaFile = await getEulaFile();
            localStorage.setItem('licenseEulaFile', licenseEulaFile);
            */
            this.postLoginOk();
          }
        } else {
            // commenting out for emergency troubleshooting 2/2/2023
            /*
          licenseEulaFile = await getEulaFile();
          localStorage.setItem('licenseEulaFile', licenseEulaFile);
            */
    
          localStorage.removeItem('systemMessages');
          this.postLoginOk();
        }
      } catch (err) {
        // if error return to login screen
        if (err && (err.message === "login_required" || err.error === "login_required")) {
          getAuth().login();
        } 
        return;
      }
    } else if (authMethod === "local") {
      // if using local auth check for an email in local storage
      const idToken = localStorage.getItem("id_token");
      const email = getAuth().getEmailFromIdToken(idToken);
      //console.log('email: ', email);
      printDebug('email: ', email);
      licenseEulaFile = await getEulaFile();
      localStorage.setItem('licenseEulaFile', licenseEulaFile);
      const didAcceptEula = await getAuth().acceptedEula(email);
      printDebug('didAcceptEula: ', didAcceptEula);
      if (email && didAcceptEula) {
        // if email exists and has accepted the Eula set the session
        //getAuth().callLogEulaAcceptance(email);
        printDebug('email and acceptedEula true');
        getAuth().setSession(email, getAuth().getLocalAuthTokenFromIdToken(idToken));
        getAuth().setAcceptedEula(true);
        this.forceUpdate();
      } else if (
        this.props.location.pathname !== "/login" && 
        !this.props.location.pathname.match("/eula/*")
      ) {
        doRedirect("/login", "App.js email not present or acceptedEula false, redirecting to login")
        // TODO: double check this in auth0 scenario

        // if no email exists or user has not accepted the Eula logout <-- BAD!
        // DO NOT LOGOUT!!! - this will destroy the id_token which is required to get the proper eula license file
        //getAuth().logout();
      }
    }
  }

  render() {
    const { theme, brandingInfo } = this.state;
    const auth = getAuth();

    return (
      <MuiThemeProvider theme={theme}>
        <Route exact path="/callback" component={Callback} />
        <Route exact path="/eula/:emailpayload" component={Eula} />
        <Route exact path="/login" component={Email} />
        <PrivateRoute auth={auth} path={"/"} component={Homepage} brandingInfo={brandingInfo}/>
        <PrivateRoute auth={auth} path="/terms" component={EulaOnline} />
        <PrivateRoute auth={auth} path="/messages" component={SystemMessages}/>
        <PrivateRoute auth={auth} path={"/tools/:tool/:id"} component={Homepage} brandingInfo={brandingInfo}/>
        <PrivateRoute auth={auth} path={"/tools/:tool"} component={Homepage} brandingInfo={brandingInfo}/>
        <PrivateRoute auth={auth} path={"/model"} component={Homepage} brandingInfo={brandingInfo}/>
        <PrivateRoute auth={auth} path={"/model/:id"} component={Homepage} brandingInfo={brandingInfo}/>
      </MuiThemeProvider>
    );
  }
}

export default withRouter(App);
