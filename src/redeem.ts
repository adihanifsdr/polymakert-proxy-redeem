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

async function main() {
  const relayerUrl = `${process.env.RELAYER_URL}`;
  const chainId = parseInt(`${process.env.CHAIN_ID}`);
  const userAddress = `${process.env.PROXY_WALLET}`;

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
    return;
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
}

main();
