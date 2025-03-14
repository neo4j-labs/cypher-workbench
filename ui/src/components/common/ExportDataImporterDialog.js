import React, { Component } from 'react';
import {
    Button, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle,
    TextField
} from '@material-ui/core';
import { StyledButton, OutlinedStyledButton } from './Components';
import DataModel from "../../dataModel/dataModel";
import ModelDialogHelper, { 
  handleLoadModelDialogClose,
  showLoadModelDialog 
} from '../../tools/common/model/loadModelDialogHelper';
import {
  loadRemoteDataModel
} from "../../persistence/graphql/GraphQLPersistence";

export default class ExportDataImporterDialog extends Component {

    getSelectedModelText = (modelInfo) => {
      var modelName = "";
      if (modelInfo) {
        modelName = modelInfo.title ? modelInfo.title : "Untitled";
      } else {
        modelName = "No Model Selected";
      }
      return modelName;
    };    

    state = {
      text: 'export_',
      skipItems: '',
      skipProperties: '',
      selectedDataModel: null,
      selectedDataModelKey: null,
      selectedDataModelMetadata: null,
      selectedDataModelText: this.getSelectedModelText()
    }

    // from https://stackoverflow.com/questions/28889826/set-focus-on-input-after-render -and-
    // https://stackoverflow.com/questions/37949394/how-to-set-focus-to-a-materialui-textfield
    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    constructor (props) {
        super(props);
        this.textFocus = this.utilizeFocus();

        this.modelDialogHelperRef = React.createRef();
    }

    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }

    onPaste = (event) => {
      const { pasteHandler, setText } = this.props;
      if (pasteHandler) {
        pasteHandler(event, setText);
      }
    }

    handleDataModel = (dataModel, dataModelResponse) => {
      this.setState(
        {
          selectedDataModel: dataModel,
          selectedDataModelKey: dataModelResponse.metadata.key,
          selectedDataModelMetadata: dataModelResponse.metadata,
          selectedDataModelText: this.getSelectedModelText(
            dataModelResponse.metadata
          ),
        }
     )
    }

    setText = (e) => {
      this.setState({ text: e.target.value });
    }

    setSkipItems = (e) => {
      this.setState({ skipItems: e.target.value });
    }

    setSkipProperties = (e) => {
      this.setState({ skipProperties: e.target.value });
    }
  
    loadRemoteModel = (modelInfo) => {
      if (modelInfo && modelInfo.key) {
        loadRemoteDataModel(modelInfo.key, false, (dataModelResponse) => {
          //console.log(dataModelResponse);
          if (dataModelResponse.success === false) {
            var message = "Error loading model: " + dataModelResponse.error;
            alert(message);
          } else {
            var dataModel = DataModel();
            dataModel.fromSaveObject(dataModelResponse);
            dataModel.setIsRemotelyPersisted(true);          
            this.handleDataModel(dataModel, dataModelResponse);
          }
        });
        handleLoadModelDialogClose(this.modelDialogHelperRef);
      } else {
        alert("Unable to load model, the specified model may not exist");
      }
    };
    
    render () {
        const { text, selectedDataModelText, 
            skipItems, skipProperties, selectedDataModel 
        } = this.state;
        const props = this.props;
        return (
          <Dialog
            maxWidth={props.maxWidth} fullWidth={true}
            open={props.open}
            onClose={props.onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >

            <DialogTitle id="alert-dialog-title">{'Export to Data Importer'}</DialogTitle>
            <DialogContent style={{fontSize: '1.2em'}}>
              <div style={{display:'flex', marginTop:'2px'}}>
                    <div style={{width: '20em', marginTop:'9px'}}>Enter a file prefix:</div>

                    <TextField fullWidth={true} 
                      id="text" 
                      value={text} 
                      onChange={(e) => this.setText(e)}
                      inputRef={this.textFocus.ref}
                      spellCheck="false"
                      placeholder={'Enter value as a prefix for generated files'} 
                      multiline={false} 
                      margin="dense" />
              </div>
              <div style={{display:'flex', marginTop:'2px'}}>
                    <div style={{width: '20em', marginTop:'9px'}}>Enter nodes/rels to skip:</div>

                    <TextField fullWidth={true} 
                      id="text" 
                      value={skipItems} 
                      onChange={(e) => this.setSkipItems(e)}
                      spellCheck="false"
                      placeholder={'Actor, DIRECTED'} 
                      multiline={false} 
                      margin="dense" />
              </div>
              <div style={{display:'flex', marginTop:'2px'}}>
                    <div style={{width: '20em', marginTop:'9px'}}>Enter properties to skip:</div>

                    <TextField fullWidth={true} 
                      id="text" 
                      value={skipProperties} 
                      onChange={(e) => this.setSkipProperties(e)}
                      spellCheck="false"
                      placeholder={'Person.born, Movie.tagline, ACTED_IN.roles'} 
                      multiline={false} 
                      margin="dense" />
              </div>

              <div style={{ display: "flex", flexFlow: "row" }}>
                <div
                  style={{ display: "flex", flexFlow: "row", marginTop: ".6em" }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                      paddingRight: "0.5em",
                    }}
                  >
                    Data Model:{" "}
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {selectedDataModelText}
                  </span>
                </div>
                <OutlinedStyledButton
                  onClick={() => {
                    showLoadModelDialog(this.modelDialogHelperRef);
                  }}
                  style={{ marginLeft: "1em", height: "2em" }}
                  color="primary"
                >
                  <span style={{ whiteSpace: "nowrap" }}>Data Model...</span>
                </OutlinedStyledButton>
              </div>
            </DialogContent>
            <DialogActions>
                <StyledButton onClick={() => {
                      this.props.onClose();
                      this.props.handleRunAndExportData({ 
                        prefix: text,
                        skipItems: skipItems,
                        skipProperties: skipProperties,
                        dataModel: selectedDataModel
                       });
                  }} color="primary" autoFocus={true}>
                  Export
                </StyledButton>
                <StyledButton 
                    onClick={this.props.onClose} 
                    color="primary" 
                    autoFocus={false}>
                  Cancel
                </StyledButton>
            </DialogActions>
            <ModelDialogHelper 
              ref={this.modelDialogHelperRef}
              setStatus={() => {}}
              load={this.loadRemoteModel}
            />
          </Dialog>
        );
    }
}
