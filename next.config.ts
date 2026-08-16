import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Property images and documents are uploaded through Server Actions; the
    // default request-body cap is 1MB. Our file cap is 4MB — allow headroom for
    // multipart overhead. (Stays under Vercel's ~4.5MB platform limit.)
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
