import {
    SaveDataModel, SaveDataModelMetadata, SaveNodeLabelDisplay,
    LoadDataModel, RemoveDataModel, GrabModelLock
} from './cypherStatements';
import { ListModels, ListModelsAndAddExplcitMatches, SearchForModel, IncludePublicSnippet } from './searchModelCypher';
//import { runQuery, runStatement} from "../util/run";
import { processResult, getFirstRowValue } from './resultHelper';
import { runQuery } from "../util/run";
import { isCloudLicense, getLicenseRestriction, LicenseRestriction } from '../license/license';
import { v4 as uuidv4 } from 'uuid';
import { VERSION } from '../version';
import DataModel from "../ui/dataModel/dataModel";
import { parseCypher } from "../ui/common/parse/parseCypher";
import { doDagreLayout } from "../layout/layout";
import { getFullModelObject, getMetadata } from "./dataModelPersistenceHelper";
import { autoColor } from '../layout/colors';

const OrderBy = {
    Title: "title",
    DateUpdated: "dateUpdated"
}
const OrderByDirection = {
    ASC: "ASC",
    DESC: "DESC"
}

export const saveDataModel = async (dataModel, context) => {
    const args = {modelInfo: dataModel,email: context.email};
    var result = await runQuery(SaveDataModel, args);
    result = processResult(result);
    return getFirstRowValue(result, "key") === dataModel.key ? true : false;
};

export const grabModelLock = async (dataModelKey, context) => {
    const args = {dataModelKey: dataModelKey, email: context.email};
    var result= await runQuery(GrabModelLock, args)
    result = processResult(result);
    return getFirstRowValue(result, "success");
};

/* this must be called first when creating a model to ensure the CREATOR and OWNER relationships are set up properly */
export const saveDataModelMetadata = async (dataModelMetadata,context) => {
    var args={dataModelMetadata: dataModelMetadata, email: context.email};
    const query=`
                WITH $dataModelMetadata as metadata, $email as email
                MATCH (u:User{email:email})
                MATCH (dataModel:DataModel {key:metadata.key})
                CALL apoc.util.validate(NOT u.primaryOrganization IN labels(dataModel),"permission denied (wrong org)",[0])
                RETURN count(dataModel)=0 as noDM
                `
    var dm = await runQuery(query, args);
    dm = processResult(dm);
    if (getFirstRowValue(dm, "noDM")) {
        // SET dataModel isPrivate or public
        const isCloud = isCloudLicense();
        const maxNumberOfDataModels = (isCloud) ? 0 : getLicenseRestriction(LicenseRestriction.MaxNumberOfModels);
        args = { ...args, maxNumberOfDataModels, isCloud };
        const query2=`WITH $email as email, $dataModelMetadata as metadata, 
                        $maxNumberOfDataModels as maxNumberOfDataModels, $isCloud as isCloud
                    MATCH (u:User{email:email})
                    CALL apoc.do.when(isCloud, 
                        'MATCH (u)-[:MEMBER]->(s:SecurityOrganization)-[:LICENSED_FOR]->(l:SoftwareEdition)
                        WHERE u.primaryOrganization = s.name
                        WITH u, l,
                            coalesce(split(u.email, "@")[1],"") as emailDomain, coalesce(s.enterpriseDomains,[]) as enterpriseDomains
                        RETURN 
                          CASE WHEN emailDomain IN enterpriseDomains
                            THEN 999999999999
                            ELSE l.maxNumberOfModels
                          END as maxNumberOfDataModels',
                        'RETURN coalesce(maxNumberOfDataModels,0) as maxNumberOfDataModels', 
                        {u: u, maxNumberOfDataModels: maxNumberOfDataModels}
                    ) YIELD value as licenseInfo
                    WITH u, email, metadata, licenseInfo.maxNumberOfDataModels as maxNumberOfDataModels
                    OPTIONAL MATCH (u)<-[:CREATOR]-(existing:DataModel)
                    WHERE u.primaryOrganization IN labels(existing)
                    WITH u, email, metadata, maxNumberOfDataModels, count(existing) as numExistingModels
                    CALL apoc.util.validate(NOT (u.primaryOrganization IS NOT NULL),"permission denied",[0])
                    CALL apoc.util.validate(numExistingModels >= maxNumberOfDataModels,"Max number of licensed data models reached",[0])
                    WITH *
                    MERGE (dataModel:DataModel {key:metadata.key})
                      WITH *
                      CALL apoc.create.addLabels([dataModel], [u.primaryOrganization]) YIELD node
                    MERGE (dataModel)-[:CREATOR]->(u)
                    MERGE (dataModel)-[:OWNER]->(u)
                    SET u.lastOpenedModel = metadata.key
                    SET dataModel.isPrivate = not(metadata.isPublic)
                    RETURN count(dataModel)>0 as success`
        var checkdm = await runQuery(query2, args);
        checkdm = processResult(checkdm);
        if (getFirstRowValue(checkdm, "success") !== true) {
            return false;
        }
    }
    var result=await runQuery(SaveDataModelMetadata, args)
    result = processResult(result);
    return getFirstRowValue(result, "key") === dataModelMetadata.key ? true : false;
};

