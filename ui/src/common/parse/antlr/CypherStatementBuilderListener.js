
import CypherStatement from './CypherStatement';
import CypherListener from './CypherListener';

const allowedAscendingDescendingItems = ['asc','desc','ascending','descending'];

export default class CypherStatementBuilderListener extends CypherListener {

    constructor (mainParseType) {
        super();
        this.cypherOption = null;
        this.mainParseType = mainParseType;        
    }

    setMainParseType = (mainParseType) => {
        this.mainParseType = mainParseType;        
    }

    parseStack = [];
    //this.capturingMapLiteral = false;
    currentPropertyKey = null;
    inMerge = false;

    push = function (item) {
        //console.log('push: ', item.myName);
        this.parseStack.push(item);
    }

    peek = function (howMany) {
        howMany = (howMany) ? -(howMany) - 1 : -1;
        return this.parseStack.slice(howMany)[0];
    }

    pop = function () {
        //console.log('pop: ', this.peek().myName);
        return this.parseStack.pop();
    }

    getCypherStatement = function () {
        let statement = this.parseStack[0];
        if (statement && this.cypherOption) {
            statement.cypherOption = this.cypherOption;
        } 
        return statement;
    }

    clear = function () {
        this.parseStack = [];
    }

    getTokens = function (ctx) {
        var childCount = ctx.getChildCount();
        var tokens = [];
        for (var i = 0; i < childCount; i++) {
            var token = ctx.getChild(i).getText();
            tokens.push(token);
        }
        return tokens;
    }

    getNonSpaceTokens = function (ctx) {
        var childCount = ctx.getChildCount();
        var nonSpaceTokens = [];
        for (var i = 0; i < childCount; i++) {
            var token = ctx.getChild(i).getText();
            if (token.trim() != '') {
                nonSpaceTokens.push(token);
            }
        }
        return nonSpaceTokens;
    }

    getStringFromTokens = function (ctx, index) {
        var childCount = ctx.getChildCount();
        var text = '';
        index = (index === null || index === undefined) ? 0 : index;
        for (var i = index; i < childCount; i++) {
            var token = ctx.getChild(i).getText();
            text += token;
        }
        return text;
    }

    stripQuotes = function (str) {
        if (str && str.charAt(0) == '\'' || str.charAt(0) == '\"') {
            str = str.substring(1);
        }
        if (str && str.charAt(str.length-1) == '\'' || str.charAt(str.length-1) == '\"') {
            str = str.substring(0,str.length-1);
        }
        return str;
    }

    enterOC_LoadCSVQuery = function(ctx) {
        var loadCSVQuery = new CypherStatement.LoadCSVQuery();
        var something = this.peek();
        if (something instanceof CypherStatement.BulkImportQuery) {
            something.loadCSVQuery = loadCSVQuery;
        }
        this.push(loadCSVQuery);
    };
    
    exitOC_LoadCSVQuery = function(ctx) {
        if (!(this.parseStack[0] instanceof CypherStatement.LoadCSVQuery)) {
            this.pop();
        }
    };
    
    enterOC_BulkImportQuery = function(ctx) {
        var bulkImportQuery = new CypherStatement.BulkImportQuery();
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        if (nonSpaceTokens && nonSpaceTokens.length > 0) {
            bulkImportQuery.periodicCommitHint = nonSpaceTokens[0];
        }
    
        var something = this.peek();
        if (something instanceof CypherStatement.Query) {
            something.bulkImportQuery = bulkImportQuery;
        }
        this.push(bulkImportQuery);
    };
    
    exitOC_BulkImportQuery = function(ctx) {
        if (!(this.parseStack[0] instanceof CypherStatement.BulkImportQuery)) {
            this.pop();
        }
    };
    
    enterOC_InQueryCall = function(ctx) {
        var inQueryCall = new CypherStatement.InQueryCall();
        var firstWord = ctx.getChild(0).getText();
        if (firstWord.toLowerCase() === 'optional') {
            inQueryCall.optionalCall = true;
        }
                
        var something = this.peek();
        if (something.addReadingClause) {
            something.addReadingClause(inQueryCall);
        }
        this.push(inQueryCall);
    };
    
    exitOC_InQueryCall = function(ctx) {
        this.pop();
    };
    
    enterOC_StandaloneCall = function(ctx) {
        var standaloneCall = new CypherStatement.StandaloneCall();
        var something = this.peek();
        if (something instanceof CypherStatement.Query) {
            something.standaloneCall = standaloneCall;
        }
        this.push(standaloneCall);
    };
    
    exitOC_StandaloneCall = function(ctx) {
        this.pop();
    };

    enterOC_CypherOption = function(ctx) {
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        this.cypherOption = nonSpaceTokens.join(' ');
    }
    
    enterOC_Query = function(ctx) {
        var query = new CypherStatement.Query();
        var something = this.peek();
        if (something instanceof CypherStatement.SubQuery) {
            something.subQuery = query;
        }
        this.push(query);
    };
    
