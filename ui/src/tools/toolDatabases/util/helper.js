import { getClient, handleTokenExpired } from '../../../persistence/graphql/GraphQLPersistence';

const containsNoSpaces = str => {
  if (str.indexOf(" ") === -1) {
    return true;
  }
  return false;
};

const notNullUndefinedOrEmpty = input => {
  if (input) {
    return true;
  }
  return false;
};

const arrayHasElements = input => {
  if (input.length > 0) {
    return true;
  }
  return false;
};

const isPositiveInteger = input => {
  if (input > 0) {
    return true;
  }
  return false;
};

const pluralize = (count, noun, suffix = "s") => {
  return `${count} ${noun}${count !== 1 ? suffix : ""}`;
};

const safelyUnwrap = (data, properties, nullReturnValue) => {
  var result = data;
  properties.forEach(prop => {
    if (result[prop]) {
      result = result[prop];
    } else {
      result = nullReturnValue;
      return;
    }
  });
  return result;
};

/*
  args: [{input: any, functions: [func], onError: func}]
  note: functions within the functions array should return true if the input
        is valid and false if it is not
*/
// TODO: refactor!! If the function that throws an error isn't the last function run this will still return true
// TODO: refactor!! Consider changing to checkInput()
const checkInputs = inputs => {
  console.log(inputs)
  var result = true;
  inputs.forEach(input => {
    input.functions.forEach(func => {
      if (!func(input.input)) {
        result = false;
        input.onError();
      }
    });
  });
  return result;
};

const runMutation = (mutation, variables, onSuccess = () => {}, onError = () => {}) => {
  getClient().mutate({
    mutation: mutation,
    variables: variables
  })
  .then((result) => {
      onSuccess(result);
  })
  .catch((error) => {
    handleTokenExpired(error);
    onError(error);
  });
};

const parseDBInfo = info => {
  if (!info) {
    return { color: "#d84242", message: "Offline", icon: "times circle" };
  }
  if (!info.isConnected) {
    return { color: "#d84242", message: "Offline", icon: "times circle" };
  } else if (info.license !== "ENTERPRISE") {
    return {
      color: "#ebd000",
      message: "Update to Enterprise",
      icon: "dot circle"
    };
  } else if (!info.hasApoc) {
    return { color: "#ebd000", message: "Install APOC", icon: "dot circle" };
  } else {
    return { color: "#63b344", message: "Online", icon: "check circle" };
  }
};

export {
  parseDBInfo,
  runMutation,
  checkInputs,
  pluralize,
  safelyUnwrap,
  arrayHasElements,
  notNullUndefinedOrEmpty,
  containsNoSpaces,
  isPositiveInteger
};