export const removeDataModel =async (dataModelKey,context) => {
    const args={dataModelKey: dataModelKey,email: context.email};
    var result=await runQuery(RemoveDataModel, args)
    result = processResult(result);
    return getFirstRowValue(result, "success", "Data Model not found");
};

export const searchForItem = async (searchText, nodeLabel, searchProperty, returnProperties, context) => {
    var substitutions = {
        nodeLabel: nodeLabel,
        searchProperty: searchProperty,
        returnProperties: returnProperties.map(x => 'n.' + x + ' as ' + x).join(','),
    }
    var query = `
        WITH $searchText as searchText, $email as email
        MATCH (u:User {email:email})
        MATCH (n:$nodeLabel)
        WHERE u.primaryOrganization IN labels(n)
          AND (toLower(n.$searchProperty) CONTAINS toLower(searchText))
        RETURN $returnProperties
        ORDER BY $searchProperty
        LIMIT 20
    `;
    Object.keys(substitutions).forEach(key => {
        query = query.replace(new RegExp('\\$' + key, 'g'), substitutions[key]);
    });
    //console.log(cypher);
    const args={searchText: searchText, email: context.email};
    var result=await runQuery(query, args)
    result = processResult(result);
    return (result.rows);
}

// return a Map of tag:key, key will be null if tag does not exist
export const searchForTags = async (tags, context) => {
    var query = `
        WITH $tags as tags, $email as email
        MATCH (u:User {email:email})
        WITH tags, u.primaryOrganization as primaryOrg
        UNWIND tags as tag
        CALL {
            WITH tag, primaryOrg
            OPTIONAL MATCH (tagNode:Tag)
            WHERE primaryOrg IN labels(tagNode)
              AND (toLower(tagNode.tag) CONTAINS toLower(tag))
            RETURN tagNode.key as key
            LIMIT 1
        }
        WITH collect({key: key, tag: tag}) as tagList
        RETURN tagList
    `;
    //console.log(cypher);
    const args={tags: tags, email: context.email};
    var result=await runQuery(query, args)
    result = processResult(result);
    let tagList = getFirstRowValue(result, "tagList");
    //console.log("searchForTags tagList: ", JSON.stringify(tagList));
    return tagList;
}


export const loadDataModel = async (dataModelKey, updateLastOpenedModel, context) => {
    //console.log("loadDataModel", dataModelKey);
    const args = {dataModelKey: dataModelKey, updateLastOpenedModel: updateLastOpenedModel, email: context.email};
    var result = await runQuery(LoadDataModel, args);
    result = processResult(result);
    return getFirstRowValue(result, "dataModel", "Data Model not found");
}

export const loadLastOpenedModel = async (context) => {
    var query = `
        WITH $email as e
        MATCH (u:User {email:e})
        RETURN u.lastOpenedModel as lastDataModelKey
    `
    var args = {email: context.email};
    var result = await runQuery(query, args);
    result = processResult(result);
    if (result.rows.length === 1) {
        return await loadDataModel(result.rows[0].lastDataModelKey, true, context);
    } else {
        return('Data Model not found');
    }
}

export const saveNodeLabelDisplay = async (nodeLabels,context) => {
    //console.log("saveNodeLabelDisplay",nodeLabels);
    const args = {nodeLabels: nodeLabels, email: context.email};
    //runCypher(saveDataModelCypher, {dataModelInfo: dataModel}, (results) => {
    var result = await runQuery(SaveNodeLabelDisplay, args);
    result = processResult(result);
    //console.log("results\n",result);
    return getFirstRowValue(result,"success");
}

export const saveDataModelWithFullMetadata = async (dataModel, context) => {
    //console.log("saveDataModelWithFullMetadata",dataModel);
    var result = await saveDataModelMetadata(dataModel.metadata, context);
    if (result) {
        return await saveDataModel(dataModel,context);
    } else {
        return false;
    }
}

const validateArgs = ({myOrderBy, orderDirection, skip, limit}) => {
    myOrderBy = myOrderBy || OrderBy.DateUpdated;
    orderDirection = (orderDirection && 
        orderDirection.toUpperCase && 
        orderDirection.toUpperCase() === OrderByDirection.DESC) ? OrderByDirection.DESC : OrderByDirection.ASC;
    skip = (skip === null || skip === undefined || skip < 0) ? 0 : skip;
    limit = (limit === null || limit === undefined || limit <= 0) ? 100 : limit;
    return { myOrderBy, orderDirection, skip, limit }
}

