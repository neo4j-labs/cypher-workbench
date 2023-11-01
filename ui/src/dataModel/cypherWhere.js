
export const whereItem = (whereItemOrLeftHandSide, operator, rightHandSide, associatedObjectKey) => {
    if (whereItemOrLeftHandSide instanceof SimpleWhereItem) {
        return whereItemOrLeftHandSide;
    } else {
        return new SimpleWhereItem()
            .left(whereItemOrLeftHandSide)
            .op(operator)
            .right(rightHandSide)
            .setAssociatedObjectKey(associatedObjectKey);
    } 
}

export const whereToken = (whereTokenOrString) => {
    if (whereTokenOrString instanceof SimpleWhereToken) {
        return whereTokenOrString;
    } else {
        return new SimpleWhereToken().setToken(whereTokenOrString);
    } 
}

const DEBUG_TOKENS_TO_SKIP = ['and','or','xor','not'];

const SPACES = {
    ADD_LEFT_AND_RIGHT: ['//','and','or','xor'],
    ADD_RIGHT: ['not']
}

export class SimpleWhereToken {

    constructor (properties) {
        properties = properties || {};
        var { key, token } = properties;

        this.key = key;
        this.type = 'SimpleWhereToken';
        this.token = token;
    }

    setKey = (key) => {
        this.key = key;
        return this;
    }

    setToken = (token) => {
        this.token = token;
        return this;
    }

    toCypherString = () => {
        if (this.token) {
            const lToken = this.token.toLowerCase();
            if (SPACES.ADD_LEFT_AND_RIGHT.includes(lToken)) {
                return ` ${this.token} `;
            } else if (SPACES.ADD_RIGHT.includes(lToken)) {
                return `${this.token} `;
            } else {
                return this.token;
            }
        } else {
            return '';
        }
    }
}

export class SimpleWhereItem {
    constructor (properties) {
        properties = properties || {};
        var { key, leftHandSide, operator, rightHandSide, associatedObjectKey } = properties;

        this.key = key;
        this.type = 'SimpleWhereItem';
        this.leftHandSide = leftHandSide;
        this.operator = operator;
        this.rightHandSide = rightHandSide;

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

    left = (leftHandSide) => {
        this.leftHandSide = leftHandSide;
        return this;
    }

    op = (operator) => {
        this.operator = operator;
        return this;
    }

    right = (rightHandSide) => {
        this.rightHandSide = rightHandSide;
        return this;
    }

    renameVariable = (oldValue, newValue, associatedObjectKey) => {
        if (this.leftHandSide && this.leftHandSide.split) {
            var tokens = this.leftHandSide.split('.');
            var associatedObjectKeyMatch = (associatedObjectKey && this.associatedObjectKey) 
                                    ? (this.associatedObjectKey === associatedObjectKey) : true;
            if ((tokens.length >= 1) && (tokens[0] === oldValue) && associatedObjectKeyMatch) {
                this.leftHandSide = [newValue].concat(tokens.slice(1)).join('.');
            }
        }
    }

    toCypherString = () => {
        var str = '';

        str = (this.leftHandSide) 
            ? (this.leftHandSide.toCypherString) 
                ? str + this.leftHandSide.toCypherString() 
                : str + this.leftHandSide
            : str;

        str = (this.operator && this.leftHandSide) ? str + ' ' : str;            
        str = (this.operator) ? str + this.operator : str;
        str = (this.operator && this.rightHandSide) ? str + ' ' : str;

        str = (this.rightHandSide) 
            ? (this.rightHandSide.toCypherString) 
                ? str + this.rightHandSide.toCypherString() 
                : str + this.rightHandSide 
            : str;

        return str;
    }
}

export class WhereClause {
    constructor (properties) {
        properties = properties || {};
        var { whereItems } = properties;

        this.whereItems = (whereItems) ? whereItems : [];
        this.usedKeys = [];
        this.handleKeys();
    }

