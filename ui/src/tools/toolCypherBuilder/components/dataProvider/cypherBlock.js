
export default class CypherBlock {
    constructor (properties) {
        properties = properties || {};

        var {
            key,
            title,
            expanded, 
            selected,
            showToggleTool,
            scrollIntoView,
            keyword,
            ref,
            blockElement,
            graphNode,
            dataProvider
        } = properties;

        this.key = key;
        this.title = title;
        this.expanded = (expanded) ? true : false;
        this.selected = (selected) ? true : false;
        this.showToggleTool = (showToggleTool) ? true : false;
        this.scrollIntoView = (scrollIntoView) ? true : false;
        this.keyword = keyword;
        this.ref = ref;
        this.blockElement = blockElement;
        this.graphNode = graphNode;
        this.dataProvider = dataProvider;
    }

    getCypher = () => {
        if (this.dataProvider && this.dataProvider.getCypher) {
            return this.dataProvider.getCypher();
        } else {
            return `// TODO: getCypher for block ${this.title}`;
        }
    }

    getDebugCypherSnippets = () => {
        if (this.dataProvider && this.dataProvider.getDebugCypherSnippets) {
            return this.dataProvider.getDebugCypherSnippets();
        } else {
            return null;
        }
    }

    isWith = () => {
        if (this.dataProvider && this.dataProvider.getCypherKeyword) {
            if (this.dataProvider.getCypherKeyword() === 'WITH') {
                return true;
            }
        } 
        return false;
    }
}
