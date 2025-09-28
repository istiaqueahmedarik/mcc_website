/** @type {import('next').NextConfig} */
const supHost = (() => {
  try {
    return process.env.SUPABASE_URL
      ? new URL(process.env.SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig = {
  images: {
    remotePatterns: [
      ...(process.env.HOST_NAME
        ? [{ protocol: "https", hostname: process.env.HOST_NAME }]
        : []),
      ...(supHost ? [{ protocol: "https", hostname: supHost }] : []),
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "cravatar.cn" },
      { protocol: "https", hostname: "cn.cravatar.com" },
      { protocol: "https", hostname: "cdn.vjudge.net.cn" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "cdn.brandfetch.io" },
    ],
    dangerouslyAllowSVG: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    viewTransition: true,
    // ppr: 'incremental',
  },
  turbopack: {
    resolveAlias: {
      fs: "./stubs/fs.js",
    },
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
