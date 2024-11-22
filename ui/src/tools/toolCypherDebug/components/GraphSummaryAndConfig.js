import React, { Component, useEffect, useRef, useState } from 'react';
import { DatabaseUtil } from '../database/databaseUtil';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import InfoIcon from '@material-ui/icons/Info';
import { Tooltip } from '@material-ui/core';
import DataModel from '../../../dataModel/dataModel';
import ColorPicker from '../../../components/canvas/ColorPicker';
import { InitialPreferredPaletteOrder } from './DebugCanvasPlainNvl';
import { pxVal } from '../CypherDebug';
import { NodeCapsule, RelCapsule } from './Capsules';
import { rewriteIntegers } from '../database/databaseUtil';

export const Stats = {
    DbStats: "DbStats",
    QueryStats: "QueryStats",
    SelectedStats: "SelectedStats"
}

export const SidePanelMode = {
    Configure: "Configure",
    Properties: "Properties"
}

const LargeViewHeight = '450px';
const LargeViewBackgroundColor = '#dddddd88'
const InfoMessage = "Note: All property keys might not be displayed - as nodes are returned from queries more property keys may be added";

const handleSidePanelOpenCloseEvent = (mode, props) => {
    let { 
        sidePanelOpen, sidePanelMode,
        setSidePanelOpen, setSidePanelMode
    } = props;

    if (mode === sidePanelMode) {
        // toggle
        setSidePanelOpen(!sidePanelOpen)
    } else {
        // need to open or switch to requested mode
        setSidePanelOpen(true)
        setSidePanelMode(mode);
    }
}

function TopBar (props) {

    let { showStats, style, activeDatabase, tooltipMessage,
        sidePanelOpen, setSidePanelOpen, 
        sidePanelMode, setSidePanelMode
    } = props;

    let showIcons = (sidePanelOpen !== undefined && setSidePanelOpen !== undefined);

    let statusMessage = '';
    let connectionInfo = getCurrentConnectionInfo();
    if (connectionInfo) {
        if (showStats === Stats.QueryStats) {
            statusMessage = 'Query info';
        } else if (showStats === Stats.SelectedStats) {
            statusMessage = 'Selected info';
        } else {
            statusMessage = `${activeDatabase ? activeDatabase : 'default'} database`;
        }
    } else {
        statusMessage = 'Not connected';
    }

    let clickIconProps = {
        sidePanelOpen, sidePanelMode,
        setSidePanelOpen, setSidePanelMode
    }

    return (
        <div style={{
            display: 'flex', 
            alignItems: 'baseline',
            flexFlow: 'row',
            marginBottom: '8px',
            borderBottom: '1px solid lightgray',
            ...style
        }}
        >
            <Tooltip enterDelay={2000} arrow title={tooltipMessage}>
                <div>{statusMessage}</div>
            </Tooltip>
            <div style={{flexGrow: 1}}></div>
            {showIcons &&
                <>
                    <Tooltip enterDelay={2000} arrow title={'Show Properties'}>
                        <div 
                            style={{marginLeft: '10px', cursor: 'pointer',
                                color: (sidePanelMode === SidePanelMode.Properties) 
                                    ? 'ghostwhite'
                                    : 'inherit' 
                        }} 
                            className={`fa fa-list-ul`}
                            onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                handleSidePanelOpenCloseEvent(SidePanelMode.Properties, clickIconProps)
                            }}
                        >
                        </div>
                    </Tooltip>
                    <Tooltip enterDelay={2000} arrow title={'Show Configuration'}>
                        <div 
                            style={{marginLeft: '5px', cursor: 'pointer',
                                color: (sidePanelMode === SidePanelMode.Configure) 
                                    ? 'ghostwhite'
                                    : 'inherit' 
                            }} 
                            className={`fa fa-edit`}
                            onClick={(event) => {
                                event.stopPropagation();
                                event.preventDefault();
                                handleSidePanelOpenCloseEvent(SidePanelMode.Configure, clickIconProps)
                            }}
                        >
                        </div>
                    </Tooltip>
                </>
            }
        </div>
    )
}

