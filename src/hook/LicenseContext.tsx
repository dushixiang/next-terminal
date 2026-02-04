import React, {createContext, ReactNode, useContext} from 'react';
import {useQuery} from "@tanstack/react-query";
import licenseApi, {SimpleLicense} from "@/api/license-api";

interface LicenseContextValue {
    license: SimpleLicense;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

interface LicenseProviderProps {
    children: ReactNode;
}

// 不需要查询许可证的公开路径
const PUBLIC_PATHS = [
    '/login',
    '/setup',
    '/wechat-work/callback',
    '/oidc/callback',
    '/oidc/server/consent',
];

/**
 * License Provider 组件
 * 在应用顶层提供许可证信息，避免多处重复查询
 */
export function LicenseProvider({children}: LicenseProviderProps) {
    // 检查当前路径是否为公开路径
    const isPublicPath = PUBLIC_PATHS.some(path => window.location.pathname.startsWith(path));

    const query = useQuery({
        queryKey: ['simpleLicense'],
        queryFn: licenseApi.getSimpleLicense,
        enabled: !isPublicPath, // 在公开路径下禁用查询
        staleTime: 5 * 60 * 1000, // 5分钟内数据被认为是新鲜的
        gcTime: 10 * 60 * 1000, // 10分钟后清理缓存
        retry: 3, // 失败时重试3次
    });

    // 加载期间或失败时返回企业版许可证，允许用户访问所有功能
    // 这样可以避免在数据加载期间误禁用UI元素
    const license = query.data ?? new SimpleLicense('enterprise');

    const value: LicenseContextValue = {
        license,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };

    return (
        <LicenseContext.Provider value={value}>
            {children}
        </LicenseContext.Provider>
    );
}

/**
 * useLicense Hook
 * 获取许可证信息
 * 必须在 LicenseProvider 内部使用
 */
export function useLicense(): LicenseContextValue {
    const context = useContext(LicenseContext);

    if (!context) {
        throw new Error('useLicense must be used within LicenseProvider');
    }

    return context;
}
