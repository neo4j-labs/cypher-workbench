import React, { Component } from 'react';

import {
    TextField
} from '@material-ui/core';
import ClearIcon from '@material-ui/icons/Clear';
import { ALERT_TYPES } from '../../common/Constants';
import { isFeatureLicensed, FEATURES } from '../../common/LicensedFeatures';
import { NETWORK_STATUS } from '../../persistence/graphql/GraphQLPersistence';

import DatabaseGrid from './components/DatabaseGrid';
import CreateDatabaseConnectionModal from "./components/CreateDatabaseConnectionModal";

export default class Databases extends Component {

    state = {
        filterInput: '',
        isActive: false,
        isAddingDatabase: false,
        needsFetched: true
    }

    constructor (props) {
        super(props);
        this.databaseGridRef = React.createRef();

        props.setSureRef(this);
        this.textFocus = this.utilizeFocus();
    }

    utilizeFocus = () => {
    	const ref = React.createRef()
    	const setFocus = () => { ref.current && ref.current.focus() }
    	return {ref: ref, setFocus: setFocus}
    }

    focusTextBox = () => {
        setTimeout(() => {
            this.textFocus.setFocus();
        }, 200);
    }

    tabDeactivated = () => {
        this.setState({
            isActive: false
        })
    }

    isOnline = () => {
        if (this.props.getNetworkStatus() === NETWORK_STATUS.ONLINE 
            || this.props.getNetworkStatus() === NETWORK_STATUS.UNSAVED
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVING
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVED) {
            return true;
        } else {
            alert('Operation only permitted when online.', ALERT_TYPES.WARNING);
            return false;
        }
    }

    tryToGoOnline = () => {}

    getMenus = () => {
        var menus = [];
        var fileMenuItems = [];
        if (isFeatureLicensed(FEATURES.DATABASES.New)) {
            fileMenuItems.push({id: 'new', text: 'New Connection'});
        }
        if (fileMenuItems.length > 0) {
            var fileMenu = {
                id: 'databases-file',
                text: 'File',
                handler: (menu, menuItem) => {
                    switch (menuItem.id) {
                        case 'new':
                            if (this.isOnline()) {
                                this.openAddDatabaseModal();
                            }
                            break;
                        default:
                            break;
                    }
                },
                menuItems: fileMenuItems
            }
            menus.push(fileMenu);
        }
        return menus;
    }

    tabActivated = () => {
        const { setTitle, setMenus } = this.props;
        setTitle("Databases");
        setMenus(this.getMenus());
        this.setState({
            isActive: true
        }, () => {
            this.focusTextBox();
        })
    }

    closeAddDatabaseModal = () => this.setState({ isAddingDatabase: false });
    openAddDatabaseModal = () => this.setState({ isAddingDatabase: true });

    refetch = () => {
        if (this.databaseGridRef.current) {
            this.databaseGridRef.current.refetch();
        }
    }

    setValue = (e) => {
        this.setState({
            filterInput: e.target.value
        })
    }

    clearValue = (e) => {
        this.setState({
            filterInput: ''
        })
    }

    render() {
      var { filterInput, isActive, isAddingDatabase, needsFetched } = this.state;

      const placeholder = 'Filter database cards';

      return (
          <>
              <CreateDatabaseConnectionModal
                isOpen={isAddingDatabase}
                onClose={this.closeAddDatabaseModal}
                refetch={this.refetch}
              />
              {(isActive) &&
                <>
                    <div style={{display:'flex', flexFlow: 'row'}}>
                        <TextField id="filterDatabases" label="Filter" autoComplete="off"
                            inputRef={this.textFocus.ref}
                            value={filterInput} onChange={this.setValue} 
                            placeholder={placeholder} 
                            title={placeholder}
                            margin="dense" style={{marginLeft: '1em', width: '300px'}}/>
                        <div style={{color:'#aaa', marginTop: '1.5em', cursor: 'pointer'}}>
                            <ClearIcon 
                                onClick={this.clearValue}>
                            </ClearIcon>
                        </div>

                    </div>

                    <DatabaseGrid ref={this.databaseGridRef}
                        otherToolActionRequest={this.props.otherToolActionRequest}
                        filterValue={filterInput}
                        needsFetched={needsFetched} setNeedsFetched={this.setNeedsFetched} />
                </>
              }
          </>
      )
    }

}
