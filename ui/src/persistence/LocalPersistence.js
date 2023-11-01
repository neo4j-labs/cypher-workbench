
var DATA_MODEL_METADATA_KEY = 'dataModelMetadata';

export function saveLocalDataModel (modelInfo, dataModel) {
    var modelKey = modelInfo.key;
    //console.log("canvasViewSettings: " + JSON.stringify(modelInfo.canvasViewSettings));
    var modelsJson = localStorage.getItem(DATA_MODEL_METADATA_KEY);
    var models = {};
    if (modelsJson) {
        models = JSON.parse(modelsJson);
    }
    models[modelKey] = modelInfo;
    localStorage.setItem(DATA_MODEL_METADATA_KEY, JSON.stringify(models));

    var dataModelString = dataModel.toJSON();
    //console.log(dataModel.toJSON(true));
    localStorage.setItem(modelKey, dataModelString);
}

export function loadLocalDataModelMetadata () {
    var modelsJson = localStorage.getItem(DATA_MODEL_METADATA_KEY);
    var models = {};
    if (modelsJson) {
        models = JSON.parse(modelsJson);
    }
    return models;
}

export function getLocalDataModelJSON (modelInfoKey) {
    var dataModelJSON = localStorage.getItem(modelInfoKey);
    return dataModelJSON;
}

export function deleteLocalDataModel (modelInfoKey) {
    var modelsJson = localStorage.getItem(DATA_MODEL_METADATA_KEY);
    var models = {};
    if (modelsJson) {
        models = JSON.parse(modelsJson);
        delete models[modelInfoKey];
    }
    localStorage.setItem(DATA_MODEL_METADATA_KEY, JSON.stringify(models));
    localStorage.removeItem(modelInfoKey);
}
