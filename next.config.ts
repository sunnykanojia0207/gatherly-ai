import type { NextConfig } from "next";

import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: buildSecurityHeaders() }];
  },
};

export default nextConfig;
