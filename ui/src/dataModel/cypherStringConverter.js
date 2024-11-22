
import { parseStatement } from '../common/parse/parseCypher';
import CypherClause from './cypherClause';
import { 
    NodePattern, 
    RelationshipPattern,
    PathPattern,
    PatternPart,
    PatternElementChainLink,
    Pattern,
    RELATIONSHIP_DIRECTION,
    QuantifiedPathPattern
} from './cypherPattern';
import {  
    ReturnClause,
    SimpleReturnItem,
    parseReturnItemText,
    returnItem
} from './cypherReturn';
import {
    OrderByClause,
    orderByItem,
    ORDER_DIRECTION
} from './cypherOrderBy';
import {
    WhereClause,
    whereItem
} from './cypherWhere';
import UnionClause from './cypherUnion';
import SubQueryClause from './cypherSubQuery';

export const getCypherStringFromClauses = (clauses) => {
    let space = '';

    var clauseStrings = clauses.map(clause => {
        if (clause.clauseInfo && clause.clauseInfo.toCypherString) {
            if (clause.clauseInfo instanceof Pattern) {
              let clauseCypher = clause.clauseInfo.toCypherString();
              space = clauseCypher.match(/^\s/) ? '' : ' ';
              return `${clause.keyword}${space}${clauseCypher}`
            } else {
              return clause.clauseInfo.toCypherString();
            }
        } else if (clause.toCypherString) {
            return clause.toCypherString();
        } else {
            space = clause?.clauseInfo?.match(/^\s/) ? '' : ' ';
            return `${clause.keyword}${space}${clause.clauseInfo}`;
        }
    })
    var returnCypher = clauseStrings.join('\n');
    return returnCypher;
}

export default class CypherStringConverter {

