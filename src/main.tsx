import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import 'simplebar-react/dist/simplebar.min.css';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from "dayjs";

// 启用 relativeTime 插件
dayjs.extend(relativeTime);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    // <React.StrictMode>
    //     <QueryClientProvider client={queryClient}>
    //         <App/>
    //     </QueryClientProvider>
    // </React.StrictMode>
    //
    <QueryClientProvider client={queryClient}>
        <App/>
    </QueryClientProvider>
)
