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
      {
        protocol: 'https',
        hostname: 'cravatar.cn',
      },
      {
        protocol: 'https',
        hostname: 'cdn.vjudge.net.cn',
      }
    ],
    dangerouslyAllowSVG: true,
},
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: '5mb',
  //   },
  //   reactCompiler: true,
  //   ppr: 'incremental',
  // },
  experimental: {
    viewTransition: true,
    
    //   ppr: 'incremental',
  },
  turbopack: {
    resolveAlias: {
      fs: './stubs/fs.js',
    },
  },
}

export default nextConfig
