
import uuidv4 from 'uuid/v4';
import { VERSION } from '../../../version';

export function convertMetadataToCurrentVersion (metadata) {
    // right now, the only change from metadata which has no version timestamp, to latest version 
    var returnMetadata = { ...metadata };
    if (!returnMetadata.cypherWorkbenchVersion) {
        returnMetadata.cypherWorkbenchVersion = VERSION;
        ensureTagsHaveKeys(returnMetadata);
    }
    return returnMetadata;
}

function ensureTagsHaveKeys (metadata) {
    if (metadata && metadata.tags && metadata.tags.length > 0) {
        // assign a key to each tag that has no key
        metadata.tags
            .filter(tag => !tag.key)
            .map(tag => tag.key = uuidv4());
    }
}