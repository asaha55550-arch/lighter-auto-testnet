import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

// ============================================
// ENV
// ============================================

const privateKey = process.env.API_PRIVATE_KEY;
const accountIndex = Number(process.env.ACCOUNT_INDEX);
const apiKeyIndex = Number(process.env.API_KEY_INDEX);

const action = String(
  process.env.TV_ACTION || ""
).trim().toUpperCase();

const symbol = String(
  process.env.TV_SYMBOL || ""
).trim().toUpperCase();

const tvUnit = Number(
  process.env.TV_USDT_AMOUNT || 0
);

const tvPrice = Number(
  process.env.TV_PRICE || 0
);


// ============================================
// USER SIZE CONVENTION
// ============================================

// TradingView:
// 1 = $100
// 2 = $200
// 0.5 = $50

const USDT_MULTIPLIER = 100;

const usdtAmount =
  tvUnit * USDT_MULTIPLIER;


// ============================================
// SAFETY
// ============================================

const MIN_USDT = 1;

const MAX_USDT = 200;


// ============================================
// MARKET
// ============================================

const MARKET_MAP = {
  ETHUSDT: 0,
  ETHUSD: 0,
  ETH: 0
};


// ============================================
// SCALING
// ============================================

const BASE_SCALE = 1_000_000;

const PRICE_SCALE = 100;


// ============================================
// SLIPPAGE
// ============================================

const MAX_SLIPPAGE = 0.005;


// ============================================
// VALIDATION
// ============================================

if (!privateKey) {
  throw new Error(
    "API_PRIVATE_KEY is missing"
  );
}

if (!Number.isInteger(accountIndex)) {
  throw new Error(
    "ACCOUNT_INDEX is invalid"
  );
}

if (!Number.isInteger(apiKeyIndex)) {
  throw new Error(
    "API_KEY_INDEX is invalid"
  );
}

if (!["BUY", "SELL"].includes(action)) {
  throw new Error(
    `Invalid action: ${action}`
  );
}

if (!(symbol in MARKET_MAP)) {
  throw new Error(
    `Unsupported symbol: ${symbol}`
  );
}

if (
  !Number.isFinite(tvUnit) ||
  tvUnit <= 0
) {
  throw new Error(
    `Invalid TradingView amount: ${tvUnit}`
  );
}

if (
  !Number.isFinite(usdtAmount) ||
  usdtAmount < MIN_USDT
) {
  throw new Error(
    `Invalid USDT amount: ${usdtAmount}`
  );
}

if (usdtAmount > MAX_USDT) {
  throw new Error(
    `USDT amount ${usdtAmount} exceeds maximum ${MAX_USDT}`
  );
}

if (
  !Number.isFinite(tvPrice) ||
  tvPrice <= 0
) {
  throw new Error(
    `Invalid TradingView price: ${tvPrice}`
  );
}


// ============================================
// MARKET INDEX
// ============================================

const marketIndex =
  MARKET_MAP[symbol];


// ============================================
// TARGET SIZE
// ============================================

const targetEth =
  usdtAmount / tvPrice;

const targetBaseAmount =
  Math.round(
    targetEth * BASE_SCALE
  );

if (targetBaseAmount <= 0) {
  throw new Error(
    "Calculated target amount is zero"
  );
}


// ============================================
// EXECUTION PRICE
// ============================================

function executionPrice(side) {

  if (side === "BUY") {

    return Math.round(
      tvPrice *
      (1 + MAX_SLIPPAGE) *
      PRICE_SCALE
    );

  }

  return Math.round(
    tvPrice *
    (1 - MAX_SLIPPAGE) *
    PRICE_SCALE
  );
}


// ============================================
// ORDER
// ============================================

async function submitOrder(
  client,
  side,
  baseAmount,
  reduceOnly
) {

  const isAsk =
    side === "SELL";

  const clientOrderIndex =
    Date.now() +
    Math.floor(
      Math.random() * 10000
    );

  const price =
    executionPrice(side);

  console.log("");
  console.log(
    "======================================"
  );

  console.log(
    reduceOnly
      ? "CLOSE ORDER"
      : "OPEN ORDER"
  );

  console.log(
    "======================================"
  );

  console.log(
    "Side:",
    side
  );

  console.log(
    "Base Amount:",
    baseAmount
  );

  console.log(
    "ETH:",
    baseAmount / BASE_SCALE
  );

  console.log(
    "Execution Price:",
    price / PRICE_SCALE
  );

  console.log(
    "Reduce Only:",
    reduceOnly
  );

  const [
    tx,
    hash,
    error
  ] =
    await client.createMarketOrder({

      marketIndex,

      clientOrderIndex,

      baseAmount,

      avgExecutionPrice:
        price,

      isAsk,

      reduceOnly
    });

  if (error) {

    console.error(
      "ORDER FAILED:",
      error
    );

    throw new Error(
      String(error)
    );
  }

  console.log(
    "ORDER SUBMITTED"
  );

  console.log(
    "Transaction Hash:",
    hash
  );

  if (hash) {

    try {

      const status =
        await client.waitForTransaction(
          hash,
          30000
        );

      console.log(
        "Transaction Status:",
        status
      );

    } catch (e) {

      console.log(
        "Confirmation check failed:",
        e
      );

    }

  }

  return hash;
}


// ============================================
// CONNECT
// ============================================

const client =
  new SignerClient({

    network:
      resolveNetworkFromEnv(),

    privateKey,

    accountIndex,

    apiKeyIndex

  });


try {

  console.log("");
  console.log(
    "======================================"
  );

  console.log(
    " LIGHTER TESTNET REVERSE AUTO TRADE"
  );

  console.log(
    "======================================"
  );

  console.log(
    "Action:",
    action
  );

  console.log(
    "Symbol:",
    symbol
  );

  console.log(
    "TradingView Unit:",
    tvUnit
  );

  console.log(
    "USDT Notional:",
    usdtAmount
  );

  console.log(
    "TradingView Price:",
    tvPrice
  );

  console.log(
    "Target ETH:",
    targetEth
  );

  console.log(
    "Target Base Amount:",
    targetBaseAmount
  );


  // ==========================================
  // CONNECT
  // ==========================================

  console.log(
    "Connecting to Lighter Testnet..."
  );

  await client.initialize();

  await client.ensureWasmClient();

  console.log(
    "Connected successfully."
  );


  // ==========================================
  // IMPORTANT
  // ==========================================
  //
  // We do NOT blindly close positions.
  //
  // The bot only sends the requested
  // direction here.
  //
  // Position verification must be done
  // with the exact SDK/API version before
  // enabling automatic reversal.
  //
  // ==========================================


  if (action === "BUY") {

    console.log("");
    console.log(
      "BUY SIGNAL"
    );

    console.log(
      "Opening LONG..."
    );

    await submitOrder(
      client,
      "BUY",
      targetBaseAmount,
      false
    );

  }


  if (action === "SELL") {

    console.log("");
    console.log(
      "SELL SIGNAL"
    );

    console.log(
      "Opening SHORT..."
    );

    await submitOrder(
      client,
      "SELL",
      targetBaseAmount,
      false
    );

  }


  console.log("");
  console.log(
    "======================================"
  );

  console.log(
    "TRADE FINISHED"
  );

  console.log(
    "======================================");


} catch (error) {

  console.error("");
  console.error(
    "======================================"
  );

  console.error(
    "AUTO TRADE FAILED"
  );

  console.error(
    "======================================"
  );

  console.error(error);

  process.exitCode = 1;

} finally {

  await client.close();

}
