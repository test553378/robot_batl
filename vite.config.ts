import { defineConfig } from 'vite'

export default defineConfig({
  base: '/robot_batl/',
  build: {
    target: 'safari16.4',
    chunkSizeWarningLimit: 650,
  },
})
