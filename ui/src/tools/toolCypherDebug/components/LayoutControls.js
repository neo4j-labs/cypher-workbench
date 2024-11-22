import React, { useState } from 'react';

import { LayoutOptions } from './Constants';

export default function LayoutControls (props) {
    var { 
        style, zoomIn, zoomOut, resetPanAndZoom, fit, fitSelected,
        zoomLevel, forceLayout, hierarchicalLayout, currentLayout,
        isExplanationAvailable, explanation
     } = props;
    var radius = 30;

    style = {
        maxWidth: '460px',
        ...style
    }
    let [explainVisible, setExplainVisible] = useState(false);

    return (
        <div style={style} className={'noselect'}>
            <div style={{display: 'flex', flexFlow: 'row'}}>
                <div style={{flexGrow: 1}}></div>
                <div style={{
                    display: explainVisible ? 'inline-block' : 'none', 
                    background: '#FDF4E7',
                    marginBottom: '5px',
                    padding: '5px',
                    border: '1px solid burlywood',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    maxWidth: '450px',
                }}>
                    {isExplanationAvailable ? explanation : 'No active explanation'}
                </div>
            </div>
            <div>
                <div style={{width: '80px', display: 'inline-block', fontSize: '0.8em', marginRight: '.13em'}}>Zoom: {zoomLevel}%</div>
                <div onClick={() => zoomOut()} title="Zoom Out"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', padding: '.4em'}} className={'fa fa-search-minus'}/>
                </div>
                <div onClick={() => zoomIn()} title="Zoom In"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px', verticalAlign: 'middle',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span  style={{ verticalAlign: 'middle', padding: '.4em'}} className={'fa fa-search-plus'}/>
                </div>
                <div onClick={() => resetPanAndZoom()} title="Reset"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', padding: '.44em'}} className={'fa fa-crosshairs'}/>
                </div>
                <div onClick={() => fit()} title="Fit"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', padding: '.44em', paddingLeft: '.5em'}} className={'fa fa-grip-horizontal'}/>
                </div>
                <div onClick={() => fitSelected()} title="Fit Selected"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', padding: '.44em', 
                            paddingLeft: '.65em', clipPath: 'xywh(0px 0px 20px 30px)'
                    }} className={'fa fa-grip-horizontal'}/>
                </div>                        
                <div style={{width: '45px', display: 'inline-block', fontSize: '0.8em', marginLeft: '1em'}}>Layout: </div>
                <div onClick={() => forceLayout()} title="Force Layout"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        border: (currentLayout === LayoutOptions.ForceDirected) ? '1px solid orange' : 'none',
                        backgroundColor: '#DDD', borderRadius: '20%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', 
                        padding: '.3em', paddingTop: '.4em', paddingLeft: '.3em'
                    }} className={'fa fa-project-diagram'}/>
                </div>
                <div onClick={() => hierarchicalLayout()} title="Hierarchical Layout"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px',
                        border: (currentLayout === LayoutOptions.Hierarchical) ? '1px solid orange' : 'none',
                        backgroundColor: '#DDD', borderRadius: '20%', cursor: 'pointer'}}>
                    <span style={{ verticalAlign: 'middle', padding: '.3em', paddingTop: '.4em'}} className={'fa fa-sitemap'}/>
                </div> 
                <div style={{display: 'inline-block', fontSize: '0.8em', marginLeft: '5px', marginRight: '.13em'}}>Info: </div>
                <div onClick={() => setExplainVisible(!explainVisible)} title="Show Explanations"
                    style={{ height: radius + 'px', width: radius + 'px',
                        display: 'inline-block', margin: '3px', marginRight: '0px',
                        backgroundColor: '#DDD', borderRadius: '50%', cursor: 'pointer'}}>
                    <span 
                        style={{ verticalAlign: 'middle', padding: '.4em'}} 
                        className={'fa fa-comment-dots'}
                    />
                </div>
            </div>
        </div>
    );
}