    exitOC_Query = function(ctx) {
        var myParent = this.peek(1);
        if (!(this.parseStack[0] instanceof CypherStatement.Query)) {
            this.pop();
        } else if (myParent && myParent instanceof CypherStatement.SubQuery) {
            this.pop();
        }
    };
    
    enterOC_RegularQuery = function(ctx) {
        var regularQuery = new CypherStatement.RegularQuery();
        var something = this.peek();
        if (something instanceof CypherStatement.Query) {
            something.regularQuery = regularQuery;
        }
        this.push(regularQuery);
    };
    
    exitOC_RegularQuery = function(ctx) {
        this.pop();
    };
    
    enterOC_SubQuery = function(ctx) {
        //console.log("enter subquery")
        var subQuery = new CypherStatement.SubQuery();
        var firstWord = ctx.getChild(0).getText();
        if (firstWord.toLowerCase() === 'optional') {
            subQuery.optionalCall = true;
        }

        var something = this.peek();
        if (something.addReadingClause) {
            something.addReadingClause(subQuery);
        } else if (something instanceof CypherStatement.Query) {
            something.subQuery = subQuery;
        } else {
            console.log("Unhandled subquery case");
            console.log("parent is", something);
        }
        this.push(subQuery);
    };
    
    exitOC_SubQuery = function(ctx) {
        //console.log("exit subquery")
        this.pop();
    };

    enterOC_SubQueryVariableScope = function (ctx) {
        // find SubQuery further up the parse chain
        for (let i = 0; i <= this.parseStack.length; i++) {
            var something = this.peek(i);
            //console.log('enterOC_SubQueryDirective something is: ', something);
            if (something && something.setSubQueryDirective) {
                something.subSubQueryVariableScope(this.getNonSpaceTokens(ctx).join(''))
                break;
            }
        }
    }    

    enterOC_SubQueryDirective = function (ctx) {
        // find SubQuery further up the parse chain
        for (let i = 0; i <= this.parseStack.length; i++) {
            var something = this.peek(i);
            //console.log('enterOC_SubQueryDirective something is: ', something);
            if (something && something.setSubQueryDirective) {
                something.setSubQueryDirective(this.getNonSpaceTokens(ctx).join(' '))
                break;
            }
        }
    }
    
    enterOC_ImplicitProcedureInvocation = function(ctx) {
        var something = this.peek();
        if (something instanceof CypherStatement.StandaloneCall) {
            var nonSpaceTokens = this.getNonSpaceTokens(ctx);
            if (nonSpaceTokens && nonSpaceTokens.length) {
                if (nonSpaceTokens[nonSpaceTokens.length-1] === ')') {
                    nonSpaceTokens = nonSpaceTokens.slice(0,nonSpaceTokens.length-1);
                }
                // oC_ImplicitProcedureInvocation : oC_ProcedureName
                var implicitProcedureInvocation = new CypherStatement.ImplicitProcedureInvocation();
                implicitProcedureInvocation.procedureName = nonSpaceTokens[0];
                something.implicitProcedureInvocation = implicitProcedureInvocation;
            }
        }
    };
    
    enterOC_ExplicitProcedureInvocation = function(ctx) {
        var something = this.peek();
        //console.log('enterOC_ExplicitProcedureInvocation')
        if (something instanceof CypherStatement.InQueryCall || something instanceof CypherStatement.StandaloneCall) {
            var nonSpaceTokens = this.getNonSpaceTokens(ctx);
            if (nonSpaceTokens && nonSpaceTokens.length) {
                if (nonSpaceTokens[nonSpaceTokens.length-1] === ')') {
                    nonSpaceTokens = nonSpaceTokens.slice(0,nonSpaceTokens.length-1);
                }
                // oC_ExplicitProcedureInvocation : oC_ProcedureName SP? '(' SP? ( oC_Expression SP? ( ',' SP? oC_Expression SP? )* )? ')' ;
                var explicitProcedureInvocation = new CypherStatement.ExplicitProcedureInvocation();
                explicitProcedureInvocation.procedureName = nonSpaceTokens[0];
                for (var i = 2; i < nonSpaceTokens.length; i+=2) {  // arguments are every even token
                    explicitProcedureInvocation.addArgument(nonSpaceTokens[i]);
                }
                something.explicitProcedureInvocation = explicitProcedureInvocation;
            }
        }
    };
    
    /* ( oC_ProcedureResultField SP AS SP )? oC_Variable ; */
    enterOC_YieldItem = function(ctx) {
        var something = this.peek();
        if (something instanceof CypherStatement.InQueryCall || something instanceof CypherStatement.StandaloneCall) {
            var nonSpaceTokens = this.getNonSpaceTokens(ctx);
            if (nonSpaceTokens && nonSpaceTokens.length) {
                var yieldItem = new CypherStatement.YieldItem();
                if (nonSpaceTokens.length == 1) {
                    yieldItem.variable = nonSpaceTokens[0];
                } else if (nonSpaceTokens.length == 3) {
                    yieldItem.procedureResultField = nonSpaceTokens[0];
                    // ignore 'AS' which should be nonSpaceTokens[1]
                    yieldItem.variable = nonSpaceTokens[2];
                }
                something.addYieldItem(yieldItem);
            }
        }
    };
    
