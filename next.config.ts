
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
  experimental: {
    allowedDevOrigins: [
      "https://6000-firebase-studio-1750183824555.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev"
    ],
  }
};

export default nextConfig;
