
import { 
    getLicenseInfo
} from '../../persistence/graphql/GraphQLPersistence';
import {
    LICENSE_TYPES
} from '../LicensedFeatures';

export const getEulaFile = async () => {
    var licenseInfo = await getLicenseInfo();  
    if (licenseInfo.success) {
        licenseInfo = licenseInfo.licenseInfo;

    } else {
      //alert(`Error fetching license info: ${licenseInfo.error}`);
      console.log(`Error fetching license info: ${licenseInfo.error}`);
      return;
    }
    //console.log('licenseInfo: ', licenseInfo);
    var licenseEulaFile = 'CypherWorkbenchEULA.html';
    switch (licenseInfo.type) {
      case LICENSE_TYPES.Basic:
      case LICENSE_TYPES.Cloud_Basic:
        licenseEulaFile = 'CypherWorkbenchEULA_Basic.html'
        //console.log('promise resolving License file is: ', licenseEulaFile);
        break;
      case LICENSE_TYPES.Enterprise:
      case LICENSE_TYPES.Cloud_Enterprise:
        licenseEulaFile = 'CypherWorkbenchEULA_Enterprise.html'
        //console.log('promise resolving License file is: ', licenseEulaFile);
        break;
      case LICENSE_TYPES.EnterpriseTrial:
      case LICENSE_TYPES.Cloud_EnterpriseTrial:
        licenseEulaFile = 'CypherWorkbenchEULA_EnterpriseTrial.html'
        //console.log('promise resolving License file is: ', licenseEulaFile);
        break;
      }
  //console.log('License file is: ', licenseEulaFile);
  return licenseEulaFile;
}