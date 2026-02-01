export function formatCurrency(amount: number | string, currency = 'TRY'): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(value)) return '0.00 ' + currency;

    // Format: 15,000.00
    const formatted = new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);

    return `${formatted} ${currency}`;
}

import { parsePhoneNumber } from 'libphonenumber-js';

export function formatPhone(value: string): string {
    if (!value) return '';
    try {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber) {
            return phoneNumber.formatInternational();
        }
    } catch (error) {
        // If parsing fails, return original value
        return value;
    }
    return value;
}
