import { runQuery } from "../util/run";
import { 
  encryptV1,
  decryptV1,
  generateAsymmetricKeyPair,
  generateSymmetricKey,
  getAsymmetricEncryptionKey,
  getAsymmetricDecryptionKey,
  decryptAsymmetric,
  encodeKeyPairForStorage,
  decodeKeyPairFromStorage,
  Uint8ArrayToBase64String
} from "../util/encryption";
import { 
  decodeBase64
} from "tweetnacl-util";
import { processResult, getFirstRowValue } from './resultHelper';
import { getLicenseInfo, isCloudLicense } from '../license/license';
import { generateTokenForUser } from "../security/localSessions";

export const createUserSignUp = async ({ primaryOrganization, email, password, name, picture }, context) => {
  console.log('args: ', primaryOrganization, email, password, name);
  if (!primaryOrganization) {
    return new Error('primaryOrganization is required');
  }
  if (!email) {
    return new Error('email is required');
  }
  if (!password) {
    return new Error('password is required');
  }
  const encryptedPassword = encryptV1(password);
  const query = `
    WITH $primaryOrganization as primaryOrganization, $email as email, 
        $encryptedPassword as encryptedPassword,
        $picture as picture, $name as name, $adminEmail as adminEmail
    OPTIONAL MATCH (org:SecurityOrganization {name: primaryOrganization})
    CALL apoc.util.validate(org IS NULL, 
              'Organization ' + primaryOrganization + ' does not exist',[0])

    WITH email, encryptedPassword, picture, name, org, adminEmail

    OPTIONAL MATCH (anyUser:User)
    WITH email, encryptedPassword, picture, name, org, anyUser, adminEmail
    LIMIT 1
    CALL apoc.do.when(anyUser IS NULL,
      '
      MERGE (u:User {email: email})
      // set very first user as admin
      SET u:Admin
      RETURN u
      ',
      '
      OPTIONAL MATCH (admin:User {email: adminEmail})
      CALL apoc.util.validate(admin IS NULL OR NOT (exists ((admin)-[:OWNER]->(org)) OR admin:Admin),
                    "Calling user does not have permission to create users",[0])                
      MERGE (u:User {email: email})
      RETURN u
      ',
      { email: email, adminEmail: adminEmail, org: org }
    ) YIELD value
    WITH value.u as u, email, encryptedPassword, picture, name, org
    SET u.primaryOrganization = org.name
    WITH *
    CALL apoc.create.addLabels([u], [org.name]) YIELD node
    WITH u, email, encryptedPassword, picture, name, org
    MERGE (u)-[:MEMBER]->(org)
    MERGE (settings:UserSettings {email:email})
      WITH *
      CALL apoc.create.addLabels([settings], [org.name]) YIELD node
    MERGE (u)-[:HAS_USER_SETTINGS]->(settings)
    SET u.encryptedPassword=encryptedPassword, u.picture = picture, u.name = name
    RETURN u
  `;
  picture = picture ? picture : '';
  name = name ? name : '';
  let adminEmail = (context) ? context.email : '';
  console.log('admin email: ', adminEmail);
  const args = {
    primaryOrganization, name, encryptedPassword, email, picture, 
    adminEmail: adminEmail
  };
  var result = await runQuery(query, args);
  result = processResult(result);
  var user = getFirstRowValue(result, "u");
  return user.properties;
};

export const verifyUserPassword = async (email, plainTextPassword) => {
  //console.log(`verifyUserPassword email: '${email}'`);
  //console.log(`verifyUserPassword pass: '${plainTextPassword}'`);
  const query = `
      MATCH (u:User {email: $email})
      RETURN u
    `;
  const args = { email };
  var result = await runQuery(query, args);
  result = processResult(result);  
  var user = getFirstRowValue(result, "u");  
  //console.log(user);
  if (user) {
    try {
      const decryptedStoredUserPassword = decryptV1(user.properties.encryptedPassword);
      const passwordsMatch = (decryptedStoredUserPassword === plainTextPassword);
      return passwordsMatch;
    } catch (e) {
      console.log(`Cannot decrypt stored user password ${user.properties.encryptedPassword}`)
      console.log(e);
    } 
  } else {
    console.log(`User ${email} not found`);
  }
  return false;
}

