import {
    loadGraphDoc,
    loadGraphDocAndDefaultView,
    loadLastOpenedGraphDoc,
    loadLastOpenedGraphDocAndDefaultView,
    removeGraphDocAndDefaultView,
    saveGraphDoc,
    grabLock,
    saveGraphDocMetadata,
    saveGraphDocRootsWithMetadata,
    saveGraphDocWithFullMetadata,
    removeGraphDoc,
    removeGraphDocs,
    listGraphDocs,
    searchGraphDocs
} from "../models/graphDoc";

export default {
    Query: {
        loadGraphDoc: async (obj, args, context, resolveInfo) => {
            return await loadGraphDoc(args.graphDocKey,context);
        },
        loadGraphDocAndDefaultView: async (obj, args, context, resolveInfo) => {
            return await loadGraphDocAndDefaultView(args.graphDocKey,context);
        },
        loadLastOpenedGraphDoc: async (obj, args, context, resolveInfo) => {
            return await loadLastOpenedGraphDoc(args.graphDocType, context);
        },
        loadLastOpenedGraphDocAndDefaultView: async (obj, args, context, resolveInfo) => {
            return await loadLastOpenedGraphDocAndDefaultView(args.graphDocType, context);
        },
        listGraphDocsX: (obj, args, context, resolveInfo) => {
            return listGraphDocs(args.graphDocType, args.myOrderBy, args.orderDirection, context);
        },
        searchGraphDocsX: (obj, args, context, resolveInfo) => {
            return searchGraphDocs(args.graphDocType, args.searchText, args.myOrderBy, args.orderDirection, context);
        }
    },
    Mutation: {
        saveGraphDoc: async (obj, args, context, resolveInfo) => {
            //console.log('save graph doc');
            //console.log(args);
            return await saveGraphDoc(args.graphDoc,context);
        },
        grabLock: async (obj, args, context, resolveInfo) => {
            //console.log('save data model');
            //console.log(args);
            return await grabLock(args.graphDocKey,context);
        },
        saveGraphDocMetadata: async (obj, args, context, resolveInfo) => {
            //console.log('save data model metadata');
            //console.log(args);
            return await saveGraphDocMetadata(args.graphDoc,context);
        },
        saveGraphDocRootsWithMetadata: async (obj, args, context, resolveInfo) => {
            //console.log('save data model metadata');
            //console.log(args);
            return await saveGraphDocRootsWithMetadata(args.graphDocRoots,context);
        },
        saveGraphDocWithFullMetadata: async (obj, args, context, resolveInfo) => {
            //console.log('save data model');
            //console.log(args);
            return await saveGraphDocWithFullMetadata(args.graphDoc,context);
        },
        removeGraphDoc: async (obj, args, context, resolveInfo) => {
            //console.log('remove data model');
            //console.log(args);
            return await removeGraphDoc(args.graphDocKey,context);
        },
        removeGraphDocs: async (obj, args, context, resolveInfo) => {
            //console.log('remove data model');
            //console.log(args);
            return await removeGraphDocs(args.graphDocKeys,context);
        },
        removeGraphDocAndDefaultView: async (obj, args, context, resolveInfo) => {
            //console.log('remove data model');
            //console.log(args);
            return await removeGraphDocAndDefaultView(args.graphDocKey,context);
        }
    }
}
