
export const GraphChangeType = {
    AddOrUpdateNode: "AddOrUpdateNode",
    AddOrUpdateRelationship: "AddOrUpdateRelationship",
    AddOrUpdateProperty: "AddOrUpdateProperty",
    RemoveNode: "RemoveNode",
    RemoveRelationship: "RemoveRelationship",
    RemoveProperty: "RemoveProperty"
}

export const GraphViewChangeType = {
    AddOrUpdateNode: "AddOrUpdateNode",
    AddOrUpdateRelationship: "AddOrUpdateRelationship",
    RemoveNode: "RemoveNode",
    RemoveRelationship: "RemoveRelationship",
    NodeDisplayUpdate: "NodeDisplayUpdate",
    CanvasTransformUpdate: "CanvasTransformUpdate"
}

export const GraphDocChangeType = {
    PanelResize: "GraphDocPanelResize",
    PanelOpen: "GraphDocPanelOpen",
    PanelClose: "GraphDocPanelClose",
    ActiveTabChanged: "ActiveTabChanged",
    ExportSettingsChanged: "ExportSettingsChanged"
};

export const NodeLabels = {
    GraphView: "GraphView",
    GraphDoc: "GraphDoc"
}

export const RelationshipTypes = {
    DEFAULT_GRAPH_VIEW_FOR: "DEFAULT_GRAPH_VIEW_FOR",
    GRAPH_VIEW_FOR: "GRAPH_VIEW_FOR"
}

export const MINI_GRAPH_DOC_SUBGRAPH_MODEL = { 
    primaryNodeLabel: NodeLabels.GraphDoc, 
    keyConfig: [
        {nodeLabel: NodeLabels.GraphDoc, propertyKeys: ["key"]}
    ] 
} 