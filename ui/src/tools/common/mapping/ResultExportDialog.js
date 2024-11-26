import React from 'react';
import {
    Dialog, DialogActions,
    DialogContent, DialogTitle
} from '@material-ui/core';
import { StyledButton } from '../../../components/common/Components';
import BigQueryDestination from './bigquery/BigQueryDestination';
import { makeStyles } from '@material-ui/core/styles';

export const ResultExportTypes = {
  BigQuery: "BigQuery"
}

export default function ResultExportDialog(props) {

  const useStyles = makeStyles(() => ({
    paper: { width: '50em' },
  }));
  const myclasses = useStyles();

  const closeFunc = props.onClose || props.handleClose;

  var exportType = <span>No export type configured</span>
  switch (props.exportType) {
    case ResultExportTypes.BigQuery:
        exportType = <BigQueryDestination 
          parentContainer={props.parentContainer}
          selectedNeo4jDatabaseText={props.selectedNeo4jDatabaseText}
        />;
        break;
  }

  return (
      <Dialog
        maxWidth={'md'}
        
        open={props.open}
        onClose={closeFunc}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{props.title}</DialogTitle>
        <DialogContent style={{width:'50em'}}>
          {exportType}
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
