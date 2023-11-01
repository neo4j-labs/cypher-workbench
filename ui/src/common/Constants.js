
import chroma from 'chroma-js';

export const ALERT_TYPES = {
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
    SUCCESS: "success"
};

export const USER_ROLE = {
    OWNER: "OWNER",
    MEMBER: "MEMBER",
    VIEWER: "VIEWER"
}

export const OTHER_COLORS = {
    ScenarioCypherValidationAddLink: "#498BBC"
}

export const DEFAULT_COLORS = {
    primary: "#2E8CC1",
    secondary: "#62B244",
    toolBarFontColor: "#FFFFFF",
    secondaryToolBarColor: "#2E8CC1"
}

export const LIGHTEST_POSSIBLE_TOOLBAR = {
    primary: "#E4E4E4",
    fontColor: "#404040"
}

export var COLORS = { ...DEFAULT_COLORS };

export const updateConstColors = ({primary, secondary}) => {
    if (primary) {
        COLORS.primary = computePrimaryColor(primary);
    }
    if (secondary) {
        COLORS.secondary = computeSecondaryColor(primary, secondary);
    }
    if (primaryIsTooLight(primary)) {
        COLORS.toolBarFontColor = COLORS.primary;
        if (chroma(COLORS.secondary).luminance() < 0.1) {
            COLORS.secondaryToolBarColor = chroma(COLORS.secondary).brighten();
        } else {
            COLORS.secondaryToolBarColor = COLORS.secondary;
        }
    } else {
        COLORS.toolBarFontColor = COLORS.secondary;
        COLORS.secondaryToolBarColor = COLORS.primary;
    }
}

const primaryIsTooLight = (primaryColor) => {
    const lightestLuminance = chroma(LIGHTEST_POSSIBLE_TOOLBAR.primary).luminance();
    var luminance = chroma(primaryColor).luminance();
    if (luminance > lightestLuminance) {
        return true;
    } else {
        return false;
    }
}

const computePrimaryColor = (primaryColor) => {
    if (!primaryColor) {
        return DEFAULT_COLORS.primary;
    } else {
        if (primaryIsTooLight(primaryColor)) {
            return LIGHTEST_POSSIBLE_TOOLBAR.primary;
        } else {
            return primaryColor;
        }
    }
  }

const computeSecondaryColor = (primaryColor, secondaryColor) => {
    if (!secondaryColor) {
        return DEFAULT_COLORS.toolBarFontColor;
    } else {
        if (primaryIsTooLight(primaryColor)) {
            const fontLuminance = chroma(LIGHTEST_POSSIBLE_TOOLBAR.fontColor).luminance();            
            var secondaryLuminance = chroma(secondaryColor).luminance();
            if (secondaryLuminance > fontLuminance) {
                return LIGHTEST_POSSIBLE_TOOLBAR.fontColor;
            } else {
                return secondaryColor;
            }
        } else {
            return secondaryColor;
        }
    }
  }

