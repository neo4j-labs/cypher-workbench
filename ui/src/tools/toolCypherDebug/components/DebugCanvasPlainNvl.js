import React, { Component } from 'react';
import { NVL } from '@neo4j-nvl/base'
import { 
  ClickInteraction,
  DragNodeInteraction,
  PanInteraction,
  ZoomInteraction
} from '@neo4j-nvl/interaction-handlers'
import { analyzeHeaders, isNode, isRelationship } from '../../toolCypherBuilder/components/results/ResultsTable';
import { getRecommendedLabel } from '../../../dataModel/propertyUtil/propertyAnalyzer';
import { BloomColors, LayoutOptions } from './Constants';
import LayoutControls from './LayoutControls';
import GraphSummaryAndConfig, { Stats } from './GraphSummaryAndConfig'
import { findObjectsContainingKeys } from '../../../dataModel/graphUtil';
import chroma from 'chroma-js';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import { rewriteIntegers } from '../database/databaseUtil';
import { Integer } from 'neo4j-driver';

export const nvlOptions = {
    renderer: 'canvas',
    //layout: LayoutOptions.ForceDirected,
    layout: LayoutOptions.Hierarchical,
    allowDynamicMinZoom: true,
    maxZoom: 10,
    minZoom: 0.05,
    relationshipThreshold: 0.55,
    // useWebGL: false,
    initialZoom: 2,    
};

export const mouseEventCallbacks = {
    onPan: true,
    onZoom: true,
    onDrag: true,
};

export const InitialPreferredPaletteOrder = [
  BloomColors.lightBlue,
  BloomColors.lightGreen,
  BloomColors.darkPink,
  BloomColors.orange,
  BloomColors.yellow,
  BloomColors.red,
  BloomColors.tan,
  BloomColors.lightGrey,
  BloomColors.blue,
  BloomColors.green,
  BloomColors.peach,
  BloomColors.mauve,
  BloomColors.pink,
  BloomColors.grey
];

export let PreferredPaletteOrder = InitialPreferredPaletteOrder.slice();

const augmentPalette = () => {
  let darkerColors = PreferredPaletteOrder.map(color => chroma(color).darken().hex());
  let lighterColors = PreferredPaletteOrder.map(color => chroma(color).brighten().hex());

  let allColors = PreferredPaletteOrder.concat(lighterColors).concat(darkerColors);

  let moreShades = allColors.map(color => chroma(color).mix('black', 0.25).hex());
  let moreTints = allColors.map(color => chroma(color).mix('white', 0.25).hex());

  PreferredPaletteOrder = allColors.concat(moreShades).concat(moreTints);
}
augmentPalette();

const DEFAULT_NODE_STYLE = {
  color: BloomColors.lightBlue,
  size: 20
}

const PLACEHOLDER_NODE_STYLE = {
  color: BloomColors.lightGrey,
  size: 10
}

const DEFAULT_REL_STYLE = {
  color: BloomColors.grey
}

const ZoomIncrement = 0.2;

export default class DebugCanvasPlainNvl extends Component {

  state = {
    nvl: null,
    currentLayout: nvlOptions.layout,
    zoomLevel: nvlOptions.initialZoom,
    currentPan: { x: 0, y: 0 },
    placeholderNodeIds: [],
    nodePaletteConfig: {},
    nodeLabelConfig: {},
    nodeConfigPriority: [],
    nodeLabelMap: {},
    relTypeMap: {},
    dataNodes: {},
    dataRels: {},
    highlightedNodeIds: [],
    canvasLeft: 800,
    canvasHeight: 500,
    // hidden until first layout
    graphSummaryAndConfigVisible: false,
    selectedNodes: [], 
    selectedRels: []
  }

  constructor (props) {
    super (props);

    this.graphSummaryRef = React.createRef();
  }

  /*
  {
    onCanvasClick?: ((event: MouseEvent) => void) | boolean;
    onCanvasDoubleClick?: ((event: MouseEvent) => void) | boolean;
    onCanvasRightClick?: ((event: MouseEvent) => void) | boolean;
    onNodeClick?: ((nodes: Node, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
    onNodeDoubleClick?: ((node: Node, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
    onNodeRightClick?: ((node: Node, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
    onRelationshipClick?: ((relationship: Relationship, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
    onRelationshipDoubleClick?: ((relationship: Relationship, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
    onRelationshipRightClick?: ((relationship: Relationship, hitElements: HitTargets, event: MouseEvent) => void) | boolean;
  }
  */

  /*
  interface HitTargetNode {
    data: Node;
    distance: number;
    distanceVector: Point;
    insideNode: boolean;
    pointerCoordinates: Point;
    targetCoordinates: Point;
  }
  */  

  /*
  interface HitTargetRelationship {
      data: Relationship;
      distance: number;
      fromTargetCoordinates: Point;
      pointerCoordinates: Point;
      toTargetCoordinates: Point;
  }
  */

