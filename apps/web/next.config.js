/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/data/auto": ["../../data/**/*"],
      "/api/import/starter-pack/[industry]": ["../../data/**/*"],
      "/api/seed/supabase": ["../../data/**/*"],
    },
  },
};

module.exports = nextConfig;
