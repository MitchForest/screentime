/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes moved out of experimental in Next 15+
  typedRoutes: true,
  transpilePackages: ["@screentime/contracts", "@screentime/shared"],
};

export default nextConfig;
