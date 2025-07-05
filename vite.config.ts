import {defineConfig, PluginOption} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {visualizer} from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            devOptions: {
                enabled: true,
            },
            workbox: {
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Next Terminal',
                short_name: 'NT',
                description: '',
                background_color: '#313131',
                icons: [
                    {
                        src: '/logo.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: "any"
                    },
                ]
            },
        }),
        visualizer({
            // open: true,
        }) as unknown as PluginOption
    ],
    resolve: {
        alias: {'@': resolve(__dirname, './')},
    },
})
