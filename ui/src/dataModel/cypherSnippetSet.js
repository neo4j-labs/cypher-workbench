
import { stringMatches } from '../common/parse/antlr/stringIndexFinder';
import { ExplanatoryMarker } from './explanations';

const startsWithSpace = (x) => x && x.indexOf && x.indexOf(' ') === 0 ? true : false;
const endsWithSpace = (x) => x && x.lastIndexOf && x.lastIndexOf(' ') === (x.length-1) ? true : false;

// we need this so as we get to snippets that are strings we can keep the association to the 
//   cypher object it came from
class SnippetWrapper {
    constructor(props = {}) {
        let { snippetVal, associatedCypherObject } = props;
        this.snippetVal = snippetVal;
        this.associatedCypherObject = associatedCypherObject;
    }
}

export class SnippetStringWithContext {
    constructor(props = {}) {
        let { 
            snippetStr, snippet, 
            associatedCypherObject,
            explanatoryMarker
        } = props;
        this.snippetStr = snippetStr;
        this.snippet = snippet;
        this.associatedCypherObject = associatedCypherObject;
        this.explanatoryMarker = explanatoryMarker;
    }

    getAssociatedCypherObject = () => {
        if (this.associatedCypherObject) {
            return this.associatedCypherObject;
        } else if (this.snippet && this.snippet.associatedCypherObject) {
            return this.snippet.associatedCypherObject;
        } else {
            return null;
        }
    }

    clone = () => {
        return new SnippetStringWithContext({
            snippetStr: this.snippetStr,
            snippet: this.snippet,
            associatedCypherObject: this.associatedCypherObject,
            explanatoryMarker: this.explanatoryMarker
        })
    }
}

const getSnippetVal = (snippet) => (snippet instanceof SnippetWrapper) ? snippet.snippetVal : snippet;

export default class SnippetSet {
    // cypherSnippet should be the result of toCypherString, should already include opener and closer
    //   Also: 
    //     if any of the SnippetSet's snippets are SnippetSets, it is expected that
    //     the cypherSnippet will contains the entire cypher string of the nested hierarchy
    //     this can be computed using computeCypherSnippet 
    cypherSnippet = '';

    // the cypher object associated with this snippet set
    associatedCypherObject = undefined;

    // id to identify this set by, useful for debugging
    id = ''; 

    // a marker that can be used to explain where we are or what is going on
    explanatoryMarker = ExplanatoryMarker.None;

    // something like '(' or '{'
    opener = '';

    // something like ')' or '}'
    closer = '';

    // something like '()' for the NodePattern in PatternElementChainLink
    commentSubstitionStr = '';

    // function to add a RETURN in a subquery
    subQueryReturn = null;
    // variables that are part of this snippet - needed to construct the RETURN clause in a subQuery
    parsedVariables = [];

    // skip adding any snippets from this set, perhaps because it's a placeholder for something empty
    //  probably used when commentSubstituionStr is populated
    //  like in the instance we have a qpp (()-[:OWNS]->())+ and the commentSubstitionStr is used to add the ()
    //  during the RelationshipPattern step
    //  therefore, skipMe would be set to not add () again

    // also in the case of qpp ((:Company)-[:OWNS]->()) we can't have just ((:Company)) as it's invalid qpp syntax
    //   so we should skip it
    skipMe = false;

    openComment = ' /* ';
    closeComment = ' */';

    // individual parts to add. 
    //  For instance a:A&(B|C) could potentially add a:A, a:A&(B), and a:A&(B|C)
    //  a snippet entry can also be a SnippetSet
    snippets = [];

    // a function to further process the string 
    processFunc = null;

    constructor (properties) {
        properties = properties || {};
        this.opener = typeof(properties.opener === 'string') ? properties.opener : '';
        this.closer = typeof(properties.closer === 'string') ? properties.closer : '';
        this.subQueryReturn = typeof(properties.subQueryReturn === 'function') ? properties.subQueryReturn : null;
        this.id = properties.id;
        this.explanatoryMarker = properties.explanatoryMarker ? properties.explanatoryMarker : ExplanatoryMarker.None;
        this.associatedCypherObject = properties.associatedCypherObject;
        this.cypherSnippet = typeof(properties.cypherSnippet === 'string') ? properties.cypherSnippet : '';
        this.snippets = Array.isArray(properties.snippets) ? properties.snippets : [];
        this.parsedVariables = Array.isArray(properties.parsedVariables) ? properties.parsedVariables : [];
        this.processFunc = typeof(properties.processFunc === 'function') ? properties.processFunc : null;
        if (properties.skipMe !== undefined) {
            this.skipMe = properties.skipMe;
        }
    }

