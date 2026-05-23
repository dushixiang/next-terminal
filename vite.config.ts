import {defineConfig, PluginOption} from 'vite'
import {resolve} from 'path';
import {VitePWA} from 'vite-plugin-pwa';
import {visualizer} from "rollup-plugin-visualizer";
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const manualChunkGroups = [
    {name: 'react', packages: ['react', 'react-dom']},
    {name: 'antd', packages: ['antd']},
    {name: 'monaco', packages: ['monaco-editor', '@monaco-editor/react']},
    {
        name: 'xterm',
        packages: [
            '@xterm/xterm',
            '@xterm/addon-fit',
            '@xterm/addon-search',
            '@xterm/addon-canvas',
            '@xterm/addon-webgl'
        ]
    },
    {name: 'charts', packages: ['recharts']},
];

const getPackagePathSegment = (packageName: string) => `/node_modules/${packageName}/`;

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    const isProd = mode === 'production';
    const analyze = process.env.ANALYZE === 'true';
    return {
        plugins: [
            react(),
            tailwindcss(),
            ...(isProd ? [
                VitePWA({
                    registerType: 'autoUpdate',
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
            ...(analyze ? [
                visualizer({
                    filename: 'stats.html',
                }) as unknown as PluginOption
            ] : []),
        ],
        resolve: {
            alias: {'@': resolve(__dirname, './src')},
        },
        server: {
            proxy: {
                '/api/': {
                    target: 'http://localhost:8888/',
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
        build: {
            sourcemap: false,
            minify: 'oxc',
            rolldownOptions: {
                output: {
                    manualChunks: (id) => {
                        if (!id.includes('/node_modules/')) {
                            return;
                        }

                        for (const group of manualChunkGroups) {
                            if (group.packages.some((packageName) => id.includes(getPackagePathSegment(packageName)))) {
                                return group.name;
                            }
                        }
                    }
                }
            }
        }
    }
});
