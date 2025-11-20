import { useState, useEffect } from 'react';
import { isMobileByMediaQuery } from '@/utils/utils';

/**
 * 移动端检测 Hook
 * 提供移动端状态管理和响应式断点检测
 */
export const useMobile = () => {
    const [isMobile, setIsMobile] = useState(isMobileByMediaQuery());
    const [isTablet, setIsTablet] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = isMobileByMediaQuery();
            const tablet = window.matchMedia("(min-width: 769px) and (max-width: 1024px)").matches;
            
            setIsMobile(mobile);
            setIsTablet(tablet);
        };

        // 初始检查
        handleResize();

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return {
        isMobile,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        // 便捷方法
        isMobileOrTablet: isMobile || isTablet,
    };
};

/**
 * 响应式断点常量
 */
export const BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1025,
} as const;

/**
 * 获取当前设备类型
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const width = window.innerWidth;
    
    if (width <= BREAKPOINTS.mobile) {
        return 'mobile';
    } else if (width <= BREAKPOINTS.tablet) {
        return 'tablet';
    } else {
        return 'desktop';
    }
};
