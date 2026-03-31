import { Address } from '@ton/core';

export function isAddressValid(address: string): boolean {
    try {
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

function normalizeAddress(address: string): string | null {
    try {
        return Address.parse(address).toString({ testOnly: true, bounceable: false });
    } catch {
        return null;
    }
}

export function checkAddressSpoofing(inputAddress: string, historyAddresses: string[]): { isSpoofed: boolean, message: string } {
    const rawInput = inputAddress.trim();
    const normalizedInput = normalizeAddress(rawInput);

    const normalizedHistory = historyAddresses
        .map(normalizeAddress)
        .filter((a): a is string => a !== null);

    if (normalizedInput) {
        if (normalizedHistory.includes(normalizedInput)) {
            return { isSpoofed: false, message: '' };
        }

        for (const historyAddr of normalizedHistory) {
            if (
                historyAddr.substring(0, 5) === normalizedInput.substring(0, 5) &&
                historyAddr.slice(-5) === normalizedInput.slice(-5)
            ) {
                return {
                    isSpoofed: true,
                    message: `Осторожно! Этот адрес очень похож на ваш известный контакт (${historyAddr}), но отличается внутренними символами. Возможна подмена адреса!`,
                };
            }
        }
    } else {
        if (historyAddresses.includes(rawInput)) {
            return { isSpoofed: false, message: '' };
        }

        for (const historyAddr of historyAddresses) {
            if (historyAddr.length > 8 && rawInput.length > 8) {
                if (
                    historyAddr.substring(0, 5) === rawInput.substring(0, 5) &&
                    historyAddr.slice(-5) === rawInput.slice(-5)
                ) {
                    return {
                        isSpoofed: true,
                        message: `Осторожно! Этот адрес очень похож на ваш известный контакт (${historyAddr}), но отличается внутренними символами. Возможна подмена адреса!`,
                    };
                }
            }
        }
    }

    return {
        isSpoofed: false,
        message: 'Вы отправляете на новый адрес, которого нет в вашей истории. Убедитесь, что он скопирован верно.',
    };
}
