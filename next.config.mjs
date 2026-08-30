/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@whiskeysockets/baileys', 'jimp', 'pino', 'pg'],
};

export default nextConfig;