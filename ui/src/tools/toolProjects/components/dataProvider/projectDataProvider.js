import React, { Component } from 'react'
import DataTypes from '../../../../dataModel/DataTypes';
import { NodeLabels } from '../../../../dataModel/graphDataConstants';
import { GraphData } from '../../../../dataModel/graphData';
import { GraphDocChangeType } from '../../../../dataModel/graphDataConstants';

const LOCAL_STORAGE_KEY = 'localProject';
const REMOTE_GRAPH_DOC_TYPE = 'Project';

const SubgraphNodeLabels = {
    Project: "Project",
    ScenarioSet: "ScenarioSet",
    DataModel: "DataModel",
    CypherSuite: "CypherBuilder",
    CypherBuilder: "CypherBuilder",
    DBConnection: "DBConnection"
};

const SubgraphRelationshipTypes = {
    SCENARIO_SET: {
        name: "SCENARIO_SET",
        nodes: [{
            startNode: SubgraphNodeLabels.Project,
            endNode: SubgraphNodeLabels.ScenarioSet
        }]
    },
    DATA_MODEL: {
        name: "DATA_MODEL",
        nodes: [{
            startNode: SubgraphNodeLabels.Project,
            endNode: SubgraphNodeLabels.DataModel
        }]
    },
    CYPHER_SUITE: {
        name: "CYPHER_SUITE",
        nodes: [{
            startNode: SubgraphNodeLabels.Project,
            endNode: SubgraphNodeLabels.CypherSuite
        }]
    },
    CYPHER_BUILDER: {
        name: "CYPHER_BUILDER",
        nodes: [{
            startNode: SubgraphNodeLabels.Project,
            endNode: SubgraphNodeLabels.CypherBuilder
        }]
    },
    DB_CONNECTION: {
        name: "DB_CONNECTION",
        nodes: [{
            startNode: SubgraphNodeLabels.Project,
            endNode: SubgraphNodeLabels.DBConnection
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.Project, 
    subgraphConfig_labelFilter: 
        // produces +NodePattern|etc using constants
        Object.keys(SubgraphNodeLabels).map(node => `+${node}`).join('|')
    ,
    subgraphConfig_relationshipFilter: 
        // produces HAS_NODE_PATTERN>|etc using constants
        Object.keys(SubgraphRelationshipTypes).map(relationship => `${relationship}>`).join('|')
    , 
    keyConfig: [
        {nodeLabel: NodeLabels.GraphDoc, propertyKeys: ["key"]},
        {nodeLabel: NodeLabels.Project, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.ScenarioSet, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DataModel, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherSuite, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherBuilder, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.DBConnection, propertyKeys: ["id"]}
    ] 
}  

export class ProjectDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            id,
            projectBuilder
        } = properties;

        this.projectBuilder = projectBuilder;

        this.graphData = new GraphData({
            id: id,
            SUBGRAPH_MODEL: SUBGRAPH_MODEL
        });
    }

    data = () => this.graphData;

    getSubgraphModel = () => SUBGRAPH_MODEL;
    getRemoteGraphDocType = () => REMOTE_GRAPH_DOC_TYPE;
    getLocalStorageKey = () => LOCAL_STORAGE_KEY;

}