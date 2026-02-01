import React from 'react';
import Input from 'react-phone-number-input';
import tr from 'react-phone-number-input/locale/tr';
import { isValidPhoneNumber } from 'react-phone-number-input';

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    error?: string;
}

export function PhoneInput({ value, onChange, placeholder = '555 123 45 67', className = '', disabled = false, error }: PhoneInputProps) {

    // Wrapper to handle undefined mismatch if library returns undefined
    const handleChange = (val?: string) => {
        onChange(val || '');
    };

    return (
        <div className={`phone-input-container ${className}`}>
            <Input
                international
                defaultCountry="TR"
                labels={tr}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500' : 'border-gray-300'}`}
                numberInputProps={{
                    className: 'flex-1 bg-transparent outline-none ml-2 placeholder:text-gray-400'
                }}
            />
            {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
            {value && !isValidPhoneNumber(value) && (
                <span className="fixed text-xs text-orange-500 mt-1 block"></span>
            )}
        </div>
    );
}
