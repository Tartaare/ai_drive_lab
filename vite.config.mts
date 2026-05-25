import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ['@react-three/fiber', '@react-three/drei', 'three', 'cannon-es']
    },
    resolve: {
        dedupe: ['three', 'react', 'react-dom', '@react-three/fiber'],
        alias: {
            three: path.resolve(__dirname, './node_modules/three')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    three: ['three'],
                    cannon: ['cannon-es']
                }
            }
        }
    },
    server: {
        host: '127.0.0.1',
        port: 8080
    }
});