function MoreLess (props) {
    
    let { showMore, setShowMore } = props;

    // showMore means show more items. So if we are showing more items, then we want ...Less
    //   to be displayed. Otherwise, if we aren't showing more items, we want More... to 
    //   be displayed
    return (
        <div style={{display:'flex'}}>
            <div style={{
                cursor: 'pointer'
            }} onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                setShowMore(!showMore)}
            }>
                {
                    showMore ? '...Less' : 'More...'
                }
            </div>
            <div style={{height: '1em', marginRight: 'auto'}}></div>
        </div>
    )
}

function MiniView (props) {

    var { 
        style, dataRels, dataNodes, expand, 
        databaseStatistics, showStats, activeDatabase,
        selectedNodes, selectedRels
     } = props;

     style = {
        ...style,
        cursor: 'pointer',
        display: 'flex',
        flexFlow: 'column',
        fontSize: '0.9em'
    }

    let { nodeCount, relCount } = databaseStatistics;

    if (showStats === Stats.QueryStats) {
        if (dataNodes) {
            nodeCount = Object.keys(dataNodes).length;
        }
    
        if (dataRels) {
            relCount = Object.keys(dataRels).length;        
        }
    } else if (showStats === Stats.SelectedStats) {
        nodeCount = selectedNodes.length;
        relCount = selectedRels.length;
    }

    return (
        <div className={'noselect'}
            style={style} 
            onClick={() => expand()} 
        >
            <TopBar showStats={showStats} activeDatabase={activeDatabase}
                tooltipMessage={'Click anywhere to show properties and configuration'}
                style={{
                    background: '#0000000F',
                    paddingLeft: '3px',
                    paddingRight: '3px'
                }}
            />
            <NodeCapsule count={nodeCount}/>
            <RelCapsule count={relCount}/>
        </div>
    )
}

function PropertyKey (props) {

    let { selected, propName, updateNodeLabelConfig, selectedNodeLabelString } = props;

    let colorStyle = (selected) ? 
        {
            backgroundColor: 'gray',
            color: 'white',
            border: '1px solid darkslategray',
        }
        :
        {
            color: 'darkslategray',
            border: '1px solid gray',
        }
            
    return (
        <div style={{
            ...colorStyle,
            borderRadius: '2px',
            padding: '2px',
            maxWidth: '190px',
            // height: '1.8em',
            marginTop: '5px',
            marginRight: '5px',
            wordWrap: 'break-word',
            cursor: 'pointer'
        }}
        key={propName}
        onClick={() => {
            if (updateNodeLabelConfig) {
                updateNodeLabelConfig(selectedNodeLabelString, propName)
            }
        }}
        >
            {propName}
        </div>
    )
}