  componentDidMount() {
    
    // this.layoutRef = React.createRef();

    let nodes = [];
    let rels = [];
    const nvl = new NVL(document.getElementById('nvlContainer'), nodes, rels, nvlOptions)

    this.setState({ nvl: nvl })

    const dragNodeInteraction = new DragNodeInteraction(nvl)
    dragNodeInteraction.updateCallback('onDrag', (nodes) => {
      //console.log('Dragged nodes:', nodes)
    });

    const panInteraction = new PanInteraction(nvl)
    panInteraction.updateCallback('onPan', (panning) => {
      // this.setState({
      //   currentPan: panning
      // })
    })    

    const zoomInteraction = new ZoomInteraction(nvl)
    zoomInteraction.updateCallback('onZoom', (zoomLevel) => {
      this.setState({
        zoomLevel: zoomLevel
      })
    })    

    const clickInteraction = new ClickInteraction(nvl)
    clickInteraction.updateCallback('onCanvasClick', (evt) => {
      nvl.deselectAll();
      this.highlightReset();
      this.setState({
        selectedNodes: [],
        selectedRels: []
      })

      /*
     , () => {
        if (this.graphSummaryRef.current) {
          this.graphSummaryRef.current.hideSelectedItems();
        }                  
      }
      */ 
    });

    clickInteraction.updateCallback('onNodeClick', (node, hitElements, event) => {

      let { selectedNodes, dataNodes } = this.state;

      let selectedIndex = selectedNodes.findIndex(selectedNode => this.getNodeRelId(selectedNode) === node.id);
      let alreadySelected = selectedIndex >= 0;

      let newSelectedNodes = selectedNodes.slice();
      let newlySelectedNode = null;
      if (alreadySelected) {
        newSelectedNodes.splice(selectedIndex,1);
      } else {
        newlySelectedNode = dataNodes[node.id];
        newSelectedNodes.push(newlySelectedNode);
      }

      this.setState({
        selectedNodes: newSelectedNodes
      }, () => {
        if (this.graphSummaryRef.current) {
          if (newlySelectedNode) {
            this.graphSummaryRef.current.handleNewlySelectedNode(newlySelectedNode);
          }
        }          
      })

      nvl.updateElementsInGraph([{id: node.id, selected: !alreadySelected}], []);
    });

    clickInteraction.updateCallback('onRelationshipClick', (rel, hitElements, event) => {

      let { selectedRels, dataRels } = this.state;
      let selectedIndex = selectedRels.findIndex(selectedRel => this.getNodeRelId(selectedRel) === rel.id);
      let alreadySelected = selectedIndex >= 0;

      let newSelectedRels = selectedRels.slice();
      let newlySelectedRel = null;
      if (alreadySelected) {
        newSelectedRels.splice(selectedIndex,1);
      } else {
        newlySelectedRel = dataRels[rel.id];
        newSelectedRels.push(newlySelectedRel);
      }
      this.setState({
        selectedRels: newSelectedRels
      }, () => {
        if (this.graphSummaryRef.current) {
          if (newlySelectedRel) {
            this.graphSummaryRef.current.handleNewlySelectedRel(newlySelectedRel);
          }
        }          
      })

      nvl.updateElementsInGraph([], [{id: rel.id, selected: !alreadySelected}]);
    });    

    window.addEventListener("resize", () => {
      // console.log('DebugCanvasPlainNvl window resize listener called');
      this.setCanvasRect();
    });

    // setTimeout(() => {
    //   this.setCanvasRect();
    // }, 100)
  }

  setCanvasRect = () => {
    let canvasDomEl = document.getElementById('nvlContainer');
    if (canvasDomEl) {
      let rect = canvasDomEl.getBoundingClientRect();
      // console.log('canvasRect: ', rect);
      this.setState({
        canvasHeight: rect.height,
        canvasLeft: rect.left,
        // graphSummaryAndConfigVisible: true
      }
      , () => {
        // expected setCanvasRect will be called during initialization
        //  as the proper canvasHeight and canvasLeft are set, we turn visible to true
        setTimeout(() => {
          // console.log('setting graphSummaryAndConfigVisible to true');
          this.setState({
            graphSummaryAndConfigVisible: true
          })
        }, 100)
      }
      )
    }
  }

  // convenience method for external callers
  getColorForLabelsExternal = (labels) => {
    let { nodePaletteConfig } = this.state;
    nodePaletteConfig = nodePaletteConfig || {};
    return this.getColorForLabels(nodePaletteConfig, labels);
  } 

  getColorForLabels = (nodePaletteConfig, labels) => {
    let preferredNodeLabel = this.getPreferredNodeLabel(labels);
    let color = null;
    if (preferredNodeLabel) {
      color = nodePaletteConfig[preferredNodeLabel];
    } else {
      color = nodePaletteConfig[labels[0]];
    }
    return color;
  }

