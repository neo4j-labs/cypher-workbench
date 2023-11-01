
import {
    runBigQuery
} from "./bigQuery/bigQuery";
import axios from "axios";
import { data } from './../data/neo4jtobigquery'
const qs = require('qs');
import { getUserAsymmetricDecryptionKeys } from './users';
import { decrypt } from "../util/encryption";

const bigQueryLocation = process.env.BIG_QUERY_LOCATION || 'US';

export const getDataSourceSchema = async (connectionInfo, context) => {
    // TODO: connect to big query, get JSON response, return
    console.log('getDataSourceSchema connectionInfo: ', connectionInfo);
    return { connectionInfo }
};

export const runJob = async (jobInfo, context) => {
    console.log('runJob jobInfo: ', jobInfo);
    return { jobInfo }
}

export const runJobAsync = async (jobInfo, context) => {
    console.log('runJobAsync jobInfo: ', jobInfo);
    return { jobInfo }
}

export const jobStatus = async (jobId, context) => {
    console.log('job status jobId: ', jobId);
    return { jobId: jobId, status: 'TODO' }
}

export const getProjects = async (context) => {
    // https://cloud.google.com/bigquery/docs/reference/rest/v2/projects/list
    // GET https://bigquery.googleapis.com/bigquery/v2/projects
    const data = await axios.get("https://bigquery.googleapis.com/bigquery/v2/projects");
    return data;
}

export const getDatasets = async (projectId, context) => {
    const query = `
        SELECT
            schema_name
        FROM
        \`${projectId}\`.INFORMATION_SCHEMA.SCHEMATA    
    `;
    return runBigQuery(query, bigQueryLocation);
}

export const getDatasetSchema = async (projectId, datasetId, context) => {
    const query = `
        SELECT
            * EXCEPT(is_generated, generation_expression, is_stored, is_updatable, clustering_ordinal_position)
        FROM
        \`${projectId}\`.${datasetId}.INFORMATION_SCHEMA.COLUMNS
    `;
    return runBigQuery(query, bigQueryLocation);
}

export const getJobDetails = async (id, service, context) => {
    const url = `${getHopHostUrl()}/hop/asyncStatus/?service=${service}&id=${id}`;
    const response = await axios.get(url, {
        auth: {
            username: getHopHttpAuthorizationUser(),
            password: getHopHttpAuthorizationPassword()
        }
    })
        .catch((error) => { console.log(error) });
    //console.log(response.data);
    return response.data
}

const getHopHostUrl = () => process.env.HOP_HOST_URL || 'http://<ip-addr>';

const getHopHttpAuthorizationUser = () => process.env.HOP_HTTP_AUTHORIZATION_USER || '<user>';

const getHopHttpAuthorizationPassword = () => process.env.HOP_HTTP_AUTHORIZATION_PASSWORD || '<pass>';

const getHopHttpAuthorizationHeader = () => {
    const user = getHopHttpAuthorizationUser();
    const password = getHopHttpAuthorizationPassword();
    // Y2x1c3RlcjpjbHVzdGVy - value if using cluster:cluster
    const value = new Buffer.from(`${user}:${password}`).toString('base64');
    //console.log('base64 authorization header: ', value);
    return `Basic ${value}`;
}

export const getPipelineDetails = async (serviceId, context) => {
    const url = `${getHopHostUrl()}/hop/asyncRun/?service=${serviceId}`;
    const response = await axios.get(url,
        {
            headers: {
                'Authorization': getHopHttpAuthorizationHeader(),
                'Content-Type': 'application/json',
                "maxContentLength": 100000000,
                "maxBodyLength": 1000000000
            }
        })
        .catch((error) => { console.log(error) });
    // console.log(response.data)
    return response.data
};

export const getAllJobs = async (context) => {
    const url = `${getHopHostUrl()}/hop/status/?json=Y`;
    const response = await axios.get(url,
        {
            headers: {
                'Authorization': getHopHttpAuthorizationHeader(),
                'Content-Type': 'application/json',
                "maxContentLength": 100000000,
                "maxBodyLength": 1000000000
            }
        })
        .catch((error) => { console.log(error) });
    //console.log(response.data)
    return response.data
};

export const runWorkflow = async (serviceId, mappingData, context) => {
    const mappingObj = JSON.parse(mappingData);
    const { dest } = mappingObj;

    const newDestConnectionInfo = await decryptNeo4jConnectionInfo(dest.neoConnectionInfo, context.email);

    var newMappingObj = { ...mappingObj };
    newMappingObj.dest = { ...dest, neoConnectionInfo: newDestConnectionInfo };

    //console.log('newMappingObj: ', newMappingObj);
    const newMappingJson = JSON.stringify(newMappingObj);
    //console.log('newMappingJson: ', newMappingJson);

    const url = `${getHopHostUrl()}/hop/asyncRun/?service=${serviceId}`;
    var config = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': getHopHttpAuthorizationHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data: newMappingJson
    };
    //return {};
    const response = await axios(config)
        .catch((error) => { console.log(error) })
    return response.data;
};

