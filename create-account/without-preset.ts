import "dotenv/config"
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
} from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { UserOperation } from "permissionless"
import { http, Hex, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { polygonMumbai } from "viem/chains"
import { silentWalletToAccount } from "../silentWallet"

if (!process.env.BUNDLER_RPC || !process.env.PAYMASTER_RPC || !process.env.PRIVATE_KEY) {
  throw new Error("BUNDLER_RPC or PAYMASTER_RPC or PRIVATE_KEY is not set")
}

const publicClient = createPublicClient({
  transport: http(process.env.BUNDLER_RPC),
})

// const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)

const main = async () => {
  const signer =  await silentWalletToAccount();

   if(!signer){
   throw new Error("Signer is not set")
   }

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
  }
  )
  const account = await createKernelAccount(publicClient, {
    plugins: {
      validator: ecdsaValidator,
    }
  })
  

  const kernelClient = createKernelAccountClient({
    account,
    chain: polygonMumbai,
    transport: http(process.env.BUNDLER_RPC),
    sponsorUserOperation: async ({ userOperation }: { userOperation: UserOperation }): Promise<UserOperation> => {
      const paymasterClient = createZeroDevPaymasterClient({
        chain: polygonMumbai,
        transport: http(process.env.PAYMASTER_RPC),
      })
      return paymasterClient.sponsorUserOperation({
        userOperation,
      })
    },
  })
  
  console.log("kernelCleint", kernelClient)
  console.log("My account:",account.address)

  // const txnHash = await account.signMessage({
  //   message: { raw: '0x68656c6c6f20776f726c64' }, 
  // })

  // console.log("txn hash:", txnHash)

  const userOpHash = await kernelClient.sendUserOperation({
    userOperation: {
      callData: await account.encodeCallData({
        to: zeroAddress,
        value: BigInt(0),
        data: "0x",
      }),
    },
  })
  console.log("userOpHash",userOpHash)
}


main()
