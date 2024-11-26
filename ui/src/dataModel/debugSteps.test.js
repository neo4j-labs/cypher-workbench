
import { 
    DebugSteps,
    DebugStep,
    debugStep,
    DebugStepResult
} from './debugSteps';

test('make single debug step', () => {
    var cypher = 'MATCH (n)';
    var step = debugStep(cypher);
    expect(step.cypher).toBe(cypher);
    expect(step.internalSteps).toBe(null);
});

test('make debug steps', () => {
    var cypherBlocks = ['MATCH (n)', 'RETURN n'];
    var debugSteps = new DebugSteps();
    cypherBlocks
        .map(snippet => debugStep(snippet))
        .map(step => debugSteps.addStep(step));

    expect(debugSteps.steps.length).toBe(2);
    expect(debugSteps.stepsAreAdditive).toBe(true);

    expect(debugSteps.getCypher()).toBe('');
    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(true);
});

test('step forward', () => {
    var cypherBlocks = ['MATCH (n)', 'RETURN n'];
    var debugSteps = new DebugSteps();
    cypherBlocks
        .map(snippet => debugStep(snippet))
        .map(step => debugSteps.addStep(step));

    expect(debugSteps.getCypher()).toBe('');
    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (n)');
    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (n)\nRETURN n');
    var result = debugSteps.stepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (n)\nRETURN n');
});

test('step backward', () => {
    var cypherBlocks = ['MATCH (n)', 'RETURN n'];
    var debugSteps = new DebugSteps();
    cypherBlocks
        .map(snippet => debugStep(snippet))
        .map(step => debugSteps.addStep(step));

    debugSteps.setActiveStepIndexToEnd();
    expect(debugSteps.canStepBackward()).toBe(true);
    expect(debugSteps.canStepForward()).toBe(false);

    expect(debugSteps.getCypher()).toBe('MATCH (n)\nRETURN n');
    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (n)');
    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('');
    var result = debugSteps.stepBackward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
});

test('test empty debug steps', () => {
    var debugSteps = new DebugSteps();

    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(false);
});

// Test internal steps
test('make single debug step with internal steps', () => {
    var cypher = 'MATCH (a)-[:B]->(c)';
    var internalSteps = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var step = debugStep(cypher, internalSteps);
    expect(step.cypher).toBe(cypher);
    expect(step.internalSteps).not.toBe(null);
    expect(step.internalSteps.steps.length).toBe(3);
});

test('make debug steps with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    expect(debugSteps.steps.length).toBe(2);
    expect(debugSteps.stepsAreAdditive).toBe(true);

    expect(debugSteps.getCypher()).toBe('');
    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(true);
});

test('step forward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    expect(debugSteps.getCypher()).toBe('');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    
    var result = debugSteps.stepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
});

test('step backward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.setActiveStepIndexToEnd();
    debugSteps.lastStep().setInternalActiveStepIndexToEnd();

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('');

    var result = debugSteps.internalStepBackward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('');
});

test('step forward with steps, backward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');

    debugSteps.internalStepBackward();
    //console.log(debugSteps.getCypher());
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('');

    var result = debugSteps.internalStepBackward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('');
});

test('test getInternalActiveStep - no internal steps', () => {
    var cypherBlocks = ['MATCH (n)', 'RETURN n'];
    var debugSteps = new DebugSteps();
    cypherBlocks
        .map(snippet => debugStep(snippet))
        .map(step => debugSteps.addStep(step));

    expect(debugSteps.getActiveStep()).toBeNull();
    expect(debugSteps.getActiveInternalStep()).toBeNull();    
    debugSteps.stepForward();

    expect(debugSteps.getActiveStep()).not.toBeNull();
    expect(debugSteps.getActiveStep().getInternalActiveStep()).toBeNull();
    expect(debugSteps.getActiveInternalStep()).toBeNull();    
})

test('test getInternalActiveStep - internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    expect(debugSteps.getActiveStep()).toBeNull();
    expect(debugSteps.getActiveInternalStep()).toBeNull();    
    debugSteps.stepForward();

    expect(debugSteps.getActiveStep()).not.toBeNull();
    expect(debugSteps.getActiveStep().getInternalActiveStep()).not.toBeNull();
    expect(debugSteps.getActiveInternalStep()).not.toBeNull();
})

