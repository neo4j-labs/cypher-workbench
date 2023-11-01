import React, { useState } from 'react';

import { OutlinedStyledButton } from '../../../components/common/Components';
import SearchableChips from '../../../components/common/SearchableChips';
import { ALERT_TYPES } from '../../../common/Constants';
import SecurityRole, { SecurityMessages } from '../../common/SecurityRole';

export const AddControl = ({ domId, addOptionsData, onOptionClick, addButtonOpen, toggleAddButtonOpen }) => {

    return (
        <div id={domId} style={{display: 'flex', flexFlow:'row'}}>
            {toggleAddButtonOpen && 
                <OutlinedStyledButton onClick={() => {
                        const newAddButtonOpen = !addButtonOpen;
                        toggleAddButtonOpen(newAddButtonOpen);
                    }} 
                    style={{marginLeft: '1em', height:'2em'}} color="primary">
                    <span style={{fontSize:'0.8em', marginRight:'0.5em'}} className='fa fa-plus'/> 
                    Add 
                    {toggleAddButtonOpen && 
                        <span style={{marginLeft: '.3em', fontSize: '1.3em'}} 
                            className={`fa ${(addButtonOpen) ? 'fa-caret-left' : 'fa-caret-right'}`}></span>
                    }
                </OutlinedStyledButton>
            }
            <SearchableChips 
                style={{display: (addButtonOpen) ? 'flex' : 'none'}} 
                data={addOptionsData}
                displaySearch={false}
                additionalStyle={{
                    marginTop: '.1em', 
                    marginRight: '5px',
                    marginTop: '3px',
                    fontSize: '.9em',
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    fontWeight: 400,
                    textAlign: 'center',
                    lineHeight: '1.4em',
                    overflowY: 'auto',
                    maxHeight: '2.95em'
                }}
                onChipClick={(...args) => {
                    if (SecurityRole.canEdit()) {
                        onOptionClick(...args);
                    } else {
                        alert(SecurityMessages.NoPermissionToEdit, ALERT_TYPES.WARNING)
                    }
                }}
            />
        </div>
    )
} 