// update 02/03/2021 - normally this would always create a user
//   however, the logic has been changed to only create a user if they are in a pre-configured
//   EmailDomain such as neotechnology.com.
//   This will allow Neo4j employees on first use to have a User node created for them
//   Email domains that are not configured will need to have their User node created by the Admin App
export const createUser = async (encryptedPassword, context) => {
    console.log("createUser email: ", context.email);
    //console.log("createUser encryptedPassword: ",encryptedPassword);

    var selfRegisterStringVal = process.env.ALLOW_DEFAULT_PUBLIC_SELF_REGISTRATION || 'false';
    var selfRegisterVal = (selfRegisterStringVal === 'true') ? true : false

    var selfRegisterCypher = (selfRegisterVal) ? 
              `
              // (Option 1) If there is a DefaultPublic SecurityOrganization, allow user to self-register
              MATCH (defaultOrg:SecurityOrganization:DefaultPublic)
              OPTIONAL MATCH (ed:EmailDomain {name: emailDomain})-[:BELONGS_TO]->(org:SecurityOrganization)
              WITH email, picture, name, CASE WHEN org IS NULL THEN defaultOrg ELSE org END as org
              `
        :
              `
              // (Option 2) allow any pre-defined email domain (e.g. neo4j.com, neotechnology.com) to self-register
              MATCH (ed:EmailDomain {name: emailDomain})-[:BELONGS_TO]->(org:SecurityOrganization)
              `
        ;

    try {
        const picture = context.picture ? context.picture : '';
        const name = context.name ? context.name : '';
        const args = {email: context.email, picture: picture, name: name};
        //console.log('args: ', args);
        const query=`
            WITH $email as email, $picture as picture, $name as name
            OPTIONAL MATCH (u:User {email:email})
            CALL apoc.do.when(u IS NULL,
                "
                WITH email, picture, name, split(email, '@')[1] as emailDomain

                // There are 2 choices here, and the workflow keeps getting switched back and forth
                //   Option 1: allow users to self-register and immediately gain access to the app
                //   Option 2: require users to be added by the Admin app, but allow neo4j users to self-register

                ${selfRegisterCypher}

                // end options

                WITH email, picture, name, collect(org)[0] as org
                MERGE (u:User {email: email})
                  SET u.primaryOrganization = org.name
                  WITH *
                  CALL apoc.create.addLabels([u], [org.name]) YIELD node
                  WITH u, email, picture, name, org
                MERGE (u)-[:MEMBER]->(org)
                MERGE (settings:UserSettings {email:email})
                  WITH *
                  CALL apoc.create.addLabels([settings], [org.name]) YIELD node
                MERGE (u)-[:HAS_USER_SETTINGS]->(settings)
                SET u.picture = picture, u.name = name
                RETURN u, org.requiresEULA as requiresEULA
                ",
                "
                CALL apoc.util.validate(
                  NOT (EXISTS(
                        (existingUser)-[:MEMBER]->(:SecurityOrganization)
                      )),
                    'No valid organization for user',[0]
                )                
                WITH existingUser, picture, name
                MATCH (existingUser)-[:MEMBER]->(org:SecurityOrganization)                
                WHERE existingUser.primaryOrganization = org.name
                SET existingUser.picture = picture, existingUser.name = name
                RETURN existingUser as u, org.requiresEULA as requiresEULA
                ",
                {existingUser: u, email: email, picture: picture, name: name}
            ) YIELD value
            RETURN value.u as u, coalesce(value.requiresEULA, true) as primaryOrganizationRequiresEULA
        `
        //console.log('query: ', query);
        var result = await runQuery(query, args);
        result = processResult(result);
        var user = getFirstRowValue(result, "u");
        //console.log('user: ', user);
        var primaryOrganizationRequiresEULA = getFirstRowValue(result, "primaryOrganizationRequiresEULA");
        if (user) {
            //console.log('returning user.properties', user.properties);
            /*
            try {
              console.log('decrypt passed in password: ', encryptedPassword)
              console.log('sent decryptedPassword:   ' + decryptV1(encryptedPassword))
            } catch (e) { 
              //console.log(e) 
            }
            try {
              console.log('decrypt stored password: ', userProperties.encryptedPassword)
              console.log('stored decryptedPassword: ' + decryptV1(userProperties.encryptedPassword))
            } catch (e) {
              // console.log(e);
            }
            */
            var userProperties = user.properties;

            var decryptedSentUserPassword = undefined;
            var decryptedStoredUserPassword = undefined;
            if (process.env.AUTH_METHOD === "local") {
              try {
                decryptedSentUserPassword = decryptV1(encryptedPassword);
              } catch (e) {
                console.log(`Cannot decrypt sent user password ${encryptedPassword}`)
                console.log(e);
              }
              try {
                decryptedStoredUserPassword = decryptV1(userProperties.encryptedPassword);
              } catch (e) {
                console.log(`Cannot decrypt stored user password ${userProperties.encryptedPassword}`)
                console.log(e);
              }
            }
            
            /*
            console.log('check 1: ', process.env.AUTH_METHOD === "local" );
            console.log('check 2: ', decryptedSentUserPassword);
            console.log('check 3: ', decryptedStoredUserPassword);
            console.log('check 4: ', decryptedSentUserPassword === decryptedStoredUserPassword);
            */
            if (
                (process.env.AUTH_METHOD === "local" 
                  && decryptedSentUserPassword && decryptedStoredUserPassword
                  && decryptedSentUserPassword === decryptedStoredUserPassword
                ) ||
                (
                  // some other Identity provider has already authenticated us
                  process.env.AUTH_METHOD !== "local" 
                )
            ) {
              delete userProperties.browserKeys;
              delete userProperties.serverKeys;
              delete userProperties.encryptedPassword;
              if (process.env.AUTH_METHOD === "local") {
                userProperties.localAuthToken = generateTokenForUser(context.email);
              }
              const returnUserObj = { ...userProperties, primaryOrganizationRequiresEULA };
              //console.log('createUser: returning user obj', returnUserObj);
              return {
                user: returnUserObj,
                error: ''
              }
            } else {
              return {
                user: {},
                error: 'User authentication failure'
              }
            }
        } else {
            //return 'Unable to create user';
            return {
              user: {},
              error: 'User not authorized'
            }
        }
    } catch (error) {
        var errorMessage = `${error}`;
        errorMessage = (errorMessage.match(/No valid organization for user/)) ? 'No valid organization for user' : `createUser error\n ${error}`;
        console.log(errorMessage);
        return {
          user: {},
          error: errorMessage
        }
    }
};

