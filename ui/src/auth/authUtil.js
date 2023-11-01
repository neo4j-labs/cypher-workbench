
import { getDynamicConfigValue } from '../dynamicConfig';

import auth0 from "./auth0";
import localAuth from "./localAuth";

var authMethod = null;
var auth = null;

// the processing behaviour changed somehow where constants defined at top of the 
// file dependent on config values were not being set before a call to getClient().
// logic has been changed to set them on first request  
export const getAuthMethod = () => {
    if (!authMethod) {
        authMethod = getDynamicConfigValue("REACT_APP_AUTH_METHOD");
    }
    return authMethod;
}

export const getAuth = () => {
    if (!auth) {
        auth = (getAuthMethod() === "auth0") ? auth0 : localAuth;
    } 
    return auth;
}