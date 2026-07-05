/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用不以 . 开头的目录名，避免 Windows 解压工具跳过
  distDir: 'next-build',
  output: 'standalone',
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

module.exports = nextConfig;
