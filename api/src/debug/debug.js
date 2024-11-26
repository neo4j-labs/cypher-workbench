
import { doTransform } from "./DataModelMetadataTransform";

var dataModelMetadataDoc = `
{ 
    "dataModelMetadata": {
        "key": "222",
        "title": "Test GraphDoc",
        "description": "",
        "notes": "",
        "dateCreated": "1588193382680",
        "dateUpdated": "1590246440018",
        "isPublic": false,
        "upsertTags": [
            {
                "key": "333",
                "tag": "Sports"
            }
        ],
        "removeTags": [

        ],
        "upsertCustomers": [
            {
                "key": "444",
                "name": "Neo4j"
            }
        ],
        "removeCustomers": [

        ]
    }
}
`

var dataModelMetadataDocJSON = JSON.parse(dataModelMetadataDoc);
//console.log(dataModelMetadataDocJSON);
var result = doTransform(dataModelMetadataDocJSON);
console.log(JSON.stringify(result,2));
