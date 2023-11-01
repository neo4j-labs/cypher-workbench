import React, { Component } from 'react';
import {
    Button, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle,
    TextField
} from '@material-ui/core';
import { StyledButton } from './Components';

export default class GeneralTextDialog extends Component {

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

    render () {
        const props = this.props;
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
              {props.htmlPreviewMode ? 
                <div dangerouslySetInnerHTML={{__html: props.htmlText}}></div>
                :
                <TextField fullWidth={true} id="text" value={props.text} onChange={(e) => (!props.disableEditing) ? props.setText(e): ''}
                  inputRef={this.textFocus.ref}
                  spellCheck="false"
                  onPaste={this.onPaste}
                  placeholder={props.placeholder} multiline={true} rows={(props.rows) ? props.rows : 10} margin="dense" />
              }
            </DialogContent>
            <DialogActions>
              {props.buttons.map((button, index) => {
                  return (
                      <StyledButton key={index} onClick={() => button.onClick(button, index)} color="primary" autoFocus={button.autofocus}>
                        {button.text}
                      </StyledButton>
                  )
              })}
            </DialogActions>
          </Dialog>
        );
    }
}