  getNodeStyle = (nodePaletteConfig, { key, labels, dataModel }) => {

    //const existingStyle = this.debugNodeStyle[key];
    let existingStyle = null; // TODO
    if (existingStyle) { 
        return existingStyle;
    } else {
        if (dataModel && labels) {
            const nodeLabel = labels
                .map(label => dataModel.getNodeLabelByLabel(label))
                .filter(x => x)[0];

            if (nodeLabel) {
                return {
                    color: nodeLabel.display.color,
                    size: DEFAULT_NODE_STYLE.size   // TODO: translate dataModel displaySize to NVL nodeLabel.display.size,
                }
            } else {
                return DEFAULT_NODE_STYLE;
            }
        } else {
            let color = this.getColorForLabels(nodePaletteConfig, labels);
            return {
              ...DEFAULT_NODE_STYLE,
              color: color || DEFAULT_NODE_STYLE.color
            };
        }
    }
  }  

  getPaletteConfig = (nodeLabelMap) => {
    let { nodePaletteConfig } = this.state;
    
    let usedLabels = Object.keys(nodePaletteConfig);
    let usedColors = Object.values(nodePaletteConfig);
    let newNodeLabels = Object.keys(nodeLabelMap).filter(x => !usedLabels.includes(x));
    let availableColors = PreferredPaletteOrder.slice().filter(color => !usedColors.includes(color));
    
    newNodeLabels.forEach((header, i) => {
      let color = availableColors[i];
      nodePaletteConfig[header] = (color) ? color : '#aaaaaa';
    });

    return nodePaletteConfig;
  }

  getUpdatedNodeConfigPriority = (nodeLabelString) => {
    let { nodeConfigPriority } = this.state;

    let index = nodeConfigPriority.indexOf(nodeLabelString);
    
    if (index === 0) {
      // do nothing - already at top of the list      
      return { 
        nodeConfigPriority: nodeConfigPriority, 
        indexChanged: false 
      }
    } else {
      let newConfigPriority = nodeConfigPriority.slice();
      if (index > 0) {
        newConfigPriority.splice(index,1);
      }
      newConfigPriority.splice(0, 0, nodeLabelString);
      return { 
        nodeConfigPriority: newConfigPriority, 
        indexChanged: true 
      }
    }
  }

  getStorageKey = () => {
    let connectionInfo = getCurrentConnectionInfo();
    let storageKeySuffix = '_cw_config';
    let storageKey = '';
    if (connectionInfo) {
      let url = connectionInfo?.url || 'host';
      let databaseName = connectionInfo?.databaseName || 'unknown';
      let match = url.match(/.+:\/\/([^:]+)(:\d+)?/);
      let host = '';
      if (match) {
        host = match[1];
      }
      storageKey = `${host}_${databaseName}${storageKeySuffix}`;
    } else {
      storageKey = `default${storageKeySuffix}`;
    }
    return storageKey;
  }

  persistConfigs = () => {
    let connectionInfo = getCurrentConnectionInfo();
    if (connectionInfo) {
      let { nodePaletteConfig, nodeLabelConfig, nodeConfigPriority } = this.state;
      let config = {
        nodePaletteConfig, nodeLabelConfig, nodeConfigPriority
      }
      let configJson = JSON.stringify(config);
      localStorage.setItem(this.getStorageKey(), configJson);
    }
  }

  loadConfigs = (callback) => {
    let storageKey = this.getStorageKey();
    let configJson = localStorage.getItem(storageKey);
    if (configJson) {
      try {
        let config = JSON.parse(configJson);
        let { nodePaletteConfig, nodeLabelConfig, nodeConfigPriority } = config;
        this.setState({
          nodePaletteConfig, nodeLabelConfig, nodeConfigPriority
        }, () => {
          callback();
        })
      } catch (e) {
        console.log(`Error loading config for storage key '${storageKey}'`, e)
        callback();
      }
    } else {
      callback();
    }
  }

  updateNodePaletteConfig = (nodeLabelString, color) => {
    let { nodePaletteConfig, nodeLabelMap } = this.state;
    let { onNodeColorConfigChange } = this.props;    
    nodePaletteConfig[nodeLabelString] = color;

    let updatedState = {
      nodePaletteConfig
    }
    if (onNodeColorConfigChange) {
      onNodeColorConfigChange(nodePaletteConfig);
    }

    let { nodeConfigPriority, indexChanged } = this.getUpdatedNodeConfigPriority(nodeLabelString);
    if (indexChanged) {
      updatedState.nodeConfigPriority = nodeConfigPriority;
    }

    this.setState(updatedState, () => {
      this.persistConfigs();
      let nodes = nodeLabelMap[nodeLabelString];
      if (nodes) {
        let nodeIds = nodes.map(node => this.getNodeRelId(node))
        this.reRenderGraphAfterConfigUpdate(nodeIds, {
          refreshLabel: indexChanged,         // if index changed, we want to refresh the color
          refreshColor: true  
        });
      }
    })
  }

