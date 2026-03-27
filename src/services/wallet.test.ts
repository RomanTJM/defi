import { Buffer } from 'buffer';
if (typeof global !== 'undefined') global.Buffer = Buffer;

import { describe, it, expect } from 'vitest';
import {
  generateWalletMnemonic,
  isValidMnemonic,
  encryptMnemonic,
  decryptMnemonic,
  getWalletKeyPair,
} from './wallet';

describe('Wallet Service', () => {
  describe('generateWalletMnemonic', () => {
    it('возвращает ровно 24 слова', async () => {
      const mnemonic = await generateWalletMnemonic();
      expect(mnemonic).toHaveLength(24);
    });

    it('каждое слово — непустая строка', async () => {
      const mnemonic = await generateWalletMnemonic();
      mnemonic.forEach(word => {
        expect(typeof word).toBe('string');
        expect(word.length).toBeGreaterThan(0);
      });
    });

    it('два вызова дают разные мнемоники', async () => {
      const [a, b] = await Promise.all([
        generateWalletMnemonic(),
        generateWalletMnemonic(),
      ]);
      expect(a.join(' ')).not.toBe(b.join(' '));
    });
  });

  describe('isValidMnemonic', () => {
    it('возвращает true для свежесгенерированной мнемоники', async () => {
      const mnemonic = await generateWalletMnemonic();
      expect(await isValidMnemonic(mnemonic)).toBe(true);
    });

    it('возвращает false для массива случайных слов', async () => {
      const fake = Array(24).fill('invalid');
      expect(await isValidMnemonic(fake)).toBe(false);
    });

    it('возвращает false для пустого массива', async () => {
      expect(await isValidMnemonic([])).toBe(false);
    });
  });

  describe('encryptMnemonic / decryptMnemonic', () => {
    it('roundtrip: расшифровка возвращает исходную мнемонику', async () => {
      const mnemonic = await generateWalletMnemonic();
      const password = 'test-password-123';
      const encrypted = encryptMnemonic(mnemonic, password);
      const decrypted = decryptMnemonic(encrypted, password);
      expect(decrypted).toEqual(mnemonic);
    });

    it('неверный пароль не воспроизводит исходную мнемонику', async () => {
      const mnemonic = await generateWalletMnemonic();
      const encrypted = encryptMnemonic(mnemonic, 'correct');
      const decrypted = decryptMnemonic(encrypted, 'wrong');
      expect(decrypted?.join(' ')).not.toBe(mnemonic.join(' '));
    });

    it('зашифрованная строка отличается от исходной фразы', async () => {
      const mnemonic = await generateWalletMnemonic();
      const encrypted = encryptMnemonic(mnemonic, 'password');
      expect(encrypted).not.toBe(mnemonic.join(' '));
    });
  });

  describe('getWalletKeyPair', () => {
    it('возвращает publicKey длиной 32 байта и secretKey длиной 64 байта', async () => {
      const mnemonic = await generateWalletMnemonic();
      const keyPair = await getWalletKeyPair(mnemonic);
      expect(keyPair.publicKey).toHaveLength(32);
      expect(keyPair.secretKey).toHaveLength(64);
    });

    it('одна и та же мнемоника всегда даёт одинаковый publicKey (детерминированность)', async () => {
      const mnemonic = await generateWalletMnemonic();
      const [kp1, kp2] = await Promise.all([
        getWalletKeyPair(mnemonic),
        getWalletKeyPair(mnemonic),
      ]);
      expect(Buffer.from(kp1.publicKey).toString('hex')).toBe(
        Buffer.from(kp2.publicKey).toString('hex')
      );
    });
  });
});
