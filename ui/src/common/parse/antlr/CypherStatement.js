
import { setNewNodeLabelPosition } from '../../../components/canvas/d3/helpers.js';

var CypherStatement = (function () {

    var exports = {};

    exports.ARROW_DIRECTION = {
        DASH: '-',
        LEFT: '<-',
        RIGHT: '->'
    }

    exports.DataTypes = {
        Boolean: "Boolean",
        Integer: "Integer",
        Float: "Float",
        String: "String",
        List: "List",
        Map: "Map"
    };

    function peek (array, howMany) {
        howMany = (howMany) ? -(howMany) - 1 : -1;
        return array.slice(howMany)[0];
    }

    function getValueFromLabelVariableMap (labelVariableMap, key) {
        var value = labelVariableMap[key];
        return value;
    }

    function getActiveLabelVariableMap (config) {
        return config.labelVariableMap;
    }

    function getStringValueFromLabelVariableMap (labelVariableMap, key) {
        var value = labelVariableMap[key];
        if (value && value.myName && value.myName === 'Expression') {
            value = value.toString();
        } else if (typeof(value) !== 'string') {
            if (value && value.mapEntryType && value.mapEntryType === 'RelationshipPatternVariable') {
                // do nothing, this case is handled
            } else {
                var objectType = (value && value.myName) ? value.myName : '<not defined>';
                //console.log('lookup value type for key ' + key + ' is ' + typeof(value) + ', the object type is ' + objectType);
            }
        }
        return value;
    }

    /* TODO: implement this and change variableMapStack / labelVariableMap to this */
    /*
    var VariableScope = function () {

    }
    */

    function defineScope (config) {
        if (config) {
            if (!config.variableMapStack) {
                config.variableMapStack = [];
            }
            if (config.labelVariableMap) {
                //console.log('pushing labelVariableMap', config.labelVariableMap);
                config.variableMapStack.push(config.labelVariableMap);
            }
            config.labelVariableMap = {};
        }
    }

    function ensureScopeCreated (config) {
        if (config) {
            if (!config.labelVariableMap) {
                config.labelVariableMap = {};

                if (!config.variableMapStack) {
                    config.variableMapStack = [];
                    config.variableMapStack.push(config.labelVariableMap);
                }
            }
        }
    }

    function addVariableToScope (config, variableName, variableValue) {
        if (config) {
            ensureScopeCreated(config);
            config.labelVariableMap[variableName] = variableValue;
        }
    }

    exports.StandaloneCall = function () {
        // CALL SP ( oC_ExplicitProcedureInvocation | oC_ImplicitProcedureInvocation ) ( SP YIELD SP oC_YieldItems )? ;
        this.myName = 'StandaloneCall';
        this.explicitProcedureInvocation = undefined;
        this.implicitProcedureInvocation = undefined;
        this.yieldItems = [];

        this.populateMatchGraph = function (graph, config) {
            if (this.explicitProcedureInvocation) {
                this.explicitProcedureInvocation.populateMatchGraph(graph, config, this.yieldItems);
            } else if (this.implicitProcedureInvocation) {
                this.implicitProcedureInvocation.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            //console.log('StandaloneCall toString');
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.explicitProcedureInvocation) {
                str += 'CALL ';
                str += this.explicitProcedureInvocation.toString(config);
            } else if (this.implicitProcedureInvocation) {
                str += 'CALL ';
                str += this.implicitProcedureInvocation.toString(config);
            }
            if (this.yieldItems && this.yieldItems.length) {
                str += ' YIELD ';
                var yieldStrs = [];
                for (var i = 0; i < this.yieldItems.length; i++) {
                    yieldStrs.push(this.yieldItems[i].toString(config));
                }
                str += yieldStrs.join(', ');
            }
            return str;
        }

        this.addYieldItem = function (yieldItem) {
            this.yieldItems.push(yieldItem);
        }
    }

    exports.InQueryCall = function () {
        //CALL SP oC_ExplicitProcedureInvocation ( SP? YIELD SP oC_YieldItems )? ;
        this.myName = 'InQueryCall';
        this.explicitProcedureInvocation = undefined;
        this.yieldItems = [];

        this.populateMatchGraph = function (graph, config) {
            if (this.explicitProcedureInvocation) {
                this.explicitProcedureInvocation.populateMatchGraph(graph, config, this.yieldItems);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.explicitProcedureInvocation) {
                str += 'CALL ';
                str += this.explicitProcedureInvocation.toString(config);
            }
            if (this.yieldItems && this.yieldItems.length) {
                str += ' YIELD ';
                var yieldStrs = [];
                for (var i = 0; i < this.yieldItems.length; i++) {
                    yieldStrs.push(this.yieldItems[i].toString(config));
                }
                str += yieldStrs.join(', ');
            }
            return str;
        }

        this.addYieldItem = function (yieldItem) {
            this.yieldItems.push(yieldItem);
        }
    }

    exports.ImplicitProcedureInvocation = function () {
        this.myName = 'ImplicitProcedureInvocation';
        // oC_ImplicitProcedureInvocation : oC_ProcedureName ;
        this.procedureName = undefined;

        this.populateMatchGraph = function (graph, config, yieldItems) {
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            return this.procedureName;
        }
    }

    exports.ExplicitProcedureInvocation = function () {
        this.myName = 'ExplicitProcedureInvocation';
        // oC_ExplicitProcedureInvocation : oC_ProcedureName SP? '(' SP? ( oC_Expression SP? ( ',' SP? oC_Expression SP? )* )? ')' ;
        this.procedureName = undefined;
        this.arguments = [];

        this.populateMatchGraph = function (graph, config, yieldItems) {
            if (this.procedureName == 'apoc.load.json' && this.arguments && this.arguments.length > 0) {
                var jsonFileOrVariable = this.arguments[0];
                if (jsonFileOrVariable.match && jsonFileOrVariable.match(/^['"]/)) {
                    // variable is a literal
                    var yieldVariable = null;
                    if (yieldItems && yieldItems.length && yieldItems.length > 0) {
                        yieldVariable = yieldItems[0];
                    }
                    handleDataSource (graph, config, jsonFileOrVariable, yieldVariable);
                } else {
                    // look up variable to get actual filename
                    var fileName = getStringValueFromLabelVariableMap(getActiveLabelVariableMap(config), jsonFileOrVariable);
                    fileName = (fileName) ? fileName : jsonFileOrVariable;
                    handleDataSource (graph, config, fileName, yieldVariable);
                }
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            //console.log('this.procedureName: ', this.procedureName);
            //console.log('this.arguments: ', this.arguments);
            var str = this.procedureName + '(';
            if (this.arguments && this.arguments.length) {
                str += this.arguments.join(', ');
            }
            str += ')';
            //console.log('str: ', str);
            return str;
        }

        this.addArgument = function (argument) {
            this.arguments.push(argument);
        }
    }

    exports.YieldItem = function () {
        // ( oC_ProcedureResultField SP AS SP )? oC_Variable ;
        this.myName = 'YieldItem';
        this.procedureResultField = undefined;
        this.variable = undefined;

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.procedureResultField) {
                str += this.procedureResultField + ' AS ';
            }
            str += this.variable;
            return str;
        }
    }

    exports.BulkImportQuery = function () {
        this.myName = 'BulkImportQuery';
        this.periodicCommitHint = null;
        this.loadCSVQuery = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.periodicCommitHint && this.periodicCommitHint.populateMatchGraph) {
                this.periodicCommitHint.populateMatchGraph(graph, config);
            }

            if (this.loadCSVQuery && this.loadCSVQuery.populateMatchGraph) {
                this.loadCSVQuery.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.periodicCommitHint) {
                str += this.periodicCommitHint;
            };
            if (this.loadCSVQuery && this.loadCSVQuery.toString) {
                str += ' ' + this.loadCSVQuery.toString(config);
            };
            return str;
        }
    }

    exports.LoadCSVQuery = function () {
        this.myName = 'LoadCSVQuery';
        this.loadCSV = null;
        this.with = null;
        this.singleQuery = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.loadCSV) {
                this.loadCSV.populateMatchGraph(graph, config);
            }

            if (this.with) {
                this.with.populateMatchGraph(graph, config);
            }

            if (this.singleQuery) {
                this.singleQuery.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            str += this.loadCSV.toString(config);
            if (this.with) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.with.toString(config);
            }
            str += (config && config.htmlString) ? '\n<br/>' : '\n';
            str += this.singleQuery.toString(config);
            return str;
        }
    }

    function handleDataSource (graph, config, fileName, variable, withHeaders, fieldTerminator) {
        var existingDataSource = graph.getDataSourceByExpression(fileName);
        if (!existingDataSource) {
            var newDataSource = new graph.DataSource({
                withHeaders: withHeaders,
                fromExpression: fileName,
                variable: variable,
                fieldTerminator: fieldTerminator
            });
            graph.addDataSource(newDataSource, true);
            config.activeDataSource = newDataSource;
            return newDataSource;
        } else {
            config.activeDataSource = existingDataSource;
            return existingDataSource;
        }
    }

    exports.LoadCSV = function () {
        this.myName = 'LoadCSV';
        this.withHeaders = false;
        this.fromExpression = null;
        this.variable = null;
        this.fieldTerminator = null;

        this.populateMatchGraph = function (graph, config) {
            if (!config) {
                config = {};
            }
            handleDataSource (graph, config, this.fromExpression, this.variable, this.withHeaders, this.fieldTerminator);
        }

        /* LOAD SP CSV SP ( WITH SP HEADERS SP )? FROM SP oC_Expression SP AS SP oC_Variable
            SP ( FIELDTERMINATOR SP StringLiteral )? ; */
        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = 'LOAD CSV ';
            if (this.withHeaders) {
                str += 'WITH HEADERS ';
            }
            str += 'FROM \'' + this.fromExpression + '\'';
            str += ' AS ' + this.variable;
            if (this.fieldTerminator) {
                str += ' FIELDTERMINATOR \'' + this.fieldTerminator + '\'';
            }
            return str;
        }
    }

    exports.SingleQuery = function () {
        this.myName = 'SingleQuery';
        this.useExpression = null;
        this.singlePartQuery = null;
        this.multiPartQuery = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.singlePartQuery) {
                this.singlePartQuery.populateMatchGraph(graph, config);
            }
            if (this.multiPartQuery) {
                this.multiPartQuery.populateMatchGraph(graph, config);
            }
            if (config && config.activeDataSource) {
                delete config.activeDataSource;
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.useExpression) {
                str += `USE ${this.useExpression}\n`;
            }
            if (this.singlePartQuery) {
                str += this.singlePartQuery.toString(config);
            } else if (this.multiPartQuery) {
                str += this.multiPartQuery.toString(config);
            } 
            return str;
        }
    }

    exports.SinglePartQuery = function () {
        this.myName = 'SinglePartQuery';
        this.readingClauses = [];
        this.updatingClauses = [];
        this.return = null;

        this.populateMatchGraph = function (graph, config) {
            for (var i = 0; i < this.readingClauses.length; i++) {
                if (this.readingClauses[i].populateMatchGraph) {
                    this.readingClauses[i].populateMatchGraph(graph, config);
                }
            }

            for (var i = 0; i < this.updatingClauses.length; i++) {
                if (this.updatingClauses[i].populateMatchGraph) {
                    this.updatingClauses[i].populateMatchGraph(graph, config);
                }
            }

            if (this.return) {
                this.return.populateMatchGraph(graph, config);
            }
        }

        this.addReadingClause = function (readingClause) {
            this.readingClauses.push(readingClause);
        }

        this.addUpdatingClause = function (updatingClause) {
            this.updatingClauses.push(updatingClause);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var strArray = [];
            for (var i = 0; i < this.readingClauses.length; i++) {
                strArray.push(this.readingClauses[i].toString(config));
            }
            for (i = 0; i < this.updatingClauses.length; i++) {
                strArray.push(this.updatingClauses[i].toString(config));
            }
            var joinStr = (config && config.htmlString) ? '\n<br/>' : '\n';
            var str = strArray.join(joinStr);
            if (this.return) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.return.toString(config);
            }
            return str;
        }
    }

    exports.MultiPartQuery = function () {
        this.myName = 'MultiPartQuery';
        this.multiPartQueryParts = [];
        this.singlePartQuery = null;

        this.populateMatchGraph = function (graph, config) {
            for (var i = 0; i < this.multiPartQueryParts.length; i++) {
                this.multiPartQueryParts[i].populateMatchGraph(graph, config);
            }

            if (this.singlePartQuery) {
                this.singlePartQuery.populateMatchGraph(graph, config);
            }
        }

        this.addMultiPartQueryPart = function (part) {
            this.multiPartQueryParts.push(part);
        }

        this.addReadingClause = function (readingClause) {
            var part = this.multiPartQueryParts.slice(-1)[0];
            var addPart = false;
            if (part) {
                if (part.updatingClauses.length > 0 || part.with) {
                    addPart = true;
                }
            } else {
                addPart = true;
            }
            if (addPart) {
                part = new exports.MultiPartQueryPart();
                this.addMultiPartQueryPart(part);
            }
            part.addReadingClause(readingClause);
        }

        this.addUpdatingClause = function (updatingClause) {
            var part = this.multiPartQueryParts.slice(-1)[0];
            var addPart = false;
            if (part) {
                if (part.with) {
                    addPart = true;
                }
            } else {
                addPart = true;
            }
            if (addPart) {
                part = new exports.MultiPartQueryPart();
                this.addMultiPartQueryPart(part);
            }
            part.addUpdatingClause(updatingClause);
        }

        /*
        this.addWithClause = function (withClause) {
            var part = this.multiPartQueryParts.slice(-1)[0];
            if (!part) {
                part = new exports.MultiPartQueryPart();
                this.addMultiPartQueryPart(part);
            }
            part.with = withClause;
        } */

        this.addReturnClause = function (returnClause) {
            var part = this.multiPartQueryParts.slice(-1)[0];
            if (part) {
                part.return = returnClause;
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var strArray = [];
            for (var i = 0; i < this.multiPartQueryParts.length; i++) {
                strArray.push(this.multiPartQueryParts[i].toString(config));
            }
            var joinStr = (config && config.htmlString) ? '\n<br/>' : '\n';
            var str = strArray.join(joinStr);
            if (this.singlePartQuery) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.singlePartQuery.toString(config);
            }
            return str;
        }
    }

    exports.MultiPartQueryPart = function () {
        this.myName = 'MultiPartQueryPart';
        this.readingClauses = [];
        this.updatingClauses = [];
        this.with = null;
        this.return = null;

        this.populateMatchGraph = function (graph, config) {
            for (var i = 0; i < this.readingClauses.length; i++) {
                if (this.readingClauses[i].populateMatchGraph) {
                    this.readingClauses[i].populateMatchGraph(graph, config);
                }
            }

            for (var i = 0; i < this.updatingClauses.length; i++) {
                if (this.updatingClauses[i].populateMatchGraph) {
                    this.updatingClauses[i].populateMatchGraph(graph, config);
                }
            }

            if (this.with) {
                this.with.populateMatchGraph(graph, config);
            }

            if (this.return) {
                this.return.populateMatchGraph(graph, config);
            }
        }

        this.addReadingClause = function (readingClause) {
            this.readingClauses.push(readingClause);
        }

        this.addUpdatingClause = function (updatingClause) {
            this.updatingClauses.push(updatingClause);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var strArray = [];
            for (var i = 0; i < this.readingClauses.length; i++) {
                strArray.push(this.readingClauses[i].toString(config));
            }
            for (i = 0; i < this.updatingClauses.length; i++) {
                strArray.push(this.updatingClauses[i].toString(config));
            }
            var joinStr = (config && config.htmlString) ? '\n<br/>' : '\n';
            var str = strArray.join(joinStr);
            if (this.with) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.with.toString(config);
            }
            if (this.return) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.return.toString(config);
            }
            return str;
        }
    }

    exports.Union = function () {
        this.myName = 'Union';
        this.unionAll = false;
        this.singleQuery = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.singleQuery) {
                this.singleQuery.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var keyword = (this.unionAll) ? 'UNION ALL' : 'UNION';
            var unionStmt = '';
            if (this.singleQuery) {
                unionStmt = `${this.singleQuery.toString()}`;
            }
            return `\n${keyword}\n${unionStmt}`;
        }
    }

    exports.Unwind = function () {
        this.myName = 'Unwind';
        this.expression = null;
        this.parsedExpression = null;
        this.asVariable = null;

        this.populateMatchGraph = function (graph, config) {
            addVariableToScope(config, this.asVariable, this.expression);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            return 'UNWIND ' + this.expression + ' AS ' + this.asVariable;
        }

        this.setParsedExpression = function (value) {
            this.parsedExpression = value;
        }
    }

    exports.With = function () {
        this.myName = 'With';
        this.distinct = false;
        this.returnBody = null;
        this.where = null;

        this.populateMatchGraph = function (graph, config) {

            defineScope(config);

            if (this.returnBody) {
                this.returnBody.populateMatchGraph(graph, config);
            }

        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = (this.disinct) ? 'DISTINCT ' : '';
            str += this.returnBody.toString(config);
            if (this.where) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += 'WHERE ' + this.where;
            }
            return 'WITH ' + str;
        }
    }

    function dontContinue (config, callingObj) {
        if (config) {
            if (config.stop) {
                return true;
            }
            else if (config.stopAt && callingObj) {
                var whoCalled = callingObj.myName;
                if (whoCalled && config.stopAt == whoCalled) {
                    config.stop = true;
                    return true;
                }
            }
        }
        return false;
    }

    exports.Query = function () {
        this.myName = 'Query';
        this.regularQuery = null;
        this.standaloneCall = null;
        this.bulkImportQuery = null;
        this.subQuery = null;

        this.populateMatchGraph = function (graph, config) {
            if (!config) {
                config = {};
            }
            [this.regularQuery, this.standaloneCall, this.bulkImportQuery, this.subQuery]
                .filter(x => x && x.populateMatchGraph)
                .map(x => x.populateMatchGraph(graph, config));
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = [this.regularQuery, this.standaloneCall, this.bulkImportQuery, this.subQuery]
                .filter(x => x && x.toString)
                .map(x => x.toString(config))
                .join('\n');
            if (str.match(/^\n/)) {
                str = str.substr(1);
            }
            return str;
        }
    }

    exports.RegularQuery = function () {
        this.myName = 'RegularQuery';
        this.singleQuery = null;
        this.unions = [];

        this.addUnion = function (union) {
            this.unions.push(union);
        }

        this.populateMatchGraph = function (graph, config) {
            if (!config) {
                config = {};
            }
            if (this.singleQuery && this.singleQuery.populateMatchGraph) {
                this.singleQuery.populateMatchGraph(graph, config);
            }
            this.unions
                .filter(union => union.populateMatchGraph)
                .map(union => union.populateMatchGraph(graph, config));
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.singleQuery && this.singleQuery.toString) {
                str += this.singleQuery.toString(config);
            }
            str += this.unions
                .filter(union => union && union.toString)
                .map(union => union.toString(config))
                .join('\n');
            return str;
        }
    }

    exports.SubQuery = function () {
        this.myName = 'SubQuery';
        this.subQuery = null;
        this.return = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.subQuery && this.subQuery.populateMatchGraph) {
                if (!config) {
                    config = {};
                }
                this.subQuery.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = 'CALL {\n';
            if (this.subQuery && this.subQuery.toString) {
                str += this.subQuery.toString(config);
            }
            str += `\n}`;
            if (this.return) {
                str += `\n${this.return.toString()}`;
            }
            return str;
        }
    }

    exports.Match = function () {
        this.myName = 'Match';
        this.pattern = null;
        this.where = null;
        this.optionalMatch = false;

        this.populateMatchGraph = function (graph, config) {
            if (this.pattern) {
                if (!config) {
                    config = {};
                }
                config.cypherOrigin = (this.optionalMatch) ? "Optional Match" : "Match";
                this.pattern.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.pattern.toString(config);
            if (this.where) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += 'WHERE ' + this.where;
            }
            const keyword = (this.optionalMatch) ? 'OPTIONAL MATCH' : 'MATCH';
            return `${keyword} ${str}`;
        }
    }

    exports.Where = function () {
        this.myName = 'Where';
        this.whereExpression = null;

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            return 'WHERE ' + this.whereExpression;
        }
    }

    exports.Create = function () {
        this.myName = 'Create';
        this.pattern = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.pattern) {
                if (!config) {
                    config = {};
                }
                config.cypherOrigin = "CreateMerge";
                this.pattern.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.pattern.toString(config);
            return 'CREATE ' + str;
        }
    }

    exports.Merge = function () {
        this.myName = 'Merge';
        this.patternPart = null;
        this.mergeAction = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.patternPart) {
                if (!config) {
                    config = {};
                }
                config.cypherOrigin = "CreateMerge";
                this.patternPart.populateMatchGraph(graph, config);
            }
            // TODO: mergeAction
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.patternPart.toString(config);
            if (this.mergeAction) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += this.mergeAction.toString(config);
            }
            return 'MERGE ' + str;
        }
    }

    exports.MergeAction = function () {
        this.myName = 'MergeAction';
        this.onMatchSet = null;
        this.onCreateSet = null;

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            if (this.onMatchSet) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += ' ON MATCH ' + this.onMatchSet.toString(config);
            }
            if (this.onCreateSet) {
                str += (config && config.htmlString) ? '\n<br/>' : '\n';
                str += ' ON CREATE ' + this.onCreateSet.toString(config);
            }
        }
    }

    exports.Set = function () {
        this.myName = 'Set';
        this.setItems = [];

        this.populateMatchGraph = function (graph, config) {
            for (var i = 0; i < this.setItems.length; i++) {
                this.setItems[i].populateMatchGraph(graph, config);
            }
        }

        this.addSetItem = function (setItem) {
            this.setItems.push(setItem);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var strArray = [];
            for (var i = 0; i < this.setItems.length; i++) {
                strArray.push(this.setItems[i].toString(config));
            }
            return 'SET ' + strArray.join(', ');
        }
    }

    exports.findNodeLabelStringByVariable = function (graph, config, variable) {
        var matchingNodeLabel, labelVariableMap, mapValue;
        var variableMapStack = (config.variableMapStack) ? config.variableMapStack.slice() : [];
        var activeMap = getActiveLabelVariableMap(config);
        if (activeMap) {
            // adding the current label variable map to the stack so we can loop through the entire stack
            variableMapStack.push(activeMap);
        }
        //console.log(variableMapStack);
        while (variableMapStack.length > 0) {
            labelVariableMap = variableMapStack.pop();
            mapValue = getStringValueFromLabelVariableMap(labelVariableMap, variable);
            //mapValue = labelVariableMap[variable];
            if (typeof(mapValue) === 'string') {
                matchingNodeLabel = graph.getNodeLabelByLabel(mapValue);
                if (matchingNodeLabel) {
                    break;
                }
            }
            variable = mapValue;
        }
        return (matchingNodeLabel) ? matchingNodeLabel.label : null;
    }

    exports.findRelationshipTypeByVariable = function (graph, config, variable) {
        var matchingRelationshipType, labelVariableMap, mapValue;
        var variableMapStack = (config.variableMapStack) ? config.variableMapStack.slice() : [];
        var activeMap = getActiveLabelVariableMap(config);
        if (activeMap) {
            variableMapStack.push(activeMap);
        }
        while (variableMapStack.length > 0) {
            labelVariableMap = variableMapStack.pop();
            mapValue = getStringValueFromLabelVariableMap(labelVariableMap, variable);
            //mapValue = labelVariableMap[variable];
            if (typeof(mapValue) === 'object') {
                matchingRelationshipType = graph.getRelationshipType(mapValue.relationshipTypeString, mapValue.startNodeLabelString, mapValue.endNodeLabelString);
                if (matchingRelationshipType) {
                    break;
                }
            } else if (typeof(mapValue) === 'string') {
                variable = mapValue;
            }
        }
        return matchingRelationshipType;
    }

    function handleProperties (setItemRef, propertyContainer, tokens, config) {
        var parseObj, addedProperty, key, matchingProperty;
        var returnValue = true;
        if (tokens.length == 1 && typeof(setItemRef.rightHandSide) == 'object') {
           Object.keys(setItemRef.rightHandSide).map(name => {
               parseObj = parsePropertyValue(setItemRef.rightHandSide[name]);
               matchingProperty = propertyContainer.getPropertyByName(name);
               key = (matchingProperty && matchingProperty.key) ? matchingProperty.key : null;
               var propertyMap = {
                    key: key, 
                    name: name, 
                    datatype: parseObj.dataType, 
                    referenceData: parseObj.propertyValue
               }
               addedProperty = propertyContainer.addOrUpdateProperty(propertyMap);
               addedProperty.addDataSource(config.activeDataSource, true);
           });
       } else if (tokens.length == 2) {
           // variable and property key
           var name = tokens[1];
           matchingProperty = propertyContainer.getPropertyByName(name);
           key = (matchingProperty && matchingProperty.key) ? matchingProperty.key : null;
           parseObj = parsePropertyValue(setItemRef.rightHandSide);
           var propertyMap = {
                key: key, 
                name: name, 
                datatype: parseObj.dataType, 
                referenceData: parseObj.propertyValue
           }           
           addedProperty = propertyContainer.addOrUpdateProperty(propertyMap);
           addedProperty.addDataSource(config.activeDataSource, true);
       } else {
           returnValue = false;
       }
       return returnValue;
    }

    exports.SetItem = function () {
        this.myName = 'SetItem';
        this.leftHandSide = null;
        this.rightHandSide = null;
        this.nodeLabels = [];

        this.operator = null;

        this.populateMatchGraph = function (graph, config) {
            // need to use leftHandSide to look up something
            if (this.leftHandSide && this.rightHandSide) {
                // left hand side can be a variable or property expression
                var tokens = this.leftHandSide.split('.');
                var nodeLabelString;
                var existingNodeLabel;
                var variable = tokens[0];
                nodeLabelString = exports.findNodeLabelStringByVariable(graph, config, variable);
                existingNodeLabel = graph.getNodeLabelByLabel(nodeLabelString);
                if (existingNodeLabel) {
                    if (tokens.length == 1 && typeof(this.rightHandSide) == 'string' && this.rightHandSide.startsWith(':') && this.nodeLabels.length > 0) {
                        // we have set node labels, e.g. var1:NodeLabel
                        this.nodeLabels.map(nodeLabelString => {
                            return addNewNodeLabel(nodeLabelString, graph, config);
                        })
                    } else {
                        // handle properties
                        var returnValue = handleProperties(this, existingNodeLabel, tokens, config);
                        if (!returnValue) {
                            console.log("error processing left and right hand size: lhs: " + this.leftHandSide
                                    + ", rhs: " + JSON.stringify(this.rightHandSide) + ", typeof(rhs): " + typeof(this.rightHandSide));
                        }
                    }
                } else {
                    var wasRelationshipVar = false;
                    var relationshipType = exports.findRelationshipTypeByVariable(graph, config, variable);
                    if (relationshipType) {
                        wasRelationshipVar = true;
                        var returnValue = handleProperties(this, relationshipType, tokens, config);
                        if (!returnValue) {
                            console.log("error processing left and right hand size: lhs: " + this.leftHandSide
                                    + ", rhs: " + JSON.stringify(this.rightHandSide) + ", typeof(rhs): " + typeof(this.rightHandSide));
                        }
                    }
                    if (!wasRelationshipVar) {
                        console.log("can't find existingNodeLabel for variable: " + variable);
                    }
                }
            }
        }

        this.addLabel = function (label) {
            if (label && label.replace) {
                label = label.replace(/`/g, '');
            }
            this.nodeLabels.push(label);
        }

        // this is for when we get a MapLiteral as the value of the right hand side
        this.addProperty = function (key, value) {
            if (!this.rightHandSide || typeof(this.rightHandSide) != 'object') {
                // the right hand size could have been set to the string before it was realized the string was MapLiteral, so resetting it
                this.rightHandSide = {};
            }
            this.rightHandSide[key] = value;
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.leftHandSide;
            if (this.operator) {
                str += ' ' + this.operator;
            }
            if (typeof(this.rightHandSide) == 'object') {
                var propStr = '';
                Object.keys(this.rightHandSide).map(key => {
                    if (propStr) {
                        propStr += ',';
                    }
                    //e.g. name: row.name,
                    propStr += '\n' + key + ': ' + this.rightHandSide[key];
                });
                str += ' {' + propStr + '\n}';
            } else {
                str += ' ' + this.rightHandSide;
            }
            return str;
        }
    }

    exports.AnonymousPatternPart = function () {
        this.myName = 'AnonymousPatternPart';
        this.shortestPathPattern = null;
        this.patternElement = null;

        this.populateMatchGraph = function (graph, config) {
            if (this.shortestPathPattern) {
                this.shortestPathPattern.populateMatchGraph(graph, config);
            }
            if (this.patternElement) {
                this.patternElement.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            // return this.shortestPathKeyword + '(' + this.patternElement.toString(config) + ')';
            if (this.shortestPathPattern) {
                return this.shortestPathPattern.toString(config);
            } else {
                return this.patternElement.toString(config);
            }
        }
    }

    exports.Pattern = function () {
        this.myName = 'Pattern';
        this.patternPart = [];

        this.populateMatchGraph = function (graph, config) {
            for (var i = 0; i < this.patternPart.length; i++) {
                this.patternPart[i].populateMatchGraph(graph, config);
            }
        }

        this.addPatternPart = function (patternPart) {
            this.patternPart.push(patternPart);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var patternStrings = [];
            for (var i = 0; i < this.patternPart.length; i++) {
                patternStrings.push(this.patternPart[i].toString(config));
            }
            var joinStr = (config && config.htmlString) ? '\n<br/>' : '\n';
            return patternStrings.join("," + joinStr);
        }
    }

    exports.PatternPart = function () {
        this.myName = 'PatternPart';
        this.variable = null;
        this.anonymousPatternPart = null;
        this.patternElement = null;    // for convenience, because I don't want to descend to anonymousPatternPart unless its a shortest path query

        this.populateMatchGraph = function (graph, config) {
            if (this.anonymousPatternPart) {
                this.anonymousPatternPart.populateMatchGraph(graph, config);
            }
            if (this.patternElement) {
                this.patternElement.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            if (this.anonymousPatternPart) {
                var str = this.anonymousPatternPart.toString(config);
                return (this.variable) ? this.variable + '=' + str : str;
            } else {
                return this.patternElement.toString(config);
            }
        }
    }

    exports.PatternElement = function () {
        this.myName = 'PatternElement';
        this.nodePattern = null;
        this.patternElementChain = [];

        this.populateMatchGraph = function (graph, config) {
            if (this.nodePattern) {
                var graphNode = this.nodePattern.populateMatchGraph(graph, config);
                var otherNode = graphNode;
                for (var i = 0; i < this.patternElementChain.length; i++) {
                    otherNode = this.patternElementChain[i].populateMatchGraph(graph, config, otherNode);
                }
            }
        }

        this.populatePatternSegments = function (segmentArray) {
            var startNode = this.nodePattern;
            if (this.patternElementChain.length > 0) {
                for (var i = 0; i < this.patternElementChain.length; i++) {
                    var chainPart = this.patternElementChain[i];
                    segmentArray.push({
                        startNode: startNode,
                        relationship: chainPart.relationshipPattern,
                        endNode: chainPart.nodePattern
                    });
                    startNode = chainPart.nodePattern;
                }
            } else {
                segmentArray.push({
                    startNode: startNode,
                    relationship: null,
                    endNode: null
                });
            }
        }

        this.addChain = function (patternElementChain) {
            this.patternElementChain.push(patternElementChain);
        }

        this.addRelNodeToChain = function (relationshipPattern, nodePattern) {
            var chainPart = new exports.PatternElementChainLink();
            chainPart.relationshipPattern = relationshipPattern;
            chainPart.nodePattern = nodePattern;
            this.patternElementChain.push(chainPart);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = '';
            for (var i = 0; i < this.patternElementChain.length; i++) {
                str += this.patternElementChain[i].toString(config);
            }
            return this.nodePattern.toString(config) + str;
        }
    }

    exports.PatternElementChainLink = function () {
        this.myName = 'PatternElementChainLink';
        this.relationshipPattern = null;
        this.nodePattern = null;

        this.populateMatchGraph = function (graph, config, otherNode) {

            if (this.nodePattern) {
                var graphNode = this.nodePattern.populateMatchGraph(graph, config);
                var relTypes = (this.relationshipPattern.relationshipTypes.length) ? this.relationshipPattern.relationshipTypes : ['ANON'];
                var startNodeLabel;
                var endNodeLabel;
                relTypes.map(relType => {
                    if (this.relationshipPattern) {
                        if (otherNode) {
                            var candidateRelKey = otherNode.nodeId + this.relationshipPattern.leftArrowDirection
                                                + relType
                                                + this.relationshipPattern.rightArrowDirection + graphNode.nodeId;
    
                            var relKey, startNodeId, endNodeId;
                            if (config && config.useLabelAsId) {
                                relKey = candidateRelKey;
                            } else {
                                relKey = (this.relationshipPattern.variable) ? this.relationshipPattern.variable : candidateRelKey;
                            }

                            //console.log(this.relationshipPattern);
                            if (this.relationshipPattern.leftArrowDirection == '<-') {
                                startNodeId = graphNode.nodeId;
                                endNodeId = otherNode.nodeId;
                                startNodeLabel = graphNode;
                                endNodeLabel = otherNode;
                            } else {
                                startNodeId = otherNode.nodeId;
                                endNodeId = graphNode.nodeId;
                                startNodeLabel = otherNode;
                                endNodeLabel = graphNode;
                            }
                        } else {
                            console.log('Expected otherNode, but was not provided');
                            if (this.relationshipPattern) {
                                console.log('relationship pattern is: ' + this.relationshipPattern.toString());
                            }
                            if (this.nodePattern) {
                                console.log('node pattern is: ' + this.nodePattern.toString());
                            }
                        }
                    }
    
                    if (startNodeLabel && endNodeLabel) {
                        var existingRelationshipType = graph.getRelationshipType(relType, startNodeLabel.label, endNodeLabel.label);
                        if (!existingRelationshipType) {
                            var newRelationshipType = new graph.RelationshipType({
                                type: relType,
                                startNodeLabel: startNodeLabel,
                                endNodeLabel: endNodeLabel,
                                selfConnected: (startNodeLabel === endNodeLabel),
                                cypherOrigin: config.cypherOrigin
                            });
                            newRelationshipType.addDataSource(config.activeDataSource, true);
                            graph.addRelationshipType(newRelationshipType);
                            processDataModelProperties(newRelationshipType, this.relationshipPattern.properties, null, config);
                        } else {
                            existingRelationshipType.addDataSource(config.activeDataSource, true);
                            existingRelationshipType.setCypherOrigin(config.cypherOrigin);
                            processDataModelProperties(existingRelationshipType, this.relationshipPattern.properties, null, config);
                        }
                        if (this.relationshipPattern.variable) {
                            addVariableToScope(config, this.relationshipPattern.variable, {
                                mapEntryType: 'RelationshipPatternVariable',
                                relationshipTypeString: relType,
                                startNodeLabelString: startNodeLabel.label,
                                endNodeLabelString: endNodeLabel.label
                            });
                        }
                    }
                })
                return graphNode;
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            return this.relationshipPattern.toString(config) + this.nodePattern.toString(config);
        }
    }

    function getPropertiesString (properties) {
        var str = '';
        if (properties) {
            var propertiesStrArray = [];
            Object.keys(properties).map(key => {
                var propertiesStr = key + ":";
                var val = properties[key];
                /*
                if (typeof(val) === 'string') {
                    propertiesStr += "'" + val + "'";
                } else {
                    propertiesStr += val;
                }*/
                propertiesStr += val;
                propertiesStrArray.push(propertiesStr);
            });
            if (propertiesStrArray.length > 0) {
                str = ' {' + propertiesStrArray.join(', ') + '}';
            }
        }
        return str;
    }

    function processDataModelProperties (propertyContainer, properties, keyProperties, config) {
        if (propertyContainer && properties) {
            Object.keys(properties).map(propertyKey => {
                var returnObj = parsePropertyValue(properties[propertyKey]);
                var isPartOfKey = (keyProperties && keyProperties[propertyKey]) ? true : false;
                var matchingProperty = propertyContainer.getPropertyByName(propertyKey);
                var key = (matchingProperty && matchingProperty.key) ? matchingProperty.key : null;
                var propertyMap = {
                    key: key, 
                    name: propertyKey, 
                    datatype: returnObj.dataType, 
                    referenceData: returnObj.propertyValue
                }
                var addedProperty = propertyContainer.addOrUpdateProperty(propertyMap, { isPartOfKey: isPartOfKey});
                addedProperty.addDataSource(config.activeDataSource, true);
            })
        }
    };

    function parsePropertyValue (propertyValue) {
        var dataType = exports.DataTypes.String;
        var newPropertyValue = propertyValue;
        if (propertyValue && propertyValue.match) {
            // e.g. toInteger(row.age)
            var result = propertyValue.match(/(.+)\((.+)\)/);   // TODO: this should probably be moved down to the ANTLR level?
            if (result) {
                var conversionFunction = result[1];
                if (conversionFunction.match(/^toInt/)) {   // covers toInt and toInteger
                    dataType = exports.DataTypes.Integer;
                    newPropertyValue = parseInt(result[2]);
                } else if (conversionFunction.match(/^toFloat/)) {
                    dataType = exports.DataTypes.Float;
                    newPropertyValue = parseFloat(result[2]);
                }
            } else {
                var floatResult = parseFloat(propertyValue);
                if (!isNaN(floatResult)) {
                    // both parseFloat and parseInt will parse either type
                    // however, parseInt will truncate a float to an int like 1.1 => 1
                    var intResult = parseInt(propertyValue);
                    if (intResult === floatResult) {
                        // then it is an integer
                        dataType = exports.DataTypes.Integer;
                        newPropertyValue = intResult;
                    } else {
                        dataType = exports.DataTypes.Float;
                        newPropertyValue = floatResult;
                    }
                }
            }
        }

        if (dataType === exports.DataTypes.String && propertyValue.match) {
            // fix quotes
            result = propertyValue.match(/^['"](.*)['"]$/);
            if (result) {
                newPropertyValue = result[1];
            }
        }

        return {
            dataType: dataType,
            propertyValue: newPropertyValue
        }
    }

    function addNewNodeLabel (nodeLabelString, graph, config) {
        var nodeLabel = graph.getNodeLabelByLabel(nodeLabelString);
        if (!nodeLabel) {
            //console.log('adding nodeLabelString: ' + nodeLabelString);
            nodeLabel = new graph.NodeLabel({
                label: nodeLabelString,
                cypherOrigin: config.cypherOrigin
            });
            nodeLabel.addDataSource(config.activeDataSource, true);
            var canvasAttr = { width: 1400, height: 800, snapToGrid: false };
            if (config && config.dataModelCanvas) {
                canvasAttr = {
                    ...config.dataModelCanvas.getCanvasDimensions(),
                    ...config.dataModelCanvas.getSnapToGrid()
                };
            }
            setNewNodeLabelPosition(nodeLabel, null, null, graph, canvasAttr);
            graph.addNodeLabel(nodeLabel);
        }
        nodeLabel.setIsOnlySecondaryNodeLabel(false, true);
        return nodeLabel;
    }

    exports.NodePattern = function () {
        this.myName = 'NodePattern';
        this.variable = null;
        this.nodeLabels = [];
        this.properties = {};
        this.keyProperties = {};

        this.populateMatchGraph = function (graph, config) {

            //var nodeLabelString = (this.nodeLabels.length) ? this.nodeLabels.join(':') : 'Anon';
            var nodeLabelString = (this.nodeLabels.length) ? this.nodeLabels[0] : 'Anon';
            if (config && this.variable) {
                if (nodeLabelString !== 'Anon') {
                    addVariableToScope(config, this.variable, nodeLabelString);
                } else {
                    nodeLabelString = exports.findNodeLabelStringByVariable(graph, config, this.variable);
                    if (!nodeLabelString) {
                        nodeLabelString = 'Anon';
                    }
                }
            }

            var nodeLabel = addNewNodeLabel(nodeLabelString, graph, config);
            nodeLabel.addDataSource(config.activeDataSource, true);
            nodeLabel.setCypherOrigin(config.cypherOrigin);
            processDataModelProperties(nodeLabel, this.properties, this.keyProperties, config);

            if (graph && nodeLabel && this.nodeLabels.length > 1) {
                graph.ensureSecondaryNodeLabels (nodeLabel, this.nodeLabels.slice(1), graph);
            }
            return nodeLabel;
        }

        this.addLabel = function (label) {
            if (label && label.replace) {
                label = label.replace(/`/g, '');
            }
            this.nodeLabels.push(label);
        }

        this.addProperty = function (key, value, isKeyProperty) {
            this.properties[key] = value;
            if (isKeyProperty) {
                this.keyProperties[key] = value;
            }
        }

        this.getLabelString = function () {
            if (this.nodeLabels) {
                return this.nodeLabels.join(':');
            } else {
                return '';
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = (this.variable) ? getStringValue (config, this.variable, 'nodeLabelVariable') : '';
            var nodeLabels = this.nodeLabels.join(':');
            if (nodeLabels) {
                str += ':' + getStringValue (config, nodeLabels, 'nodeLabel');
            }
            if (config && config.skipProperties) {
                // don't include properties
            } else {
                str += getPropertiesString(this.properties);
            }

            return '(' + str + ')';
        }
    }

    exports.RelationshipPattern = function () {
        this.myName = 'RelationshipPattern';
        this.leftArrowDirection = null;
        this.rightArrowDirection = null;
        this.variable = null;
        this.relationshipTypes = [];
        this.properties = {};

        /* these are for things like [:HAS_CHILD*1..3], where rangeLow = 1 and rangeHigh = 3 */
        this.rangeLow = null;
        this.rangeHigh = null;

        this.addType = function (type) {
            //console.log('adding type: ', type);
            this.relationshipTypes.push(type);
        }

        this.addProperty = function (key, value) {
            this.properties[key] = value;
        }

        this.getTypeString = function () {
            if (this.relationshipTypes) {
                return this.relationshipTypes.join(':');
            } else {
                return '';
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var domId;
            var str = this.leftArrowDirection + '[';
            if (this.variable) {
                str += getStringValue (config, this.variable, 'relationshipTypeVariable');
            }
            str += ':' + getStringValue (config, this.relationshipTypes.join('|'), 'relationshipType');
            // TODO: rangeLow and rangeHigh

            if (config && config.skipProperties) {
                // don't include properties
            } else {
                str += getPropertiesString(this.properties);
            }

            str += ']' + this.rightArrowDirection;
            return str;
        }
    }

    function getStringValue (config, thingToAppend, typeOfThingToAppend) {
        var str = '';
        if (config && config.htmlString) {
            var domId = getDomId(config, typeOfThingToAppend);
            str += "<span id='" + domId + "' class='" + typeOfThingToAppend + "'>";
        }
        str += thingToAppend;
        if (config && config.htmlString) {
             str += '</span>';
        }
        return str;
    }

    function getDomId (config, cypherType) {
        if (config && cypherType) {
            if (!config.domIdMap) {
                config.domIdMap = {};
            }
            var counter = config.domIdMap[cypherType];
            if (!counter) {
                counter = 0;
            }
            counter++;
            config.domIdMap[cypherType] = counter;
            return 'cypher_' + cypherType + '_' + counter;
        }
    }

    exports.Atom = function () {
        this.myName = 'Atom';
        /*
        oC_Atom : oC_Literal
                | oC_Parameter
                | oC_LegacyParameter
                | oC_CaseExpression
                | ( COUNT SP? '(' SP? '*' SP? ')' )
                | oC_ListComprehension
                | oC_PatternComprehension
                | ( FILTER SP? '(' SP? oC_FilterExpression SP? ')' )
                | ( EXTRACT SP? '(' SP? oC_FilterExpression SP? ( SP? '|' SP? oC_Expression )? SP? ')' )
                | oC_Reduce
                | ( ALL SP? '(' SP? oC_FilterExpression SP? ')' )
                | ( ANY SP? '(' SP? oC_FilterExpression SP? ')' )
                | ( NONE SP? '(' SP? oC_FilterExpression SP? ')' )
                | ( SINGLE SP? '(' SP? oC_FilterExpression SP? ')' )
                | oC_ShortestPathPattern
                | oC_RelationshipsPattern
                | oC_ParenthesizedExpression
                | oC_FunctionInvocation
                | oC_Variable
                | oC_ExplicitProcedureInvocation
                ;
        */
        this.variable = null;
        this.literal = null;
        this.functionInvocation = null;
        this.atomText = null;
        this.parsedExpression = null;

        this.toString = function () {
            return this.atomText;
        }

        this.setVariable = function (value) {
            this.variable = value;
        }

        this.setLiteral = function (value) {
            this.literal = value;
        }

        this.setFunctionInvocation = function (value) {
            this.functionInvocation = value;
        }

        this.setAtomText = function (value) {
            this.atomText = value;
        }

        this.setParsedExpression = function (value) {
            this.parsedExpression = value;
        }

        this.getVariable = function () {
            return this.variable;
        }

        this.isVariable = function () {
            return (this.variable !== null);
        }

        this.lookupPropertyKeys = function (propertyLookups, config) {
            console.log(`${this.myName} in lookupPropertyKeys`)
            if (this.literal) {
                return this.literal.lookupPropertyKeys(propertyLookups, config);
            } else {
                console.log("TODO: atom implement lookupPropertyKeys for ", this);
            }
        }

        this.populateMatchGraph = function (graph, config) {
            if (this.literal) {
                console.log('Atom calling literal.populateMatchGraph');
                this.literal.populateMatchGraph (graph, config);
            }
            if (this.functionInvocation) {
                console.log('TODO: handle functionInvocation');
            }
            if (this.parsedExpression) {
                console.log('Atom calling parsedExpression.populateMatchGraph');
                this.parsedExpression.populateMatchGraph(graph, config);
            } else {
                //console.log('TODO: atom.populateMatchGraph, atom is ', this);
            }
        }
    }

    exports.Literal = function () {
        this.myName = 'Literal';
        this.value = null;
        this.mapLiteral = null;

        this.setValue = function (value) {
            this.value = value;
        }

        this.setMapLiteral = function (value) {
            this.mapLiteral = value;
        }

        this.lookupPropertyKeys = function (propertyLookups, config) {
            console.log(`${this.myName} in lookupPropertyKeys`)
            if (this.mapLiteral) {
                return this.mapLiteral.lookupPropertyKeys(propertyLookups, config);
            }
        }

        this.populateMatchGraph = function (graph, config) {
            if (this.mapLiteral) {
                this.mapLiteral.populateMatchGraph(graph, config);
            }
        }
    }

    exports.MapLiteral = function () {
        this.myName = 'MapLiteral';
        this.mapEntries = [];

        this.lookupPropertyKeys = function (propertyLookups, config) {
            //console.log(`${this.myName} in lookupPropertyKeys`)
            var thingToLookup = propertyLookups[0];
            var foundItem = this.mapEntries.find(x => x.key === thingToLookup);
            //console.log(`thingToLookup: ${thingToLookup}, foundItem: `, foundItem);
            if (propertyLookups.length === 1) {
                //console.log(`returning found item `, foundItem.value);
                return foundItem.value;
            } else {
                //console.log(`rest of things to lookup`);
                var restOfThingsToLookup = propertyLookups.slice(1);
                if (foundItem.lookupPropertyKeys) {
                    return foundItem.lookupPropertyKeys(restOfThingsToLookup, config);
                } else {
                    console.log(`Found item for ${thingToLookup},
                        still need to lookup ${JSON.stringify(restOfThingsToLookup)},
                        but found item does not have lookupPropertyKeys function.  Found item is '
                    `, foundItem)
                }
            }
        }

        this.populateMatchGraph = function (graph, config) {
        }

        this.addMapEntry = function (key, value, isKeyProperty) {
            this.mapEntries.push({key: key, value: value, isKeyProperty: isKeyProperty});
        }
    }

    exports.Expression = function () {
        this.myName = 'Expression';
        this.atom = null;
        this.parsedExpression = null;

        this.setAtom = function (value) {
            this.atom = value;
        }

        this.setParsedExpression = function (value) {
            this.parsedExpression = value;
        }

        this.getVariable = function () {
            if (this.parsedExpression) {
                return this.parsedExpression.getVariable();
            } else if (this.atom) {
                return this.atom.getVariable();
            } else {
                console.log('Expression: Cannot find variable, atom and parsedExpression not set');
                return null;
            }
        }

        this.isVariable = function () {
            if (this.parsedExpression) {
                return this.parsedExpression.isVariable();
            } else if (this.atom) {
                return this.atom.isVariable();
            } else {
                return false;
            }
        }

        this.lookupPropertyKeys = function (propertyLookups, config) {
            console.log(`${this.myName} in lookupPropertyKeys`)
            if (this.parsedExpression) {
                return this.parsedExpression.lookupPropertyKeys(propertyLookups, config);
            } else if (this.atom) {
                return this.atom.lookupPropertyKeys(propertyLookups, config);
            }
        }

        this.populateMatchGraph = function (graph, config) {
            if (this.parsedExpression) {
                //console.log('Expression calling parsedExpression.populateMatchGraph');
                this.parsedExpression.populateMatchGraph(graph, config);
            } else if (this.atom) {
                //console.log('Expression calling atom.populateMatchGraph');
                this.atom.populateMatchGraph(graph, config);
            }
        }

        this.toString = function () {
            if (this.parsedExpression) {
                //console.log('Expression calling parsedExpression.populateMatchGraph');
                return this.parsedExpression.toString();
            } else if (this.atom) {
                //console.log('Expression calling atom.populateMatchGraph');
                return this.atom.toString();
            }
        }
    }

    exports.PropertyOrLabelsExpression = function () {
        this.myName = 'PropertyOrLabelsExpression';
        this.atom = null;
        this.propertyLookups = [];

        this.setAtom = function (value) {
            this.atom = value;
        }

        this.addPropertyLookup = function (value) {
            this.propertyLookups.push(value);
        }

        this.getVariable = function () {
            if (this.atom) {
                return this.atom.getVariable();
            } else {
                console.log('PropertyOfLabelsExpression: Cannot find variable, atom not set');
                return null;
            }
        }

        this.isVariable = function () {
            if (this.atom) {
                return this.atom.isVariable();
            } else {
                return false;
            }
        }

        this.lookupPropertyKeys = function (propertyLookups, config) {
            console.log(`${this.myName} in lookupPropertyKeys`)
            if (this.atom) {
                return this.atom.lookupPropertyKeys(propertyLookups, config);
            }
        }

        /*
        this.setPropertyKeyName = function (value) {
            console.log('setting property key name: ', value);
            this.propertyKeyName = value;
        }*/

        this.populateMatchGraph = function (graph, config) {
            //console.log('PropertyOrLabelsExpression populateMatchGraph');
            if (this.propertyLookups.length > 0 && this.atom && this.atom.isVariable()) {
                this.atom.populateMatchGraph(graph, config);
                var variable = this.atom.variable;
                //console.log('atom is variable, variable = ', variable);

                var propertyLookups = this.propertyLookups.slice();
                var propertyKeyName = propertyLookups.pop();
                //console.log('propertyKeyName = ', propertyKeyName);

                if (propertyLookups.length > 0) {
                    var variableLookup = getValueFromLabelVariableMap(getActiveLabelVariableMap(config), variable);
                    //console.log('variableLookup is ', variableLookup);
                    if (variableLookup.lookupPropertyKeys) {
                        var lookupValue = variableLookup.lookupPropertyKeys(propertyLookups, config);
                        //console.log('lookup value is ', lookupValue);
                        if (lookupValue.isVariable && lookupValue.isVariable()) {
                            variable = lookupValue.getVariable();
                            //console.log('variable is ', variable);
                        } else {
                            console.log('lookup value does not have isVariable function, lookupValue is ', lookupValue);
                        }
                    } else {
                        console.log('variableLookup does not have lookupPropertyKeys, it is ', variableLookup);
                    }
                    /*
                    console.log('typeof variableLookup is ', typeof(variableLookup));
                    var trace = this.atom.backTrace(variableLookup, propertyLookups, config);
                    console.log('trace ', trace);
                    */
                }

                var nodeLabelString = exports.findNodeLabelStringByVariable(graph, config, variable);
                var propertyContainer = (nodeLabelString) ? graph.getNodeLabelByLabel(nodeLabelString) :
                                            exports.findRelationshipTypeByVariable(graph, config, variable);
                processDataModelProperties (propertyContainer, {[propertyKeyName]: ''}, {}, config);
            }
        }

        this.toString = function () {
            var str = '';
            if (this.atom) {
                str = this.atom.toString();
            }
            if (this.propertyLookups.length > 0) {
                str += '.' + this.propertyLookups.join(',')
            }
            return str;
        }
    }

    /*
    exports.PropertyExpression = function () {
        this.myName = 'PropertyExpression';
        this.atom = null;
        this.propertyKeyName = null;

        this.setAtom = function (value) {
            this.atom = value;
        }

        this.setPropertyKeyName = function (value) {
            this.propertyKeyName = value;
        }

        this.populateMatchGraph = function (graph, config) {
            console.log('TODO: PropertyExpression implement populateMatchGraph')
        }
    }*/

    exports.Return = function () {
        this.myName = 'Return';
        this.distinct = false;
        this.returnBody = null;

        this.populateMatchGraph = function (graph, config) {
            //console.log('return populateMatchGraph')
            if (this.returnBody) {
                this.returnBody.populateMatchGraph(graph, config);
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = (this.disinct) ? 'DISTINCT ' : '';
            str += this.returnBody.toString(config);
            return 'RETURN ' + str;
        }
    }

    exports.ReturnBody = function () {
        this.myName = 'ReturnBody';
        this.returnAsterisk = false;
        this.returnItems = [];
        this.orderBy = null;
        this.skip = null;
        this.limit = null;

        this.populateMatchGraph = function (graph, config) {
            //console.log('return body populateMatchGraph')
            if (this.returnItems) {
                for (var i = 0; i < this.returnItems.length; i++) {
                    this.returnItems[i].populateMatchGraph(graph, config);
                }
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var returnItemStrings = [];
            for (var i = 0; i < this.returnItems.length; i++) {
                returnItemStrings.push(this.returnItems[i].toString(config));
            }
            var str = returnItemStrings.join(', ');
            if (this.returnAsterisk) {
                if (str) {
                    str = '*, ' + str;
                } else {
                    str = '*';
                }
            }

            if (this.orderBy !== null) {
                str += `\nORDER BY ${this.orderBy}`;
            }
            if (this.skip !== null) {
                str += `\nSKIP ${this.skip}`;
            }
            if (this.limit !== null) {
                str += `\nLIMIT ${this.limit}`;
            }

            return str;
        }
    }

    exports.OrderBy = function () {
        this.myName = 'OrderBy';
        this.sortItems = [];

        this.populateMatchGraph = function (graph, config) {
        }

        this.addSortItem = function (sortItem) {
            this.sortItems.push(sortItem);
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            return this.sortItems.map(x => x.toString()).join(', ');
        }
    }

    exports.SortItem = function () {
        this.myName = 'SortItem';
        this.expression = null;
        this.ascendingDescending = null;

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.expression;
            if (this.ascendingDescending) {
                str += ' ' + this.ascendingDescending;
            }
            return str;
        }
    }

    exports.ReturnItem = function () {
        this.myName = 'ReturnItem';
        this.expression = null;
        this.parsedExpression = null;
        this.asVariable = null;
        this.referencedVariables = [];
        this.referencedPropertyKeys = [];

        this.setParsedExpression = function (value) {
            this.parsedExpression = value;
        }

        this.addVariable = function (variable) {
            if (!this.referencedVariables.includes(variable)) {
                this.referencedVariables.push(variable);
            }
        }

        this.addPropertyKey = function (propertyKey) {
            if (!this.referencedPropertyKeys.includes(propertyKey)) {
                this.referencedPropertyKeys.push(propertyKey);
            }
        }

        this.populateMatchGraph = function (graph, config) {
            if (config) {
                if (this.asVariable) {
                    addVariableToScope(config, this.asVariable, this.parsedExpression);
                }

                if (this.parsedExpression) {
                    //console.log('Return Item calling parsedExpression.populateMatchGraph');
                    this.parsedExpression.populateMatchGraph(graph, config);
                }
            }
        }

        this.toString = function (config) {
            if (dontContinue(config, this)) return '';
            var str = this.expression;
            if (this.asVariable && this.expression != this.asVariable) {
                str += ' AS ' + this.asVariable;
            }
            return str;
        }
    }

    return exports;

})();
export default CypherStatement;