    /* LOAD CSV ( WITH HEADERS )? FROM oC_Expression AS oC_Variable ( FIELDTERMINATOR StringLiteral )? ; */
    enterOC_LoadCSV = function(ctx) {
        var something = this.peek();
        var loadCSV = new CypherStatement.LoadCSV();
    
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        for (var i = 0; i < (nonSpaceTokens.length -1); i++) {
            if (nonSpaceTokens[i] == 'WITH' && nonSpaceTokens[i+1] == 'HEADERS') {
                loadCSV.withHeaders = true;
            } else if (nonSpaceTokens[i] == 'FROM') {
                loadCSV.fromExpression = this.stripQuotes(nonSpaceTokens[i+1]);
            } else if (nonSpaceTokens[i] == 'AS') {
                loadCSV.variable = nonSpaceTokens[i+1];
            } else if (nonSpaceTokens[i] == 'FIELDTERMINATOR') {
                loadCSV.fieldTerminator = this.stripQuotes(nonSpaceTokens[i+1]);
            }
        }
    
        if (something instanceof CypherStatement.LoadCSVQuery) {
            something.loadCSV = loadCSV;
        } else if (something.addReadingClause) {
            something.addReadingClause(loadCSV);
        }
    };
    
    enterOC_SingleQuery = function(ctx) {
        var anything = this.peek();
        var singleQuery = new CypherStatement.SingleQuery();
        if (anything) {
            if (anything instanceof CypherStatement.LoadCSVQuery) {
                anything.singleQuery = singleQuery;
            } else if (anything instanceof CypherStatement.RegularQuery) {
                anything.singleQuery = singleQuery;
            } else if (anything instanceof CypherStatement.Union) {
                anything.singleQuery = singleQuery;
            } else if (anything instanceof CypherStatement.SubQuery) {
                anything.subQuery = singleQuery;
            }
        }
        this.push(singleQuery);
    };
    
    exitOC_SingleQuery = function(ctx) {
        if (!(this.parseStack[0] instanceof CypherStatement.SingleQuery)) {
            this.pop();
        }
    };
    
    enterOC_SinglePartQuery = function(ctx) {
        var singlePartQuery = new CypherStatement.SinglePartQuery();
        var something = this.peek();
        if (something.hasOwnProperty('singlePartQuery')){
            something.singlePartQuery = singlePartQuery;
        }
        this.push(singlePartQuery);
    };
    
    exitOC_SinglePartQuery = function(ctx) {
        this.pop();
    };
    
    enterOC_MultiPartQuery = function(ctx) {
        var multiPartQuery = new CypherStatement.MultiPartQuery();
        var singleQuery = this.peek();
        singleQuery.multiPartQuery = multiPartQuery;
        this.push(multiPartQuery);
    };
    
    exitOC_MultiPartQuery = function(ctx) {
        this.pop();
    };
    
    enterOC_ReadingClause = function (ctx) {
        var something = this.peek();
        if (something instanceof CypherStatement.MultiPartQuery) {
            var multiPartQueryPart = new CypherStatement.MultiPartQueryPart();
            something.addMultiPartQueryPart(multiPartQueryPart);
            this.push(multiPartQueryPart);
        }
    };
    
    enterOC_UpdatingClause = function (ctx) {
        var something = this.peek();
        if (something instanceof CypherStatement.MultiPartQuery) {
            var multiPartQueryPart = new CypherStatement.MultiPartQueryPart();
            something.addMultiPartQueryPart(multiPartQueryPart);
            this.push(multiPartQueryPart);
        }
    };
    
    enterOC_Match = function(ctx) {
        var match = new CypherStatement.Match();
        var firstWord = ctx.getChild(0).getText();
        if (firstWord.toLowerCase() === 'optional') {
            match.optionalMatch = true;
        }
        var something = this.peek();
        if (something && something.addReadingClause) {
            something.addReadingClause(match);
        } else if (this.mainParseType !== 'Match') {
            console.log("warning: no appropriate parent object for Match. parent =");
            console.log(something);
        }
        this.push(match);
    };
    
    exitOC_Match = function(ctx) {
        if (this.mainParseType !== 'Match') {
            this.pop();
        }
    };
    
    getUpdatingClause = function () {
        for (var i = 0; i < this.parseStack.length; i++) {
            var something = this.peek(i);
            if (something.addUpdatingClause) {
                return something;
            }
        }
        return null;
    }
    
