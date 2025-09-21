import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { scrypt } from 'scrypt-js';

export async function generateRandomBytes(byteLength: number): Promise<Uint8Array> {
  const random = await Crypto.getRandomBytesAsync(byteLength);
  return Uint8Array.from(random);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return arr;
}

export async function deriveKeyScrypt(password: string, salt: Uint8Array, keyLength = 32): Promise<Uint8Array> {
  const N = 2 ** 14;
  const r = 8;
  const p = 1;
  const key = new Uint8Array(keyLength);
  const passwordBytes = new TextEncoder().encode(password);
  await scrypt(passwordBytes, salt, N, r, p, key);
  return key;
}

export async function hashPasswordScrypt(password: string, saltHex?: string): Promise<{ hashHex: string; saltHex: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : await generateRandomBytes(16);
  const key = await deriveKeyScrypt(password, salt, 32);
  const hashHex = bytesToHex(key);
  return { hashHex, saltHex: bytesToHex(salt) };
}

export function constantTimeEqual(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  let diff = 0;
  for (let i = 0; i < aHex.length; i++) {
    diff |= aHex.charCodeAt(i) ^ bHex.charCodeAt(i);
  }
  return diff === 0;
}

export async function encryptWithAesGcm(plaintext: string, keyHex: string): Promise<{ ciphertextBase64: string; ivHex: string }> {
  const iv = await generateRandomBytes(12);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: CryptoJS.enc.Hex.parse(bytesToHex(iv)),
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.NoPadding,
  } as any);
  return { ciphertextBase64: encrypted.toString(), ivHex: bytesToHex(iv) };
}

export function decryptWithAesGcm(ciphertextBase64: string, keyHex: string, ivHex: string): string {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, key, {
    iv: CryptoJS.enc.Hex.parse(ivHex),
    mode: CryptoJS.mode.GCM,
    padding: CryptoJS.pad.NoPadding,
  } as any);
  return CryptoJS.enc.Utf8.stringify(decrypted);
}


