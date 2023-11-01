import React, { Component } from 'react'
import {
    MenuItem
} from '@material-ui/core';

export default class StatefulCheckmarkMenuItem extends Component {

    state = {
        checked: false
    }

    constructor (props) {
        super(props);
        var { menuItem } = this.props;
        menuItem = menuItem || {};
        var { checked } = menuItem;
        this.state.checked = checked;

        // this is an unfortunate hack...this menu item may be rendered before we know
        //   whether it should be checked or not, and since it may be loaded from a deeply
        //   nested state tree, it would be difficult for a ref to be passed around

        // therefore, when this component loads, we will pass a reference to the setChecked()
        //   function as an argument to the loadedCallback
        
        var { menuItem } = this.props;
        menuItem = menuItem || {};
        var { onLoaded } = menuItem;

        if (onLoaded) {
            onLoaded({setChecked: this.setChecked});
        }
    }

    setChecked = (checked) => {
        this.setState({
            checked: checked
        });
    }

    render() {
        var { checked } = this.state;
        var { menuId, menuItem } = this.props;
        //console.log('checkmark menu item: ', menuItem);
        return (
          <MenuItem key={menuId + '_' + menuItem.id} onClick={() => menuItem.onClick({ checked: checked, setChecked: this.setChecked })}
                        style={{ alignItems: 'baseline', fontSize: '1em', minWidth: '8em', minHeight: '0px' }}>
            <span>{menuItem.text}</span>
            {(checked) && <span style={{marginLeft: '.4em'}} className={'fa fa-check'}></span>}
          </MenuItem>
        )
    }
}
