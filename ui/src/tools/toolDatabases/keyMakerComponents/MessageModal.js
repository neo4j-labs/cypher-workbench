import React from "react";
import Modal from '@material-ui/core/Modal';
import "../KeyMakerApp.css";
import {Typography} from "@material-ui/core";
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
        padding: theme.spacing(2, 4, 3)
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
    }
}));

const MessageModal = ({ isOpen, onClose, title, message }) => {
    const classes = useStyles();
    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            closeIcon size={"tiny"}
            className={classes.modal}
        >
            <div className={classes.paper}>
                    <Typography
                        variant='h6'
                        className={classes.header}
                    >
                        {title}
                    </Typography>
                    {message}
            </div>
        </Modal>
    );

}

export default MessageModal;