export const getCurrentUser = async (context) => {
  console.log("getCurrentUser: ",context.email)
  try {
      const query=`
      WITH $email as email
      MATCH (user:User {email:email})-[:MEMBER]->(s:SecurityOrganization)
      WITH user, collect(s.name) as authorizedOrganizations
      RETURN apoc.map.merge(properties(user), {authorizedOrganizations: authorizedOrganizations}) as user
      `;
      const args={email: context.email};
      var result=await runQuery(query, args)
      result = processResult(result);
      var user = getFirstRowValue(result, "user", "Unable to fetch current user");
      user = await ensureEncryptionProperties(user, context);
      //console.log('getCurrentUser user: ', user);
      return user;
  } catch (error) {
      console.log("getCurrentUser error\n",error);
      return(error);
  }
}

export const getSystemMessages = async (context) => {
  //console.log("getSystemMessages: ",context.email)
  try {
      const query=`
      WITH $email as email
      MATCH (user:User {email:email})-[:MEMBER]->(s:SecurityOrganization)-[:SYSTEM_MESSAGE]->(systemMessage:SystemMessage)
      WHERE user.primaryOrganization = s.name
        AND NOT (user)-[:ACKNOWLEDGED]->(systemMessage)
        AND coalesce(systemMessage.validUntil,0) > timestamp()
      RETURN systemMessage.key as key, systemMessage.message as message, toString(systemMessage.validUntil) as validUntil
      ORDER BY systemMessage.dateAdded
      `;
      const args={email: context.email};
      var result=await runQuery(query, args)
      result = processResult(result);
      return result.rows;      
  } catch (error) {
      console.log("getSystemMessages error\n",error);
      return(error);
  }
}

