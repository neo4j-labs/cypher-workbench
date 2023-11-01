import React, { Component } from 'react'
import SubMenu from '../../../../components/menu/SubMenu';
import { RELATIONSHIP_DISPLAY } from '../../../../components/canvas/d3/dataModelCanvas';

export default class RelationshipLayoutSettings extends Component {

    canvasSettings = null;
    relationshipDisplay = null;

    updateSubMenuItems = (value, callback) => {
        var { subMenuItems } = this.state;
        var isChecked = subMenuItems[value].checked;
        if (!isChecked) {
            var { handleRelationshipDisplayChange } = this.props;
            var subMenuItemsCopy = { ...subMenuItems };
            Object.values(subMenuItemsCopy).map(x => x.checked = false);
            subMenuItemsCopy[value].checked = true;
            if (handleRelationshipDisplayChange) handleRelationshipDisplayChange(value);
            this.setState({
                subMenuItems: subMenuItemsCopy
            }, () => {
                if (callback) callback();
            });
        }
    }

    setCheckedValue = (name) => (e) => {
        this.updateSubMenuItems(name, () => {
            this.relationshipDisplay = name;
            this.saveSettings();
        });
    }

    state = {
        subMenuItems: {
            normal: { id: RELATIONSHIP_DISPLAY.NORMAL, text: 'Normal', checked: true, onClick: this.setCheckedValue(RELATIONSHIP_DISPLAY.NORMAL) },
            medium: { id: RELATIONSHIP_DISPLAY.MEDIUM, text: 'Medium', checked: false, onClick: this.setCheckedValue(RELATIONSHIP_DISPLAY.MEDIUM) },
            light: { id: RELATIONSHIP_DISPLAY.LIGHT, text: 'Light', checked: false, onClick: this.setCheckedValue(RELATIONSHIP_DISPLAY.LIGHT) }
        }
    }

    constructor (props) {
        super(props);
    }

    setUserSettings = (userSettings) => {
        if (userSettings && userSettings.canvasSettings) {
            this.canvasSettings = userSettings.canvasSettings;
            this.relationshipDisplay = this.canvasSettings.relationshipDisplay;
            this.relationshipDisplay = (this.relationshipDisplay) ? this.relationshipDisplay : RELATIONSHIP_DISPLAY.NORMAL;
            this.updateSubMenuItems(this.relationshipDisplay);
        }
    }

    saveSettings = () => {
        const { saveUserSettings, getCanvasSettings } = this.props;
        saveUserSettings({
            canvasSettings: {
                ...getCanvasSettings(),
                relationshipDisplay: this.relationshipDisplay
            }
        });
    }

    render() {
        const { menuId } = this.props;
        const { subMenuItems } = this.state;

        return (
            <>
                <SubMenu
                  key={menuId + '_relationshipDisplay'}
                  text="Relationship Display"
                  menuItems={Object.values(subMenuItems)}
                />
            </>
        )
    }
}
