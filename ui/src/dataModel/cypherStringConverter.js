
import { parseStatement } from '../common/parse/parseCypher';
import CypherClause from './cypherClause';
import { 
    NodePattern, 
    RelationshipPattern,
    PathPattern,
    PatternPart,
    PatternElementChainLink,
    Pattern,
    RELATIONSHIP_DIRECTION
} from './cypherPattern';
import {  
    ReturnClause,
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

export const getCypherStringFromClauses = (clauses) => {
    var clauseStrings = clauses.map(clause => {
        if (clause.clauseInfo && clause.clauseInfo.toCypherString) {
            if (clause.clauseInfo instanceof Pattern) {
              return `${clause.keyword} ${clause.clauseInfo.toCypherString()}`
            } else {
              return clause.clauseInfo.toCypherString();
            }
          } else {
            return `${clause.keyword} ${clause.clauseInfo}`;
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
                        value = result[1];
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
        nodePattern.propertyMap = this.convertProperties(parsedNodePattern.properties);
        //console.log('nodePattern: ', nodePattern);
        return nodePattern;
    }

    convertRelationshipPattern = (parsedRelationshipPattern) => {
        var relationshipPattern = new RelationshipPattern();
        relationshipPattern.variable = parsedRelationshipPattern.variable;
        relationshipPattern.types = parsedRelationshipPattern.relationshipTypes.slice();
        parsedRelationshipPattern.propertyMap = this.convertProperties(parsedRelationshipPattern.properties);

        if (parsedRelationshipPattern.leftArrowDirection === '<-') {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.LEFT;
        } else if (parsedRelationshipPattern.rightArrowDirection === '->') {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.RIGHT;
        } else {
            relationshipPattern.direction = RELATIONSHIP_DIRECTION.NONE;
        }
        relationshipPattern.variableLengthStart = parsedRelationshipPattern.rangeLow;
        relationshipPattern.variableLengthEnd = parsedRelationshipPattern.rangeHigh;

        return relationshipPattern;
    }

    convertToMatch = (matchClause, returnClauses) => {

        var pattern = new Pattern();
        if (matchClause.pattern && matchClause.pattern.patternPart && Array.isArray(matchClause.pattern.patternPart)) {
            matchClause.pattern.patternPart.map(part => {
                var patternPart = new PatternPart();
                pattern.addPatternPart(patternPart);

                patternPart.variable = part.variable;

                var pathPattern = new PathPattern();
                patternPart.pathPattern = pathPattern;
                var patternElement = (part.anonymousPatternPart && part.anonymousPatternPart.patternElement) 
                                        ? part.anonymousPatternPart.patternElement
                                        : part.patternElement;
                //console.log('patternElement: ', patternElement);
                if (patternElement) {
                    if (patternElement.nodePattern) {
                        pathPattern.nodePattern = this.convertNodePattern(patternElement.nodePattern);
                    }

                    if (Array.isArray(patternElement.patternElementChain)) {
                        patternElement.patternElementChain.map(chainItem => {
                            var chainLink = new PatternElementChainLink();
                            chainLink.nodePattern = this.convertNodePattern(chainItem.nodePattern);
                            chainLink.relationshipPattern = this.convertRelationshipPattern(chainItem.relationshipPattern);
                            pathPattern.addPatternElementChain(chainLink);
                        });
                    }
                }
                //console.log('pathPattern: ', pathPattern);
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
            var cypherMatchClause = new CypherClause({
                keyword: 'WHERE',
                clauseInfo: clauseInfo 
            });
            returnClauses.push(cypherMatchClause);
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
        var clauseInfo = '';
        var cypherReturnClause = null;
        if (returnBody) {
            if (Array.isArray(returnBody.returnItems)) {
                if (addReturnItemsAsString) {
                    clauseInfo = returnBody.returnItems.map(x => 
                        (x.asVariable && x.asVariable !== x.expression) ? `${x.expression} as ${x.asVariable}` : x.expression
                    ).join(', ');
                } else {
                    clauseInfo = new ReturnClause();
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

            if (returnBody.orderBy) {
                this.convertToOrderBy(returnBody.orderBy, returnClauses);
            }
            if (returnBody.skip) {
                returnClauses.push(new CypherClause({
                    keyword: 'SKIP',
                    clauseInfo: returnBody.skip
                }));
            }
            if (returnBody.limit) {
                returnClauses.push(new CypherClause({
                    keyword: 'LIMIT',
                    clauseInfo: returnBody.limit
                }));
            }
        } else {
            cypherReturnClause = new CypherClause({ keyword, clauseInfo });
            returnClauses.push(cypherReturnClause);
        }
        
        //console.log('returnClause: ', returnClause);
    }

    convertToReturn = (returnClause, returnClauses) => {
        if (returnClause && returnClause.returnBody) {
            // TODO: double check DISTINCT
            var returnBody = returnClause.returnBody;
            this.convertReturnBody(returnBody, returnClauses, 'RETURN');
        }
    }

    convertToWith = (withClause, returnClauses) => {
        if (withClause && withClause.returnBody) {
            // TODO: double check DISTINCT, when adding -
            var returnBody = withClause.returnBody;
            this.convertReturnBody(returnBody, returnClauses, 'WITH', true);

            if (withClause.where) {
                this.convertToWhere(withClause.where, returnClauses);
            }
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
        }
    }

    constructor () {
        this.clauseConverters = {
            Match: this.convertToMatch,
            With: this.convertToWith,
            Return: this.convertToReturn,
            Unwind: this.convertToUnwind,
            Create: this.convertToKeywordAndText('CREATE'),
            Merge: this.convertToKeywordAndText('MERGE'),
            Set: this.convertToKeywordAndText('SET'),
            LoadCSV: this.convertToKeywordAndText('LOAD CSV'),
            InQueryCall: this.convertToKeywordAndText('CALL'),
            StandaloneCall: this.convertToKeywordAndText('CALL'),
            SubQuery: this.convertToKeywordAndText('CALL')
        }
    }

    recurseThroughParsedCypher = (parseResult, returnClauses) => {
        if (parseResult) {
            var activeConverter = this.clauseConverters[parseResult.myName];
            if (activeConverter) {
                activeConverter(parseResult, returnClauses);
            } else {
                if (typeof(parseResult) === 'object') {
                    var values = Object.values(parseResult);
                    values.map(value => {
                        if (Array.isArray(value)) {
                            value.map(x => this.recurseThroughParsedCypher(x, returnClauses));
                        } else if (typeof(value) === 'object') {
                            this.recurseThroughParsedCypher(value, returnClauses);
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

    convertToClauses = (cypherString) => {
        var parseResult = parseStatement(cypherString);
        
        var returnClauses = [];
        this.recurseThroughParsedCypher(parseResult, returnClauses);

        //console.log(parseResult);

        return returnClauses;
    }

    convertToClausesAndVariables = (cypherString) => {
        var parseResult = parseStatement(cypherString);
        
        var returnClauses = [];
        this.recurseThroughParsedCypher(parseResult, returnClauses);

        var returnVariables = [];
        this.collectAllParsedVariablesRecursive(parseResult, returnVariables);

        return { 
            returnClauses,
            returnVariables
        };
    }

}

