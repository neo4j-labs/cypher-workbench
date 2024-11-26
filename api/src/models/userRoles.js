import { runQuery } from "../util/run";
import { processResult } from './resultHelper';
import { UpdateUserRoles, UpdateDatabaseUserRoles, GetUserRoles } from './userRolesCypher';

  export const updateUserRoles = async (key, isPublic, userRoles, context) => {
    const args = {key: key, isPublic: isPublic, userRoles: userRoles, userEmail: context.email};
    var cypher = UpdateUserRoles.replace('$$DocType', 'DataModel');
    var result = await runQuery(cypher, args);
    result = processResult(result);
    // TODO: check for error
    //return getFirstRowValue(result, "success", "Error updating user roles");
    return true;
  }

  export const updateUserRolesGraphDoc = async (key, isPublic, userRoles, context) => {
    const args = {key: key, isPublic: isPublic, userRoles: userRoles, userEmail: context.email};
    var cypher = UpdateUserRoles.replace('$$DocType', 'GraphDoc');
    var result = await runQuery(cypher, args);
    result = processResult(result);
    // TODO: check for error
    //return getFirstRowValue(result, "success", "Error updating user roles");
    return true;
  }

  export const updateDatabaseUserRoles = async (databaseId, userRoles, context) => {
    const args = {databaseId: databaseId, userRoles: userRoles, userEmail: context.email};
    var result = await runQuery(UpdateDatabaseUserRoles, args);
    result = processResult(result);
    // TODO: check for error
    //return getFirstRowValue(result, "success", "Error updating user roles");
    return true;
  }

  export const getUserRolesForDataModel = async (key, context) => {
    const args = {key: key, userEmail: context.email};
    var cypher = GetUserRoles.replace('$$DocType', 'DataModel');
    var result = await runQuery(cypher, args);
    result = processResult(result);
    return result.rows;
  }

  export const getUserRolesForGraphDoc = async (key, context) => {
    const args = {key: key, userEmail: context.email};
    var cypher = GetUserRoles.replace('$$DocType', 'GraphDoc');
    var result = await runQuery(cypher, args);
    result = processResult(result);
    return result.rows;
  }
