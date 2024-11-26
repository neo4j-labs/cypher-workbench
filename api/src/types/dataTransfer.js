
export default `

input JobInfo {
    jobType: String
    jobParameters: JSON
}

type JobStatusVariables @exclude {
    STATUS: JSON
    MAX: String
    COUNTER: String
  }
  
  type JobDetails @exclude {
    service: String!
    id: String
    startDate: String
    endDate: String
    statusDescription: String
    statusVariables: JSON
  }
  
  type PipelineStatus @exclude {
    name: String
    id: String
  }

type Query {
    getDataSourceSchema (connectionInfo: JSON): JSON
    jobStatus (jobId: String): JSON
    getProjects: JSON
    getDatasets (projectId: String): JSON
    getDatasetSchema (projectId: String, datasetId: String): JSON
    getPipelineDetails(serviceId: String): PipelineStatus
    getJobDetails (service: String, id: String): JSON
    getAllJobs: JSON
}

type Mutation {
    runJob (jobInfo: String): JSON
    runJobAsync (jobInfo: String): JSON
    runWorkflow (serviceId: String, mappingData: JSON): JSON
    runNeo4jToBigQuery (serviceId: String, cypherStatement: JSON): JSON
    runNeo4jToNeo4j(serviceId: String, neoMapping: JSON): JSON
}
`;

