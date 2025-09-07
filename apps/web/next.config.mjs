/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes moved out of experimental in Next 15+
  typedRoutes: true,
  transpilePackages: ["@screentime/contracts", "@screentime/shared", "@screentime/db"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "s3.amazonaws.com" },
    ],
  },
};

export default nextConfig;
