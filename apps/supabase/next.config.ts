import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "naaoqefyrpkekqpbrcap.supabase.co",
        pathname: "/storage/v1/object/public/**",
        port: "",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
