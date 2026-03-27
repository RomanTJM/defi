import { mnemonicNew, mnemonicValidate, mnemonicToWalletKey } from '@ton/crypto';
import type { KeyPair } from '@ton/crypto';

export async function generateWalletMnemonic(): Promise<string[]> {
  return await mnemonicNew(24);
}

export async function isValidMnemonic(mnemonic: string[]): Promise<boolean> {
  return await mnemonicValidate(mnemonic);
}

export async function getWalletKeyPair(mnemonic: string[]): Promise<KeyPair> {
  return await mnemonicToWalletKey(mnemonic);
}

export function encryptMnemonic(mnemonic: string[], password: string): string {
  const phrase = mnemonic.join(' ');

  let encrypted = '';
  for (let i = 0; i < phrase.length; i++) {
    encrypted += String.fromCharCode(phrase.charCodeAt(i) ^ password.charCodeAt(i % password.length));
  }
  return btoa(encrypted);
}

export function decryptMnemonic(encryptedPhraseHex: string, password: string): string[] | null {
  try {
    const encrypted = atob(encryptedPhraseHex);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ password.charCodeAt(i % password.length));
    }
    return decrypted.split(' ');
  } catch {
    return null;
  }
}
