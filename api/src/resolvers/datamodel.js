import {
    loadDataModel,
    loadLastOpenedModel,
    searchForItem,
    saveDataModel,
    grabModelLock,
    saveDataModelMetadata,
    saveDataModelWithFullMetadata,
    saveNodeLabelDisplay,
    removeDataModel,
    listDataModels,
    listDataModelsAndAddExplicitMatches,
    searchDataModels,
    createModelFromCypher,
    convertToGraphSchemaFormat
} from "../models/datamodel";

export default {
    Query: {
        loadDataModel: async (obj, args, context, resolveInfo) => {
            return await loadDataModel(args.dataModelKey, args.updateLastOpenedModel, context);
        },
        loadLastOpenedModel: async (obj, args, context, resolveInfo) => {
            return await loadLastOpenedModel(context);
        },
        findAuthors: async (obj, args, context, resolveInfo) => {
            return await searchForItem(args.searchText, 'Author', 'name', ['key', 'name'],context);
        },
        findCustomers: async (obj, args, context, resolveInfo) => {
            return await searchForItem(args.searchText, 'Customer', 'name', ['key', 'name'],context);
        },
        findIndustries: async (obj, args, context, resolveInfo) => {
            return await searchForItem(args.searchText, 'Industry', 'name', ['name'],context);
        },
        findTags: async (obj, args, context, resolveInfo) => {
            return await searchForItem(args.searchText, 'Tag', 'tag', ['key', 'tag'],context);
        },
        findUseCases: async  (obj, args, context, resolveInfo) => {
            return await searchForItem(args.searchText, 'UseCase', 'name', ['name'], context);
        },
        listDataModelsX: (obj, args, context, resolveInfo) => {
            return listDataModels(args.myOrderBy, args.orderDirection, args.includePublic, args.skip, args.limit, context);
        },
        listDataModelsAndAddExplicitMatches: (obj, args, context, resolveInfo) => {
            return listDataModelsAndAddExplicitMatches(args.explicitKeysToSearchFor, args.myOrderBy, args.orderDirection, args.includePublic, args.skip, args.limit, context);
        },
        searchDataModelsX: (obj, args, context, resolveInfo) => {
            return searchDataModels(args.searchText, args.myOrderBy, args.orderDirection, args.includePublic, args.skip, args.limit, context);
        }
    },
    Mutation: {
        saveDataModel: async (obj, args, context, resolveInfo) => {
            //console.log('save data model');
            //console.log(args);
            return await saveDataModel(args.dataModel,context);
        },
        grabModelLock: async (obj, args, context, resolveInfo) => {
            //console.log('save data model');
            //console.log(args);
            return await grabModelLock(args.dataModelKey,context);
        },
        saveDataModelMetadata: async (obj, args, context, resolveInfo) => {
            //console.log('save data model metadata');
            //console.log(args);
            return await saveDataModelMetadata(args.dataModelMetadata,context);
        },
        saveDataModelWithFullMetadata: async (obj, args, context, resolveInfo) => {
            //console.log('save data model');
            //console.log(args);
            return await saveDataModelWithFullMetadata(args.dataModel,context);
        },
        saveNodeLabelDisplay: async (obj, args, context, resolveInfo) => {
            //console.log('save node label display');
            //console.log(args);
            await saveNodeLabelDisplay(args.nodeLabels,context);
            return true;
        },
        removeDataModel: async (obj, args, context, resolveInfo) => {
            //console.log('remove data model');
            //console.log(args);
            return await removeDataModel(args.dataModelKey,context);
        },
        createModelFromCypher: async (obj, args, context, resolveInfo) => {
            return await createModelFromCypher(args.input, context);
        },
        convertToGraphSchemaFormat: async (obj, args, context, resolveInfo) => {
            return await convertToGraphSchemaFormat(args.dataModelKey, context);
        }    
    }
}
