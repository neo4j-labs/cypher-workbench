export default `

  scalar Long

  type CreateUserResponse @exclude {
    error: String
    user: User

  }

  type LocalAuthToken @exclude {
    token: String,
    expires: Long  
  }

  type User @exclude {
    name: String
    email: String
    picture: String
    isAdmin: Boolean
    isCurrentUser: Boolean
    primaryOrganization: String
    primaryOrganizationRequiresEULA: Boolean
    authorizedOrganizations: [String]
    browserAsymmetricEncryptionKey: String
    localAuthToken: LocalAuthToken  # when logging in using local auth, this provides a way to pass the generated token back to the client
  }

  input CustomUser {
    primaryOrganization: String    
    email: String
    password: String
    name: String
    picture: String
  }

  type LicenseInfo @exclude {
      product: String
      version: String
      type: String
      enterpriseDomains: [String]
      licensedFeatures: [Feature]
  }

  type Feature @exclude {
      name: String!
  }

  input EncryptedItemWithPublicKey {
    item: String
    publicKey: String
  }

  type SystemMessage @exclude {
    key: String,
    message: String,
    validUntil: String
  }

  input UserSettingsInput {
    email: ID!
    canvasSettings: String
  }  

  type Query {
      getCurrentUser: User!
      getUserSettings(email: String): UserSettings
      findUsers(searchText: String): [User]
      getLicensedFeatures: [Feature]
      getLicenseInfo: LicenseInfo
      acceptedEula(email: String): Boolean!
      getSystemMessages: [SystemMessage]
      decryptAsymmetricEncryptedItems(items: [EncryptedItemWithPublicKey]): [String]
      graphQLTest: Boolean @cypher(statement: """RETURN true""")
  }

  type Mutation {
      createUser(encryptedPassword: String): CreateUserResponse
      createUserSignUp(input: CustomUser!): User!
      updateUserPrimaryOrganization(primaryOrganization: String): Boolean
      updateUserSettings(userSettings: UserSettingsCreateInput): Boolean
      acknowledgeMessages(messageKeys: [String]): Boolean
      logInLocalUser(email: String, encryptedPassword: String): User!
  }

`;
