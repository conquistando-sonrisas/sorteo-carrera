import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  trailingSlash: true,
  images: {
    unoptimized: true, // Required if using the Next.js <Image> component
  },
  basePath: '/sorteo-carrera'
};

export default nextConfig;
