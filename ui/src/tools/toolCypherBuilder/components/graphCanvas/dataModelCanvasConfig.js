
import { DEFAULT_CONSTANTS } from '../../../../components/canvas/d3/canvasConfigDefaultConstants';

export const RELATIONSHIP_DISPLAY = {
    NORMAL: 'normal',
    MEDIUM: 'medium',
    LIGHT: 'light'
}

export class DataModelCanvasConfig {

    constructor (properties) {
        properties = (properties) ? properties : {};
        var {
            dataProvider,
            containerCallback
        } = properties

        this.dataProvider = dataProvider;
        this.containerCallback = containerCallback;

        // set when graphCanvas is initialized
        this.graphCanvas = undefined;
        this.selectionHelper = undefined;
        this.relationshipRibbon = undefined;

        this.canvasConstants = { 
            ...DEFAULT_CONSTANTS,
            DEFAULT_RELATIONSHIP_DISPLAY: RELATIONSHIP_DISPLAY.NORMAL
        };
    }

    setDataProvider = (dataProvider) => this.dataProvider = dataProvider;

    getConstants = () => this.canvasConstants;
    getContainerCallback = () => this.containerCallback;

    setGraphCanvas (graphCanvas) {
        this.graphCanvas = graphCanvas;
        this.selectionHelper = graphCanvas.getSelectionHelper();
        this.relationshipRibbon = graphCanvas.getRelationshipRibbon();
    }

    getRibbonDefinitions = (connectsToSelf) => ({});
    getArcDefinitions = () => ({});

    handleEdit () {
        if (this.graphCanvas.getUserRole().canEditShowMessage()) {
            //handleEdit(this);
            //alert('TODO: fix handle edit');
        }
    }

    deleteSelectedItems = () => null;

    getRelationshipDisplaySettings (relationshipDisplay) {
        var settings = {};
        switch (relationshipDisplay) {
            case RELATIONSHIP_DISPLAY.MEDIUM:
                settings = { color: 'gray', strokeWidth: '2' }
                break;
            case RELATIONSHIP_DISPLAY.LIGHT:
                settings = { color: 'lightgray', strokeWidth: '1' }
                break;
            case RELATIONSHIP_DISPLAY.NORMAL:
            default:
                settings = { color: 'black', strokeWidth: '3' }
                break;
        }
        return settings;
    }
}

