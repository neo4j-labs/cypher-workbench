
import { gql } from "@apollo/client";
import { getClient, handleError } from './GraphQLPersistence';

const listResult = `
    key
    subKey
    cypherWorkbenchVersion
    title
    dateCreated
    dateUpdated
    description
    isPublic
    userRole
    userIsCreator
    tags {
        key
        tag
    }
    customers {
        key
        name
    }
    owners {
        email
    }
    cypher
    isVisualCypher
`

export function listCypherStatements (myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
          query ListCypherStatements ($myOrderBy: String, $orderDirection: String) {
              listCypherStatementsX(myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
                ${listResult}
              }
          }
          `,
          variables: {
              myOrderBy: myOrderBy,
              orderDirection: orderDirection
          }
      })
      .then(result => {
          callback({ success: true, data: result.data });
      })
      .catch((error) => {
          //console.log("listRemoteGraphDocMetadata error", error);
          handleError(listCypherStatements, arguments, callback, error, doTokenExpiredErrorHandling);
      });
  }
  
export function searchForCypherStatements (searchText, myOrderBy, orderDirection, callback, doTokenExpiredErrorHandling = true) {
    getClient()
      .query({
        query: gql`
            query SearchCypherStatements ($searchText: String, $myOrderBy: String, $orderDirection: String) {
                searchCypherStatementsX(searchText: $searchText, myOrderBy: $myOrderBy, orderDirection: $orderDirection) {
                  ${listResult}
                }
            }
          `,
          variables: {
              searchText: searchText,
              myOrderBy: myOrderBy,
              orderDirection: orderDirection
          }
      })
      .then(result => {
          callback({ success: true, data: result.data });
      })
      .catch((error) => {
          handleError(searchForCypherStatements, arguments, callback, error, doTokenExpiredErrorHandling);
      });
  }
  
export function associateScenarioToCypher (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, isVisualCypher, callback, doTokenExpiredErrorHandling = true) {

    getClient().mutate({
      mutation: gql`
        mutation AssociateScenarioToCypher ($scenarioGraphDocKey: String, $scenarioKey: String, $cypherGraphDocKey: String, $cypherKey: String, $isVisualCypher: Boolean) {
            associateScenarioToCypher(scenarioGraphDocKey: $scenarioGraphDocKey, scenarioKey: $scenarioKey, cypherGraphDocKey: $cypherGraphDocKey, cypherKey: $cypherKey, isVisualCypher: $isVisualCypher)
        }
      `,
      variables: {
        scenarioGraphDocKey,
        scenarioKey, 
        cypherGraphDocKey,
        cypherKey,
        isVisualCypher
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("associateScenarioToCypher response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "AssociateScenarioToCypher did not return true" });
        }
    })
    .catch((error) => {
        handleError(associateScenarioToCypher, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}

export function removeScenarioToCypherAssociation (scenarioGraphDocKey, scenarioKey, cypherGraphDocKey, cypherKey, callback, doTokenExpiredErrorHandling = true) {

    getClient().mutate({
      mutation: gql`
        mutation RemoveScenarioToCypherAssociation ($scenarioGraphDocKey: String, $scenarioKey: String, $cypherGraphDocKey: String, $cypherKey: String) {
            removeScenarioToCypherAssociation(scenarioGraphDocKey: $scenarioGraphDocKey, scenarioKey: $scenarioKey, cypherGraphDocKey: $cypherGraphDocKey, cypherKey: $cypherKey)
        }
      `,
      variables: {
        scenarioGraphDocKey,
        scenarioKey, 
        cypherGraphDocKey,
        cypherKey
      }
    })
    .then((result) => {
        var { data } = result;
        //console.log("removeScenarioToCypherAssociation response");
        ////console.log(data);

        if (data) {
            callback({ success: true });
        } else {
            callback({ success: false, error: "RemoveScenarioToCypherAssociation did not return true" });
        }
    })
    .catch((error) => {
        handleError(removeScenarioToCypherAssociation, arguments, callback, error, doTokenExpiredErrorHandling);
    });
}
