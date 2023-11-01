const axios = require("axios");
const dotenv = require("dotenv");
const { listDataModelsX, searchDataModelsX, loadDataModel } = require("./clientGraphQLRequests");

dotenv.config();

const getAuth0Token = async () => {
  const body = {
    client_id: process.env.AUTH0_API_KEY_CLIENT_ID,
    client_secret: process.env.AUTH0_API_KEY_CLIENT_SECRET,
    audience: process.env.AUTH0_API_KEY_AUDIENCE,
    grant_type: "client_credentials"
  }
  return new Promise((resolve, reject) => {
    axios.post(process.env.AUTH0_URL, body, {
        headers: {
            'content-type': 'application/json'
        }})
        .then(response => {
          resolve(response.data);
        })
        .catch(error => {
          reject(error);
        });
  })
}

const getListDataModelsXRequest = () => {
    return {
        operationName: 'listDataModelsX',
        body: {
            query: listDataModelsX,
            variables: {
                myOrderBy: 'dateUpdated',   // other valid value: 'title'
                orderDirection: 'DESC',     // other valid value: 'ASC'
                skip: 0,                    // optional
                limit: 5                    // optional
            }
        }
    }
}

const getSearchDataModelsXRequest = () => {
    return {
        operationName: 'searchDataModelsX',
        body: {
            query: searchDataModelsX,
            variables: {
                searchText: 'Model',        // search text to model titles and descriptions
                myOrderBy: 'dateUpdated',
                orderDirection: 'DESC',
                skip: 0,                    // optional
                limit: 5                    // optional
            }
        }
    }
}

const getLoadDataModelRequest = (dataModelKey) => {
    return {
        operationName: 'loadDataModel',
        body: {
            query: loadDataModel,
            variables: {
                dataModelKey: dataModelKey,
                updateLastOpenedModel: false
            }
        }
    }
}

const getDataFromResponse = (response) => {
    return (response && response.data) 
        ? (response.data.data) 
            ? response.data.data : response.data
        : response;
}

const getErrorFromResponse = (error) => {
    return (error && error.response && error.response.data && error.response.data.errors)
        ? error.response.data.errors
        : error ;
}

const getDataModelList = async (access_token, email) => {
    const { body, operationName } = getListDataModelsXRequest();
    //const { body, operationName } = getSearchDataModelsXRequest();
    return new Promise((resolve, reject) => {
        axios.post(process.env.API_URI, body, {
            headers: {
                'content-type': 'application/json',
                'solutions-workbench-email': email,
                'authorization': `Bearer ${access_token}`
            }})
            .then(response => {
              const data = getDataFromResponse(response);
              const graphQLResponse = data[operationName];  
              resolve(graphQLResponse);              
            })
            .catch(error => {
              reject(getErrorFromResponse(error));
            });
        });
}

const getDataModel = async (access_token, email, modelKey) => {
    const { body, operationName } = getLoadDataModelRequest(modelKey);
    //console.log('body: ', body);
    return new Promise((resolve, reject) => {
        axios.post(process.env.API_URI, body, {
            headers: {
                'content-type': 'application/json',
                'solutions-workbench-email': email,
                'authorization': `Bearer ${access_token}`
            }})
            .then(response => {
              const data = getDataFromResponse(response);
              const graphQLResponse = data[operationName];  
              resolve(graphQLResponse);              
            })
            .catch(error => {
              reject(getErrorFromResponse(error));
            });
        });
}

const testApiClient = async () => {

    try {
        const auth0Token = await getAuth0Token();
        if (auth0Token && auth0Token.access_token) {
            console.log('access_token: ', auth0Token.access_token);
            const email = process.env.TEST_EMAIL;
            const dataModelList = await getDataModelList(auth0Token.access_token, email);
            console.log('dataModelList: ', dataModelList);

            dataModelList.forEach(async (model) => {
                console.log(`requesting data model for key: ${model.key}`);
                try {
                    const dataModel = await getDataModel(auth0Token.access_token, email, model.key);
                    console.log(dataModel);
                } catch (e2) {
                    console.log('error fetching data model: ', e2);
                }
            });
        } else {
            console.log('no auth0Token returned')
        }
    } catch (e) {
        console.log('Error: ', e);
    }
}

testApiClient();
