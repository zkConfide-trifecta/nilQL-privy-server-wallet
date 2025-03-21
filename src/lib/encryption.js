import { nilql } from "@nillion/nilql";

/**
 * Creates an encryption service for handling credential encryption/decryption
 */
export const createEncryptionService = async (config) => {
  // Create cluster config with specified number of nodes
  const cluster = {
    nodes: Array(config.nodes).fill({}),
  };

  // Initialize secret key with cluster config and operations
  const secretKey = await nilql.SecretKey.generate(cluster, {
    store: true,
    ...config.operations,
  });

  /**
   * Encrypt a password into shares
   */
  const encryptPassword = async (password) => {
    try {
      const shares = await nilql.encrypt(secretKey, password);
      if (!Array.isArray(shares)) {
        throw new Error("Unexpected encryption result");
      }
      return shares;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  /**
   * Decrypt password from shares
   */
  const decryptPassword = async (shares) => {
    try {
      if (shares.length !== config.nodes) {
        throw new Error(
          `Expected ${config.nodes} shares but got ${shares.length}`
        );
      }
      const decrypted = await nilql.decrypt(secretKey, shares);
      if (typeof decrypted !== "string") {
        throw new Error("Unexpected decryption result");
      }
      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return {
    encryptPassword,
    decryptPassword,
  };
};
