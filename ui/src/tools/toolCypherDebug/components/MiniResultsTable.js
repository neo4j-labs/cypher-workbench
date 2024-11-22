import React, { isValidElement, Component } from 'react'
import {
    Table, TableBody, TableCell, 
    TableHead, TableRow
} from '@material-ui/core';
import { getCurrentConnectionInfo } from '../../../common/Cypher';
import { rewriteIntegers } from '../database/databaseUtil';
import MiniResultsTableToolbar, { Sizes as ToolbarSizes} from './MiniResultsTableToolbar';
import { isNode, isRelationship, isPath } from '../../toolCypherBuilder/components/results/ResultsTable';
import { pxVal } from '../CypherDebug';
import { NodeCapsule, RelCapsule } from './Capsules';
import { DisplayTypes } from './MiniResultsTableToolbar';
import { performFullTransform } from '../../../dataModel/graphUtil'; 

const DATABASE_HELP_MESSAGE = "Click here to connect to a database";

const RelDirection = {
    Left: 'left',
    Right: 'right'
}

export default class MiniResultsTable extends Component {

    state = {
        display: DisplayTypes.NodesAndText,
        enableSelect: true,
        lastSelectedRow: -1,
        selectedRowIndexes: []
    }

    isSelected = (index) => {
        let { selectedRowIndexes } = this.state;
        let selected = selectedRowIndexes.includes(index);
        return selected;
    }

    disableTextSelect = (e) => {
        let { enableSelect } = this.state;
        // console.log('disableTextSelect: ', e, enableSelect)

        if (e.shiftKey && enableSelect) {
            this.setState({
                enableSelect: false
            })
        }
    }

    enableTextSelect = (e) => {
        let { enableSelect } = this.state;
        if (!enableSelect) {
            this.setState({
                enableSelect: true
            })
        }
    }

    handleSelection = (index, { shiftKey, metaKey }, callback) => {
        // event.preventDefault();
        let { selectedRowIndexes, lastSelectedRow } = this.state;
        let newIndexes = [];
        if (this.isSelected(index)) {
            if (metaKey) {
                newIndexes = selectedRowIndexes.filter(x => x !== index);
            } else if (shiftKey) {
                if (lastSelectedRow !== -1) {
                    newIndexes = selectedRowIndexes.filter(x => {
                        let start = Math.min(index, lastSelectedRow);
                        let end = Math.max(index, lastSelectedRow);
                        return (x < start || end < x || x === index);
                    });
                }
            } else {
                newIndexes = selectedRowIndexes.length > 1 ? [index] : [];
            }
        } else {
            if (metaKey) {
                newIndexes = selectedRowIndexes.concat(index);
            } else if (shiftKey) {
                if (lastSelectedRow === -1) {
                    newIndexes = [index];    
                } else {
                    newIndexes = selectedRowIndexes;
                    for (let i = Math.min(index, lastSelectedRow); i <= Math.max(index, lastSelectedRow); i++) {
                        if (!this.isSelected(i)) {
                            newIndexes = newIndexes.concat(i);
                        }
                    }
                }
            } else {
                newIndexes = [index];
            }
        }
        this.setState({
            lastSelectedRow: index,
            selectedRowIndexes: newIndexes
        })

        const { handleRowSelection } = this.props;
        if (handleRowSelection) {
            handleRowSelection(newIndexes);
        }
    }

    getSelectStyle = () => {
        let { enableSelect } = this.state;
        let value = (enableSelect) ? 'auto' : 'none';
        return {
            WebkitTouchCallout: value,
            WebkitUserSelect: value,
            KhtmlUserSelect: value,
            MozUserSelect: value,
            MsUserSelect: value,
            UserSelect: value
        }
    }

    setSelectedIndex = (selectedIndex) => {
        this.setState({
            lastSelectedRow: selectedIndex,
            selectedRowIndexes: [selectedIndex]
        }, () => {
            let el = document.getElementById(`miniResultsRow${selectedIndex}`);
            // el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'start' });
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start' });
        })

        const { handleRowSelection } = this.props;
        if (handleRowSelection) {
            handleRowSelection([selectedIndex]);
        }
    }

    goToTop = () => {
        let { rows } = this.props;
        let numRows = rows?.length || 0;
        if (numRows > 0) {
            this.setSelectedIndex(0);
        }
    }

    goUp = () => {
        let { rows } = this.props;
        let { selectedRowIndexes } = this.state;
        let selectedIndex = selectedRowIndexes[0] || 0;
        let numRows = rows?.length || 0;
        if (numRows > 0) {
            let nextIndex = selectedIndex - 1;
            if (nextIndex >= 0) {
                this.setSelectedIndex(nextIndex);
            }
        }
    }

