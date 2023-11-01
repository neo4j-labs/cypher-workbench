import {
    SaveGraphDoc, SaveGraphDocMetadata,
    LoadGraphDoc, RemoveGraphDoc, GrabLock, 
    FindGraphDoc, CreateGraphDoc, GetDefaultGraphViewKeyForGraphDoc
} from './graphDocCypherStatements';
import { ListGraphDocs, SearchForGraphDocs } from './searchGraphDocCypher';
import { processResult, getFirstRowValue } from './resultHelper';
import { runQuery } from "../util/run";
import { isCloudLicense, getLicenseRestriction, LicenseRestriction } from '../license/license';

export const saveGraphDoc = async (graphDoc, context) => {
    const args = {graphDocInfo: graphDoc, email: context.email};
    var result = await runQuery(SaveGraphDoc, args);
    result = processResult(result);
    return getFirstRowValue(result, "key") === graphDoc.key ? true : false;
};

export const grabLock = async (graphDocKey, context) => {
    const args = {graphDocKey: graphDocKey, email: context.email};
    var result= await runQuery(GrabLock, args)
    result = processResult(result);
    return getFirstRowValue(result, "success");
};

/* this must be called first when creating a graphDoc to ensure the CREATOR and OWNER relationships are set up properly */
export const saveGraphDocMetadata = async (graphDoc, context) => {
    var args={graphDoc: graphDoc, email: context.email};
    var dm = await runQuery(FindGraphDoc, args);
    dm = processResult(dm);
    if (getFirstRowValue(dm, "noDM")) {
        // SET graphDoc isPrivate or public
        var maxNumberOfGraphDocs = 0;
        const isCloud = isCloudLicense();
        if (!isCloud) {
            const maxGraphDocConfig = getLicenseRestriction(LicenseRestriction.MaxNumberOfGraphDocs);
            var maxNumberOfGraphDocs = maxGraphDocConfig[graphDoc.subgraphModel.primaryNodeLabel];
            maxNumberOfGraphDocs = (maxNumberOfGraphDocs) ? maxNumberOfGraphDocs : 999999999999;
            //console.log('maxNumberOfGraphDocs: ' + maxNumberOfGraphDocs);
        }
        args = { ...args, maxNumberOfGraphDocs, isCloud };
        //console.log('CreateGraphDoc args: ', args);

        var checkdm;
        try {
            checkdm = await runQuery(CreateGraphDoc, args);
            checkdm = processResult(checkdm);
        } catch (e) {
            console.log(e);
            throw e;
        }
        if (getFirstRowValue(checkdm, "success") !== true) {
            return false;
        }
    }
    if (graphDoc.metadata) {
        //console.log('calling SaveGraphDocMetadata');
        var args= { graphDocMetadata: graphDoc.metadata, email: context.email };    
        var result=await runQuery(SaveGraphDocMetadata, args);
        result = processResult(result);
        return getFirstRowValue(result, "key") === graphDoc.key ? true : false;
    } else {
        //console.log('saveGraphDocMetadata returning true');
        return true;
    }
};

export const saveGraphDocRootsWithMetadata = async (graphDocRoots, context) => {
    // create each GraphDoc root
    for (var i = 0; i < graphDocRoots.graphDocs.length; i++) {
        var graphDoc = graphDocRoots.graphDocs[i];
        var result = await saveGraphDocMetadata(graphDoc, context);
        if (!result) {
            return false;
        }
    }
    // add relationships
    if (graphDocRoots.graphDocInput) {
        //console.log("calling saveGraphDoc on graphDocRoots.graphDocInput");
        //var result = await saveGraphDoc(graphDocRoots.graphDocInput, context);
        //return result;
        const args = {graphDocInfo: graphDocRoots.graphDocInput, email: context.email};
        var result = await runQuery(SaveGraphDoc, args);
        result = processResult(result);
        return getFirstRowValue(result, "key") === graphDocRoots.graphDocInput.key ? true : false;
    } else {
        return true;    
    }
};

export const removeGraphDoc = async (graphDocKey,context) => {
    const args={graphDocKey: graphDocKey,email: context.email};
    console.log('removeGraphDoc args: ', args);
    var result=await runQuery(RemoveGraphDoc, args)
    result = processResult(result);
    return getFirstRowValue(result, "success", `Graph Doc ${graphDocKey} not found`);
};

export const removeGraphDocs = async (graphDocKeys,context) => {
    
    const doRemoveGraphDoc = (key) => {

        return new Promise(async (resolve, reject) => {
            try {
                await removeGraphDoc(key, context);
                resolve(true);
            } catch (e) {
                resolve(e.toString());
            }
        });
    }

    var promises = graphDocKeys.map(key => doRemoveGraphDoc(key));
    var error = null;
    await Promise.all(promises).then((responses) => {
        const errorResults = responses.filter(result => result !== true);
        if (errorResults.length > 0) {
            error = errorResults.join('\n');
        } 
    });

    if (error) {
        console.log('removeGraphDocs error: ', error);
        throw new Error(`Error Removing Graph Docs '${error}'`);
    } else {
        return true;
    }
};

