import React from 'react';
import chroma from 'chroma-js';

export function NodeCapsule (props) {

    var { nodeLabel, count, color, bold, maxWidth,
        extraBottomMargin, extraLeftMargin, 
        selected, setSelectedNodeLabelString,
        sidePanelOpen, setSidePanelOpen
    } = props;

    color = color ? color : 'cornflowerblue';

    nodeLabel = (nodeLabel) ? nodeLabel : 'Nodes';

    let displayText = (count !== undefined) ? 
        `${nodeLabel} (${count.toLocaleString()})` : nodeLabel

    let fontColor = 'black';        
    var luminance = chroma(color).luminance();
    if (luminance <= 0.45) {
        fontColor = 'white';
    }

    let border = (selected) ? { border: '3px solid yellow' } : {}
    
    let extraStyle = (maxWidth) ? { maxWidth } : {}

    return (
        <div title={displayText}
            onClick={(event) => {
                if (setSelectedNodeLabelString) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (selected) {
                        setSelectedNodeLabelString(null);
                        if (sidePanelOpen) {
                            setSidePanelOpen(false); 
                        }
                    } else {
                        setSelectedNodeLabelString(nodeLabel);
                        if (!sidePanelOpen) {
                            setSidePanelOpen(true);
                        }
                    }
                }
            }}
            style={{ 
                display: 'inline-block',
                backgroundColor: color,
                padding: '10px',
                paddingTop: '2px',
                paddingBottom: '2px',
                marginBottom: (extraBottomMargin) ? extraBottomMargin : '0px',
                marginLeft: (extraLeftMargin) ? extraLeftMargin : '0px',
                color: fontColor,
                borderRadius: '15px',
                wordWrap: 'break-word',
                ...border,
                ...extraStyle,
                textAlign: 'center',
                fontWeight: (bold) ? 'bold' : 'normal'
            }}>
            <span>{displayText}</span>
        </div>        
    )
}

export function RelCapsule (props) {

    var { relType, bold, count, color, bold, 
        selected, maxWidth,
        marginTop, extraBottomMargin, extraLeftMargin,
        setSelectedRelationshipTypeString,
        sidePanelOpen, setSidePanelOpen
    } = props;

    color = color ? color : 'lightslategrey';

    relType = (relType) ? relType : 'Rels';

    let border = (selected) ? { border: '3px solid yellow' } : {}

    let extraStyle = (maxWidth) ? { maxWidth } : {}

    let displayText = (count !== undefined) ? 
        `${relType} (${count.toLocaleString()})` : relType

    let fontColor = 'black';        
    var luminance = chroma(color).luminance();
    if (luminance <= 0.45) {
        fontColor = 'white';
    }

    return (
        <div title={displayText} onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof(setSelectedRelationshipTypeString) === 'function') {
                if (selected) {
                    setSelectedRelationshipTypeString(null);
                    if (sidePanelOpen) {
                        setSidePanelOpen(false); 
                    }
                } else {
                    setSelectedRelationshipTypeString(relType);
                    if (!sidePanelOpen) {
                        setSidePanelOpen(true);
                    }
                }
            }
        }}
            style={{ 
                display: 'inline-block',
                backgroundColor: color,
                padding: '10px',
                paddingTop: '2px',
                paddingBottom: '2px',
                marginBottom: (extraBottomMargin) ? extraBottomMargin : '0px',
                marginLeft: (extraLeftMargin) ? extraLeftMargin : '0px',
                color: fontColor,
                marginTop: (marginTop) ? marginTop : '5px',
                textAlign: 'center',
                fontWeight: (bold) ? 'bold' : 'normal',
                ...border,
                ...extraStyle
            }}>
            <span>{displayText}</span>
        </div>
    )
}

