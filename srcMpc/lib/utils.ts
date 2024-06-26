import { SdkError, ErrorCode } from "../error";
import { JsonTx } from "@ethereumjs/tx";

// Json type from @metamask/utils
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | {
      [prop: string]: Json;
    };

export const fromHexStringToBytes = (hexString: string) => {
  try {
    const matches = hexString.match(/.{1,2}/g);
    if (matches) {
      return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
    } else {
      throw new Error("Invalid hex string");
    }
  } catch (error) {
    throw error instanceof Error
      ? error
      : new SdkError(`unknown-error`, ErrorCode.UnknownError);
  }
};

export const toHexString = (bytes: Uint8Array) => {
  try {
    return bytes.reduce(
      (str, byte) => str + byte.toString(16).padStart(2, "0"),
      ""
    );
  } catch (error) {
    throw error instanceof Error
      ? error
      : new SdkError(`unknown-error`, ErrorCode.UnknownError);
  }
};

export function checkOwnKeys(keys: string[], object: object) {
  return keys.every(function (key) {
    // eslint-disable-next-line no-prototype-builtins
    return object.hasOwnProperty(key);
  });
}

function randomInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function random_string(n: number): string {
  // A n length string taking characters from lower_case, upper_case and digits
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i < n; i++) {
    result += characters[Number(randomInteger(0, characters.length - 1))];
  }
  return result;
}

export function randomPairingId(): string {
  return random_string(19);
}

export function random_session_id(): string {
  return random_string(19);
}

// Will give a pause of 'ms' milliseconds in an async block. Always call with await
export function delay(ms: number) {
  return new Promise((_) => setTimeout(_, ms));
}

export function uint8ArrayToUtf8String(array: Uint8Array): string {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(array);
}

export function Uint8ArrayTob64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function b64ToUint8Array(str: string): Uint8Array {
  return Uint8Array.from(Buffer.from(str, "base64"));
}

export function b64ToString(str: string): string {
  return Buffer.from(str, "base64").toString("utf8");
}

/**
 * Serializes a transaction by removing undefined properties and converting them to null.
 *
 * @param tx - The transaction object.
 * @param type - The type of the transaction.
 * @returns The serialized transaction.
 */
export function serializeTransaction(tx: JsonTx, type: number): Json {
  const serializableSignedTx: Record<string, any> = {
    ...tx,
    type,
  };
  // Make tx serializable
  // toJSON does not remove undefined or convert undefined to null
  Object.entries(serializableSignedTx).forEach(([key]) => {
    if (serializableSignedTx[key] === undefined) {
      delete serializableSignedTx[key];
    }
  });

  return serializableSignedTx;
}

/**
 * Determines whether the given CAIP-2 chain ID represents an EVM-based chain.
 *
 * @param caip2ChainId - The CAIP-2 chain ID to check.
 * @returns Returns true if the chain is EVM-based, otherwise false.
 */
export function isEvmChain(caip2ChainId: string): boolean {
  return caip2ChainId.startsWith("eip155:");
}
