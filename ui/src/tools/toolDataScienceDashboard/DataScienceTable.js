import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import LinearProgress from '@material-ui/core/LinearProgress';
import ErrorIcon from '@material-ui/icons/Error';

const useRowStyles = makeStyles({
    root: {
        '& > *': {
            borderBottom: 'unset',
        },
    },
});

function LinearProgressWithLabel(props) {
    return (
        <Box display="flex" alignItems="center">
            <Box width="100%" mr={1}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box minWidth={35}>
                <Typography variant="body2" color="textSecondary">{`${Math.round(
                    props.value,
                )}%`}</Typography>
            </Box>
        </Box>
    );
}

LinearProgressWithLabel.propTypes = {
    /**
     * The value of the progress indicator for the determinate and buffer variants.
     * Value between 0 and 100.
     */
    value: PropTypes.number.isRequired,
};


function Row(props) {
    var row = props.row || {};
    const [open, setOpen] = React.useState(false);
    const classes = useRowStyles();

    return (
        <React.Fragment>
            {/*<button onClick={result}>Click me</button>*/}
            <TableRow className={classes.root} key={row.serviceID}>
                <TableCell>
                    <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">{row.name}</TableCell>
                <TableCell align="right">{row.serviceID}</TableCell>
                <TableCell align="right">{row.startDate}</TableCell>
                <TableCell align="right">{row.status}</TableCell>
                <TableCell align="right">{row.endDate}</TableCell>
                <TableCell align="right">{row.description}</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                            <Typography variant="h6" gutterBottom component="div">
                                Pipelines
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow >
                                        <TableCell>Name</TableCell>
                                        <TableCell>Start Date</TableCell>
                                        <TableCell align="right">Progress</TableCell>
                                        <TableCell align="right">Total Time (in seconds)</TableCell>
                                        <TableCell align="right">Status</TableCell>
                                        <TableCell align="right">Errors</TableCell>
                                        <TableCell align="right">Processed Records</TableCell>
                                        <TableCell align="right">Rows/second</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        row.pipelines.map((pipelineRow) => (
                                            <TableRow key={pipelineRow.name}>
                                                <TableCell component="th" scope="row">
                                                    {pipelineRow.name}
                                                </TableCell>
                                                <TableCell component="th" scope="row">
                                                    {pipelineRow.startDate}
                                                </TableCell>
                                                <TableCell><div className={classes.root}>
                                                    {isNaN(pipelineRow.progress)
                                                        ? <LinearProgress />
                                                        : <LinearProgressWithLabel value={pipelineRow.progress} />}
                                                </div></TableCell>
                                                <TableCell align="right">{pipelineRow.totalTime}</TableCell>
                                                <TableCell align="right">
                                                    {pipelineRow.status}
                                                </TableCell>
                                                <TableCell> {pipelineRow.errors > 0 ? <a>< ErrorIcon color="error" fontSize="small" />{pipelineRow.errors}</a> : pipelineRow.errors}</TableCell>
                                                <TableCell align="right">{pipelineRow.processedRecords}</TableCell>
                                                <TableCell align="right">{pipelineRow.speed}</TableCell>
                                            </TableRow>
                                        ))
                                    }
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
    // }
};

export default function CollapsibleTable(props) {
    const { jobStatusRowsArray } = props;
    return (
        <TableContainer component={Paper}>
            <Table aria-label="collapsible table">
                <TableHead>
                    <TableRow>
                        <TableCell />
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Hop Server Object ID</TableCell>
                        <TableCell align="right">Start Date</TableCell>
                        <TableCell align="right">Status</TableCell>
                        <TableCell align="right">End Date</TableCell>
                        <TableCell align="right">Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {jobStatusRowsArray ? jobStatusRowsArray.map((row) => (
                        <Row key={row.name} row={row} />
                    )) : null}
                </TableBody>
            </Table>
        </TableContainer>
    );
}