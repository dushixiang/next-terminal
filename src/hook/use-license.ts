import {useQuery} from "@tanstack/react-query";
import licenseApi, {SimpleLicense} from "@/api/license-api";

export function useLicense() {
    const query = useQuery({
        queryKey: ['simpleLicense'],
        queryFn: licenseApi.getSimpleLicense,
        staleTime: 5 * 60 * 1000, // 5分钟内数据被认为是新鲜的
        gcTime: 10 * 60 * 1000, // 10分钟后清理缓存
        refetchOnWindowFocus: false, // 窗口聚焦时不自动重新获取
        retry: 3, // 失败时重试3次
    });

    // 返回许可证数据，如果没有数据则返回默认的免费许可证
    const license = query.data || new SimpleLicense('');
    
    return [license, query] as const;
}