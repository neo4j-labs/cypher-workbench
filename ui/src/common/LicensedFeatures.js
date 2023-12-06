
import { isFeatureLicensedEx, anyFeatureLicensedEx } from './LicensedFeaturesCheck';
import { ALERT_TYPES } from './Constants';
import { getAppName } from '../dynamicConfig';

export const EULA_NAME = `${getAppName()} Eula`;

export const LICENSE_TYPES = {
    Basic: "Basic",
    Labs: "Labs",
    Enterprise: "Enterprise",
    EnterpriseTrial: "EnterpriseTrial",
    Cloud_Basic: "Cloud_Basic",
    Cloud_Enterprise: "Cloud_Enterprise",
    Cloud_EnterpriseTrial: "Cloud_EnterpriseTrial"
}

// the values are :tool values that can be used in the URL/Router.
export const TOOL_NAMES = {
    PROJECTS: 'projects',
    SCENARIOS: 'scenarios',
    CYPHER_BUILDER: 'cypherbuilder',
    CYPHER_SUITE: 'cyphersuite',
    MODEL: 'model',
    DATABASES: 'databases',
    DASHBOARD: 'dashboard',
    DATA_SCIENCE_DASHBOARD: 'datasciencedashboard',
    DATA_MAPPING: 'datamapping'
}

export const FEATURES = {
    PROJECTS: {
        View: 'projects.view',
        Share: 'projects.share'  // enterprise
    },
    DATA_SCIENCE_DASHBOARD: {
        View: 'datasciencedashboard.view',
    },
    DATA_MAPPING: {
        View: 'datamapping.view',
    },    
    SCENARIOS: {
        View: 'scenarios.view',
        Share: 'scenarios.share'  // enterprise
    },
    MODEL: {
        PropertyConstraints: 'model.property.constraints',        
        ExportModel: 'model.export.model',
        ExportCypher: 'model.export.cypher',
        ExportConstraints: 'model.export.constraints',            
        ExportHtml: 'model.export.html',
        ExportMarkdown: 'model.export.markdown',
		ExportSVG: 'model.export.svg',
		ParseCypher: 'model.parse.cypher',
		ImportModel: 'model.import.model',
		ImportModelFromApoc: 'model.import.modelFromApoc',
		ImportModelFromArrows: 'model.import.modelFromArrows',
		ImportModelFromDatabase: 'model.import.modelFromDatabase',  
		ForceLayout: 'model.layout.forceLayout',
		LeftToRightLayout: 'model.layout.leftToRight',
		TopToBottomLayout: 'model.layout.topToBottom',
		Share: 'model.share',                                     // enterprise
		RelationshipCardinality: 'model.relationshipCardinality',
        ValidateModel: 'model.validate' 
    },
    DATABASES: {    // enterprise
        View: 'databases.view',
		New: 'databases.new',
		Share: 'databases.share'
    },
    CYPHER_BUILDER: {   // enterprise
        View: 'cypherbuilder.view',
        Share: 'cypherbuilder.share'  // enterprise
    },
    CYPHER_SUITE: {   // enterprise
        View: 'cyphersuite.view',
        Share: 'cyphersuite.share'  // enterprise
    },
    DASHBOARD: {
        View: 'dashboard.view',
		New: 'dashboard.new'
    }
}

export const BASIC_FEATURES = [
    FEATURES.MODEL.ExportModel,
    FEATURES.MODEL.ExportCypher,
    FEATURES.MODEL.ExportConstraints,
    FEATURES.MODEL.ExportMarkdown,
    FEATURES.MODEL.ExportHtml,
    FEATURES.MODEL.ExportSVG,
    FEATURES.MODEL.ImportModel,
    FEATURES.MODEL.ImportModelFromApoc,
    FEATURES.MODEL.ImportModelFromArrows,
    FEATURES.MODEL.ImportModelFromDatabase,
    FEATURES.MODEL.ForceLayout,
    FEATURES.MODEL.LeftToRightLayout,
    FEATURES.MODEL.TopToBottomLayout,
    FEATURES.MODEL.ParseCypher,
    FEATURES.MODEL.PropertyConstraints,
    FEATURES.MODEL.RelationshipCardinality,
    FEATURES.DATABASES.View,
    FEATURES.DATABASES.New,
    FEATURES.CYPHER_BUILDER.View,
    FEATURES.DASHBOARD.View,
    FEATURES.SCENARIOS.View,
    FEATURES.PROJECTS.View,
    FEATURES.DATA_SCIENCE_DASHBOARD.View,
    FEATURES.DATA_MAPPING.View,
    FEATURES.CYPHER_SUITE.View
];

export const LABS_FEATURES = Object.values(FEATURES)
    .map(featureObjects => Object.values(featureObjects))
    .reduce((allFeatures, currentFeatures) => allFeatures.concat(currentFeatures))

export const ENTERPRISE_FEATURES = Object.values(FEATURES)
    .map(featureObjects => Object.values(featureObjects))
    .reduce((allFeatures, currentFeatures) => allFeatures.concat(currentFeatures))

export var BasicFeatureSet = new Set(BASIC_FEATURES);

var licensedFeaturesHaveBeenSet = false;
var licensedFeatures = new Set();
const basicLicenseMessage = 'This feature is not available in the Basic edition.  Upgrade to activate this feature.';

export const getBasicLicenseMessage = function () {
    return basicLicenseMessage;
}

export const showUpgradeLicenseMessage = () => {
    alert(
        'Please upgrade your license to use this feature', 
        ALERT_TYPES.WARNING,
        null,
        `Your current license (${window.licenseInfo.type}) does not include this feature. Please contact 
        your Neo4j representative on how to upgrade your license.`);
}

export const showMaxReachedUpgradeLicenseMessage = (maxedThing) => {
    alert(
        `You have reached the maximum number of licensed ${maxedThing}`, 
        ALERT_TYPES.WARNING,
        null,
        `Your current license (${window.licenseInfo.type}) restricts the total number of ${maxedThing}. Please contact 
        your Neo4j representative on how to upgrade your license.`);
}

export const hasBasicLicense = () => {
    const licenseType = (window.licenseInfo && window.licenseInfo.type) ? window.licenseInfo.type : LICENSE_TYPES.Cloud_Basic;
    return (licenseType === LICENSE_TYPES.Cloud_Basic || licenseType === LICENSE_TYPES.Basic);
}

export const haveLicensedFeaturesBeenSet = () => {
    return licensedFeaturesHaveBeenSet;
}

export const getLicensedFeatures = () => {
    return licensedFeatures;
}

export const setLicensedFeatures = (arrayOfFeatures) => {
    licensedFeaturesHaveBeenSet = true;
    licensedFeatures = new Set(arrayOfFeatures);
}

export const isFeatureLicensed = (feature) => {
    return isFeatureLicensedEx(feature);
}

export const anyFeatureLicensed = (features) => {
    return anyFeatureLicensedEx(features);
}

export const getLicensedTools = () => {
    var allowedToolKeys = Object.keys(FEATURES).filter(toolKey => {
        var licensedToolFeatures = Object.values(FEATURES[toolKey]).filter(feature => isFeatureLicensed(feature));
        return licensedToolFeatures.length > 0;
    })
    return allowedToolKeys.map(toolKey => TOOL_NAMES[toolKey]);
}

export const isToolLicensed = (toolName) => {
    var licensedTools = getLicensedTools();
    return licensedTools.includes(toolName);
}
