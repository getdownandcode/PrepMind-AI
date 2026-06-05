/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { 
    typedRoutes: true,
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"]
  },
};
export default nextConfig;
