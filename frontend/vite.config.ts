import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Enable Fast Refresh for better dev experience
      fastRefresh: true,
    }),
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Build optimizations
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Enable minification (using esbuild which is built-in)
    minify: 'esbuild',
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        // Manual chunks for optimal code splitting
        manualChunks: {
          // React and core framework
          'vendor-react': ['react', 'react-dom'],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // UI utilities
          'vendor-ui': ['class-variance-authority', 'clsx', 'tailwind-merge', 'lucide-react'],
          // Analytics (loaded on demand)
          'vendor-analytics': ['posthog-js'],
        },
        // Chunk naming strategy
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.css$/i.test(assetInfo.name)) {
            return 'assets/styles-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
    
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    
    // Source maps for debugging (disable in production if not needed)
    sourcemap: mode !== 'production',
    
    // CSS optimization
    cssMinify: true,
    
    // Preload optimization
    modulePreload: {
      polyfill: false,
    },
  },
  
  // Development optimizations
  server: {
    // Enable compression in dev
    compress: true,
    // Optimize HMR
    hmr: {
      overlay: false,
    },
  },
  
  // Preview server settings
  preview: {
    port: 4173,
    host: true,
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    // Performance optimizations for tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  
  // Dependency optimization for dev
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'lucide-react',
    ],
    // Exclude heavy dependencies that should be lazy loaded
    exclude: ['posthog-js'],
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
}))
