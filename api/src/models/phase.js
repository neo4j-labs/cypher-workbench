import { encrypt, decrypt } from "../util/encryption";
import { runQuery, initializeDriver } from "../util/db";

const getPhaseFromPhaseNode = (node) => {
  const phase = {
    ...node.properties,
    phaseType: getPhaseType(node),
  };
  if (!("description" in phase)) {
    phase.description = "";
  }
  return phase;
};

const getPhaseType = (node) => {
  return node.labels.filter((label) => label != "Phase")[0];
};

export const editPhase = async (id, properties, context) => {
  const uri = process.env.KEYMAKER_NEO4J_URI;
  const user = encrypt(process.env.KEYMAKER_NEO4J_USER);
  const password = encrypt(process.env.KEYMAKER_NEO4J_PASSWORD);
  const keymakerDBConnection = {
    id: "keymakerDBConnection",
    url: uri,
    encryptedUser: user,
    encryptedPassword: password,
  };
  const query = `
      MATCH (phase:Phase {id: $id})<-[:HAS_START_PHASE|NEXT_PHASE*]-(engine:Engine),(u:User{email: $email})
      CALL apoc.util.validate(NOT (EXISTS((u)<-[:OWNER|MEMBER]-(engine)) or u:Admin),"permission denied",[0])
      SET phase += $properties
      RETURN phase
    `;
  const driver = initializeDriver(keymakerDBConnection);
  const args = { id, properties, email: context.email };
  const result = await runQuery(driver, query, args, process.env.KEYMAKER_NEO4J_DATABASE);
  return getPhaseFromPhaseNode(result.records[0].get("phase"));
};
