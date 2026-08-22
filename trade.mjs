import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

// ==========================================
// ENVIRONMENT
// ==========================================

const privateKey = process.env.API_PRIVATE_KEY;
const accountIndex = Number(process.env.ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.API_KEY_INDEX);

const action = String(process.env.TV_ACTION || "")
  .trim()
  .toUpperCase();

const symbol = String(process.env.TV_SYMBOL || "")
  .trim()
  .toUpperCase();

const quantity = Number(process.env.TV_QUANTITY || 0);
const tvPrice = Number(process.env.TV_PRICE || 0);

const reduceOnly =
  String(process.env.TV_REDUCE_ONLY || "false")
    .trim()
    .toLowerCase() === "true";


// ==========================================
// SAFETY SETTINGS
// ==========================================

// ETH market on Lighter
const MARKET_MAP = {
  ETH: 0,
  ETHUSDT: 0,
  ETHUSD: 0
};

// Maximum ETH per TradingView alert
const MAX_QUANTITY_ETH = 0.05;

// Maximum allowed slippage
// 0.5% = 50 basis points
const MAX_SLIPPAGE = 0.005;

// Lighter ETH amount scale
// 1 ETH = 1,000,000 base units
const BASE_SCALE = 1_000_000;

// Lighter ETH price scale
// Example: $2400 = 240000
const PRICE_SCALE = 100;


// ==========================================
// VALIDATION
// ==========================================

if (!privateKey) {
  throw new Error("API_PRIVATE_KEY is missing");
}

if (!Number.isInteger(accountIndex)) {
  throw new Error(
    `ACCOUNT_INDEX is invalid: ${accountIndex}`
  );
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error(
    `API_KEY_INDEX is invalid: ${apiKeyIndex}`
  );
}

if (!["BUY", "SELL"].includes(action)) {
  throw new Error(
    `Invalid TradingView action: ${action}`
  );
}

if (!(symbol in MARKET_MAP)) {
  throw new Error(
    `Unsupported symbol: ${symbol}`
  );
}

if (!Number.isFinite(quantity) || quantity <= 0) {
  throw new Error(
    `Invalid quantity: ${quantity}`
  );
}

if (quantity > MAX_QUANTITY_ETH) {
  throw new Error(
    `Quantity ${quantity} ETH exceeds maximum allowed ${MAX_QUANTITY_ETH} ETH`
  );
}

if (!Number.isFinite(tvPrice) || tvPrice <= 0) {
  throw new Error(
    `Invalid TradingView price: ${tvPrice}`
  );
}


// ==========================================
// ORDER PARAMETERS
// ==========================================

const marketIndex = MARKET_MAP[symbol];

const baseAmount = Math.round(
  quantity * BASE_SCALE
);

// BUY = isAsk false
// SELL = isAsk true
const isAsk = action === "SELL";

// Slippage-protected execution price
//
// BUY  -> accepts up to +0.5%
// SELL -> accepts down to -0.5%

const executionPrice =
  action === "BUY"
    ? Math.round(
        tvPrice *
        (1 + MAX_SLIPPAGE) *
        PRICE_SCALE
      )
    : Math.round(
        tvPrice *
        (1 - MAX_SLIPPAGE) *
        PRICE_SCALE
      );


// Unique client order ID
const clientOrderIndex =
  Date.now() +
  Math.floor(Math.random() * 1000);


// ==========================================
// DISPLAY ORDER
// ==========================================

console.log("");
console.log("==========================================");
console.log("       LIGHTER TESTNET AUTO TRADE");
console.log("==========================================");

console.log("Action:", action);
console.log("Symbol:", symbol);
console.log("Market Index:", marketIndex);
console.log("Quantity:", quantity, "ETH");
console.log("Base Amount:", baseAmount);
console.log("TradingView Price:", tvPrice);
console.log("Execution Price:", executionPrice);
console.log(
  "Side:",
  isAsk ? "SELL" : "BUY"
);
console.log("Reduce Only:", reduceOnly);
console.log(
  "Client Order Index:",
  clientOrderIndex
);

console.log("==========================================");
console.log("");


// ==========================================
// CONNECT TO LIGHTER
// ==========================================

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


// ==========================================
// CREATE MARKET ORDER
// ==========================================

  console.log("");
  console.log("Submitting order...");
  console.log("");

  const [
    tx,
    hash,
    error
  ] = await client.createMarketOrder({

    marketIndex,

    clientOrderIndex,

    baseAmount,

    avgExecutionPrice: executionPrice,

    isAsk,

    reduceOnly
  });


// ==========================================
// ERROR CHECK
// ==========================================

  if (error) {

    console.error("");
    console.error("==========================================");
    console.error("           ❌ ORDER FAILED");
    console.error("==========================================");

    console.error(error);

    throw new Error(
      String(error)
    );
  }


// ==========================================
// SUCCESS
// ==========================================

  console.log("");
  console.log("==========================================");
  console.log("       ✅ ORDER SUBMITTED SUCCESSFULLY");
  console.log("==========================================");

  console.log("Action:", action);
  console.log("Symbol:", symbol);
  console.log("Quantity:", quantity);
  console.log("Reduce Only:", reduceOnly);

  console.log("");
  console.log("Transaction Hash:");
  console.log(hash);

  console.log("");
  console.log("Transaction:");
  console.log(tx);

  console.log("==========================================");


// ==========================================
// WAIT FOR CONFIRMATION
// ==========================================

  if (hash) {

    console.log("");
    console.log(
      "Waiting for transaction confirmation..."
    );

    try {

      const status =
        await client.waitForTransaction(
          hash,
          30000
        );

      console.log("");
      console.log("==========================================");
      console.log("       ✅ TRANSACTION CONFIRMED");
      console.log("==========================================");

      console.log("Status:");
      console.log(status);

      console.log("==========================================");

    } catch (confirmationError) {

      console.log("");
      console.log(
        "⚠️ Order was submitted, but confirmation check failed."
      );

      console.log(
        confirmationError
      );

    }
  }

} finally {

  await client.close();

  console.log("");
  console.log("Lighter client closed.");
}
