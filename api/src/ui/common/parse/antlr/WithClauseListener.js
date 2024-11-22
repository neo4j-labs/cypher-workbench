
import CypherListener from './CypherListener';
import { WithVariable } from './withVariable';

export default class WithClauseListener extends CypherListener {

    withVariables = [];
    hasAsterisk = false;
    lastSymbolicName = null;
    lastVariable = null;
    lastPropertyKey = null;

    getWithVariables = function () { return this.withVariables; }
    getHasAsterisk = function () { return this.hasAsterisk; }
    getLastSymbolicName = function () { return this.lastSymbolicName; }
    getLastVariable = function () { return this.lastVariable; }
    getLastPropertyKey = function () { return this.lastPropertyKey; }

    exitOC_SymbolicName = function(ctx) {
        this.lastSymbolicName = ctx.getChild(0).getText();
    };

    exitOC_Variable = function(ctx) {
        //console.log('variable: ' + ctx.getChild(0).getText());
        this.lastVariable = ctx.getChild(0).getText();
    };

    exitOC_PropertyKeyName = function(ctx) {
        this.lastPropertyKey = ctx.getChild(0).getText();
    };

    enterOC_ReturnItems = function(ctx) {
        var hasAsterisk = false;
        const childCount = ctx.getChildCount();
        //console.log('childCount: ', childCount);
        for (var i = 0; i < childCount; i++) {
            const child = ctx.getChild(i);
            if (child.getText() === '*') {
                hasAsterisk = true;
                break;
            }
        }
        this.hasAsterisk = hasAsterisk;
    }

    enterOC_ReturnItem = function(ctx) {
        //console.log('ctx.start.tokenIndex: ', ctx.start.tokenIndex);
        var asExists = false;
        const childCount = ctx.getChildCount();
        //console.log('childCount: ', childCount);
        for (var i = childCount - 1; i >= 0; i--) {
            const child = ctx.getChild(i);
            if (child.getText().toLowerCase() === 'as') {
                asExists = true;
                break;
            }
        }
        //console.log("asExists: ", asExists);
        var expression = null;
        var variable = null;

        const firstChild = ctx.getChild(0).getText();
        var firstChildIsVariable = false;

        if (firstChild && firstChild.match && firstChild.match(/^\w+$/)) {
            // make sure its a single word and not an expression
            firstChildIsVariable = true;
        }

        if (asExists) {
            expression = firstChild; 
            variable = ctx.getChild(childCount - 1).getText();
        } else if (firstChildIsVariable) {
            variable = firstChild;
        } else {
            expression = firstChild;
        }

        var withVariable = new WithVariable({
            key: ctx.start.tokenIndex,
            expression: expression,
            variable: variable
        });

        this.withVariables.push(withVariable);

    };
}