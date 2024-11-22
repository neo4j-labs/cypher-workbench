
const NUM_MILLIS_IN_DAY = 24 * 3600 * 1000;
const DEFAULT_LOCAL_TOKEN_VALID_DURATION = 7 * NUM_MILLIS_IN_DAY
const DEFAULT_LOCAL_TOKEN_LEN = 32;
const DEFAULT_LOCAL_TOKEN_EXPIRE_SESSION_TIMER_INTERVAL = 60 * 1000;    // 60 seconds
const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const getEnvNumberParam = (paramName, mustBeGreaterThan, defaultValue) => {
    return (typeof(process.env[paramName]) === 'number' && process.env[paramName] > mustBeGreaterThan)
        ? process.env[paramName]
        : process.env[paramName] || defaultValue;
}

const localTokenLen = getEnvNumberParam('LOCAL_TOKEN_LEN', 0, DEFAULT_LOCAL_TOKEN_LEN);
const localTokenValidDuration = getEnvNumberParam('LOCAL_TOKEN_VALID_DURATION', 0, DEFAULT_LOCAL_TOKEN_VALID_DURATION);
const localTokenExpireSessionTimerInterval = getEnvNumberParam('LOCAL_TOKEN_EXPIRE_SESSION_TIMER_INTERVAL', 0, DEFAULT_LOCAL_TOKEN_EXPIRE_SESSION_TIMER_INTERVAL);

// store local session information here
const userLocalSessions = {};

const getRandomInt = (max) => Math.floor(Math.random() * max);

const generateToken = () => {
    var token = '';
    for (var i = 0; i < localTokenLen; i++) {
        token += TOKEN_CHARS[getRandomInt(TOKEN_CHARS.length)];
    }
    return token;
}

export const generateTokenForUser = (email) => {
    const token = generateToken();
    var userTokenList = userLocalSessions[email];
    if (!userTokenList) {
        userTokenList = [];  // using a list so there can be multiple logins active per user (e.g. different devices)
        userLocalSessions[email] = userTokenList;
    }
    const entry = {
        token,
        expires: `${new Date().getTime() + localTokenValidDuration}`
    }
    //console.log(`pushing entry for email ${email}`, entry);
    userTokenList.push(entry);

    return entry;
}

export const validateSpecialCases = (email) => {
    if (email === 'getLicenseInfo@workbench.local') {
        return true;
    } else {
        return false;
    }
}

export const validateTokenExistsAndIsNotExpired = (email, token) => {
    //console.log('validateTokenExistsAndIsNotExpired email, token: ', email, token);
    //console.log('8.1')
    var isValid = validateSpecialCases(email);
    //console.log('8.2')
    if (isValid) {
        return true;
    } else {
        //console.log('8.3')
        var userTokenList = userLocalSessions[email];
        if (!userTokenList) {
            return false;
        }
        //console.log('8.4')
        const now = new Date().getTime();
        isValid = userTokenList.some(x => x.token === token && parseInt(x.expires) > now);
        return isValid;
    } 
}

export const expireLocalSessions = () => {
    const now = new Date().getTime();
    Object.keys(userLocalSessions).map(key => {
        var userTokenList = userLocalSessions[key];
        userTokenList = userTokenList.filter(x => parseInt(x.expires) > now);
        userLocalSessions[key] = userTokenList;
        if (userTokenList.length === 0) {
            delete userLocalSessions[key];
        }
    });

    setTimeout(expireLocalSessions, localTokenExpireSessionTimerInterval);
}

setTimeout(expireLocalSessions, localTokenExpireSessionTimerInterval);

// for testing
//console.log(generateToken());

