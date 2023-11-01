
export const DebugStepResult = {
    SteppedOk: "SteppedOk",
    NoMoreSteps: "NoMoreSteps"
}

export const debugStep = (cypher, internalCypherDebugSnippets) => {
    var debugSteps = null;
    if (internalCypherDebugSnippets) {
        internalCypherDebugSnippets = internalCypherDebugSnippets.map(x => new DebugStep({ cypher: x }));
        debugSteps = new DebugSteps({ steps: internalCypherDebugSnippets, stepsAreAdditive: false });
    }
    return new DebugStep({ cypher: cypher, internalSteps: debugSteps });
}

export class DebugStep {

    constructor (properties) {
        properties = properties || {};
        const { 
            cypher,
            internalSteps,
            isBreakpoint
        } = properties;

        if (internalSteps) {
            if (!(internalSteps instanceof DebugSteps)) {
                throw new Error('Step internalSteps must be of type DebugSteps');
            }
        }

        this.cypher = cypher;
        this.internalSteps = (internalSteps) ? internalSteps : null;
        this.isBreakpoint = (isBreakpoint) ? true : false;
    }

    setIsBreakpoint = (isBreakpoint) => this.isBreakpoint = isBreakpoint;

    getCypher = () => {
        if (this.internalSteps && this.internalSteps.activeStepIndex !== -1) {
            return this.internalSteps.getCypher();
        } else {
            return this.cypher;
        }
    }

    hasInternalSteps = () => (this.internalSteps !== null);

    runToNextInternalBreakpoint = () => {
        if (this.internalSteps !== null) {
            //console.log('internalSteps not null')
            const start = this.internalSteps.activeStepIndex + 1;
            //console.log('start: ', start)
            var nextBreakpoint = this.internalSteps.steps.slice(start).findIndex(step => step.isBreakpoint);
            //console.log('nextBreakpoint: ', nextBreakpoint)
            if (nextBreakpoint !== -1) {
                this.internalSteps.activeStepIndex = nextBreakpoint;
            }
            return (nextBreakpoint >= 0) ? nextBreakpoint : -1;
        } else {
            //console.log('return -1')
            return -1;
        }
    }

    resetInternalActiveStepIndex = () => {
        if (this.internalSteps !== null) {
            this.internalSteps.resetActiveStepIndex();
        }
    }

    setInternalActiveStepIndexToStart = () => {
        if (this.internalSteps !== null) {
            this.internalSteps.setActiveStepIndexToStart();
        }
    }

    setInternalActiveStepIndexToEnd = () => {
        if (this.internalSteps !== null) {
            this.internalSteps.setActiveStepIndexToEnd();
        }
    }

    getInternalStepAtIndex = (index) => (this.internalSteps) ? this.internalSteps.steps[index] : null;
    getInternalActiveStepIndex = () => (this.internalSteps) ? this.internalSteps.activeStepIndex : -1;
    getNumberOfInternalSteps = () => (this.internalSteps) ? this.internalSteps.steps.length : 0;

    firstStep = () => (this.internalSteps) ? this.internalSteps[0] : null;

    stepForward = () => {
        if (this.internalSteps) {
            return this.internalSteps.stepForward();
        } else {
            return DebugStepResult.NoMoreSteps;
        }
    }

    stepBackward = () => {
        if (this.internalSteps) {
            return this.internalSteps.stepBackward();
        } else {
            return DebugStepResult.NoMoreSteps;
        }
    }

    canStepForward = () => (this.internalSteps) ? this.internalSteps.canStepForward() : false;
    canStepBackward = () => (this.internalSteps) ? this.internalSteps.canStepBackward() : false;
}

export class DebugSteps {
    constructor (properties) {
        properties = properties || {};
        const { steps, stepsAreAdditive } = properties;

        this.steps = (steps) ? steps : [];
        this.lastStepWasInternal = false; 

        const badSteps = this.steps.filter(x => (!(x instanceof DebugStep)));
        if (badSteps.length > 0) {
            throw new Error("All steps in DebugSteps must be of type DebugStep");
        }

        this.stepsAreAdditive = (stepsAreAdditive === undefined || stepsAreAdditive === true) ? true : false; 
        this.activeStepIndex = -1;
    }

