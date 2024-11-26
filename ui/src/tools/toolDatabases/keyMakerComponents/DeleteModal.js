import React from "react";
import PropTypes from "prop-types";
import Modal from '@material-ui/core/Modal';
import "../KeyMakerApp.css";
import { Typography} from "@material-ui/core";
import { OutlinedStyledButton } from '../../../components/common/Components';
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
        width: '500px',
    },
    buttonRow: {
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: 10
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    }
}));

const DeleteModal = ({
                         isOpen,
                         headerContent,
                         content,
                         onClose,
                         onDelete,
                     }) => {

    const classes = useStyles();

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            className={classes.modal}
        >
            <div className={classes.paper}>
                <Typography
                    variant='h6'
                    className={classes.header}
                >
                    {headerContent}
                </Typography>
                <div style={{marginTop: '1em', marginBottom: '1em'}}>
                    {content}
                </div>
                <div className={classes.buttonRow}>
                    <OutlinedStyledButton
                        variant='contained'
                        color='primary'
                        onClick={onClose}
                    >
                        Cancel
                    </OutlinedStyledButton>
                    <OutlinedStyledButton
                        variant='contained'
                        onClick={() => {
                            onDelete();
                            onClose();
                        }}
                    >
                        Delete
                    </OutlinedStyledButton>
                </div>
            </div>
        </Modal>
    )
};

DeleteModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    headerContent: PropTypes.string,
    content: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired
};

export default DeleteModal;
