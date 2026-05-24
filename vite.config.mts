import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            cannon: path.resolve(__dirname, './src/lib/cannon/cannon.js')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        chunkSizeWarningLimit: 650,
        commonjsOptions: {
            include: [/src\/lib\/cannon\/cannon\.js/, /node_modules/]
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    three: ['three'],
                    cannon: ['cannon']
                }
            }
        }
    },
    server: {
        host: '127.0.0.1',
        port: 8080
    }
});
