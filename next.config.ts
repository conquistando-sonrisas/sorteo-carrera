import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  output: 'export', // Enforces static export
  images: {
    unoptimized: true, // Required if using the Next.js <Image> component
  },
};

export default nextConfig;
