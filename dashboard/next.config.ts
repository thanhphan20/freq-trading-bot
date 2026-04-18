import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../"),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("sqlite3");
    }
    return config;
  },
};

export default nextConfig;
