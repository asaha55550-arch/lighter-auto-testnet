import {
  SignerClient,
  resolveNetworkFromEnv
} from "lighter-ts-sdk";

// =====================================
// ENV
// =====================================

const privateKey =
  process.env.API_PRIVATE_KEY;

const accountIndex =
  Number(process.env.ACCOUNT_INDEX);

const apiKeyIndex =
  Number(process.env.API_KEY_INDEX);

const action =
  String(
    process.env.TV_ACTION || ""
  ).toUpperCase();

const symbol =
  String(
    process.env.TV_SYMBOL || ""
  ).toUpperCase();

const usdtAmount =
  Number(
    process.env.TV_USDT_AMOUNT || 0
  );

const tvPrice =
  Number(
    process.env.TV_PRICE || 0
  );

const reduceOnly =
  String(
    process.env.TV_REDUCE_ONLY ||
    "false"
  ).toLowerCase() === "true";

// =====================================
// CONFIG
// =====================================

const MARKET_MAP = {

  ETHUSDT: 0,
  ETHUSD: 0,
  ETH: 0

};

// SAFETY LIMIT

const MIN_USDT = 1;

const MAX_USDT = 100;

// ETH base scale

const BASE_SCALE = 1_000_000;

// Lighter price scale

const PRICE_SCALE = 100;

// Maximum slippage

const MAX_SLIPPAGE = 0.005;

// =====================================
// VALIDATION
// =====================================

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

if (
  !["BUY", "SELL"].includes(action)
) {

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
  !Number.isFinite(usdtAmount) ||
  usdtAmount < MIN_USDT
) {

  throw new Error(
    `USDT amount ${usdtAmount} is below minimum ${MIN_USDT}`
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

// =====================================
// MARKET
// =====================================

const marketIndex =
  MARKET_MAP[symbol];

// =====================================
// USDT → ETH
// =====================================

const ethQuantity =
  usdtAmount / tvPrice;

const baseAmount =
  Math.round(
    ethQuantity * BASE_SCALE
  );

if (baseAmount <= 0) {

  throw new Error(
    "Calculated base amount is zero"
  );

}

// =====================================
// EXECUTION PRICE
// =====================================

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

const isAsk =
  action === "SELL";

// =====================================
// ORDER ID
// =====================================

const clientOrderIndex =
  Date.now() +
  Math.floor(
    Math.random() * 1000
  );

// =====================================
// LOG
// =====================================

console.log(
  "======================================"
);

console.log(
  "       LIGHTER TESTNET AUTO TRADE"
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
  "USDT Amount:",
  usdtAmount
);

console.log(
  "TradingView Price:",
  tvPrice
);

console.log(
  "Calculated ETH:",
  ethQuantity
);

console.log(
  "Base Amount:",
  baseAmount
);

console.log(
  "Execution Price:",
  executionPrice
);

console.log(
  "Execution Price USD:",
  executionPrice /
  PRICE_SCALE
);

console.log(
  "Side:",
  isAsk ? "SELL" : "BUY"
);

console.log(
  "Reduce Only:",
  reduceOnly
);

console.log(
  "======================================"
);

// =====================================
// CONNECT
// =====================================

const client =
  new SignerClient({

    network:
      resolveNetworkFromEnv(),

    privateKey,

    accountIndex,

    apiKeyIndex

  });

try {

  console.log(
    "Connecting to Lighter Testnet..."
  );

  await client.initialize();

  await client.ensureWasmClient();

  console.log(
    "Connected successfully."
  );

  // ===================================
  // ORDER
  // ===================================

  console.log(
    "Submitting order..."
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
        executionPrice,

      isAsk,

      reduceOnly

    });

  // ===================================
  // ERROR
  // ===================================

  if (error) {

    console.error(
      "======================================"
    );

    console.error(
      "          ORDER FAILED"
    );

    console.error(
      "======================================"
    );

    console.error(error);

    throw new Error(
      String(error)
    );

  }

  // ===================================
  // SUCCESS
  // ===================================

  console.log(
    "======================================"
  );

  console.log(
    "   ORDER SUBMITTED SUCCESSFULLY"
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
    "USDT:",
    usdtAmount
  );

  console.log(
    "ETH:",
    ethQuantity
  );

  console.log(
    "Base Amount:",
    baseAmount
  );

  console.log(
    "Reduce Only:",
    reduceOnly
  );

  console.log(
    "Transaction Hash:",
    hash
  );

  // ===================================
  // CONFIRM
  // ===================================

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
        "Order submitted, confirmation check failed:",
        e
      );

    }

  }

} finally {

  await client.close();

}
