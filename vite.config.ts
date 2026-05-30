import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', '.claude/hooks/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', '.claude/hooks/*.mjs'],
      exclude: ['src/**/*.test.ts', 'src/test/**', '.claude/hooks/**/*.test.mjs'],
    },
  },
})
