import auth0 from "auth0-js";
import axios from "axios";
import history from "./history";
import to from 'await-to-js';
import { getGraqhQLConnection } from '../persistence/graphql/authGraphql';
//import { checkIfValidUser } from '../persistence/graphql/GraphQLAdminApp';
import { getDynamicConfigValue } from '../dynamicConfig';
import { gql } from "@apollo/client";
import { identify } from "../common/util/tracking";
import { setLicensedFeatures } from '../common/LicensedFeatures';

class Auth {
  constructor() {
    //console.log('auth: constructor called');
    this.type = "auth0";
    this.haveIRedirected = false;
    this.auth0 = new auth0.WebAuth({
      domain: getDynamicConfigValue("REACT_APP_AUTH_DOMAIN") || 'AUTH_DOMAIN not specified',
      clientID: getDynamicConfigValue("REACT_APP_AUTH_CLIENT_ID") || 'AUTH_CLIENT_ID not specified',
      redirectUri: getDynamicConfigValue("REACT_APP_AUTH_CALLBACK") || 'AUTH_CALLBACK not specified',
      responseType: "token id_token",
      scope: "openid email profile",
      sso: false
    });
    this.verifyDemoAccessResult = false;
  }

  login = () => {
    console.log('auth: login called');
    this.auth0.authorize({
      prompt: "select_account",
      theme: { primaryColor: "#0085be" }
    });
    
  };

  getIdentityInfo = () => {
    var { primaryOrganization } = JSON.parse(localStorage.getItem("user") || '{}');
    var { email, sub } = JSON.parse(localStorage.getItem("id_token_payload") || '{}');
    email = email || '';
    sub = sub || '';
    primaryOrganization = primaryOrganization || '';

    return { email, sub, org: primaryOrganization }
  }

  getIdToken = () => {
    return localStorage.getItem('id_token');
  };

  getIdTokenPayload=()=>{
    return this.idTokenPayload;
  }

  createUser = async () => {
      const uri = getDynamicConfigValue("REACT_APP_GRAPHQL_URI") || "GRAPHQL_URI not specified";
      var authorization = this.getIdToken() ? `Bearer ${this.getIdToken()}` : "";
      var graphQLConnection = getGraqhQLConnection(uri, authorization);
      var promise = new Promise((resolve, reject) => {
          graphQLConnection.mutate({
            mutation: gql`
              mutation createUser{
                createUser {
                  error
                  user {
                    email
                    name
                    primaryOrganizationRequiresEULA              
                  }
                }
              }
            `
          })
          .then((result) => {
              const { data } = result;
              const { error, user } = data.createUser;
              if (error) {
                console.log("Auth error: " + error);
                alert("Auth error: " + error);
                //this.logout();
                reject();
              } else {
                localStorage.setItem("user", JSON.stringify(user));
                resolve();
              }
          })
          .catch(error => {
            console.log("Auth error: " + error);
            alert("Auth error: " + error);
            //this.logout();
            reject();
          });
      })
      return await promise;
  }

  handleSignUp = async () => {
    const uri = getDynamicConfigValue("REACT_APP_HIVE_URI") || 'HIVE_URI Not Specified';
    const variables={
      id: getDynamicConfigValue("REACT_APP_SOLUTION") || 'SOLUTION Not Specified' };
    var authorization = this.getIdToken() ? `Bearer ${this.getIdToken()}` : "";
    var graphQLConnection = getGraqhQLConnection(uri, authorization);
    graphQLConnection.mutate({
      mutation: gql`
        mutation MergeUserAndLogSignIn($id: ID!) {
          mergeUserAndLogSignIn(id: $id){
            email
          }
        }
      `,
      variables: variables
    })
      .then(() => {
        console.log("logged info");
      })
      .catch((error) => {
        console.log(error);
      });
  };

