import { defineConfig } from 'vite'

export default defineConfig({
  base: '/robot_batl/',
  build: {
    target: 'safari16.4',
    license: { fileName: 'third-party-licenses.md' },
    chunkSizeWarningLimit: 650,
  },
})
