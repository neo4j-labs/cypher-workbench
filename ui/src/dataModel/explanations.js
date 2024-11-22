import CypherClause from "./cypherClause";
import { ReturnClause } from "./cypherReturn";
import { WhereClause } from "./cypherWhere";
import { Pattern } from "./cypherPattern";

export const ExplanatoryMarker = {
    None: 'None',
    TypeExpression: 'TypeExpression',
    PropertyMap: 'PropertyMap',
    PatternWhereClause: 'PatternWhereClause',
    RelationshipQuantifiedPathPattern: 'RelationshipQuantifiedPathPattern',
    RelationshipPatternQuantifier: 'RelationshipPatternQuantifier',
    PatternPatternPartArrayItem: 'PatternPatternPartArrayItem',
    SubQueryCypherClause: 'SubQueryCypherClause'
}

export const getExplanation = (debugStep) => {
    // console.log('explanation: debugStep: ', debugStep)
    // let explanation = '';

    return getActivatedCypherString(debugStep);
    /*
    if (debugStep.explanatoryMarker) {
        explanation = debugStep.explanatoryMarker;
    }
    
    if (debugStep.associatedCypherObject) {
        if (explanation) {
            explanation = `: ${explanation}`;
        }
        explanation = `${debugStep.associatedCypherObject.constructor.name}${explanation}`;
    }
    */

    // return explanation;
}

const getActivatedCypherString = (debugStep) => {
    if (!debugStep) {
        return '';
    }
    let str = debugStep.activatedCypherString || '';
    let keyword = getKeyword(debugStep);
    if (debugStep.getMyIndex() === 0 && keyword && str) {
        str = `${keyword} ${str}`
    }

    let match = str.match(/^(,\s*)?(.*)/);
    if (match && match[2]) {
        str = match[2];
    }

    return str;
}

const getKeyword = (debugStep) => {
    if (!debugStep) {
        return '';
    }
    let keyword = '';
    let associatedCypherObject = debugStep.associatedCypherObject;

    let parentStep = debugStep.getParentStep();
    let parentAssociatedCypherObject = parentStep?.associatedCypherObject;

    if (associatedCypherObject) {
        if (associatedCypherObject instanceof ReturnClause) {
            keyword = 'RETURN';
        } else if (associatedCypherObject instanceof WhereClause) {
            keyword = 'WHERE';
        } else if (associatedCypherObject instanceof CypherClause) {
            keyword = associatedCypherObject.keyword;
        } else if (parentAssociatedCypherObject instanceof CypherClause) {
            keyword = parentAssociatedCypherObject.keyword;
        }
    } 
    return keyword;
}