function ConfigureOrShowProps (props) {

    // let [color, setColor] = useState('gray');

    let { nodeLabel,
        selectedNodeLabelString, 
        relationshipType,
        selectedRelationshipTypeString,
        nodePaletteConfig, nodeLabelConfig,
        updateNodeLabelConfig, style,
        sidePanelMode, setSidePanelOpen, 
        getNodeCaption,
        selectedNodes, selectedRels
    } = props;
    let propertyNames = [];
    if (nodeLabel) {
        propertyNames = Object.values(nodeLabel.properties).map(x => x.name);
        propertyNames.sort();
    } else if (relationshipType) {
        propertyNames = Object.values(relationshipType.properties).map(x => x.name);
        propertyNames.sort();
    }

    let contentDivStyle = (sidePanelMode === SidePanelMode.Configure) 
        ? {
            display: 'flex',
            flexFlow: 'row wrap',
            overflowY: 'scroll'
        } : {
            overflowY: 'scroll'
        }

    // let { maxHeight } = style || {}
    // if (maxHeight) {
    //     contentDivStyle.maxHeight = `${pxVal(maxHeight) - 180}px`
    // }
    let { height } = style || {}
    let heightOffset = (sidePanelMode === SidePanelMode.Configure) ? 180 : 90;
    if (height) {
        contentDivStyle.maxHeight = `${pxVal(height) - heightOffset}px`;
    }

    let displayText = ''
    let lastSelectedNode = null;
    let lastSelectedRel = null;
    let selectedPropMap = {};
    if (selectedNodeLabelString) {
        displayText = selectedNodeLabelString;
        if (sidePanelMode === SidePanelMode.Properties) {
            let filteredNodes = selectedNodes.filter(node => node.labels.includes(selectedNodeLabelString));
            lastSelectedNode = filteredNodes[filteredNodes.length - 1];
            if (lastSelectedNode) {
                displayText = getNodeCaption(lastSelectedNode);
                selectedPropMap = rewriteIntegers(lastSelectedNode.properties);
            }
        }
    } else if (selectedRelationshipTypeString) {
        displayText = selectedRelationshipTypeString;
        if (sidePanelMode === SidePanelMode.Properties) {
            let filteredRels = selectedRels.filter(rel => rel.type === selectedRelationshipTypeString);
            lastSelectedRel = filteredRels[filteredRels.length - 1];
            if (lastSelectedRel) {
                selectedPropMap = rewriteIntegers(lastSelectedRel.properties);
            }
        }
    }

    const getValueText = (value) => (typeof(value) === 'string') ? value : JSON.stringify(value, null, 4);

    return (
        <div>
            {!nodeLabel && !relationshipType
                ? (sidePanelMode === SidePanelMode.Configure) 
                    ? 'Click a node label to configure' 
                    : 'Click a node label to see the node properties'
                :
                <>
                    <div style={{
                        display:'flex', flexFlow: 'row',
                        borderBottom: '1px solid gray',
                        paddingBottom: '5px',
                        marginBottom: '5px',
                        alignItems: 'baseline',
                        width: '190px'
                    }}>
                        {nodeLabel &&
                            <NodeCapsule
                                nodeLabel={displayText}
                                color={nodePaletteConfig[selectedNodeLabelString]}
                                extraBottomMargin='3px'
                                maxWidth='150px'
                            />
                        }
                        {relationshipType &&
                            <RelCapsule
                                relType={displayText}
                                extraBottomMargin='3px'
                                maxWidth='150px'
                            />
                        }
                        {sidePanelMode === SidePanelMode.Configure &&
                            <div style={{marginLeft: '5px'}}>
                                <Tooltip enterDelay={1000} arrow title={InfoMessage}>
                                    <div style={{
                                        textAlign: 'center',
                                        fontSize: '.8em',
                                        border: '1px solid gray',
                                        borderRadius: '50%',
                                        width: '1.5em',
                                        height: '1.5em',
                                        padding: '1px',                                 
                                    }} className={`fa fa-info`}/>
                                </Tooltip>                        
                            </div>
                        }
                        <div style={{flexGrow: 1}}></div>
                        <div 
                            style={{marginLeft: '8px', cursor: 'pointer'}} 
                            className={`fa fa-times`}
                            onClick={() => {
                                setSidePanelOpen(false);
                            }}
                        />
                    </div>
                    <div>
                        {sidePanelMode === SidePanelMode.Properties 
                            ? <span style={{fontWeight: 'bold'}}>Properties:</span>
                            // mode is Configure
                            : (selectedNodeLabelString) 
                                ? 'Pick a property'
                                // we can't configure relationship types yet
                                : 'Configuration not available'
                        }
                    </div>
                    <div style={contentDivStyle}>
                        {sidePanelMode === SidePanelMode.Properties &&
                            (lastSelectedNode || lastSelectedRel)
                                ? <div style={{background: '#aaaaaa66'}}><span style={{fontWeight: 'bold'}}>&lt;id:&gt;:</span> 
                                    {`${lastSelectedNode?.identity || lastSelectedRel?.identity}`}
                                  </div> 
                                // nothing selected
                                : sidePanelMode === SidePanelMode.Properties && 
                                    <div>Select an item to see it's properties</div>
                        }
                        {sidePanelMode === SidePanelMode.Properties
                            ? (lastSelectedNode || lastSelectedRel)
                                ? 
                                    <div>
                                        {
                                            Object.keys(selectedPropMap).map(propName => {
                                                return (
                                                    <>
                                                        <div style={{
                                                            borderTop: '1px solid black',
                                                            background: '#aaaaaa66'
                                                        }}>
                                                            <span style={{marginLeft: '2px', fontWeight: 'bold', wordWrap: 'break-word'}}>{propName}</span>: 
                                                            <span style={{marginLeft: '5px', wordWrap: 'break-word'}}>{getValueText(selectedPropMap[propName])}</span>
                                                            
                                                        </div>
                                                    </>
                                                )
                                            })
                                        }
                                    </div> 
                                : <></>
                            :
                            // mode is Configure                            
                            nodeLabel &&
                                <>
                                    <PropertyKey
                                            selected={nodeLabelConfig[selectedNodeLabelString] === '<node_id>'} 
                                            propName={'<node_id>'} 
                                            updateNodeLabelConfig={updateNodeLabelConfig} 
                                            selectedNodeLabelString={selectedNodeLabelString}
                                    />                                
                                    {
                                        propertyNames.map(propName => {
                                            let selected = nodeLabelConfig[selectedNodeLabelString] === propName;
                                            return (
                                                <PropertyKey
                                                    selected={selected} 
                                                    propName={propName} updateNodeLabelConfig={updateNodeLabelConfig} 
                                                    selectedNodeLabelString={selectedNodeLabelString}
                                                />
                                            )
                                        })
                                    }
                                </>
                            // no configuration for relationship types right now
                    }
                    </div>
                </>
            }
        </div>
    )
}

