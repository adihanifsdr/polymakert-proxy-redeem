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
  const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");

  if (!API_KEY) {
    return res.status(500).json({ error: "API_KEY not configured on server" });
  }

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }

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
  console.log(`[Server] API key authentication enabled`);
});

