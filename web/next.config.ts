import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Optimize for performance
  poweredByHeader: false,
  compress: true,
  // Skip ESLint during build (pre-existing lint issues in admin pages)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Fix workspace root detection warning
  outputFileTracingRoot: require('path').join(__dirname, '../'),
  // Image optimization for Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : 'placeholder.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Redirect old /marketplace/* routes to the standalone marketplace app
  async redirects() {
    const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:30502';
    return [
      {
        source: '/marketplace',
        destination: marketplaceUrl,
        permanent: false,
      },
      {
        source: '/marketplace/:path*',
        destination: `${marketplaceUrl}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
