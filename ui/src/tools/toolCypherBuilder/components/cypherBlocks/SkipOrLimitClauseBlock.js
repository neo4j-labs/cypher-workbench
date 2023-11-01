
import React, { Component } from 'react';
import {
    TextField 
} from '@material-ui/core';
import { CypherBlockKeywords } from '../../CypherBuilderRefactor';
import SecurityRole from '../../../common/SecurityRole';

export default class SkipOrLimitClauseBlock extends Component {

    state = {
        value: ''
    };

    constructor (props) {
        super(props);
        this.dataProvider = props.dataProvider;
    }

    componentDidMount = () => {
        this.setData();
    }

    clearData () {
        this.setState({
            value: ''
        });
    }

    setData () {
        const { blockKeyword } = this.props;
        const value = (blockKeyword === CypherBlockKeywords.SKIP) 
                            ? this.dataProvider.getSkip()
                            : this.dataProvider.getLimit();
        this.setState({
            value: value,
        });
    }

    setValue = (e) => {
        if (SecurityRole.canEdit()) {
            const value = e.target.value;
            if (this.state.value !== value) {
                this.setState({
                    value: value
                });
            }
        }
    }

    saveValue = () => {
        const { value } = this.state;
        const { blockKeyword } = this.props;
        if (blockKeyword === CypherBlockKeywords.SKIP) {
            this.dataProvider.setSkip(value);
        } else {
            this.dataProvider.setLimit(value);
        }
    }

    render () {
        const { value } = this.state;
        const { blockKeyword } = this.props;
        const label = blockKeyword.substring(0,1) + blockKeyword.substring(1).toLowerCase();

        return (
            <div>
                <div style={{display:'flex', marginTop: '.2em'}}>
                <div style={{marginTop: '.4em', fontWeight: 500, width: '4em'}}>{blockKeyword}
                </div>
                    <TextField label={label} value={value}
                        autoComplete='off'
                        onChange={this.setValue} onBlur={this.saveValue}
                        margin="dense" style={{width: '5em', marginTop: '-.65em', marginRight: '.5em'}}/>
                </div>
            </div>
        )
    }
}