  verifyDemoAccess = async ({caller}) => {
    if (!this.getIdToken()) {
      return false;      
    }

    const uri = getDynamicConfigValue('REACT_APP_HIVE_URI');
    const variables={
      baseUrl: getDynamicConfigValue('REACT_APP_SOLUTION_BASE_URL_IN_HIVE')};
    var authorization = this.getIdToken() ? `Bearer ${this.getIdToken()}` : "";
    var graphQLConnection = getGraqhQLConnection(uri, authorization);
    var promise = new Promise((resolve, reject) => {
      graphQLConnection.mutate({
        mutation: gql`
          mutation verifyUserHasAccessToSolution ($baseUrl: String!) {
            result: verifyUserHasAccessToSolution(baseUrl: $baseUrl) {
              hasAccess
              userPrimaryOrganization
              solutionId
              solutionName
              solutionType
              matchingDeploymentId
              matchingDeploymentUrl
              matchingDeploymentName
            }
          }
        `,
        variables: variables
      })
        .then((result) => {
          const { data, errors } = result;
          if (errors) {
            console.log(`${caller} verifyDemoAccess access check error (1)`);
            console.log(errors);
            alert(`${caller} verifyDemoAccess access check error (1): ${JSON.stringify(errors)}, returning to Hive.`);
            this.verifyDemoAccessResult = false;
            resolve({hasAccess: false});
          } else {
            if (data.result && data.result.hasAccess === false) {
              alert('You have not been granted access to this demo, returning to Hive.');
              this.verifyDemoAccessResult = false;
              resolve(data.result);
            } else {
              this.verifyDemoAccessResult = true;
              resolve(data.result);
            }
          }        
        })
        .catch(error => {
          console.log(`${caller} verifyDemoAccess access check error (2)`);
          console.log(error);
          alert(`${caller} verifyDemoAccess access check error (2): ${JSON.stringify(error)}, returning to Hive.`);
          this.verifyDemoAccessResult = false;
          resolve({hasAccess: false});
        });
    });
    return await promise;
  }

  handleAuthentication = () => {
    return new Promise(async (resolve, reject) => {
      this.auth0.parseHash(async (err, authResult) => {
        if (err) return reject(err);
        if (!authResult || !authResult.idToken) {
          return reject(err);
        }
        this.setSession(authResult);
        if (getDynamicConfigValue("REACT_APP_EULA") === 'eula') {
          await this.getUser(authResult.idTokenPayload);
        }

        await this.createUser();
        resolve();

      });
    })
  }

  getNewTokenOrLogin = async () => {
      try {
        await this.silentAuth();
        identify();        
      } catch (err) {
          console.log('error in getNewTokenOrLogin', err);
        if (err.message === "login_required" || err.error === "login_required") this.login();
      }
  }

  silentAuth = async () => {

    var promise = new Promise((resolve, reject) => {
      console.log('silentAuth checking session');
      this.auth0.checkSession({}, async(err, authResult) => {
          console.log('check session done');
        if (err) {
            console.log('check session err', err);
          return reject(err);
        }
        if (!authResult || !authResult.idToken) {
            console.log('authResult err', err);
          return reject(err);
        }
            console.log('set session');
        this.setSession(authResult);
        if (getDynamicConfigValue("REACT_APP_EULA") === 'eula') {
          await this.getUser(authResult.idTokenPayload);
        }

        if (getDynamicConfigValue('REACT_APP_RUN_MODE') === 'partner') {
          const result = await this.verifyDemoAccess({caller: 'silentAuth'});
          if (!result.hasAccess) {
            this.removeLocalStorageItems();
            reject();
            setTimeout(() => {
              window.location.replace(getDynamicConfigValue('REACT_APP_HIVE_UI'));
            }, 6000);          
          } else {
            await this.createUser();
            resolve(authResult.expiresIn);
          }
        } else {
          await this.createUser();
          resolve(authResult.expiresIn);
        }
      });
    })
    return await promise;
  }

  getLoggedInUserInfo = () => JSON.parse(localStorage.getItem("logged_in_user") || '{}');

  setSession = (authResult) => {
    // Set the time that the access token will expire at
    if (authResult && authResult.idTokenPayload) {
        const { email, name } = authResult.idTokenPayload;
        const loggedInUserInfo = {
            email: email,
            name: name
        }
        localStorage.setItem("logged_in_user", JSON.stringify(loggedInUserInfo));
    }

    var expiresAt = authResult.expiresIn * 1000 + new Date().getTime();

    this.idTokenPayload=authResult.idTokenPayload;
    const { email, sub } = authResult.idTokenPayload;    
    localStorage.setItem("id_token_payload", JSON.stringify({ email, sub }));
    localStorage.setItem("id_token", authResult.idToken);
    localStorage.setItem("expires_at", expiresAt);  
  }

