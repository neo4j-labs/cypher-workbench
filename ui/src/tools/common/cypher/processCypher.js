import { ALERT_TYPES } from "../../../common/Constants";
import CypherStringConverter, { getCypherStringFromClauses } from "../../../dataModel/cypherStringConverter";

export const getCypherQueryInfo = (cypherQuery) => {
    const cypherStringConverter = new CypherStringConverter();
    var clauses = [];
    try {
      clauses = cypherStringConverter.convertToClauses(cypherQuery);
    } catch (e) {
        console.log(`Encountered error while parsing cypherQuery ${cypherQuery}: `, e);
        alert(`Encountered error '${e}' while parsing cypherQuery ${cypherQuery}`)
        return null;
    }

    // go through the clauses in reverse and find a cypherReturn
    var reversedClauses = clauses.slice().reverse();
    var returnIndex = reversedClauses.findIndex(clause => clause.keyword.toUpperCase() === 'RETURN');   
    if (returnIndex === -1) {
        alert('The Cypher statement must have a RETURN clause', ALERT_TYPES.WARNING);
        return null;
    }

    // it exists, re-write each returnItem that is not aliased
    var returnClause = reversedClauses[returnIndex].clauseInfo;

    returnClause.returnItems.map(x => {
        if (!x.alias) {
            // not aliased, it needs one - create an alias by substituting all non-char and spaces with underscores
            const newAlias = x.getExpressionAsString().replace(/[\s\W]/g,'_');
            x.alias = newAlias;
        }
    });

    var orderByClause = null;
    if (returnIndex > 0 && reversedClauses[returnIndex-1].keyword.toUpperCase() === 'ORDER BY') {
        // we have a following orderBy statement
        orderByClause = reversedClauses[returnIndex-1].clauseInfo;

        // for every item in the orderBy, check to see if the expression exists as an alias
        //   if not, then change the orderByItem expression to the corresponding alias
        orderByClause.orderByItems.map(orderByItem => {
            const orderByExpression = orderByItem.expression.toLowerCase();
            const correspondingReturnItem = returnClause.returnItems.find(returnItem => {
                const returnItemExpression = returnItem.getExpressionAsString().toLowerCase();
                const returnItemAlias = returnItem.alias.toLowerCase();
                // looking for orderByExpressions that don't exactly match the alias
                  // but do match the returnItemExpression
                if (returnItemAlias !== orderByExpression && returnItemExpression === orderByExpression) {
                    return true;
                } else {
                    return false;
                }
            });
            if (correspondingReturnItem) {
                orderByItem.expression = correspondingReturnItem.alias;
            }
        });
    }

    // parse any defined aliases for '_hoptype_'.  If '_hoptype_' encountered, tokenize and use second token as Neo4j datatype
    //  if no _hoptype_ assume String
    var outputFields = returnClause.returnItems.map(returnItem => {
        const tokens = returnItem.alias.split(/_hoptype_/);
        const returnItemStringExpr = returnItem.getExpressionAsString();
        const field = tokens[0];
        var datatype = 'String';
        if (tokens[1]) {
            datatype = tokens[1];
            //console.log(returnItem);
            if (returnItem.alias === returnItem.variable) {
                returnItem.variable = tokens[0];
            } else if (returnItem.alias === returnItemStringExpr.replace(/[\s\W]/g,'_')) {
                returnItem.propertyExpression = returnItem.propertyExpression.split(/_hoptype_/)[0];
            }
            returnItem.alias = tokens[0];
        }
        return { name: field, type: datatype };
    });

    clauses = reversedClauses.slice().reverse();
    const aliasedCypherQuery = getCypherStringFromClauses(clauses);

    return {
        cypher: aliasedCypherQuery,
        outputFields
    }
}
