import React from 'react'
import { COLORS } from "../../../common/Constants";

export default class ShowMoreLessHelper {

    constructor (props) {
        this.getState = props.getState;
        this.setState = props.setState;
        this.maxDisplayLength = props.maxDisplayLength;
        this.showMoreKeysStateKey = props.showMoreKeysStateKey;
    }

    showMore = (key) => (e) => {
        e.stopPropagation();
        const showMoreKeys = this.getState()[this.showMoreKeysStateKey];
        if (!showMoreKeys.includes(key)) {
            var newKeys = showMoreKeys.concat([key]);
            this.setState({
                [this.showMoreKeysStateKey]: newKeys
            })
        }

    }

    showLess = (key) => (e) => {
        e.stopPropagation();
        const showMoreKeys = this.getState()[this.showMoreKeysStateKey];
        var index = showMoreKeys.indexOf(key);
        if (index >= 0) {
            var newKeys = showMoreKeys.slice();
            newKeys.splice(index, 1);
            this.setState({
                [this.showMoreKeysStateKey]: newKeys
            })
        }
    }

    handleShowMoreLess = (key, value) => {
        const showMoreKeys = this.getState()[this.showMoreKeysStateKey];
        if (value && value.length > this.maxDisplayLength) {
            if (showMoreKeys.includes(key)) {
                value = 
                    <>
                        {value}
                        <span 
                            style={{cursor: 'pointer', marginLeft: '.2em', color: COLORS.primary}}
                            onClick={this.showLess(key)}
                        > 
                            Show Less...
                        </span>
                    </>
            } else {
                value = 
                    <>
                        {value.substring(0, this.maxDisplayLength)}
                        <span 
                            style={{cursor: 'pointer', marginLeft: '.2em', color: COLORS.primary}}
                            onClick={this.showMore(key)}                                                                    
                        > 
                            Show More...
                        </span>
                    </>
            }
        } 
        return value;
    }

}
