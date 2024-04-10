import "dotenv/config";
import { createEcdsaKernelAccountClient } from "@zerodev/presets/zerodev";
import { Hex, zeroAddress } from "viem";
import { silentWalletToAccount } from "../silentWallet"

// Import your silentSigner implementation
import { Presets } from "userop";
// @ts-ignore
import config from "../../config.json";
import { polygonMumbai } from "viem/chains";

const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID;
if (!zeroDevProjectId) {
  throw new Error("ZERODEV_PROJECT_ID is not set");
}

// Define your silentSigner initialization function

const main = async () => {
  const silentSigner = await silentWalletToAccount();

  const kernelClient = await createEcdsaKernelAccountClient({
    // required
    chain: polygonMumbai,
    projectId: zeroDevProjectId,
    signer: silentSigner, 

    // optional
    provider: "STACKUP", // defaults to a recommended provider
    index: BigInt(1), // defaults to 0
    paymaster: 'SPONSOR', // defaults to SPONSOR
  });

  console.log("My account:", kernelClient.account.address);

  const txnHash = await kernelClient.sendTransaction({
    to: zeroAddress,
    value: BigInt(1000000000000000),
    data: "0x023230223023023023020",
  });

  console.log("txn hash:", txnHash);

  const userOpHash = await kernelClient.sendUserOperation({
    userOperation: {
      callData: await kernelClient.account.encodeCallData({
        to: zeroAddress,
        value: BigInt(0),
        data: "0x",
      }),
    },
  });

  console.log("userOp hash:", userOpHash);
};

main();