const handleIncludePublic = (query, includePublicValue) => {
    let includePublic = (includePublicValue === undefined) ? true : includePublicValue;
    let includePublicString = (includePublic) ? IncludePublicSnippet : '';
    let newQuery = query.replace(/\$INCLUDE_PUBLIC/g, includePublicString);
    return newQuery;
}

export const listDataModels = async (myOrderBy, orderDirection, includePublic, skip, limit, context) => {
    const validatedArgs = validateArgs({myOrderBy, orderDirection, skip, limit});
    var args = {
        myOrderBy: validatedArgs.myOrderBy, 
        email: context.email, 
        skip: validatedArgs.skip, 
        limit: validatedArgs.limit
    };
    var query = ListModels.replace(/\$DESC/g, validatedArgs.orderDirection);
    query = handleIncludePublic(query, includePublic);
    var result = await runQuery(query, args)
    result = processResult(result);
    //console.log("result.rows",result.rows);
    return result.rows;
}

export const listDataModelsAndAddExplicitMatches = async (explicitKeysToSearchFor, myOrderBy, orderDirection, includePublic, skip, limit, context) => {
    const validatedArgs = validateArgs({myOrderBy, orderDirection, skip, limit});
    var args = {
        explicitKeysToSearchFor: explicitKeysToSearchFor,
        myOrderBy: validatedArgs.myOrderBy, 
        email: context.email, 
        skip: validatedArgs.skip, 
        limit: validatedArgs.limit,
    };
    var query = ListModelsAndAddExplcitMatches.replace(/\$DESC/g, validatedArgs.orderDirection);
    query = handleIncludePublic(query, includePublic);
    var result = await runQuery(query, args)
    result = processResult(result);
    //console.log("result.rows",result.rows);
    return result.rows;
}


export const searchDataModels = async (searchText, myOrderBy, orderDirection, includePublic, skip, limit, context) => {
    //console.log('search data models called');
    const validatedArgs = validateArgs({myOrderBy, orderDirection, skip, limit});
    var args = {
        searchText: searchText, 
        myOrderBy: validatedArgs.myOrderBy, 
        email: context.email, 
        skip: validatedArgs.skip, 
        limit: validatedArgs.limit
    };
    var query = SearchForModel.replace(/\$DESC/g, validatedArgs.orderDirection);
    query = handleIncludePublic(query, includePublic);
    var result= await runQuery(query, args);
    result = processResult(result);
    return result.rows;
}

export const createModelFromCypher = async (input, context) => {
    //console.log("saveDataModelWithFullMetadata",dataModel);
    let now = new Date().getTime().toString();

    let tagList = [];
    //console.log("input.metadata.tags: ", input.metadata.tags);
    if (input.metadata.tags && input.metadata.tags.length > 0) {
        tagList = await searchForTags(input.metadata.tags, context);        
        if (!tagList) {
            tagList = [];
        }
    }
    // we want an array like this: [ { key: <uuid>, tag: <String> } ]
    tagList = tagList.map(tag => ({ key: (tag.key) ? tag.key : uuidv4(), tag: tag.tag }));
    //console.log('tagList: ', tagList);

    let dataModelKey = uuidv4();
    const metadata = {
        ...input.metadata,
        key: dataModelKey,
        dateCreated: now,
        dateUpdated: now,
        cypherWorkbenchVersion: VERSION,
        viewSettings: {},
        tags: tagList
    }

    let metadataToSave = getMetadata(metadata);
    console.log("metadataToSave: ", metadataToSave);
    var result = await saveDataModelMetadata(metadataToSave, context);
    if (result) {
        try {
            let drawingConfig = input.drawingConfig || {};
            let dataModel = convertCypherToDataModel(input.cypher, drawingConfig);
            let dataModelSaveObject = dataModel.toSaveObject();
            let modelToSave = getFullModelObject(metadata, dataModelSaveObject, dataModel)
            let result = await saveDataModel(modelToSave, context);
            if (result) {
                return dataModelKey;
            } else {
                return "Unexpected response from save, keys didn't match";
            }
        } catch (e) {
            // the saveDataModelMetadata creates it, so we need to delete if Cypher parsing fails
            await removeDataModel(dataModelKey, context);
            throw (e);
        }
    } else {
        return "Unexpected response from metadata save, keys didn't match";
    }
}

export const convertToGraphSchemaFormat = async () => {
    // TODO
}

export const convertCypherToDataModel = (cypher, drawingConfig) => {

    var dataModel = DataModel();
    let layoutConfig = drawingConfig.layoutConfig || {};

    var result = parseCypher(cypher, dataModel);
    if (result.success) {
        doDagreLayout(dataModel, layoutConfig);    
        if (drawingConfig.autoColor) {
            autoColor(dataModel);
        }
    } else {
        throw new Error(`Error parsing Cypher: ${result.message}`);
    }
    return dataModel;
}
