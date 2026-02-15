import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Optimize for performance
  poweredByHeader: false,
  compress: true,
  // Fix workspace root detection warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),
};

export default nextConfig;
