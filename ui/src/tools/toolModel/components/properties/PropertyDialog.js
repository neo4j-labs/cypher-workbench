import React, { Component } from 'react';
import {
    Dialog, DialogActions,
    DialogContent, DialogTitle,
    TextField
} from '@material-ui/core';

import { OutlinedStyledButton, StyledButton } from '../../../../components/common/Components';
import VariableLabelsAndTypes from '../../../../components/common/VariableLabelsAndTypes';

import SecurityRole from '../../../common/SecurityRole';
import PropertyDefinitions from './PropertyDefinitions';

export default class PropertyDialog extends Component {

    closeGeneralDialog = () => {
        this.setState({ generalDialog: { ...this.state.generalDialog, open: false }});
    }

    state = {
        propertyContainer: {},
        showActions: true,
        showDescriptions: false,
        description: ''
    }

    constructor (props) {
        super(props);
        this.propertyDefinitionsRef = React.createRef();
        this.variableLabelAndTypesRef = React.createRef();
    }

    showActions = () => this.setState({ showActions: true});
    hideActions = () => this.setState({ showActions: false});

    getTitle () {
        //var { propertyContainer } = this.props;
        var { propertyContainer } = this.state;
        return (propertyContainer.classType === 'NodeLabel') ? propertyContainer.label :
            (propertyContainer.type) ? propertyContainer.type : '<REL>';
    }

    componentDidMount () {
        /*
        var { propertyContainer } = this.props;

        this.setState({
            propertyContainer: propertyContainer
        });

        if (this.propertyDefinitionsRef.current) {
            console.log("PropertyDialog componentDidMount calling propertyDefinitionsRef setPropertyContainer");
            this.propertyDefinitionsRef.current.setPropertyContainer(propertyContainer);
        }
        if (this.variableLabelAndTypesRef.current) {
            this.variableLabelAndTypesRef.current.setData(propertyContainer);
        }
        */
    }

    setPropertyContainer (propertyContainer, propertyContainerDataItem) {
        setTimeout(() => {
            console.log("PropertyDialog setPropertyContainer");
            this.setState({
                showActions: true,                
                propertyContainer: propertyContainer,
                description: (propertyContainer.description) ? propertyContainer.description : ''
            });
            if (this.propertyDefinitionsRef.current) {
                console.log("PropertyDialog setPropertyContainer calling propertyDefinitionsRef setPropertyContainer");
                this.propertyDefinitionsRef.current.setPropertyContainer(propertyContainer);
            }
            if (this.variableLabelAndTypesRef.current) {
                this.variableLabelAndTypesRef.current.setData(propertyContainerDataItem);
            }
        }, 200)
    }

    addPropertyDefiniton = () => {
        if (this.propertyDefinitionsRef.current) {
            this.propertyDefinitionsRef.current.addPropertyDefiniton();
        }
    }

    setDescriptionValue = (e) => {
        if (SecurityRole.canEdit()) {
            const value = e.target.value;
            if (this.state.description !== value) {
                this.setState({
                    description: value
                });
            }
        }
    }

    saveDescription = () => {
        var { propertyContainer, description } = this.state;
        propertyContainer.update({
            description: description
        });        
    }

    toggleDescription = () => {
        var { showDescriptions } = this.state;
        this.setState({
            showDescriptions: !showDescriptions
        });
    }

    render () {
        var props = this.props;

        var { showActions, showDescriptions, description, propertyContainer } = this.state;

        return (
          <Dialog
            maxWidth={props.maxWidth} fullWidth={true}
            open={props.open}
            disableEscapeKeyDown={true}            
            onClose={props.onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{"Edit " + this.getTitle() + " Properties"}</DialogTitle>
            <DialogContent>
                {showDescriptions &&
                    <TextField id="description" label={`${this.getTitle()} Description`} value={description}
                        onChange={this.setDescriptionValue} onBlur={this.saveDescription}
                        autoComplete='off'
                        multiline={true} rows={2} 
                        margin="dense" style={{marginRight: '.5em', marginTop: '-0.5em', width:'80em'}}/>
                }
                <VariableLabelsAndTypes 
                    ref={this.variableLabelAndTypesRef}
                    editFirstChip={false}
                    editHelper={props.editHelper}
                />
                <PropertyDefinitions ref={this.propertyDefinitionsRef}
                    showDescriptions={showDescriptions}
                    hideActions={this.hideActions}
                    showActions={this.showActions}
                    dataModel={props.dataModel} propertyContainer={propertyContainer} />
            </DialogContent>
            <DialogActions style={{display:'inline'}}>
              {(SecurityRole.canEdit() && showActions) &&
                    <OutlinedStyledButton style={{float:'left', marginLeft:'3em'}} onClick={this.addPropertyDefiniton}>
                        <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> Property
                    </OutlinedStyledButton>
              }
              {showActions &&
                <OutlinedStyledButton style={{float:'left'}} onClick={this.toggleDescription}>
                    <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-file-alt'/> 
                        {`${(showDescriptions) ? 'Hide' : 'Show'} Descriptions`}
                </OutlinedStyledButton>
              }
              <StyledButton style={{float:'right'}} onClick={props.onClose} color="primary">
                Close
              </StyledButton>
            </DialogActions>
          </Dialog>
      )
    }
}