function ConfigureColor (props) {

    let { 
        nodeLabel,
        selectedNodeLabelString, 
        nodePaletteConfig, 
        updateNodePaletteConfig
    } = props;    

    const colorPickerRef = useRef(null);

    useEffect(() => {
        let color = nodePaletteConfig[selectedNodeLabelString];
        if (colorPickerRef.current) {
            colorPickerRef.current.setColor(color)
        }
    }, [selectedNodeLabelString])

    const setColor = (color) => {
        // alert('color set: ', color);
        updateNodePaletteConfig(selectedNodeLabelString, color);
    }

    return (
        <>
        {nodeLabel &&
            <div style={{minHeight: '100px'}}>
                <div style={{
                    marginTop: '8px',
                    borderTop: '1px solid gray',
                    paddingTop: '5px',
                    paddingBottom: '5px',
                }}>
                        Pick a color
                </div>
                <ColorPicker ref={colorPickerRef}
                    // pickerTop={'-10px'}
                    pickerBottom={'32px'}
                    pickerLeft={'255px'}
                    overrideColors={InitialPreferredPaletteOrder}
                    style={{ display: 'flex', flexFlow: 'row', marginTop: '.3em'}}
                    hideColorLabel={true} moveExtraColorPickerToEnd={true}
                    width={'190px'} circleSize={15} circleSpacing={5} 
                    onClick={setColor} 
                />
            </div>
        }
        </>
    )
}

function NodeLabelConfigOrProps (props) {

    let { style, sidePanelMode } = props;

    return (
        <div style={{
            ...style,
            // minHeight: '200px', 
            width: '200px',
            height: LargeViewHeight,
            background: LargeViewBackgroundColor,
            padding: '5px',
            fontSize: '0.9em'
        }}>
            <ConfigureOrShowProps {...props}/>
            {sidePanelMode === SidePanelMode.Configure &&
                <ConfigureColor {...props}/>
            }            
        </div>
    )    
}

