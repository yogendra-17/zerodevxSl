// import { deleteStorage, isStorageExist } from './storage';
import { SignMetadata, StorageData } from "../types";
import * as PairingAction from "./actions/pairing";
import { getSilentShareStorage, saveSilentShareStorage } from "./storage";
import { fromHexStringToBytes } from "./utils";
import * as KeyGenAction from "./actions/keygen";
import { IP1KeyShare, randBytes } from "@silencelaboratories/ecdsa-tss";
import { SdkError, ErrorCode } from "../error";
import * as SignAction from "./actions/sign";
import { v4 as uuid } from "uuid";
import qrcode from "qrcode-terminal";
import { backup } from "./actions/backup";

async function initPairing() {
  const qrCode = await PairingAction.init();
  qrcode.generate(
    qrCode,
    {
      small: true,
    },
    function (qr_code: any) {
      console.log(qr_code);
    }
  );
  return qrCode;
}

async function runPairing() {
  const result = await PairingAction.getToken();
  await saveSilentShareStorage(result.silentShareStorage);
  return {
    pairing_status: "paired",
    device_name: result.deviceName,
    elapsed_time: result.elapsedTime,
    usedBackupData: "string",
    tempDistributedKey:result.silentShareStorage.tempDistributedKey
  };
}

async function runKeygen() {
  const silentShareStorage: StorageData = await getSilentShareStorage();
  let pairingData = silentShareStorage.pairingData;
  // Refresh token if it is expired
  if (pairingData.tokenExpiration < Date.now() - 60000) {
    pairingData = await refreshPairing();
  }
  const wallets = silentShareStorage.wallets;
  const accountId = Object.keys(wallets).length + 1;
  const x1 = await randBytes(32);
  const result = await KeyGenAction.keygen(pairingData, accountId, x1);
  saveSilentShareStorage({
    ...silentShareStorage,
    accountId: uuid(),
    tempDistributedKey: {
      publicKey: result.publicKey,
      accountId,
      keyShareData: result.keyShareData,
    },
  });
  return {
    distributedKey: {
      publicKey: result.publicKey,
      accountId: accountId,
      keyShareData: result.keyShareData,
    },
    elapsedTime: result.elapsedTime,
  };
}

async function runBackup() {
  const silentShareStorage: StorageData = await getSilentShareStorage();
  const encryptedMessage = "PlaceholderEncryption"   //This must be replaced with some password/ encryption key functionality
  await backup(silentShareStorage.pairingData,encryptedMessage);
}
async function refreshPairing() {
  const silentShareStorage: StorageData = await getSilentShareStorage();
  const pairingData = silentShareStorage.pairingData;
  const result = await PairingAction.refreshToken(pairingData);
  await saveSilentShareStorage({
    ...silentShareStorage,
    pairingData: result.newPairingData,
  });
  return result.newPairingData;
}

async function runSign(
  hashAlg: string,
  message: string,
  messageHashHex: string,
  signMetadata: SignMetadata,
  accountId: number,
  keyShare: IP1KeyShare
) {
  if (messageHashHex.startsWith("0x")) {
    messageHashHex = messageHashHex.slice(2);
  }
  if (message.startsWith("0x")) {
    message = message.slice(2);
  }
  const silentShareStorage = await getSilentShareStorage();
  let pairingData = silentShareStorage.pairingData;
  if (pairingData.tokenExpiration < Date.now() - 60000) {
    pairingData = await refreshPairing();
  }
  const messageHash = fromHexStringToBytes(messageHashHex);
  if (messageHash.length !== 32) {
    throw new SdkError(
      "Invalid length of messageHash, should be 32 bytes",
      ErrorCode.InvalidMessageHashLength
    );
  }

  return await SignAction.sign(
    pairingData,
    keyShare,
    hashAlg,
    message,
    messageHash,
    signMetadata,
    accountId
  );
}

export {
  initPairing,
  runPairing,
  runKeygen,
  runSign,
  runBackup,
  refreshPairing,
};
