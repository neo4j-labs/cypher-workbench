import { gql } from "@apollo/client";

import { getClient, handleError } from './GraphQLPersistence';

export function getDataSourceSchema(connectionInfo, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query GetDataSourceSchema ($connectionInfo: JSON) {
                getDataSourceSchema(connectionInfo: $connectionInfo)
            }
        `,
        variables: {
            connectionInfo: connectionInfo
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.getDataSourceSchema });
        })
        .catch(error => {
            handleError(getDataSourceSchema, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function getDatasets(projectId, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query GetDatasets ($projectId: String){
                getDatasets (projectId: $projectId)
            }
        `,
        variables: {
            projectId: projectId
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.getDatasets });
        })
        .catch(error => {
            handleError(getDatasets, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function getDatasetSchema(projectId, datasetId, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query GetDatasetSchema ($projectId: String, $datasetId: String){
                getDatasetSchema (projectId:$projectId, datasetId:$datasetId)
            }
        `,
        variables: {
            projectId: projectId,
            datasetId: datasetId
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.getDatasetSchema });
        })
        .catch(error => {
            handleError(getDatasetSchema, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function runJob(jobType, jobParameters, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
        mutation: gql`
          mutation RunJob($jobInfo:JobInfo) {
          	runJob (jobInfo:$jobInfo)
          }
      `,
        variables: {
            jobInfo: {
                jobType: jobType,
                jobParameters: jobParameters
            }
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.runJob });
        })
        .catch((error) => {
            handleError(runJob, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function runJobAsync(jobType, jobParameters, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
        mutation: gql`
          mutation RunJobAsync($jobInfo:JobInfo) {
          	runJobAsync (jobInfo:$jobInfo)
          }
      `,
        variables: {
            jobInfo: {
                jobType: jobType,
                jobParameters: jobParameters
            }
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.runJobAsync });
        })
        .catch((error) => {
            handleError(runJobAsync, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

// runs the workflow for Apache Job
export function runWorkflow(serviceID, mappingData, callback, doTokenExpiredErrorHandling = true) {

    getClient().mutate({
        mutation: gql`
          mutation RunWorkflow($serviceId:String, $mappingData: JSON) {
            runWorkflow (serviceId:$serviceId, mappingData: $mappingData)
          }
      `,
        variables: {
            serviceId: serviceID,
            mappingData: mappingData
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.runWorkflow });
        })
        .catch((error) => {
            handleError(runWorkflow, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function runNeo4jToBigQuery(serviceID, cypherStatementJSON, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
        mutation: gql`
          mutation RunNeo4jToBigQuery($serviceId:String, $cypherStatement: JSON) {
            runNeo4jToBigQuery (serviceId:$serviceId, cypherStatement: $cypherStatement)
          }
      `,
        variables: {
            serviceId: serviceID,
            cypherStatement: cypherStatementJSON
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.runNeo4jToBigQuery });
        })
        .catch((error) => {
            handleError(runNeo4jToBigQuery, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function runNeo4jToNeo4j(serviceID, neoMapping, callback, doTokenExpiredErrorHandling = true) {
    getClient().mutate({
        mutation: gql`
          mutation runNeo4jToNeo4j($serviceId:String, $neoMapping: JSON) {
            runNeo4jToNeo4j (serviceId:$serviceId, neoMapping: $neoMapping)
          }
      `,
        variables: {
            serviceId: serviceID,
            neoMapping: neoMapping
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.runNeo4jToNeo4j });
        })
        .catch((error) => {
            handleError(runNeo4jToNeo4j, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function jobStatus(jobId, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query JobStatus ($jobId: String) {
                jobStatus(jobId: $jobId)
            }
        `,
        variables: {
            jobId: jobId
        }
    })
        .then(result => {
            callback({ success: true, data: result.data.jobStatus });
        })
        .catch(error => {
            handleError(jobStatus, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function getPipelineDetails(service, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query PipelineDetails ($service: String) {
                getPipelineDetails(service: $service)
            }
        `,
        variables: {
            service: service
        }
    })
        .then(result => {
            callback({ success: true, data: result.data });
        })
        .catch(error => {
            handleError(getPipelineDetails, arguments, callback, error, doTokenExpiredErrorHandling);
        });
}

export function getJobDetails(service, id, callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
            query JobDetails ($service: String, $id: String) {
                getJobDetails(service: $service, id : $id)
            }
        `,
        variables: {
            service: service,
            id: id
        }
    })
        .then(result => {
            callback({ success: true, data: result.data });
        })
        .catch(error => {
            handleError(getJobDetails, arguments, callback, error, doTokenExpiredErrorHandling);
        });
};

export function getAllJobs(callback, doTokenExpiredErrorHandling = true) {
    getClient().query({
        query: gql`
        query GetAllJobs{
            getAllJobs
          }
        `
    })
        .then(result => {
            callback({ success: true, data: result.data });
        })
        .catch(error => {
            handleError(getAllJobs, arguments, callback, error, doTokenExpiredErrorHandling);
        });
};


