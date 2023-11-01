import React, { Component } from 'react'

import { USER_ROLE } from '../../../../common/Constants';

import SecurityRole from '../../../common/SecurityRole';

import {
    CARDINALITY_DIRECTIONS,
    CARDINALITY_OPTIONS,
    CARDINALITY_VALUES,
    LEAST_OR_MOST,
    RelationshipCardinalityLine
} from './RelationshipCardinalityLine';

export default class RelationshipCardinalityBlock extends Component {

    state = {
        minCardinality: CARDINALITY_VALUES.ZERO,
        maxCardinality: CARDINALITY_VALUES.MANY
    }

    constructor (props) {
        super(props);
    }

    getCardinalitySelectValue = (value, defaultValue) => {
        var selectValue = Object.keys(CARDINALITY_OPTIONS)
                    .filter(key => CARDINALITY_OPTIONS[key] === value)
        if (selectValue && selectValue.length === 1) {
            selectValue = selectValue[0];
        } else {
            selectValue = defaultValue;
        }
        return selectValue;
    }

    setRelationshipType = (relationshipType) => {
        const { direction } = this.props;
        if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
            this.setState({
                minCardinality: this.getCardinalitySelectValue(relationshipType.outMinCardinality, CARDINALITY_VALUES.ZERO),
                maxCardinality: this.getCardinalitySelectValue(relationshipType.outMaxCardinality, CARDINALITY_VALUES.MANY)
            })
        } else {
            this.setState({
                minCardinality: this.getCardinalitySelectValue(relationshipType.inMinCardinality, CARDINALITY_VALUES.ZERO),
                maxCardinality: this.getCardinalitySelectValue(relationshipType.inMaxCardinality, CARDINALITY_VALUES.MANY)
            })
        }
    }

    setValue = (key) => (e) => {
        if (SecurityRole.canEdit()) {
            const value = e.target.value;
            if (this.state[key] !== value) {
                this.setState({
                    [key]: value
                });
            }
        }
    }

    saveCardinality = (key, leastOrMost) => () => {
        if (SecurityRole.canEdit()) {
            const { relationshipType, direction } = this.props;
            const cardinality = this.state[key];
            var cardinalityValue = CARDINALITY_OPTIONS[cardinality];
            if (leastOrMost === LEAST_OR_MOST.LEAST) {
                if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
                    if (relationshipType.outMinCardinality !== cardinalityValue) {
                        relationshipType.setOutMinCardinality(cardinalityValue);
                    }
                } else {
                    if (relationshipType.inMinCardinality !== cardinalityValue) {
                        relationshipType.setInMinCardinality(cardinalityValue);
                    }
                }
            } else {
                if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
                    if (relationshipType.outMaxCardinality !== cardinalityValue) {
                        relationshipType.setOutMaxCardinality(cardinalityValue);
                    }
                } else {
                    if (relationshipType.inMaxCardinality !== cardinalityValue) {
                        relationshipType.setInMaxCardinality(cardinalityValue);
                    }
                }
            }
        }
    }

    render () {
        var { relationshipType, direction } = this.props;
        var { minCardinality, maxCardinality } = this.state;
        var nodeDisplayText, relToken1, relToken2, from_to;

        var startNodeLabelText = relationshipType.startNodeLabel.label;
        var endNodeLabelText = relationshipType.endNodeLabel.label;
        var relationshipTypeText = relationshipType.type;
        var a_an = startNodeLabelText.match(/^[aeiou]/i) ? 'an' : 'a';

        if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
            nodeDisplayText = startNodeLabelText;
            relToken1 = '-';
            relToken2 = '->';
            from_to = 'From';
        } else {
            nodeDisplayText = endNodeLabelText;
            relToken1 = '<-';
            relToken2 = '-';
            from_to = 'To'
        }

        return (
            <div style={{padding: '20px', marginTop: '0.3em'}}>
                <div style={{fontWeight: 500, width: '32em', borderBottom: '1px solid lightgray'}}>
                    {from_to} {a_an} single {nodeDisplayText} instance
                </div>
                <RelationshipCardinalityLine
                    startNodeLabelText={startNodeLabelText} endNodeLabelText={endNodeLabelText}
                    relationshipType={relationshipType} direction={direction} leastOrMost={LEAST_OR_MOST.LEAST}
                    cardinality={minCardinality} saveCardinality={this.saveCardinality('minCardinality', LEAST_OR_MOST.LEAST)}
                    setValue={this.setValue('minCardinality')}
                />
                <RelationshipCardinalityLine
                    startNodeLabelText={startNodeLabelText} endNodeLabelText={endNodeLabelText}
                    relationshipType={relationshipType} direction={direction} leastOrMost={LEAST_OR_MOST.MOST}
                    cardinality={maxCardinality} saveCardinality={this.saveCardinality('maxCardinality', LEAST_OR_MOST.MOST)}
                    setValue={this.setValue('maxCardinality')}
                />
            </div>
        )
    }
}