test('step forward with steps, backward with internal steps - get internal index', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.stepForward();

    let indexes = debugSteps.getActiveIndexAndActiveInternalIndex();
    // console.log('indexes: ', indexes);
    expect(indexes.activeStepIndex).toBe(1);
    expect(indexes.internalActiveStepIndex).toBe(2);

    expect(debugSteps.getActiveStep().getMyIndex()).toBe(1);
    expect(debugSteps.getActiveInternalStep().getMyIndex()).toBe(2);
    expect(debugSteps.getActiveInternalStep().getParentStep()).toBe(debugSteps.getActiveStep());

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');

    debugSteps.internalStepBackward();
    //console.log(debugSteps.getCypher());

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(1);
    expect(indexes.internalActiveStepIndex).toBe(1);

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b');
    debugSteps.internalStepBackward();

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(1);
    expect(indexes.internalActiveStepIndex).toBe(0);

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a');
    debugSteps.internalStepBackward();

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(0);
    expect(indexes.internalActiveStepIndex).toBe(2);

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepBackward();

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(0);
    expect(indexes.internalActiveStepIndex).toBe(1);

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepBackward();

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(0);
    expect(indexes.internalActiveStepIndex).toBe(0);
    expect(debugSteps.getActiveStep().getInternalActiveStep()).not.toBeNull();

    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepBackward();

    indexes = debugSteps.getActiveIndexAndActiveInternalIndex(); 
    expect(indexes.activeStepIndex).toBe(-1);
    expect(indexes.internalActiveStepIndex).toBe(-1);

    expect(debugSteps.getCypher()).toBe('');

    var result = debugSteps.internalStepBackward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('');
});

test('step backward with steps, forward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var internalSteps2 = ['RETURN a', 'RETURN a, b', 'RETURN a, b, c'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2, internalSteps2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.setActiveStepIndexToEnd();
    debugSteps.lastStep().setInternalActiveStepIndexToEnd();

    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('');
    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(true);

    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    
    var result = debugSteps.stepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
});

test('1 with internal steps, 1 without, step backward with steps, forward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.setActiveStepIndexToEnd();
    debugSteps.lastStep().setInternalActiveStepIndexToEnd();

    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.stepBackward();
    expect(debugSteps.getCypher()).toBe('');
    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(true);

    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    
    var result = debugSteps.stepForward();
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
});

test('1 with internal steps, 1 without, step forward with steps, backward with internal steps', () => {
    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()', 'MATCH (a)-[:B]->(c)'];
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1, internalSteps1);
    var step2 = debugStep(cypher2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.stepForward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    expect(debugSteps.canStepBackward()).toBe(true);
    expect(debugSteps.canStepForward()).toBe(false);

    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');
    debugSteps.internalStepBackward();
    expect(debugSteps.getCypher()).toBe('MATCH (a)');
    var result = debugSteps.internalStepBackward();
    
    expect(result).toBe(DebugStepResult.NoMoreSteps);
    expect(debugSteps.getCypher()).toBe('');
    expect(debugSteps.canStepBackward()).toBe(false);
    expect(debugSteps.canStepForward()).toBe(true);
});

// breakpoints
test('simple breakpoint', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    // breakpoint on first line
    step1.setIsBreakpoint(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    expect(debugSteps.activeStepIndex).toBe(0);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(1);

    // breakpoint on second line
    debugSteps.resetActiveStepIndex();
    debugSteps.firstStep().resetInternalActiveStepIndex();

    step1.setIsBreakpoint(false);
    step2.setIsBreakpoint(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(1);
});

test('internal breakpoint', () => {

    var debugSteps = new DebugSteps();

    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var internalSteps1 = [{
        cypher: 'MATCH (a)'
    }, {
        cypher: 'MATCH (a)-[:B]->()',
        breakpoint: true
    }, {
        cypher: 'MATCH (a)-[:B]->(c)'
    }];

    internalSteps1 = internalSteps1.map(x => {
        var step = new DebugStep({ cypher: x.cypher });
        if (x.breakpoint) {
            step.setIsBreakpoint(true);
        }
        return step;
    });
    //console.log('internalSteps1: ', internalSteps1);

    var step1DebugSteps = new DebugSteps({ steps: internalSteps1, stepsAreAdditive: false });
    var step1 = new DebugStep({ cypher: cypher1, internalSteps: step1DebugSteps });

    var cypher2 = 'RETURN a, b, c';
    var step2 = debugStep(cypher2);
    step2.setIsBreakpoint(true);

    debugSteps.addStep(step1);
    debugSteps.addStep(step2);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.activeStepIndex).toBe(0);
    var activeInternalIndex = debugSteps.steps[debugSteps.activeStepIndex].getInternalActiveStepIndex();
    //console.log('activeInternalIndex: ', activeInternalIndex);
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->()');

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nRETURN a, b, c');
});

