export default `

  type UserRole @exclude {
    email: String
    picture: String
    role: String
    isCreator: Boolean
  }

  input UserRoleInput {
    email: String
    role: String
    removeUser: Boolean
  }

  type Query {
      getUserRolesForDataModel(dataModelKey: String): [UserRole]
      getUserRolesForGraphDoc(key: String): [UserRole]
  }

  type Mutation {
      updateUserRoles(dataModelKey: String, isPublic: Boolean, userRoles:[UserRoleInput]): Boolean
      updateUserRolesGraphDoc(key: String, isPublic: Boolean, userRoles:[UserRoleInput]): Boolean
      updateDatabaseUserRoles(databaseId: String, userRoles:[UserRoleInput]): Boolean
  }

`;
