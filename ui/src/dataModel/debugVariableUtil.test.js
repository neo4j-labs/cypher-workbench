import { buildPattern } from "./debugStatement.test";
import { getVariables } from "./debugVariableUtil";

test('findObjectsOfACertainClass for a Pattern', () => {

    let pattern = buildPattern();
    
    let variables = getVariables(pattern);
    expect(variables).toStrictEqual(['person','acted_in','movie','directed','director'])
})

