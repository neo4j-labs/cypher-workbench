
export default class DataSourceTableBlock {
    constructor (properties) {
        properties = properties || {};

        var {
            key,
            title,
            expanded, 
            selected,
            showToggleTool,
            scrollIntoView,
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
        this.ref = ref;
        this.blockElement = blockElement;
        this.graphNode = graphNode;
        this.dataProvider = dataProvider;
    }

    getWorkStatus = () => (this.dataProvider && this.dataProvider.getWorkStatus) 
        ? this.dataProvider.getWorkStatus() : null;
        
    getWorkMessage = () => (this.dataProvider && this.dataProvider.getWorkMessage)
        ? this.dataProvider.getWorkMessage() : null;
}
