import React, { Component } from 'react'
import SubMenu from '../../../../components/menu/SubMenu';
import { SECONDARY_NODE_LABEL_DISPLAY } from '../../../../components/canvas/d3/dataModelCanvas';

export default class SecondaryNodeLabelSettings extends Component {

    canvasSettings = null;
    secondaryNodeLabelDisplay = null;

    updateSubMenuItems = (value, callback) => {
        var { subMenuItems } = this.state;
        var isChecked = subMenuItems[value].checked;
        if (!isChecked) {
            var { handleSecondaryNodeLabelChange } = this.props;
            var subMenuItemsCopy = { ...subMenuItems };
            Object.values(subMenuItemsCopy).map(x => x.checked = false);
            subMenuItemsCopy[value].checked = true;
            if (handleSecondaryNodeLabelChange) handleSecondaryNodeLabelChange(value);
            this.setState({
                subMenuItems: subMenuItemsCopy
            }, () => {
                if (callback) callback();
            });
        }
    }

    setCheckedValue = (name) => (e) => {
        this.updateSubMenuItems(name, () => {
            this.secondaryNodeLabelDisplay = name;
            this.saveSettings();
        });
    }

    state = {
        subMenuItems: {
            concatenateLabel: { id: SECONDARY_NODE_LABEL_DISPLAY.CONCATENATE_LABEL, text: 'Concatenate Label', checked: true, onClick: this.setCheckedValue(SECONDARY_NODE_LABEL_DISPLAY.CONCATENATE_LABEL) },
            showWithProperties: { id: SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION, text: 'Show With Properties', checked: false, onClick: this.setCheckedValue(SECONDARY_NODE_LABEL_DISPLAY.SHOW_IN_ANNOTATION) }
        }
    }

    constructor (props) {
        super(props);
    }

    setUserSettings = (userSettings) => {
        if (userSettings && userSettings.canvasSettings) {
            this.canvasSettings = userSettings.canvasSettings;
            this.secondaryNodeLabelDisplay = this.canvasSettings.secondaryNodeLabelDisplay;
            this.secondaryNodeLabelDisplay = (this.secondaryNodeLabelDisplay) ? this.secondaryNodeLabelDisplay : SECONDARY_NODE_LABEL_DISPLAY.CONCATENATE_LABEL;
            this.updateSubMenuItems(this.secondaryNodeLabelDisplay);
        }
    }

    saveSettings = () => {
        const { saveUserSettings } = this.props;
        saveUserSettings({
            canvasSettings: {
                ...this.canvasSettings,
                secondaryNodeLabelDisplay: this.secondaryNodeLabelDisplay
            }
        });
    }

    render() {
        const { menuId } = this.props;
        const { subMenuItems } = this.state;

        return (
            <>
                <SubMenu
                  key={menuId + '_secondaryNodeLabelDisplay'}
                  text="Secondary Node Label Display"
                  menuItems={Object.values(subMenuItems)}
                />
            </>
        )
    }
}
