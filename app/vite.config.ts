import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  return {
    plugins: [react()],
    // Use absolute paths in production; Firebase serves at domain root
    base: '/',
    build: {
      // Increase the chunk size warning threshold to 600 kB
      chunkSizeWarningLimit: 600,
      // Emit production build into the public folder for hosting
      outDir: 'public',
      // Keep existing files like 404.html and favicon.ico
      emptyOutDir: false,
      rollupOptions: {
        // Silence specific rollup warnings about annotation comments being removed
        onwarn(warning, warn) {
          const message = typeof warning.message === 'string' ? warning.message : ''
          if (message.includes('/*#__PURE__*/')) {
            return
          }
          if (message.includes('contains an annotation that Rollup cannot interpret')) {
            return
          }
          warn(warning)
        },
      },
    },
    // Avoid copying the public directory into itself during build,
    // but keep it enabled for dev server.
    publicDir: isBuild ? false : 'public',
  }
})
