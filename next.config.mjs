import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Force a single canonical host (www) so auth cookies set on one address stay
  // valid — otherwise logging in on asaluke.io doesn't count on www.asaluke.io,
  // which bounced members back to the homepage.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'asaluke.io' }],
        destination: 'https://www.asaluke.io/:path*',
        permanent: true,
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  org: 'life-up-fitness',
  project: 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
});
