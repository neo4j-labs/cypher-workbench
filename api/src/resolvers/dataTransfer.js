import {
    getDataSourceSchema,
    runJob,
    runJobAsync,
    jobStatus,
    getProjects,
    getDatasets,
    getDatasetSchema,
    getJobDetails,
    getPipelineDetails,
    getAllJobs,
    runWorkflow,
    runNeo4jToBigQuery,
    runNeo4jToNeo4j
} from "../models/dataTransfer";

export default {
    Query: {
        getDataSourceSchema: async (obj, args, context, resolveInfo) => {
            return await getDataSourceSchema(args.connectionInfo, context);
        },
        jobStatus: async (obj, args, context, resolveInfo) => {
            return await jobStatus(args.jobId, context);
        },
        getProjects: async (obj, args, context, resolveInfo) => {
            return await getProjects(context);
        },
        getDatasets: async (obj, args, context, resolveInfo) => {
            return await getDatasets(args.projectId, context);
        },
        getDatasetSchema: async (obj, args, context, resolveInfo) => {
            return await getDatasetSchema(args.projectId, args.datasetId, context);
        },
        getJobDetails: async (obj, args, context, resolveInfo) => {
            return await getJobDetails(args.id, args.service, context);
        },
        getPipelineDetails: async (obj, args, context, resolveInfo) => {
            return await getPipelineDetails(args.serviceId);
        },
        getAllJobs: async (obj, args, context, resolveInfo) => {
            return await getAllJobs(context);
        }
    },

    Mutation: {
        runJob: async (obj, args, context, resolveInfo) => {
            return await runJob(args.jobInfo, context);
        },
        runJobAsync: async (obj, args, context, resolveInfo) => {
            return await runJobAsync(args.jobInfo, context);
        },
        runWorkflow: async (obj, args, context, resolveInfo) => {
            return await runWorkflow(args.serviceId, args.mappingData, context);
        },
        runNeo4jToBigQuery: async (obj, args, context, resolveInfo) => {
            return await runNeo4jToBigQuery(args.serviceId, args.cypherStatement, context);
        },
        runNeo4jToNeo4j: async (obj, args, context, resolveInfo) => {
            return await runNeo4jToNeo4j(args.serviceId, args.neoMapping, context);
        }
    }
};

