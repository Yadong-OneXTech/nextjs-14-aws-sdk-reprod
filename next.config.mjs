/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        scrollRestoration: true,
        serverComponentsExternalPackages: [
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/client-s3',
          '@aws-sdk/lib-dynamodb',
          '@aws-sdk/s3-request-presigner',
        ],
      },
};

export default nextConfig;
