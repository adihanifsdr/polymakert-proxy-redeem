### Burn all redeemable conditional tokens in return for collateral on Polymarket for Proxy Wallet using Polymarket Relayer Client for gasless redemption.

## Usage

### Option 1: Run as HTTP Server (Recommended for Go Backend Integration)

Start the server to expose an HTTP endpoint that the Go backend can call:

```bash
# Install dependencies (first time only)
npm install

# Start the server
npm run server
# or
npm start
```

The server will start on port 3000 (or the port specified in `PORT` environment variable).

#### API Endpoints

- `GET /health` - Health check (no authentication required)
- `POST /redeem` - Redeem positions (requires API key authentication)

#### Authentication

The `/redeem` endpoint requires API key authentication. Include the API key in one of these ways:

1. Header: `X-API-Key: your-api-key`
2. Header: `Authorization: Bearer your-api-key`

#### Request Format

```json
{
  "userAddress": "0x..."
}
```

#### Response Format

Success:
```json
{
  "success": true,
  "message": "Successfully redeemed 2 position(s)",
  "txHash": "0x...",
  "transactions": [...]
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```

#### Environment Variables

Create a `.env` file with the following variables:

- `PORT` - Server port (default: 3000)
- `API_KEY` - API key for authenticating requests
- `RELAYER_URL` - Polymarket relayer URL
- `CHAIN_ID` - Polygon chain ID (137 for mainnet)
- `RPC_URL` - Polygon RPC endpoint
- `PROXY_WALLET` - Your Polymarket proxy wallet address
- `PK` - Private key for the wallet
- `BUILDER_API_KEY` - Polymarket Builder API key
- `BUILDER_SECRET` - Polymarket Builder API secret
- `BUILDER_PASS_PHRASE` - Polymarket Builder API passphrase
- `USDC_ADDRESS` - USDC token address on Polygon
- `CTF_ADDRESS` - Conditional Token Framework address

### Option 2: Run as Standalone Script

Run the redeem script directly (uses `PROXY_WALLET` from environment):

```bash
npm run redeem
```

## Go Backend Integration

To use this service from the Go backend, set these environment variables in your Go backend `.env`:

```bash
# Base URL (without endpoint path - the code will append /redeem automatically)
REDEEM_PROXY_URL=http://localhost:3000
REDEEM_PROXY_API_KEY=your-api-key-here
```

**Important:** `REDEEM_PROXY_URL` should be the **base URL only** (e.g., `http://localhost:3000`), not the full endpoint path. The Go client will automatically append `/redeem` or `/health` as needed.

The Go backend will automatically use the proxy service if `REDEEM_PROXY_URL` is configured, otherwise it will fall back to direct CLOB client usage.