    getNewKey = () => {
        var keyPrefix = 'whereItem_';
        for (var i = 0; i < 50000; i++) {
            var key = `${keyPrefix}${i}`
            if (!this.usedKeys.includes(key)) {
                return key;
            }
        }
        return 'maxKey';
    }

    handleKeys = () => this.whereItems.map(x => this.handleKey(x));

    handleKey = (whereItem) => {
        if (!whereItem.key) {
            whereItem.key = this.getNewKey();
        }
        if (!this.usedKeys.includes(whereItem.key)) {
            this.usedKeys.push(whereItem.key)
        }
    }

    removeKey = (whereItem) => {
        var index = this.usedKeys.indexOf(whereItem.key);
        if (index !== -1) {
            this.usedKeys.splice(index,1);
        }
    }

    item = (whereItemOrLeftHandSide, operator, rightHandSide) => {
        const anItem = whereItem(whereItemOrLeftHandSide, operator, rightHandSide);
        this.handleKey(anItem);
        this.whereItems.push(anItem);
        return this;
    }

    token = (tokenString) => {
        const token = new SimpleWhereToken({token: tokenString});
        this.handleKey(token);
        this.whereItems.push(token);
        return this;
    }

    renameVariable = (oldValue, newValue, associatedObjectKey) => {
        this.whereItems
            .filter(x => x instanceof SimpleWhereItem)
            .map(x => x.renameVariable(oldValue, newValue, associatedObjectKey));
    }

    addWhereItem = (whereItem) => {
        this.handleKey(whereItem);
        this.whereItems.push(whereItem);
    }

    setWhereItems = (whereItems) => {
        this.whereItems = whereItems;
    }

    removeWhereItem = (whereItem) => {
        var index = this.whereItems.indexOf(whereItem);
        if (index !== -1) {
            this.removeKey(whereItem);
            this.whereItems.splice(index,1);
        }
    }   

    removeAssociatedWhereItems = (associatedObjectKey) => {
        this.whereItems
            .filter(x => x.associatedObjectKey === associatedObjectKey)
            .map(x => this.removeWhereItem(x));
    }
    
    getWhereItems = () => this.whereItems.slice();

    toCypherString = (whereItems) => {
        whereItems = (whereItems) ? whereItems : this.whereItems;
        var str = '';
        if (whereItems && whereItems.length > 0) {
            str += whereItems.map(item => item.toCypherString()).join('');
        }
        return `WHERE ${str}`;
    }

    getDebugCypherSnippets = () => {
        var snippets = [];

        for (var i = 1; i <= this.whereItems.length; i++) {
            var newSnippets = [];

            var currentWhereItem = this.whereItems[i-1];
            if (currentWhereItem instanceof SimpleWhereToken && DEBUG_TOKENS_TO_SKIP.includes(currentWhereItem.token.toLowerCase())) {
                // skip it
                continue;                
            }

            newSnippets = newSnippets.concat(this.whereItems.slice(0,i));
            if (i < this.whereItems.length) {
                newSnippets.push(whereToken('//'));
                newSnippets = newSnippets.concat(this.whereItems.slice(i));
            }
            const cypherSnippet = this.toCypherString(newSnippets);
            snippets.push(cypherSnippet);
        }

        return snippets;
    }
    
    fromSaveObject = (jsonObject) => {
        this.whereItems = [];
        this.usedKeys = [];
        jsonObject.whereItems.map(whereItem => {
            if (whereItem.type === 'SimpleWhereToken') {
                var token = new SimpleWhereToken(whereItem);
                this.addWhereItem(token);
            } else if (whereItem.type === 'SimpleWhereItem') {
                var simpleWhereItem = new SimpleWhereItem(whereItem);
                this.addWhereItem(simpleWhereItem);
            }
        })
    }

    toSaveObject = () => {
        var obj = {
            whereItems: this.whereItems
        }
        return obj;
    }
}