function LargeView (props) {

    let moreNodesToShow = false;
    let moreRelsToShow = false;

    var { 
        style, dataRels, dataNodes, relTypeMap,
        nodePaletteConfig, nodeLabelMap, collapse,
        databaseStatistics, showStats, 
        selectedNodeLabelString, setSelectedNodeLabelString,
        selectedRelationshipTypeString, setSelectedRelationshipTypeString,
        sidePanelOpen, setSidePanelOpen, 
        sidePanelMode, setSidePanelMode,
        activeDatabase,
        // state promoted to parent so we can preserve the user's selections
        //  when we toggle between MiniView and LargeView
        nodeShowMore, relShowMore,
        setNodeShowMore, setRelShowMore,
        selectedNodes, selectedRels
     } = props;

    let { nodeCount, relCount,
        nodeLabelCounts, relTypeCounts
     } = databaseStatistics;

     let nodeLabels = [];
     let relTypes = [];

     let selectedNodeLabelCounts = {};
     let selectedRelTypeCounts = {};

     if (showStats === Stats.QueryStats) {
        if (dataNodes) {
            nodeCount = Object.keys(dataNodes).length;
        }
        if (dataRels) {
            relCount = Object.keys(dataRels).length;        
        }
    
        if (relTypeMap) {
            relTypes = Object.keys(relTypeMap).sort();
        }
        let relsNotShown = Object.keys(relTypeCounts).filter((rel) => !relTypes.includes(rel)).sort();
        moreRelsToShow = relsNotShown.length > 0;
        if (relShowMore && moreRelsToShow) {
            relTypes = relTypes.concat(relsNotShown);
        }

        // let nodeLabels = Object.keys(nodePaletteConfig).sort();
        if (nodeLabelMap) {
            nodeLabels = Object.keys(nodeLabelMap).sort();
        }
        let nodesNotShown = Object.keys(nodeLabelCounts).filter((node) => !nodeLabels.includes(node)).sort();
        moreNodesToShow = nodesNotShown.length > 0;
        if (nodeShowMore && moreNodesToShow) {
            nodeLabels = nodeLabels.concat(nodesNotShown);
        }
    } else if (showStats === Stats.SelectedStats) {
        selectedNodes.forEach(node => {
            node.labels.forEach(label => {
                let count = selectedNodeLabelCounts[label] || 0;
                selectedNodeLabelCounts[label] = count + 1;
            })
        })
        nodeLabels = Object.keys(selectedNodeLabelCounts).sort();

        selectedRels.forEach(rel => {
            let count = selectedRelTypeCounts[rel.type] || 0;
            selectedRelTypeCounts[rel.type] = count + 1;
        })
        relTypes = Object.keys(selectedRelTypeCounts).sort();
    } else {
        nodeLabels = Object.keys(nodeLabelCounts).sort();
        relTypes = Object.keys(relTypeCounts).sort();
    }

    return (
        <div onClick={collapse} style={{
            // maxWidth: '250px', 
            width: '225px',
            cursor: 'pointer',
            padding: '5px',
            fontSize: '0.9em',
            borderTop: '1px solid lightgrey',
            borderRight: '1px solid lightgrey',
            height: LargeViewHeight,
            background: LargeViewBackgroundColor
        }}>
            <TopBar showStats={showStats} activeDatabase={activeDatabase}
                tooltipMessage={'Click on title or background to collapse'}
                style={{
                    background: 'lightgray',
                    paddingLeft: '3px',
                    paddingRight: '3px',
                    fontWeight: 'bold'
                }}
                sidePanelOpen={sidePanelOpen} 
                setSidePanelOpen={setSidePanelOpen}
                sidePanelMode={sidePanelMode}
                setSidePanelMode={setSidePanelMode}
            />
            <div style={{...style }}>
                <div title="Nodes">
                    <NodeCapsule count={nodeCount} bold={true} extraBottomMargin='2px'/>
                    <div style={{height: '2px', width: '100%', 
                            paddingRight: '3px', borderBottom: '1px solid gray',
                            marginBottom: '2px'
                    }}/>
                    {nodeLabels.length === 0 
                    ? 'No nodes'
                    :
                        nodeLabels.map((nodeLabel,i) => {
                            let color = nodePaletteConfig[nodeLabel] || 'cornflowerblue';

                            let count = 0;
                            if (showStats === Stats.QueryStats) {
                                let nodesForLabel = nodeLabelMap[nodeLabel];
                                count = nodesForLabel ? nodesForLabel.length : 0;
                            } else if (showStats === Stats.SelectedStats) {
                                count = selectedNodeLabelCounts[nodeLabel] || 0;
                            } else {
                                count = nodeLabelCounts[nodeLabel] || 0;
                            }

                            return (
                                <NodeCapsule
                                    setSelectedNodeLabelString={setSelectedNodeLabelString}
                                    
                                    sidePanelOpen={sidePanelOpen} 
                                    setSidePanelOpen={setSidePanelOpen}

                                    selected={selectedNodeLabelString === nodeLabel}
                                    key={nodeLabel}
                                    nodeLabel={nodeLabel}
                                    count={count}
                                    color={color}
                                    extraBottomMargin='3px'
                                    extraLeftMargin={(i === 0) ? '0px' : '3px'}
                                />
                            )
                        })
                    }
                    {moreNodesToShow &&
                        <MoreLess showMore={nodeShowMore} setShowMore={setNodeShowMore}/>
                    }
                </div>
                <div title="Rels" style={{marginTop: '8px'}}>
                    <RelCapsule count={relCount} bold={true} extraBottomMargin='2px'/>
                    <div style={{height: '2px', width: '100%', 
                            paddingRight: '3px', borderBottom: '1px solid gray',
                            marginBottom: '2px'
                    }}/>
                    {relTypes.length === 0 
                    ? 'No rels'
                    :
                        relTypes.map((relType,i) => {
                            let count = 0;
                            if (showStats === Stats.QueryStats) {
                                count = relTypeMap[relType]?.length || 0;
                            } else if (showStats === Stats.SelectedStats) {
                                count = selectedRelTypeCounts[relType] || 0;
                            } else {
                                count = relTypeCounts[relType] || 0;
                            }

                            return (
                                <RelCapsule
                                    setSelectedRelationshipTypeString={setSelectedRelationshipTypeString}
                                        
                                    sidePanelOpen={sidePanelOpen} 
                                    setSidePanelOpen={setSidePanelOpen}

                                    selected={selectedRelationshipTypeString === relType}
                                    key={relType}
                                    relType={relType}
                                    count={count}
                                    // extraBottomMargin='3px'
                                    extraLeftMargin={(i === 0) ? '0px' : '3px'}
                                />
                            )
                        })                        
                    }
                    {moreRelsToShow &&
                        <MoreLess showMore={relShowMore} setShowMore={setRelShowMore}/>
                    }
                </div>                    
            </div>
        </div>
    )
}

