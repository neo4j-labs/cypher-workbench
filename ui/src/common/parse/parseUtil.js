
export const hasDescendentsOfType = (parseNode, type) => {
    if (parseNode && parseNode.children) {
        const match = parseNode.children.find(child => {
            const childType = getType(child);
            //console.log(`checking childType ${childType} vs ${type}`);
            return childType === type || hasDescendentsOfType(child, type);
        });
        return (match) ? true : false;
    }
    return false;
}

export const getDescendentsOfType = (parseNode, type) => {
    var descendents = [];
    if (parseNode && parseNode.children) {
        parseNode.children.map(child => {
            if (getType(child) === type) {
                descendents.push(child);
            }
            descendents = descendents.concat(getDescendentsOfType(child, type));
        });
    }
    return descendents;
}

export const getType = (parseNode) => (typeof(parseNode) === 'object') ? parseNode.constructor.name : null;

export const processTokens = (tokens, parser, cypherLines, options) => {
    options = options || {};
    var returnTokens = [];
    if (tokens) {
        returnTokens = tokens
            .map(token => {
                const lineIndex = token.line - 1;
                const line = (cypherLines) ? cypherLines[lineIndex] : '';
                return {
                    type: parser.symbolicNames[token.type],
                    text: line.substring(token.start, token.stop + 1)
                }
            })

        if (!options.leaveSpaces) {
            returnTokens = returnTokens.filter(textWithType => textWithType.type !== 'SP');
        }
    }
    return returnTokens;
}