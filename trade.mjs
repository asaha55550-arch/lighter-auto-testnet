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

const action = String(process.env.TV_ACTION || "").toUpperCase();
const symbol = String(process.env.TV_SYMBOL || "").toUpperCase();
const quantity = Number(process.env.TV_QUANTITY || 0);
const tvPrice = Number(process.env.TV_PRICE || 0);
const reduceOnly =
  String(process.env.TV_REDUCE_ONLY || "false").toLowerCase() === "true";

// ===============================
// CONFIG
// ===============================
const MARKET_MAP = {
  ETHUSDT: 0,
  ETHUSD: 0,
  ETH: 0
};

const MAX_QUANTITY_ETH = 0.05;
const MAX_SLIPPAGE = 0.005; // 0.5%

// Lighter ETH base amount:
// 1 ETH = 1,000,000 base units
const BASE_SCALE = 1_000_000;

// Lighter ETH price format:
// $3000 = 300000
const PRICE_SCALE = 100;

// ===============================
// VALIDATION
// ===============================
if (!privateKey) {
  throw new Error("API_PRIVATE_KEY is missing");
}

if (!Number.isInteger(accountIndex)) {
  throw new Error("ACCOUNT_INDEX is invalid");
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error("API_KEY_INDEX is invalid");
}

if (!["BUY", "SELL"].includes(action)) {
  throw new Error(`Invalid TradingView action: ${action}`);
}

if (!(symbol in MARKET_MAP)) {
  throw new Error(`Unsupported symbol: ${symbol}`);
}

if (!Number.isFinite(quantity) || quantity <= 0) {
  throw new Error(`Invalid quantity: ${quantity}`);
}

if (quantity > MAX_QUANTITY_ETH) {
  throw new Error(
    `Quantity ${quantity} ETH exceeds safety limit ${MAX_QUANTITY_ETH} ETH`
  );
}

if (!Number.isFinite(tvPrice) || tvPrice <= 0) {
  throw new Error(`Invalid TradingView price: ${tvPrice}`);
}

// ===============================
// ORDER PARAMETERS
// ===============================
const marketIndex = MARKET_MAP[symbol];

const baseAmount = Math.round(quantity * BASE_SCALE);

// Slippage protection.
//
// BUY:
//   acceptable price = alert price + 0.5%
//
// SELL:
//   acceptable price = alert price - 0.5%
const executionPrice =
  action === "BUY"
    ? Math.round(tvPrice * (1 + MAX_SLIPPAGE) * PRICE_SCALE)
    : Math.round(tvPrice * (1 - MAX_SLIPPAGE) * PRICE_SCALE);

const isAsk = action === "SELL";

const clientOrderIndex =
  Date.now() + Math.floor(Math.random() * 1000);

// ===============================
// LOG
// ===============================
console.log("=================================");
console.log("LIGHTER TESTNET AUTO TRADE");
console.log("=================================");
console.log("Action:", action);
console.log("Symbol:", symbol);
console.log("Market Index:", marketIndex);
console.log("Quantity:", quantity, "ETH");
console.log("Base Amount:", baseAmount);
console.log("TradingView Price:", tvPrice);
console.log("Execution Price:", executionPrice);
console.log("Side:", isAsk ? "SELL" : "BUY");
console.log("Reduce Only:", reduceOnly);
console.log("Client Order Index:", clientOrderIndex);
console.log("=================================");

// ===============================
// CONNECT
// ===============================
const client = new SignerClient({
  network: resolveNetworkFromEnv(),
  privateKey,
  accountIndex,
  apiKeyIndex
});

try {
  console.log("Connecting to Lighter Testnet...");

  await client.initialize();
  await client.ensureWasmClient();

  console.log("Connected successfully.");

// ===============================
// CREATE MARKET ORDER
// ===============================
  const [tx, hash, error] =
    await client.createMarketOrder({
      marketIndex,
      clientOrderIndex,
      baseAmount,
      avgExecutionPrice: executionPrice,
      isAsk,
      reduceOnly
    });

  if (error) {
    console.error("=================================");
    console.error("ORDER FAILED");
    console.error("=================================");
    console.error(error);
    throw new Error(String(error));
  }

  console.log("=================================");
  console.log("ORDER SUBMITTED SUCCESSFULLY");
  console.log("=================================");
  console.log("Transaction:", tx);
  console.log("Transaction Hash:", hash);

  // ===============================
  // WAIT FOR CONFIRMATION
  // ===============================
  if (hash) {
    try {
      const status =
        await client.waitForTransaction(hash, 30000);

      console.log("TRANSACTION STATUS:", status);

      console.log("=================================");
      console.log("ORDER PROCESS FINISHED");
      console.log("=================================");
    } catch (e) {
      console.log(
        "Order submitted, but confirmation check failed:",
        e
      );
    }
  }

} finally {
  await client.close();
}
