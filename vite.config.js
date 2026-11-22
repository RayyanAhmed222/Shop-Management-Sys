import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./", // <--- YEH LINE LAZMI ADD KARNI HAI TAKI ELECTRON RELATIVE PATHS READ KAR SAKE!
  server: {
    host: true,
    allowedHosts: [".trycloudflare.com"],
  },
})