import React from 'react';

export default function ZoomControls (props) {
    var { style, zoomIn, zoomOut, resetPanAndZoom, zoomLevel } = props;
    var radius = 30;

    return (
        <div style={style} className={'noselect'}>
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
        </div>
    );
}