export default class GraphSummaryAndConfig extends Component {

    emptyStats = {
        nodeCount: 0,
        relCount: 0,
        nodeLabelCounts: {},
        relTypeCounts: {}
    }

    setNodeShowMore = (value) => {
        this.setState({
            nodeShowMore: value
        })
    }

    setRelShowMore = (value) => {
        this.setState({
            relShowMore: value
        })
    }

    state = {
        dataModel: null,
        activeDatabase: null,
        isError: false,
        errorMessage: '',
        activeLabel: null,
        isExpanded: false,
        isBusy: false,
        databaseStatisticsFetched: false,
        databaseStatistics: { ...this.emptyStats },
        nodeShowMore: false,
        relShowMore: false,
        sidePanelOpen: false,
        sidePanelMode: SidePanelMode.Configure,
        selectedNodeLabel: null,
        selectedNodeLabelString: null,
        selectedRelationshipType: null,
        selectedRelationshipTypeString: null
    }

    setSelectedNodeLabelString = (nodeLabelString) => {
        let { dataModel } = this.state;
        let thingsToSet = {
            selectedNodeLabelString: nodeLabelString,
            selectedNodeLabel: null,
            selectedRelationshipType: null,
            selectedRelationshipTypeString: null
        }
        if (dataModel && nodeLabelString) {
            let nodeLabel = dataModel.getNodeLabelByLabel(nodeLabelString);
            if (nodeLabel) {
                thingsToSet = {
                    ...thingsToSet,
                    selectedNodeLabel: nodeLabel
                }
            }
        } 
        this.setState(thingsToSet)
    }

    setSelectedRelationshipTypeString = (relationshipTypeString) => {
        let { dataModel } = this.state;
        let thingsToSet = {
            selectedRelationshipTypeString: relationshipTypeString,
            selectedRelationshipType: null,
            selectedNodeLabelString: null,
            selectedNodeLabel: null,
        }
        if (dataModel && relationshipTypeString) {
            // note that in the data model we can have the same relationship type name point to different
            //   node labels, e.g. Person-FOLLOWS->Person, Person-FOLLOWS->Company
            let relTypes = dataModel.getRelationshipTypesByType(relationshipTypeString);
            if (relTypes && relTypes.length > 0) {
                thingsToSet = {
                    ...thingsToSet,
                    selectedRelationshipType: relTypes[0]   // pick first one
                }
            }
        } 
        this.setState(thingsToSet)
    }

    setSidePanelMode = (mode) => {
        this.setState({
            sidePanelMode: mode
        })
    }

    setSidePanelOpen = (open) => {
        this.setState({
            sidePanelOpen: open
        })
    }

    setIsExpanded = (expanded) => {
        this.setState({
            isExpanded: expanded
        })
    }

    refresh = (callback) => {
        this.setState({
            databaseStatisticsFetched: false,
            sidePanelOpen: false,
            selectedNodeLabel: null,
            selectedNodeLabelString: null
        }, () => {
            this.getDbInfo({keepTrying: true, callback});
        })
    }

    handleDisconnect = () => {
        this.setState({
            dataModel: null,
            databaseStatisticsFetched: false,
            databaseStatistics: { ...this.emptyStats },
            selectedNodeLabel: null,
            selectedNodeLabelString: null
        });
    }

