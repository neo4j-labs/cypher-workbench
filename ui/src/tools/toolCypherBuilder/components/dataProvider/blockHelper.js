
/* structure is assumed to be:
blockGroups = [
    [
        { key: 'a', ... },
        { key: 'b', ... },
        ...
    ],
    [
        { key: 'c', ... },
        { key: 'd', ... },
        ...
    ],
    ...
]
*/

const getIndexInsertInfo = (blockGroups, index) => {
    // get the block group for the insertPosition
    var currentBlockIndex = 0;
    var affectedBlockGroupIndex = 0;    
    var indexWithinBlock = 0;
    for (var i = 0; i < blockGroups.length; i++) {
        var blockGroup = blockGroups[i];
        if (index >= currentBlockIndex && index <= (currentBlockIndex + blockGroup.length)) {
            affectedBlockGroupIndex = i;
            indexWithinBlock = index - currentBlockIndex;
            break;
        }
        currentBlockIndex += blockGroup.length;
    }

    return { indexWithinBlock, affectedBlockGroupIndex };
}

const getIndexRemoveInfo = (blockGroups, index) => {
    // get the block group for the insertPosition
    var currentBlockIndex = 0;
    var affectedBlockGroupIndex = 0;    
    var indexWithinBlock = 0;
    for (var i = 0; i < blockGroups.length; i++) {
        var blockGroup = blockGroups[i];
        // only difference is < vs <= from above
        if (index >= currentBlockIndex && index < (currentBlockIndex + blockGroup.length)) {    
            affectedBlockGroupIndex = i;
            indexWithinBlock = index - currentBlockIndex;
            break;
        }
        currentBlockIndex += blockGroup.length;
    }

    return { indexWithinBlock, affectedBlockGroupIndex };
}

// a new block that is a WITH is being inserted at insertIndex
export const getBlocksAffectedByWithInsert = (blockGroups, insertIndex, includeInsertIndexBlock) => {
    // affected blocks are those blocks that happen after the insert in the same block group
    var affectedBlocks = [];
    var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
    
    if (blockGroups.length > 0 && blockGroups[0].length > 0) {
        // get the block group for the insertPosition
        const resultObj = getIndexInsertInfo(blockGroups, insertIndex);
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        var blockGroup = null;
        if (affectedBlockGroupIndex === 0) {
            blockGroup = blockGroups[0];
            if (indexWithinBlock === 0) {
                // this is the first block - check to see if the existing first block is a WITH statement
                const existingFirstBlock = blockGroup[0];
                if (includeInsertIndexBlock || !existingFirstBlock.isWith()) {
                    affectedBlocks = blockGroups[0];
                }
            } else if (insertIndex !== blockGroup.length) {
                // it's in the middle somewhere
                affectedBlocks = blockGroup.slice(indexWithinBlock);
            } // it's at the end and won't affect anything
        } else {
            // assumption is that every blockGroup below starts with a WITH
            blockGroup = blockGroups[affectedBlockGroupIndex];
            if (indexWithinBlock !== 0 && indexWithinBlock !== blockGroup.length) {
                // it's in the middle
                affectedBlocks = blockGroup.slice(indexWithinBlock);
            } // it's at the end and won't affect anything
        }
    }
    return { 
        affectedBlocks,
        affectedBlockGroupIndex,
        indexWithinBlock
    };
}

export const getBlocksAffectedByWithRemove = (blockGroups, removeIndex, includeRemoveIndexBlock) => {
    // affected blocks are those blocks that happen after the remove in the same block group
    var affectedBlocks = [];
    var affectedBlockGroupIndex = -1, indexWithinBlock = -1;
    
    if (blockGroups.length > 0 && blockGroups[0].length > 0) {
        // get the block group for the insertPosition
        const resultObj = getIndexRemoveInfo(blockGroups, removeIndex);
        affectedBlockGroupIndex = resultObj.affectedBlockGroupIndex;
        indexWithinBlock = resultObj.indexWithinBlock;

        //console.log('affectedBlockGroupIndex: ', affectedBlockGroupIndex);
        //console.log('indexWithinBlock: ', indexWithinBlock);
        // assumption is that every blockGroup starts with a WITH
        var blockGroup = blockGroups[affectedBlockGroupIndex];
        if (indexWithinBlock !== blockGroup.length) {
            // it's at the beginning or in the middle
            const offset = (includeRemoveIndexBlock) ? 0 : 1; // +1 because don't want to include the WITH block
            affectedBlocks = blockGroup.slice(indexWithinBlock + offset); 
        } // it's at the end and won't affect anything
    }
    return { 
        affectedBlocks,
        affectedBlockGroupIndex,
        indexWithinBlock
    };
}
