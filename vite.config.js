import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: 'src',
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  build: {
    outDir: '../dst',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    open: true,
    port: 3000
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: ''
      }
    }
  },
  assetsInclude: ['**/*.vert', '**/*.frag', '**/*.glsl']
})