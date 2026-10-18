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
                    // 发布注销脚本，替换已安装的旧 Service Worker，避免预缓存持续提供旧页面。
                    // 保留 manifest，用于应用名称、图标和独立窗口显示。
                    selfDestroying: true,
                    // 新页面不再注册；旧注册仍会通过原来的 /sw.js 地址获取注销脚本。
                    injectRegister: false,
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
            alias: {'@': resolve(import.meta.dirname, './src')},
        },
        server: {
            proxy: {
                '/swagger/': {
                    target: process.env.DEV_API_TARGET || 'http://localhost:8088/',
                    changeOrigin: true,
                },
                '/api/': {
                    target: process.env.DEV_API_TARGET || 'http://localhost:8088/',
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
