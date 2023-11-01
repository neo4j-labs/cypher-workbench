
const listModelResult = `
key
metadata {
  key
  cypherWorkbenchVersion
  title
  dateCreated
  dateUpdated
  description
  notes
  isPublic
  isInstanceModel
  userRole
  userIsCreator
  tags {
    key
    tag
  }
  customers {
    key
    name
  }
  owners {
    email
  }
}
`

const dataModelResult = `
    key
    excludeValidationSections
    metadata {
        key
        title
        isPublic
        userRole
        viewSettings
    }
    nodeLabels {
      key
      label
      referenceData
      indexes
      description
      display
      properties {
        key
        name
        datatype
        referenceData
        description
        isPartOfKey
        isArray
        isIndexed
        hasUniqueConstraint
        mustExist
      }
    }
    relationshipTypes {
      key
      type
      startNodeLabel {
        key
      }
      endNodeLabel {
        key
      }
      referenceData
      description
      outMinCardinality
      outMaxCardinality
      inMinCardinality
      inMaxCardinality
      display
      properties {
        key
        name
        datatype
        referenceData
        description
        isArray
        mustExist
      }
    }`;


var listDataModelsX = `
query ListDataModel ($myOrderBy: String, $orderDirection: String, $skip: Int, $limit: Int) {
    listDataModelsX(myOrderBy: $myOrderBy, orderDirection: $orderDirection, skip: $skip, limit: $limit) {
      ${listModelResult}
    }
}
`
var searchDataModelsX = `
query SearchDataModel ($searchText: String, $myOrderBy: String, $orderDirection: String, $skip: Int, $limit: Int) {
    searchDataModelsX(searchText: $searchText, myOrderBy: $myOrderBy, orderDirection: $orderDirection, skip: $skip, limit: $limit) {
      ${listModelResult}
    }
}
`

var loadDataModel = `
query LoadDataModel ($dataModelKey: String, $updateLastOpenedModel: Boolean) {
  loadDataModel(dataModelKey: $dataModelKey, updateLastOpenedModel: $updateLastOpenedModel) {
    ${dataModelResult}
  }
}
`

module.exports = {
    listDataModelsX,
    searchDataModelsX,
    loadDataModel
}