import fs from "fs";
import path from "path";
import { sign } from "tweetnacl";
import {
    decodeBase64
  } from "tweetnacl-util";
import { decryptSymmetric } from '../util/encryption';
import { Joiner, LicenseFileKeys } from './licenseKeyConstants';

export const LicenseRestriction = {
    MaxNumberOfModels: "MaxNumberOfModels",
    MaxNumberOfDatabases: "MaxNumberOfDatabases",
    MaxNumberOfGraphDocs: "MaxNumberOfGraphDocs"    
}

var licenseDirectory = null;
var licenseInfo = null;
var licenseError = '';

export const setLicenseDirectory = (directory) => licenseDirectory = directory;

export const loadLicense = () => {
    if (!licenseInfo) {
        const licensePath = path.join(licenseDirectory, "license.lic");
        var rawLicenseData = fs.readFileSync(process.env.LICENSE_FILE || licensePath)
            .toString();

        rawLicenseData = rawLicenseData.replace(/[\n\r]/g,'');
        const licenseAndSignature = rawLicenseData.match(/^====.+==== (.+)$/)[1];
        //console.log(rawLicenseData.match(/^====.+==== (.+)/));
        const [license, signature] = licenseAndSignature.split(Joiner);
        var decodedLicense = decodeBase64(license);
        var decodedSignature = decodeBase64(signature);
        const decodedSigningPublicKey = decodeBase64(LicenseFileKeys.SigningPublicKey);
        const isValid = sign.detached.verify(decodedLicense, decodedSignature, decodedSigningPublicKey);
        if (isValid) {
            licenseInfo = decryptSymmetric(license, LicenseFileKeys.SymmetricKey);
        } else {
            licenseError = 'License signature cannot be verified';
        } 
    }
}

export const getLicenseError = () => licenseError;

export const isLicenseValid = () => {
    try {
        loadLicense();
        return !licenseError;
    } catch (e) {
        licenseError = `${e}`;
        return false;
    }
}

export const isCloudLicense = () => {
    try {
        loadLicense();
        return licenseInfo.license_type === 'Cloud';
    } catch (e) {
        licenseError = `${e}`;
        return false;
    }
}

export const getLicenseInfo = () => {
    try {
        loadLicense();
        return licenseInfo;
    } catch (e) {
        licenseError = `${e}`;
        return {};
    }
}

export const getLicenseRestriction = (restrictionName) => {
    try {
        loadLicense();
        return licenseInfo.restrictions[restrictionName];
    } catch (e) {
        licenseError = `${e}`;
        return 0;
    }
}