export const removeGraphDocAndDefaultView = async (graphDocKey,context) => {
    var args= { graphDocKey: graphDocKey, email: context.email };

    var defaultGraphViewKeyResult = await runQuery(GetDefaultGraphViewKeyForGraphDoc, args);
    var result = processResult(defaultGraphViewKeyResult);
    var graphDocViewKey = getFirstRowValue(result, "graphDocViewKey", "Default Graph Doc View Key not found");

    result = await runQuery(RemoveGraphDoc, args)
    result = processResult(result);
    getFirstRowValue(result, "success", "Graph Doc not found");

    args = { graphDocKey: graphDocViewKey, email: context.email };
    result = await runQuery(RemoveGraphDoc, args)
    result = processResult(result);
    return getFirstRowValue(result, "success", "Default Graph Doc View not found");
};

export const loadGraphDoc = async (graphDocKey, context) => {
    //console.log("loadGraphDoc", graphDocKey);
    const args = {graphDocKey: graphDocKey, email: context.email};
    var result = await runQuery(LoadGraphDoc, args);
    result = processResult(result);
    return getFirstRowValue(result, "graphDoc", "Graph Doc not found");
}

export const loadGraphDocAndDefaultView = async (graphDocKey, context) => {
    //console.log("loadGraphDoc", graphDocKey);

    // get graph doc
    var args = {graphDocKey: graphDocKey, email: context.email};
    //console.log('running LoadGraphDoc: ', args);
    var graphDocResult = await runQuery(LoadGraphDoc, args);
    var result = processResult(graphDocResult);
    var graphDoc = getFirstRowValue(result, "graphDoc", "Graph Doc not found");

    // find default view key
    //console.log('running GetDefaultGraphViewKeyForGraphDoc: ', args);
    var defaultGraphViewKeyResult = await runQuery(GetDefaultGraphViewKeyForGraphDoc, args);
    result = processResult(defaultGraphViewKeyResult);
    var graphDocViewKey = getFirstRowValue(result, "graphDocViewKey", "Default Graph Doc View Key not found");

    // get graph doc view (it's a graph doc)
    args = {graphDocKey: graphDocViewKey, email: context.email};
    //console.log('running LoadGraphDoc: ', args);
    graphDocResult = await runQuery(LoadGraphDoc, args);
    result = processResult(graphDocResult);
    var graphDocView = getFirstRowValue(result, "graphDoc", "Default Graph Doc View not found");

    return {
        graphDoc: graphDoc,
        graphDocView: graphDocView
    }
}

export const loadLastOpenedGraphDoc = async (graphDocType, context) => {
    var query = `
        WITH $email as e
        MATCH (u:User {email:e})
        RETURN u['lastOpened${graphDocType}'] as lastGraphDocKey
    `
    var args = {email: context.email};
    var result = await runQuery(query, args);
    result = processResult(result);
    if (result.rows.length === 1) {
        return await loadGraphDoc(result.rows[0].lastGraphDocKey, context);
    } else {
        return('Graph Doc not found');
    }
}

export const loadLastOpenedGraphDocAndDefaultView = async (graphDocType, context) => {
    var query = `
        WITH $email as e
        MATCH (u:User {email:e})
        RETURN u['lastOpened${graphDocType}'] as lastGraphDocKey
    `
    var args = {email: context.email};
    var result = await runQuery(query, args);
    result = processResult(result);
    if (result.rows.length === 1) {
        return await loadGraphDocAndDefaultView(result.rows[0].lastGraphDocKey, context);
    } else {
        return('Graph Doc not found');
    }
}

export const saveGraphDocWithFullMetadata = async (graphDoc, context) => {
    //console.log("saveGraphDocWithFullMetadata",graphDoc);
    var result = await saveGraphDocMetadata(graphDoc.metadata, context);
    if (result) {
        return await saveGraphDoc(graphDoc,context);
    } else {
        return false;
    }
}

export const listGraphDocs = async (graphDocType, myOrderBy, orderDirection, context) => {
    var replacement = (orderDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
    var args = {graphDocType: graphDocType, myOrderBy: myOrderBy, email: context.email};
    //var args = {myOrderBy: myOrderBy, email: 'jim@jim.com'};
    //console.log('listGraphDocs: ', args);
    var query = ListGraphDocs.replace(/\$DESC/, replacement)
    //console.log('query: ', query);
    var result = await runQuery(query, args)
    //console.log('listGraphDocs result: ', result);
    result = processResult(result);
    //console.log("result.rows",result.rows);
    return result.rows;
}

export const searchGraphDocs = async (graphDocType, searchText, myOrderBy, orderDirection, context) => {
    //console.log('search data graphDocs called');
    //console.log(`orderDirection: ${orderDirection}`)
    var replacement = (orderDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
    var query = SearchForGraphDocs.replace(/\$DESC/, replacement);
    var args = {graphDocType: graphDocType, searchText: searchText, myOrderBy: myOrderBy, email: context.email};
    var result= await runQuery(query, args);
    result = processResult(result);
    return result.rows;
}
