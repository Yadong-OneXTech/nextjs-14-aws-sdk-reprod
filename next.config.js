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

const withPWA = require('next-pwa')({
    dest: 'public'
  })
  
module.exports = withPWA(nextConfig)
