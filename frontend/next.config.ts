import type { NextConfig } from "next";

// URL du backend Render (sans le /api final).
// Vient de la même variable que celle déjà utilisée côté client,
// on retire juste le "/api" pour ne pas le dupliquer dans le rewrite.
const backendOrigin = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api"
).replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
