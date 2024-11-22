import SnippetSet from "./cypherSnippetSet";

export const ORDER_DIRECTION = {
    ASC: 'ASC',
    DESC: 'DESC'
}

export const KEY_PREFIXES = {
    ORDER_BY_ITEM: 'orderByItem_'
}

export const orderByItem = (orderByItemOrExpr, orderDirection, associatedObjectKey) => {
    if (orderByItemOrExpr instanceof SimpleOrderByItem) {
        return orderByItemOrExpr;
    } else {
        return new SimpleOrderByItem()
            .expr(orderByItemOrExpr)
            .dir(orderDirection)
            .setAssociatedObjectKey(associatedObjectKey);
    }
}

export class SimpleOrderByItem {
    constructor (properties) {
        properties = properties || {};
        var { key, expression, orderDirection, associatedObjectKey } = properties;

        this.key = key;
        this.expression = expression;
        this.orderDirection = orderDirection;

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

    expr = (expression) => {
        this.expression = expression;
        return this;
    }

    dir = (orderDirection) => {
        this.orderDirection = orderDirection;
        return this;
    }

    getOrderDirection = () => (this.orderDirection) ? this.orderDirection : ORDER_DIRECTION.ASC;
    setOrderDirection = (orderDirection) => this.orderDirection = orderDirection;

    getVariableIfExists = () => {
        // simple parse for now, in future we can do a deeper parse of the expression
        if (this.expression) {
            var tokens = this.expression.split('.');
            if (tokens.length >= 2) {
                return tokens[0];   // assumption is first token is a variable, like n1.prop
            }
        }
        return null;
    }

    setVariableIfExists = (newName) => {
        if (this.expression) {
            var tokens = this.expression.split('.');
            if (tokens.length >= 2) {
                // assumption is first token is a variable, like n1.prop
                tokens[0] = newName;
                this.expression = tokens.join('.');
            }
        }
    }

    toCypherString = () => {
        var str = '';
        if (this.expression) {
            str += this.expression;
        }
        if (str && this.orderDirection && this.orderDirection === ORDER_DIRECTION.DESC) {
            str += ' DESC';
        }
        
        return str;
    }
}

export class OrderByClause {
    constructor (properties) {
        properties = properties || {};
        var { orderByItems } = properties;

        this.orderByItems = (orderByItems) ? orderByItems : [];

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
        this.orderByItems.map(x => this.handleOrderByItemKey(x));
    }

    handleOrderByItemKey = (orderByItem) => {
        if (!orderByItem.key) {
            orderByItem.key = this.getNewKey(KEY_PREFIXES.ORDER_BY_ITEM);
        }
        if (!this.usedKeys.includes(orderByItem.key)) {
            this.usedKeys.push(orderByItem.key)
        }
    }

    removeKey = (returnItem) => {
        var index = this.usedKeys.indexOf(returnItem.key);
        if (index !== -1) {
            this.usedKeys.splice(index,1);
        }
    }

    orderBy = (orderByItemOrExpr, orderDirection, associatedObjectKey) => {
        const anItem = orderByItem(orderByItemOrExpr, orderDirection, associatedObjectKey);
        this.handleOrderByItemKey(anItem);
        this.orderByItems.push(anItem);
        return this;
    }

    renameVariable = (oldName, newName, associatedObjectKey) => {
        this.orderByItems
            .filter(item => {
                var associatedObjectKeyMatch = (associatedObjectKey && item.associatedObjectKey) 
                                        ? (item.associatedObjectKey === associatedObjectKey) : true;
                var variable = item.getVariableIfExists();
                return (variable && variable === oldName) && associatedObjectKeyMatch;
            })
            .map(item => item.setVariableIfExists(newName));
    }

    addOrderByItem = (orderByItem) => {
        this.handleOrderByItemKey(orderByItem);
        this.orderByItems.push(orderByItem);
    }

    orderByItemExists = (orderByItem, ignoreItem) => {
        var itemsToSearch = this.orderByItems;
        if (ignoreItem) {
            itemsToSearch = itemsToSearch.filter(item => item !== ignoreItem);
        }
        var result = itemsToSearch.find(x => x.toCypherString() === orderByItem.toCypherString());
        return (result) ? true : false;
    }

    setOrderByItems = (orderByItems) => {
        this.orderByItems = orderByItems;
    }

    removeOrderByItem = (orderByItem) => {
        var index = this.orderByItems.indexOf(orderByItem);
        if (index !== -1) {
            this.removeKey(orderByItem);
            this.orderByItems.splice(index,1);
        }
    }   

    removeAssociatedItems = (associatedObjectKey) => {
        this.orderByItems
            .filter(x => x.associatedObjectKey === associatedObjectKey)
            .map(x => this.removeOrderByItem(x));
    }
    
    getOrderByItems = () => this.orderByItems.slice();

    toCypherString = (orderByItems) => {
        orderByItems = (orderByItems) ? orderByItems : this.orderByItems;
        var str = '';
        if (orderByItems && orderByItems.length > 0) {
            str += orderByItems
                .map((item, index) => {
                    const itemText = item.toCypherString();
                    const isComment = (itemText.trim()) === '//';
                    return (index === 0 || isComment) ? itemText : `, ${itemText}`;
                })
                .join('');
        }
        return `ORDER BY ${str}`;
    }

    getDebugCypherSnippetSet = (config = {}) => {
        let snippetSet = new SnippetSet({
            id: 'orderBy',
            opener: (config.skipReturn) ? '' : 'ORDER BY ',
            associatedCypherObject: this
        });

        if (this.orderByItems && this.orderByItems.length > 0) {
            let snippetStrs = this.orderByItems.map((x,i) => {
                let comma = (i > 0) ? ', ' : ''
                return `${comma}${x.toCypherString()}`;
            });
            snippetSet.addOneOrMoreSnippets(snippetStrs);
        } 

        snippetSet.cypherSnippet = snippetSet.computeCypherSnippet();
        return snippetSet;
    }

    getDebugCypherSnippets = (config = {}) => {
        let snippetSet = this.getDebugCypherSnippetSet(config);
        let snippets = snippetSet.getSnippets();
        return snippets;
    }
    
    fromSaveObject = (jsonObject) => {
        this.orderByItems = [];
        this.usedKeys = [];
        var orderByItems = (jsonObject.orderByItems) ? jsonObject.orderByItems : [];

        orderByItems.map(orderByItem => {
            var simpleOrderByItem = new SimpleOrderByItem(orderByItem);
            this.addOrderByItem(simpleOrderByItem);
        });

    }

    toSaveObject = () => {
        var obj = {
            orderByItems: this.orderByItems
        }
        return obj;
    }
}