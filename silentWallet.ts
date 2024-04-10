import { ethers } from "ethers";
import * as sdk from "./srcMpc/lib/sdk";
import {
  SignMessageReturnType,
  createWalletClient,
  http,
  Hex,
  keccak256,
  TypedData,
  ToHexErrorType,
  SignMessageErrorType,
  SignTransactionErrorType,
  stringToBytes,
} from "viem";
import {
  publicKeyToAddress,
  signTransaction,
  signTypedData,
  toAccount,
  type SignTypedDataErrorType,
  ToAccountErrorType,
  PublicKeyToAddressErrorType,
} from "viem/accounts";
import { hashMessage, hexlify } from "ethers/lib/utils";
import { mainnet } from "viem/chains";
import {
  hexZeroPad,
  joinSignature,
  splitSignature,
  toUtf8Bytes,
  concat,
} from "ethers/lib/utils";
import { Config } from "prettier";
import fs, { promises } from "fs";
import prettier from "prettier";
import path, { resolve } from "path";
import { TypedDataDefinition } from "viem"; // Import the missing TypedDataDefinition type from the correct module
import { ErrorType } from "permissionless/errors/utils";
import { Account } from "@ethereumjs/util";
import { SignMetadata } from "./srcMpc/types";
import { presignMessagePrefix } from "viem";
import { add } from "libsodium-wrappers";

export type PrivateKeyToAccountErrorType =
  | ToAccountErrorType
  | ToHexErrorType
  | PublicKeyToAddressErrorType
  | SignMessageErrorType
  | SignTransactionErrorType
  | SignTypedDataErrorType
  | ErrorType;

export async function generateSilentWallet() {
  await sdk.initPairing();
  await sdk.runPairing();
  const keygen = await sdk.runKeygen();

  const CONFIG_PATH = path.resolve(__dirname, "./config.json");

  fs.writeFile(
    CONFIG_PATH,
    await prettier.format(JSON.stringify({ keygen }, null, 2), {
      parser: "json",
    }),
    (err) => {
      if (err) {
        console.error(err);
      }
    }
  );

  const publicKey = keygen.distributedKey.publicKey as Hex;
  console.log("PublicKey", publicKey);
  // const address = publicKeyToAddress(("0x" + publicKey) as Hex);
  const address = ethers.utils.computeAddress(`0x04${publicKey}`) as Hex;
  console.log("Address", address);
  return { publicKey, address };
}

export async function signMessageWithSilentWallet(
  message: any
): Promise<SignMessageReturnType> {
  // param: message: string -- 0x prefixed hex string, of type string
  const messagePrefix = "\x19Ethereum Signed Message:\n";
  message = message.raw;
  console.log("messageCheck", message);
  const messageBytes = stringToBytes(message);
  console.log("messageBytes", messageBytes);
  const messageDigest = hashMessage(messageBytes);
  const messageSome = concat([
    toUtf8Bytes(messagePrefix),
    toUtf8Bytes(String(messageBytes.length)),
    messageBytes,
  ]);
  console.log("messageDigest", messageDigest);

  const hexMessage = hexlify(messageSome);
  const CONFIG_PATH = path.resolve(__dirname, "./config.json");
  const data = await promises.readFile(CONFIG_PATH, "utf8");
  const keygen2 = JSON.parse(data);
  const d = {
    hashAlg: "keccak256",
    message: hexMessage,
    messageHashHex: messageDigest,
    signMetadata: "eth_sign",
    accountId: keygen2.keygen.distributedKey.accountId,
    keyShare: keygen2.keygen.distributedKey.keyShareData,
  };

  console.log("sending to runSign: d = ", d);
  const signature = await sdk.runSign(
    d.hashAlg,
    d.message,
    d.messageHashHex,
    "eth_sign",
    d.accountId,
    d.keyShare
  );
  const signBytes = Buffer.from(signature.signature, "hex");
  const r = signBytes.subarray(0, 32);
  const s = signBytes.subarray(32, 64);
  const recid = signature.recId;

  const split = splitSignature({
    recoveryParam: recid,
    r: hexZeroPad(`0x${r.toString("hex")}`, 32),
    s: hexZeroPad(`0x${s.toString("hex")}`, 32),
  });

  const signedMsg = joinSignature(split) as Hex;
  console.log("signedMsg", signedMsg);
  return signedMsg;
}

export async function silentWalletToAccount() {
  const { publicKey, address } = await generateSilentWallet();
  await sdk.runBackup();
  await new Promise<void>((resolve) =>
    setTimeout(() => {
      console.log("first timeout");
      resolve();
    }, 5000)
  );
  console.log("silentWalletToAccount function");
  const privateKey =
    "0x92ff03f3b5675403fdf9272c96315360c38d84c1e0ce76a8d3fdf4d2549f4d24";

  // create account
  const account: any = toAccount({
    address,
    async signMessage({ message }) {
      const messageString = message as string;
      return signMessageWithSilentWallet(messageString);
    },
    async signTransaction(transaction, { serializer } = {}) {
      console.log("transaction", transaction);
      return signTransaction({ privateKey, transaction, serializer });
      
    },
    async signTypedData<
      const TTypedData extends TypedData | Record<string, unknown>,
      TPrimaryType extends keyof TTypedData | "EIP712Domain" = keyof TTypedData,
    >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
      return signTypedData<TTypedData, TPrimaryType>(account);
    },
  });

  return {
    ...account,
    publicKey,
    source: "privateKey",
  };
}
