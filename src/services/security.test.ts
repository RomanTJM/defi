import { Buffer } from 'buffer';
if (typeof global !== 'undefined') global.Buffer = Buffer;

import { describe, it, expect } from 'vitest';
import { checkAddressSpoofing, isAddressValid } from './security';

describe('Security Services (Address Spoofing Protection)', () => {
    describe('isAddressValid', () => {
        it('should return true for a valid TON address', () => {
             // Valid testnet/mainnet address format
             expect(isAddressValid('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t')).toBe(true);
        });

        it('should return false for an invalid string', () => {
             expect(isAddressValid('invalid_address_string_123')).toBe(false);
             expect(isAddressValid('')).toBe(false);
        });
    });

    describe('checkAddressSpoofing', () => {
        const historyAddresses = [
            'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t',
            'UQDr_1gL_37q7K-gBNjR0GZq2P94bH-hF2xHk18w88i_4Nhh'
        ];

        it('должен возвращать isSpoofed=false при точном совпадении с историей (безопасный адрес)', () => {
             const result = checkAddressSpoofing('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', historyAddresses);
             expect(result.isSpoofed).toBe(false);
             expect(result.message).toBe('');
        });

        it('должен возвращать isSpoofed=true для поддельного адреса (совпадают начало и конец)', () => {
             // Создаем фейковый адрес, который начинается на 'EQD4F' и заканчивается на 'p6_0t'
             const spoofedAddr = 'EQD4F_FAKEMIDDLEPART_p6_0t';
             const result = checkAddressSpoofing(spoofedAddr, historyAddresses);
             expect(result.isSpoofed).toBe(true);
             expect(result.message).toContain('похож на ваш известный контакт');
        });

        it('должен возвращать isSpoofed=false, но предупреждать о новом адресе (которого нет в истории)', () => {
             const result = checkAddressSpoofing('EQBvW8Z5huBkMJYdnfAEM5JqTNkuWX3diqYENkWsIL0XggGG', historyAddresses);
             expect(result.isSpoofed).toBe(false);
             expect(result.message).toContain('Вы отправляете на новый адрес');
        });
    });
});
