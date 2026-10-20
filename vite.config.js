import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['chart.js'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-sanitizer': ['dompurify']
        }
      }
    }
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  }
});
