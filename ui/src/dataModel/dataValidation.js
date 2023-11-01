
export const ERROR_MESSAGES = {
    NODE_LABEL_TEXT_CANNOT_BE_EMPTY: "Node Label text cannot not be empty.",
    ITEM_CANNOT_CONTAIN_COLON: "Item cannot contain a colon.",
    NODE_LABEL_MUST_BE_UNIQUE: "Node Labels must be unique. That label is already taken.",
    SECONDARY_NODE_LABEL_MUST_BE_UNIQUE: "Used by a secondary node label on $nodeLabel. To add it, use Model Input.",
    RELATIONSHIP_LABEL_CANNOT_HAVE_PIPE: "Relationship Type text cannot contain the '|' symbol."
}

export function validateText (propertyContainer, dataModel, newText) {
    if (propertyContainer.classType == "NodeLabel") {
        if (!newText) {
            alert(ERROR_MESSAGES.NODE_LABEL_TEXT_CANNOT_BE_EMPTY);
            return false;
        } else {
            /*
            var labelObj = dataModel.processLabel(newText);
            var existingNodeLabel = dataModel.getNodeLabelByLabel(labelObj.primaryNodeLabelString);
            if (existingNodeLabel) {
                if (existingNodeLabel.isOnlySecondaryNodeLabel) {
                    var usedBy = dataModel.getNodeLabelArray().find(x => 
                        x.secondaryNodeLabelKeys.includes(existingNodeLabel.key));
    
                    var message = ERROR_MESSAGES.SECONDARY_NODE_LABEL_MUST_BE_UNIQUE;
                    var nodeLabelText = (usedBy) ? usedBy.getTextWithSecondaryNodeLabels() : 'Unknown'
                    message = message.replace(/\$nodeLabel/, nodeLabelText);
                    alert(message);
                    return false;
                } else {
                    alert(ERROR_MESSAGES.NODE_LABEL_MUST_BE_UNIQUE);
                    return false;
                }
            }
            */
        }
    } else if (propertyContainer.classType == "RelationshipType" && newText.match(/\|/)) {
        alert(ERROR_MESSAGES.RELATIONSHIP_LABEL_CANNOT_HAVE_PIPE)
        return false;
    }
    return true;
}