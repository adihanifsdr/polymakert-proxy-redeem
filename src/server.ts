import express, { Request, Response, NextFunction } from "express";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { redeemPositions } from "./redeem";

dotenvConfig({ path: resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "";

// Middleware
app.use(express.json());

// API Key authentication middleware
function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  // Express normalizes headers to lowercase, so check both lowercase and original case
  // Headers can be string or string[], so we need to handle both
  const getHeaderValue = (headerName: string): string | undefined => {
    const value = req.headers[headerName];
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }
    return undefined;
  };

  const xApiKey = getHeaderValue("x-api-key") || getHeaderValue("X-API-Key");
  const authHeader = getHeaderValue("authorization") || getHeaderValue("Authorization");
  const bearerKey = authHeader?.replace("Bearer ", "");
  const apiKey = xApiKey || bearerKey;

  if (!API_KEY) {
    console.error("[Auth] API_KEY not configured on server");
    return res.status(500).json({ error: "API_KEY not configured on server" });
  }

  if (!apiKey) {
    console.error("[Auth] No API key provided in request headers");
    console.error("[Auth] Available headers:", Object.keys(req.headers));
    return res.status(401).json({ error: "Unauthorized: API key required" });
  }

  if (apiKey !== API_KEY) {
    console.error("[Auth] Invalid API key provided");
    console.error("[Auth] Expected:", API_KEY ? `${API_KEY.substring(0, 8)}...` : "not set");
    console.error("[Auth] Received:", apiKey ? `${apiKey.substring(0, 8)}...` : "not set");
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }

  console.log("[Auth] API key authenticated successfully");
  next();
}

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Redeem endpoint (requires API key)
app.post("/redeem", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: "userAddress is required" });
    }

    console.log(`[Redeem] Received redeem request for user: ${userAddress}`);

    // Call the redeem function
    const result = await redeemPositions(userAddress);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        transactions: result.transactions,
        txHash: result.txHash,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error("[Redeem] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Proxy redeem server listening on port ${PORT}`);
  if (API_KEY) {
    console.log(`[Server] API key authentication enabled (key: ${API_KEY.substring(0, 8)}...)`);
  } else {
    console.error(`[Server] WARNING: API_KEY not configured - authentication will fail!`);
  }
});