    goDown = () => {
        let { rows } = this.props;
        let { selectedRowIndexes } = this.state;
        let numRows = rows?.length || 0;
        let selectedIndex = selectedRowIndexes[selectedRowIndexes.length-1] || 0;
        if (numRows > 0) {
            let nextIndex = selectedIndex + 1;
            if (nextIndex >= numRows) {
                this.setSelectedIndex(numRows - 1);
            } else {
                this.setSelectedIndex(nextIndex);
            }
        }
    }

    goToBottom = () => {
        let { rows } = this.props;
        let numRows = rows?.length || 0;
        if (numRows > 0) {
            this.setSelectedIndex(numRows - 1);
        }
    }

    nodeTransform = (node) => {
        const { getNodeText, getNodeColor } = this.props;

        return <NodeCapsule
            nodeLabel={getNodeText(node)}
            color={getNodeColor(node)}
        />
    }

    relTransform = (rel) => {
        return <RelCapsule
            marginTop='0px'
            relType={rel.type}
        />
    }

    dashTransform = () => <div>—</div>;   // the dash is an em-dash - https://www.compart.com/en/unicode/U+2014
    leftArrowTransform = () => <div style={{fontSize: 'large'}}>←</div>;  // unicode leftwards arrow - https://www.compart.com/en/unicode/U+2190
    rightArrowTransform = () => <div style={{fontSize: 'large'}}>→</div>; // unicode rightwards arrow - https://www.compart.com/en/unicode/U+2192

    pathTransform = (path) => {
        /*
        you can find out if a segment is reversed by comparing
            segment.relationship.start to segment.start.identity 
            if they are the same, then it's right ->, otherwise it's left <-
            the segment.start and segment.end have all of the info we need, just need to process
            the first segment.start and then all segment.relationship + segment.end 
        */

        let items = [this.nodeTransform(path.start)];

        path.segments.forEach(segment => {
            let direction = (segment.relationship.start === segment.start.identity)
                                ? RelDirection.Right : RelDirection.Left;

            if (direction === RelDirection.Right) {
                items.push(this.dashTransform())
            } else {
                items.push(this.leftArrowTransform())
            }
            items.push(this.relTransform(segment.relationship))

            if (direction === RelDirection.Right) {
                items.push(this.rightArrowTransform())
            } else {
                items.push(this.dashTransform())
            }

            items.push(this.nodeTransform(segment.end))
        })
        return (
            <div style={{
                display:'flex', 
                flexFlow: 'row',
                alignItems: 'center'
            }}>
                {items}
            </div>
        );
    }
    
    indentSpaces = '  ';

    getIndent = (indent) => 
        [...Array(indent).keys()].reduce((runningIndent, _) => runningIndent + this.indentSpaces, '');

    doNestedObjectOrArrayTransform = (item) => {
        let transformMap = {
            ArrayOpen: ({indentLevel}) => `${this.getIndent(indentLevel)}[`,
            ArrayItemOpen: ({indentLevel}) => `\n${this.getIndent(indentLevel)}`,
            ArrayItemSeparator: ({isLastItem}) => `${isLastItem ? '' : ','}`,
            ArrayClose: ({indentLevel}) => `\n${this.getIndent(indentLevel)}]`,
            ObjectOpen: ({indentLevel}) => `${this.getIndent(indentLevel)}{`,
            // ObjectKey: ({indentLevel, key}) => `\n${this.getIndent(indentLevel)}${key}`,            
            // ObjectKeySeparator: () => ': ',
            // ObjectValueSeparator: ({isLastItem}) => `${isLastItem ? '' : ','}`,

            ObjectKeyValue: ({indentLevel, key, item, isLastItem}) => {
                // console.log('item: ', item);
                return (
                    <div style={{display: 'flex', flexFlow: 'row'}}>
                        <div>{this.getIndent(indentLevel)}{key}: </div>
                        <div>{item}{isLastItem ? '' : ','}</div>
                    </div>
                )
            },
            ObjectClose: ({indentLevel}) => `${this.getIndent(indentLevel)}}`,
            Value: ({item}) => `${item}`,

            // custom transforms
            Path: {
                requiredKeys: ['start','end','segments'],
                func: ({item,indentLevel}) => this.pathTransform(item)
            },
            Rel: {
                requiredKeys: ['identity','start','end','type','properties'],
                func: ({item,indentLevel}) => this.relTransform(item)
            },
            Node: {
                requiredKeys: ['identity','labels','properties'],
                func: ({item,indentLevel}) => this.nodeTransform(item)
            }
        }

        let transformedItem = performFullTransform(item, transformMap);
        return <pre>{transformedItem}</pre>;        
    }

    switchDisplay = (value) => {
        this.setState({
            display: value
        })    
    }

