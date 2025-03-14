
export const ValidationTerms = {
    Error: 'Error',
    Pass: 'Pass',
    NoData: 'No Data'
}

export const sleep = async (howLong) => {
    return await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, howLong)
    })
}

export const runValidation = async (debugSteps, cypherParameters, functions) => {

    let {
        executeCypherAsPromise,
        getDebugCypherToRunFunction,
        checkIfUserHasCancelledFunction,
        reportStatusFunction
    } = functions; 

    let options = { dontStringify: true };

    while (debugSteps.canStepForward() && !checkIfUserHasCancelledFunction()) {
        // console.log('userHasCancelled: ', checkIfUserHasCancelledFunction());
        debugSteps.internalStepForward();    
        let { cypherToRun, activeStep, activeInternalStep } = getDebugCypherToRunFunction(debugSteps, { limitOverride: 1 });    
        if (cypherToRun) {
            try {
                let results = await executeCypherAsPromise(cypherToRun, cypherParameters, null, options);
                let { headers, rows, isError } = results;
                let errorMessage = '';
                if (isError) {
                    errorMessage = rows[0][headers[0]];
                } 
        
                await reportStatusFunction({
                    cypher: cypherToRun,
                    activeStep,
                    activeInternalStep,
                    rows,
                    headers,
                    isError,
                    errorMessage
                });
        
            } catch (e) {
                await reportStatusFunction({
                    cypher: cypherToRun,
                    activeStep,
                    activeInternalStep,
                    rows: [],
                    headers: [],
                    isError: true,
                    errorMessage: `${e}`
                });
            }
        } 
        // await sleep(5000);
        await sleep(10);
    }
    // console.log('userHasCancelled (2): ', checkIfUserHasCancelledFunction());
}