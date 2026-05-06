import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // 將 'TYPE' 替換為你的 GitHub 儲存庫名稱
  base: '/TYPE/',
  plugins: [svelte()],
});