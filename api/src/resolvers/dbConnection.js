import {
  allDBConnectionsForUser,
  findDBConnection,
  createDBConnection,
  deleteDBConnection,
  getSchema,
  executeCypherQuery,
  getLabels,
  getPropertyNames,
  checkDBInfo,
  editDBConnection,
  getUsersForDB,
  canCurrentUserEdit,
  canCurrentUserDelete
} from "../models/dbConnection";

export default {
  Query: {
    dbConnection: async (root, { id }, context) => {
      return await findDBConnection(id, context);
    },
    getSchema: async  (root, { input }, context) => {
      return await getSchema(input, context);
    },
    executeCypherQuery: async  (root, { input }, context) => {
      return await executeCypherQuery(input, context);
    },
    allDBConnectionsForUser: async (root, args, context) => {
      return await allDBConnectionsForUser(context);
    }
  },
  Mutation: {
    createDBConnection: async (root, { input }, context) => {
      return await createDBConnection(input, context);
    },
    editDBConnection: async (root, { id, properties }, context) => {
      return await editDBConnection(id, properties, context);
    },
    deleteDBConnection: async (root, { id }, context) =>
      await deleteDBConnection(id, context)
  },
  DBConnectionEx: {
    dbInfo: async (DBConnection, {}, context) => {
      return await checkDBInfo(DBConnection.id, context);
    },
    users: async (DBConnection, {}, context) => {
      return await getUsersForDB(DBConnection.id, context);
    },
    canCurrentUserEdit: async (DBConnection, {}, context) => {
      return await canCurrentUserEdit(DBConnection.id, context);
    },
    canCurrentUserDelete: async (DBConnection, {}, context) => {
      return await canCurrentUserDelete(DBConnection.id, context);
    },
    labels: async (DBConnection, {}, context) => {
      return [];
    },
    propertyNames: async (DBConnection, { label }, context) => {
      return [];
    }
  }
};