    enterOC_Create = function(ctx) {
        var create = new CypherStatement.Create();
        var something = this.getUpdatingClause();
        if (something) {
            something.addUpdatingClause(create);
        } else {
            console.log("warning: no appropriate parent object for Create. parent =");
            console.log(something);
        }
        this.push(create);
    };
    
    enterOC_Merge = function(ctx) {
        this.inMerge = true;
        var merge = new CypherStatement.Merge();
        var something = this.getUpdatingClause();
        if (something) {
            something.addUpdatingClause(merge);
        } else {
            console.log("warning: no appropriate parent object for Merge. parent =");
            console.log(something);
        }
        this.push(merge);
    };
    
    exitOC_Merge = function(ctx) {
        this.pop();
        this.inMerge = false;
    };
    
    enterOC_Set = function(ctx) {
        var set = new CypherStatement.Set();
        var something = this.getUpdatingClause();
        if (something) {
            something.addUpdatingClause(set);
        } else {
            console.log("warning: no appropriate parent object for Set. parent =");
            console.log(something);
        }
        this.push(set);
    };
    
    exitOC_Set = function(ctx) {
        this.pop();
    };
    
    enterOC_SetItem = function(ctx) {
        var set = this.peek();
        var setItem = new CypherStatement.SetItem();
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        if (nonSpaceTokens.length === 2) {
            setItem.leftHandSide = nonSpaceTokens[0];
            setItem.rightHandSide = nonSpaceTokens[1];
        } else {
            setItem.leftHandSide = nonSpaceTokens[0];
            setItem.operator = nonSpaceTokens[1];
            setItem.rightHandSide = nonSpaceTokens[2];
        }
        //console.log('adding set item, leftHandSide: ' + setItem.leftHandSide + ', rightHandSide: ' + setItem.rightHandSide + ', operator: ' + setItem.operator);
        set.addSetItem(setItem);
        this.push(setItem);
    };
    
    exitOC_SetItem = function(ctx) {
        this.pop();
    };
    
    enterOC_Where = function(ctx) {
        var something = this.peek();
        if (!something) {
            // for cases where we are testing Where clauses by themselves
            something = new CypherStatement.Where();
            this.push(something);
        }

        if (something && something.setWhere) {
            //something.setWhere(ctx.getChild(2).getText());
            something.setWhere(this.getStringFromTokens(ctx, 2));
        }
    };

    exitOC_Where = function(ctx) {
        var something = this.peek();
        if (something && something instanceof CypherStatement.Where && this.mainParseType !== 'Where') {
            this.pop();
        }
    }
    
    enterOC_AnonymousPatternPart = function(ctx) {
        var anonymousPatternPart = new CypherStatement.AnonymousPatternPart();
        var something = this.peek();
        if (something) {
            something.anonymousPatternPart = anonymousPatternPart;
        }
        this.push(anonymousPatternPart);
    };
    
    exitOC_AnonymousPatternPart = function(ctx) {
        //console.log('exitOC_AnonymousPatternPart')
        if (this.mainParseType !== 'AnonymousPatternPart') {
            //console.log('exitOC_AnonymousPatternPart popping')
            this.pop();
        }
    };

    enterOC_ShortestPathPattern = function(ctx) {
        var shortestPathPattern = new CypherStatement.ShortestPathPattern();
        var something = this.peek();
        if (something) {
            something.shortestPathPattern = shortestPathPattern;
            var nonSpaceTokens = this.getNonSpaceTokens(ctx);
            let isFunction = nonSpaceTokens[1] === '(' ? true : false;
            let firstToken = nonSpaceTokens[0];
            let firstTokenUpperCase = firstToken.toUpperCase();
            
            if (isFunction) {
                shortestPathPattern.isFunction = true;
                shortestPathPattern.shortestPath = firstToken;
            } else if (firstTokenUpperCase === 'ANY') {
                if (nonSpaceTokens[1]?.toUpperCase() === 'SHORTEST') {
                    shortestPathPattern.shortestPath = 'ANY SHORTEST';
                } else {
                    shortestPathPattern.shortestPath = 'ANY';
                }
            } else if (firstTokenUpperCase === 'ALL') {
                shortestPathPattern.shortestPath = 'ALL SHORTEST';
            } else {    // SHORTEST k ( GROUPS )
                let thirdToken = (nonSpaceTokens.length >= 3) ? nonSpaceTokens[2].toUpperCase() : ''
                if (thirdToken === 'GROUPS') {
                    shortestPathPattern.shortestPath = nonSpaceTokens.slice(0,3).join(' ');
                } else {
                    shortestPathPattern.shortestPath = nonSpaceTokens.slice(0,2).join(' ');
                }
            }

        }
        this.push(shortestPathPattern);        
    }

    exitOC_ShortestPathPattern = function(ctx) {
        if (this.mainParseType !== 'ShortestPathPattern') {
            //console.log('exitOC_AnonymousPatternPart popping')
            this.pop();
        }
    }
    
