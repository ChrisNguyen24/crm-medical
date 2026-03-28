/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  env: {
    NEXT_PUBLIC_API_URL:    process.env.NEXT_PUBLIC_API_URL    ?? "http://localhost:3003",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3002",
  },
};

module.exports = nextConfig;
