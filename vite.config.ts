import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative paths for Electron builds, /ChessT1/ for GitHub Pages
const isElectron = process.env.ELECTRON === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/ChessT1/',
})