    convertProperties = (parsedProperties) => {
        var props = {};
        Object.keys(parsedProperties).map(key => {
            var value = parsedProperties[key];
            //console.log('value: ', value);
            //console.log('typeof(value): ', typeof(value));
            if (typeof(value) == 'string') {
                if (value.match) {
                    // fix quotes
                    const result = value.match(/^['"](.*)['"]$/);
                    if (result) {
                        //value = result[1];
                        // do nothing - don't want to remove quotes
                    } else if (value === 'true' || value === 'false') {
                        value = (value === 'true');
                    } else {
                        var number = parseFloat(value);
                        //console.log('number: ', number);
                        if (!isNaN(number)) {
                            if (Math.floor(number) === number) {
                                value = parseInt(number);
                            } else {
                                value = number;
                            }
                        }
                    }
                }
            }  
            props[key] = value;
        });
        return props;
    }

    convertNodePattern = (parsedNodePattern) => {
        var nodePattern = new NodePattern();
        nodePattern.variable = parsedNodePattern.variable;
        nodePattern.nodeLabels = parsedNodePattern.nodeLabels.slice();
        nodePattern.propertyMap = this.convertProperties(parsedNodePattern.properties || {});
        nodePattern.nodeLabelString = parsedNodePattern.nodeLabelString;
        if (parsedNodePattern.where) {
            //console.log('parsedNodePattern.where: ', parsedNodePattern.where);
            nodePattern.where = this.convertToWhere(parsedNodePattern.where);
            //console.log('nodePattern.where: ', nodePattern.where);
        }
        //console.log('nodePattern: ', nodePattern);
        return nodePattern;
    }

    convertRelationshipPattern = (parsedRelationshipPattern) => {
        var relationshipPattern = new RelationshipPattern();
        relationshipPattern.variable = parsedRelationshipPattern.variable;
        relationshipPattern.types = parsedRelationshipPattern.relationshipTypes.slice();
        relationshipPattern.propertyMap = this.convertProperties(parsedRelationshipPattern.properties || {});
        relationshipPattern.relationshipTypeString = parsedRelationshipPattern.relationshipTypeString;

        if (parsedRelationshipPattern.leftArrowDirection === '<-') {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.LEFT;
        } else if (parsedRelationshipPattern.rightArrowDirection === '->') {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.RIGHT;
        } else {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.NONE;
        }

        relationshipPattern.rangeLiteral = parsedRelationshipPattern.rangeLiteral;
        relationshipPattern.variableLengthStart = parsedRelationshipPattern.rangeLow;
        relationshipPattern.variableLengthEnd = parsedRelationshipPattern.rangeHigh;
        relationshipPattern.patternQuantifier = parsedRelationshipPattern.patternQuantifier;

        if (parsedRelationshipPattern.where) {
            relationshipPattern.where = this.convertToWhere(parsedRelationshipPattern.where);            
        }

        if (parsedRelationshipPattern.quantifiedPathPattern) {
            //console.log('parsedRelationshipPattern.quantifiedPathPattern: ', parsedRelationshipPattern.quantifiedPathPattern)
            relationshipPattern.quantifiedPathPattern = this.convertQuantifiedPathPattern(parsedRelationshipPattern.quantifiedPathPattern);
            //console.log('relationshipPattern.quantifiedPathPattern: ', relationshipPattern.quantifiedPathPattern);
        }

        return relationshipPattern;
    }

    convertQuantifiedPathPattern = (parsedQuantifiedPathPattern) => {
        var quantifiedPathPattern = new QuantifiedPathPattern();

        quantifiedPathPattern.pathPattern = this.convertToPathPattern(parsedQuantifiedPathPattern.patternElement);
        quantifiedPathPattern.where = this.convertToWhere(parsedQuantifiedPathPattern.where);
        //console.log('quantifiedPathPattern.where: ', quantifiedPathPattern.where);
        quantifiedPathPattern.pathPatternQuantifier = parsedQuantifiedPathPattern.patternQuantifier;

        return quantifiedPathPattern;
    }

    convertToPathPattern = (patternElement) => {
        var pathPattern = new PathPattern();

        if (patternElement.nodePattern) {
            pathPattern.nodePattern = this.convertNodePattern(patternElement.nodePattern);
        }

        if (Array.isArray(patternElement.patternElementChain)) {
            patternElement.patternElementChain.map(chainItem => {
                var chainLink = new PatternElementChainLink();
                if (chainItem.nodePattern) {
                    chainLink.nodePattern = this.convertNodePattern(chainItem.nodePattern);
                }
                //console.log('chainItem.relationshipPattern: ', chainItem.relationshipPattern);
                chainLink.relationshipPattern = this.convertRelationshipPattern(chainItem.relationshipPattern);
                //console.log('chainLink.relationshipPattern: ', chainLink.relationshipPattern);
                pathPattern.addPatternElementChain(chainLink);
            });
        }

        if (patternElement.quantifiedPathPattern) {
            pathPattern.quantifiedPathPattern = this.convertQuantifiedPathPattern(patternElement.quantifiedPathPattern);
        }
        return pathPattern;
    }

    convertToMatch = (matchClause, returnClauses) => {

        var pattern = new Pattern();
        if (matchClause.pattern && matchClause.pattern.patternPart && Array.isArray(matchClause.pattern.patternPart)) {
            matchClause.pattern.patternPart.map(part => {

                let constructorArgs = {};
                var shortestPathPattern = part?.anonymousPatternPart?.shortestPathPattern;
                if (shortestPathPattern) {
                    let { shortestPath, isFunction } = shortestPathPattern;
                    constructorArgs.shortestPath = shortestPath;
                    constructorArgs.shortestPathIsFunction = isFunction;
                }
                var patternPart = new PatternPart(constructorArgs);
                pattern.addPatternPart(patternPart);

                patternPart.variable = part.variable;

                // look in all of the places where there might be patternElements
                var patternElements = part.anonymousPatternPart?.patternElements || []
                var shortestPathEl = part.anonymousPatternPart?.shortestPathPattern?.patternElement;

                patternElements.push(shortestPathEl);
                patternElements.push(part.patternElement);

                // now filter out all of the undefined/null ones
                patternElements = patternElements.map(x => x);

                patternElements.forEach(patternElement => {
                    //console.log('patternElement: ', patternElement);
                    if (patternElement) {
                        let pathPattern = this.convertToPathPattern(patternElement);
                        patternPart.addPathPattern(pathPattern);
                        //console.log('pathPattern: ', pathPattern);
                    }
                });                                     
            })
        }

        //console.log('matchClause: ', matchClause);
        var cypherMatchClause = new CypherClause({
            keyword: (matchClause.optionalMatch) ? 'OPTIONAL MATCH' : 'MATCH',
            clauseInfo: pattern
        });
        returnClauses.push(cypherMatchClause);

        if (matchClause.where) {
            this.convertToWhere(matchClause.where, returnClauses);
        }

        this.handleOrderBySkipAndLimit(matchClause, returnClauses);

        return cypherMatchClause;
    }

    convertToWhere = (whereClause, returnClauses) => {
        if (whereClause) {
            var whereExpression = (typeof(whereClause) === 'string') ? whereClause : whereClause.whereExpression;
            var clauseInfo = whereExpression;
            if (whereExpression && whereExpression.split) {
                clauseInfo = new WhereClause();
                var tokens = whereExpression.split(' ');
                tokens.map((x,i) => {
                    var whereTokenText = (i === tokens.length - 1) ? x : `${x} `;
                    var whereToken = whereItem(whereTokenText);
                    clauseInfo.addWhereItem(whereToken);
                });
            } 
            if (returnClauses) {
                var cypherWhereClause = new CypherClause({
                    keyword: 'WHERE',
                    clauseInfo: clauseInfo 
                });
                returnClauses.push(cypherWhereClause);
            }
            return clauseInfo;
        }
        return null;
    }

    handleOrderBySkipAndLimit = (matchWithOrReturnBody, returnClauses) => {
        if (matchWithOrReturnBody.orderBy) {
            this.convertToOrderBy(matchWithOrReturnBody.orderBy, returnClauses);
        }
        if (matchWithOrReturnBody.skip) {
            returnClauses.push(new CypherClause({
                keyword: matchWithOrReturnBody.skipKeyword,
                clauseInfo: matchWithOrReturnBody.skip
            }));
        }
        if (matchWithOrReturnBody.limit) {
            // NOTE: not exactly sure why I didn't use cypherLimit here
            //  it probably could be switched - but if so, 
            //  switch code in cypherSubQuery containsLimitAfterReturn
            returnClauses.push(new CypherClause({
                keyword: 'LIMIT',
                clauseInfo: matchWithOrReturnBody.limit
            }));
        }        
    }

    convertReturnBody = (returnBody, returnClauses, keyword, addReturnItemsAsString) => {
        /*
        returnBody
          returnAsterisk
          returnItems
            this.expression = null;
            this.parsedExpression = null;
            this.asVariable = null;

          orderBy: null,
          skip: null,
          limit: null,
        */

        // console.log('returnBody: ', returnBody);
        // console.log('returnClauses: ', returnClauses);

        var clauseInfo = '';
        var cypherReturnClause = null;
        if (returnBody) {
            if (Array.isArray(returnBody.returnItems)) {
                if (addReturnItemsAsString) {
                    // console.log('returnBody.returnItems: ', returnBody.returnItems);
                    clauseInfo = returnBody.returnItems.map(x => 
                        (x.asVariable && x.asVariable !== x.expression) ? `${x.expression} as ${x.asVariable}` : x.expression
                    ).join(', ');
                    // console.log('clauseInfo: ', clauseInfo);

                    if (returnBody.returnAsterisk) {
                        let clauseInfoStr = (clauseInfo) ? `, ${clauseInfo}` : ''
                        clauseInfo = `*${clauseInfoStr}`; 
                    }                    
                    // console.log('clauseInfo: ', clauseInfo);
                } else {
                    clauseInfo = new ReturnClause();
                    if (returnBody.returnAsterisk) {
                        var asterisk = new SimpleReturnItem({isAsterisk: true})
                        clauseInfo.addReturnItem(asterisk);
                    }
                    returnBody.returnItems.map(x => {
                        var returnItemText = (x.asVariable && x.asVariable !== x.expression) ? `${x.expression} as ${x.asVariable}` : x.expression;        
                        var parseObj = parseReturnItemText(returnItemText);
                        var simpleReturnItem = returnItem(parseObj.variable, parseObj.propertyExpression, parseObj.alias);
                        clauseInfo.addReturnItem(simpleReturnItem);
                    });
                }
            } else if (returnBody.returnAsterisk) {
                clauseInfo = '*';
            }
            cypherReturnClause = new CypherClause({ keyword, clauseInfo });
            returnClauses.push(cypherReturnClause);

            this.handleOrderBySkipAndLimit(returnBody, returnClauses);
            // if (returnBody.orderBy) {
            //     this.convertToOrderBy(returnBody.orderBy, returnClauses);
            // }
            // if (returnBody.skip) {
            //     returnClauses.push(new CypherClause({
            //         keyword: returnBody.skipKeyword,
            //         clauseInfo: returnBody.skip
            //     }));
            // }
            // if (returnBody.limit) {
            //     // NOTE: not exactly sure why I didn't use cypherLimit here
            //     //  it probably could be switched - but if so, 
            //     //  switch code in cypherSubQuery containsLimitAfterReturn
            //     returnClauses.push(new CypherClause({
            //         keyword: 'LIMIT',
            //         clauseInfo: returnBody.limit
            //     }));
            // }
        } else {
            cypherReturnClause = new CypherClause({ keyword, clauseInfo });
            returnClauses.push(cypherReturnClause);
        }
        return cypherReturnClause;
        
        //console.log('returnClause: ', returnClause);
    }

    convertToReturn = (returnClause, returnClauses) => {
        if (returnClause && returnClause.returnBody) {
            // TODO: double check DISTINCT
            var returnBody = returnClause.returnBody;
            return this.convertReturnBody(returnBody, returnClauses, 'RETURN');
        }
    }

    convertToWith = (withClause, returnClauses) => {
        if (withClause && withClause.returnBody) {
            // TODO: double check DISTINCT, when adding -
            var returnBody = withClause.returnBody;
            let withCypherClause = this.convertReturnBody(returnBody, returnClauses, 'WITH', true);
            // console.log('withCypherClause: ', withCypherClause)

            if (withClause.where) {
                this.convertToWhere(withClause.where, returnClauses);
            }

            this.handleOrderBySkipAndLimit(withClause, returnClauses);

            return withCypherClause;
        }
    }

    convertToOrderBy = (orderByClause, returnClauses) => {
        if (orderByClause && Array.isArray(orderByClause.sortItems)) {
            var clauseInfo = new OrderByClause();
            orderByClause.sortItems.map(x => {
                var ascDesc = (x.ascendingDescending) ? x.ascendingDescending.toLowerCase() : '';
                var orderDirection = ORDER_DIRECTION.ASC;
                if (ascDesc === 'desc' || ascDesc === 'descending') {
                    orderDirection = ORDER_DIRECTION.DESC;
                }
                clauseInfo.addOrderByItem(orderByItem(x.expression, orderDirection));
            });
            var cypherClause = new CypherClause({
                keyword: 'ORDER BY',
                clauseInfo: clauseInfo
            });
            returnClauses.push(cypherClause);
        }
    }

    convertToUnwind = (unwindClause, returnClauses) => {
        if (unwindClause) {
            var cypherClause = new CypherClause({
                keyword: 'UNWIND',
                clauseInfo: `${unwindClause.expression} AS ${unwindClause.asVariable}`
            });
            returnClauses.push(cypherClause);
        }
    }

    convertToInQueryCall = (clause, returnClauses) => {
        if (clause && clause.toString) {
            let keyword = clause.optionalCall ? 'OPTIONAL CALL' : 'CALL';
            let conversionFunc = this.convertToKeywordAndText(keyword);
            return conversionFunc(clause, returnClauses);
        }
    }

    convertToKeywordAndText = (keyword) => (clause, returnClauses) => {
        if (clause && clause.toString) {
            var text = clause.toString();
            var regexp = new RegExp(`^${keyword}`, 'i');
            if (text.trim().match(regexp)) {
                text = text.substring(keyword.length).trim();
            }
            var cypherClause = new CypherClause({
                keyword: keyword,
                clauseInfo: text
            });
            returnClauses.push(cypherClause);
            return cypherClause;
        }
    }

    setUnionInfo = (parsedUnionClause, returnClauses) => {
        //console.log(JSON.stringify(unionClause, null, 4));

        // all of the parts of the union will be caught and added to returnClauses through other methods
        // all we have to do here is the value of 'unionAll'
        let keyword = (parsedUnionClause.unionAll) ? 'UNION ALL' : 'UNION';
        var unionClause = new UnionClause({
            keyword: keyword
        });        

        // truncate existing return clauses and assign them to union
        unionClause.firstClauses = returnClauses.splice(0);
        returnClauses.push(unionClause);
        unionClause.secondClauses = [];
        //console.log('unionClause.firstClauses: ', unionClause.firstClauses);

        // and then we need to parse through the rest of the query, anything else is the second part of the union
        this.recurseThroughParsedCypher(parsedUnionClause.singleQuery, unionClause.secondClauses);
        //console.log('unionClause.singleQuery: ', unionClause);
        return unionClause;
    }

    convertToSubQuery = (parsedSubQueryClause, returnClauses) => {

        var subqueryClause = new SubQueryClause({
            isOptional: parsedSubQueryClause.optionalCall,
            importedVariableString: parsedSubQueryClause.subQueryVariableScope,
            subQueryDirective: parsedSubQueryClause.subQueryDirective    
        });
        returnClauses.push(subqueryClause);

        this.recurseThroughParsedCypher(parsedSubQueryClause.subQuery, subqueryClause.clauses, { captureVariables: true });
    }

    constructor () {
        this.clauseConverters = {
            Union: this.setUnionInfo,
            Match: this.convertToMatch,
            With: this.convertToWith,
            Return: this.convertToReturn,
            Unwind: this.convertToUnwind,
            Create: this.convertToKeywordAndText('CREATE'),
            Merge: this.convertToKeywordAndText('MERGE'),
            Set: this.convertToKeywordAndText('SET'),
            LoadCSV: this.convertToKeywordAndText('LOAD CSV'),
            InQueryCall: this.convertToInQueryCall,
            StandaloneCall: this.convertToKeywordAndText('CALL'),
            // SubQuery: this.convertToKeywordAndText('CALL')
            SubQuery: this.convertToSubQuery
        }
    }

    recurseThroughParsedCypher = (parseResult, returnClauses, options = {}) => {
        if (parseResult) {
            var activeConverter = this.clauseConverters[parseResult.myName];
            if (activeConverter) {
                let clause = activeConverter(parseResult, returnClauses);
                if (clause && options.captureVariables) {
                    var variables = [];
                    this.collectAllParsedVariablesRecursive(parseResult, variables);
                    // NOTE: this is kind of a hack - I should provide a setParsedVariables method and call that in each clause
                    clause.parsedVariables = variables;
                }
            } else {
                if (typeof(parseResult) === 'object') {
                    var values = Object.values(parseResult);
                    values.map(value => {
                        if (Array.isArray(value)) {
                            value.map(x => this.recurseThroughParsedCypher(x, returnClauses, options));
                        } else if (typeof(value) === 'object') {
                            this.recurseThroughParsedCypher(value, returnClauses, options);
                        }
                    });
                }
            }
        }
    }

    collectAllParsedVariablesRecursive = (parseResult, returnVariables) => {
        if (parseResult) {
            if (parseResult.variable || parseResult.asVariable) {
                var varToAdd = parseResult.variable || parseResult.asVariable;
                if (!returnVariables.includes(varToAdd)) {
                    returnVariables.push(varToAdd);
                }
            }

            if (typeof(parseResult) === 'object') {
                var values = Object.values(parseResult);
                if (values && values.forEach) {
                    values.forEach(value => this.collectAllParsedVariablesRecursive(value, returnVariables));
                }
            } else if (Array.isArray(parseResult)) {
                if (parseResult && parseResult.forEach) {
                    parseResult.forEach(x => this.collectAllParsedVariablesRecursive(x, returnVariables));
                }
            }
        }
    }

    getAllVariables = (cypherString) => {
        var parseResult = parseStatement(cypherString);

        var returnVariables = [];
        this.collectAllParsedVariablesRecursive(parseResult, returnVariables);
        return returnVariables;
    }

    convertToClauses = (cypherString, options = {}) => {
        var parseResult = parseStatement(cypherString);
        
        var returnClauses = parseResult.cypherOption ? [
                new CypherClause({
                    keyword: 'CYPHER',
                    clauseInfo: parseResult.cypherOption.trim().substring('CYPHER '.length)
                })
            ] : [];
        this.recurseThroughParsedCypher(parseResult, returnClauses, options);

        // console.log('parseResult: ', parseResult);
        // console.log('parseResult.regularQuery.singleQuery.multiPartQuery.singlePartQuery.return:', 
        //         parseResult.regularQuery.singleQuery.multiPartQuery.singlePartQuery.return);
        // console.log('return:', parseResult.regularQuery.singleQuery.singlePartQuery);

        return returnClauses;
    }

    convertToClausesAndVariables = (cypherString, options = {}) => {
        var parseResult = parseStatement(cypherString);
        
        var returnClauses = parseResult.cypherOption ? [
            new CypherClause({
                keyword: 'CYPHER',
                clauseInfo: parseResult.cypherOption.trim().substring('CYPHER '.length)
            })
        ] : [];
        this.recurseThroughParsedCypher(parseResult, returnClauses, options);

        var returnVariables = [];
        this.collectAllParsedVariablesRecursive(parseResult, returnVariables);

        return { 
            returnClauses,
            returnVariables
        };
    }

}