    statisticsTimer = null;
    checkInterval = 5000;   // 5 seconds
    getDbInfo = (options = {}) => {
        let { keepTrying, callback } = options;
        const { databaseStatisticsFetched } = this.state;
        if (databaseStatisticsFetched) {
            return;
        }

        this.statisticsTimer = setTimeout(() => {
            let connectionInfo = getCurrentConnectionInfo();
            if (connectionInfo) {

                let dbStatsPromise = this.databaseUtil.getDatabaseStatistics()
                let modelPromise = this.databaseUtil.getDataModel();
                let activeDatabasePromise = this.databaseUtil.getActiveDatabase();

                Promise.all([dbStatsPromise, modelPromise, activeDatabasePromise])
                    .then((responses) => {
                        let stats = responses[0];
                        let dataModel = responses[1];
                        let activeDatabase = responses[2];
                        
                        this.setState({
                            databaseStatistics: stats,
                            databaseStatisticsFetched: true,
                            dataModel,
                            activeDatabase
                        })
                        if (typeof(callback) === 'function') {
                            callback({
                                dataModel,
                                databaseStatistics: stats,
                                error: null,
                                activeDatabase
                            })
                        }
                        this.statisticsTimer = null;
                    })
                    .catch(error => {
                        const errorMessage = `${error}`;
                        let stats = { ...this.emptyStats };
                        this.setState({
                            databaseStatistics: stats,
                            databaseStatisticsFetched: true,
                            dataModel: null,
                            activeDatabase: null
                        })                    
                        if (typeof(callback) === 'function') {
                            callback({
                                dataModel: null,
                                databaseStatistics: stats,
                                error: errorMessage
                            })
                        }                        
                        this.statisticsTimer = null;
                        alert(errorMessage);
                    })
            } else {
                if (keepTrying) {
                    this.setTimeout(() => {
                        this.getDbInfo(options);
                    }, this.checkInterval)
                }
            }
        }, 50)
    }

    enhanceDataModel = () => {
        let { dataModel } = this.state;
        let { nodeLabelMap } = this.props;
        let anyAdditions = false;

        if (dataModel && nodeLabelMap) {
          Object.keys(nodeLabelMap).forEach(label => {
            let nodesForLabel = nodeLabelMap[label];
            if (nodesForLabel && nodesForLabel.length > 0) {
              let propKeys = nodesForLabel.reduce((propList, node) => {
                let additionalProps = Object.keys(node.properties)
                  .filter(propKey => !propList.includes(propKey));
                return propList.concat(additionalProps);
              }, []);
    
              var nodeLabel = dataModel.getNodeLabelByLabel(label);
              if (!nodeLabel) {
                  nodeLabel = new dataModel.NodeLabel({
                      label: label
                  });
                  anyAdditions = true;
                  dataModel.addNodeLabel(nodeLabel);
              }
    
              propKeys.forEach(prop => {
                  let existingProp = nodeLabel.getPropertyByName(prop);
                  if (!existingProp) {
                      anyAdditions = true;
                      nodeLabel.addOrUpdateProperty({
                        key: prop, 
                        name: prop
                        // TODO: set datatype properly
                      }, { isPartOfKey: false });
                  }
              })
            }
          })
          if (anyAdditions) {
            // create a new dataModel object to update the state
            // let newDataModel = DataModel().fromSaveObject(dataModel.toSaveObject());
            // this.setState({
            //     dataModel: newDataModel
            // })
            this.setState({
                dataModel: dataModel
            })
          }
        }
    }

    handleNewlySelectedNode = (newlySelectedNode) => {
        let { sidePanelMode, sidePanelOpen } = this.state;
        if (newlySelectedNode && newlySelectedNode.labels && newlySelectedNode.labels[0]) {
            this.setSelectedNodeLabelString(newlySelectedNode.labels[0]);
            if (sidePanelMode === SidePanelMode.Configure) {
                let props = {
                    sidePanelOpen, sidePanelMode,
                    setSidePanelOpen: this.setSidePanelOpen, 
                    setSidePanelMode: this.setSidePanelMode
                }                
                handleSidePanelOpenCloseEvent(SidePanelMode.Properties, props);                
            }
        }        
    }

