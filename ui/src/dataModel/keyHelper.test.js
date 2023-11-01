
import { KeyHelper } from './keyHelper';

const SubgraphNodeLabels = {
    CypherBuilder: "CypherBuilder",
    CypherBlock: "CypherBlock",
    CypherPattern: "CypherPattern",
    Any: "Any" // special for any node
};

const SubgraphRelationshipTypes = {
    NEXT: {
        name: "NEXT",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBlock,
            endNode: SubgraphNodeLabels.CypherBlock
        }]
    },
    CYPHER_PATTERN: {
        name: "CYPHER_PATTERN",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBlock,
            endNode: SubgraphNodeLabels.CypherPattern
        }]
    },
    HAS_CYPHER_BLOCK: {
        name: "HAS_CYPHER_BLOCK",
        nodes: [{
            startNode: SubgraphNodeLabels.CypherBuilder,
            endNode: SubgraphNodeLabels.CypherBlock
        }]
    }
};

const SUBGRAPH_MODEL = { 
    primaryNodeLabel: SubgraphNodeLabels.CypherBuilder, 
    subgraphConfig_labelFilter: 
        // produces +NodePattern|etc using constants
        Object.keys(SubgraphNodeLabels).map(node => `+${node}`).join('|')
    ,
    subgraphConfig_relationshipFilter: 
        // produces HAS_NODE_PATTERN>|etc using constants
        Object.keys(SubgraphRelationshipTypes).map(relationship => `${relationship}>`).join('|')
    , 
    keyConfig: [
        {nodeLabel: 'GraphDoc', propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherBuilder, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherBlock, propertyKeys: ["key"]},
        {nodeLabel: SubgraphNodeLabels.CypherPattern, propertyKeys: ["key"]},
        {relationshipType: SubgraphRelationshipTypes.CYPHER_PATTERN.name, propertyKeys: ["key"]}
    ]
}  

var getRemoteKey = (graphDocKey, key, idJoiner) => {
    return (key.match(idJoiner)) ? key : graphDocKey + idJoiner + key;        
}

test('make new key helper', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    expect(keyHelper.getNewNodeKey()).toBe('Node0');
    expect(keyHelper.getNewRelationshipKey()).toBe('Rel0');
});

test('test get remote key', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });
    var nodeKey = keyHelper.getNewNodeKey();

    var remoteKey = getRemoteKey('mykey', nodeKey, keyHelper.getIdJoiner());
    var remoteKey2 = getRemoteKey('mykey', remoteKey, keyHelper.getIdJoiner());

    expect(remoteKey).toBe('mykey_cwid_Node0');
    expect(remoteKey2).toBe('mykey_cwid_Node0');
});

test('test add remote key', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var remoteKey = 'mykey_cwid_Node0';
    var key = keyHelper.getKeyAndAddIt(remoteKey);

    expect(key).toBe('Node0');

    expect(keyHelper.usedKeys['Node0']).toBe('Node0');
});

test('test getNodeKey', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var key = {
        label: "CypherBuilder",
        properties: [
            {
                key: "key",
                datatype: "STRING",
                value: "b45e2d86-8774-4e66-af10-b850c089f0f3"
            }
        ]    
    }

    var nodeKey = keyHelper.getNodeKey(key);
    expect(nodeKey).toBe('b45e2d86-8774-4e66-af10-b850c089f0f3')
});

test('test add remote key, add 1 from different graph doc', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: {
            ...SUBGRAPH_MODEL,
            remoteNodeLabels: [SubgraphNodeLabels.CypherPattern]    
        }
    });

    var normalKey = {
        label: 'CypherBuilder',
        properties: [
            {
                key: "key",
                datatype: "STRING",
                value: "b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Node0"
            }
        ]    
    }
    var remoteGraphDocKey = {
        label: 'CypherPattern',
        properties: [
            {
                key: "key",
                datatype: "STRING",
                value: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cwid_Node0"
            }
        ]    
    }

    var convertedNormalKey = keyHelper.getKeyAndAddIt(normalKey);
    expect(convertedNormalKey).toBe('Node0');
    var convertedRemoteKey = keyHelper.getKeyAndAddIt(remoteGraphDocKey);
    expect(convertedRemoteKey).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cwid_Node0');

    expect(keyHelper.usedKeys['Node0']).toBe('Node0');
    expect(keyHelper.usedKeys['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cwid_Node0']).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee_cwid_Node0');
});


test('test getKeyAndAddIt', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var key = {
        label: "CypherBuilder",
        properties: [
            {
                key: "key",
                datatype: "STRING",
                value: "b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Node0"
            }
        ]    
    }

    var nodeKey = keyHelper.getKeyAndAddIt(key);
    expect(nodeKey).toBe('Node0');
    expect(keyHelper.usedKeys['Node0']).toBe('Node0');
    //console.log(keyHelper.usedKeys);
    expect(keyHelper.usedKeys['Node0']).toBe('Node0');
});

test('test getKeyAndAddIt, then get new key', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var graphDocKey = 'b45e2d86-8774-4e66-af10-b850c089f0f3';

    var key = {
        label: "CypherBuilder",
        properties: [
            {
                key: "key",
                datatype: "STRING",
                value: "b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Node0"
            }
        ]    
    }

    var nodeKey = keyHelper.getKeyAndAddIt(key);
    var newNodeKey = keyHelper.getNewNodeKey();

    expect(newNodeKey).toBe('Node1');

    var remoteKey = getRemoteKey(graphDocKey, newNodeKey, keyHelper.getIdJoiner());

    expect(remoteKey).toBe(`${graphDocKey}_cwid_Node1`);
});

test('test getRelKey', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var keyProperties = [
        {
            key: "key",
            datatype: "STRING",
            value: "b45e2d86-8774-4e66-af10-b850c089f0f3_Rel1"
        }
    ]    

    var relKey = keyHelper.getRelKey('CYPHER_PATTERN', keyProperties);
    expect(relKey).toBe('b45e2d86-8774-4e66-af10-b850c089f0f3_Rel1');
});

test('test getRelKeyAndAddIt', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var keyProperties = [
        {
            key: "key",
            datatype: "STRING",
            value: "b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Rel1"
        }
    ]    

    var relKey = keyHelper.getRelKeyAndAddIt('CYPHER_PATTERN', keyProperties);
    expect(relKey).toBe('b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Rel1');
    expect(keyHelper.usedKeys['b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Rel1']).toBe('b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Rel1');
    expect(keyHelper.usedKeys['Rel1']).toBe('Rel1');
});

test('test getRelKeyAndAddIt, then get new key', () => {

    var keyHelper = new KeyHelper({
        id: 'test',
        SUBGRAPH_MODEL: SUBGRAPH_MODEL
    });

    var graphDocKey = 'b45e2d86-8774-4e66-af10-b850c089f0f3';
    var keyProperties = [
        {
            key: "key",
            datatype: "STRING",
            value: "b45e2d86-8774-4e66-af10-b850c089f0f3_cwid_Rel0"
        }
    ]    

    var relKey = keyHelper.getRelKeyAndAddIt('CYPHER_PATTERN', keyProperties);
    var newRelKey = keyHelper.getNewRelationshipKey();

    expect(newRelKey).toBe('Rel1');

    var remoteKey = getRemoteKey(graphDocKey, newRelKey, keyHelper.getIdJoiner());

    expect(remoteKey).toBe(`${graphDocKey}_cwid_Rel1`);
});
