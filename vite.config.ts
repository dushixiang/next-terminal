import {defineConfig, PluginOption} from 'vite'
import {resolve} from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {visualizer} from "rollup-plugin-visualizer";
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    const isProd = mode === 'production';
    return {
        plugins: [
            react(),
            tailwindcss(),
            ...(isProd ? [
                VitePWA({
                    registerType: 'autoUpdate',
                    injectRegister: false, // 改为 false，手动控制注册
                    scope: '/access/', // Service Worker 的作用域
                    workbox: {
                        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
                        navigateFallbackDenylist: [/^\/api\//], // 阻止 /api 被 fallback 到 index.html
                        runtimeCaching: [
                            {
                                urlPattern: ({url}) => !url.pathname.startsWith('/api/'),
                                handler: 'NetworkOnly', // 不缓存，直接请求网络
                            },
                        ],
                    },
                    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
                    manifest: {
                        start_url: "/access/",
                        scope: "/access/",
                        name: '{{.SystemName}}',
                        description: '',
                        background_color: '#313131',
                        icons: [
                            {
                                src: '/api/logo',
                                sizes: '512x512',
                                type: 'image/png',
                                purpose: "any"
                            },
                        ]
                    },
                })
            ] : []),
            visualizer({
                // open: true,
            }) as unknown as PluginOption
        ],
        resolve: {
            alias: {'@': resolve(__dirname, './src')},
        },
    }
});
