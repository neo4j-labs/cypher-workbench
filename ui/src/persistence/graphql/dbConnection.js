import { gql } from "@apollo/client";

const ALL_DB_CONNECTIONS_FOR_USER = gql`
  query {
    dbConnections: allDBConnectionsForUser {
      id
      name
      url
      databaseName
      encrypted
      proxyThroughAppServer
      labels
      isPrivate
      canCurrentUserEdit
      canCurrentUserDelete
      dbInfo {
        isConnected
        license
        versions
        hasApoc
      }
      users {
        role
        email
        picture
      }
    }
  }
`;

const CREATE_DB_CONNECTION = gql`
  mutation CreateDBConnection($input: CreateDBConnectionInput) {
    dbConnection: createDBConnection(input: $input) {
      id
    }
  }
`;

const EDIT_DB_CONNECTION = gql`
  mutation EditDBConnection($id: ID!, $properties: EditDBConnectionInput) {
    dbConnection: editDBConnection(id: $id, properties: $properties) {
      id
    }
  }
`;

const DELETE_DB_CONNECTION = gql`
  mutation DeleteDBConnection($id: ID!) {
    dbConnection: deleteDBConnection(id: $id) {
      id
    }
  }
`;

const GET_DB_PROPERTIES = gql`
  query GetDBProperties($id: ID!, $label: String!) {
    dbConnection(id: $id) {
      propertyNames(label: $label)
    }
  }
`;

export {
  ALL_DB_CONNECTIONS_FOR_USER,
  CREATE_DB_CONNECTION,
  EDIT_DB_CONNECTION,
  DELETE_DB_CONNECTION,
  GET_DB_PROPERTIES
};