    enterOC_Pattern = function(ctx) {
        var pattern = new CypherStatement.Pattern();
        var something = this.peek();
        something.pattern = pattern;
        this.push(pattern);
    };
    
    exitOC_Pattern = function(ctx) {
        if (this.mainParseType !== 'Pattern') {
            this.pop();
        }
    };
    
    enterOC_PatternPart = function(ctx) {
        var patternPart = new CypherStatement.PatternPart();
        // console.log('enterOC_PatternPart tokens: ', this.getTokens(ctx))
        // trying to preserve a little of what the user typed
        let secondTokenIsEquals = this.getTokens(ctx)[1] === '='
        // console.log('secondTokenIsEquals: ', secondTokenIsEquals)
        patternPart.spaceBeforeEquals = secondTokenIsEquals ? false : true;

        var something = this.peek();
        if (something.addPatternPart) {
            something.addPatternPart(patternPart);
        } else {
            something.patternPart = patternPart;
        }
        this.push(patternPart);
    };
    
    exitOC_PatternPart = function(ctx) {
        this.pop();
    };
    
    enterOC_PatternElement = function(ctx) {
        var patternElement = new CypherStatement.PatternElement();
        var something = this.peek();
        if (something && something.setPatternElement) {
            something.setPatternElement(patternElement);
        } else if (something && something.addPatternElement) {
            something.addPatternElement(patternElement);
        }
        this.push(patternElement);
    };

    exitOC_PatternElement = function(ctx) {
        this.pop();
    };

    /*
    enterOC_OpenParen = function (ctx) {
        var something = this.peek();
        if (something && something.setOpenParen) {
            something.setOpenParen(true);
        }
    }

    enterOC_CloseParen = function (ctx) {
        var something = this.peek();
        if (something && something.setCloseParen) {
            something.setCloseParen(true);
        }
    }
    */

    enterOC_QuantifiedPathPattern = function (ctx) {
        var quantifiedPathPattern = new CypherStatement.QuantifiedPathPattern();
        var something = this.peek();
        //console.log('enterOC_QuantifiedPathPattern: ', this.getStringFromTokens(ctx));
        if (something && something.setQuantifiedPathPattern) {
            //console.log('enterOC_QuantifiedPathPattern: setting setQuantifiedPathPattern');
            something.setQuantifiedPathPattern(quantifiedPathPattern);
        }
        this.push(quantifiedPathPattern);
    }

    exitOC_QuantifiedPathPattern = function(ctx) {
        this.pop();
    }

    enterOC_PathPatternQuantifier = function(ctx) {
        var something = this.peek();
        if (something && something.setPatternQuantifier) {
            something.setPatternQuantifier(this.getNonSpaceTokens(ctx).join(''));
        }
    }
    
    enterOC_NodePattern = function(ctx) {
        var nodePattern = new CypherStatement.NodePattern();
        var something = this.peek();    // either a PatternElement or PatternElementChainLink
        something.nodePattern = nodePattern;
        this.push(nodePattern);
    };
    
    exitOC_NodePattern = function(ctx) {
        this.pop();
    };

    enterOC_NodeLabels = function (ctx) {
        var something = this.peek();
        if (something.setNodeLabelString) {
            let nonSpaceTokens = this.getNonSpaceTokens(ctx);
            //console.log('non space tokens: ', nonSpaceTokens);
            something.setNodeLabelString(nonSpaceTokens.join(''));
        }
    }
    
    enterOC_PatternElementChain = function(ctx) {
        var patternElementChain = new CypherStatement.PatternElementChainLink();
        var patternElement = this.peek();
        if (patternElement && patternElement.addChain) {
            patternElement.addChain(patternElementChain);
        }
        this.push(patternElementChain);
    };
    
    exitOC_PatternElementChain = function(ctx) {
        this.pop();
    };
    
    enterOC_RelationshipPattern = function(ctx) {
        var relationshipPattern = new CypherStatement.RelationshipPattern();
    
        relationshipPattern.leftArrowDirection = CypherStatement.ARROW_DIRECTION.DASH;
        relationshipPattern.rightArrowDirection = CypherStatement.ARROW_DIRECTION.DASH;

        var patternElementChain = this.peek();
        patternElementChain.relationshipPattern = relationshipPattern;
        this.push(relationshipPattern);
    };
    
    exitOC_RelationshipPattern = function(ctx) {
        this.pop();
    };

    enterOC_RelationshipTypes = function(ctx) {
        var something = this.peek();
        if (something.setRelationshipTypeString) {
            let nonSpaceTokens = this.getNonSpaceTokens(ctx);
            //console.log('non space tokens: ', nonSpaceTokens);
            something.setRelationshipTypeString(nonSpaceTokens.join(''));
        }
    }

    enterOC_LeftArrowHead = function(ctx) {
        var relationshipPattern = this.peek();
        if (relationshipPattern) {
            relationshipPattern.leftArrowDirection = CypherStatement.ARROW_DIRECTION.LEFT;
        }        
    }

