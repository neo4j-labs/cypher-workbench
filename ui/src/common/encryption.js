import CryptoJS from "crypto-js";
import { secretbox, box, randomBytes } from "tweetnacl";
import {
  decodeUTF8, // takes a utf-8 string and transforms it into a Uint8Array
  encodeUTF8, // takes a Uint8Array and transforms it into utf-8
  encodeBase64,
  decodeBase64
} from "tweetnacl-util";
import { decryptAsymmetricEncryptedItems } from "../persistence/graphql/GraphQLPersistence";
import { getDynamicConfigValue } from '../dynamicConfig';

const v1_key = getDynamicConfigValue("REACT_APP_ENCRYPTION_KEY");

const ENCRYPTION_VERSION_SEPARATOR = '_$$_';
const ENCRYPTION_VERSION = 'v2';
//const DEFAULT_KEY_SALT_LEN = 8;

// set during login
var userBrowserAsymmetricEncryptionKey;

export const setUserKeys = (keys) => {
    const { browserAsymmetricEncryptionKey } = keys;
    userBrowserAsymmetricEncryptionKey = browserAsymmetricEncryptionKey;
};

export const encryptAsymmetricOnlyWithVersion = (value) => {
    //const decodedKey = decodeBase64(userBrowserAsymmetricEncryptionKey);
    const { asymmetricEncryptKey, browserPublicKey } = getAsymmetricEncryptionKey();    
    const encryptedValue = encryptAsymmetric(value, asymmetricEncryptKey);
    var prefixedValue = `${ENCRYPTION_VERSION}${ENCRYPTION_VERSION_SEPARATOR}${encryptedValue}`;
    return {
        encryptedValue: prefixedValue,
        publicKey: browserPublicKey
    }
}

export const getAsymmetricEncryptionKey = () => {
    const serverPublicKey = decodeBase64(userBrowserAsymmetricEncryptionKey);
    var browserKeys = generateAsymmetricKeyPair();
    var asymmetricEncryptKey = box.before(serverPublicKey, browserKeys.secretKey);
    var encodedPublicKey = encodeBase64(browserKeys.publicKey);
    return {
        asymmetricEncryptKey: asymmetricEncryptKey,
        browserPublicKey: encodedPublicKey
    }
}

export const encryptV1 = (value) => CryptoJS.AES.encrypt(value, v1_key).toString();

export const encryptV2 = (value) => {
    //var symmetricKeyToUse = getSaltedSymmetricKey(userBrowserSymmetricKey);
    var symmetricKeyToUse = upsertUserBrowserSymmetricKey();
    var singleEncryptedValue = encryptSymmetric(value, symmetricKeyToUse);

    const { asymmetricEncryptKey, browserPublicKey } = getAsymmetricEncryptionKey();

    var doubleEncryptedValue = encryptAsymmetric(singleEncryptedValue, asymmetricEncryptKey);
    var prefixedValue = `${ENCRYPTION_VERSION}${ENCRYPTION_VERSION_SEPARATOR}${doubleEncryptedValue}`;
    return {
        encryptedValue: prefixedValue,
        publicKey: browserPublicKey
    }
}

export const decryptV1 = (value) => {
    //console.log('v1_key: ', v1_key);
    return CryptoJS.AES.decrypt(value, v1_key).toString(CryptoJS.enc.Utf8);
}

export const decryptV2 = (value) => {
    //var symmetricKeyToUse = getSaltedSymmetricKey(userBrowserSymmetricKey);
    var symmetricKeyToUse = upsertUserBrowserSymmetricKey();
    return decryptSymmetric(value, symmetricKeyToUse);
}

// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const makeRandomString = (length) => {
    var result = '';
    for (var i = 0; i < length; i++) {
       result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}

// deprecated - btoa has problems with Unicode strings
export const encodeObject = (obj) => btoa(JSON.stringify(obj));
// deprecated - atob has problems with Unicode strings
export const decodeObject = (encodedObjStr) => JSON.parse(atob(encodedObjStr));
 
export const storeUserNameAndPasswordLocally = (databaseId, user, password) => {
    const userKey = `${databaseId}_user`;
    const userPublicKey = `${databaseId}_user_publicKey`;
    const passwordKey = `${databaseId}_password`;
    const passwordPublicKey = `${databaseId}_password_publicKey`;
    const encryptedUser = encryptV2(user);
    const encryptedPassword = encryptV2(password);
    localStorage.setItem(userKey, encryptedUser.encryptedValue);
    localStorage.setItem(userPublicKey, encryptedUser.publicKey);
    localStorage.setItem(passwordKey, encryptedPassword.encryptedValue);
    localStorage.setItem(passwordPublicKey, encryptedPassword.publicKey);
}

