import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // npm run dev wagtynda API soraglary Node serwerine (npm start) iberilýär
    proxy: { '/api': 'http://localhost:3000' },
  },
})
