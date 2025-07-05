import {defineConfig, PluginOption} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path';
import {visualizer} from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            // open: true,
        }) as unknown as PluginOption
    ],
    resolve: {
        alias: {'@': resolve(__dirname, './')},
    },
})