    addAssociatedCypherObject = (snippet) => {
        // console.log('addAssociatedCypherObject snippet: ', snippet)
        let returnSnippet = snippet;
        if (typeof(snippet) !== 'object') {
            returnSnippet = new SnippetWrapper({
                snippetVal: snippet,
                associatedCypherObject: this.associatedCypherObject
            });
        } else {
            if (!returnSnippet.associatedCypherObject) {
                returnSnippet.associatedCypherObject = this.associatedCypherObject;
            }
        }
        return returnSnippet;
    }

    addOneOrMoreSnippets = (snippetOrSnippets) => {
        if (snippetOrSnippets !== undefined && snippetOrSnippets !== null) {
            if (Array.isArray(snippetOrSnippets)) {
                // transfer associatedCypherObject to children unless they specify it
                let alteredSnippets = snippetOrSnippets.map(x => this.addAssociatedCypherObject(x));
                this.snippets = this.snippets.concat(alteredSnippets);
            } else {
                // transfer associatedCypherObject to children unless they specify it
                this.snippets.push(this.addAssociatedCypherObject(snippetOrSnippets));
            }
        }
    }

    // getInScopeVariables = (snippetArray, varArray) => {
    //     console.log('snippetArray: ', snippetArray)
    //     varArray = varArray || [];  // this will initialize the var array on the first call
    //     snippetArray = snippetArray || [];
    //     snippetArray.forEach(snippet => {
    //         if (snippet instanceof SnippetSet) {
    //             varArray = this.getInScopeVariables(snippet.snippets, varArray);
    //         } else {
    //             if (snippet.parsedVariables?.length > 0) {
    //                 varArray = varArray.concat(snippet.parsedVariables);
    //             }
    //         }
    //     })
    //     return varArray;
    // }

    getSnippets = (args) => {
        let snippetStringPairs = this.getSnippetsAsSnippetStringPairs(args);
        let snippets = snippetStringPairs.map(x => x.snippetStr);
        return snippets;
    }

