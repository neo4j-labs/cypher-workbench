
export const isLowerCase = (str) => {
    if (str && str.toLowerCase) {
        return (str.toLowerCase() === str);
    } else {
        return false;
    }
}

export const isUpperCase = (str) => {
    if (str && str.toUpperCase) {
        return (str.toUpperCase() === str);
    } else {
        return false;
    }
}

export const containsSpaces = (str) => {
    if (str && str.match) {
        if (str.match(/\s/)) {
            return true;
        }
    }
    return false;
}

export const containsNonWordChars = (str) => {
    if (str && str.match) {
        if (str.match(/\W/)) {
            return true;
        }
    }
    return false;
}

export const containsUnderscores = (str) => {
    if (str && str.match) {
        if (str.match(/_/)) {
            return true;
        }
    }
    return false;
}

export const isUpperCamelCase = (str) => {
    str = str || '';
    return (
        str.length > 0
        && isUpperCase(str.substr(0,1))
        && !containsNonWordChars(str) 
        && !containsUnderscores(str)
        && !isUpperCase(str)
    )
}

export const isLowerCamelCase = (str) => {
    str = str || '';
    return (
        str.length > 0
        && isLowerCase(str.substr(0,1))
        && !containsNonWordChars(str) 
        && !containsUnderscores(str)
        && !isUpperCase(str)
    )
} 

export const camelCaseToWordArray = (camelCaseString) => {
        if (isUpperCase(camelCaseString)) {
            return [camelCaseString];
        } else {
            var words = [camelCaseString];
            if (camelCaseString && camelCaseString.replace) {
                // convert 'camelCaseString' to 'Camel Case String'
                //var stringWithSpaces = camelCaseString.replace(/([A-Z])/g, ' $1');

                // NOTE: this more complex regular expression is better at handling acronyms and special characters
                // Network&ITOps = Network & IT Ops, USState = US State
                var stringWithSpaces = camelCaseString.replace(/([A-Z][^A-Z\W]+|[\W]+|[A-Z]+(?![^A-Z]))/g, '|$1')
                // add this if you want to also capitalize the first letter: .replace(/^./, function(str){ return str.toUpperCase(); })
                stringWithSpaces = stringWithSpaces.trim();
                words = stringWithSpaces.split(/\|/);
                words = words.filter(x => x.length > 0);
                /*
                for (var i = 0; i < words.length; i++) {
                    words[i] = words[i].trim();
                }
                */
            }
            return words;
        }
    }
