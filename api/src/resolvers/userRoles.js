import {
    getUserRolesForDataModel,
    getUserRolesForGraphDoc,
    updateUserRoles,
    updateUserRolesGraphDoc,
    updateDatabaseUserRoles
} from "../models/userRoles";

  export default {
    Query: {
      getUserRolesForDataModel: async (root, args, context, info) => {
        return await getUserRolesForDataModel(args.dataModelKey, context);
      },
      getUserRolesForGraphDoc: async (root, args, context, info) => {
        return await getUserRolesForGraphDoc(args.key, context);
      }
    },
    Mutation: {
      updateUserRoles: async (obj, args, context, resolveInfo) => {
          return await updateUserRoles(args.dataModelKey, args.isPublic, args.userRoles, context);
      },
      updateUserRolesGraphDoc: async (obj, args, context, resolveInfo) => {
        return await updateUserRolesGraphDoc(args.key, args.isPublic, args.userRoles, context);
      },
      updateDatabaseUserRoles: async (obj, args, context, resolveInfo) => {
          return await updateDatabaseUserRoles(args.databaseId, args.userRoles, context);
      }
    }
  };
