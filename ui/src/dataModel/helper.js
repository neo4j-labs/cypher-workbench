
export function smartQuote (text) {
    if (text && text.match && text.match(/ /)) {
        return '`' + text + '`';
    } else {
        return text;
    }
}

export function lowerFirstLetter (text) {
    if (text && text.length > 0 && typeof(text) === 'string') {
        return text.substring(0,1).toLowerCase() + text.substring(1);
    } else {
        return text;
    }
}