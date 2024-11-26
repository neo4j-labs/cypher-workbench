
export const getDynamicConfigValue = (envKey) => {

    var value = null;
    if (window._dynamicEnv_) {
        value = window._dynamicEnv_[envKey];
    }
    if (!window._dynamicEnv_ || value === undefined) {
        value = process.env[envKey];
    }
    return value;
}

export const getAppName = () => getDynamicConfigValue('REACT_APP_APP_NAME') || 'Cypher Workbench';
export const getAppTrackingName = () => getDynamicConfigValue('REACT_APP_TRACKING_APP_NAME') || 'CypherWorkbench';
export const getAppNameFontSize = () => getDynamicConfigValue('REACT_APP_APP_NAME_FONT_SIZE') || '1em';


