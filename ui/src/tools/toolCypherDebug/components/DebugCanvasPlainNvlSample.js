import React, { Component } from 'react';
import { NVL } from '@neo4j-nvl/base'
import { 
  DragNodeInteraction,
  PanInteraction,
  ZoomInteraction
} from '@neo4j-nvl/interaction-handlers'

export const nvlOptions = {
    renderer: 'canvas',
    layout: 'forceDirected',
    allowDynamicMinZoom: true,
    maxZoom: 10,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    useWebGL: false,
    initialZoom: 3,    
};

export const mouseEventCallbacks = {
    onPan: true,
    onZoom: true,
    onDrag: true,
};

export const BloomColors = {
  yellow: "#FFE081",
  mauve: "#C990C0",
  orange: "#F79767",
  lightBlue: "#57C7E3",
  red: "#F16667",
  tan: "#D9C8AE",
  lightGreen: "#8DCC93",
  pink: "#ECB5C9",
  blue: "#4C8EDA",
  peach: "#FFC454",
  darkPink: "#DA7194",
  green: "#569480",
  grey: "#848484",
  lightGrey: "#D9D9D9"
}

const defaultColor = BloomColors.lightBlue;
const defaultSize = 20;

export default class DebugCanvasPlainNvlSample extends Component {

  state = {
    nvl: null,
    nodes: [
      { id: "1", size: defaultSize, color: defaultColor, captions: [{value: "1"}] },
      { id: "2", size: defaultSize, color: defaultColor, captions: [{value: "2"}] }
    ],
    rels: [
      { id: "10000", from: "1", to: "2", color: defaultColor, captions: [{value: "1"}] }
    ],
    lastNodeId: 2,
    nextNodeId: 3,
    nextRelId: 10001
  }

  componentDidMount() {
    const { nodes, rels } = this.state;
    const nvl = new NVL(document.getElementById('nvlContainer'), nodes, rels, nvlOptions)

    this.setState({ nvl: nvl })

    const dragNodeInteraction = new DragNodeInteraction(nvl)

    dragNodeInteraction.updateCallback('onDrag', (nodes) => {
      //console.log('Dragged nodes:', nodes)
    });

    const panInteraction = new PanInteraction(nvl)

    panInteraction.updateCallback('onPan', (panning) => {
      //console.log('Panning:', panning)
    })    

    const zoomInteraction = new ZoomInteraction(nvl)

    zoomInteraction.updateCallback('onZoom', (zoomLevel) => {
      // console.log('Zoom level:', zoomLevel)
    })    
  }

  setNodes = (nodes) => this.setState({ nodes: nodes })
  setRelationships = (rels) => this.setState({ rels: rels });
  setLastNodeId = (lastNodeId) => this.setState({ lastNodeId: lastNodeId });
  setNextNodeId = (nextNodeId) => this.setState({ nextNodeId: nextNodeId });
  setNextRelId = (nextRelId) => this.setState({ nextRelId: nextRelId });

  addNodeAndRel = (newColor, newSize, revertToDefaultMillis) => {

    const {
      lastNodeId, nextNodeId, nextRelId, nvl
    } = this.state;

    const newNodeId = `${nextNodeId}`;
    //const newNodeId = nextNodeId;
    const newNodes = [{ id: newNodeId, 
      size: (newSize !== undefined) ? newSize : defaultSize, 
      color: (newColor !== undefined) ? newColor : defaultColor,
      captions: [{value: `${nextNodeId}`}]
    }];
    const newRels = [{ 
      id: `${nextRelId}`, 
      from: `${lastNodeId}`, 
      to: `${nextNodeId}`,
      color: defaultColor,
      captions: [{value: `${nextRelId}`}] 
    }];

    console.log('adding: ', newNodeId)
    nvl.addAndUpdateElementsInGraph(newNodes, newRels);
    //nvl.setLayout('forceDirected')
      nvl.fit(
        nvl.getNodes().map((node) => node.id),
        {}
      );

    if (revertToDefaultMillis) {
        setTimeout(() => {
            console.log('changing color of: ', newNodeId)
            nvl.addAndUpdateElementsInGraph([
              { id: newNodeId, color: defaultColor, size: defaultSize }
            ])          
        }, revertToDefaultMillis)
    }

    this.setLastNodeId(lastNodeId+1)
    this.setNextNodeId(nextNodeId+1)
    this.setNextRelId(nextRelId+1)
  }

  render () {

    return (
      <>
          <div style={{display:'flex', flexFlow: 'row', border: '1px solid lightgrey'}}>
              <button onClick={() => this.addNodeAndRel()}>Add node and rel</button>    
              <button onClick={() => this.addNodeAndRel(BloomColors.lightGreen, 40, 2000)}>Add large green node </button>    
          </div>
          <div id='nvlContainer' className='flex' style={{ 
            width: 'calc(100vw - 75px)', 
            height: 'calc(100vh - 165px)', 
            border: '1px solid lightgrey' 
          }}>
          </div>
      </>

    );
  }
};
