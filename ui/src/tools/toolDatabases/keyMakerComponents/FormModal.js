import React from "react";
import Modal from '@material-ui/core/Modal';
import "../KeyMakerApp.css";
import {Button} from "@material-ui/core";

import {makeStyles} from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: 10
  },
  header: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'red'
  },
  controls: {
    display: 'flex',
    marginTop: 20,
    justifyContent: "space-between"
  }
}));

const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  buttonName,
  children,
}) => {
  const classes = useStyles();
  return(
      <Modal
          className={classes.modal}
          open={isOpen}
          onClose={onClose}
          closeIcon
      >
        <div
          className={classes.paper}
        >
          {children}
          <div
            className={classes.controls}
          >
            <Button
                variant='contained'
                onClick={onClose}
            >
              Cancel
            </Button>
            <Button
                variant='contained'
                color='primary'
                onClick={onSubmit}
            >
              {buttonName}
            </Button>
          </div>
        </div>
      </Modal>
  );
}

export default FormModal;
