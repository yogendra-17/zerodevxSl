import { TransactionSerializable, createWalletClient, http, toHex } from 'viem';
import { IP1KeyShare } from "@silencelaboratories/ecdsa-tss";
import * as utils from './srcMpc/lib/utils';
import * as sdk from "./srcMpc/lib/sdk";
import { hash } from '@viem/keccak';
import { serialize, joinSignature, splitSignature } from '@viem/bytes';
import { computeAddress } from '@viem/addresses';
import { hashMessage } from 'viem';
import { concat, toUtf8Bytes } from '@viem/utils';
import { SignTransactionParameters, signMessage, signTransaction } from 'viem/accounts';

export class SilentWallet {
  public address: string;
  public public_key: string;

  private p1KeyShare: IP1KeyShare;
  readonly walletClient: ReturnType<typeof createWalletClient>;
  keygenResult: any;

  constructor(
    address: string,
    public_key: string,
    p1KeyShare: any,
    keygenResult: any,
    walletClient: ReturnType<typeof createWalletClient>
  ) {
    this.address = address;
    this.public_key = public_key;
    this.p1KeyShare = p1KeyShare;
    this.walletClient = walletClient;
    this.keygenResult = keygenResult;
  }

  public static async generate(): Promise<SilentWallet> {
    await sdk.runPairing();
    const keygenResult = await sdk.runKeygen();
    await sdk.runBackup();
    const p1KeyShare: IP1KeyShare = keygenResult.distributedKey.keyShareData;
    if (!p1KeyShare) {
      throw new Error("Failed to generate p1KeyShare");
    }

    const publicKey = p1KeyShare.public_key;
    const address = computeAddress(`0x04${publicKey}`);
    const walletClient = createWalletClient({
      transport: http(),
      signer: {
        signMessage: async (message) => {
         signMessage(message);
        },
        signTransaction: async (transaction: SignTransactionParameters<TransactionSerializable>) => {
          // Implement signTransaction logic here
          signTransaction(transaction);
        },
      },
    });
    return new SilentWallet(address, publicKey, p1KeyShare, keygenResult, walletClient);
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  public static async generateQR(){
    return await sdk.initPairing()
  }

  async signMessage(message: string): Promise<string> {
    const messagePrefix = "\x19Ethereum Signed Message:\n";
    const messageSome = concat([
      toUtf8Bytes(messagePrefix),
      toUtf8Bytes(String(message.length)),
      toUtf8Bytes(message)
    ]);
    const messageDigest = hashMessage(messageSome);
    const hexMessage = toHex(messageSome);

    const signSdk = await sdk.runSign(
      "keccak256",
      hexMessage,
      messageDigest,
      "eth_sign",
      this.keygenResult.distributedKey.accountId,
      this.keygenResult.distributedKey.keyShareData
    );

    const signBytes = Buffer.from(signSdk.signature, "hex");
    const r = signBytes.subarray(0, 32);
    const s = signBytes.subarray(32, 64);
    const recid = signSdk.recId;

    const split = splitSignature({
      recoveryParam: recid,
      r: `0x${r.toString("hex")}`,
      s: `0x${s.toString("hex")}`,
    });

    const signedMsg = joinSignature(split);

    return signedMsg;
  }

  async signTransaction(transaction: any): Promise<string> {
    const serializedTx = serialize(transaction);
    const digest = hash(serializedTx);
    const signature = await this.signDigest(digest);
    return joinSignature(signature);
  }

  public async signDigest(digest: string): Promise<{ r: string, s: string, recid: number }> {
    const messageDigest = digest;
    const sign = await sdk.runSign(
      "keccak256",
      " ",
      messageDigest,
      "eth_sign",
      this.keygenResult.distributedKey.accountId,
      this.keygenResult.distributedKey.keyShareData
    );

    const signBytes = Buffer.from(sign.signature, "hex");
    const r = signBytes.subarray(0, 32);
    const s = signBytes.subarray(32, 64);
    const recid = sign.recId;

    return {
      r: `0x${r.toString("hex")}`,
      s: `0x${s.toString("hex")}`,
      recid,
    };
  }

  connect(): SilentWallet {
    return this;
  }

  async _signTypedData(
    domain: any,
    types: Record<string, Array<any>>,
    value: Record<string, any>
  ): Promise<string> {
    const digest = hash(domain, types, value);
    const signature = await this.signDigest(digest);
    return joinSignature(signature);
  }
}