import { Address } from '@ton/core';

export function isAddressValid(address: string): boolean {
    try {
        Address.parse(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Защита от подмены адреса
 * Проверяет, не является ли введенный адрес слишком "похожим" на другие адреса из истории.
 */
export function checkAddressSpoofing(inputAddress: string, historyAddresses: string[]): { isSpoofed: boolean, message: string } {
    const inputFormatted = inputAddress.trim();
    
    // Если адрес точь-в-точь совпадает с уже известным, мы считаем его безопасным.
    if (historyAddresses.includes(inputFormatted)) {
        return { isSpoofed: false, message: '' };
    }

    // Если нет, ищем "похожие адреса" (совпадают первые и последние N символов)
    // Злоумышленники часто генерируют адреса с одинаковым началом и концом
    for (const historyAddr of historyAddresses) {
        if (historyAddr.length > 8 && inputFormatted.length > 8) {
            const startHistory = historyAddr.substring(0, 5);
            const endHistory = historyAddr.slice(-5);
            
            const startInput = inputFormatted.substring(0, 5);
            const endInput = inputFormatted.slice(-5);
            
            if (startHistory === startInput && endHistory === endInput) {
                // Адрес выглядит так же, НО отличается внутри. Это классическая атака Address Spoofing.
                return { 
                    isSpoofed: true, 
                    message: `Осторожно! Этот адрес очень похож на ваш известный контакт (${historyAddr}), но отличается внутренними символами. Возможна подмена адреса!` 
                };
            }
        }
    }
    
    // Если мы отправляем на абсолютно новый адрес
    return { 
        isSpoofed: false, 
        message: 'Вы отправляете на новый адрес, которого нет в вашей истории. Убедитесь, что он скопирован верно.' 
    };
}
