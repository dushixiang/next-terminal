import React from 'react';
import {Spin} from 'antd';
import {useQuery} from '@tanstack/react-query';
import clsx from 'clsx';
import brandingApi from '@/api/branding-api';

interface LayoutSidebarLogoProps {
    collapsed?: boolean;
}

/**
 * 侧边栏 Logo 组件
 * 渲染品牌 Logo 和名称
 */
const LayoutSidebarLogo: React.FC<LayoutSidebarLogoProps> = ({collapsed = false}) => {
    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    return (
        <Spin spinning={brandingQuery.isLoading}>
            <div className={clsx('flex items-center gap-2 justify-center h-[60px]')}>
                {brandingQuery.data && (
                    <img
                        src={brandingApi.getLogo()}
                        alt='logo'
                        className={'h-8 w-8 rounded'}
                    />
                )}
                {!collapsed && (
                    <div className={clsx('font-bold text-lg transition duration-100 ease-in-out')}>
                        {brandingQuery.data?.name}
                    </div>
                )}
            </div>
        </Spin>
    );
};

export default LayoutSidebarLogo;
