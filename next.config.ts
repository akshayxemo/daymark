import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const config: NextConfig = {
  // Standalone output powers the Docker image (the Dockerfile sets NEXT_OUTPUT).
  // Vercel and `next start` use the default output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  // Node-only packages stay external to the server bundle.
  serverExternalPackages: ['postgres', 'nodemailer'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        // Authenticated application routes must never be cached by shared caches.
        source: '/app/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      },
    ];
  },
};

export default config;
