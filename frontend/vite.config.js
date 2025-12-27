import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  build: {
    // Generates a dedicated source map file instead of inline eval
    sourcemap: true, 
  },
  esbuild: {
    // Helps avoid issues with libraries using older JS syntax
    legalComments: 'none',
  },
})