  getNoPromptEulaEmailDomains = () => {
    var noPromptEulaEmailDomains = getDynamicConfigValue("REACT_APP_IGNORE_EULA_FOR_EMAIL_DOMAINS") || 'neotechnology.com,neo4j.com,neo4j.org';
    return noPromptEulaEmailDomains.split(',').map(x => x.toLowerCase());
  }

  getLoggedInUserEmailDomain = () => {
    const loggedInUserInfo = this.getLoggedInUserInfo();
    const email = (loggedInUserInfo && loggedInUserInfo.email) ? loggedInUserInfo.email : '';
    const domain = email.split('@')[1];
    return (domain) ? domain.toLowerCase() : '';
  }

  getUser=async (params,callbackFunc) => {
        
        const noPromptEulaEmailDomains = this.getNoPromptEulaEmailDomains();
        const loggedInUserEmailDomain = this.getLoggedInUserEmailDomain();

        if (noPromptEulaEmailDomains.includes(loggedInUserEmailDomain)) {
          return null;
        } else {
          //const [err, data] = await to(axios.get(`http://localhost:8080/user`, {params}));
          const eulaUri = getDynamicConfigValue("REACT_APP_EULA_GET_USER") || 'EULA_GET_USER Not Specified';
          const [err, data] = await to(axios.get(eulaUri, {params}));
          // if(data.data.app_metadata===undefined)history.replace(`/terms`);
          if (data) {
            this.currentUser=data.data
            if (callbackFunc) callbackFunc();
            //console.log(this.currentUser.app_metadata)
            return data.data ;
          } else {
            console.log(`Warning: EULA server '${eulaUri}' not reachable, setting EULA accept time to now()`);
            this.currentUser = {
              app_metadata: {
                cypher_workbench: {
                  accepted_eula_at: new Date().getTime()
                }
              }
            };
            return this.currentUser;
          }
        }
  }
  
  updateAppMetadata=async(params)=>{
        //const [err, data] = await to(axios.patch(`http://localhost:8080/update`, {product_name: 'cypher-workbench',...params}));
        const [err, data] = await to(axios.patch(getDynamicConfigValue("REACT_APP_EULA_UPDATE_METADATA") || 'EULA_UPDATE_METADATA Not Specified', {product_name: 'cypher-workbench',...params}));
        return data.data
  }

  getCurrentUser=()=>{
     return this.currentUser;
  }

  currentUserHasAcceptedEula = () => {
    // no longer checking
    return true;
  }

  removeLocalStorageItems = () => {
    localStorage.removeItem("id_token_payload");    
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");  
    localStorage.removeItem("logged_in_user");
    this.verifyDemoAccessResult = false;
  }

  logout = () => {
    this.removeLocalStorageItems();
    const authDomain = getDynamicConfigValue("REACT_APP_AUTH_DOMAIN") || "AUTH_DOMAIN not specified";
    const logoutUrl = getDynamicConfigValue("REACT_APP_AUTH_AUTH0_LOGOUT_URL") || "AUTH_AUTH0_LOGOUT_URL not specified"
    const clientId = getDynamicConfigValue("REACT_APP_AUTH_CLIENT_ID") || "AUTH_CLIENT_ID not specified"
    
    window.location.replace(
      `https://${authDomain}/v2/logout/?returnTo=${logoutUrl}&client_id=${clientId}`
    );
    localStorage.removeItem("user");
  };

  isAuthenticated = () => {
    var demoAccess = true;
    if (getDynamicConfigValue('REACT_APP_RUN_MODE') === 'partner') {
      demoAccess = this.verifyDemoAccessResult;
    }
    // Check whether the current time is past
    let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
    var expiresResult = parseInt(new Date().getTime()) < parseInt(expiresAt);
    var isAuthenticatedResult = expiresResult && demoAccess;
    return isAuthenticatedResult;
  };
}

const auth = new Auth();

export default auth;
