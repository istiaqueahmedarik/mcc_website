/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    reactCompiler: true,
    ppr: 'incremental',
  },
}

export default nextConfig
