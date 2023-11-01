import React, { Component } from 'react';
import {
    Dialog, DialogActions,
    DialogContent, DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography
} from '@material-ui/core';
import { StyledButton } from './Components';

export default class GeneralSelectDialog extends Component {

    state = {
      selectedValue: ''
    };

    constructor (props) {
        super(props);
    }

    setValue = (e) => {
      var { selectedValue } = this.props;
      var value = e.target.value;
      if (selectedValue !== value) {
        this.setState({
          selectedValue: value
        });
      }
    }

    setSelectedValue (selectedValue) {
      this.setState({
        selectedValue: selectedValue
      });
    }

    render () {
        const props = this.props;
        var { selectedValue } = this.state;

        return (
          <Dialog
            maxWidth={props.maxWidth} fullWidth={true}
            open={props.open}
            onClose={props.onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
            <DialogContent>
              <Typography variant="body1" color="inherit" style={{marginBottom: ".5em"}}>
                    {props.message}
              </Typography>

              <FormControl variant="outlined" style={{marginTop:'.375em', height: '10em'}}>
                    <InputLabel htmlFor="general-select-label" style={{transform: 'translate(3px, 3px) scale(0.75)'}}>
                        {props.selectLabel}
                    </InputLabel>
                    <Select
                        value={selectedValue}
                        onChange={this.setValue}
                        id="general-select"
                        inputProps={{
                            name: 'general-select',
                            id: 'general-select-label',
                        }}
                        style={{height: '3em', width: '30em'}}
                    >
                        {props.selectOptions && props.selectOptions.map((selectOption, index) => 
                            <MenuItem key={index} value={selectOption.value}>{selectOption.text}</MenuItem>
                        )}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
              {props.buttons.map((button, index) => {
                  return (
                      <StyledButton key={index} onClick={() => {
                            var { selectedValue } = this.state;  
                            button.onClick(button, index, selectedValue);
                        }} color="primary" autoFocus={button.autofocus}>
                        {button.text}
                      </StyledButton>
                  )
              })}
            </DialogActions>
          </Dialog>
        );
    }
}
