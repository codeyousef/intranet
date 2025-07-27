/** @type {import('next').NextConfig} */
const nextConfig = {
  // Experimental flag to fix hydration issues in Next.js 15
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Disable React strict mode in development to reduce hydration issues
  reactStrictMode: false,

  // Add rewrites to handle specific files
  async rewrites() {
    return [
      {
        // Handle direct requests to the file
        source: '/4-auth-msal.js',
        destination: '/4-auth-msal.js',
      },
    ];
  },

  // Custom handling for public files
  publicRuntimeConfig: {
    // Add any runtime config needed
    vivaEngageChunkUrl: '/4-auth-msal.js',
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://copilotstudio.microsoft.com https://*.microsoftonline.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://api.weatherapi.com https://graph.microsoft.com https://*.sharepoint.com https://*.microsoftonline.com wss://localhost:* ws://localhost:*",
              "frame-src 'self' https://copilotstudio.microsoft.com https://*.sharepoint.com https://*.office.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests"
            ].join('; '),
          },
        ],
      },
      // CORS headers only for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXTAUTH_URL || 'https://172.22.58.184:8443',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ]
  },
  // Removed circular rewrite that was causing infinite loop

  // Add webpack configuration to fix chunk loading errors
  webpack: (config, { isServer, dev }) => {
    // Only apply these optimizations on the client side
    if (!isServer) {
      // Optimize chunk loading with more aggressive settings
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25, // Increase from default to allow more initial chunks
        maxAsyncRequests: 25, // Increase from default to allow more async chunks
        minSize: 20000, // Only create chunks larger than 20kb
        maxSize: 200000, // Try to split chunks larger than 200kb
        cacheGroups: {
          default: false, // Disable default cache groups
          vendors: false, // Disable vendors cache group
          // Framework chunk for Next.js and React core
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next|@next)[\\/]/,
            priority: 40,
            enforce: true,
            chunks: 'all',
          },
          // Create a single runtime chunk
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            reuseExistingChunk: true,
            priority: 20,
          },
          // Create a single vendor chunk for third-party libraries
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 10,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Create a separate chunk for CSS
          styles: {
            name: 'styles',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
            priority: 30,
          },
        },
      };

      // Add a specific configuration for React Server Components
      if (config.experiments?.serverComponents) {
        // Ensure RSC chunks are properly handled
        config.module.rules.push({
          test: /\.(js|jsx|ts|tsx)$/,
          include: [/node_modules\/next\/dist\/client\/components/],
          sideEffects: false,
        });
      }

    }

    return config;
  },
}

module.exports = nextConfig