export const acknowledgeMessages = async (messageKeys, context) => {
  try {
      const query=`
      WITH $email as email, $messageKeys as messageKeys
      MATCH (user:User {email:email})-[:MEMBER]->(s:SecurityOrganization)-[:SYSTEM_MESSAGE]->(message:SystemMessage)
      WHERE user.primaryOrganization = s.name
        AND message.key IN messageKeys        
      MERGE (user)-[:ACKNOWLEDGED]->(message)
      WITH collect(message) as _
      RETURN true as result
      `;
      const args={messageKeys: messageKeys, email: context.email};
      var result=await runQuery(query, args)
      result = processResult(result);
      return getFirstRowValue(result, "result", "Unable to acknowledge messages");      
  } catch (error) {
      console.log("acknowledgeMessages error\n",error);
      return(error);
  }
}

  const ensureEncryptionProperties = async (user, context) => {

    const requiredProperties = [
      //'browserKeys','serverKeys','browserAsymmetricEncryptionKey','browserSymmetricKey'
      'serverKeys','browserAsymmetricEncryptionKey'
    ];

    const userKeys = (user) ? Object.keys(user) : [];
    const missingKeys = requiredProperties.filter(propKey => !userKeys.includes(propKey));
    var modifiedUser = user;

    await new Promise(async (resolve, reject) => {
      if (missingKeys.length === 0) {
        //delete modifiedUser.browserKeys;
        delete modifiedUser.serverKeys;
        //console.log('no missing keys');
        resolve();
      } else {
        //const browserKeys = generateAsymmetricKeyPair();
        const serverKeys = generateAsymmetricKeyPair();
        //const browserKeysString = encodeKeyPairForStorage(browserKeys);
        const serverKeysString = encodeKeyPairForStorage(serverKeys);
        //const browserSymmetricKey = generateSymmetricKey();
        //const browserAsymmetricEncryptionKey = getAsymmetricEncryptionKey(serverKeys.publicKey, browserKeys.secretKey);
        const browserAsymmetricEncryptionKey = serverKeys.publicKey;
        const browserAsymmetricEncryptionKeyString = Uint8ArrayToBase64String(browserAsymmetricEncryptionKey);
        const query= `
          MATCH (user:User {email:$email})
          //SET user.browserKeys = $browserKeys
          SET user.serverKeys = $serverKeys
          //SET user.browserSymmetricKey = $browserSymmetricKey
          SET user.browserAsymmetricEncryptionKey = $browserAsymmetricEncryptionKey
        `;
        const args={email: context.email,
          //browserKeys: browserKeysString,
          serverKeys: serverKeysString,
          //browserSymmetricKey: browserSymmetricKey,
          browserAsymmetricEncryptionKey: browserAsymmetricEncryptionKeyString
        };
        try {
          await runQuery(query, args);
          modifiedUser = {
            ...user,
            //browserSymmetricKey: browserSymmetricKey,
            browserAsymmetricEncryptionKey: browserAsymmetricEncryptionKeyString
          }
          //console.log('ensureEncryptionProperties modifiedUser: ', modifiedUser);          
          resolve();
        } catch (e) {
          console.log('Error running setEncryptionKeys query', e);
          reject(e);
        }
      }
    }); 
    return modifiedUser;
  }

  export const getUserAsymmetricDecryptionKeys = async (publicKeys, email) => {
    try {
        const query=`
          WITH $email as email
          MATCH (user:User {email:email})
          RETURN properties(user) as user
        `;
        const args={email: email};
        var result = await runQuery(query, args)
        result = processResult(result);
        var user = getFirstRowValue(result, "user", "Unable to fetch current user");
        //console.log('decrypt user obj: ', user);
        //const browserKeys = decodeKeyPairFromStorage(user.browserKeys);
        const asymmetricDecryptionKeys = publicKeys.map(publicKey => {
          //console.log('public key: ', publicKey);
          publicKey = decodeBase64(publicKey);
          //console.log('public key 2: ', publicKey);
          const serverKeys = decodeKeyPairFromStorage(user.serverKeys);
          return getAsymmetricDecryptionKey(serverKeys.secretKey, publicKey);
        });
        return asymmetricDecryptionKeys;
    } catch (error) {
        console.log("getUserAsymmetricDecryptionKeys error\n",error);
        throw error;
    }
  }

  export const decryptAsymmetricEncryptedItems = async (encryptedItemsWithPublicKeys, context) => {
    try {
        var publicKeys = encryptedItemsWithPublicKeys.map(x => x.publicKey);
        const asymmetricDecryptionKeys = await getUserAsymmetricDecryptionKeys(publicKeys, context.email);
        const decryptedItems = encryptedItemsWithPublicKeys.map((x,i) => 
          decryptAsymmetric(x.item, asymmetricDecryptionKeys[i])
        )
        return decryptedItems;
    } catch (error) {
        console.log("decryptAsymmetricEncryptedItems error\n",error);
        throw error;
    }
  } 

  export const getUserSettings = async (email) => {
      //console.log("getUserSettings: ",email)
      try {
          const query=`
          WITH $email as email
          MATCH (user:User {email:email})-[:HAS_USER_SETTINGS]->(settings:UserSettings {email:email})
            WHERE user.primaryOrganization IN labels(settings)
          RETURN {email: email, canvasSettings: settings.canvasSettings} as userSettings
          `;
          const args={email: email};
          var result=await runQuery(query, args)
          result = processResult(result);
          return getFirstRowValue(result, "userSettings", "Unable to fetch user settings");
      }catch (error) {
          console.log("getUserSettings error\n",error);
          return(error);
      }
  }

  export const getLicensedFeatures = async (context) => {
      try {
          const query=`
          WITH $email as email
          MATCH (user:User {email:email})-[:MEMBER]->(s:SecurityOrganization)
          WHERE user.primaryOrganization = s.name
          WITH s
          MATCH (s)-[:LICENSED_FOR]->(:SoftwareEdition)-[:HAS_FEATURE]->(feature:Feature)          
          RETURN feature.name as name
          `;
          const args={email: context.email};
          var result=await runQuery(query, args)
          result = processResult(result);
          return result.rows;
      } catch (error) {
          console.log("getLicensedFeatures error\n",error);
          return(error);
      }
  }

  export const getLicenseInfoEx = async (context) => {
    const { email } = context;
    var licenseInfo = getLicenseInfo();
    var returnObj = {
      product: licenseInfo.licensed_product,
      version: licenseInfo.license_version,
      type: licenseInfo.license_type,
      licensedFeatures: [],
      enterpriseDomains: []
    }
    if (isCloudLicense() && email !== 'getLicenseInfo@workbench.local') {
      try {
        const query=`
          WITH $email as email
          MATCH (user:User {email:email})-[:MEMBER]->(s:SecurityOrganization)
          WHERE user.primaryOrganization = s.name
          WITH user, s
          MATCH (s)-[:LICENSED_FOR]->(softwareEdition:SoftwareEdition), (enterprise:SoftwareEdition {name:'Enterprise'})
          WITH s, enterprise, softwareEdition,
            coalesce(split(user.email, "@")[1],"") as emailDomain, 
            coalesce(s.enterpriseDomains,[]) as enterpriseDomains
          WITH s,
            CASE WHEN emailDomain IN enterpriseDomains
              THEN enterprise
              ELSE softwareEdition
            END as softwareEdition
          MATCH (softwareEdition)-[:HAS_FEATURE]->(feature:Feature)
          RETURN coalesce(s.enterpriseDomains,[]) as enterpriseDomains,
            softwareEdition.name as softwareEditionName, collect({ name: feature.name }) as featureNames
        `;
        const args={email: email};
        var result = await runQuery(query, args)
        result = processResult(result);
        var firstRow = result.rows[0];
        returnObj.type = `Cloud_${firstRow.softwareEditionName}`;
        returnObj.licensedFeatures = firstRow.featureNames;
        returnObj.enterpriseDomains = firstRow.enterpriseDomains;
      } catch (error) {
        console.log("getLicenseInfoEx error\n",error);
        returnObj.type = `Error: ${error}`
      }
    }
    return returnObj;
  }

  export const updateUserPrimaryOrganization = async(primaryOrganization,context) => {
    try{
      const args={primaryOrganization: primaryOrganization, email: context.email};
      const query=`
          WITH $email as email, $primaryOrganization as primaryOrganization
          MATCH (user:User {email:email})
          OPTIONAL MATCH (user)-[:MEMBER]->(securityOrganization:SecurityOrganization {name:primaryOrganization})
          CALL apoc.util.validate(securityOrganization IS NULL,"no permission for organization " + primaryOrganization,[0])
          SET user.primaryOrganization = primaryOrganization
          RETURN true as success
      `;
      var result = await runQuery(query,args);
      result = processResult(result);
      //console.log("results\n",result);
      return getFirstRowValue(result, "success", "Unable to update user organization");
  }catch (error) {
      console.log("updateUserPrimaryOrganization error\n",error);
      return(error);
  }
}

  export const updateUserSettings = async (userSettings,context) => {
    //console.log("updateUserSettings\n",userSettings);
    try{
        const args={userSettings: userSettings,email: context.email};
        const query=`
            WITH $userSettings as userSettings
            MATCH (user:User {email:userSettings.email})
            MATCH (settings:UserSettings {email:userSettings.email})
            CALL apoc.util.validate(NOT user.primaryOrganization IN labels(settings),"permission denied (wrong org)",[0])
            MERGE (user)-[:HAS_USER_SETTINGS]->(settings)
            SET settings += {
                canvasSettings: userSettings.canvasSettings
            }
            RETURN true as success
        `;
        var result = await runQuery(query,args);
        result = processResult(result);
        //console.log("results\n",result);
        return getFirstRowValue(result, "success", "Unable to update user settings");
    }catch (error) {
        console.log("updateUserSettings error\n",error);
        return(error);
    }
};

  export const isAdmin = async email => {
    const query = `
      WITH $email as email
      MATCH (u:User {email: email})
      RETURN u:Admin AS isAdmin
    `;
    var result = await runQuery(query, { email });
    result = processResult(result);
    return getFirstRowValue(result, "isAdmin");
  };

  export const isCurrentUser = async (email, context) => {
    return email === context.email;
  };

export const logInLocalUser = async (email, encryptedPassword) => {
  //console.log('logInLocalUser what is the email?: ', email);
  const query = `
      MATCH (u:User {email: $email})
      SET u.acceptedEula = true
      RETURN u AS localUser
    `;
  const args = { email };
  var result = await createUser(encryptedPassword,args);
  const { user, error } = result;
  if (error) {
    console.log('logInLocalUser error: ', result.error);
    throw new Error(result.error);
  }
  //console.log('result', result);
  if (user.email) {
      const result = await runQuery(query, args);
      //return result.records[0].get("localUser").properties;
      return user;
  } else {
      console.log("User not returned from createUser, not able to set acceptedEula");
      console.log(result);
      return user;
  }
};

export const acceptedEula = async (email) => {
  //console.log('in acceptedEula, email: ', email);
  const query = `
      MATCH (u:User {email: $email})
      RETURN
      CASE u.acceptedEula
      WHEN true
      THEN true
      ELSE false END AS acceptedEula
    `;
  const args = { email };
  //console.log('before query');
  const result = await runQuery(query, args);
  //console.log('after query');
  var response = result.records[0].get("acceptedEula");
  //console.log('response: ', response);
  return response;
};
