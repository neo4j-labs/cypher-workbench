// from https://github.com/mui-org/material-ui/issues/11723
import React from "react";
import PropTypes from "prop-types";
import MuiMenu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import SubMenu from "./SubMenu";
import CheckmarkMenuItem from "./CheckmarkMenuItem";

export default class EnhancedMenu extends React.Component {
  renderMenuItems = () => {
    const { menuItems, className } = this.props;
    return menuItems.map(menuItem => {
      return (
        <CheckmarkMenuItem key={menuItem.id} menuItem={menuItem}/>
        /*
        <MenuItem key={menuItem.id} onClick={menuItem.onClick} className={className}>
          {menuItem.text}
        </MenuItem>
        */
      );
    });
  };

  render() {
    const { anchorElement, open, onClose, ...others } = this.props;
    const { menuItems, ...restOfProps } = others;
    return (
      <MuiMenu
        {...restOfProps}
        anchorEl={anchorElement}
        open={open}
        onClose={onClose}
      >
        {this.renderMenuItems()}
      </MuiMenu>
    );
  }
}

EnhancedMenu.propTypes = {
  anchorElement: PropTypes.any,
  menuItems: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired
};
