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
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
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
