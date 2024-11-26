
import { parseCypherPattern, parseCypher } from '../../../common/parse/parseCypher';

export const parseModelInput = (modelInput, dataModel, dataModelCanvas) => {
    var response = { success: true, message: '' };
    var thingsToAdd = [];

    if (modelInput && modelInput.trim) {
        modelInput = modelInput.trim();
    }
    var backtickMatch = modelInput.match(/^`(.*)`$/);
    if (backtickMatch) {
        thingsToAdd.push({type: 'NodeLabel', nodeLabel: backtickMatch[1]});
    } else if (modelInput.match(/[\[\]{}\(\)\-<>]/)) { // if one of these tokens present {}[]()-<> process as Cypher
        // do cypher parse
        response = parseCypherPattern(modelInput, dataModel, dataModelCanvas);
        response.cypherParse = true;
    } else {
        var tokens = modelInput.split(' ').map(x => x.trim());
        if (tokens.length > 1) { // more than 1 token present
            var colonTokens = modelInput.split(':')
            if (colonTokens.length >= 3) { // if ':' present then use that gather tokens based on that
                colonTokens = colonTokens
                    .map(x => x.trim())
                    .filter(x => x)

                var index = 0;
                // should be at least 3, but if there are more then 3, like 5 or 7, add the extra info
                for (var i = index; (i+2) < colonTokens.length; i+=2) {
                    thingsToAdd.push({type: 'NodeRelNode', start: colonTokens[i], relationship: colonTokens[i+1], end: colonTokens[i+2]});
                }
            } else {
                // check if any relationship tokens - relationship tokens are ALL CAPS
                var startNode = '';
                var relationship = '';
                var endNode = '';
                //console.log('tokens: ' + tokens.join(' '));
                tokens.forEach((token,index) => {
                    if (!endNode && token.toUpperCase() === token) {
                        relationship += (relationship) ? ' ' + token : token;
                        //console.log('relationship: ' + relationship);
                    } else {
                        if (relationship) {
                            endNode += (endNode) ? ' ' + token : token;
                            //console.log('endNode: ' + endNode);
                        } else {
                            startNode += (startNode) ? ' ' + token : token;
                            //console.log('startNode: ' + startNode);
                        }
                    }
                })
                //console.log('final startNode: ' + startNode);
                if (relationship) {
                    if (startNode && endNode) {
                        thingsToAdd.push({type: 'NodeRelNode', start: startNode, relationship: relationship, end: endNode });
                    } else {
                        if (tokens.length === 3) {
                            // this means that startNode is ALL_CAPS.  This allows for things like A TO B where A is the startNode
                            thingsToAdd.push({type: 'NodeRelNode', start: tokens[0], relationship: tokens[1], end: tokens[2] });
                        } else if (tokens.length === 2) {
                            thingsToAdd.push({type: 'NodeLabel', nodeLabel: tokens.join(' ') });
                        } else {
                            response.success = false;
                            response.message = 'Expected NodeLabel RELATIONSHIP NodeLabel';
                        }
                    }
                } else {
                    thingsToAdd.push({type: 'NodeLabel', nodeLabel: tokens.join(' ') });
                }
            }
        } else {
            // if single token - its a node label
            var nodeLabel = tokens[0].trim();
            // strip leading ':' if necessary
            nodeLabel = (nodeLabel.match(/^:/)) ? nodeLabel.substring(1) : nodeLabel;
            thingsToAdd.push({type: 'NodeLabel', nodeLabel: nodeLabel });
        }
    }
    response.thingsToAdd = thingsToAdd;
    return response;
}
