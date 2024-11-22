/*
import { ApolloClient } from "apollo-boost";
import { InMemoryCache } from 'apollo-cache-inmemory';
import { HttpLink } from 'apollo-link-http';
import { gql } from "@apollo/client";
import { getDynamicConfigValue } from '../../dynamicConfig';

const cache = new InMemoryCache({
    resultCaching: false
});

var links = {};
var clients = {};

// see example: https://www.apollographql.com/docs/react/networking/authentication/
function getLink (idToken) {
    if (!links[idToken]) {
        links[idToken] = new HttpLink({
            uri: getDynamicConfigValue("REACT_APP_ADMIN_APP_GRAPHQL_URI") || "ADMIN_APP_GRAPHQL_URI not specified",
            headers: {
                authorization: idToken ? `Bearer ${idToken}` : ""
            }
       });
    }
   return links[idToken];
}

// disable the cache because Apollo doesn't understand the updates I am performing 
const defaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
  },
  query: {
    fetchPolicy: 'no-cache',
  }
}

export function getClient (idToken) {
    if (!clients[idToken]) {
        clients[idToken] = new ApolloClient({
            cache: cache,
            link: getLink(idToken),
            defaultOptions: { ...defaultOptions }
        });
    }
    return clients[idToken];
}

const CHECK_IF_VALID_USER = gql`
    query CheckIfValidUser ($email: String!) {
    userOk: checkUser (email: $email) 
}`;

export async function checkIfValidUser (idToken, email) {

    var doGraphQLCall = function () {
        return new Promise((resolve, reject) => {
            getClient(idToken).query({
              query: CHECK_IF_VALID_USER,
              variables: {
                  email: email
              }
            })
            .then((result) => {
                var { data } = result;
                if (data && data.userOk) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false });
                }
            })
            .catch((error) => {
                resolve({ success: false, error: error })
            });
        });
    }

    var user = await doGraphQLCall();
    return user;
}

*/