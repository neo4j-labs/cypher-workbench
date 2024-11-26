import React, { Component } from 'react'
import {
    Button, Divider,
    Menu, MenuItem
} from '@material-ui/core';
import SubMenu from './SubMenu';
import StatefulCheckmarkMenuItem from './StatefulCheckmarkMenuItem';

export default class CWMenu extends Component {

    state = {
        menuAnchor: null
    }

    handleClick = (event) => {
        this.setState({
            menuAnchor: event.currentTarget
        })
    };

    handleAction = (menu, menuItem) => {
        //console.log(menuId + ":" +  menuItemId);
        if (menuItem && menuItem.handler) {
            menuItem.handler(menu, menuItem);
        } else if (menu && menu.handler) {
            menu.handler(menu, menuItem);
        }
        this.setState({
            menuAnchor: null
        })
    };

    handleClose = () => {
        this.setState({
            menuAnchor: null
        })
    };

    render() {
        var { menu, classes, additionalStyle } = this.props;
        additionalStyle = additionalStyle || {};
        return (
            <>
            <Button key={'button-' + menu.id} className={classes.toolbarButton}
                    aria-controls={'menu-' + menu.id} aria-haspopup="true"
                    onClick={this.handleClick}
                    style={additionalStyle}
            >
              {menu.text}
            </Button>
            <Menu
                key={'menu-' + menu.id}
                id={'menu-' + menu.id}
                anchorEl={this.state.menuAnchor}
                // https://stackoverflow.com/questions/48157863/how-to-make-a-dropdown-menu-open-below-the-appbar-using-material-ui
                getContentAnchorEl={null}
                keepMounted
                anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                open={Boolean(this.state.menuAnchor)}
                onClose={this.handleClose}
              >
              {menu.menuItems && menu.menuItems.map(menuItem => {
                  //console.log(menuItem);
                  return (menuItem.component) ?
                    menuItem.component
                  :
                  (menuItem.text === '_') ?
                      <Divider key={menu.id + '_' + menuItem.id} />
                      :
                      (menuItem.subMenuItems) ?
                          <SubMenu className={classes.toolbarMenuItem}
                            key={menu.id + '_' + menuItem.id}
                            text={menuItem.text}
                            menuItems={menuItem.subMenuItems}
                          />
                          :
                          (menuItem.checkmarkMenuItem) ? 
                            <StatefulCheckmarkMenuItem key={menu.id + '_' + menuItem.id} menuId={menu.id} menuItem={menuItem.menuItem}>
                            </StatefulCheckmarkMenuItem>
                            :
                            <MenuItem key={menu.id + '_' + menuItem.id} className={classes.toolbarMenuItem}
                                    onClick={() => this.handleAction(menu, menuItem)}>{menuItem.text}
                            </MenuItem>

              })}
            </Menu>
            </>
        )
    }
}