    handleNewlySelectedRel = (newlySelectedRel) => {
        let { sidePanelMode, sidePanelOpen } = this.state;
        if (newlySelectedRel && newlySelectedRel.type) {
            this.setSelectedRelationshipTypeString(newlySelectedRel.type);
            if (sidePanelMode === SidePanelMode.Configure) {
                let props = {
                    sidePanelOpen, sidePanelMode,
                    setSidePanelOpen: this.setSidePanelOpen, 
                    setSidePanelMode: this.setSidePanelMode
                }                
                handleSidePanelOpenCloseEvent(SidePanelMode.Properties, props);                
            }
        }        
    }

    constructor (props) {
        super(props);

        this.databaseUtil = new DatabaseUtil();
        // this.getDbInfo();
    }

    render () {
        const { 
            isExpanded, databaseStatistics,
            nodeShowMore, relShowMore, dataModel, 
            selectedNodeLabel, selectedNodeLabelString,
            selectedRelationshipType, selectedRelationshipTypeString,
            sidePanelOpen, sidePanelMode,
            activeDatabase
         } = this.state;

        let { nodePaletteConfig, nodeLabelConfig, getNodeCaption,
            updateNodeLabelConfig, updateNodePaletteConfig,
            showStats, selectedNodes, selectedRels
        } = this.props;

        // remove style from props
        let { style, ...otherProps } = this.props;

        // we are setting visibility hidden to hide the initial 'jump' where the 
        //  component gets put into place
        style = {
            visibility: 'hidden',   // this will get overridden by the ...style
            ...style
        }

        // let { maxHeight } = style;
        let extraLargeViewStyle = { 
            // maxHeight: `${pxVal(maxHeight) - 40}px`,
            height: `${pxVal(LargeViewHeight) - 40}px`,
            overflowY: 'auto',
        }

        let extraConfigureNodeLabelStyle = { 
            // maxHeight,
            height: LargeViewHeight,
            // overflowY: 'auto',
        }

        return (
            <div style={style}>
                {isExpanded 
                    ?
                    <div style={{display:'flex', flexFlow: 'row'}}>
                        <LargeView collapse={() => this.setIsExpanded(false)}
                            {...otherProps}
                            style={{...extraLargeViewStyle}}
                            dataModel={dataModel}
                            activeDatabase={activeDatabase}
                            databaseStatistics={databaseStatistics}
                            nodeShowMore={nodeShowMore} 
                            relShowMore={relShowMore}
                            setNodeShowMore={this.setNodeShowMore}
                            setRelShowMore={this.setRelShowMore}

                            sidePanelOpen={sidePanelOpen}
                            setSidePanelOpen={this.setSidePanelOpen}
                            sidePanelMode={sidePanelMode}
                            setSidePanelMode={this.setSidePanelMode}

                            selectedNodeLabelString={selectedNodeLabelString}
                            setSelectedNodeLabelString={this.setSelectedNodeLabelString}
                            selectedRelationshipTypeString={selectedRelationshipTypeString}
                            setSelectedRelationshipTypeString={this.setSelectedRelationshipTypeString}

                            showStats={showStats}
                            selectedNodes={selectedNodes}
                            selectedRels={selectedRels}
                        />
                        {(sidePanelOpen) &&
                            <NodeLabelConfigOrProps 
                                style={{...extraConfigureNodeLabelStyle}}
                                dataModel={dataModel} 

                                nodeLabel={selectedNodeLabel}
                                selectedNodeLabelString={selectedNodeLabelString}
                                relationshipType={selectedRelationshipType}
                                selectedRelationshipTypeString={selectedRelationshipTypeString}

                                nodePaletteConfig={nodePaletteConfig}
                                nodeLabelConfig={nodeLabelConfig}
                                updateNodeLabelConfig={updateNodeLabelConfig}
                                updateNodePaletteConfig={updateNodePaletteConfig}
                                showStats={showStats}
                                selectedNodes={selectedNodes}
                                selectedRels={selectedRels}

                                sidePanelOpen={sidePanelOpen}
                                setSidePanelOpen={this.setSidePanelOpen}
                                sidePanelMode={sidePanelMode}
                                setSidePanelMode={this.setSidePanelMode}

                                getNodeCaption={getNodeCaption}
                            />
                        }
                    </div>
                    :
                    <MiniView 
                        expand={() => this.setIsExpanded(true)} 
                        activeDatabase={activeDatabase}
                        {...otherProps}
                        databaseStatistics={databaseStatistics}
                        showStats={showStats}
                        selectedNodes={selectedNodes}
                        selectedRels={selectedRels}
                    />
                }            
            </div>
        )
    }

}
