import SnippetSet from "./cypherSnippetSet";

export const KEY_PREFIXES = {
    RETURN_ITEM: 'returnItem_',
}

export const returnItem = (returnItemOrVar, propExr, alias, associatedObjectKey) => {
    if (returnItemOrVar instanceof SimpleReturnItem) {
        return returnItemOrVar;
    } else {
        return new SimpleReturnItem()
            .var(returnItemOrVar)
            .propExpr(propExr)
            .setAlias(alias)
            .setAssociatedObjectKey(associatedObjectKey);
    }
}

export const parseReturnItemText = (text) => {
    var variable = null;
    var propExpr = null;
    var alias = null;

    propExpr = text;
    var match = text.match(/^(.+) +as +(.+)$/i);
    if (match) {
        propExpr = match[1];
        alias = match[2];
    } 
    match = propExpr.match(/^(\w+)\.(\w+)$/);
    if (match) {
        variable = match[1];
        propExpr = match[2];
    } else {
        match = propExpr.match(/^(\w+)$/);
        if (match) {
            variable = match[1];
            propExpr = null;
        }
    }

    return {
        key: null,
        variable: variable,
        propertyExpression: propExpr,
        alias: alias
    }
}

export class SimpleReturnItem {
    constructor (properties) {
        properties = properties || {};
        var { key, 
            variable, propertyExpression, 
            alias, associatedObjectKey,
            isAsterisk
        } = properties;

        this.key = key;
        this.variable = variable;
        this.propertyExpression = propertyExpression;
        this.alias = alias;
        this.isAsterisk = isAsterisk;

        this.associatedObjectKey = associatedObjectKey;
    }

    setKey = (key) => {
        this.key = key;
        return this;
    }

    setAssociatedObjectKey = (key) => {
        this.associatedObjectKey = key;
        return this;
    }

    var = (variable) => {
        this.variable = variable;
        return this;
    }

    propExpr = (propertyExpression) => {
        this.propertyExpression = propertyExpression;
        return this;
    }

    setAlias = (alias) => {
        this.alias = alias;
        return this;
    }

    getResultHeader = () => {
        if (this.alias) {
            return this.alias;
        } else {
            var str = '';
            if (this.variable) {
                str += this.variable;
            }
            if (this.propertyExpression) {
                if (this.variable) {
                    str += '.';
                }
                str += this.propertyExpression;
            }
            return str;
        }
    }

    getExpressionAsString = () => {
        var str = '';
        if (this.isAsterisk) {
            str = '*';
        }
        if (this.variable) {
            str += this.variable;
        }
        if (this.propertyExpression) {
            if (this.variable) {
                str += '.';
            }
            str += this.propertyExpression;
        }
        return str;
    }

    toCypherString = () => {
        var str = this.getExpressionAsString();
        if (str && this.alias) {
            str += ` as ${this.alias}`
        }
        return str;
    }
}

export class ReturnClause {
    constructor (properties) {
        properties = properties || {};
        var { returnItems } = properties;

        this.returnItems = (returnItems) ? returnItems : [];

        this.usedKeys = [];
        this.handleKeys();
    }

    getNewKey = (keyPrefix) => {
        for (var i = 0; i < 50000; i++) {
            var key = `${keyPrefix}${i}`
            if (!this.usedKeys.includes(key)) {
                return key;
            }
        }
        return 'maxKey';
    }

    handleKeys = () => {
        this.returnItems.map(x => this.handleReturnItemKey(x));
    }

    handleReturnItemKey = (returnItem) => {
        if (!returnItem.key) {
            returnItem.key = this.getNewKey(KEY_PREFIXES.RETURN_ITEM);
        }
        if (!this.usedKeys.includes(returnItem.key)) {
            this.usedKeys.push(returnItem.key)
        }
    }

    removeKey = (returnItem) => {
        var index = this.usedKeys.indexOf(returnItem.key);
        if (index !== -1) {
            this.usedKeys.splice(index,1);
        }
    }

    item = (returnItemOrVar, propExr, alias, associatedObjectKey) => {
        const anItem = returnItem(returnItemOrVar, propExr, alias, associatedObjectKey)
        this.handleReturnItemKey(anItem);
        this.returnItems.push(anItem);
        return this;
    }

    renameVariable = (oldName, newName, associatedObjectKey) => {
        this.returnItems
            .filter(item => {
                // if both exist, they must match, if one of them doesn't exist, return true
                var associatedObjectKeyMatch = (associatedObjectKey && item.associatedObjectKey) 
                                        ? (item.associatedObjectKey === associatedObjectKey) : true;
                return (item.variable === oldName) && associatedObjectKeyMatch;
            })
            .map(item => item.variable = newName);
    }

    addReturnItem = (returnItem) => {
        this.handleReturnItemKey(returnItem);
        this.returnItems.push(returnItem);
    }

    returnItemExists = (returnItem, ignoreItem) => {
        var itemsToSearch = this.returnItems;
        if (ignoreItem) {
            itemsToSearch = itemsToSearch.filter(item => item !== ignoreItem);
        }
        var result = itemsToSearch.find(x => x.toCypherString() === returnItem.toCypherString());
        return (result) ? true : false;
    }

    setReturnItems = (returnItems) => {
        this.returnItems = returnItems;
    }

    removeReturnItem = (returnItem) => {
        var index = this.returnItems.indexOf(returnItem);
        if (index !== -1) {
            this.removeKey(returnItem);
            this.returnItems.splice(index,1);
        }
    }   

    removeAssociatedItems = (associatedObjectKey) => {
        this.returnItems
            .filter(x => x.associatedObjectKey === associatedObjectKey)
            .map(x => this.removeReturnItem(x));
    }
    
    getReturnItems = () => this.returnItems.slice();

    toCypherString = (returnItems) => {
        returnItems = (returnItems) ? returnItems : this.returnItems;
        var str = '';
        if (returnItems && returnItems.length > 0) {
            str += returnItems
                .map((item, index) => {
                    const itemText = item.toCypherString();
                    const isComment = (itemText.trim()) === '//';
                    return (index === 0 || isComment) ? itemText : `, ${itemText}`;
                })
                .join('');
        } else {
            str += '*';
        }
        return `RETURN ${str}`;
    }

    getDebugCypherSnippetSet = (config = {}) => {
        let snippetSet = new SnippetSet({
            id: 'return',
            opener: (config.skipReturn) ? '' : 'RETURN ',
            associatedCypherObject: this
        });

        if (this.returnItems && this.returnItems.length > 0) {
            let snippetStrs = this.returnItems.map((x,i) => {
                let comma = (i > 0) ? ', ' : ''
                return `${comma}${x.toCypherString()}`;
            });
            snippetSet.addOneOrMoreSnippets(snippetStrs);
        } 

        snippetSet.cypherSnippet = snippetSet.computeCypherSnippet();
        return snippetSet;
    }

    getDebugCypherSnippets = (config) => {
        let snippetSet = this.getDebugCypherSnippetSet(config);
        let snippets = snippetSet.getSnippets();
        return snippets;
    }

    fromSaveObject = (jsonObject) => {
        this.returnItems = [];
        this.usedKeys = [];
        var returnItems = (jsonObject.returnItems) ? jsonObject.returnItems : [];

        returnItems.map(returnItem => {
            var simpleReturnItem = new SimpleReturnItem(returnItem);
            this.addReturnItem(simpleReturnItem);
        });
    }

    toSaveObject = () => {
        var obj = {
            returnItems: this.returnItems
        }
        return obj;
    }
}