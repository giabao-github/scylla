/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/shared"],
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
