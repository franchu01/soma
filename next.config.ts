import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
};

// next.config.js
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
