/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const resolvePath = (str: string) => path.resolve(__dirname, str);
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolvePath("src/index.ts"),
      name: "index",
      fileName: format => `index.${format}.js`
    }
  }
  
});