  updateNodeLabelConfig = (nodeLabelString, propKey) => {
    let { nodeLabelConfig, nodeLabelMap } = this.state;
    let { onNodeLabelConfigChange } = this.props;
    nodeLabelConfig[nodeLabelString] = propKey;

    let updatedState = {
      nodeLabelConfig
    }
    if (onNodeLabelConfigChange) {
      onNodeLabelConfigChange(nodeLabelConfig);
    }

    let { nodeConfigPriority, indexChanged } = this.getUpdatedNodeConfigPriority(nodeLabelString);
    if (indexChanged) {
      updatedState.nodeConfigPriority = nodeConfigPriority;
    }

    this.setState(updatedState, () => {
      this.persistConfigs();
      let nodes = nodeLabelMap[nodeLabelString];
      if (nodes) {
        let nodeIds = nodes.map(node => this.getNodeRelId(node))
        this.reRenderGraphAfterConfigUpdate(nodeIds, {
          refreshLabel: true,
          refreshColor: indexChanged  // if index changed, we want to refresh the color
        });
      }
    })
  }

  getNodeLabelConfig = (nodeLabelMap) => {
    let { nodeLabelConfig } = this.state;
    Object.keys(nodeLabelMap).forEach(label => {
      let currentConfig = nodeLabelConfig[label];
      if (!currentConfig) {
        let nodesForLabel = nodeLabelMap[label];
        if (nodesForLabel && nodesForLabel.length > 0) {
          let recommendedLabel = getRecommendedLabel(nodesForLabel);
          nodeLabelConfig[label] = recommendedLabel;
        }
      }
    })
    return nodeLabelConfig;
  }

  getPreferredNodeLabel = (labels) => {
    let { nodeConfigPriority } = this.state;

    let indexes = labels
      .map(label => nodeConfigPriority.indexOf(label))
      .filter(index => index >= 0)
      .sort();

    let preferredNodeLabel = null;
    if (indexes.length > 0) {
      preferredNodeLabel = nodeConfigPriority[indexes[0]];
    }
  
    return preferredNodeLabel;
  }

  // convenience function for an external module calling this
  getNodeCaptionExternal = (nodeInfo) => {
    var { nodeLabelConfig } = this.state;
    nodeLabelConfig = nodeLabelConfig || {};
    return this.getNodeCaption(nodeLabelConfig, nodeInfo, {returnAsText: true});
  } 

  getNodeCaption = (nodeLabelConfig, nodeInfo, options = {}) => {

    if (!nodeInfo) {
      return options.returnAsText ? '' : [{value: ''}]; 
    }

    let addLabels = false;

    let caption = '';

    let recommendedLabelProp = null;
    let preferredNodeLabel = this.getPreferredNodeLabel(nodeInfo.labels);
    if (preferredNodeLabel) {
      recommendedLabelProp = nodeLabelConfig[preferredNodeLabel];
    } else {
      recommendedLabelProp = nodeInfo.labels
        .map(label => nodeLabelConfig[label])[0];
    }
    
    if (recommendedLabelProp) {
      let propValue = nodeInfo.properties[recommendedLabelProp];
      if (typeof(propValue) === 'string') {
        caption = propValue;
      } else {
        propValue = rewriteIntegers(propValue); 
        caption = JSON.stringify(propValue);
      }
    }

    if (!caption) {
      caption = this.getNodeRelId(nodeInfo);
    }

    let labelText = '';
    if (addLabels) {
      labelText = `(${nodeInfo.labels.join(':')})`;
    }

    if (options.returnAsText) {
      let text = caption;
      if (addLabels) {
        text += ' ' + labelText;
      }
      return text;
    } else {
      let snippets = [];
      snippets.push({value: caption});
  
      if (addLabels) {
        snippets.push({value: labelText});
      }
  
      return snippets;    
    }
  }

  processNodeForConfig = (nodeInfo, nodeLabelMap) => {
    nodeInfo.labels.forEach(label => {
      let nodesForLabel = nodeLabelMap[label] || [];
      nodesForLabel.push(nodeInfo);
      nodeLabelMap[label] = nodesForLabel;
    })
  }

  convertId = (idVal) => {
    let id = '';
    if (typeof(idVal) === Integer) {
      id = idVal.toString();
    } else if (idVal.low !== undefined && idVal.high !== undefined) {
      id = new Integer(idVal.low, idVal.high).toString();
    } else {
      id = idVal;
    }
    return id;
  }  

  getNodeRelId = (nodeRelInfo) => this.convertId(nodeRelInfo.identity);

