


export const skipIfComment = (stringToWorkOn, startIndex) => {
    if (startIndex < (stringToWorkOn.length - 1)) {
        let firstChar = stringToWorkOn[startIndex];
        if (firstChar === '/')
        {
            let secondChar = stringToWorkOn[startIndex+1];
            if (secondChar === '/') {
                return handleSingleLineComment(stringToWorkOn, startIndex+2);
            } else if (secondChar === '*') {
                return handleMultiLineComment(stringToWorkOn, startIndex+2);
            }
        }
    }
    return startIndex;
}

export const handleSingleLineComment = (stringToWorkOn, startIndex) => {
    // comment will end at a \n or end-of-string
    let index = stringToWorkOn.indexOf('\n', startIndex);
    if (index === -1) {
        return stringToWorkOn.length;
    } else {
        return index+1; // advance the index past the new line
    }
}

export const handleMultiLineComment = (stringToWorkOn, startIndex) => {
    // comment will end at an asterisk * and a slash /
    let index = stringToWorkOn.indexOf('*/', startIndex);
    if (index === -1) {
        return stringToWorkOn.length;
    } else {
        return index+2; // advance the index past the asterisk and slash
    }
}

export const stripComments = (stringToWorkOn) => {
    if (typeof(stringToWorkOn) === 'string') {
        let returnStr = '';
        for (let index = 0; index < stringToWorkOn.length; index++) {
            index = skipIfComment(stringToWorkOn, index);
            if (index >= stringToWorkOn.length) {
                break;
            }
            returnStr += stringToWorkOn[index];
        }
        return returnStr;
    } else {
        return stringToWorkOn;
    }
}
