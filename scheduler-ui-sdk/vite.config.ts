import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import typescript from '@rollup/plugin-typescript'

const resolvePath = (str: string) => path.resolve(__dirname, str);
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console 语句
        drop_debugger: true // 移除 debugger 语句
      }
    },
    lib: {
      entry: resolvePath("src/index.ts"),
      name: "index",
      fileName: format => `index.${format}.js`
    },
    rollupOptions: {
      plugins: [
        typescript({
          target: "es2015", // 这里指定编译到的版本，
          rootDir: resolvePath("src/"),
          declaration: true,
          declarationDir: resolvePath("dist"),
          exclude: resolvePath("node_modules/**"),
          allowSyntheticDefaultImports: true,
        }),
    ],
    }
  },

});