    getSnippetsAsSnippetStringPairs = (args, level = 1) => {
        let debug = false;
        args = args || {};
        // console.log('args: ', args);
        if (debug) {
            console.log(`
                *****************************************
                *** start getSnippets LEVEL: ${level}   
                *** id: ${this.id}                    
                *****************************************`)
        }
        let { beforeSnippetSets = [], afterSnippetSets = [], addComments = true } = args;
        if (debug) {
            console.log('beforeSnippetSets: ', beforeSnippetSets)
            console.log('afterSnippetSets: ', afterSnippetSets)
        }

        let initBeforeStr = beforeSnippetSets.map(x => (x instanceof SnippetSet) ? x.cypherSnippet : getSnippetVal(x)).join('');

        // the after str will be commented out, so if in the case where we need to substitute something
        //  instead of a comment to make valid Cypher, we will provide it in the commentSubstitionStr.
        //  For instance, a NodePattern following a RelationshipPattern can have the commentSubstitionStr '()'
        //  to make this valid -[:REL]->() /* (n:Foo) */.  Without it, it would be -[:REL]-> /* (n:Foo) */ which
        //  is invalid Cypher
        let commentSubstitionStr = afterSnippetSets.length > 0 ? afterSnippetSets[0].commentSubstitionStr || '' : '';
        let initAfterStr = afterSnippetSets.map(x => (x instanceof SnippetSet) ? x.cypherSnippet : getSnippetVal(x)).join('');
        if (debug) {
            console.log('initBeforeStr: ', initBeforeStr);
            console.log('initAfterStr: ', initAfterStr);
        }
        let returnSnippets = [];

        for (let i = 0; i < this.snippets.length; i++) {
            let beforeStr = initBeforeStr;
            let afterStr = initAfterStr;
            let currentSnippet = this.snippets[i];
            if (debug) {
                console.log('in for loop, currentSnippet: ', currentSnippet);
            }
            let extraBeforeSnippets = this.snippets.slice(0,i);
            if (debug) {
                console.log('extraBeforeSnippets: ', extraBeforeSnippets);
            }
            let extraAfterSnippets = this.snippets.slice(i+1);
            if (debug) {
                console.log('extraAfterSnippets: ', extraAfterSnippets);
            }

            let extraBefore = extraBeforeSnippets.map(x => 
                (x instanceof SnippetSet) ? x.cypherSnippet : getSnippetVal(x)
            ).join('');
            if (debug) {
                console.log('extraBefore: ', extraBefore);
            }
            let extraAfter = extraAfterSnippets.map(x => 
                (x instanceof SnippetSet) ? x.cypherSnippet : getSnippetVal(x)
            ).join('');
            if (debug) {
                console.log('extraAfter: ', extraAfter);
            }

            if (currentSnippet instanceof SnippetSet) {
                if (debug) {
                    console.log('calling currentSnippet.getSnippets for id: ', currentSnippet.id);
                }
                // NOTE: here we recurse
                let subSnippetPairs = currentSnippet.getSnippetsAsSnippetStringPairs({
                    beforeSnippetSets: extraBeforeSnippets,
                    afterSnippetSets: extraAfterSnippets,
                    addComments: true
                }, level + 1);
                if (debug) {
                    console.log('subSnippetPairs after currentSnippet.getSnippetsAsSnippetStringPairs: ', subSnippetPairs);
                }
                subSnippetPairs = subSnippetPairs.map((subSnippetPair,i) => {
                    if (debug) {
                        console.log('subSnippetPair: ', subSnippetPair);
                    }
                    let { 
                        snippetStr, 
                        snippet,
                        explanatoryMarker
                    } = subSnippetPair;

                    let subSnippet = snippetStr;
                    if (debug) {
                        console.log('subSnippet: ', subSnippet);
                    }
                    afterStr = initAfterStr;
                    if (debug) {
                        console.log('in map afterStr: ', afterStr);
                    }
                    
                    let subSnippetStr = '';

                    if (initBeforeStr) {
                        subSnippetStr = initBeforeStr;
                    }

                    subSnippetStr += (this.opener) ? this.opener : '';
                    subSnippetStr += subSnippet;
                    if (this.processFunc) {
                        subSnippetStr = this.processFunc(subSnippetStr);
                    }

                    if (currentSnippet.subQueryReturn) {
                        let activeSubSnippets = subSnippetPairs.slice(0,i+1);
                        subSnippetStr += currentSnippet.subQueryReturn(currentSnippet, activeSubSnippets)
                    }

                    subSnippetStr += (this.closer) ? this.closer : '';
                    subSnippetStr += commentSubstitionStr;

                    if (debug) {
                        console.log('addComments: ', addComments);
                    }

                    // special case for handling adding () to -RELATIONSHIP->
                    if (afterStr === '()' && commentSubstitionStr == '()') {
                        // do nothing
                    } else {
                        afterStr = (afterStr && addComments) ? `${this.openComment}${afterStr}${this.closeComment}` : afterStr;
                        if (afterStr) {
                            subSnippetStr += afterStr;
                        }
                    }

                    if (debug) {
                        console.log('subSnippetStr: ', subSnippetStr);
                    }
                    // return {
                    //     snippetStr: subSnippetStr,
                    //     snippet
                    // };

                    return new SnippetStringWithContext({
                        snippetStr: subSnippetStr,
                        snippet,
                        explanatoryMarker: explanatoryMarker
                    });
                });
                if (debug) {
                    console.log('subSnippetPairs: ', subSnippetPairs);
                }

                if (!this.skipMe) {
                    returnSnippets = returnSnippets.concat(subSnippetPairs);
                }
            } else {
                if (debug) {
                    console.log('afterStr (1): ', afterStr);
                }
    
                let str = '';
                str += getSnippetVal(currentSnippet);
                if (this.processFunc) {
                    str = this.processFunc(str);
                }

                let opener = (this.opener) ? this.opener : '';
                let closer = (this.closer) ? this.closer : '';
                closer += commentSubstitionStr;

                if (endsWithSpace(this.openComment) && startsWithSpace(extraAfter)) {
                    extraAfter = extraAfter.substring(1);
                }

                if (debug) {
                    console.log(`extraAfter (1): '${extraAfter}'`);
                    console.log(`afterStr (1): '${afterStr}'`);
                }

                if (closer) {
                    if (endsWithSpace(this.openComment) && startsWithSpace(afterStr)) {
                        afterStr = afterStr.substring(1);
                    }
    
                    extraAfter = (extraAfter && addComments) ? `${this.openComment}${extraAfter}${this.closeComment}` : extraAfter;
                    afterStr = (afterStr && addComments) ? `${this.openComment}${afterStr}${this.closeComment}` : afterStr;

                    if (debug) {
                        console.log(`extraAfter (2): '${extraAfter}'`);
                        console.log(`afterStr (2): '${afterStr}'`);
                    }
                } else {
                    // don't want to have back to back comments if it's not necessary
                    if (!extraAfter && endsWithSpace(this.openComment) && startsWithSpace(afterStr)) {
                        afterStr = afterStr.substring(1);
                    }
                    extraAfter = ((extraAfter || afterStr) && addComments) ? `${this.openComment}${extraAfter}` : extraAfter;
                    afterStr = ((extraAfter || afterStr) && addComments) ? `${afterStr}${this.closeComment}` : afterStr;
                    if (debug) {
                        console.log(`extraAfter (3): '${extraAfter}'`);
                        console.log(`afterStr (3): '${afterStr}'`);
                    }
                }

                if (debug) {
                    console.log('afterStr (2): ', afterStr);
                }
                str = `${beforeStr}${opener}${extraBefore}${str}${extraAfter}${closer}${afterStr}`;
    
                if (!this.skipMe) {
                    // returnSnippets.push({
                    //     snippetStr: str, snippet: currentSnippet, 
                    //     associatedCypherObject: this.associatedCypherObject
                    // });
                    returnSnippets.push(new SnippetStringWithContext({
                        snippetStr: str, snippet: currentSnippet, 
                        associatedCypherObject: this.associatedCypherObject,
                        explanatoryMarker: this.explanatoryMarker
                    }));
                }
            }
        }

        // remove any duplicates
        if (returnSnippets.length > 1) {

            let uniqueReturnSnippets = [];
            returnSnippets.forEach(snippetPair => {
                let { snippetStr } = snippetPair;
                if (!uniqueReturnSnippets.includes(snippetStr)) {
                    uniqueReturnSnippets.push(snippetPair);
                }
            }) 
            returnSnippets = uniqueReturnSnippets;
            // can't do below line now that we've switch to pairs
            // returnSnippets = Array.from(new Set(returnSnippets));

            // combine any adjoining comments
               // this:
               //   "(a:A { foo:1, bar:2 })-[:TO /* WHERE a.x = 'foo' */]->() /* (b:B) */ /* -[:TO]->(c:C&(D|E)) */"
               // will be converted to this:
               //   "(a:A { foo:1, bar:2 })-[:TO /* WHERE a.x = 'foo' */]->() /* (b:B)-[:TO]->(c:C&(D|E)) */"

            returnSnippets.forEach(snippetPair => 
                snippetPair.snippetStr = snippetPair.snippetStr.replace(/\s*\*\/\s*\/\*[\s\h*]/, '')  // \s for 1 trailing space or \h* for spaces but not newlines. \h = horizontal
            )            
            // old non-pair syntax
            // returnSnippets = returnSnippets.map(snippet => 
            //     snippet.replace(/\s*\*\/\s*\/\*[\s\h*]/, '')  // \s for 1 trailing space or \h* for spaces but not newlines. \h = horizontal
            // )
        }

        // remove any duplicates 2 - check for cases where two consecutive snippets are functionally the same
        //        '(()-[:OWNS]->() /* () */) /* + */',
        //        '(()-[:OWNS]->()) /* + */',
        for (let i = 1; i < returnSnippets.length; i++) {
            if (stringMatches(returnSnippets[i-1].snippetStr, returnSnippets[i].snippetStr)) {
                // console.log('i-1: ', returnSnippets[i-1].snippetStr)
                // console.log('i: ', returnSnippets[i].snippetStr);
                // console.log('i: ', i)
                returnSnippets.splice(i-1, 1);  // get rid of the first one, save the second one
                i--;
            }
        }

        if (returnSnippets.length === 0 && !this.skipMe) {
            let snippetToAdd = '';
            if (initBeforeStr) {
                snippetToAdd = initBeforeStr;
            }
            snippetToAdd += (this.opener) ? this.opener : '';
            snippetToAdd += (this.closer) ? this.closer : '';
            initAfterStr = (initAfterStr && addComments) ? `${this.openComment}${initAfterStr}${this.closeComment}` : initAfterStr;
            if (initAfterStr) {
                snippetToAdd += initAfterStr;
            }            
            if (snippetToAdd) {
                // returnSnippets.push({
                //     snippetStr: snippetToAdd,
                //     snippet: snippetToAdd
                // });
                returnSnippets.push(new SnippetStringWithContext({
                    snippetStr: snippetToAdd,
                    snippet: snippetToAdd
                }));
            }            
        }

        if (debug) {
            console.log(`
                *****************************************
                *** end getSnippets LEVEL: ${level}   
                *** id: ${this.id}                    
                *****************************************`)
        }

        return returnSnippets;
    }

    computeCypherSnippet = () => {
        let snippetStrs = this.snippets.map(snippet => 
            (snippet instanceof SnippetSet) ? snippet.computeCypherSnippet() : getSnippetVal(snippet)
        );
        let fullSnippet = snippetStrs.join('');
        let str = (this.opener) ? this.opener : '';
        str += fullSnippet;
        str += (this.closer) ? this.closer : '';
        return str;
    }
}