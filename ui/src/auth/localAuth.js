import { doRedirect } from "./history";
import { EULA_NAME } from "../common/LicensedFeatures";
import { getDynamicConfigValue } from '../dynamicConfig';
import { encryptV1 } from '../common/encryption';
import { getGraqhQLConnection } from '../persistence/graphql/authGraphql';
import { gql } from "@apollo/client";

class Auth {
  constructor() {
    this.type = "local";
  }

  createUser = async (email, password) => {
    const uri = getDynamicConfigValue("REACT_APP_GRAPHQL_URI") || "GRAPHQL_URI not specified";
    const variables = { encryptedPassword: (password) ? encryptV1(password) : '' };
    var authorization = `Bearer ${this.getBearerJson(email)}`;
    var graphQLConnection = getGraqhQLConnection(uri, authorization);
    return graphQLConnection.mutate({
      mutation: gql`
        mutation createUser ($encryptedPassword: String) {
          createUser (encryptedPassword: $encryptedPassword) {
            error
            user {
              email
              name
              localAuthToken {
                token
                expires
              }
            }
          }
      }`,
      variables: variables
    })
      .then((result) => {
          const { data } = result;
          const { error, user } = data.createUser;
          if (error) {
            console.log("Auth error: " + error);
            alert("Auth error: " + error);
            this.logout();
            return { error }
          } else {
            this.setSession(user.email, user.localAuthToken.token);
            return { user };
          }
      })
      .catch(error => {
        console.log("Auth error: " + error);
        alert("Auth error: " + error);
        this.logout();
        return { error }
        //if (callbackFunc) callbackFunc();
      });
  }

  getIdentityInfo = () => {
    var { primaryOrganization } = JSON.parse(localStorage.getItem("user") || '{}');
    var { email, sub } = JSON.parse(localStorage.getItem("id_token_payload") || '{}');
    email = email || '';
    sub = sub || '';
    primaryOrganization = primaryOrganization || '';

    return { email, sub, org: primaryOrganization }
  }

  getIdToken = () => {
    return localStorage.getItem("id_token");
  };

  getLoggedInUserInfo = () => {
    return { email: this.getEmailFromIdToken(localStorage.getItem("id_token")) };
  };

  login = (email, encryptedPassword) => {
    const uri = getDynamicConfigValue("REACT_APP_GRAPHQL_URI");
    const variables = { email, encryptedPassword };
    var authorization = `Bearer ${this.getBearerJson(email)}`;
    var graphQLConnection = getGraqhQLConnection(uri, authorization);
    graphQLConnection.mutate({
      mutation: gql`mutation LogInLocalUser ($email: String, $encryptedPassword: String) {
        localUser: logInLocalUser (email: $email, encryptedPassword: $encryptedPassword) {
          email
        }
      }
      `,
      variables: variables
    })
      .then((result) => {
        if (result.data.localUser.email) {
          this.setSession(email, result.data.localUser.localAuthToken);
          this.setAcceptedEula(true);
          doRedirect("/", "localAuth: setAcceptedEula true");
        } else {
          //alert('Logging out');
          this.logout();
        }
      })
      .catch((err) => {
        //console.log(`Logging out: ${err}`);
        console.log(err);
        this.logout();
      });
  };

  getCredentialsFromIdToken = (idToken) => {
    if (typeof(idToken) === 'string') {
      idToken = idToken || '';
      if (idToken) {
        try {
          idToken = JSON.parse(idToken);
        } catch (e) {
          console.log(`idToken: '${idToken}' is not valid JSON, ignoring`);
          idToken = null;
        }
        
      }
    }
    idToken = idToken || {};
    var credentials = idToken.credentials || '';
    if (credentials) {
      credentials = atob(credentials);      
    }
    return credentials;
  }

  getEmailFromIdToken = (idToken) => {
      const credentials = this.getCredentialsFromIdToken(idToken);
      const email = credentials.split(':')[0] || '';
      return email;
  }

  getLocalAuthTokenFromIdToken = (idToken) => {
    const credentials = this.getCredentialsFromIdToken(idToken);
    const localAuthToken = credentials.split(':')[1] || '';
    return localAuthToken;
  }

  getBearerJson = (email, localAuthToken) => {
    localAuthToken = localAuthToken || '';
    var credentials = `${email}:${localAuthToken}`;
    // using btoa because there isn't an better+easy alternative at the moment
    credentials = btoa(credentials);
    const bearerValue = { type: 'SWToken', credentials: credentials }
    const bearerValueString = JSON.stringify(bearerValue);
    return bearerValueString;
  }

  setSession = (email, localAuthToken) => {
    //console.log('localAuth: doing setItem id_token');
    //localStorage.setItem("id_token", email);
    localStorage.setItem("id_token_payload", JSON.stringify({ email }));
    const idTokenString = this.getBearerJson(email, localAuthToken);
    localStorage.setItem("id_token", idTokenString);
  };

  setAcceptedEula = (acceptedEula) => {
    localStorage.setItem("accepted_eula", acceptedEula);
  }

  logout = () => {
    //alert('removing id_token');
    localStorage.removeItem("id_token_payload");    
    localStorage.removeItem("id_token");
    //localStorage.removeItem("accepted_eula");
    doRedirect("/login", "localAuth: logout");
  };

  acceptedEula = async (email) => {
    const eulaSetting = getDynamicConfigValue("REACT_APP_EULA");
    if (eulaSetting === 'none') {
      return new Promise((resolve, reject) => resolve(true));
    }

    const uri = getDynamicConfigValue("REACT_APP_GRAPHQL_URI");
    const variables = { email };
    var authorization = `Bearer ${this.getIdToken()}`;
    var graphQLConnection = getGraqhQLConnection(uri, authorization);
    graphQLConnection.query({
      query: gql`query AcceptedEula ($email: String) {
        acceptedEula (email: $email)
      }
      `,
      variables: variables
    })
      .then((result) => {
        const acceptedEula = result.data.acceptedEula;
        return acceptedEula;
      })
      .catch(() => {
        this.logout();
      });
  };

  isAuthenticated = () => {
    return Boolean(localStorage.getItem("accepted_eula"));
  };

  callLogEulaAcceptance = (email) => {
    if (localStorage.getItem("accepted_eula_recorded") !== "true") {
        const uri = getDynamicConfigValue("REACT_APP_EULA_GRAPHQL_URI");
        const variables = { userEmail: email, eulaName: EULA_NAME };
        var graphQLConnection = getGraqhQLConnection(uri);
        graphQLConnection.mutate({
          mutation: gql`mutation logEulaAcceptance ($userEmail: String!, $eulaName: String!) {
            logEulaAcceptance (userEmail:$userEmail, eulaName:$eulaName) {
              name
            }
          }
          `,
          variables: variables
        })
          .then((result) => {
            if (result.data && result.data.logEulaAcceptance && result.data.logEulaAcceptance.name === EULA_NAME) {
              localStorage.setItem("accepted_eula_recorded", "true");
            } else {
              console.log("Could not record Eula acceptance, unexpected response: ", result);
            }
          })
          .catch((err) => {
            console.log("Could not record Eula acceptance", err);
            setTimeout(() => this.callLogEulaAcceptance(email), 1000*600); // call again in 10 min
          });
    }
  };
}

const auth = new Auth();

export default auth;
