import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相對路徑：部署到 GitHub Pages 的 /<repo>/ 子路徑也能正常載入
  base: './',
  plugins: [vue()],
})
