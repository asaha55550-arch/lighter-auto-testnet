import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

// ===============================
// ENV
// ===============================
const privateKey = process.env.API_PRIVATE_KEY;
const accountIndex = Number(process.env.ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.API_KEY_INDEX);

if (!privateKey) {
  throw new Error("API_PRIVATE_KEY is missing");
}

if (!Number.isInteger(accountIndex)) {
  throw new Error("ACCOUNT_INDEX is invalid");
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error("API_KEY_INDEX is invalid");
}

// ===============================
// LIGHTER CLIENT
// ===============================
const client = new SignerClient({
  network: resolveNetworkFromEnv(),
  privateKey,
  accountIndex,
  apiKeyIndex
});

// ===============================
// MAIN
// ===============================
async function main() {
  console.log("================================");
  console.log("Lighter Testnet Trade");
  console.log("================================");

  console.log("Account:", accountIndex);
  console.log("API Key Index:", apiKeyIndex);

  await client.initialize();
  await client.ensureWasmClient();

  console.log("Connected to Lighter Testnet");

  // ==========================================
  // TEST ORDER
  // BUY 0.01 ETH
  // ==========================================
  console.log("Sending BUY 0.01 ETH...");

  const [tx, hash, error] = await client.createMarketOrder({
    marketIndex: 0,

    clientOrderIndex: Date.now(),

    // 0.01 ETH
    baseAmount: 10000,

    // ETH price estimate: 3000 USDT
    // Lighter price format
    avgExecutionPrice: 300000,

    // false = BUY
    isAsk: false,

    // false = normal opening order
    reduceOnly: false
  });

  // ==========================================
  // ORDER ERROR
  // ==========================================
  if (error) {
    console.error("================================");
    console.error("ORDER FAILED");
    console.error("================================");
    console.error(error);

    await client.close();
    process.exit(1);
  }

  // ==========================================
  // ORDER SUBMITTED
  // ==========================================
  console.log("================================");
  console.log("ORDER SUBMITTED");
  console.log("================================");

  console.log("Transaction:", tx);
  console.log("Transaction Hash:", hash);

  // ==========================================
  // WAIT FOR TRANSACTION
  // ==========================================
  if (hash) {
    console.log("Waiting for transaction confirmation...");

    try {
      const status = await client.waitForTransaction(
        hash,
        60000
      );

      console.log("================================");
      console.log("TRANSACTION STATUS");
      console.log("================================");

      console.log(status);

      /*
        Important:
        status 2 = COMMITTED
        status 3 = EXECUTED
      */

      if (status === 3 || status?.status === 3) {
        console.log("✅ TRANSACTION EXECUTED");
      } else if (status === 2 || status?.status === 2) {
        console.log("⚠️ TRANSACTION COMMITTED");
        console.log("Order is not confirmed as EXECUTED yet.");
      } else {
        console.log("ℹ️ Transaction status:", status);
      }

    } catch (e) {
      console.error("Transaction confirmation check failed:");
      console.error(e);
    }
  } else {
    console.log("⚠️ No transaction hash returned.");
  }

  await client.close();

  console.log("================================");
  console.log("DONE");
  console.log("================================");
}

// ===============================
// FATAL ERROR
// ===============================
main().catch(async (error) => {
  console.error("================================");
  console.error("FATAL ERROR");
  console.error("================================");
  console.error(error);

  try {
    await client.close();
  } catch {}

  process.exit(1);
});