    enterOC_RightArrowHead = function(ctx) {
        var relationshipPattern = this.peek();
        if (relationshipPattern) {
            relationshipPattern.rightArrowDirection = CypherStatement.ARROW_DIRECTION.RIGHT;
        }
    }
    
    enterOC_RelTypeName = function(ctx) {
        var relationshipPattern = this.peek();
        relationshipPattern.addType(ctx.getChild(0).getText());
    };

    enterOC_RangeLiteral = function(ctx) {
        var relationshipPattern = this.peek();
        relationshipPattern.setRangeLiteral(this.getNonSpaceTokens(ctx).join(''));
    }
    
    enterOC_Variable = function(ctx) {
        //console.log('variable: ' + ctx.getChild(0).getText());
        var something = this.peek();
        if (something) {
            if (something.hasOwnProperty('variable')) {
                //if (!this.capturingMapLiteral) {
                    something.variable = ctx.getChild(0).getText();
                //}
            } else if (something.addVariable) {
                //if (!this.capturingMapLiteral) {
                    something.addVariable(ctx.getChild(0).getText());
                //}
            }
        }
    };

    enterOC_PathPatternQualifier = function(ctx) {
        var something = this.peek();
        if (something && something.setPatternQuantifier) {
            something.setPatternQuantifier(this.getNonSpaceTokens(ctx).join(''));
        }
    }
    
    /*
    enterOC_PropertyKeyName = function(ctx) {
        console.log("enterOC_PropertyKeyName: " + ctx.getChild(0).getText());
    };
    */
    
    enterOC_SchemaName = function(ctx) {
        //console.log("enterOC_SchemaName: " + ctx.getChild(0).getText());
        var something = this.peek();
        if (something) {
            if (something.addPropertyKey) {
                //if (!this.capturingMapLiteral) {
                    something.addPropertyKey(ctx.getChild(0).getText());
                //}
            }
        }};
    
    /*
    enterOC_PropertyLookup = function(ctx) {
        console.log("enterOC_PropertyLookup: " + ctx.getChild(0).getText());
    };
    */
    
    // Enter a parse tree produced by CypherParser#oC_FunctionName.
    enterOC_FunctionName = function(ctx) {
    };
    
    // Exit a parse tree produced by CypherParser#oC_FunctionName.
    exitOC_FunctionName = function(ctx) {
    };
    
    enterOC_Literal = function(ctx) {
        var something = this.peek();
        var literal = new CypherStatement.Literal();
        literal.setValue(ctx.getChild(0).getText());
        if (something.setLiteral) {
            something.setLiteral(literal);
        } else {
            console.log('unhandled literal, something is: ', something);
        }
        this.push(literal);
    };
    
    exitOC_Literal = function(ctx) {
        this.pop();
    };
    
    
    enterOC_MapLiteral = function(ctx) {
        /*
        var something = this.peek();
        if (something.addProperty) {
            this.capturingMapLiteral = true;
        }*/
        var something = this.peek();
        var mapLiteral = new CypherStatement.MapLiteral();
        if (something.setMapLiteral) {
            something.setMapLiteral(mapLiteral)
        } else if (something instanceof CypherStatement.NodePattern || something instanceof CypherStatement.RelationshipPattern) {
            // do nothing - this case is taken care of in Expression
        } else {
            console.log('unhandled map literal, something is: ', something.myName);
        }
        this.push(mapLiteral);
    
    };
    
    exitOC_MapLiteral = function(ctx) {
        //this.capturingMapLiteral = false;
        this.pop();
    };
    
    enterOC_PropertyKeyName = function(ctx) {
        //console.log('Property Key: ' + ctx.getChild(0).getText());
        var something = this.peek();
        this.currentPropertyKey = ctx.getChild(0).getText();
        if (something.addPropertyLookup) {
            something.addPropertyLookup(ctx.getChild(0).getText());
        }
    
        /*
        if (this.capturingMapLiteral) {
            this.currentPropertyKey = ctx.getChild(0).getText();
        } else if (something.addPropertyLookup) {
            something.addPropertyLookup(ctx.getChild(0).getText());
        }*/
        /* else if (something.hasOwnProperty('propertyKeyName')) {
            something.propertyKeyName = ctx.getChild(0).getText();
        }*/
    };
    
