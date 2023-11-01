import React, { Component } from 'react'

import CustomChip from './CustomChip';

export const CHIP_CLICK_BEHAVIOR = {
    Select: "Select",
    Click: "Click",
    Both: "Both",
    None: "None"
}

export default class CustomChips extends Component {

    constructor (props) {
        super(props);
        //this.firstChipRef = React.createRef();
        this.chipRefs = [];
    }

    onTextEdit = (chip) => (newText) => {
        return this.props.onTextEdit(chip, newText);
    }

    deselectAllOtherChips = (selectedChip) => {
        this.chipRefs
            .filter(chipRef => chipRef.current)
            .filter(chipRef => chipRef.current.props.chipData.key !== selectedChip.key)
            .map(chipRef => chipRef.current.deselectChip());
    }

    closeAllHoverItems = () => {
        this.chipRefs
            .filter(chipRef => chipRef.current)
            .map(chipRef => chipRef.current.closeHoverItems());
    }

    onSelect = (chip) => (isSelected) => {
        if (isSelected && this.props.selectMode === 'single') {
            this.deselectAllOtherChips(chip);
        }
        this.props.onSelect(chip, isSelected);
    }

    onClick = (chip) => () => {
        this.props.onClick(chip);
    }

    onDelete = (chip) => () => {
        this.props.onDelete(chip);
    }

    editFirstChip () {
        /*
        if (this.firstChipRef.current) {
            this.firstChipRef.current.delayedEditText();
        }
        */
        var firstChipRef = this.chipRefs[0];
        if (firstChipRef && firstChipRef.current) {
            firstChipRef.current.delayedEditText();
        }
    }

    reRender () {
        var { chips } = this.props;
        var currentChipRefs = this.chipRefs.filter(x => x.current); // ensure current is not null
        if (chips && (chips.length === currentChipRefs.length)) {
            currentChipRefs.map((chipRef,index) => chipRef.current.setText(chips[index].text));
        }
    }

    reRenderIcons () {
        var { chips } = this.props;
        var currentChipRefs = this.chipRefs.filter(x => x.current); // ensure current is not null
        if (chips && (chips.length === currentChipRefs.length)) {
            currentChipRefs.map((chipRef,index) => chipRef.current.setIcons(chips[index].icons));
        }
    }

    render () {

        //this.customChipsList = [];

        var { chips, insertIndex, editFirstChip, onClick, 
                onSelect, additionalStyle, noValueMessage } = this.props;
        additionalStyle = (additionalStyle) ? additionalStyle : {}

        if (insertIndex === undefined || insertIndex === null) {
            insertIndex = -1;
        }
        
        var style = {
            ...additionalStyle,
            display: 'flex', 
            flexFlow: 'row', 
            flexWrap: 'wrap'
        }

        var clickBehavior = CHIP_CLICK_BEHAVIOR.None;
        if (onClick && onSelect) {
            clickBehavior = CHIP_CLICK_BEHAVIOR.Both;
        } else if (onClick) {
            clickBehavior = CHIP_CLICK_BEHAVIOR.Click;
        } else if (onSelect) {
            clickBehavior = CHIP_CLICK_BEHAVIOR.Select;
        } 

        return (
            <div style={style}>   
                {chips.length > 0 ? 
                    chips.map((chip, index) => {
                        const requestEditMode = (index === 0 && editFirstChip);
                        //const firstChipRef = (index === 0) ? this.firstChipRef : null;

                        var chipRef = this.chipRefs[index];
                        if (!chipRef) {
                            chipRef = React.createRef();
                            this.chipRefs.push(chipRef);
                        }

                        return <CustomChip 
                            ref={chipRef}
                            key={chip.key}
                            chipKey={chip.key}
                            displayInsertPoint={insertIndex === index}
                            chipData={chip}
                            parentSetFocus={this.props.parentSetFocus}                        
                            backgroundColor={chip.backgroundColor} 
                            textColor={chip.textColor}
                            fontSize={chip.fontSize}
                            requestEditMode={requestEditMode}
                            text={chip.text}
                            icons={chip.icons}
                            //canDelete={!chip.isPrimary}
                            //canEdit={this.props.canEdit}
                            canDelete={chip.canDelete}
                            canEdit={chip.canEdit}
                            onTextEdit={this.onTextEdit(chip)}
                            onDelete={this.onDelete(chip)}
                            toggleSelect={chip.toggleSelect}
                            onSelect={this.onSelect(chip)}
                            onClick={this.onClick(chip)}
                            clickBehavior={clickBehavior}
                        />
                    })
                    :
                    noValueMessage && 
                        <div style={{color: 'gray', fontStyle: 'italic', marginTop: '.5em', marginRight: '1em'}}>{noValueMessage}</div>
                }
            </div>
        )
    }
}
