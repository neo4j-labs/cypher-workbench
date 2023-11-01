import { gql } from "@apollo/client";
import { getClient, handleError } from "./GraphQLPersistence";

export function editKeymakerPhase(
  phaseId,
  cypherQuery,
  cypherWorkbenchCypherBuilderKey,
  callback,
  doTokenExpiredErrorHandling = true
) {
  getClient()
    .query({
      query: gql`
        mutation EditPhase($id: ID!, $input: EditPhaseInput!) {
          editPhase(id: $id, input: $input) {
            id
          }
        }
      `,
      variables: {
        id: phaseId,
        input: {
          cypherQuery,
          cypherWorkbenchCypherBuilderKey,
        },
      },
    })
    .then((result) => {
      callback({ success: true, data: result.data.editKeymakerPhase });
    })
    .catch((error) => {
      console.log(error);
      handleError(
        editKeymakerPhase,
        arguments,
        callback,
        error,
        doTokenExpiredErrorHandling
      );
    });
}