  processNode = (nodeInfo, newNodes, dataNodes, {
      existingNodeIds, nodePaletteConfig, nodeLabelConfig, selectedDataModel 
  }, options = {}) => {
    // let nodeId = `${nodeInfo.identity}`; // this fail when value is x.low, x.high, but works when it is Integer
    let nodeId = this.getNodeRelId(nodeInfo);

    let isNew = false;
    if (options.selectNewNodes) {
      isNew = !existingNodeIds.includes(nodeId);  
    }

    // allNodeKeysFromRows.add(nodeInfo.identity);
    let style = this.getNodeStyle(nodePaletteConfig, {
      key: nodeId,
      labels: nodeInfo.labels,
      dataModel: selectedDataModel
    });

    let caption = this.getNodeCaption(nodeLabelConfig, nodeInfo);

    let node = { 
        id: nodeId, 
        captions: caption, 
        selected: isNew,
        ...style 
    }
    newNodes.push(node);
    dataNodes[nodeId] = nodeInfo;
  }

  getPlaceholderNode = (nodeId) => {
    let node = {
      id: nodeId,
      selected: true,
      captions: [{value: `${nodeId}`}],
      ...PLACEHOLDER_NODE_STYLE
    }
    return node;
  }

  processRel = (relInfo, newRels, newNodes, dataRels, placeholderNodes, 
      { existingRelIds, selectedDataModel }, options = {}) => {

    // let relId = `${relInfo.identity}`;
    let relId = this.getNodeRelId(relInfo);

    let isNew = false;
    if (options.selectNewNodes) {
      isNew = !existingRelIds.includes(relId);
    }    

    let rel = { 
        id: relId, 
        from: this.convertId(relInfo.start), 
        to: this.convertId(relInfo.end), 
        color: DEFAULT_REL_STYLE.color, 
        captions: [{value: relInfo.type}],
        selected: isNew
    }

    if (options.relationshipPlaceholderNodes) {
      let startNodeId = this.convertId(relInfo.start);
      let endNodeId = this.convertId(relInfo.end);
      let startNode = newNodes.find(x => x.id === startNodeId);
      if (!startNode) {
        startNode = this.getPlaceholderNode(startNodeId);
        newNodes.push(startNode);
        placeholderNodes.push(startNode);
      }
      let endNode = newNodes.find(x => x.id === endNodeId);
      if (!endNode) {
        endNode = this.getPlaceholderNode(endNodeId);
        newNodes.push(endNode);
        placeholderNodes.push(endNode);
      }
    }

    newRels.push(rel);
    dataRels[relId] = relInfo;
  }

  computeRelTypeMap = (dataRels) => {
    let relMap = {};
    Object.values(dataRels)
      .forEach(rel => {
        let rels = relMap[rel.type] || [];
        rels.push(rel);
        relMap[rel.type] = rels;
      })
    return relMap;
  }

  dedupNodeLabelMap = (nodeLabelMap) => {
    let newMap = {};
    Object.keys(nodeLabelMap)
        .forEach(key => {
          let values = nodeLabelMap[key];
          let idMap = {};
          values.forEach(nodeInfo => {
            idMap[this.getNodeRelId(nodeInfo)] = nodeInfo;
          })
          newMap[key] = Object.values(idMap);
        })
  
    return newMap;
  }

  getNodeConfigs = (rows, nodeHeaders, pathHeaders, nestedHeaders) => {
    let nodeLabelMap = {};

    rows.forEach(row => {
      // process headers with nodes
      nodeHeaders.forEach(header => {
          const nodeInfo = row[header];    
          this.processNodeForConfig(nodeInfo, nodeLabelMap);
      });

      // process paths with nodes
      pathHeaders.forEach(header => {
        const pathInfo = row[header];    
        this.processNodeForConfig(pathInfo.start, nodeLabelMap);
        this.processNodeForConfig(pathInfo.end, nodeLabelMap);
        pathInfo.segments.forEach(segment => {
          this.processNodeForConfig(segment.start, nodeLabelMap);
          this.processNodeForConfig(segment.end, nodeLabelMap);
        });
      });

      // process nested headers
      nestedHeaders.forEach(header => {
        const nestedInfo = row[header];
        findObjectsContainingKeys(nestedInfo, 'identity')
          .filter(x => isNode(x))
          .forEach(x => this.processNodeForConfig(x, nodeLabelMap));
      })
    })

    // node label map can currently contains dups, de-dup the entries
    nodeLabelMap = this.dedupNodeLabelMap(nodeLabelMap);

    let nodeLabelConfig = this.getNodeLabelConfig(nodeLabelMap);
    let nodePaletteConfig = this.getPaletteConfig(nodeLabelMap);
    // TODO: enhance model

    return { 
      nodeLabelConfig, nodePaletteConfig, nodeLabelMap
    }
  }

