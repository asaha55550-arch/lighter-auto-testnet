import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

// =====================================
// ENV
// =====================================

const privateKey = process.env.API_PRIVATE_KEY;
const accountIndex = Number(process.env.ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.API_KEY_INDEX);

const action = String(process.env.TV_ACTION || "").toUpperCase();
const symbol = String(process.env.TV_SYMBOL || "").toUpperCase();

// TradingView quantity এখন USDT amount
const usdtAmount = Number(process.env.TV_QUANTITY || 0);

const tvPrice = Number(process.env.TV_PRICE || 0);

const reduceOnly =
  String(process.env.TV_REDUCE_ONLY || "false").toLowerCase() === "true";

// =====================================
// CONFIG
// =====================================

const MARKET_MAP = {
  ETHUSDT: 0,
  ETHUSD: 0,
  ETH: 0
};

// 🔒 SAFETY LIMIT
// Maximum $100 USDT per order
const MAX_USDT_PER_ORDER = 100;

// Minimum order value
const MIN_USDT_PER_ORDER = 1;

// Lighter ETH amount scale
// 1 ETH = 1,000,000 base units
const BASE_SCALE = 1_000_000;

// Lighter price scale
// $1 = 100 price units
const PRICE_SCALE = 100;

// Maximum allowed slippage
// 0.5%
const MAX_SLIPPAGE = 0.005;

// =====================================
// VALIDATION
// =====================================

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

if (!Number.isFinite(usdtAmount) || usdtAmount <= 0) {
  throw new Error(`Invalid USDT amount: ${usdtAmount}`);
}

if (usdtAmount < MIN_USDT_PER_ORDER) {
  throw new Error(
    `USDT amount ${usdtAmount} is below minimum ${MIN_USDT_PER_ORDER}`
  );
}

if (usdtAmount > MAX_USDT_PER_ORDER) {
  throw new Error(
    `USDT amount ${usdtAmount} exceeds safety limit ${MAX_USDT_PER_ORDER}`
  );
}

if (!Number.isFinite(tvPrice) || tvPrice <= 0) {
  throw new Error(`Invalid TradingView price: ${tvPrice}`);
}

// =====================================
// MARKET
// =====================================

const marketIndex = MARKET_MAP[symbol];

// =====================================
// USDT → ETH
// =====================================

// Example:
// USDT = 25
// ETH price = 2425
//
// ETH quantity = 25 / 2425
//
// Then convert ETH to Lighter base units.

const ethQuantity = usdtAmount / tvPrice;

const baseAmount = Math.round(
  ethQuantity * BASE_SCALE
);

if (baseAmount <= 0) {
  throw new Error("Calculated base amount is zero");
}

// =====================================
// SLIPPAGE PROTECTION
// =====================================

// BUY:
// acceptable price = TV price + 0.5%
//
// SELL:
// acceptable price = TV price - 0.5%

const executionPrice =
  action === "BUY"
    ? Math.round(
        tvPrice * (1 + MAX_SLIPPAGE) * PRICE_SCALE
      )
    : Math.round(
        tvPrice * (1 - MAX_SLIPPAGE) * PRICE_SCALE
      );

const isAsk = action === "SELL";

// Unique order ID
const clientOrderIndex =
  Date.now() + Math.floor(Math.random() * 1000);

// =====================================
// LOG
// =====================================

console.log("======================================");
console.log("      LIGHTER TESTNET AUTO TRADE");
console.log("======================================");

console.log("Action:", action);
console.log("Symbol:", symbol);
console.log("Market Index:", marketIndex);

console.log("USDT Amount:", usdtAmount);
console.log("TradingView Price:", tvPrice);

console.log("Calculated ETH:", ethQuantity);
console.log("Base Amount:", baseAmount);

console.log("Execution Price:", executionPrice);
console.log(
  "Execution Price USD:",
  executionPrice / PRICE_SCALE
);

console.log("Side:", isAsk ? "SELL" : "BUY");
console.log("Reduce Only:", reduceOnly);

console.log("Client Order Index:", clientOrderIndex);

console.log("======================================");

// =====================================
// CONNECT
// =====================================

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

  // ===================================
  // CREATE MARKET ORDER
  // ===================================

  console.log("Submitting order...");

  const [tx, hash, error] =
    await client.createMarketOrder({
      marketIndex,
      clientOrderIndex,
      baseAmount,
      avgExecutionPrice: executionPrice,
      isAsk,
      reduceOnly
    });

  // ===================================
  // ERROR
  // ===================================

  if (error) {

    console.error("======================================");
    console.error("          ORDER FAILED");
    console.error("======================================");

    console.error(error);

    throw new Error(String(error));
  }

  // ===================================
  // SUCCESS
  // ===================================

  console.log("======================================");
  console.log("   ORDER SUBMITTED SUCCESSFULLY");
  console.log("======================================");

  console.log("Action:", action);
  console.log("Symbol:", symbol);
  console.log("USDT:", usdtAmount);
  console.log("ETH:", ethQuantity);
  console.log("Base Amount:", baseAmount);
  console.log("Reduce Only:", reduceOnly);

  console.log("Transaction Hash:", hash);

  // ===================================
  // CONFIRMATION
  // ===================================

  if (hash) {

    try {

      const status =
        await client.waitForTransaction(
          hash,
          30000
        );

      console.log("Transaction Status:", status);

      console.log("======================================");
      console.log("       ORDER PROCESS FINISHED");
      console.log("======================================");

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
