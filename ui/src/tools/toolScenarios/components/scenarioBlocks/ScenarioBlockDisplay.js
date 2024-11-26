import React, { Component } from 'react'
import {
    Tooltip
} from '@material-ui/core';
import SlateScenarioEditorBlock from './SlateScenarioEditorBlock';
import { OutlinedStyledButton } from "../../../../components/common/Components";
import AssociatedCypherDisplay from './AssociatedCypherDisplay';
import SecurityRole, { SecurityMessages } from '../../../common/SecurityRole';
import { ALERT_TYPES } from "../../../../common/Constants";

export default class ScenarioBlockDisplay extends Component {

    state = {
    };

    constructor (props) {
        super(props);
        this.associatedCypherDisplayRef = React.createRef();
    }

    reRender () {
        const { scenarioSetBuilder } = this.props;
        scenarioSetBuilder.reRender();
        this.forceUpdate();
    }

    showCypherValidationInfo = () => {
        if (this.associatedCypherDisplayRef.current) {
            this.associatedCypherDisplayRef.current.showCypherValidationInfo();
        }
    }

    clearCypherValidationInfo = () => {
        if (this.associatedCypherDisplayRef.current) {
            this.associatedCypherDisplayRef.current.clearCypherValidationInfo();
        }
    }

    clearDataModelDiff = () => {
        if (this.associatedCypherDisplayRef.current) {
            this.associatedCypherDisplayRef.current.clearDataModelDiff();
        }
    }

    render () {
        const { scenarioBlockKey, blockId, dataProvider, 
            scenarioSetBuilder, dataModelKey, dataModel } = this.props;
        const editorBlockProps = {
            scenarioBlockKey, blockId, dataProvider,
            scenarioSetBuilder, dataModelKey, dataModel }

        var associatedCypher = dataProvider.getAssociatedCypher();
        associatedCypher = (associatedCypher) ? associatedCypher : [];
        var associatedCypherMap = {};
        associatedCypher.map(x => {
            const subKey = x.cypherSubKey ? `_${x.cypherSubKey}` : ''
            const key = `${x.cypherGraphDocKey}${subKey}`;
            associatedCypherMap[key] = x;
        })

        return (
            <div style={{width: '100%'}} >
                <SlateScenarioEditorBlock {...editorBlockProps }
                />
                {associatedCypher.length > 0 &&
                    <AssociatedCypherDisplay
                        ref={this.associatedCypherDisplayRef}
                        cypherAssociationsMap={associatedCypherMap}
                        highlightCypher={(cypherAssociationEntry, suggestCallback, clearSuggestCallback) => {
                            scenarioSetBuilder.highlightCypherStatementInDataModel(cypherAssociationEntry.cypherStatement, suggestCallback, clearSuggestCallback)
                        }}
                        addNodeLabelToDataModel={(label) => scenarioSetBuilder.addNodeLabel(label)}
                        addRelationshipTypeToDataModel={(startLabel, relType, endLabel) => scenarioSetBuilder.addNodeRelNode(startLabel, relType, endLabel)}
                        removeAssociation={(cypherMapValue) => {
                            if (SecurityRole.canEdit()) {
                                var cypherSubKey = dataProvider.getRemoteCypherSubKey(cypherMapValue.cypherGraphDocKey, cypherMapValue.cypherSubKey);
                                scenarioSetBuilder.removeAssociatedCypherStatement(
                                    dataProvider.getRemoteKey(),
                                    cypherMapValue.cypherGraphDocKey,
                                    cypherSubKey,
                                    (result) => {
                                        const { success, error } = result;
                                        if (!success) {
                                            alert(error);
                                        } else {
                                            dataProvider.removeAssociatedCypher(cypherMapValue);
                                            this.reRender();
                                        }
                                    }
                                )
                            } else {
                                alert(SecurityMessages.NoPermissionToRemove, ALERT_TYPES.WARNING);
                            }
                        }}
                    />
                }
                <OutlinedStyledButton style={{height: '2em', padding: '6px 3px'}}
                    onClick={() => {
                        var remoteKey = dataProvider.getRemoteKey();
                        scenarioSetBuilder.showCypherStatements(remoteKey)
                    }}
                >
                    <Tooltip enterDelay={1000} arrow title="Associate Cypher Statement">
                        <span style={{width:'3.5em'}}><i className={'fa fa-code'}></i></span>
                    </Tooltip>
                </OutlinedStyledButton>
            </div>
        )
    }
}
