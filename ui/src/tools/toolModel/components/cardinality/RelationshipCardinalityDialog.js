import React, { Component } from 'react';
import {
    Dialog, DialogActions,
    DialogContent, DialogContentText, DialogTitle,
} from '@material-ui/core';

import { StyledButton } from '../../../../components/common/Components';

import RelationshipCardinalityBlock from './RelationshipCardinalityBlock';
import { CARDINALITY_DIRECTIONS } from './RelationshipCardinalityLine';

export default class RelationshipCardinalityDialog extends Component {

    constructor (props) {
        super(props);
        this.block1Ref = React.createRef();
        this.block2Ref = React.createRef();
    }

    getRelationshipTypeText = (relationshipType) => {
        return (relationshipType && relationshipType.type) ? relationshipType.type : '<unspecified>';
    }

    getTitle = () => {
        var { relationshipType } = this.props;
        if (relationshipType) {
            return `Cardinality of ${relationshipType.startNodeLabel.label} - ${this.getRelationshipTypeText(relationshipType)} -> ${relationshipType.endNodeLabel.label}`;
        } else {
            return 'Cardinality';
        }
    }

    componentDidMount () {
        var { relationshipType } = this.props;
        if (this.block1Ref.current) {
            this.block1Ref.current.setRelationshipType(relationshipType);
        }

        if (this.block2Ref.current) {
            this.block2Ref.current.setRelationshipType(relationshipType);
        }
    }

    setRelationshipType (relationshipType) {
        setTimeout(() => {
            if (this.block1Ref.current) {
                this.block1Ref.current.setRelationshipType(relationshipType);
            }
            if (this.block2Ref.current) {
                this.block2Ref.current.setRelationshipType(relationshipType);
            }
        }, 200)
    }

    render () {
        const { onClose, open, maxWidth, relationshipType } = this.props;

        /* e.g.
        Model:  Person - WORKS_FOR -> Company

        For a Person - WORKS_FOR -> some Company(s)
        a Person related to at least __ Company(s)
        a Person related to at most __ Company(s)

        For a Company <- WORKS_FOR - some Person(s)
        a Company related to at least __ Person(s)
        a Company related to at most __ Person(s)
        */

        return (
          <Dialog
            maxWidth={maxWidth} fullWidth={true}
            open={open}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="alert-dialog-title">{this.getTitle()}</DialogTitle>
            <DialogContent style={{fontSize: '16px'}}>
                <RelationshipCardinalityBlock ref={this.block1Ref} relationshipType={relationshipType} direction={CARDINALITY_DIRECTIONS.FORWARD} />
                <RelationshipCardinalityBlock ref={this.block2Ref} relationshipType={relationshipType} direction={CARDINALITY_DIRECTIONS.REVERSE} />
            </DialogContent>
            <DialogActions style={{display:'inline'}}>
              <StyledButton style={{float:'right'}} onClick={onClose} color="primary">
                Close
              </StyledButton>
            </DialogActions>
          </Dialog>
      )
    }
}
