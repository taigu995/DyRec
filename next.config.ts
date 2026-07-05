import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: 'next-build',
  // output: 'standalone',  // Disabled for portable package
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