    addStep = (step) => {
        if (!(step instanceof DebugStep)) {
            throw new Error("Step must be of type DebugStep");
        } 
        this.steps.push(step);
    }

    getActiveStep = () => (this.steps) ? this.steps[this.activeStepIndex] : null;
    firstStep = () => (this.steps) ? this.steps[0] : null;
    lastStep = () => (this.steps) ? this.steps[this.steps.length - 1] : null;

    getCypher = (includeInactive) => {
        if (this.stepsAreAdditive) {
            const active = this.steps
                .slice(0, this.activeStepIndex + 1)
                .map(step => step.getCypher())
                .join('\n');
                
            if (includeInactive) {
                const inactive = this.steps
                    .slice(this.activeStepIndex + 1)
                    .map(step => `/* ${step.getCypher()} */`)
                    .join('\n');
                return `${active}${(active && inactive) ? '\n' : ''}${inactive}`;
            } else {
                return active;
            }
        } else {
            return this.steps[this.activeStepIndex].getCypher();
        }
    }

    resetActiveStepIndex = () => this.activeStepIndex = -1;

    runToNextBreakpoint = () => {
        var startInternalIndex = -1;
        var startIndex = this.activeStepIndex;
        
        var activeStep = this.steps[this.activeStepIndex];
        if (activeStep) {
            //console.log('in active step')
            var numInternalSteps = activeStep.getNumberOfInternalSteps();
            if (numInternalSteps !== 0) {
                //console.log('numInternalSteps: ', numInternalSteps)
                // look at internal steps of active step to see if we are stopped on an internal breakpoint
                //   if so, advance the internal index
                startInternalIndex = activeStep.getInternalActiveStepIndex();
                var internalStep = activeStep.getInternalStepAtIndex(startInternalIndex);
                if (internalStep.isBreakpoint) {
                    activeStep.internalSteps.stepForward();
                    startInternalIndex += 1;
                }
            } else if (activeStep.isBreakpoint) {
                // we are stopped on a breakpoint, so advance the index so we can go the next breakpoint
                //console.log('activeStep.isBreakpoint = true')
                startIndex += 1;
            } 
        }        

        startIndex = (startIndex < 0) ? 0 : startIndex;
        //console.log('startIndex: ', startIndex);
        //console.log('startInternalIndex: ', startInternalIndex);
        var index = this.steps.slice(startIndex).findIndex(step => {
            if (startInternalIndex === -1 && step.isBreakpoint) {
                // checking startIndexIndex === -1 because we want step.isBreakpoint to take precendence 
                //  if we haven't started traversing internal steps yet
                return true;
            } else {
                var internalIndex = step.runToNextInternalBreakpoint();
                // if found an internal breakpoint return true for current step, -or- if current step is a breakpoint
                return (internalIndex !== -1) ? true : step.isBreakpoint;
            }
        });

        //console.log('index: ', index);
        if (index === -1) {
            // go to end
            this.steps.map(step => step.resetInternalActiveStepIndex());
            this.setActiveStepIndexToEnd();
            this.lastStep().setInternalActiveStepIndexToEnd();
        } else {
            if (activeStep) { activeStep.resetInternalActiveStepIndex(); }
            this.activeStepIndex = index;
        }
    }

    setActiveStepIndexToStart = () => {
        if (this.steps.length > 0) {
            this.activeStepIndex = 0;
        } else {
            this.activeStepIndex = -1;
        }
    }

    setActiveStepIndexToEnd = () => {
        if (this.steps.length > 0) {
            this.activeStepIndex = this.steps.length - 1;
        } else {
            this.activeStepIndex = -1;
        }
    }

