import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server output for the Docker/Cloud Run image.
  output: "standalone",
};

export default nextConfig;