    enterOC_Expression = function(ctx) {
        var something = this.peek();
        var beforeSomething = this.peek(1);
        var expression = new CypherStatement.Expression();
        /*
        if (this.capturingMapLiteral && this.currentPropertyKey) {
            var value = ctx.getChild(0).getText();
            if (something.addProperty) {
                something.addProperty(this.currentPropertyKey, value, this.inMerge);
            }
            this.currentPropertyKey = null;
        }*/
    
        // for NodePattern and RelationshipPattern
        if (beforeSomething && beforeSomething.addProperty && this.currentPropertyKey) {
            // TODO: switch from value to expression
            var value = ctx.getChild(0).getText();
            //console.log(`has addProperty: adding key ${this.currentPropertyKey} and value ${value}`);
            beforeSomething.addProperty(this.currentPropertyKey, value, this.inMerge);
            this.currentPropertyKey = null;
        } else if  (something instanceof CypherStatement.MapLiteral && this.currentPropertyKey) {
            //console.log(`is MapLiteral: adding key ${this.currentPropertyKey} and value`, expression);
            something.addMapEntry(this.currentPropertyKey, expression, this.inMerge)
            this.currentPropertyKey = null;
        } else if (something && something.setParsedExpression) {
            something.setParsedExpression(expression);
        } else {
            //console.log('unhandled case in Expression, something is: ', something.myName);
        }
        this.push(expression);
    };
    
    exitOC_Expression = function(ctx) {
        this.pop();
    }
    
    enterOC_PropertyOrLabelsExpression = function(ctx) {
        var something = this.peek();
        var expression = new CypherStatement.PropertyOrLabelsExpression();
        /*
        if (this.capturingMapLiteral && this.currentPropertyKey) {
            var value = ctx.getChild(0).getText();
            if (something.addProperty) {
                something.addProperty(this.currentPropertyKey, value, this.inMerge);
            }
            this.currentPropertyKey = null;
        }*/
        if (something.setParsedExpression) {
            something.setParsedExpression(expression);
        }
        this.push(expression);
    };
    
    exitOC_PropertyOrLabelsExpression = function(ctx) {
        this.pop();
    }
    
    
    enterOC_Atom = function(ctx) {
        var something = this.peek();
        var atom = new CypherStatement.Atom();
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        atom.setAtomText(nonSpaceTokens.join(' '));
        this.push(atom);
        if (something.setAtom) {
            something.setAtom(atom);
        }
    };
    
    exitOC_Atom = function(ctx) {
        this.pop();
    };
    
    /*
    enterOC_PropertyExpression = function(ctx) {
        var something = this.peek();
        var propertyExpression = new CypherStatement.PropertyExpression();
        if (something.setParsedExpression) {
            something.setParsedExpression(propertyExpression);
        }
        this.push(propertyExpression);
    };
    
    exitOC_PropertyExpression = function(ctx) {
        this.pop();
    };*/
    
    enterOC_FunctionInvocation = function(ctx) {
        //console.log(ctx.getChild(0).getText());
    };
    
    exitOC_FunctionInvocation = function(ctx) {
    
    };
    
    enterOC_FunctionName = function(ctx) {
        //console.log(ctx.getChild(0).getText());
    };
    
    exitOC_FunctionName = function(ctx) {
    };
    
    enterOC_Parameter = function(ctx) {
        var something = this.peek();
        if (something.addProperty) {
            if (this.currentPropertyKey) {
                something.addProperty(this.currentPropertyKey, '$' + ctx.getChild(1).getText(), this.inMerge);
            }
        }
    };
    
    enterOC_LegacyParameter = function(ctx) {
        var something = this.peek();
        if (something.addProperty) {
            if (this.currentPropertyKey) {
                var nonSpaceTokens = this.getNonSpaceTokens(ctx);
                something.addProperty(this.currentPropertyKey, '{' + nonSpaceTokens[1] + '}', this.inMerge);
            }
        }
    };
    
    enterOC_LabelName = function(ctx) {
        var something = this.peek();
        if (something.addLabel) {
            something.addLabel(ctx.getChild(0).getText());
        }
    };
    
    enterOC_With = function(ctx) {
        var withVar = new CypherStatement.With();
        var something = this.peek();
        if (something instanceof CypherStatement.MultiPartQuery) {
            var multiPartQueryPart = new CypherStatement.MultiPartQueryPart();
            multiPartQueryPart.with = withVar;
            something.addMultiPartQueryPart(multiPartQueryPart);
            this.push(multiPartQueryPart);
        } else if (something instanceof CypherStatement.MultiPartQueryPart) {
            something.with = withVar;
        } else {
            console.log("warning: no appropriate parent object for With. parent =");
            console.log(something);
        }
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        if (nonSpaceTokens[1].match(/DISTINCT/i)) {
            withVar.disinct = true;
        }
    
        this.push(withVar);
    };
    
    exitOC_With = function(ctx) {
        if (this.mainParseType !== 'With') {
            this.pop();
        }

        var something = this.peek();
        if (something instanceof CypherStatement.MultiPartQueryPart) {
            // the multi part query part is finished
            this.pop();
        }
    };
    
    enterOC_Union = function(ctx) {
        var unionVar = new CypherStatement.Union();
    
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        if (nonSpaceTokens[1].match(/ALL/i)) {
            unionVar.unionAll = true;
        }
        var something = this.peek();
        if (something.addUnion) {
            something.addUnion(unionVar);
        }
        this.push(unionVar);
    };
    
    exitOC_Union = function(ctx) {
        this.pop();
    };
    
