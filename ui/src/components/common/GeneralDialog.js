import React from 'react';
import {
    Button, Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle
} from '@material-ui/core';
import { StyledButton } from './Components';

export default function GeneralDialog(props) {

  const closeFunc = props.onClose || props.handleClose;

  return (
      <Dialog
        open={props.open}
        onClose={closeFunc}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
        <DialogContent>
          {(props.isReactEl) ? 
            props.description
          :
          <DialogContentText id="alert-dialog-description">
            {props.description}
          </DialogContentText>
          }
        </DialogContent>
        <DialogActions>
          {props.buttons.map((button, index) => {
              return (
                  <StyledButton key={index} onClick={() => button.onClick(button, index, closeFunc)} color="primary" autoFocus={button.autofocus}>
                    {button.text}
                  </StyledButton>
              )
          })}
        </DialogActions>
      </Dialog>
  );
}
