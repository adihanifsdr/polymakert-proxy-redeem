import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import {
  RelayClient,
  Transaction,
  RelayerTxType,
} from "@polymarket/builder-relayer-client";
import { createWalletClient, Hex, http, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import {
  BuilderApiKeyCreds,
  BuilderConfig,
} from "@polymarket/builder-signing-sdk";
import { Interface } from "ethers";

dotenvConfig({ path: resolve(__dirname, "../.env") });

interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  redeemable: boolean;
  outcomeIndex: number;
}

async function getRedeemablePositions(
  userAddress: string
): Promise<Position[]> {
  try {
    const response = await fetch(
      `https://data-api.polymarket.com/positions?user=${userAddress}`
    );
    const positions = await response.json();
    return positions.filter((pos: Position) => pos.redeemable);
  } catch (error) {
    return [];
  }
}

export interface RedeemResult {
  success: boolean;
  message?: string;
  error?: string;
  transactions?: Transaction[];
  txHash?: string;
}

export async function redeemPositions(
  userAddress: string
): Promise<RedeemResult> {
  try {
    const relayerUrl = `${process.env.RELAYER_URL}`;
    const chainId = parseInt(`${process.env.CHAIN_ID}`);

    if (!relayerUrl || !chainId) {
      return {
        success: false,
        error: "RELAYER_URL or CHAIN_ID not configured",
      };
    }

    const pk = privateKeyToAccount(`${process.env.PK}` as Hex);
    const wallet = createWalletClient({
      account: pk,
      chain: polygon,
      transport: http(`${process.env.RPC_URL}`),
    });

    const builderCreds: BuilderApiKeyCreds = {
      key: `${process.env.BUILDER_API_KEY}`,
      secret: `${process.env.BUILDER_SECRET}`,
      passphrase: `${process.env.BUILDER_PASS_PHRASE}`,
    };
    const builderConfig = new BuilderConfig({
      localBuilderCreds: builderCreds,
    });
    const client = new RelayClient(
      relayerUrl,
      chainId,
      wallet,
      builderConfig,
      RelayerTxType.PROXY
    );

    const usdc = `${process.env.USDC_ADDRESS}`;
    const ctf = `${process.env.CTF_ADDRESS}`;

    const ctfInterface = new Interface([
      "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets)",
    ]);

    const redeemablePositions = await getRedeemablePositions(userAddress);

    if (redeemablePositions.length === 0) {
      return {
        success: true,
        message: "No redeemable positions found",
        transactions: [],
      };
    }

    const transactions: Transaction[] = redeemablePositions.map((position) => ({
      to: ctf,
      data: ctfInterface.encodeFunctionData("redeemPositions", [
        usdc,
        zeroHash,
        position.conditionId,
        [1, 2],
      ]),
      value: "0",
    }));

    const response = await client.execute(transactions, "Redeem positions");
    const result = await response.wait();

    return {
      success: true,
      message: `Successfully redeemed ${redeemablePositions.length} position(s)`,
      transactions: transactions,
      txHash: result?.transactionHash || "",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    };
  }
}

async function main() {
  const userAddress = `${process.env.PROXY_WALLET}`;
  if (!userAddress) {
    console.error("PROXY_WALLET not configured");
    process.exit(1);
  }

  const result = await redeemPositions(userAddress);
  if (result.success) {
    console.log("✅", result.message);
    if (result.txHash) {
      console.log("Transaction hash:", result.txHash);
    }
  } else {
    console.error("❌", result.error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main();
}