    enterOC_Use = function(ctx) {
        var useExpr = '';
        for (var i = 2; i <= ctx.getChildCount() - 1; i++) { // i = 2 to skip 'USE '
            useExpr += ctx.getChild(i).getText();
        }
        var something = this.peek();
        if (something instanceof CypherStatement.SingleQuery) {
            something.useExpression = useExpr.trim();
        }
    };
    
    exitOC_Use = function(ctx) {
    };
    
    enterOC_Unwind = function(ctx) {
        var unwindVar = new CypherStatement.Unwind();
    
        var unwindExpr = '';
        for (var i = 1; i <= ctx.getChildCount()-4; i++) { // i=1 to skip 'UNWIND' and -4 to skip ' as foo'
            unwindExpr += ctx.getChild(i).getText();
        }
        unwindVar.expression = unwindExpr.trim();
        if (ctx.getChildCount() > 0) {
            var asVariable = ctx.getChild(ctx.getChildCount()-1).getText();
            unwindVar.asVariable = asVariable;
        }
    
        var something = this.peek();
        if (something.addReadingClause) {
            something.addReadingClause(unwindVar);
        }
    };
    
    exitOC_Unwind = function(ctx) {
    };
    
    enterOC_Return = function(ctx) {
        var returnVar = new CypherStatement.Return();
        var something = this.peek();
        if (something.addReturnClause) {
            something.addReturnClause(returnVar);
        } else {
            var beforeSomething = this.peek(1);
            if (beforeSomething instanceof CypherStatement.SubQuery && something instanceof CypherStatement.Query) {
                beforeSomething.return = returnVar;
            } else {
                something.return = returnVar;
            }
        }
        var nonSpaceTokens = this.getNonSpaceTokens(ctx);
        if (nonSpaceTokens[1].match(/DISTINCT/i)) {
            returnVar.disinct = true;
        }
    
        this.push(returnVar);
    };
    
    exitOC_Return = function(ctx) {
        this.pop();
    };
    
    enterOC_ReturnBody = function(ctx) {
        var returnBody = new CypherStatement.ReturnBody();
        var something = this.peek();
        something.returnBody = returnBody;
        this.push(returnBody);
    };
    
    exitOC_ReturnBody = function(ctx) {
        this.pop();
    };
    
    
    enterOC_ReturnItems = function(ctx) {
        if (ctx.getChild(0).getText() == '*') {
            var something = this.peek();
            something.returnAsterisk = true;
        }
    };
    
    enterOC_ReturnItem = function(ctx) {
        var returnItemVar = new CypherStatement.ReturnItem();
        var returnVar = this.peek();
    
        returnItemVar.expression = ctx.getChild(0).getText();
        if (ctx.getChildCount() > 0) {
            var asVariable = ctx.getChild(ctx.getChildCount()-1).getText();
            //console.log('setting Return Item asVariable', asVariable);
            returnItemVar.asVariable = asVariable;
        }
    
        returnVar.returnItems.push(returnItemVar);
        this.push(returnItemVar);
    };
    
    exitOC_ReturnItem = function(ctx) {
        this.pop();
    };
    
    enterOC_Order = function(ctx) {
        var orderByVar = new CypherStatement.OrderBy();
        var something = this.peek();
        /*
        var orderByExpr = '';
        // 3 because first three tokens are 'ORDER', ' ', and 'BY'
        for (var i = 3; i <= ctx.getChildCount()-1; i++) {
            orderByExpr += ctx.getChild(i).getText();
        }
        something.orderBy = orderByExpr.trim();
        */
        something.orderBy = orderByVar;
        this.push(orderByVar);
    };
    
    exitOC_Order = function(ctx) {
        this.pop();
    }
    
    enterOC_SortItem = function(ctx) {
        var sortItemVar = new CypherStatement.SortItem();
        var something = this.peek();
        var lastToken = ctx.getChild(ctx.getChildCount()-1).getText();
        var lowerLastToken = lastToken.toLowerCase();
        var rightOffset = 1;
        if (allowedAscendingDescendingItems.includes(lowerLastToken)) {
            sortItemVar.ascendingDescending = lastToken;
            rightOffset = 2;
        }
    
        var sortItemExpr = '';
        for (var i = 0; i <= ctx.getChildCount()-rightOffset; i++) {
            sortItemExpr += ctx.getChild(i).getText();
        }
        sortItemVar.expression = sortItemExpr.trim();
        something.addSortItem(sortItemVar);
    };
    
    enterOC_Skip = function(ctx) {
        var something = this.peek();
        // 2 because first 2 tokens are 'SKIP or OFFSET' and ' '
        something.skipKeyword = ctx.getChild(0).getText();
        something.skip = ctx.getChild(2).getText();
    };
    
    enterOC_Limit = function(ctx) {
        var something = this.peek();
        // 2 because first 2 tokens are 'LIMIT' and ' '
        something.limit = ctx.getChild(2).getText();
    };
    
};

