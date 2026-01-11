import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from "dayjs";
import {LicenseProvider} from "@/hook/LicenseContext";

// 启用 relativeTime 插件
dayjs.extend(relativeTime);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error: any) => {
                // 对于 401 和 418 错误，不进行重试
                if (error?.status === 401 || error?.status === 418) {
                    return false;
                }
                // 其他错误最多重试 3 次
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <QueryClientProvider client={queryClient}>
        <LicenseProvider>
            <App/>
        </LicenseProvider>
    </QueryClientProvider>
)
