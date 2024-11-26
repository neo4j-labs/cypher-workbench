import React, { Component } from 'react'

import PropTypes from 'prop-types';
import {
    Box, Button,
    Typography
} from '@material-ui/core';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { withStyles } from '@material-ui/styles';
import { extend } from 'lodash';

const useStyles = makeStyles(theme => ({
  button: {
      margin: theme.spacing(1),
  },
  smallButton: {
      margin: theme.spacing(1),
      padding: '3px 6px',
      minWidth: '32px',
      minHeight: '24px'
  },
  label: {
      ...theme.typography.button,
      padding: theme.spacing(1),
      margin: theme.spacing(1),
      borderRadius: '4px'
  },
  primaryLabel: {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText
  },
  secondaryLabel: {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText
  }
}));

const styles = theme => {
  
  // these are here to create a theme if one not passed in
  //   because it's failing during unit tests, but not
  //   when loaded in browser
  const spacing = (arg) => arg;
  theme = theme || {};
  theme.palette = theme.palette || {};
  theme.spacing = theme.spacing || spacing;
  theme.palette.primary = theme.palette.primary || {};
  // end

  return {
    outlinedButton: {
      border: '2px solid ' + theme.palette.primary.main,
      color:'rgba(0, 0, 0, 0.87)',
      backgroundColor: 'rgba(255, 255, 255, 0.0)',
      margin: theme.spacing(1),
      '&:hover': {
        color:'#fff',
      },
    },
    outlinedSmallButton: {
        border: '2px solid ' + theme.palette.primary.main,
        color:'rgba(0, 0, 0, 0.87)',
        backgroundColor: 'rgba(255, 255, 255, 0.0)',
        margin: theme.spacing(1),
        '&:hover': {
          color:'#fff',
        },
        padding: '3px 6px',
        minWidth: '32px',
        minHeight: '24px'
    }
  }
}


export const StyledLabel = (props) => {
    const myclasses = useStyles();
    var { children, className, ...other } = props
    return (
       <span className={clsx([myclasses.label, myclasses[className]])} {...other}>
          {children}
       </span>
   );
}

export const StyledButton = (props) => {
    const myclasses = useStyles();
    var { children, size, ...other } = props;
    var classes = (props.size === 'small') ? myclasses.smallButton : myclasses.button;
    return (
       <Button variant="contained" {...other} className={ classes }>
           {children}
       </Button>
   );
}

export class OutlinedStyledButtonInternal extends Component {

    render () {
        const props = this.props;
        var { classes, children, size, className, ...other } = props;
        var buttonClasses = (props.size === 'small') ? classes.outlinedSmallButton : classes.outlinedButton;
        var classNames = (className) ? clsx([buttonClasses, className]) : buttonClasses
        
        return (
           <Button variant="contained" {...other} className={classNames}>
               {children}
           </Button>
       );
    }
}

// converted OutlinedStyledButton to class, but had to use hooks, so used withStyles() instead of useStyles()
// https://stackoverflow.com/questions/56432167/how-to-style-components-using-makestyles-and-still-have-lifecycle-methods-in-mat?rq=1
export const OutlinedStyledButton = withStyles(styles)(OutlinedStyledButtonInternal);

export const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
        <Box p={0}>{children}</Box>
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};
