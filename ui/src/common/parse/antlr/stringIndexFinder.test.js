
import { findAllIndexes, findIndexes, stringMatches } from "./stringIndexFinder";

test('test find indexes', () => {

    var origString = 'How are you?';
    var stringToFind = 'How'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(3);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('test find indexes full match', () => {

    var origString = 'How  are  you?';
    var stringToFind = 'How are you?'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(14);
    expect(origString.substring(startIndex,endIndex)).toBe('How  are  you?');
});

test('test find indexes full match function', () => {
    var origString = 'How are you?';
    expect(stringMatches(origString, 'How')).toBe(false);
    expect(stringMatches(origString, 'you?')).toBe(false);
    expect(stringMatches(origString, 'How are you')).toBe(false);
    expect(stringMatches(origString, 'how are you?')).toBe(false); // matching is case sensitive

    expect(stringMatches(origString, 'How are you?')).toBe(true);
    expect(stringMatches(origString, '// \nHow are you?')).toBe(true);
    expect(stringMatches(origString, '// \nHow /* comment */ are you?')).toBe(true);
    expect(stringMatches(origString, '// \nHow /* comment */ are you ?  ')).toBe(true);
});

test('cypher string matches', () => {
    expect(stringMatches('(() /* -[:OWNS]->() */) /* + */','(()-[:OWNS]->() /* () */) /* + */')).toBe(false);
    expect(stringMatches('(()-[:OWNS]->() /* () */) /* + */', '(()-[:OWNS]->()) /* + */')).toBe(true);
});

test('test find indexes full match - trailing space', () => {

    var origString = 'How  are  you? ';
    var stringToFind = 'How are you? ';
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(14);
    expect(origString.substring(startIndex,endIndex)).toBe('How  are  you?');
});

test('test find indexes full match - trailing space 2', () => {

    var origString = 'How  are  you?  ';
    var stringToFind = 'How are you? \n';
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(14);
    expect(origString.substring(startIndex,endIndex)).toBe('How  are  you?');
});

test('test find indexes 2', () => {

    var origString = '  How are you?';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('  ');
    expect(startIndex).toBe(2);
    expect(endIndex).toBe(9);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('test find indexes 3', () => {

    var origString = '  How   are you?';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('  ');
    expect(startIndex).toBe(2);
    expect(endIndex).toBe(11);
    expect(origString.substring(startIndex,endIndex)).toBe('How   are');
});

test('test find indexes 4', () => {

    var origString = 'How are you?';
    var stringToFind = ' How  are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('test find all indexes', () => {

    var origString = 'How are you?';
    var stringsToFind = ['How','are','you'];
    let results = findAllIndexes(origString, stringsToFind);

    expect(results.length).toBe(3);

    expect(results[0].matches).toBe(true);
    expect(results[0].beforeSpace).toBe('');
    expect(results[0].startIndex).toBe(0);
    expect(results[0].endIndex).toBe(3);
    expect(origString.substring(results[0].startIndex,results[0].endIndex)).toBe('How');

    expect(results[1].matches).toBe(true);
    expect(results[1].beforeSpace).toBe(' ');
    expect(results[1].startIndex).toBe(4);
    expect(results[1].endIndex).toBe(7);
    expect(origString.substring(results[1].startIndex,results[1].endIndex)).toBe('are');

    expect(results[2].matches).toBe(true);
    expect(results[2].beforeSpace).toBe(' ');
    expect(results[2].startIndex).toBe(8);
    expect(results[2].endIndex).toBe(11);
    expect(origString.substring(results[2].startIndex,results[2].endIndex)).toBe('you');
});

test('test find all indexes 2', () => {

    var origString = `\nHow\n are \n\tyou?`;
    var stringsToFind = ['How','are','you'];
    let results = findAllIndexes(origString, stringsToFind);

    expect(results.length).toBe(3);

    expect(results[0].matches).toBe(true);
    expect(results[0].beforeSpace).toBe('\n');
    expect(results[0].startIndex).toBe(1);
    expect(results[0].endIndex).toBe(4);
    expect(origString.substring(results[0].startIndex,results[0].endIndex)).toBe('How');

    expect(results[1].matches).toBe(true);
    expect(results[1].beforeSpace).toBe('\n ');
    expect(results[1].startIndex).toBe(6);
    expect(results[1].endIndex).toBe(9);
    expect(origString.substring(results[1].startIndex,results[1].endIndex)).toBe('are');

    expect(results[2].matches).toBe(true);
    expect(results[2].beforeSpace).toBe(' \n\t');
    expect(results[2].startIndex).toBe(12);
    expect(results[2].endIndex).toBe(15);
    expect(origString.substring(results[2].startIndex,results[2].endIndex)).toBe('you');
});

test('test find all indexes 3', () => {

    var origString = `\nHow\n are \n\tyou?`;
    var stringsToFind = ['\n\nHow','\fare','\u{2000}you'];
    let results = findAllIndexes(origString, stringsToFind);

    expect(results.length).toBe(3);

    expect(results[0].matches).toBe(true);
    expect(results[0].beforeSpace).toBe('\n');
    expect(results[0].startIndex).toBe(1);
    expect(results[0].endIndex).toBe(4);
    expect(origString.substring(results[0].startIndex,results[0].endIndex)).toBe('How');

    expect(results[1].matches).toBe(true);
    expect(results[1].beforeSpace).toBe('\n ');
    expect(results[1].startIndex).toBe(6);
    expect(results[1].endIndex).toBe(9);
    expect(origString.substring(results[1].startIndex,results[1].endIndex)).toBe('are');

    expect(results[2].matches).toBe(true);
    expect(results[2].beforeSpace).toBe(' \n\t');
    expect(results[2].startIndex).toBe(12);
    expect(results[2].endIndex).toBe(15);
    expect(origString.substring(results[2].startIndex,results[2].endIndex)).toBe('you');
});

test('test find all indexes 4', () => {

    var origString = `\nHow\n are \n\tyou?`;
    var stringsToFind = ['\n\nHow','\fare','\u{2000}yall'];
    let results = findAllIndexes(origString, stringsToFind);

    expect(results.length).toBe(3);

    expect(results[0].matches).toBe(true);
    expect(results[0].beforeSpace).toBe('\n');
    expect(results[0].startIndex).toBe(1);
    expect(results[0].endIndex).toBe(4);
    expect(origString.substring(results[0].startIndex,results[0].endIndex)).toBe('How');

    expect(results[1].matches).toBe(true);
    expect(results[1].beforeSpace).toBe('\n ');
    expect(results[1].startIndex).toBe(6);
    expect(results[1].endIndex).toBe(9);
    expect(origString.substring(results[1].startIndex,results[1].endIndex)).toBe('are');

    expect(results[2].matches).toBe(false);
});

test('cypher queries match', () => {
    let cypher1 = `
        WITH "MATCH (dest:$destNodeLabel)
        WITH dest
        LIMIT 1000
        OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
        WITH count(src) AS srcCount, dest
        WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(dest) AS destCount, sum(flag) AS srcCount
        RETURN destCount, srcCount AS numPresent, (destCount - srcCount) AS numMissing" AS checkMissingRelationshipsQuery, "MATCH (src)-[:$relationshipType]->(dest)
        WITH src, dest
        LIMIT 1
        RETURN {relationshipType:'$relationshipType',
        srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
        destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap" AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, destPath    
    `;

    let cypher2 = `
        WITH "MATCH (dest:$destNodeLabel)
        WITH dest LIMIT 1000
        OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
        WITH count(src) AS srcCount, dest
        WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(dest) AS destCount, sum(flag) AS srcCount
        RETURN destCount, 
            srcCount AS numPresent, 
            (destCount - srcCount) AS numMissing" AS checkMissingRelationshipsQuery, 
        "MATCH (src)-[:$relationshipType]->(dest)
            WITH src, dest
            LIMIT 1
            RETURN {
                relationshipType:'$relationshipType',
                srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
                destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap
        " AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" 
            AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery WHERE value.numMissing > 0
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, destPath    
    `;

    let { matches } = findIndexes(cypher1, cypher2);    
    expect(matches).toBe(true);
});

test('ignore double slash comment at beginning', () => {
    var origString = '// Comment \nHow are you?';
    var stringToFind = 'How'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(12);
    expect(endIndex).toBe(15);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore double slash comment at beginning - both strings', () => {
    var origString = '// Comment \nHow are you?';
    var stringToFind = '// Comment\nHow'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(12);
    expect(endIndex).toBe(15);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore double slash comment at beginning - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = '// Comment\nHow'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(3);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore double slash comment in middle', () => {
    var origString = 'How // Comment \nare you?';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(19);
    expect(origString.substring(startIndex,endIndex)).toBe('How // Comment \nare');
});

test('ignore double slash comment in middle - both strings', () => {
    var origString = 'How // Comment \nare you?';
    var stringToFind = 'How // Comment \nare'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(19);
    expect(origString.substring(startIndex,endIndex)).toBe('How // Comment \nare');
});

test('ignore double slash comment in middle - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = 'How // Comment \nare'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore double slash comment at end', () => {
    var origString = 'How are you? // good';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore double slash comment at end - both strings', () => {
    var origString = 'How are you? // good';
    var stringToFind = 'How are // you?'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore double slash comment at end - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = 'How are // you?'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore /* multiline */ comment at beginning', () => {
    var origString = '/* Comment */ How are you?';
    var stringToFind = 'How'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe(' ');
    expect(startIndex).toBe(14);
    expect(endIndex).toBe(17);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore /* multiline */ comment at beginning - both strings', () => {
    var origString = '/* Comment */ How are you?';
    var stringToFind = '/* Comment */ How'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe(' ');
    expect(startIndex).toBe(14);
    expect(endIndex).toBe(17);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore /* multiline */ comment at beginning - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = '/* Comment */ How'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(3);
    expect(origString.substring(startIndex,endIndex)).toBe('How');
});

test('ignore /* multiline */ comment in middle', () => {
    var origString = 'How /* Comment */ are you?';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(21);
    expect(origString.substring(startIndex,endIndex)).toBe('How /* Comment */ are');
});

test('ignore /* multiline */ comment in middle - both strings', () => {
    var origString = 'How /* Comment */ are you?';
    var stringToFind = 'How /* Comment */ are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(21);
    expect(origString.substring(startIndex,endIndex)).toBe('How /* Comment */ are');
});

test('ignore /* multiline */ comment in middle - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = 'How /* Comment */ are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore /* multiline */ comment at end', () => {
    var origString = 'How are you? /* Comment */';
    var stringToFind = 'How are'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore /* multiline */ comment at end - both strings', () => {
    var origString = 'How are you? /* Comment */';
    var stringToFind = 'How are /* Comment */'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('ignore /* multiline */ comment at end - string to find only', () => {
    var origString = 'How are you?';
    var stringToFind = 'How are /* Comment */'
    let {
        matches,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(7);
    expect(origString.substring(startIndex,endIndex)).toBe('How are');
});

test('cypher queries match - with comments', () => {
    let cypher1 = `
        // This is a comment
        WITH "MATCH (dest:$destNodeLabel)
        WITH dest
        LIMIT 1000
        // Do some stuff here
        OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
        WITH count(src) AS srcCount, dest
        WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(dest) AS destCount, sum(flag) AS srcCount
        /* 
        A comment in an embedded Cypher string
        */
        RETURN destCount, srcCount AS numPresent, (destCount - srcCount) AS numMissing" AS checkMissingRelationshipsQuery, "MATCH (src)-[:$relationshipType]->(dest)
        WITH src, dest
        LIMIT 1
        RETURN {relationshipType:'$relationshipType',
        srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
        destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap" AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery
        WHERE value.numMissing > 0
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        ORDER BY numMissing, destPath    
    `;

    let cypher2 = `
        WITH "MATCH (dest:$destNodeLabel)
        /* Yo */
        WITH dest LIMIT 1000
        OPTIONAL MATCH (src:$srcNodeLabel)-[:$relationshipType]->(dest)
        WITH count(src) AS srcCount, dest
        WITH dest, CASE WHEN (srcCount = 0) THEN 0 ELSE 1 END AS flag
        WITH count(dest) AS destCount, sum(flag) AS srcCount
        RETURN destCount, 
            srcCount AS numPresent, 
            (destCount - srcCount) AS numMissing" AS checkMissingRelationshipsQuery, 
        "MATCH (src)-[:$relationshipType]->(dest)
            WITH src, dest
            LIMIT 1
            RETURN {
                relationshipType:'$relationshipType',
                srcNodeLabel: substring(reduce(s = '', label IN labels(src) | s + ':' + label), 1),
                destNodeLabel: substring(reduce(s = '', label IN labels(dest) | s + ':' + label), 1)} AS returnMap
        " AS relationshipCypherQuery
        CALL db.relationshipTypes() YIELD relationshipType
        CALL apoc.cypher.run(replace(relationshipCypherQuery, '$relationshipType', relationshipType), null) YIELD value
        WITH checkMissingRelationshipsQuery, value.returnMap AS returnMap
        WHERE returnMap.srcNodeLabel <> "" 
            AND returnMap.destNodeLabel <> ""
        WITH reduce(s = checkMissingRelationshipsQuery, aKey IN keys(returnMap) | replace(s, '$' + aKey, '' + returnMap[aKey])) AS newCheckMissingRelationshipsQuery, returnMap AS relInfo
        CALL apoc.cypher.run(newCheckMissingRelationshipsQuery, null) YIELD value
        WITH relInfo, value, newCheckMissingRelationshipsQuery WHERE value.numMissing > 0
        /* a multiline query  
            // with an embedded comment
        */
        RETURN relInfo.destNodeLabel + ': no inbound relationship ' + relInfo.srcNodeLabel + '-' + relInfo.relationshipType + '->' AS destPath, value.destCount AS destCount, value.numPresent AS numPresent, value.numMissing AS numMissing
        // Return stuff
        ORDER BY numMissing, destPath    
    `;

    let { matches } = findIndexes(cypher1, cypher2);    
    expect(matches).toBe(true);
});

test('test after space', () => {
    var origString = 'How are you?  \n';
    var stringToFind = 'How are you?'
    let {
        matches,
        afterSpace,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(afterSpace).toBe('  \n');
    // console.log('afterSpace.length: ', afterSpace.length);
    // for (let i = 0; i < afterSpace.length; i++) { 
    //     console.log(afterSpace.charCodeAt(i)) 
    // }
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(12);
    expect(origString.substring(startIndex,endIndex)).toBe('How are you?');
});

test('test after space 2', () => {
    var origString = 'How are you?  \n';
    var stringToFind = 'How are you?       ';
    let {
        matches,
        afterSpace,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(afterSpace).toBe('  \n');
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(12);
    expect(origString.substring(startIndex,endIndex)).toBe('How are you?');
});

test('test after space 3', () => {
    var origString = 'How are you?  \n // end\n ';
    var stringToFind = 'How are you?       ';
    let {
        matches,
        afterSpace,
        beforeSpace,
        startIndex,
        endIndex
    } = findIndexes(origString, stringToFind);

    expect(matches).toBe(true);
    expect(afterSpace).toBe('  \n  ');  // comments are ignored

    // console.log('afterSpace.length: ', afterSpace.length);
    // for (let i = 0; i < afterSpace.length; i++) { 
    //     console.log(afterSpace.charCodeAt(i)) 
    // }
    
    expect(beforeSpace).toBe('');
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(12);
    expect(origString.substring(startIndex,endIndex)).toBe('How are you?');
});