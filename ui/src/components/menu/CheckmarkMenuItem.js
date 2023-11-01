import React, { Component } from 'react'
import {
    MenuItem
} from '@material-ui/core';

export default class CheckmarkMenuItem extends Component {

    constructor (props) {
        super(props);
    }

    render() {
        var { menuId, menuItem } = this.props;
        //console.log('checkmark menu item: ', menuItem);
        return (
          <MenuItem key={menuId + '_' + menuItem.id} onClick={menuItem.onClick}
                        style={{ alignItems: 'baseline', fontSize: '1em', minWidth: '8em', minHeight: '0px' }}>
            <span>{menuItem.text}</span>
            {(menuItem.checked) && <span style={{marginLeft: '.4em'}} className={'fa fa-check'}></span>}
          </MenuItem>
        )
    }
}
