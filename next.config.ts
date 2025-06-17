
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Add other image hostnames if needed, e.g., for Firebase Storage
      // {
      //   protocol: 'https',
      //   hostname: 'firebasestorage.googleapis.com',
      // },
    ],
  },
};

export default nextConfig;
