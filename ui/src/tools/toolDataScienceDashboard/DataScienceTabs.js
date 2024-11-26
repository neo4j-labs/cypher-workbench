import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import CollapsibleTable from './DataScienceTable'

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`wrapped-tabpanel-${index}`}
            aria-labelledby={`wrapped-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `wrapped-tab-${index}`,
        'aria-controls': `wrapped-tabpanel-${index}`,
    };
}

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
    },
}));

export default function TabsWrappedLabel(props) {

    const { jobStatusRowsArray } = props;

    // Filtering the jobStatusRowsArray based on the workflow name to display the collapsible table based on the selected tab type

    const bigQueryToNeo4j = jobStatusRowsArray.filter(x => x.name === "bigquery-neo4j-incremental");
    const neo4jToNeo4j = jobStatusRowsArray.filter(x => x.name === "neo4j-to-neo4j");
    const neo4jToBigQuery = jobStatusRowsArray.filter(x => x.name === "neo4j-to-bigquery");


    const classes = useStyles();
    const [value, setValue] = React.useState('one');

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <div className={classes.root}>
            <AppBar position="static">
                <Tabs value={value} onChange={handleChange} aria-label="wrapped label tabs example">
                    <Tab value="one" label="BigQuery to Neo4j" {...a11yProps('one')} />
                    <Tab value="two" label="Neo4j to BigQuery" {...a11yProps('two')} />
                    <Tab value="three" label="Neo4j to Neo4j" {...a11yProps('three')} />
                </Tabs>
            </AppBar>
            <TabPanel value={value} index="one">
                BigQuery to Neo4j Export Status
                <CollapsibleTable jobStatusRowsArray={bigQueryToNeo4j} />
            </TabPanel>
            <TabPanel value={value} index="two">
                Neo4j to BigQuery Export Status
                <CollapsibleTable jobStatusRowsArray={neo4jToBigQuery} />
            </TabPanel>
            <TabPanel value={value} index="three">
                Neo4j to Neo4j Export Status
                <CollapsibleTable jobStatusRowsArray={neo4jToNeo4j} />
            </TabPanel>
        </div>
    );
}