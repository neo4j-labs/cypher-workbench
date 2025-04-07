import React, { Component } from 'react';
import {
    Checkbox,
    Dialog, DialogActions,
    DialogContent, DialogTitle,
    FormControlLabel, 
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

const LocalStorageKey = 'cw_export_data_importer';
const SaveKeysToIgnore = ['selectedDataModel','selectedDataModelMetadata'];

const loadSavedValuesFromLocalStorage = () => {
    let json = localStorage.getItem(LocalStorageKey);
    let config = {};
    if (json) {
      try {
        config = JSON.parse(json);
      } catch (e) {
        console.log('Error loading config, could not parse JSON, JSON: ', json);
      }
    }
    return config;
}

const getInitialStateValue = (key, saveObj, defaultState) => {
  if (key in saveObj) {
    return saveObj[key];
  } else {
    return defaultState[key];
  }
}

const persistValuesToLocalStorage = (saveObj) => {
  let objToSave = {};
  Object.keys(saveObj)
    .filter(key => !SaveKeysToIgnore.includes(key))
    .forEach(key => objToSave[key] = saveObj[key]);

  localStorage.setItem(LocalStorageKey, JSON.stringify(objToSave));
}

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

    defaultState = {
      text: 'export_',
      skipItems: '',
      skipProperties: '',
      exportToZip: true,
      exportWorkbenchModel: false,
      selectedDataModel: null,
      selectedDataModelKey: null,
      selectedDataModelMetadata: null,
      selectedDataModelText: this.getSelectedModelText()
    }
    localStorageValues = loadSavedValuesFromLocalStorage();

    state = Object.keys(this.defaultState)
      // skip these - we'll need to load them based off of selectedDataModelKey
      .filter(key => !SaveKeysToIgnore.includes(key))
      .reduce((map,key) => {
        let val = getInitialStateValue(key, this.localStorageValues, this.defaultState);
        map[key] = val;
        return map;
      }, {});

    resetState = () => {
      this.setState(this.defaultState, () => {
        persistValuesToLocalStorage(this.state)
      });
    }

    setExportToZip = (e) => {
        this.setState({
            exportToZip: e.target.checked
        }, () => {
          persistValuesToLocalStorage(this.state)
        });
    }

    setExportWorkbenchModel = (e) => {
      this.setState({
          exportWorkbenchModel: e.target.checked
      }, () => {
        persistValuesToLocalStorage(this.state)
      });
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
        }, () => {
          persistValuesToLocalStorage(this.state)
        }
      )
    }
  
    loadRemoteModel = (modelInfo, suppressErrors) => {
      if (modelInfo && modelInfo.key) {
        loadRemoteDataModel(modelInfo.key, false, (dataModelResponse) => {
          //console.log(dataModelResponse);
          if (dataModelResponse.success === false) {
            if (!suppressErrors) {
              var message = "Error loading model: " + dataModelResponse.error;
              alert(message);
            }
          } else {
            var dataModel = DataModel();
            dataModel.fromSaveObject(dataModelResponse);
            dataModel.setIsRemotelyPersisted(true);          
            this.handleDataModel(dataModel, dataModelResponse);
          }
        });
        handleLoadModelDialogClose(this.modelDialogHelperRef);
      } else {
        if (!suppressErrors) {
          alert("Unable to load model, the specified model may not exist");
        }
      }
    };
      
    handleSavedLocalModelKey = () => {
      let { selectedDataModelKey } = this.state;
      if (selectedDataModelKey) {
        this.loadRemoteModel({ key: selectedDataModelKey }, true);
      }
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

        this.handleSavedLocalModelKey();
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

    setText = (e) => {
      this.setState({ text: e.target.value }, () => {
        persistValuesToLocalStorage(this.state)
      });
    }

    setSkipItems = (e) => {
      this.setState({ skipItems: e.target.value }, () => {
        persistValuesToLocalStorage(this.state)
      });
    }

    setSkipProperties = (e) => {
      this.setState({ skipProperties: e.target.value }, () => {
        persistValuesToLocalStorage(this.state)
      });
    }
  
    render () {
        const { text, exportToZip, exportWorkbenchModel, selectedDataModelText, 
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
              <div style={{display:'flex', flexFlow: "row"}}>
                <FormControlLabel label="Export to Zip" control={
                      <Checkbox
                        checked={exportToZip}
                        onChange={this.setExportToZip}
                        name="exportToZip"
                        color="primary"
                      />
                    }
                />
                <FormControlLabel label="Export Workbench Model" control={
                      <Checkbox
                        checked={exportWorkbenchModel}
                        onChange={this.setExportWorkbenchModel}
                        name="exportWorkbenchModel"
                        color="primary"
                      />
                    }
                />
              </div>
            </DialogContent>
            <DialogActions>
                <OutlinedStyledButton 
                  onClick={() => {
                    this.resetState();
                  }} 
                  color="primary" 
                  style={{marginRight: 'auto'}}
                  autoFocus={false}
                >
                  Reset
                </OutlinedStyledButton>

                <StyledButton onClick={() => {
                      this.props.onClose();
                      this.props.handleRunAndExportData({ 
                        prefix: text,
                        skipItems: skipItems,
                        skipProperties: skipProperties,
                        dataModel: selectedDataModel,
                        dataModelText: selectedDataModelText,
                        exportToZip: exportToZip,
                        exportWorkbenchModel: exportWorkbenchModel
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
