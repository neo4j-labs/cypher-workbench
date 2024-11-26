import { gql } from "@apollo/client";

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    user: getCurrentUser {
      name
      email
      picture
      primaryOrganization
      authorizedOrganizations
      browserAsymmetricEncryptionKey
    }
  }
`;

const DECRYPT_ASYMMETRIC_ENCRYPTED_ITEMS = gql`
  query DecryptAsymmetricEncryptedItems ($items: [EncryptedItemWithPublicKey]) {
    decryptedItems: decryptAsymmetricEncryptedItems (items: $items)
  }
`;

const GET_SYSTEM_MESSAGES = gql`
  query GetSystemMessages {
    messages: getSystemMessages {
      key
      message
      validUntil
    }
}
`;

const ACKNOWLEDGE_MESSAGES = gql`
  mutation AcknowledgeMessages ($messageKeys: [String]) {
    acknowledgeMessages (messageKeys: $messageKeys)
  }
`;

export {
  GET_CURRENT_USER,
  DECRYPT_ASYMMETRIC_ENCRYPTED_ITEMS,
  GET_SYSTEM_MESSAGES,
  ACKNOWLEDGE_MESSAGES
};
