
import { VariableContainer } from "./cypherPattern";
import { findObjectsOfACertainClass } from "./graphUtil";

export const getVariables = (allClauses) => {
    // console.log('all clauses: ', allClauses)
    let variableContainers = findObjectsOfACertainClass(allClauses, VariableContainer);
    // console.log('variableContainers: ', variableContainers)
    let variables = variableContainers
        .map(container => container.variable)
        .filter(variable => variable)   // remove empty variables
    variables = [...new Set(variables)];        
    return variables;

    // Things to think about:
    // for non-Pattern, include parsedVariables?
    //  otherwise - explicity look at UNWIND or ReturnBody?

}
