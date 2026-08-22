import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

const privateKey = process.env.LIGHTER_PRIVATE_KEY;
const accountIndex = Number(process.env.LIGHTER_ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.LIGHTER_API_KEY_INDEX);

if (!privateKey) {
  throw new Error("LIGHTER_PRIVATE_KEY is missing");
}

if (!Number.isInteger(accountIndex)) {
  throw new Error("LIGHTER_ACCOUNT_INDEX is invalid");
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error("LIGHTER_API_KEY_INDEX is invalid");
}

const client = new SignerClient({
  network: resolveNetworkFromEnv(),
  privateKey,
  accountIndex,
  apiKeyIndex
});

async function main() {
  console.log("Starting Lighter Testnet...");
  console.log("Account:", accountIndex);
  console.log("API Key Index:", apiKeyIndex);

  await client.initialize();
  await client.ensureWasmClient();

  console.log("Connected to Lighter Testnet");

  // TEST ONLY: BUY 0.01 ETH
  const [tx, hash, error] = await client.createMarketOrder({
    marketIndex: 0,
    clientOrderIndex: Date.now(),
    baseAmount: 10000,
    avgExecutionPrice: 300000,
    isAsk: false,
    reduceOnly: false
  });

  if (error) {
    console.error("ORDER FAILED:", error);
    await client.close();
    process.exit(1);
  }

  console.log("ORDER SUBMITTED");
  console.log("Transaction:", tx);
  console.log("Transaction Hash:", hash);

  if (hash) {
    try {
      const status = await client.waitForTransaction(hash, 30000);
      console.log("TRANSACTION STATUS:", status);
    } catch (e) {
      console.log(
        "Transaction submitted, but confirmation check failed:",
        e
      );
    }
  }

  await client.close();
  console.log("Done");
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);

  try {
    await client.close();
  } catch {}

  process.exit(1);
});