const decryptNeo4jConnectionInfo = async (neoConnectionInfo, email) => {

    var keysToFetch = [neoConnectionInfo.encryptedUsernamePublicKey, neoConnectionInfo.encryptedPasswordPublicKey];
    const asymmetricDecryptionKeys = await getUserAsymmetricDecryptionKeys(keysToFetch, email);
    //console.log(keysToFetch);
    //console.log(email);
    //console.log('asymmetricDecryptionKeys: ', asymmetricDecryptionKeys);
    const userKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[0] };
    //console.log(asymmetricDecryptionKeys[0]);
    //console.log(asymmetricDecryptionKeys[1]);
    //console.log(neoConnectionInfo.encryptedUsername);
    //console.log(neoConnectionInfo.encryptedPassword);
    const passwordKeys = { asymmetricDecryptionKey: asymmetricDecryptionKeys[1] };
    const neoUsername = decrypt(neoConnectionInfo.encryptedUsername, userKeys);
    const neoPassword = decrypt(neoConnectionInfo.encryptedPassword, passwordKeys);

    var newConnectionInfo = {
        ...neoConnectionInfo,
        username: neoUsername,
        password: neoPassword
    }
    delete newConnectionInfo.graphQLNeoProxy;
    delete newConnectionInfo.encryptedUsername;
    delete newConnectionInfo.encryptedUsernamePublicKey;
    delete newConnectionInfo.encryptedPassword;
    delete newConnectionInfo.encryptedPasswordPublicKey;

    return newConnectionInfo;
}

export const runNeo4jToBigQuery = async (serviceId, cypherStatementJSON, context) => {

    //console.log(cypherStatementJSON);
    const cypherStatementObj = JSON.parse(cypherStatementJSON);
    const { neoConnectionInfo } = cypherStatementObj;

    const newConnectionInfo = await decryptNeo4jConnectionInfo(neoConnectionInfo, context.email);
    var newCypherStatementObj = {
        ...cypherStatementObj,
        neoConnectionInfo: newConnectionInfo
    }
    const newCypherStatement = JSON.stringify(newCypherStatementObj);
    
    const url = `${getHopHostUrl()}/hop/asyncRun/?service=${serviceId}`;
    var config = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': getHopHttpAuthorizationHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data: newCypherStatement
    };
    //console.log('*** for testing config, remove after testing ***: ', config);
    //return {};
    const response = await axios(config)
        .catch((error) => { console.log(error) })
    return response.data;
};

export const runNeo4jToNeo4j = async (serviceId, neoMapping, context) => {
    //console.log(neoMapping)
    const neoMappingObj = JSON.parse(neoMapping);
    //console.log(neoMappingObj);
    const { source, dest } = neoMappingObj;

    const newSourceConnectionInfo = await decryptNeo4jConnectionInfo(source.neoConnectionInfo, context.email);
    const newDestConnectionInfo = await decryptNeo4jConnectionInfo(dest.neoConnectionInfo, context.email);

    var newNeoMappingObj = { ...neoMappingObj };
    newNeoMappingObj.source = { ...source, neoConnectionInfo: newSourceConnectionInfo };
    newNeoMappingObj.dest = { ...dest, neoConnectionInfo: newDestConnectionInfo };

    //console.log('newNeoMappingObj: ', newNeoMappingObj);
    const neotoneoMapping = JSON.stringify(newNeoMappingObj);
    //console.log(neotoneoMapping);

    const url = `${getHopHostUrl()}/hop/asyncRun/?service=${serviceId}`;
    var config = {
        method: 'post',
        url: url,
        headers: {
            'Authorization': getHopHttpAuthorizationHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data: neotoneoMapping
    };
    //return {};
    const response = await axios(config)
        .catch((error) => { console.log(error) })
    return response.data;
};


const testDecryptSamplePayload = async () => {
    const samplePayload = `sample-payload-goes-here`
    //console.log(JSON.parse(samplePayload));
    const cypherStatementObj = JSON.parse(samplePayload);
    const { neoConnectionInfo } = cypherStatementObj;

    var result = await decryptNeo4jConnectionInfo(neoConnectionInfo, 'first.last@email.com');
    //console.log(result);
}
//testDecryptSamplePayload();