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
    optimizePackageImports: [
      '@gravity-ui/uikit',
      '@gravity-ui/markdown-editor',
      'lucide-react',
      'recharts',
      '@udecode/plate',
      'react-icons',
      '@radix-ui/react-icons',
      'date-fns',
    ],
  },
  turbopack: {
    resolveAlias: {
      fs: "./stubs/fs.js",
    },
  },
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // Ignore @diplodoc/cut-extension modules
    config.resolve.alias = {
      ...config.resolve.alias,
      '@diplodoc/cut-extension': false,
      '@diplodoc/cut-extension/runtime': false,
      '@diplodoc/cut-extension/runtime/styles.css': false,
    };

    return config;
  },
};

export default nextConfig;
