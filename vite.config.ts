import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single config. No duplicates.
export default defineConfig({
  plugins: [react()],
  base: "/kes-console/",   // Your repo name
})