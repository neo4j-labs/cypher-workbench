import { ApolloClient } from "@apollo/client/core";
import { InMemoryCache } from '@apollo/client/cache';
import { HttpLink } from '@apollo/client';

const defaultOptions = {
    watchQuery: {
      fetchPolicy: 'no-cache',
    },
    query: {
      fetchPolicy: 'no-cache',
    }
  }

function getLink (uri, authorizationInfo) {
    var headers = {};
    if (authorizationInfo) {
        headers.authorization = authorizationInfo;
    }
    return new HttpLink({
        uri: uri,
        headers: headers
    });
}

export const getGraqhQLConnection = (uri, authorizationInfo) => {
    const cache = new InMemoryCache({
        resultCaching: false
      });
    
    return new ApolloClient({
        cache: cache,
        link: getLink(uri, authorizationInfo),
        defaultOptions: { ...defaultOptions }
      });

}