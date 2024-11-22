
import React, { Component } from "react";
import LoadModelForm from "../../../tools/toolModel/components/LoadModelForm";
import {
    listRemoteDataModelMetadata,
    searchRemoteDataModelMetadata,
    NETWORK_STATUS
} from "../../../persistence/graphql/GraphQLPersistence";
  
export const addModelMetadata = (loadedModelMetadata, ref) => {
    if (ref.current) {
        // points back to the instance of this component from the calling class
        ref.current.addMetadata(loadedModelMetadata);
    }
}

export const handleLoadModelDialogClose = (ref, callback) => {
    if (ref.current) {
        // points back to the instance of this component from the calling class
        ref.current.handleLoadModelDialogClose(callback);
    }
}

export const showLoadModelDialog = (ref) => {
    if (ref.current) {
        // points back to the instance of this component from the calling class
        ref.current.showLoadModelDialog();
    }
}

export default class ModelDialogHelper extends Component {

    state = {
        showLoadModelDialog: false,
        modelMetadataMap: {},
        loadModelDialog: {
            searchText: "",
            includePublic: true,
            myOrderBy: "dateUpdated",
            orderDirection: "DESC",
        }
    }

    constructor(props) {
        super(props);
    }    

    addMetadata = (modelMetadata) => {
        this.setState({
            modelMetadataMap: {
                ...this.state.modelMetadataMap,
                [modelMetadata.key]: modelMetadata
            }
        })
    }

    showLoadModelDialog = () => {
        this.getModelMetadataMap(() => {
          this.setState({
            showLoadModelDialog: true,
          });
        });
      };

    handleLoadModelDialogClose = (callback) => {
        this.setState({
            showLoadModelDialog: false,
        }, () => {
            if (callback && typeof(callback) === 'function') {
                callback();
            }
        });
    };

    getModelMetadataMap = (callback) => {
        const {
          searchText,
          includePublic,
          myOrderBy,
          orderDirection,
        } = this.state.loadModelDialog;
        if (searchText) {
          this.props.setStatus("Searching...", true);
          searchRemoteDataModelMetadata(
            searchText,
            includePublic,
            myOrderBy,
            orderDirection,
            (response) => {
              this.props.setStatus("", false);
              this.handleModelMetadataResponse(
                response,
                "searchDataModelsX",
                callback
              );
            }
          );
        } else {
          this.props.setStatus("Loading...", true);
          listRemoteDataModelMetadata(includePublic, myOrderBy, orderDirection, (response) => {
            this.props.setStatus("", false);
            this.handleModelMetadataResponse(response, "listDataModelsX", callback);
          });
        }
    };

    handleModelMetadataResponse = (response, key, callback) => {
        if (response.success) {
            var data = response.data;
            var modelMetadataMap = {};
            //console.log(data);
            var dataModels = data && data[key] ? data[key] : [];
            dataModels.forEach((dataModel) => {
            modelMetadataMap[dataModel.key] = dataModel.metadata;
            });
            this.setState(
            {
                modelMetadataMap: modelMetadataMap,
            },
            () => {
                if (callback) {
                callback();
                }
            }
            );
        } else {
            var errorStr = "" + response.error;
            if (errorStr.match(/Network error/)) {
            this.communicationHelper.setNetworkStatus(NETWORK_STATUS.OFFLINE);
            }
            alert(response.error);
        }
    };
    
    performModelSearch = (searchText, includePublic, myOrderBy, orderDirection) => {
        this.setState({
          loadModelDialog: {
            searchText: searchText,
            includePublic: includePublic,
            myOrderBy: myOrderBy,
            orderDirection: orderDirection
          },
        });
    
        if (searchText) {
          this.props.setStatus("Searching...", true);
          searchRemoteDataModelMetadata(
            searchText,
            includePublic,
            myOrderBy,
            orderDirection,
            (response) => {
              this.props.setStatus("", false);
              this.handleModelMetadataResponse(response, "searchDataModelsX");
            }
          );
        } else {
          this.props.setStatus("Loading...", true);
          listRemoteDataModelMetadata(includePublic, myOrderBy, orderDirection, (response) => {
            this.props.setStatus("", false);
            this.handleModelMetadataResponse(response, "listDataModelsX");
          });
        }
      };     
      
    render () {
        const { showLoadModelDialog, modelMetadataMap } = this.state;

        return (
            <LoadModelForm
                maxWidth={"lg"}
                open={showLoadModelDialog}
                onClose={this.handleLoadModelDialogClose}
                load={this.props.load}
                cancel={this.handleLoadModelDialogClose}
                disableDelete={true}
                performModelSearch={this.performModelSearch}
                modelMetadataMap={modelMetadataMap}
            />
        )

    }
}

