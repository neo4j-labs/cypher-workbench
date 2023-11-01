
import { CypherBlockDataProvider, HANDLE_SCOPED_BLOCK_PROVIDERS_CALL_MODE } from './cypherBlockDataProvider';
import CypherBlock from './cypherBlock';
import { ExpansionPanelActions } from '@material-ui/core';
import { listenTo, stopListeningTo } from '../../../../dataModel/eventEmitter';

const withDataProvider = { getCypherKeyword: () => 'WITH' }

const b = (key) => new CypherBlock({ key });
const w = (key) => new CypherBlock({ key,  dataProvider: withDataProvider });

const getBlockByKey = (blockProvider, key) => blockProvider.getCypherBlocks().find(x => x.key === key);
const convertToWith = (block) => block.dataProvider = withDataProvider;
const convertRemoveWith = (block) => block.dataProvider = null;

const convertBlockToWith = (blockProvider, key) => {
    const blockToConvert = getBlockByKey(blockProvider, key);
    convertToWith(blockToConvert);
    blockProvider.setCypherSnippetKeyword({
        cypherBlockKey: key,
        oldKeyword: '',
        newKeyword: 'WITH'
    });
}

const convertBlockRemoveWith = (blockProvider, key) => {
    const blockToConvert = getBlockByKey(blockProvider, key);
    convertRemoveWith(blockToConvert);
    blockProvider.setCypherSnippetKeyword({
        cypherBlockKey: key,
        oldKeyword: 'WITH',
        newKeyword: ''
    });
}

const getTestBlockProvider = (blockDef) => {
    const blocks = Array.from(blockDef).map((letter,i) => (letter === 'w') ? w(i + 1) : b(i + 1));
    return new CypherBlockDataProvider({
        cypherBlocks: blocks,
        cypherBuilder: {
            updateCypher: () => {}
        }
    });
}

test ('test basic empty block configuration', () => {
    var blockProvider = getTestBlockProvider('');
    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(0);
});

test ('test basic block configuration', () => {
    var blockProvider = getTestBlockProvider('bbwb');
    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);
    expect(scopedProviders[0].getCypherBlocks()[1].key).toBe(2);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(3);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
    expect(scopedProviders[1].getCypherBlocks()[1].key).toBe(4);
});

//****
// test convert to WITH
//****
test ('test 1 block - promote it to WITH', () => {
    var blockProvider = getTestBlockProvider('b');

    //console.log('blockProvider: ', blockProvider);
    convertBlockToWith(blockProvider, 1);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 2 blocks - promote second to WITH', () => {
    var blockProvider = getTestBlockProvider('bb');

    convertBlockToWith(blockProvider, 2);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(2);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 3 blocks - group starts with WITH, convert second to WITH', () => {
    var blockProvider = getTestBlockProvider('wbb');

    convertBlockToWith(blockProvider, 2);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(true);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(2);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 3 blocks - group starts with WITH, convert third to WITH', () => {
    var blockProvider = getTestBlockProvider('bbb');

    convertBlockToWith(blockProvider, 3);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(3);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 6 blocks - 2 groups, convert fifth to WITH', () => {
    var blockProvider = getTestBlockProvider('bbwbbb');

    convertBlockToWith(blockProvider, 5);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(3);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[2].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(3);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);

    expect(scopedProviders[2].getCypherBlocks()[0].key).toBe(5);
    expect(scopedProviders[2].getCypherBlocks()[0].isWith()).toBe(true);
});

//*****
// test remove WITH
//*****
test ('test 1 block - remove WITH', () => {
    var blockProvider = getTestBlockProvider('w');

    convertBlockRemoveWith(blockProvider, 1);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);
});

test ('test 2 blocks - remove WITH from first block', () => {
    var blockProvider = getTestBlockProvider('wb');

    convertBlockRemoveWith(blockProvider, 1);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);
});

test ('test 2 blocks - remove WITH from second block', () => {
    var blockProvider = getTestBlockProvider('bw');

    convertBlockRemoveWith(blockProvider, 2);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(false);
});

test ('test 3 blocks - remove WITH from second block', () => {
    var blockProvider = getTestBlockProvider('bwb');

    convertBlockRemoveWith(blockProvider, 2);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);

    expect(scopedProviders[0].getCypherBlocks()[1].key).toBe(2);
    expect(scopedProviders[0].getCypherBlocks()[1].isWith()).toBe(false);
});

