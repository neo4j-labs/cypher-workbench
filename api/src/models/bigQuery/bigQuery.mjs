//  https://cloud.google.com/bigquery/docs/reference/libraries

let BigQuery = null;
console.log("Loading bigquery.mjs");

const loadBigQueryModule = () => {
  if (!BigQuery) {
    try {
      console.log("Loading BigQuery");  
      let BigQueryModule = require('@google-cloud/bigquery');
      BigQuery = BigQueryModule.BigQuery;
      console.log("BigQuery Loaded");       
    } catch (e) {
      console.log("can't initialize BigQuery", e);
    }
  }
}

var _bigquery = null;
const getBigQuery = () => {
    if (!_bigquery) {
      loadBigQueryModule();
      console.log("Initializing BigQuery");  
      _bigquery = new BigQuery();
      console.log("BigQuery Initialized");  
    }
    return _bigquery;
} 

export const runBigQuery = async (query, location) => {
  // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: location,
  };

  let bigquery = getBigQuery();

  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  //console.log(`Job ${job.id} started.`);

  // Wait for the query to finish
  const [rows] = await job.getQueryResults();

  // Print the results
  //console.log('Rows:');
  //rows.forEach(row => console.log(row));
  return rows;
}

const runTest = async () => {
  const projectId = 'big-query-project-id';
  const query = `SELECT schema_name FROM \`${projectId}\`.INFORMATION_SCHEMA.SCHEMATA`

  const rows = await runBigQuery(query, 'US');
  console.log('Rows:');
  console.log(rows);
  //rows.map(row => console.log(row));
}

//runTest();