  updateData = (headers, rows, options = {}) => {
    let selectedDataModel = null; // TODO
    const { 
      nodeHeaders,
      relationshipHeaders,
      pathHeaders,
      nestedHeaders
    } = analyzeHeaders(headers, rows);

    const { nvl, placeholderNodeIds } = this.state;

    let existingNodeIds = nvl.getNodes()
      .filter((node) => !placeholderNodeIds.includes(node.id))
      .map((node) => node.id);

    let existingRelIds = nvl.getRelationships().map((rel) => rel.id);

    let newNodes = [];
    let newRels = [];

    // to keep track of the original data we get, because we lose some when we 
    //   transform to nvl format
    let dataNodes = {};
    let dataRels = {};

    // get node configs
    let { nodePaletteConfig, nodeLabelConfig, nodeLabelMap } = 
        this.getNodeConfigs(rows, nodeHeaders, pathHeaders, nestedHeaders);

    // TODO: update data model        

    let processNodeConfig = {
      existingNodeIds, selectedDataModel,
      nodePaletteConfig, nodeLabelConfig       
    }

    let processRelConfig = { existingRelIds, selectedDataModel }

    // de-select all nodes and rels
    nvl.deselectAll();

    let processOptions = {
      selectNewNodes: (options.isDebug) ? true : false,
      relationshipPlaceholderNodes: options.relationshipPlaceholderNodes
    }

    // add the nodes
    rows.forEach(row => {
      nodeHeaders.forEach(header => {
          const nodeInfo = row[header];
          this.processNode(nodeInfo, newNodes, dataNodes, processNodeConfig, processOptions);
      })

      pathHeaders.forEach(header => {
        const pathInfo = row[header];    
        this.processNode(pathInfo.start, newNodes, dataNodes, processNodeConfig, processOptions);
        this.processNode(pathInfo.end, newNodes, dataNodes, processNodeConfig, processOptions);
        pathInfo.segments.forEach(segment => {
          this.processNode(segment.start, newNodes, dataNodes, processNodeConfig, processOptions);
          this.processNode(segment.end, newNodes, dataNodes, processNodeConfig, processOptions);
        });
      });

      nestedHeaders.forEach(header => {
        const nestedInfo = row[header];
        findObjectsContainingKeys(nestedInfo, 'identity')
          .filter(x => isNode(x))
          .forEach(x => this.processNode(x, newNodes, dataNodes, processNodeConfig, processOptions));
      })
    })

    let placeholderNodes = [];
    rows.forEach(row => {
      relationshipHeaders.forEach(header => {
          const relInfo = row[header];
          this.processRel(relInfo, newRels, newNodes, dataRels, placeholderNodes, processRelConfig, processOptions);
      });

      pathHeaders.forEach(header => {
        const pathInfo = row[header];    
        pathInfo.segments.forEach(segment => {
          this.processRel(segment.relationship, newRels, newNodes, dataRels, placeholderNodes, processRelConfig, processOptions);
        });
      });      

      nestedHeaders.forEach(header => {
        const nestedInfo = row[header];
        findObjectsContainingKeys(nestedInfo, 'identity')
          .filter(x => isRelationship(x))
          .forEach(x => this.processRel(x, newRels, newNodes, dataRels, placeholderNodes, processRelConfig, processOptions));
      })      
    })
    nvl.addAndUpdateElementsInGraph(newNodes, newRels);

    let newNodeIds = newNodes.map((node) => node.id);
    let newRelIds = newRels.map((rel) => rel.id);

    let nodesIdsToRemove = existingNodeIds.filter(id => !newNodeIds.includes(id));
    let relIdsToRemove = existingRelIds.filter(id => !newRelIds.includes(id));
    nvl.removeNodesWithIds(nodesIdsToRemove);
    nvl.removeRelationshipsWithIds(relIdsToRemove);

    let relTypeMap = this.computeRelTypeMap(dataRels);

    this.setState({
      placeholderNodes: placeholderNodes,
      nodePaletteConfig: nodePaletteConfig,
      nodeLabelConfig: nodeLabelConfig,
      nodeLabelMap: nodeLabelMap,
      relTypeMap: relTypeMap,
      dataNodes, dataRels
    }, () => {
      if (this.graphSummaryRef.current) {
        this.graphSummaryRef.current.enhanceDataModel();
      }
    })

    if (options.zoomToSelectedNodes) {
      this.zoomToSelectedNodesAndRels(newNodes, newRels);
    } else if (options.fit) {
      this.fit();
    }
  }

  reRenderGraphAfterConfigUpdate = (nodeIdsToUpdate, options = {}) => {
    let { refreshLabel, refreshColor } = options;
    let { nvl, dataNodes, 
      nodePaletteConfig, nodeLabelConfig
    } = this.state;
    if (nodeIdsToUpdate.length > 0) {
      let nodesToReRender = nodeIdsToUpdate.map(nodeId => {
        let dataNode = dataNodes[nodeId];

        let style = {};
        if (refreshColor) {
          style = this.getNodeStyle(nodePaletteConfig, {
            key: nodeId,
            labels: dataNode ? dataNode.labels : [],
            dataModel: null
          })
        }

        if (refreshLabel) {
          let caption = this.getNodeCaption(nodeLabelConfig, dataNode);
          style.captions = caption;
        }          

        let node = { 
          id: nodeId, 
          ...style 
        }
        return node;
      })

      nvl.updateElementsInGraph(nodesToReRender, []);
    }
  }

