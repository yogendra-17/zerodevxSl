import {
	IP1KeyShare,
	P1Signature,
	randBytes,
} from '@silencelaboratories/ecdsa-tss';
import * as utils from '../utils';
import { sendMessage } from '../../firebaseEndpoints';
import { PairingData, SignConversation, SignMetadata } from '../../types';
import _sodium, { base64_variants } from 'libsodium-wrappers';
import { SdkError, ErrorCode } from '../../error';

let running: boolean = false;

type SignResult = {
	signature: string;
	recId: number;
	elapsedTime: number;
};

export const sign = async (
	pairingData: PairingData,
	keyShare: IP1KeyShare,
	hashAlg: string,
	message: string,
	messageHash: Uint8Array,
	signMetadata: SignMetadata,
	accountId: number,
): Promise<SignResult> => {
	try {
		if (running) {
			throw new SdkError(
				`Sign already running`,
				ErrorCode.ResourceBusy,
			);
		}
		running = true;
		let startTime = Date.now();
		const sessionId = _sodium.to_hex(await randBytes(32)); //utils.random_session_id();

		let p1KeyShareObj = keyShare;
		let round = 1;
		const p1 = new P1Signature(sessionId, messageHash, p1KeyShareObj);

		let signConversation: SignConversation = {
			signMetadata,
			accountId,
			createdAt: Date.now(),
			expiry: 30000,
			message: {
				party: 1,
				round: round,
			},
			sessionId,
			hashAlg: hashAlg,
			publicKey: keyShare.public_key,
			signMessage: message,
			messageHash: utils.toHexString(messageHash),
			isApproved: null,
		};

		let sign = null;
		let recId = null;
		let expectResponse = true;
		await _sodium.ready;
		while (sign === null || recId === null) {
			let decryptedMessage: string | null = null;
			if (
				signConversation.message.message &&
				signConversation.message.nonce
			) {
				decryptedMessage = utils.uint8ArrayToUtf8String(
					_sodium.crypto_box_open_easy(
						utils.b64ToUint8Array(signConversation.message.message),
						_sodium.from_hex(signConversation.message.nonce),
						_sodium.from_hex(pairingData.appPublicKey!),
						_sodium.from_hex(pairingData.webEncPrivateKey!),
					),
				);
			}
			const decodedMessage = decryptedMessage
				? utils.b64ToString(decryptedMessage)
				: null;

			const msg = await p1
				.processMessage(decodedMessage)
				.catch((error) => {
					throw new SdkError(
						`Internal library error: ${error}`,
						ErrorCode.InternalLibError,
					);
				});
			if (msg.signature && msg.recid !== undefined) {
				sign = msg.signature;
				recId = msg.recid;
				expectResponse = false;
			}
			const nonce = _sodium.randombytes_buf(
				_sodium.crypto_box_NONCEBYTES,
			);
			const encMessage = utils.Uint8ArrayTob64(
				_sodium.crypto_box_easy(
					_sodium.to_base64(
						msg.msg_to_send,
						base64_variants.ORIGINAL,
					),
					nonce,
					_sodium.from_hex(pairingData.appPublicKey),
					_sodium.from_hex(pairingData.webEncPrivateKey),
				),
			);
			signConversation = {
				...signConversation,
				message: {
					party: 1,
					round,
					message: encMessage,
					nonce: _sodium.to_hex(nonce),
				},
			};
			const signConversationNew = await sendMessage<SignConversation>(
				pairingData.token,
				'sign',
				signConversation,
				expectResponse,
			);
			if (expectResponse && signConversationNew) {
				signConversation = signConversationNew;
			}
			if (signConversation.isApproved === false) {
				throw new SdkError(
					`User(phone) rejected sign request`,
					ErrorCode.UserPhoneDenied,
				);
			}
			round++;
		}

		running = false;
		return {
			signature: sign,
			recId,
			elapsedTime: Date.now() - startTime,
		};
	} catch (error) {
		if (error instanceof SdkError) {
			throw error;
		} else if (error instanceof Error) {
			throw new SdkError(error.message, ErrorCode.KeygenFailed);
		} else throw new SdkError('unknown-error', ErrorCode.SignFailed);
	}
};

