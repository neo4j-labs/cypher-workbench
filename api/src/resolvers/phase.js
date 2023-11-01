import { editPhase } from "../models/phase";

export default {
  Mutation: {
    editPhase: async (root, { id, input }, context, info) => {
      return await editPhase(id, input, context);
    },
  },
};
