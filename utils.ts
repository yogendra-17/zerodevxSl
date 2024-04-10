// Utilities for examples

import { createEcdsaKernelAccountClient } from "@zerodev/presets/zerodev"
import { Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { silentWalletToAccount } from "./silentWallet"
const zeroDevProjectId = process.env.ZERODEV_PROJECT_ID
const privateKey = process.env.PRIVATE_KEY
if (!zeroDevProjectId || !privateKey) {
  throw new Error("ZERODEV_PROJECT_ID or PRIVATE_KEY is not set")
}


export const getKernelClient = async () => {
  const signer = await silentWalletToAccount();
  return await createEcdsaKernelAccountClient({
    // required
    chain: polygonMumbai,
    projectId: zeroDevProjectId,
    signer,
  })
}