test ('setBreakpointLine 1', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);
});

test ('setBreakpointLine 2', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person \n AND c:Company'
    var cypher3 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 3, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person \n AND c:Company');
    expect(debugSteps.activeStepIndex).toBe(1);

    expect(debugSteps.canStepForward()).toBe(true);    

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person \n AND c:Company\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(2);

    expect(debugSteps.canStepForward()).toBe(false);    
});

test('setBreakpointLine 3 - internal steps before', () => {
    var debugSteps = new DebugSteps();

    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';

    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()','MATCH (a)-[:B]->(c)'];

    internalSteps1 = internalSteps1.map(x => new DebugStep({ cypher: x }));
    //console.log('internalSteps1: ', internalSteps1);

    var step1DebugSteps = new DebugSteps({ steps: internalSteps1, stepsAreAdditive: false });

    var step1 = new DebugStep({ cypher: cypher1, internalSteps: step1DebugSteps });
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);

    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person');
    expect(debugSteps.activeStepIndex).toBe(1);

    expect(debugSteps.canStepForward()).toBe(true);    

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(2);

    expect(debugSteps.canStepForward()).toBe(false);    

});

test('setBreakpointLine 4 - on internal steps', () => {
    var debugSteps = new DebugSteps();

    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';

    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()','MATCH (a)-[:B]->(c)'];

    internalSteps1 = internalSteps1.map(x => new DebugStep({ cypher: x }));
    //console.log('internalSteps1: ', internalSteps1);

    var step1DebugSteps = new DebugSteps({ steps: internalSteps1, stepsAreAdditive: false });

    var step1 = new DebugStep({ cypher: cypher1, internalSteps: step1DebugSteps });
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);

    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 1, breakpointOn: true})

    expect(step1.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)');
    expect(debugSteps.activeStepIndex).toBe(0);

    expect(debugSteps.canStepForward()).toBe(true);    

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(2);

    expect(debugSteps.canStepForward()).toBe(false);    
});

test ('setBreakpointLine 5 - last step', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person \n AND c:Company'
    var cypher3 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 4, breakpointOn: true})

    expect(step3.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person \n AND c:Company\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(2);

    expect(debugSteps.canStepForward()).toBe(false);
 
});

test ('setBreakpointLine - toggle on then off', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: false})

    expect(step2.isBreakpoint).toBe(false);

});

test ('setBreakpointLine - toggle on, run, then toggle off, then run', () => {
    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';
    var debugSteps = new DebugSteps();
    var step1 = debugStep(cypher1);
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);
    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person');
    expect(debugSteps.activeStepIndex).toBe(1);

    expect(debugSteps.canStepForward()).toBe(true);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: false})

    expect(step2.isBreakpoint).toBe(false);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person\nRETURN a, b, c');
    expect(debugSteps.activeStepIndex).toBe(2);

    expect(debugSteps.canStepForward()).toBe(false);

});

test('breakpoints - run to breakpoint, internal step back, run to breakpoint', () => {
    var debugSteps = new DebugSteps();

    var cypher1 = 'MATCH (a)-[:B]->(c)';
    var cypher2 = 'WHERE a:Person'
    var cypher3 = 'RETURN a, b, c';

    var internalSteps1 = ['MATCH (a)', 'MATCH (a)-[:B]->()','MATCH (a)-[:B]->(c)'];

    internalSteps1 = internalSteps1.map(x => new DebugStep({ cypher: x }));
    //console.log('internalSteps1: ', internalSteps1);

    var step1DebugSteps = new DebugSteps({ steps: internalSteps1, stepsAreAdditive: false });

    var step1 = new DebugStep({ cypher: cypher1, internalSteps: step1DebugSteps });
    var step2 = debugStep(cypher2);
    var step3 = debugStep(cypher3);

    debugSteps.addStep(step1);
    debugSteps.addStep(step2);
    debugSteps.addStep(step3);

    debugSteps.setBreakpointLine({oneBasedLineNumber: 2, breakpointOn: true})

    expect(step2.isBreakpoint).toBe(true);

    debugSteps.runToNextBreakpoint();
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person');
    expect(debugSteps.activeStepIndex).toBe(1);

    debugSteps.internalStepBackward();
    expect(debugSteps.activeStepIndex).toBe(0);

    debugSteps.runToNextBreakpoint();
    // console.log(debugSteps.getCypher());
    expect(debugSteps.getCypher()).toBe('MATCH (a)-[:B]->(c)\nWHERE a:Person');
    expect(debugSteps.activeStepIndex).toBe(1);
});