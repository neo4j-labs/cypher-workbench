
import packageInfo from "../../../package.json"; 
import { getDynamicConfigValue, getAppTrackingName } from "../../dynamicConfig";
import { getAuth } from "../../auth/authUtil";

const trackingEnabled = (getDynamicConfigValue('REACT_APP_SEGMENT_API_KEY')) ? true : false;

export const track = (eventName, eventParams) => {
    if (trackingEnabled) {
        eventParams = eventParams || {};
        eventParams = { 
            ...eventParams, 
            appName: getAppTrackingName(),
            version: packageInfo.version,
            ...getAuth().getIdentityInfo()
        }
        window.analytics.track(`${eventName}`, eventParams);
    }
}

export const identify = () => {
    if (trackingEnabled) {
        var identityInfo = getAuth().getIdentityInfo();
    
        var eventParams = { 
            appName: getAppTrackingName(),
            version: packageInfo.version,
            ...identityInfo
        }
        window.analytics.identify(identityInfo.email, eventParams);
    }
}