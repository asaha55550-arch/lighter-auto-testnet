import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

const privateKey = process.env.API_PRIVATE_KEY;
const accountIndex = Number(process.env.ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.API_KEY_INDEX);

const action = String(process.env.TV_ACTION || "").toUpperCase();
const symbol = String(process.env.TV_SYMBOL || "").toUpperCase();
const tvQuantity = Number(process.env.TV_QUANTITY || 0);
const tvPrice = Number(process.env.TV_PRICE || 0);

if (!privateKey) {
  throw new Error("API_PRIVATE_KEY is missing");
}

if (!Number.isInteger(accountIndex)) {
  throw new Error("ACCOUNT_INDEX is invalid");
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error("API_KEY_INDEX is invalid");
}

// Manual run হলে test BUY
const isManualRun = !action;

const finalAction = isManualRun ? "BUY" : action;
const finalSymbol = symbol || "ETHUSDT";
const finalQuantity = isManualRun ? 0.01 : tvQuantity;

if (!["BUY", "SELL"].includes(finalAction)) {
  throw new Error(`Invalid action: ${finalAction}`);
}

if (!Number.isFinite(finalQuantity) || finalQuantity <= 0) {
  throw new Error(`Invalid quantity: ${finalQuantity}`);
}

// ETH market
const marketIndex = 0;

// Lighter base amount:
// 0.01 ETH = 10000
const baseAmount = Math.round(finalQuantity * 1_000_000);

// Market order price protection.
// If TradingView sends price, use it.
// Otherwise use 3000 USD.
const referencePrice = tvPrice > 0 ? tvPrice : 3000;

// Lighter price scale used by the successful test
const avgExecutionPrice = Math.round(referencePrice * 100);

// BUY = isAsk false
// SELL = isAsk true
const isAsk = finalAction === "SELL";

console.log("================================");
console.log("LIGHTER TESTNET ORDER");
console.log("================================");
console.log("Action:", finalAction);
console.log("Symbol:", finalSymbol);
console.log("Quantity:", finalQuantity);
console.log("Base Amount:", baseAmount);
console.log("Reference Price:", referencePrice);
console.log("Ask/Sell:", isAsk);
console.log("Account:", accountIndex);
console.log("API Key Index:", apiKeyIndex);
console.log("================================");

const client = new SignerClient({
  network: resolveNetworkFromEnv(),
  privateKey,
  accountIndex,
  apiKeyIndex
});

async function main() {

  await client.initialize();
  await client.ensureWasmClient();

  console.log("Connected to Lighter Testnet");

  const [tx, hash, error] = await client.createMarketOrder({
    marketIndex,
    clientOrderIndex: Date.now(),

    baseAmount,

    avgExecutionPrice,

    isAsk,

    reduceOnly: false
  });

  if (error) {
    console.error("ORDER FAILED:", error);
    await client.close();
    process.exit(1);
  }

  console.log("================================");
  console.log("ORDER SUBMITTED SUCCESSFULLY");
  console.log("================================");

  console.log("Transaction:", tx);
  console.log("Transaction Hash:", hash);

  if (hash) {
    try {
      const status = await client.waitForTransaction(
        hash,
        30000
      );

      console.log(
        "TRANSACTION STATUS:",
        status
      );

    } catch (e) {

      console.log(
        "Order submitted, confirmation check failed:",
        e
      );
    }
  }

  await client.close();

  console.log("Done");
}

main().catch(async (error) => {

  console.error(
    "FATAL ERROR:",
    error
  );

  try {
    await client.close();
  } catch {}

  process.exit(1);
});
