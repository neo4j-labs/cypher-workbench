
const keywords = `
WITH
UNWIND
CREATE
DELETE
DETACH
LIMIT
MATCH
MERGE
OPTIONAL MATCH
ORDER BY
REMOVE
RETURN
SET
SKIP
WHERE
WITH
UNION
UNWIND
`;

export const CypherKeywords = keywords.split('\n').map(x => x.trim()).filter(x => x);