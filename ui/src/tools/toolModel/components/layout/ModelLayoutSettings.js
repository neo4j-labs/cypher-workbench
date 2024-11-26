import React, { Component } from 'react'

import CheckmarkMenuItem from '../../../../components/menu/CheckmarkMenuItem';

export default class ModelLayoutSettings extends Component {

    canvasSettings = null;

    toggleCheckedValue = (name) => (e) => {
        var { menuItems } = this.state;
        var currentMenuItem = menuItems[name];
        var newMenuItem = { ...currentMenuItem, checked: !currentMenuItem.checked };
        //console.log('calling toggleCheckedValue');
        this.setState({
            menuItems: {
                ...menuItems,
                [name]: newMenuItem
            }
        }, () => {
            this.saveSettings();
        })
    }

    state = {
        menuItems: {
            showGrid: { id: 'showGrid', text: 'Show Grid', checked: false, onClick: this.toggleCheckedValue('showGrid') },
            snapToGrid: { id: 'snapToGrid', text: 'Snap To Grid', checked: true, onClick: this.toggleCheckedValue('snapToGrid') },
            displayAnnotations: { id: 'displayAnnotations', text: 'Display Properties', checked: true, onClick: this.toggleCheckedValue('displayAnnotations') },
            displaySecondaryNodeLabels: { id: 'displaySecondaryNodeLabels', text: 'Display Secondary Node Labels', checked: true, onClick: this.toggleCheckedValue('displaySecondaryNodeLabels') }
        }
    }

    constructor (props) {
        super(props);
    }

    getBooleanValue = (canvasSettings, propName, defaultValue) => {
        var returnValue = (typeof(canvasSettings[propName]) === 'boolean') ? canvasSettings[propName] : defaultValue;
        return returnValue;
    }

    setUserSettings = (userSettings) => {
        //console.log("setUserSettings userSettings");
        //console.log(userSettings);
        if (userSettings && userSettings.canvasSettings) {
            this.canvasSettings = userSettings.canvasSettings;
            //console.log("canvasSettings");
            //console.log(canvasSettings);
            var { menuItems } = this.state;
            var { showGrid, snapToGrid, displayAnnotations, displaySecondaryNodeLabels } = menuItems;
            this.setState({
                menuItems: {
                    snapToGrid: { ...snapToGrid, checked: this.getBooleanValue(this.canvasSettings, 'snapToGrid', true) },
                    showGrid: { ...showGrid, checked: this.getBooleanValue(this.canvasSettings, 'showGrid', false) },
                    displayAnnotations: { ...displayAnnotations, checked: this.getBooleanValue(this.canvasSettings, 'displayAnnotations', true) },
                    displaySecondaryNodeLabels: { ...displaySecondaryNodeLabels, checked: this.getBooleanValue(this.canvasSettings, 'displaySecondaryNodeLabels', true) }                    
                }
            }/*, () => {
                console.log('now this.state.menuItems.displayAnnotations.checked is: ', this.state.menuItems.displayAnnotations.checked);
            }*/)
        }
    }

    saveSettings = () => {
        const { saveUserSettings, getCanvasSettings } = this.props;
        var { menuItems } = this.state;
        var { showGrid, snapToGrid, displayAnnotations, displaySecondaryNodeLabels } = menuItems;

        saveUserSettings({
            canvasSettings: {
                ...getCanvasSettings(),
                snapToGrid: snapToGrid.checked,
                showGrid: showGrid.checked,
                displayAnnotations: displayAnnotations.checked,
                displaySecondaryNodeLabels: displaySecondaryNodeLabels.checked
            }
        });
    }

    render() {
        const { menuId } = this.props;
        const { menuItems } = this.state;

        return (
            <>
                {Object.values(menuItems).map(menuItem => {
                    //console.log('menuItem: ', menuItem);
                    return <CheckmarkMenuItem key={menuId + '_' + menuItem.id} menuId={menuId} menuItem={menuItem}/>
                })}
            </>
        )
    }
}
