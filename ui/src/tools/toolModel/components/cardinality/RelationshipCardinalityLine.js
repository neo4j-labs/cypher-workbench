import React, { Component } from 'react'
import {
    MenuItem, FormControl, Select
} from '@material-ui/core';

export const CARDINALITY_OPTIONS = {
    zero: '0',
    one: '1',
    many: 'many'
}

// the values of this map match the keys of CARDINALITY_OPTIONS
export const CARDINALITY_VALUES = {
    ZERO: 'zero',
    ONE: 'one',
    MANY: 'many'
}

export const CARDINALITY_DIRECTIONS = {
    FORWARD: "forward",
    REVERSE: "reverse"
}

export const LEAST_OR_MOST = {
    LEAST: "least",
    MOST: "most"
}

export class RelationshipCardinalityLine extends Component {

    constructor (props) {
        super(props);
    }

    getRelationshipTypeText = (relationshipType) => {
        return (relationshipType && relationshipType.type) ? relationshipType.type : '<unspecified>';
    }

    getStartText = () => {
        const { direction, leastOrMost } = this.props;
        if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
            const { startNodeLabelText, relationshipType } = this.props;
            var a_an = startNodeLabelText.match(/^[aeiou]/i) ? 'An' : 'A';
            return (
                <span>
                    {a_an} {startNodeLabelText} {this.getRelationshipTypeText(relationshipType)} at <span style={{textDecoration: 'underline', fontWeight:500}}>{leastOrMost}</span>
                </span>
            )
        } else {
            return (
                <span>
                    At <span style={{textDecoration: 'underline', fontWeight:500}}>{leastOrMost}</span>
                </span>
            )
        }

    }

    getEndText = () => {
        const { direction, endNodeLabelText } = this.props;
        if (direction === CARDINALITY_DIRECTIONS.FORWARD) {
            return <span>{endNodeLabelText}(s)</span>
        } else {
            const { startNodeLabelText, relationshipType, leastOrMost, endNodeLabelText } = this.props;
            var a_an = endNodeLabelText.match(/^[aeiou]/i) ? 'an' : 'a';
            return (
                <span>
                    {startNodeLabelText}(s) {this.getRelationshipTypeText(relationshipType)} {a_an} {endNodeLabelText}
                </span>
            )
        }
    }

    render () {
        const { leastOrMost, cardinality, setValue, saveCardinality } = this.props;

        return (
            <div style={{marginBottom: '5px'}} >
            <form>
                <FormControl style={{ display: 'flex', flexFlow: 'row', alignItems: 'center', paddingBottom: '.3em', marginTop: '.8em' }}>
                    {this.getStartText()}
                    <Select value={cardinality} onChange={setValue}
                      onBlur={saveCardinality}
                      inputProps={{ name: 'cardinality' }}
                      style={{width:'5em', height: '2.5em', textAlign: 'center',
                                marginLeft: '.5em', marginRight: '.5em', marginTop: '-.8em'}}
                    >
                        {Object.keys(CARDINALITY_OPTIONS)
                            .filter(cardinalityKey => {
                                if (leastOrMost === LEAST_OR_MOST.LEAST) {
                                    return (cardinalityKey !== CARDINALITY_VALUES.MANY);
                                } else {
                                    return (cardinalityKey !== CARDINALITY_VALUES.ZERO);
                                }
                            })
                            .map((cardinalityKey) =>
                                <MenuItem key={cardinalityKey} value={cardinalityKey}>{CARDINALITY_OPTIONS[cardinalityKey]}</MenuItem>
                        )}
                    </Select>
                    {this.getEndText()}
                </FormControl>
            </form>
            </div>
        )
    }
}