    stringify = (value) => {
        let { display } = this.state;
        if (display === DisplayTypes.CompactText) {
            value = JSON.stringify(value);        
        } else {
            value = JSON.stringify(value, null, 4);
        }
        return value;        
    }

    getValueCell = (value) => {
        const { display } = this.state;

        let element = null;
        if (display === DisplayTypes.NodesAndText) {
            if (isNode(value)) {
                element = this.nodeTransform(value);
            } else if (isRelationship(value)) {
                element = this.relTransform(value);
            } else if (isPath(value)) {
                element = this.pathTransform(value);
            } else if (value && typeof(value) === 'function') {
                element = value();
            } else if (value && typeof(value) === 'object') {
                // value = (typeof(value) === 'string') ? value : this.stringify(value); 
                // element = <pre style={{fontSize: '0.9em'}}>{value}</pre>            
                element = this.doNestedObjectOrArrayTransform(value);
            } else {
                value = (typeof(value) === 'string') ? value : this.stringify(value); 
                element = <pre style={{fontSize: '0.9em'}}>{value}</pre>            
            }
        } else {
            value = (typeof(value) === 'string') ? value : this.stringify(value); 
            element = <pre style={{fontSize: '0.9em'}}>{value}</pre>            
        }
        // return element;
        return <pre>{element}</pre>
    }

    reRender = () => {
        this.forceUpdate();
    }

    render = () => {
        let { display } = this.state;
        let { headers, rows, resultTableHeight, width, numRows, visible } = this.props
        const connectionActive = (getCurrentConnectionInfo()) ? true : false;

        rows = rewriteIntegers(rows);

        let tableHeight = resultTableHeight - pxVal(ToolbarSizes.ToolbarHeight);

        return (
            <div style={{display:'flex', flexFlow: 'column', visibility: visible ? 'visible' : 'hidden'}}>
                <div style={{border: '1px solid lightgrey', width: width}}>
                {(headers.length !== 0) ? 
                    <div style={{
                        marginTop: '.5em', 
                        height: `${tableHeight}px`,
                        overflowX: 'scroll', 
                        overflowY: 'scroll'
                    }}>
                        <Table id="debugResultTable" stickyHeader aria-label="table" /* sticky */
                            onClick={() => {
                                // console.log('focusing');
                                document.getElementById("debugResultTable").focus()
                            }}
                            onKeyDown={(e) => this.disableTextSelect(e)}
                            onKeyUp={(e) => this.enableTextSelect(e)} 
                            style={this.getSelectStyle()}
                            tabIndex="0"
                        >
                            <TableHead>
                            <TableRow id={'miniResultsRowHeader'}>
                                <TableCell key={'_#'} style={{paddingTop: '5px', paddingBottom: '5px'}}>#</TableCell>
                                {headers.map((header,index) =>
                                    <TableCell key={index} style={{paddingTop: '5px', paddingBottom: '5px'}}>{header}</TableCell>
                                )}
                            </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row,index) =>
                                    <TableRow key={index} hover={true} id={`miniResultsRow${index}`} 
                                        style={{ background: this.isSelected(index) ? 'lightblue' : 'inherit' }}
                                        onClick={(e) => this.handleSelection(index, e)}
                                    >
                                        <TableCell style={{cursor: 'pointer'}} key={'_#'}>{index+1}</TableCell>
                                        {Object.keys(row).map(header => {
                                            var value = row[header];
                                            return (
                                                <TableCell style={{cursor: 'pointer'}} key={header}>
                                                    {(connectionActive) ? 
                                                        this.getValueCell(value) :
                                                        <>
                                                            {this.getValueCell(value)}
                                                            <span className='fa fa-question-circle' 
                                                                style={{marginLeft: '.3em', cursor: 'pointer'}}
                                                                onClick={()=>window.showDatabaseHelpMessage(DATABASE_HELP_MESSAGE)}>
                                                            </span>
                                                        </>                                  
                                                    }
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    :
                    <div style={{
                        padding: '5px', height: `${tableHeight + 8}px`,
                    }}>
                        {(connectionActive) ? 
                            'No results' :
                            <>
                                <span>Connect to a database to run cypher</span>
                                <span className='fa fa-question-circle' 
                                    style={{marginLeft: '.3em', cursor: 'pointer'}}
                                    onClick={()=>window.showDatabaseHelpMessage(DATABASE_HELP_MESSAGE)}>
                                </span>
                            </>                                  
                        }
                    </div>
                }
                <MiniResultsTableToolbar numRows={numRows}
                    goToTop={this.goToTop}
                    goUp={this.goUp} 
                    goDown={this.goDown}
                    goToBottom={this.goToBottom}
                    display={display}
                    switchDisplay={this.switchDisplay}
                />
            </div>
        </div>

        )
    }
} 