    stepForward = (properties) => {
        properties = properties || {};
        const { internalStep } = properties;
        this.lastStepWasInternal = (internalStep) ? true : false;
        if (this.canStepForward()) {
            /*
            this.activeStepIndex++;
            var activeStep = this.getActiveStep();
            if (activeStep && !internalStep) {
                activeStep.setInternalActiveStepIndexToEnd();
            }
            */
            var activeStep = this.getActiveStep();
            if (activeStep && activeStep.canStepForward()) {
                // we are in the middle of stepping through a step
                activeStep.setInternalActiveStepIndexToEnd();
            } else {
                this.activeStepIndex++;
                var activeStep = this.getActiveStep();
                if (activeStep && !internalStep) {
                    activeStep.setInternalActiveStepIndexToEnd();
                }
            }

            return DebugStepResult.SteppedOk;
        } else {
            return DebugStepResult.NoMoreSteps;
        }
    }

    stepBackward () {
        this.lastStepWasInternal = false;
        if (this.canStepBackward()) {
            this.activeStepIndex--;
            return DebugStepResult.SteppedOk;
        } else {
            return DebugStepResult.NoMoreSteps;
        }
    }

    canStepForward = () => {
        const nextIndex = this.activeStepIndex + 1;
        var activeStep = this.getActiveStep();
        var internalStepCanStepForward = (activeStep) ? activeStep.canStepForward() : false;
        return ((this.steps.length === nextIndex && internalStepCanStepForward) || this.steps.length > (nextIndex));

        /*
        if (includeInternalSteps) {
            var activeStep = this.getActiveStep();
            var internalStepCanStepForward = (activeStep) ? activeStep.canStepForward() : false;
            return ((this.steps.length === nextIndex && internalStepCanStepForward) || this.steps.length > (nextIndex));
        } else {
            return (this.steps.length > (nextIndex));
        }
        */
    }
    
    //canStepForward = () => (this.steps.length > (this.activeStepIndex + 1));
    canStepBackward = () => ((this.activeStepIndex - 1) >= -1);

    internalStepForward = () => {
        const lastStepWasInternal = this.lastStepWasInternal;
        this.lastStepWasInternal = true;

        var result;
        if (this.activeStepIndex === -1) {
            result = this.stepForward({ internalStep: true });
            if (result === DebugStepResult.NoMoreSteps) {
                return DebugStepResult.NoMoreSteps;
            }
        }
        var activeStep = this.steps[this.activeStepIndex];
        if (activeStep.hasInternalSteps()) {
            result = activeStep.stepForward({ internalStep: true });
            if (result !== DebugStepResult.NoMoreSteps) {
                return result;
            }
        }
        // either no internal steps, or we have reached the end of the internal steps, so need to move forward to next step
        result = this.stepForward({ internalStep: true });
        if (result === DebugStepResult.NoMoreSteps) {
            return result;
        } else {
            // need to ensure that when we step forward, we set the internalSteps activeStepIndex to 0
            activeStep.resetInternalActiveStepIndex();
            activeStep = this.steps[this.activeStepIndex];
            if (activeStep) {
                activeStep.setInternalActiveStepIndexToStart();
                return DebugStepResult.SteppedOk;            
            } else {
                return DebugStepResult.NoMoreSteps;
            }
        }
    }

    internalStepBackward () {
        const lastStepWasInternal = this.lastStepWasInternal;
        this.lastStepWasInternal = true;

        var result;
        if (this.activeStepIndex === -1) {
            return DebugStepResult.NoMoreSteps;
        }
        var activeStep = this.steps[this.activeStepIndex];
        if (activeStep.hasInternalSteps()) {
            if (!lastStepWasInternal) {
                activeStep.setInternalActiveStepIndexToEnd();
            }

            result = activeStep.stepBackward();
            var internalActiveStepIndex = activeStep.getInternalActiveStepIndex();
            if (result !== DebugStepResult.NoMoreSteps && internalActiveStepIndex !== -1) {
                return result;
            }
        }
        // either no internal steps, or we have reached the beginning of the internal steps, so need to move backward to previous step
        result = this.stepBackward();
        if (result === DebugStepResult.NoMoreSteps) {
            return result;
        } else {
            // need to ensure that when we step back, we set the internalSteps activeStepIndex to the end
            activeStep.resetInternalActiveStepIndex();
            activeStep = this.steps[this.activeStepIndex];
            if (activeStep) {
                activeStep.setInternalActiveStepIndexToEnd();
                return DebugStepResult.SteppedOk;
            } else {
                return DebugStepResult.NoMoreSteps;
            }
        }
    }
}
