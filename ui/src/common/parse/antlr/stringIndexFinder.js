
import { skipIfComment } from './commentUtil'
/*
these utility functions will help to match up parsed chunks of a query
back to the original query

right now the antlr parsing (in other files) doesn't preserve whitespace properly or comments
so we need a way to match the parsed bits back to the original query
*/

// list from Cypher.g4: open cypher 'SP' term in grammar
//   also - these references are handy 
//     https://www.compart.com/en/unicode/bidiclass/WS
//     https://www.compart.com/en/unicode/U+<hexcode>
//     https://en.wikipedia.org/wiki/Whitespace_character
let spaceChars = [' ', '\t', '\n', '\r', '\f', 
        '\u{000B}', // VT (Line Tabulation)
        '\u{001C}', // FS (File Separator)
        '\u{001D}', // GS (Group Separator)
        '\u{001E}', // RS (Information Separator Two)
        '\u{001F}', // US (Information Separator One)
        '\u{00A0}', // NBSP (No-Break Space)
        '\u{1680}', // ogham space mark
        '\u{180E}', // mongolian vowel separator
        '\u{2000}', // en quad
        '\u{2001}', // em quad
        '\u{2002}', // en space
        '\u{2003}', // em space
        '\u{2004}', // three-per-em space
        '\u{2005}', // four-per-em space
        '\u{2006}', // six-per-em-space
        '\u{2007}', // figure space
        '\u{2008}', // punctuation space
        '\u{2009}', // thin space
        '\u{200A}', // hair space
        '\u{2028}', // line separator
        '\u{2029}', // paragraph separator
        '\u{202F}', // narrow no-break space (NNBSP)
        '\u{205F}', // medium mathematical space (MMSP)
        '\u{3000}'  // ideographic space       
]

let isSpaceChar = (char) => spaceChars.includes(char);

export function findIndexes (originalString, stringToMatch, startIndex = 0) {
    let beforeSpace = '';
    let afterSpace = '';
    let beginIndex = startIndex;   
    let matchIndex = 0;
    let origIndex = startIndex;
    let matches = true;

    let firstValidMatchCharFound = false;

    let reachedEndOfOrigString = false;
    let reachedEndOfMatchString = false;

    let trailingCommentLen = 0;

    // console.log('originalString: ', originalString);
    // console.log('stringToMatch: ', stringToMatch);
    // console.log('startIndex: ', startIndex);
    while (matchIndex < stringToMatch.length) {

        // ignore comments
        origIndex = skipIfComment(originalString, origIndex);
        //console.log('origIndex (0): ', origIndex);
        if (!firstValidMatchCharFound) {
            beginIndex = origIndex;
        }

        matchIndex = skipIfComment(stringToMatch, matchIndex);
        // console.log('matchIndex: ', matchIndex);
        if (matchIndex >= stringToMatch.length) {
            reachedEndOfMatchString = true;
            break;
        }

        let origChar = originalString.charAt(origIndex);
        afterSpace = '';
        trailingCommentLen = 0;
        // console.log('afterSpace reset')
        while (isSpaceChar(origChar)) {
            if (!firstValidMatchCharFound) {
                beforeSpace += origChar;
                beginIndex = origIndex + 1;
                // console.log('beforeSpace.length: ', beforeSpace.length)
            } else {
                afterSpace += origChar;
                // console.log('afterSpace.length: ', afterSpace.length)
            }
            origIndex++;
            // console.log('origIndex (1): ', origIndex);
            if (origIndex >= originalString.length) {
                reachedEndOfOrigString = true;
                break;
            }
            let newOrigIndex = skipIfComment(originalString, origIndex);
            trailingCommentLen = newOrigIndex - origIndex;
            origIndex = newOrigIndex;
            
            // console.log('origIndex (2): ', origIndex);
            if (origIndex >= originalString.length) {
                reachedEndOfOrigString = true;
                break;
            }
            origChar = originalString.charAt(origIndex);
        }

        let matchChar = stringToMatch.charAt(matchIndex);
        while (isSpaceChar(matchChar)) {
            matchIndex++;
            if (matchIndex >= stringToMatch.length) {
                // we need to roll back the orig index in the case where it had extra characters but our string to match was complete
                if (!isSpaceChar(origChar)) {
                    origIndex--;
                    // console.log('origIndex (4): ', origIndex);
                }
                reachedEndOfMatchString = true;
                break;
            }
            matchIndex = skipIfComment(stringToMatch, matchIndex);
            if (matchIndex >= stringToMatch.length) {
                // we need to roll back the orig index in the case where it had extra characters but our string to match was complete
                if (!isSpaceChar(origChar)) {
                    origIndex--;
                    // console.log('origIndex (5): ', origIndex);
                }
                reachedEndOfMatchString = true;
                break;
            }

            matchChar = stringToMatch.charAt(matchIndex);
        }
        firstValidMatchCharFound = true;

        // console.log('origChar: ', origChar)
        // console.log('matchChar: ', matchChar)
        if (matchChar !== origChar && !isSpaceChar(matchChar) && !isSpaceChar(matchChar)) {
            // console.log('matches = false')
            // console.log('origChar charCode', origChar.charCodeAt(0))
            // console.log('matchChar charCode', matchChar.charCodeAt(0))
            matches = false;
            break;
        } 

        if (!reachedEndOfOrigString) {
            origIndex++;
            // console.log('origIndex (3): ', origIndex);
        } 
        if (!reachedEndOfMatchString) {
            matchIndex++;
        } 
    }

    let endIndex = origIndex - afterSpace.length - trailingCommentLen;

    // compute any remaining after space
    let afterSpaceIndex = origIndex;
    while (afterSpaceIndex < originalString.length) {
        let origChar = originalString.charAt(afterSpaceIndex);
        if (isSpaceChar(origChar)) {
            afterSpace += origChar;
            afterSpaceIndex++;
        } else {
            break;
        }
    }

    // console.log('origIndex: ', origIndex);
    // console.log('afterSpace.length: ', afterSpace.length);
    // console.log('endIndex: ', endIndex);

    return {
        matches,
        beforeSpace,
        afterSpace,
        trailingCommentLen,
        startIndex: beginIndex, 
        endIndex: endIndex
    }
}

export function findAllIndexes (originalString, stringArrayToMatch, startingIndex = 0) {
    let results = [];
    let startingIndexToUse = startingIndex;
    for (let i = 0; i < stringArrayToMatch.length; i++) {
        let stringToFind = stringArrayToMatch[i];
        // console.log('stringToFind: ', stringToFind)
        // console.log('startingIndexToUse: ', startingIndexToUse)
        let result = findIndexes(originalString, stringToFind, startingIndexToUse);
        results.push(result);
        if (!result.matches) {
            break;
        }
        startingIndexToUse = result.endIndex;
    }
    return results;
}

export function stringMatches (originalString, stringToMatch) {
    let {
        matches,
        afterSpace,
        trailingCommentLen,
        endIndex
    } = findIndexes(originalString, stringToMatch);

    // console.log('matches: ', matches);
    // console.log('originalString.length: ', originalString.length);
    // console.log('endIndex: ', endIndex);
    // console.log('afterSpace.length: ', afterSpace.length);
    
    if (matches && originalString.length === (endIndex + afterSpace.length + trailingCommentLen)) {
        return true;
    } else {
        return false;
    }
}


