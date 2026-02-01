'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    folder?: string;
    label?: string;
}

export function ImageUpload({ value, onChange, label = 'Product Image' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset loading state when value changes (new image)
    useEffect(() => {
        if (value) setIsImageLoading(true);
    }, [value]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        // Client-side validation
        if (file.size > 10 * 1024 * 1024) {
            alert('Dosya boyutu 10MB\'dan küçük olmalıdır.');
            return;
        }

        setUploading(true);
        setProgress(0); // Reset progress

        const token = localStorage.getItem('access_token');
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/office/upload`;

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);

            xhr.open('POST', url, true);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            // Track Upload Progress
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        onChange(data.url);
                        resolve();
                    } catch (e) {
                        alert('Invalid JSON response');
                        reject(e);
                    }
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        alert('Upload Error: ' + (err.error || xhr.statusText));
                    } catch {
                        alert('Upload Error: ' + xhr.statusText);
                    }
                    reject(new Error(xhr.statusText));
                }
                setUploading(false);
            };

            xhr.onerror = () => {
                alert('Network Error');
                setUploading(false);
                reject(new Error('Network Error'));
            };

            xhr.send(formData);
        });
    };

    // Circular Progress Components
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            {value ? (
                <div className="relative w-full aspect-square bg-gray-50 rounded-lg border-2 border-gray-200 overflow-hidden group">
                    <Image
                        src={value}
                        alt="Preview"
                        fill
                        objectFit='cover'
                        className={`object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                        unoptimized={true}
                        onLoad={() => setIsImageLoading(false)}
                    />

                    {isImageLoading && (
                        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="bg-white text-red-600 px-4 py-2 rounded-full font-medium shadow-sm hover:bg-red-50 transform translate-y-2 group-hover:translate-y-0 transition-all"
                        >

                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors aspect-square cursor-pointer"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    {/* Real Progress Bar Overlay */}
                    {uploading && (
                        <div className="absolute left-0 top-0 right-0 bottom-0 bg-gray-50 flex flex-col items-center justify-center z-20 rounded-lg">
                            <div className="relative flex items-center justify-center">
                                {/* Background Circle */}
                                <svg className="transform -rotate-90 w-24 h-24">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="#EFEFEF"
                                        strokeWidth="6"
                                        fill="transparent"
                                        className="text-gray-400"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        className="text-blue-600 transition-all duration-200 ease-in-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {/* Percentage Text */}
                                <div className="absolute text-md font-bold text-gray-700">
                                    {Math.round(progress)}%
                                </div>
                            </div>
                        </div>
                    )}

                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-indigo-600 hover:text-indigo-500">Upload a file</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                </div>
            )}
        </div>
    );
}
