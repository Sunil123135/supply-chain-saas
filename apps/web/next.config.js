/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/data/auto": ["./data/**/*", "../../data/**/*"],
      "/api/import/starter-pack/[industry]": ["./data/**/*", "../../data/**/*"],
      "/api/seed/supabase": ["./data/**/*", "../../data/**/*"],
    },
  },
};

module.exports = nextConfig;