export const upgradeEncryptionFormat = (localItemKey, localItemValue) => {
    var encryptedValue = localItemValue;
    var { version, value } = getEncyptionVersionAndValue(localItemValue);
    if (version === 'v1') {
        console.log(value);
        const decryptedValue = decryptV1(value);
        var result = encryptV2(decryptedValue);
        encryptedValue = result.encryptedValue;
        var publicKey = result.publicKey;
        localStorage.setItem(localItemKey, encryptedValue);
        localStorage.setItem(`${localItemKey}_publicKey`, publicKey);
    } 
    return encryptedValue;
}

export const removeUsernameAndPasswordLocally = (databaseId) => {
    const userKey = `${databaseId}_user`;
    const passwordKey = `${databaseId}_password`;
    localStorage.removeItem(userKey);
    localStorage.removeItem(`${userKey}_publicKey`);
    localStorage.removeItem(passwordKey);
    localStorage.removeItem(`${passwordKey}_publicKey`);
}

export const getUserNameAndPasswordLocally = async (databaseId) => {
    const userKey = `${databaseId}_user`;
    const passwordKey = `${databaseId}_password`;
    var encryptedUser = localStorage.getItem(userKey);
    var encryptedUserPublicKey;
    var encryptedPassword = localStorage.getItem(passwordKey);
    var encryptedPasswordPublicKey;

    if (encryptedUser) {
        // upgrade storage format
        encryptedUser = upgradeEncryptionFormat(userKey, encryptedUser);
        var encryptedUserVandV = getEncyptionVersionAndValue(encryptedUser);
        encryptedUserPublicKey = localStorage.getItem(`${userKey}_publicKey`);
        encryptedUser = encryptedUserVandV.value;
    }
    if (encryptedPassword) {
        encryptedPassword = upgradeEncryptionFormat(passwordKey, encryptedPassword);
        var encryptedPasswordVandV = getEncyptionVersionAndValue(encryptedPassword);
        encryptedPasswordPublicKey = localStorage.getItem(`${passwordKey}_publicKey`);        
        encryptedPassword = encryptedPasswordVandV.value;
    }

    try {
        if (encryptedUser && encryptedPassword) {
            var decryptedItems = await decryptLocallyStoredItems([
                { item: encryptedUser, publicKey: encryptedUserPublicKey },
                { item: encryptedPassword, publicKey: encryptedPasswordPublicKey}
            ]);
            return {
                username: decryptedItems[0],
                password: decryptedItems[1]
            }
        } else if (encryptedUser) {
            var decryptedItems = await decryptLocallyStoredItems([
                { item: encryptedUser, publicKey: encryptedUserPublicKey }
            ]);
            return {
                username: decryptedItems[0],
                password: ''
            }
        } else if (encryptedPassword) {
            var decryptedItems = await decryptLocallyStoredItems([
                { item: encryptedPassword, publicKey: encryptedPasswordPublicKey}                
            ]);
            return {
                username: '',
                password: decryptedItems[0]
            }
        }
    } catch (error) {
        console.log('Error decrypting credentials: ', error);
        // var errorMessage = `Error retrieving credentials '${error}'`;
        // alert(errorMessage);
        console.log(`Removing encrypted username and password for database '${databaseId}'`);
        removeUsernameAndPasswordLocally(databaseId)        
    }
    return {
        username: '',
        password: ''
    }
}

const decryptLocallyStoredItems = async (items) => {

    const decryptedItemResponse = await decryptAsymmetricEncryptedItems(items);
    if (decryptedItemResponse.success) {
        //var symmetricKeyToUse = getSaltedSymmetricKey(userBrowserSymmetricKey);
        var symmetricKeyToUse = upsertUserBrowserSymmetricKey();
        var decryptedItems = decryptedItemResponse.decryptedItems
            .map(decryptedItem => decryptSymmetric (decryptedItem, symmetricKeyToUse));
        return decryptedItems;
    } else {
        throw new Error(decryptedItemResponse.error);
    }
}

export const getEncyptionVersionAndValue = (value) => {
    if (value && value.split) {
      const tokens = value.split(ENCRYPTION_VERSION_SEPARATOR);
      return (tokens.length && tokens.length > 1) 
        ? { version: tokens[0], value: tokens[1] }
        : { version: 'v1', value: value }
    } else {
      return { version: 'v1', value: value };
    }
  }

