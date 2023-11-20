import {
    createUser,
    createUserSignUp,
    getCurrentUser,
    getUserSettings,
    getLicensedFeatures,
    getLicenseInfoEx,
    updateUserSettings,
    updateUserPrimaryOrganization,
    logInLocalUser,
    acceptedEula,
    isAdmin,
    isCurrentUser,
    decryptAsymmetricEncryptedItems,
    getSystemMessages,
    acknowledgeMessages
  } from "../models/users";
  import {
      searchForItem
  } from "../models/datamodel";

  export default {
    Query: {
      getCurrentUser: async (root, args, context) => {
        return await getCurrentUser(context);
      },
      findUsers: async (obj, args, context, resolveInfo) => {
          return await searchForItem(args.searchText, 'User', 'email', ['email'],context);
      },
      getUserSettings: async (root, {email}, context, info) => {
        return await getUserSettings(email, context);
      },
      getLicensedFeatures: async (root, args, context, info) => {
        return await getLicensedFeatures(context);
      },
      getLicenseInfo: async (root, args, context, info) => {
        return await getLicenseInfoEx(context);
      },
      acceptedEula: async (root, { email }, context, info) => {
            return await acceptedEula(email);
      },
      getSystemMessages: async (root, args, context) => {
        return await getSystemMessages(context);
      },
      decryptAsymmetricEncryptedItems: async (root, { items }, context, info) => {
        return await decryptAsymmetricEncryptedItems(items, context);
      }
    },
    Mutation: {
      createUser: async (root, args, context, info) => {
        args = args || {};
        //console.log('createUser args: ', args);
        return await createUser(args.encryptedPassword, context);
      },
      createUserSignUp: async (root, { input }, context, info) => {
        /*
        if (isBasicLicense()) {
          throw new Error("Creating users is not available in Cypher Workbench Basic");
        }
        */
        /*
        var licenseExpirationInfo = getLicenseExpirationInfo();
        if (licenseExpirationInfo.licenseExpired) {
          throw new Error("Cypher Workbench license expired");
        }
        */
        //console.log("createUserSignUp context: ", context);
        return await createUserSignUp(input, context);
      },
      updateUserPrimaryOrganization: async (obj, args, context, resolveInfo) => {
        return await updateUserPrimaryOrganization(args.primaryOrganization,context);
      },
      updateUserSettings: async (obj, args, context, resolveInfo) => {
        return await updateUserSettings(args.userSettings,context);
      },
      logInLocalUser: async (obj, { email, encryptedPassword }, context, resolveInfo) => {
        return await logInLocalUser(email, encryptedPassword);
      },
      acknowledgeMessages: async (root, { messageKeys }, context, info) => {
        return await acknowledgeMessages(messageKeys, context);
      }
    },
    User: {
      isAdmin: async User => {
        return await isAdmin(User.email);
      },
      isCurrentUser: async (User, {}, context) => {
        return await isCurrentUser(User.email, context);
      }
    }
  };
