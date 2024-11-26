import React, { Component } from 'react'
import {
    IconButton, 
    Table, TableBody, TableCell, 
    TableHead, TableRow, Tooltip
} from '@material-ui/core';
import { OutlinedStyledButton } from '../../../../components/common/Components';

const Sizes = {
    ToolbarHeight: '40px'
}

const pxVal = (px) => typeof(px) === 'string' ? parseInt(px.replace(/px$/,'')) : px;

export default class ResultsTable extends Component {

    state = {
        headers: [],
        rows: [],
        tableHeight: 400
    }

    setData = (data) => {
        var { headers, rows } = data;
        //console.log('ResultsTable setData headers + rows', headers, rows);
        this.setState({
            headers: headers,
            rows: rows
        });
    }
    
    setTableHeight = () => {
        var { cypherBuilder } = this.props;

        var bottomDrawerOpenHeight = cypherBuilder.getBottomDrawerOpenHeight();
        var cypherEditorOffset = cypherBuilder.getSizeValue('CypherEditorOffset');
        var height = bottomDrawerOpenHeight - cypherEditorOffset - pxVal(Sizes.ToolbarHeight);

        this.setState({
            tableHeight: height
        })
    }

    render () {
        var { 
            headers, rows, tableHeight
        } = this.state;
        const { revalidate } = this.props;

        var headers = headers || [];
        var rows = rows || [];

        return (
            <>
            <div style={{height: Sizes.ToolbarHeight, border: '1px solid lightgray'}}>
                {/*
                <Tooltip enterDelay={600} arrow title="Revalidate">
                    <IconButton aria-label="Revalidate" onClick={this.revalidate}>
                        <span className='runCypherButton1 fa fa-tasks' />
                    </IconButton>
                </Tooltip>
                */}                
                <span style={{marginLeft: '1em', color: 'black', marginRight: '2.5em'}}>Num Validation Errors 
                    <span style={{marginLeft: '0.5em', color: 'black'}}>{rows.length}</span>
                </span>
                <OutlinedStyledButton style={{height: '1.8em'}} onClick={revalidate}>
                    Revalidate
                </OutlinedStyledButton>
            </div>  
            <div style={{display:'flex',flexFlow:'row'}}>
                <div style={{width: '100%'}}>
                    {(headers.length !== 0) ? 
                        <div style={{
                            marginTop: '.5em', 
                            height: tableHeight, 
                            overflowX: 'scroll', 
                            overflowY: 'scroll'
                        }}>
                            <Table stickyHeader aria-label="sticky table">
                                {/*
                                <TableHead>
                                <TableRow>
                                    {headers.map((header,index) =>
                                        <TableCell key={index} style={{paddingTop: '8px', paddingBottom: '8px'}}>{header}</TableCell>
                                    )}
                                </TableRow>
                                </TableHead>
                                */}
                                <TableBody>
                                    {rows.map((row,index) =>
                                        <TableRow key={index} hover={true}>
                                            {Object.keys(row).map(header => {
                                                var value = row[header];
                                                return (
                                                    <TableCell style={{cursor: 'pointer'}} key={header}>
                                                        {value}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    :
                        <div style={{padding: '10px'}}>
                            
                        </div>
                    }
                </div>
            </div>                  
            </>
        )
    }
}
