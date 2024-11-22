import React, { Component } from 'react'
import { COLORS } from '../../../common/Constants';

export const DividerTitleWidthOrHeight = '30px';

export const DividerType = {
    EastWest: 'EastWest',
    NorthSouth: 'NorthSouth'
}

export class dividerDrag {
    resizing = false;
    initialX = 0;
    initialY = 0;
    currentX = 0;
    currentY = 0;
    time = null;
    dragDisabled = false;

    constructor (properties = {}) {
        const { min, max, 
            dragCallback, type,
            getWidth, getHeight 
        } = properties;

        this.min = min;
        this.max = max;
        this.type = type;
        this.dragCallback = dragCallback;
        this.getWidth = getWidth;
        this.getHeight = getHeight
    }

    setDragDisabled = (dragDisabled) => this.dragDisabled = dragDisabled;

    dividerMouseDown = (e) => {
        // console.log('dividerMouseDown: ', e);
        if (this.dragDisabled) return;

        this.resizing = true;
        this.initialX = e.pageX;
        this.initialY = e.pageY;
        this.currentX = e.pageX;
        this.currentY = e.pageY;
        this.time = new Date().getTime()
    }

    dividerMouseUp = (e) => {
        // console.log('dividerMouseUp: ', e);
        if (this.dragDisabled) return;

        this.resizing = false;
    };

    dividerMouseMove = (e) => {
        if (this.dragDisabled) return;

        if (this.resizing) {
            let increase = 0;
            let newValue = 0;
            if (this.type === DividerType.EastWest) {
                increase = e.pageX - this.currentX;
                newValue = this.getWidth() + increase;
            } else if (this.type === DividerType.NorthSouth) {
                increase = e.pageY - this.currentY;
                newValue = this.getHeight() + increase;
            }
            // console.log('newWidth: ', newWidth)        
            // console.log('currentX: ', this.currentX)        
            // console.log('e.pageX: ', e.pageX)        
            // console.log('increase: ', increase)        

            if (this.max !== undefined) {
                newValue =
                    newValue > this.max
                        ? this.max
                        : newValue;
            }
            if (this.min !== undefined) {
                newValue =
                    newValue < this.min
                        ? this.min
                        : newValue;
            }
            if (this.dragCallback) {
                this.dragCallback(newValue);          
            }
            this.currentX = e.pageX;
            this.currentY = e.pageY;
        }
      }  
}

const DividerContent = (props) => {

    let { isCollapsed, type, title, toggleCollapsed } = props;

    let content = <></>
    if (type === DividerType.EastWest) {
        content = <span
            onClick={toggleCollapsed}
            style={{
                cursor: 'pointer',
                padding: '0px',
                margin: '0px',
                position: 'relative',
                left: (isCollapsed) ? '0px' : '-9px',
                top: (isCollapsed) ? '-2px' : '-5px',
                float: 'right'
            }}
        >
        {
            (isCollapsed) ? 
                <>
                    <span style={{marginRight: '5px'}}>{title}</span>
                    <i class="fas fa-caret-right"></i>
                </>
            : <i class="fas fa-caret-left"></i>
        }
        </span>

    } else if (type === DividerType.NorthSouth) {
        content = <span
            onClick={toggleCollapsed}
            style={{
                cursor: 'pointer',
                padding: '0px',
                margin: '0px',
                marginRight: '5px',
                position: 'relative',
                top: (isCollapsed) ? '2px' : '-8px',
                float: 'right'
            }}
        >
        {
            (isCollapsed) ? 
                <>
                    <span style={{marginRight: '5px'}}>{title}</span>
                    <i class="fas fa-caret-up"></i>
                </>
            : <i class="fas fa-caret-down"></i>
        }
        </span>
    }
    return content;        
}

export default class Divider extends Component {

    state = {
        isCollapsed: false
    }

    constructor (props) {
        super(props);
        this.dividerDrag = new dividerDrag(props);
    }

    dividerMouseUp = (e) => this.dividerDrag.dividerMouseUp(e);
    dividerMouseMove = (e) => this.dividerDrag.dividerMouseMove(e);

    toggleCollapsed = () => {
        let { onOpen, onCollapse } = this.props;
        let { isCollapsed } = this.state;
        let newState = !isCollapsed;
        this.setState({ 
            isCollapsed: newState 
        }, () => {
            if (newState) {
                onCollapse();    
                this.dividerDrag.setDragDisabled(true);
            } else {
                this.dividerDrag.setDragDisabled(false);
                onOpen();
            }
        });
    }

    render () {
        let { size, type, title } = this.props;
        let { isCollapsed } = this.state;

        title = title || 'Click to Open';

        let style = (isCollapsed) ? {
            // color: COLORS.toolBarFontColor,
            // backgroundColor: COLORS.secondaryToolBarColor,
        } : {};

        if (type === DividerType.EastWest) {
            style = {
                ...style,
                width: (isCollapsed) ? DividerTitleWidthOrHeight : size,
                cursor: 'ew-resize',
                writingMode: "vertical-lr",
                transform: "rotate(-180deg)"
            }

        } else if (type === DividerType.NorthSouth) {
            style = {
                ...style,
                height: (isCollapsed) ? DividerTitleWidthOrHeight : size,
                cursor: 'ns-resize'
            }
        }
        return (
            <div style={style}
                  onMouseDown={this.dividerDrag.dividerMouseDown}
                  onMouseMove={this.dividerDrag.dividerMouseMove}
                  onMouseUp={this.dividerDrag.dividerMouseUp}
            >
                <DividerContent type={type} title={title} 
                    isCollapsed={isCollapsed}
                    toggleCollapsed={this.toggleCollapsed}
                />
            </div>            
        )
    }
}