test ('test 6 blocks - remove WITH from third block', () => {
    var blockProvider = getTestBlockProvider('bbwbwb');

    convertBlockRemoveWith(blockProvider, 3);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(4);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[2].key).toBe(3);
    expect(scopedProviders[0].getCypherBlocks()[2].isWith()).toBe(false);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(5);
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

//*****
// test insert new blocks
//*****
test ('test no blocks - add 1 block', () => {
    var blockProvider = getTestBlockProvider('');

    blockProvider.getNewBlock({
        position: 0,
        testCypherBlock: b(1)
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
});

test ('test 1 block - add 1 block', () => {
    var blockProvider = getTestBlockProvider('b');

    blockProvider.getNewBlock({
        position: 1,
        testCypherBlock: b(2)
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks()[1].key).toBe(2);
});

test ('test 2 scopes - add block to first scope', () => {
    var blockProvider = getTestBlockProvider('bbwb');

    blockProvider.getNewBlock({
        position: 1,
        testCypherBlock: b('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[1].key).toBe('foo');
});

test ('test 2 scopes - add block to second scope', () => {
    var blockProvider = getTestBlockProvider('bbwb');

    blockProvider.getNewBlock({
        position: 3,
        testCypherBlock: b('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(3);

    expect(scopedProviders[1].getCypherBlocks()[1].key).toBe('foo');
});

test ('test 1 scope - insert WITH to make 2 scopes', () => {
    var blockProvider = getTestBlockProvider('bbbb');

    blockProvider.getNewBlock({
        position: 2,
        testCypherBlock: w('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(3);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe('foo');
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 0 scopes - insert WITH to make 1 scope', () => {
    var blockProvider = getTestBlockProvider('');

    blockProvider.getNewBlock({
        position: 0,
        testCypherBlock: w('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe('foo');
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 1 scope - insert WITH at end', () => {
    var blockProvider = getTestBlockProvider('bbb');

    blockProvider.getNewBlock({
        position: 3,
        testCypherBlock: w('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(1);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe('foo');
    expect(scopedProviders[1].getCypherBlocks()[0].isWith()).toBe(true);
});

test ('test 2 scopes - insert WITH at beginning', () => {
    var blockProvider = getTestBlockProvider('bbwb');

    blockProvider.getNewBlock({
        position: 0,
        testCypherBlock: w('foo')
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe('foo');
    expect(scopedProviders[0].getCypherBlocks()[0].isWith()).toBe(true);
});

test('test adding blocks 1 by 1 - add WITH first', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: w(1) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
});

test('test adding blocks 1 by 1 - add WITH second', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: w(2) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(2);
});

test('test adding blocks 1 by 1 - add 2 regular blocks', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[1].key).toBe(2);
});

test('test adding blocks 1 by 1 - add WITH third', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });
    blockProvider.getNewBlock({ position: 2, testCypherBlock: w(3) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(1);
});

test('test adding blocks 1 by 1 - add WITH third, then add non-WITH block', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });
    blockProvider.getNewBlock({ position: 2, testCypherBlock: w(3) });
    blockProvider.getNewBlock({ position: 3, testCypherBlock: b(4) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);
});

//*****
// test remove blocks
//*****

test ('test 1 block - remove 1 block', () => {
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({
        position: 0,
        testCypherBlock: b(1)
    });

    blockProvider.removeBlock({
        key: 1
    });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(0);
});

test ('test 1 block - remove initial WITH block', () => {
    //console.log('test 1 block - remove initial WITH block');
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: w(1) });

    blockProvider.removeBlock({ key: 1 });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(0);
});

test ('test 2 blocks - remove initial WITH block', () => {
    //console.log('test 2 blocks - remove initial WITH block');
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: w(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });

    blockProvider.removeBlock({ key: 1 });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks()[0].key).toBe(2);
});

test ('test 2 scopes - remove WITH to form 1 scope', () => {
    //console.log('test 2 scopes - remove WITH to form 1 scope');
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });
    blockProvider.getNewBlock({ position: 2, testCypherBlock: w(3) });
    blockProvider.getNewBlock({ position: 3, testCypherBlock: b(4) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(3);
    expect(scopedProviders[1].getCypherBlocks()[1].key).toBe(4);

    // now remove key 3
    blockProvider.removeBlock({ key: 3 });

    expect(blockProvider.getCypherBlocks().length).toBe(3);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(1);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);
    expect(scopedProviders[0].getCypherBlocks()[2].key).toBe(4);
});

test ('test 3 scopes - remove WITH to form 2 scopes', () => {
    //console.log('test 2 scopes - remove WITH to form 1 scope');
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });
    blockProvider.getNewBlock({ position: 2, testCypherBlock: w(3) });
    blockProvider.getNewBlock({ position: 3, testCypherBlock: b(4) });
    blockProvider.getNewBlock({ position: 4, testCypherBlock: w(5) });
    blockProvider.getNewBlock({ position: 5, testCypherBlock: b(6) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(3);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[1].getCypherBlocks().length).toBe(2);
    expect(scopedProviders[2].getCypherBlocks().length).toBe(2);

    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(3);
    expect(scopedProviders[1].getCypherBlocks()[1].key).toBe(4);
    expect(scopedProviders[2].getCypherBlocks()[0].key).toBe(5);
    expect(scopedProviders[2].getCypherBlocks()[1].key).toBe(6);

    // now remove key 3
    blockProvider.removeBlock({ key: 3 });

    expect(blockProvider.getCypherBlocks().length).toBe(5);

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);
    expect(scopedProviders[0].getCypherBlocks().length).toBe(3);
    expect(scopedProviders[0].getCypherBlocks()[2].key).toBe(4);
    expect(scopedProviders[1].getCypherBlocks()[0].key).toBe(5);
    expect(scopedProviders[1].getCypherBlocks()[1].key).toBe(6);
});

// test previous next
test ('test 3 scopes - previous / next', () => {
    //console.log('test 2 scopes - remove WITH to form 1 scope');
    var blockProvider = getTestBlockProvider('');
    blockProvider.getNewBlock({ position: 0, testCypherBlock: b(1) });
    blockProvider.getNewBlock({ position: 1, testCypherBlock: b(2) });
    blockProvider.getNewBlock({ position: 2, testCypherBlock: w(3) });
    blockProvider.getNewBlock({ position: 3, testCypherBlock: b(4) });
    blockProvider.getNewBlock({ position: 4, testCypherBlock: w(5) });
    blockProvider.getNewBlock({ position: 5, testCypherBlock: b(6) });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(3);
    expect(scopedProviders[0].getNextScopedBlockProvider()).toBe(scopedProviders[1]);
    expect(scopedProviders[1].getNextScopedBlockProvider()).toBe(scopedProviders[2]);
    expect(scopedProviders[2].getNextScopedBlockProvider()).toBe(null);

    expect(scopedProviders[0].getPreviousScopedBlockProvider()).toBe(null);
    expect(scopedProviders[1].getPreviousScopedBlockProvider()).toBe(scopedProviders[0]);
    expect(scopedProviders[2].getPreviousScopedBlockProvider()).toBe(scopedProviders[1]);

    // now remove key 3
    blockProvider.removeBlock({ key: 3 });

    var scopedProviders = blockProvider.getScopedBlockProviders();
    expect(scopedProviders.length).toBe(2);

    expect(scopedProviders[0].getNextScopedBlockProvider()).toBe(scopedProviders[1]);
    expect(scopedProviders[1].getNextScopedBlockProvider()).toBe(null);

    expect(scopedProviders[0].getPreviousScopedBlockProvider()).toBe(null);
    expect(scopedProviders[1].getPreviousScopedBlockProvider()).toBe(scopedProviders[0]);
});

var testListener = (id, messageName, messagePayload) => {
    //console.log('listener message received: ', id, messageName, messagePayload);
}

var testCypherBuilder = {
    addListenerAfterDeserialize: (cypherBlockDataProvider) => {
        cypherBlockDataProvider.getEventEmitter().removeAllListeners();
        listenTo(cypherBlockDataProvider, 'testCypherBuilder', testListener, true)        
    },
    removeListenerBeforeDeserialize: (cypherBlockDataProvider) => {
        stopListeningTo(cypherBlockDataProvider, 'testCypherBuilder')
    }
}

test ('getDataSaveObj', () => {
    var cypherBlockDataProvider = new CypherBlockDataProvider({
        id: 'testCypherBlockDataProvider',
        cypherBuilder: testCypherBuilder
    });
    listenTo(cypherBlockDataProvider, 'testCypherBuilder', testListener);

    var graphData = cypherBlockDataProvider.data();
    var node = graphData.createNode({
        key: null,
        primaryNodeLabel: 'Test',
        labels: ['Test']
    });
    node.addProperty('hello', 'world');
    graphData.addNode(node);    
    //console.log(graphData.me.getListeners());

    var serializedDataSaveObj = cypherBlockDataProvider.getSerializedDataSaveObj();
    //console.log('serializedDataSaveObj: ', serializedDataSaveObj);

    var differentCypherBlockDataProvider = new CypherBlockDataProvider({
        id: 'testCypherBlockDataProvider',
        cypherBuilder: testCypherBuilder
    });

    differentCypherBlockDataProvider.fromSaveObject({serializedSaveObject: serializedDataSaveObj}, () => {
        //console.log('differentCypherBlockDataProvider: ', differentCypherBlockDataProvider);
        var deserializedGraphData = differentCypherBlockDataProvider.data();
        expect(Object.keys(deserializedGraphData.nodes).length).toBe(Object.keys(graphData.nodes).length);

        var newNode = deserializedGraphData.createNode({
            key: null,
            primaryNodeLabel: 'Test2',
            labels: ['Test2']
        });        
        deserializedGraphData.addNode(newNode);
        //console.log('added node to deserializedGraphData');
    });
});