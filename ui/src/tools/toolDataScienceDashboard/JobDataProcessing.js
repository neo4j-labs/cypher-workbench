
import {
    getJobDetails
} from '../../persistence/graphql/GraphQLDataTransfer';

export const getResults = (response) => {
    let rowArray = []
    let ProcessedRecords = 0
    let Total = 0
    let TotalSeconds = 0
    let Speed = 0
    let actualProcessedRecords = 0
    if (response.pipelineStatuses.length > 0) {
        response.pipelineStatuses.forEach(job => {
            job.transformStatusList.forEach(transforms => {
                // the neo4j graph output will show the display the records as they are being processed
                if (transforms.transformName === "Neo4j Graph Output" || transforms.transformName === "exported_neo4j_data_csv") {
                    TotalSeconds = transforms.seconds
                    ProcessedRecords += transforms.linesOutput
                    actualProcessedRecords += transforms.linesOutput
                    Speed += parseInt(transforms.speed.replace(/[ ,]+/g, ""));
                }
                else if (transforms.transformName === "exported_neo4j_data_csv") {
                    TotalSeconds = transforms.seconds
                    ProcessedRecords += transforms.linesOutput
                    Total = 0
                    actualProcessedRecords = 0
                    Speed += parseInt(transforms.speed.replace(/[ ,]+/g, ""));
                }
                // the big query record count calculates the row count which will be useful for computing the progress
                else if (transforms.transformName === "bigquery-record-count") {
                    Total += transforms.linesOutput;
                }
            })

            rowArray.push({
                "name": job.pipelineName,
                "startDate": (job.executionStartDate && job.executionStartDate.slice) ? job.executionStartDate.slice(0, 19) : '',
                "progress": findProgress(job, actualProcessedRecords, Total),
                "totalTime": TotalSeconds,
                "errors": job.nrTransformErrors,
                "processedRecords": ProcessedRecords,
                "status": job.statusDescription,
                "speed": Speed
            });
            Speed = 0;
            ProcessedRecords = 0;

        })
    }
    return { "pipelines": rowArray }
}

export const findProgress = (job, actualProcessedRecords, Total) => {
    if (job.statusDescription === "Finished") {
        return 100
    }
    else {
        if (roundToTwo((actualProcessedRecords / Total) * 100) > 100) {
            return 100
        }
        else if (job.statusDescription === "Finished (with errors)") {
            return 0
        }
        else if (roundToTwo((actualProcessedRecords / Total) * 100) === NaN) {
            return 0
        }
        else if (actualProcessedRecords === 0 & Total === 0) {
            return 0
        }
        else {
            return roundToTwo((actualProcessedRecords / Total) * 100)
        }
    }
}

export const getWorkflowResult = (response) => {
    if (response.endDate) {
        return {
            "name": response.service,
            "serviceID": response.id,
            "startDate": response.startDate.slice(0, 19),
            "status": response.statusDescription,
            "description": response.statusVariables.STATUS,
            "endDate": response.endDate.slice(0, 19)
        };
    }
    return {
        "name": response.service,
        "serviceID": response.id,
        "startDate": response.startDate.slice(0, 19),
        "status": response.statusDescription,
        "description": response.statusVariables.STATUS
    };
}

export const roundToTwo = (num) => {
    return +(Math.round(num + "e+2") + "e-2");
}

export const getAllJobDetails = async (WorkflowList) => {
    var promises = WorkflowList.map(workflow => {
        return new Promise((resolve, reject) => {
            getJobDetails(workflow.workflowName, workflow.id, (response) => {
                var rowsArray = [];
                if (response && response.data && response.data.getJobDetails) {
                    // creates a workflow object for top level details
                    var workflowObj = getWorkflowResult(response.data.getJobDetails)
                    // creates a pipelines detail object
                    var pipelinesArrayObj = getResults(response.data.getJobDetails)
                    let row = {
                        ...workflowObj,
                        ...pipelinesArrayObj
                    };
                    // creates an array of workflows, each having an array of pipeline/s
                    rowsArray.push(row);
                }
                resolve(rowsArray);
            })
        })
    });
    var allRows = [];
    await Promise.all(promises).then((arrayOfRowsArrays) => {
        arrayOfRowsArrays.map(rowArray => {
            rowArray.map(row => allRows.push(row));
        })
    });
    allRows.sort(function (a, b) {
        var dateA = new Date(a.startDate), dateB = new Date(b.startDate)
        return dateB - dateA
    });
    return allRows;
}
