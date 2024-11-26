
import { getLicensedFeatures } from './LicensedFeatures';

export const isFeatureLicensedEx = (feature) => {
    return getLicensedFeatures().has(feature);
}

export const anyFeatureLicensedEx = (features) => {
    const licensedFeatures = getLicensedFeatures();
    return (features.find(x => licensedFeatures.has(x))) ? true : false;
}
