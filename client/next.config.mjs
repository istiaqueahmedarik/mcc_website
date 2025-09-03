/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
        ...(process.env.HOST_NAME ? [{
            protocol: 'https',
            hostname: process.env.HOST_NAME,
        }] : []),
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
        hostname: 'cn.cravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.vjudge.net.cn',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'cdn.brandfetch.io',
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
  reactStrictMode: true,
  webpack: (config) => {
    // Provide fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}

export default nextConfig
