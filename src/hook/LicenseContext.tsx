import {createContext, ReactNode, useContext} from 'react';
import {useQuery} from "@tanstack/react-query";
import licenseApi, {SimpleLicense} from "@/api/license-api";
import {Button, Result, Spin} from "antd";
import {useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {isLicensePublicPath} from './license-public-path';

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

/**
 * License Provider 组件
 * 在应用顶层提供许可证信息，避免多处重复查询
 */
export function LicenseProvider({children}: LicenseProviderProps) {
    const {t} = useTranslation();
    const {pathname, search} = useLocation();
    const isPublicPath = isLicensePublicPath(pathname, search);

    const query = useQuery({
        queryKey: ['simpleLicense'],
        queryFn: licenseApi.getSimpleLicense,
        enabled: !isPublicPath, // 在公开路径下禁用查询
        staleTime: 5 * 60 * 1000, // 5分钟内数据被认为是新鲜的
        gcTime: 10 * 60 * 1000, // 10分钟后清理缓存
        retry: 3, // 失败时重试3次
    });

    if (!isPublicPath && query.isPending) {
        return (
            <Spin
                fullscreen
                size="large"
                description={t('settings.license.loading')}
            />
        );
    }

    if (!isPublicPath && query.isError && !query.data) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Result
                    status="error"
                    title={t('settings.license.load_error.title')}
                    subTitle={t('settings.license.load_error.description')}
                    extra={
                        <Button
                            type="primary"
                            loading={query.isFetching}
                            onClick={() => query.refetch()}
                        >
                            {t('settings.license.load_error.retry')}
                        </Button>
                    }
                />
            </div>
        );
    }

    // 公开页面不会使用授权能力，提供免费版对象以保持 Context 类型稳定。
    const license = query.data ?? new SimpleLicense('free');

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
