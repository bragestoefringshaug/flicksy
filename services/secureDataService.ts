import { bytesToHex, constantTimeEqual, decryptWithAesGcm, encryptWithAesGcm, generateRandomBytes, hashPasswordScrypt } from './crypto';
import { findUserByUsernameHash, getApiKey, getDatabase, insertUser, upsertApiKey } from './db';
import { getOrCreateMasterKey } from './secureStore';

export async function ensureMasterKey(): Promise<string> {
  const keyHex = await getOrCreateMasterKey(async () => {
    const key = await generateRandomBytes(32);
    return bytesToHex(key);
  });
  return keyHex;
}

export async function registerUser(username: string, password: string): Promise<{ userId: number } | { error: string }> {
  try {
    getDatabase();
    const usernameHash = await hashUsername(username);
    const existing = await findUserByUsernameHash(usernameHash);
    if (existing) {
      return { error: 'User already exists' };
    }
    const { hashHex, saltHex } = await hashPasswordScrypt(password);
    const userId = await insertUser(usernameHash, hashHex, saltHex);
    return { userId };
  } catch (e: any) {
    return { error: e?.message ?? 'Unknown error' };
  }
}

export async function authenticateUser(username: string, password: string): Promise<boolean> {
  getDatabase();
  const usernameHash = await hashUsername(username);
  const user = await findUserByUsernameHash(usernameHash);
  if (!user) return false;
  const recomputed = await hashPasswordScrypt(password, user.password_salt);
  return constantTimeEqual(recomputed.hashHex, user.password_hash);
}

export async function storeEncryptedApiKey(serviceName: string, apiKeyPlaintext: string): Promise<void> {
  await ensureMasterKey();
  const masterKeyHex = await ensureMasterKey();
  const { ciphertextBase64, ivHex } = await encryptWithAesGcm(apiKeyPlaintext, masterKeyHex);
  await upsertApiKey(serviceName, ciphertextBase64, ivHex);
}

export async function retrieveDecryptedApiKey(serviceName: string): Promise<string | null> {
  const record = await getApiKey(serviceName);
  if (!record) return null;
  const masterKeyHex = await ensureMasterKey();
  return decryptWithAesGcm(record.key_ciphertext, masterKeyHex, record.iv);
}

async function hashUsername(username: string): Promise<string> {
  const normalized = username.trim().toLowerCase();
  const digest = await cryptoDigestHex(normalized);
  return digest;
}

async function cryptoDigestHex(value: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', msgUint8);
  return bytesToHex(new Uint8Array(digest));
}


