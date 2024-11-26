
import { 
    setUserKeys,
    makeRandomString,
    encodeObject,
    decodeObject,
    encryptSymmetric,
    decryptSymmetric,
    decryptAsymmetric,
    encryptAsymmetric,
    generateSymmetricKey,
    getSaltedSymmetricKey,
    generateAsymmetricKeyPair,
    getAsymmetricEncryptionKey,
    getAsymmetricDecryptionKey,
    upsertKeySalt,
    encryptV1,
    decryptV1,
    upgradeEncryptionFormat,
    getEncyptionVersionAndValue
} from './encryption';
import { box, randomBytes } from "tweetnacl";
import {
    decodeUTF8,
    encodeUTF8,
    encodeBase64,
    decodeBase64
  } from "tweetnacl-util";

test('makeRandomString', () => {
    const str = makeRandomString(6);
    //console.log('str: ' + str);
    expect(str.length).toBe(6);
});

test('base64 encode just dbConnection id', () => {
    const dbConnection = { 
        id: '28fb61f5-7261-43c5-bbb7-2fa5852c971e'
    }
    const encodedObj = encodeObject(dbConnection);
    //console.log('dbconnection id: ' + encodedObj);
});

test('base64 encode dbConnection', () => {
    const dbConnection = { 
        name: 'Keymaker Test DB',
        url: 'bolt://localhost:7687',
        username: 'neo4j',
        encrypted: false,
        databaseName: ''
    }
    const encodedObj = encodeObject(dbConnection);
    //console.log('keymaker test db: ' + encodedObj);
});

test('base64 encode metadata', () => {
    const metadata = { 
        title: 'Engine Step 1',
        description: 'Engine Step 1 description',
        notes: ''
    }
    const encodedObj = encodeObject(metadata);
    //console.log('metadata: ' + encodedObj);
});

test('base64 encode keymaker', () => {
    const keymakerInfo = { 
        phaseId: 'f3919ca7-76f6-4ac3-995b-4ab327c6109d',
        cypherQuery: '',
        notifyPort: 3001
    }
    const encodedObj = encodeObject(keymakerInfo);
    //console.log('keymakerInfo: ' + encodedObj);
});

test('base64 encode/decode', () => {

    const dbConnection = { 
        url: 'bolt://localhost:7687', 
        username: 'neo4j', 
        encrypted: false, 
        databaseName: ''
    }

    const encodedObj = encodeObject(dbConnection);
    //console.log('encodedObj: ' + encodedObj);
    const decodedObj = decodeObject(encodedObj);

    expect(decodedObj.url).toBe(dbConnection.url);
    expect(decodedObj.encrypted).toBe(dbConnection.encrypted);
    expect(decodedObj.username).toBe(dbConnection.username);
    expect(decodedObj.databaseName).toBe(dbConnection.databaseName);

});

test ('encrypt v2 symmetric', () => {
    var dataToEncrypt = { password: 'something_secret' };
    var symmetricKey = generateSymmetricKey();
    var encryptedValue = encryptSymmetric(dataToEncrypt, symmetricKey);
    var decryptedValue = decryptSymmetric(encryptedValue, symmetricKey);
    expect(decryptedValue).toStrictEqual(dataToEncrypt);
});

test ('encrypt v2 asymmetric', () => {
    var serverKeys = generateAsymmetricKeyPair();
    setUserKeys({ browserAsymmetricEncryptionKey: encodeBase64(serverKeys.publicKey) });
    const { asymmetricEncryptKey, browserPublicKey } = getAsymmetricEncryptionKey();
    const asymmetricDecryptKey = getAsymmetricDecryptionKey(serverKeys.secretKey, decodeBase64(browserPublicKey));

    var dataToEncrypt = { password: 'something_secret' };
    var encryptedValue = encryptAsymmetric(dataToEncrypt, asymmetricEncryptKey);
    var decryptedValue = decryptAsymmetric(encryptedValue, asymmetricDecryptKey);
    expect(decryptedValue).toStrictEqual(dataToEncrypt);
});

test ('encrypt/decrypt username password object', () => {
    var dataToEncrypt = { username: 'neo4j', password: 'something_secret' };
    var symmetricKeyToUse = generateSymmetricKey();

    var singleEncryptedValue = encryptSymmetric(dataToEncrypt, symmetricKeyToUse);

    var serverKeys = generateAsymmetricKeyPair();
    setUserKeys({ browserAsymmetricEncryptionKey: encodeBase64(serverKeys.publicKey) });
    const { asymmetricEncryptKey, browserPublicKey } = getAsymmetricEncryptionKey();
    const asymmetricDecryptKey = getAsymmetricDecryptionKey(serverKeys.secretKey, decodeBase64(browserPublicKey));
    var doubleEncryptedValue = encryptAsymmetric(singleEncryptedValue, asymmetricEncryptKey);
    var singleDecryptedValue = decryptAsymmetric(doubleEncryptedValue, asymmetricDecryptKey);

    var decryptedValue = decryptSymmetric(singleDecryptedValue, symmetricKeyToUse);
    expect(decryptedValue).toStrictEqual(dataToEncrypt);

});

test('example', () => {
    const nonce = randomBytes(box.nonceLength);
    const pairA = box.keyPair();
    const pairB = box.keyPair();
    const pairC = box.keyPair();
    //const sharedA = box.before(pairB.publicKey, pairA.secretKey);
    //const sharedB = box.before(pairA.publicKey, pairB.secretKey);

    const json = { foo: 'bar' }
    const messageUint8 = decodeUTF8(JSON.stringify(json));

    /*
    console.log(messageUint8);
    console.log(nonce);
    console.log(pairB.publicKey);
    console.log(pairA.secretKey);
    */

    const newBox = box(messageUint8, nonce, pairB.publicKey, pairA.secretKey);  // server public key, browser throw-away private key
    const boxContents = box.open(newBox, nonce, pairA.publicKey, pairB.secretKey);    // browser throw-away public key, server private key
    //const boxContents = box.open(newBox, nonce, pairA.secretKey, pairB.publicKey);    

    expect(messageUint8).toEqual(boxContents);   
    const json2 = JSON.parse(encodeUTF8(boxContents));
    expect(json).toStrictEqual(json2);
});

test('encrypt v1 value for testing', () => {
    //console.log(encryptV1('neo4j'));
});

test('upgrade encryption format', () => {
    const userKey = '462bbc74-cf54-4b8c-9f91-1d5f00bddc0a_user';
    var encryptedUser = 'U2FsdGVkX19CuarskCqKBGL2U3JR7KXoiXavEcbPUWg=';

    //console.log('decryptV1: ', decryptV1(encryptedUser));
    var result = upgradeEncryptionFormat(userKey, encryptedUser);
    var { version, value } = getEncyptionVersionAndValue(result);
    expect(version).toBe('v2');
    expect(value.length).toBeGreaterThan(encryptedUser.length);
});
