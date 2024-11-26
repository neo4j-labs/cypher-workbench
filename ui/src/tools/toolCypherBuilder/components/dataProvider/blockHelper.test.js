
import CypherBlock from './cypherBlock';
import { getBlocksAffectedByWithInsert, getBlocksAffectedByWithRemove } from './blockHelper';

const b = (key, isWith) => {
    var dataProvider = null;
    if (isWith) {
        dataProvider = { getCypherKeyword: () => 'WITH' }
    }
    return new CypherBlock({ key,  dataProvider });
}

test('no blocks - insert', () => {
    var blockGroups = [];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 0);
    expect(affectedBlocks.length).toBe(0);
});

test('block WITH / not WITH', () => {
    const bWith = b(1, true);
    const bNotWith = b(2);

    expect(bWith.isWith()).toBe(true);
    expect(bNotWith.isWith()).toBe(false);
});

test('1 block group - 2 blocks - insert at beginning', () => {
    var blockGroups = [[b(1),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 0);
    expect(affectedBlocks.length).toBe(2);
});

test('1 block group - 2 blocks - insert in middle', () => {
    var blockGroups = [[b(1),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 1);
    expect(affectedBlocks.length).toBe(1);
});

test('1 block group - 2 blocks - insert at end', () => {
    var blockGroups = [[b(1),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 2);
    expect(affectedBlocks.length).toBe(0);
});

test('1 block group - 2 blocks (first is WITH) - insert at beginning', () => {
    var blockGroups = [[b(1, true),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 0);
    expect(affectedBlocks.length).toBe(0);
});

test('2 block groups - 2 blocks each - insert between blocks', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 2);
    expect(affectedBlocks.length).toBe(0);
});

test('2 block groups - 2 blocks each - insert after all blocks', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 4);
    expect(affectedBlocks.length).toBe(0);
});

test('2 block groups - 2 blocks each - insert before all blocks', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 0);
    expect(affectedBlocks.length).toBe(2);
    expect(affectedBlocks[0].key).toBe(1);
    expect(affectedBlocks[1].key).toBe(2);
});

test('2 block groups - 2 blocks each - insert middle of first block', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 1);
    expect(affectedBlocks.length).toBe(1);
    expect(affectedBlocks[0].key).toBe(2);
});

test('2 block groups - 2 blocks each - insert middle of second block', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithInsert(blockGroups, 3);
    expect(affectedBlocks.length).toBe(1);
    expect(affectedBlocks[0].key).toBe(4);
});

/////

test('no blocks - remove', () => {
    var blockGroups = [];

    var { affectedBlocks } = getBlocksAffectedByWithRemove(blockGroups, 0);
    expect(affectedBlocks.length).toBe(0);
});

test('1 block group - 2 blocks (first is WITH) - remove from beginning', () => {
    var blockGroups = [[b(1, true),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithRemove(blockGroups, 0);
    expect(affectedBlocks.length).toBe(1);
});

test('1 block group - 2 blocks (first is WITH) - remove from end', () => {
    var blockGroups = [[b(1, true),b(2)]];

    var { affectedBlocks } = getBlocksAffectedByWithRemove(blockGroups, 1);
    expect(affectedBlocks.length).toBe(0);
});

test('2 block groups - 2 blocks each - remove second block WITH', () => {
    var blockGroups = [[b(1),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithRemove(blockGroups, 2);
    expect(affectedBlocks.length).toBe(1);
    expect(affectedBlocks[0].key).toBe(4);
});

test('2 block groups - 2 blocks each (first is WITH) - remove first block WITH', () => {
    var blockGroups = [[b(1, true),b(2)],[b(3, true),b(4)]];

    var { affectedBlocks } = getBlocksAffectedByWithRemove(blockGroups, 0);
    expect(affectedBlocks.length).toBe(1);
    expect(affectedBlocks[0].key).toBe(2);
});