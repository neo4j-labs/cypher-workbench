import { getGraqhQLConnection } from './authGraphql';
import { gql } from "@apollo/client";

const showError = (error) => {
    const messageString = 'Error fetching branding info';
    console.log(messageString, error);
    //alert(`${messageString}: ${JSON.stringify(error)}`);
}

export const fetchBrandingInfo = () => {
    
    return new Promise((resolve, reject) => {
        const uri = process.env.REACT_APP_HIVE_URI;
        const token = localStorage.getItem("id_token");
        var authorization = token ? `Bearer ${token}` : ''
        var graphQLConnection = getGraqhQLConnection(uri, authorization);
        graphQLConnection.query({
            query: gql`
                query GetBrandingInfo {
                    brandingInfo:getBrandingInfo {
                        logourl
                        logoheight
                        primaryColor
                        secondaryColor
                    }
                }
                `
        })
        .then((result) => {
            const { data, errors } = result;
            if (errors) {
                showError(errors)
                reject();
            }
            if (!data.brandingInfo) {
                showError('brandingInfo is not in response')
                reject();
            }
            resolve(data.brandingInfo);
        })
        .catch((error) => {
            showError(error)
            reject();
        });
    })
}