  highlightReset = () => {
    let { highlightedNodeIds } = this.state;
    this.reRenderGraphAfterConfigUpdate(highlightedNodeIds, { refreshColor: true });
    // if (highlightedNodeIds.length > 0) {
    //   let highlightReset = highlightedNodeIds.map(nodeId => {
    //     let dataNode = dataNodes[nodeId];
    //     let style = this.getNodeStyle(nodePaletteConfig, {
    //       key: nodeId,
    //       labels: dataNode ? dataNode.labels : [],
    //       dataModel: null
    //     })          
    //     let node = { 
    //       id: nodeId, 
    //       ...style 
    //     }
    //     return node;
    //   })

    //   nvl.updateElementsInGraph(highlightReset, []);
    // }
  }

  zoomToSelectedNodesAndRels = (nodes, rels) => {
    const { nvl } = this.state;
    let selectedNodeIds = nodes
      .filter(node => node.selected)
      .map(node => node.id);

    // add nodes for selected rels that aren't already selected
    rels
      .filter(rel => rel.selected)
      .forEach(rel => {
        if (!selectedNodeIds.includes(rel.from)) {
          selectedNodeIds.push(rel.from);
        }
        if (!selectedNodeIds.includes(rel.to)) {
          selectedNodeIds.push(rel.to);
        }          
      })

    nvl.fit(selectedNodeIds, {});      
  }

  selectAndFocusOnIds = (nodeIds, relIds, pathStartIds, pathEndIds) => {
    const { nvl, nodePaletteConfig, dataNodes } = this.state;

    nvl.deselectAll();
    this.highlightReset();

    let existingNodeIds = [];
    let nodeColorMap = {};
    nvl.getNodes().forEach((node) => {
      existingNodeIds.push(node.id);

      let dataNode = dataNodes[node.id];
      let style = this.getNodeStyle(nodePaletteConfig, {
        key: node.id,
        labels: dataNode ? dataNode.labels : [],
        dataModel: null
      });

      nodeColorMap[node.id] = style.color;
    });

    let existingRelIds = nvl.getRelationships().map((rel) => rel.id);

    const allIds = new Set(pathStartIds.concat(pathEndIds));
    const highlightedNodeIds = Array.from(allIds);

    if (pathEndIds && pathEndIds.length > 0) {
      pathEndIds.forEach(endId => {
        let existingColor = nodeColorMap[endId];
        let newColor = chroma(existingColor).darken().hex();
        nodeColorMap[endId] = newColor;
      })
    }

    // putting this second - if id is both an end and start then it gets the start color
    if (pathStartIds && pathStartIds.length > 0) {
      pathStartIds.forEach(startId => {
        let existingColor = nodeColorMap[startId];
        let newColor = chroma(existingColor).brighten().hex();
        nodeColorMap[startId] = newColor;
      })
    }

    let selectedNodes = nodeIds
      .filter(id => existingNodeIds.includes(id))
      .map(nodeId => ({
        id: nodeId,
        selected: true,
        color: nodeColorMap[nodeId]
      }))

    let selectedRels = relIds
      .filter(id => existingRelIds.includes(id))
      .map(relId => ({
        id: relId,
        selected: true
      }))

    let ids = nodeIds.concat(relIds);
    nvl.addAndUpdateElementsInGraph(selectedNodes, selectedRels);
    nvl.fit(ids, {});      

    this.setState({
      highlightedNodeIds
    })
  }

  resetPanAndZoom = () => {
    const { nvl } = this.state;
    // setZoomAndPan doesn't work
    //nvl.setZoomAndPan(nvlOptions.initialZoom, 0, 0);
    nvl.setZoom(nvlOptions.initialZoom);
    nvl.setPan(0, 0);
    this.setState({
      zoomLevel: nvlOptions.initialZoom
    })
  }

  fit = () => {
    const { nvl } = this.state;
    nvl.fit(
      nvl.getNodes().map((node) => node.id),
      {}
    );
  }

  fitSelected = () => {
    const { nvl } = this.state;
    nvl.fit(
      nvl.getNodes()
        .filter((node) => node.selected)
        .map((node) => node.id),
      {}
    );
  }

  zoomIn = () => {
    const { nvl } = this.state;
    let newZoom = nvl.getScale() + ZoomIncrement;
    this.setState({
      zoomLevel: newZoom
    })
    nvl.setZoom(newZoom);
  }

