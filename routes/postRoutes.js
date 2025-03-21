import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { createEncryptionService } from "../src/lib/encryption.js";

dotenv.config();
const router = express.Router();

router.post("/data", (req, res) => {
  res.send(`Received data: ${JSON.stringify(req.body)}`);
});

router.post("/create-wallet", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.privy.io/v1/wallets",
      {
        chain_type: "ethereum",
      },
      {
        auth: {
          username: process.env.PRIVY_APP_ID,
          password: process.env.PRIVY_APP_SECRET,
        },
        headers: {
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );

    const encryptionService = await createEncryptionService({
      nodes: 3,
      operations: { store: true },
    });
    const encryptedWalletId = await encryptionService.encryptPassword(
      response.data.id
    );
    const decryptedWalletId = await encryptionService.decryptPassword(
      encryptedWalletId
    );

    // Remove the id from the response data
    const { id, ...responseDataWithoutId } = response.data;

    res.json({ ...responseDataWithoutId, wallet_id: encryptedWalletId });
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

router.post("/sign-message", async (req, res) => {
  const { wallet_id, message } = req.body;
  console.log(req.body);

  try {
    const encryptionService = await createEncryptionService({ nodes: 3 });
    const decryptedWalletId = await encryptionService.decryptPassword(
      wallet_id
    );

    console.log("Decrypted wallet ID:", decryptedWalletId);

    const response = await axios.post(
      `https://api.privy.io/v1/wallets/${decryptedWalletId}/rpc`,
      {
        chain_type: "ethereum",
        method: "personal_sign",
        params: {
          message: message,
          encoding: "utf-8",
        },
      },
      {
        auth: {
          username: process.env.PRIVY_APP_ID,
          password: process.env.PRIVY_APP_SECRET,
        },
        headers: {
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/send-transaction", async (req, res) => {
  const { wallet_id, to, value, chain_name } = req.body;
  console.log(req.body);
  try {
    const encryptionService = await createEncryptionService({ nodes: 3 });
    const decryptedWalletId = await encryptionService.decryptPassword(
      wallet_id
    );

    const chainId = chain_name === "sepolia" ? "11155111" : "84532";

    const response = await axios.post(
      `https://api.privy.io/v1/wallets/${decryptedWalletId}/rpc`,
      {
        method: "eth_sendTransaction",
        caip2: `eip155:${chainId}`,
        params: {
          transaction: {
            to: to,
            value: value,
          },
        },
      },
      {
        auth: {
          username: process.env.PRIVY_APP_ID,
          password: process.env.PRIVY_APP_SECRET,
        },
        headers: {
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/create-policy", async (req, res) => {
  const { name } = req.body;
  console.log(req.body);
  try {
    const response = await axios.post(
      "https://api.privy.io/v1/policies",
      {
        version: "1.0",
        name: name,
        chain_type: "ethereum",
        method_rules: [
          {
            method: "eth_sendTransaction",
            rules: [
              {
                name: "Allowlist USDC",
                conditions: [
                  {
                    field_source: "ethereum_transaction",
                    field: "to",
                    operator: "eq",
                    value: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC contract address
                  },
                ],
                action: "ALLOW",
              },
            ],
          },
        ],
        default_action: "DENY",
      },
      {
        auth: {
          username: process.env.PRIVY_APP_ID,
          password: process.env.PRIVY_APP_SECRET,
        },
        headers: {
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post("/create-policy-limit-2", async (req, res) => {
  const { name, maxAmount } = req.body;
  try {
    const response = await axios.post(
      "https://api.privy.io/v1/policies",
      {
        version: "1.0",
        name: name,
        chain_type: "ethereum",
        method_rules: [
          {
            method: "eth_sendTransaction",
            rules: [
              {
                name: "Restrict USDC transfers on Base",
                conditions: [
                  {
                    field_source: "ethereum_transaction",
                    field: "to",
                    operator: "eq",
                    value: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC contract address
                  },
                  {
                    field_source: "ethereum_calldata",
                    field: "transfer.amount",
                    abi: [
                      {
                        inputs: [
                          {
                            internalType: "address",
                            name: "recipient",
                            type: "address",
                          },
                          {
                            internalType: "uint256",
                            name: "amount",
                            type: "uint256",
                          },
                        ],
                        name: "transfer",
                        outputs: [
                          {
                            internalType: "bool",
                            name: "",
                            type: "bool",
                          },
                        ],
                        stateMutability: "nonpayable",
                        type: "function",
                      },
                    ],
                    operator: "lte",
                    value: maxAmount,
                  },
                ],
                action: "ALLOW",
              },
            ],
          },
        ],
        default_action: "DENY",
      },
      {
        auth: {
          username: process.env.PRIVY_APP_ID,
          password: process.env.PRIVY_APP_SECRET,
        },
        headers: {
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

export default router;
