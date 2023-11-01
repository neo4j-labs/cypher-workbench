

export const UpdateUserRoles = `
WITH $key as key, $userRoles as userRoles, $isPublic as isPublic, $userEmail as userEmail
MATCH (userDoingAction:User {email: userEmail})
MATCH (itemToSecure:$$DocType {key: key})
CALL apoc.util.validate(NOT userDoingAction.primaryOrganization IN labels(itemToSecure),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT(EXISTS((userDoingAction)<-[:OWNER]-(itemToSecure))
                              OR userDoingAction:Admin),"permission denied",[0])
WITH itemToSecure, userRoles, isPublic, userDoingAction
SET itemToSecure.isPrivate = NOT(isPublic)
WITH itemToSecure, userRoles, userDoingAction
UNWIND userRoles as userRole
MATCH (user:User {email: userRole.email})
  WHERE userDoingAction.primaryOrganization IN labels(user)
OPTIONAL MATCH (itemToSecure)-[existingRole]->(user)
WHERE user <> userDoingAction
DELETE existingRole
WITH itemToSecure, userRole, user,
  replace('MERGE (itemToSecure)-[:$role]->(user) RETURN "Merged" as action', '$role', userRole.role) as cypher
CALL apoc.do.when(userRole.removeUser IS NULL OR userRole.removeUser <> true,
  cypher,
  'RETURN "Deleted" as action',
  {itemToSecure:itemToSecure, user:user}) YIELD value
RETURN true as success
`

export const GetUserRoles = `
WITH $key as key, $userEmail as userEmail
MATCH (userDoingAction:User {email: userEmail})
MATCH (item:$$DocType {key:key})-[role:OWNER|CREATOR|MEMBER|VIEWER]->(user:User)
  WHERE userDoingAction.primaryOrganization IN labels(user)
CALL apoc.util.validate(NOT userDoingAction.primaryOrganization IN labels(item),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT(EXISTS((userDoingAction)<-[:OWNER|CREATOR|MEMBER|VIEWER]-(item))
                              OR item.isPrivate <> true OR userDoingAction:Admin),"permission denied",[0])
WITH user, collect(type(role)) as roles
WITH user,
	CASE WHEN 'CREATOR' IN roles THEN true ELSE false END as isCreator,
    [x IN roles WHERE x <> 'CREATOR'][0] as role
RETURN user.email as email, role, isCreator
`

export const UpdateDatabaseUserRoles = `
WITH $databaseId as databaseId, $userRoles as userRoles, $userEmail as userEmail
MATCH (userDoingAction:User {email: userEmail})
MATCH (dbConnection:DBConnection {id: databaseId})
CALL apoc.util.validate(NOT userDoingAction.primaryOrganization IN labels(dbConnection),"permission denied (wrong org)",[0])
CALL apoc.util.validate(NOT(EXISTS((userDoingAction)<-[:OWNER]-(dbConnection))
                              OR userDoingAction:Admin),"permission denied",[0])
WITH dbConnection, userRoles, userDoingAction
UNWIND userRoles as userRole
MATCH (user:User {email: userRole.email})
  WHERE userDoingAction.primaryOrganization IN labels(user)
OPTIONAL MATCH (dbConnection)-[existingRole]->(user)
WHERE user <> userDoingAction
DELETE existingRole
WITH dbConnection, userRole, user,
  replace('MERGE (dbConnection)-[:$role]->(user) RETURN "Merged" as action', '$role', userRole.role) as cypher
CALL apoc.do.when(userRole.removeUser IS NULL OR userRole.removeUser <> true,
  cypher,
  'RETURN "Deleted" as action',
  {dbConnection:dbConnection, user:user}) YIELD value
RETURN true as success
`