  zoomOut = () => {
    const { nvl } = this.state;
    let newZoom = nvl.getScale() - ZoomIncrement;
    this.setState({
      zoomLevel: newZoom
    })
    nvl.setZoom(newZoom);
  }

  setLayout = (newLayout) => {
    const { nvl, layout } = this.state;
    if (newLayout !== layout) {
      nvl.setLayout(newLayout);
      this.setState({
        currentLayout: newLayout
      })
    }
  }

  clearCanvas = (options) => {

    let { clearStats, clearConfig, callback } = options || {};

    const { nvl } = this.state;
    nvl.removeNodesWithIds(
      nvl.getNodes().map((node) => node.id),
      {}
    );    

    let newState = {};
    if (clearStats) {
      newState = {
        nodeLabelMap: {},
        relTypeMap: {}
      }
    }
    if (clearConfig) {
      newState = {
        nodePaletteConfig: {},
        nodeLabelConfig: {},
        ...newState
      }      
    }

    this.setState({
      ...newState,
      placeholderNodeIds: [],
      dataNodes: {},
      dataRels: {},
      selectedNodes: [],
      selectedRels: [],
      highlightedNodeIds: [],
    }, () => {
      if (callback) {
        callback();
      }
    })
  }

  refreshGraphSummary = () => {
    this.loadConfigs(() => {
      if (this.graphSummaryRef.current) {
        this.graphSummaryRef.current.refresh((response) => {
          let { error, databaseStatistics, dataModel } = response;
          if (!error) {
            let nodeLabelCounts = databaseStatistics?.nodeLabelCounts || {};
            let paletteConfig = this.getPaletteConfig(nodeLabelCounts);
            this.setState({
              nodePaletteConfig: paletteConfig
            })
          }
        });
      }
    })
  }

  handleDisconnect = () => {
    if (this.graphSummaryRef.current) {
      this.graphSummaryRef.current.handleDisconnect()
    }
  }  

  getStatsMode = () => {
    const { selectedNodes, selectedRels } = this.state;
    const { showQueryResults } = this.props;
    let anySelected = (selectedNodes.length + selectedRels.length) > 0;
    if (showQueryResults) {
      return anySelected ? Stats.SelectedStats : Stats.QueryStats;
    } else {
      return Stats.DbStats;
    }
  }

  render () {

    const { width, explanation, isExplanationAvailable, visible } = this.props;
    const { 
      zoomLevel, currentLayout,
      dataNodes, dataRels,
      nodePaletteConfig, nodeLabelConfig,
      nodeLabelMap, relTypeMap,
      canvasLeft, canvasHeight,
      graphSummaryAndConfigVisible,
      selectedNodes, selectedRels
    } = this.state;

    return (
      <div style={{visibility: visible ? 'visible' : 'hidden'}}>
          <div id='nvlContainer' className='flex' style={{ 
            width: width,
            height: 'calc(100vh - 105px)',
            // height: 'calc(100vh - 145px)',
            border: '1px solid lightgrey'
          }}>
          </div>
          <GraphSummaryAndConfig 
              ref={this.graphSummaryRef}
              style={{position: 'absolute', 
                // visibility: (graphSummaryAndConfigVisible) ? 'visible' : 'hidden',
                visibility: 'visible',
                maxHeight: canvasHeight - 20,
                // height: '50%',
                // left: canvasLeft + 10,
                left: 10,
                bottom: 10,
                // overflowY: 'scroll'
                // background: '#dddddd88'
              }}
              showStats={this.getStatsMode()}
              nodePaletteConfig={nodePaletteConfig}
              nodeLabelConfig={nodeLabelConfig}
              nodeLabelMap={nodeLabelMap}
              relTypeMap={relTypeMap}
              dataRels={dataRels}
              dataNodes={dataNodes}
              selectedNodes={selectedNodes}
              selectedRels={selectedRels}
              updateNodeLabelConfig={this.updateNodeLabelConfig}
              updateNodePaletteConfig={this.updateNodePaletteConfig}
              getNodeCaption={this.getNodeCaptionExternal}
          />
          {/* <LayoutControls layoutRef={this.layoutRef} zoomLevel={Math.floor(zoomLevel * 100)} */}
          <LayoutControls zoomLevel={Math.floor(zoomLevel * 100)}
              style={{position: 'absolute', 
                right: 10,
                bottom: 10
              }}
              resetPanAndZoom={this.resetPanAndZoom} 
              fit={this.fit} fitSelected={this.fitSelected}
              zoomIn={this.zoomIn} zoomOut={this.zoomOut}
              forceLayout={() => this.setLayout(LayoutOptions.ForceDirected)}
              hierarchicalLayout={() => this.setLayout(LayoutOptions.Hierarchical)}
              currentLayout={currentLayout}
              explanation={explanation}
              isExplanationAvailable={isExplanationAvailable}
          />
      </div>

    );
  }
};
