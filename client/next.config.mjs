/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: process.env.HOST_NAME,
        },
        {
            protocol: 'https',
            hostname: 'placehold.co',

        },
    ],
    dangerouslyAllowSVG: true,
},
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    reactCompiler: true,
    ppr: 'incremental',
  },
}

export default nextConfig
