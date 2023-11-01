// from https://github.com/mui-org/material-ui/issues/11723
import React from "react";
import PropTypes from "prop-types";
import MenuItem from "@material-ui/core/MenuItem";
import ArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";
import withStyles from "@material-ui/core/styles/withStyles";
import EnhancedMenu from "./EnhancedMenu";

const styles = {
  subMenuItem: {
    display: "flex",
    justifyContent: "space-between"
  }
};

class SubMenu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      menuOpen: false,
      anchorElement: null
    };
  }

  handleItemClick = event => {
    if (!this.anchorElement) {
      this.setState({
        anchorElement: event.currentTarget
      });
    }

    this.setState({
      menuOpen: !this.menuOpen
    });
  };

  handleSubMenuClose = () => {
    this.setState({
      menuOpen: false
    });
  };

  render() {
    const { text, menuItems, className } = this.props;
    const { anchorElement, menuOpen } = this.state;
    return (
      <React.Fragment>
        <MenuItem
          style={{display:"flex", flexDirection: "row", justifyContent: "space-between", fontSize: '1em', minWidth: '8em', minHeight: '0px'}}
          onClick={this.handleItemClick}
          className={className}
        >
          {text}
          <ArrowRightIcon />
        </MenuItem>
        <EnhancedMenu
          className={className}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right"
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left"
          }}
          open={menuOpen}
          menuItems={menuItems}
          anchorElement={anchorElement}
          onClose={this.handleSubMenuClose}
        />
      </React.Fragment>
    );
  }
}

SubMenu.propTypes = {
  text: PropTypes.string.isRequired,
  classes: PropTypes.any,
  menuItems: PropTypes.array.isRequired
};

export default withStyles(styles)(SubMenu);
