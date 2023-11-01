import {
    SaveDataModel, SaveDataModelMetadata, SaveNodeLabelDisplay,
    LoadDataModel, RemoveDataModel, GrabModelLock
} from './cypherStatements';
import { ListModels, SearchForModel } from './searchModelCypher';
//import { runQuery, runStatement} from "../util/run";
import { processResult, getFirstRowValue } from './resultHelper';
import { runQuery } from "../util/run";
import { isCloudLicense, getLicenseRestriction, LicenseRestriction } from '../license/license';

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

export const listDataModels = async (myOrderBy, orderDirection, skip, limit, context) => {
    const validatedArgs = validateArgs({myOrderBy, orderDirection, skip, limit});
    var args = {
        myOrderBy: validatedArgs.myOrderBy, 
        email: context.email, 
        skip: validatedArgs.skip, 
        limit: validatedArgs.limit
    };
    var query = ListModels.replace(/\$DESC/, validatedArgs.orderDirection);
    var result = await runQuery(query, args)
    result = processResult(result);
    //console.log("result.rows",result.rows);
    return result.rows;
}

export const searchDataModels = async (searchText, myOrderBy, orderDirection, skip, limit, context) => {
    //console.log('search data models called');
    const validatedArgs = validateArgs({myOrderBy, orderDirection, skip, limit});
    var args = {
        searchText: searchText, 
        myOrderBy: validatedArgs.myOrderBy, 
        email: context.email, 
        skip: validatedArgs.skip, 
        limit: validatedArgs.limit
    };
    var query = SearchForModel.replace(/\$DESC/, validatedArgs.orderDirection);
    var result= await runQuery(query, args);
    result = processResult(result);
    return result.rows;
}
