/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // 将来 Supabase Storage / CDN のドメインをここに追加
    remotePatterns: [],
  },
};
module.exports = nextConfig;