export const generateAsymmetricKeyPair = () => box.keyPair();
export const generateSymmetricKey = () => encodeBase64(randomBytes(secretbox.keyLength));

/*
export const getSaltedSymmetricKey = (symmetricKey) => {

    var keySalt = upsertKeySalt();
    const saltArray = decodeBase64(keySalt);
    const symmetricArray = decodeBase64(symmetricKey);
    const slicedSymmetricArray = symmetricArray.slice(saltArray.length);

    var saltedKeyArray = new Uint8Array(secretbox.keyLength);
    saltedKeyArray.set(saltArray);
    saltedKeyArray.set(slicedSymmetricArray, saltArray.length);
    return encodeBase64(saltedKeyArray);
} 
*/

export const encodeObjectForStorage = (obj) => encodeBase64(JSON.stringify(obj));
export const decodeStoredObjectString = (str) => JSON.parse(decodeBase64(str));

export const Uint8ArrayToBase64String = (buf) => encodeBase64(buf);
export const Base64StringToUint8Array = (str) => decodeBase64(str);

export const getAsymmetricDecryptionKey = (serverPrivateKey, browserPublicKey) => 
  box.before(browserPublicKey, serverPrivateKey);

  /*
export const upsertKeySalt = (saltLen) => {
    saltLen = (typeof(saltLen) === 'number') ? saltLen : DEFAULT_KEY_SALT_LEN;
    saltLen = parseInt(saltLen);
    if (localStorage) {
        var keySalt = localStorage.getItem('keySalt');
        if (!keySalt) {
            keySalt = encodeBase64(randomBytes(saltLen));
            localStorage.setItem('keySalt', keySalt);
        }
    } else {
        keySalt = encodeBase64(randomBytes(saltLen));
    }
    return keySalt;
}
*/

export const upsertUserBrowserSymmetricKey = () => {
    var symmetricKey = '';
    if (localStorage) {
        var symmetricKey = localStorage.getItem('symmetricKey');
        if (!symmetricKey) {
            symmetricKey = generateSymmetricKey();
            localStorage.setItem('symmetricKey', symmetricKey);
        }
    } else {
        symmetricKey = generateSymmetricKey();
    }
    return symmetricKey;
}


// https://github.com/dchest/tweetnacl-js/wiki/Examples
const newNonce = () => randomBytes(secretbox.nonceLength);

export const encryptSymmetric = (json, key) => {
    const keyUint8Array = decodeBase64(key);
  
    const nonce = newNonce();
    const messageUint8 = decodeUTF8(JSON.stringify(json));
    const box = secretbox(messageUint8, nonce, keyUint8Array);
  
    const fullMessage = new Uint8Array(nonce.length + box.length);
    fullMessage.set(nonce);
    fullMessage.set(box, nonce.length);
  
    const base64FullMessage = encodeBase64(fullMessage);
    return base64FullMessage;
  };
  
  export const decryptSymmetric = (messageWithNonce, key) => {
    const keyUint8Array = decodeBase64(key);
    const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, secretbox.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
      secretbox.nonceLength,
      messageWithNonce.length
    );
  
    const decrypted = secretbox.open(message, nonce, keyUint8Array);
  
    if (!decrypted) {
      throw new Error("Could not decrypt message");
    }
  
    const base64DecryptedMessage = encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
  }

export const encryptAsymmetric = (json, secretOrSharedKey) => {
    const nonce = newNonce();
    const messageUint8 = decodeUTF8(JSON.stringify(json));

    const encrypted = box.after(messageUint8, nonce, secretOrSharedKey);
  
    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);
  
    const base64FullMessage = encodeBase64(fullMessage);
    return base64FullMessage;
}

export const decryptAsymmetric = (messageWithNonce, secretOrSharedKey) => {
    const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
    const nonce = messageWithNonceAsUint8Array.slice(0, box.nonceLength);
    const message = messageWithNonceAsUint8Array.slice(
      box.nonceLength,
      messageWithNonce.length
    );

    const decrypted = box.open.after(message, nonce, secretOrSharedKey);
  
    if (!decrypted) {
      throw new Error('Could not decrypt message');
    }
  
    const base64DecryptedMessage = encodeUTF8(decrypted);
    return JSON.parse(base64DecryptedMessage);
  }

//upsertKeySalt();
upsertUserBrowserSymmetricKey();