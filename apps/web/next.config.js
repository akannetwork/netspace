/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['react-phone-number-input', 'libphonenumber-js'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
            }
        ],
    },
};

module.exports = nextConfig;
