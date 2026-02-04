import React from 'react';
import clsx from 'clsx';
import { getImgColor } from '@/helper/asset-helper';

interface FacadeLogoProps {
    name: string;       // 用于首字母
    logo?: string;      // logo URL
    protocol: string;   // 用于颜色
    className?: string;
}

/**
 * Facade Logo 组件 - 简洁现代风格
 * 灵感来自 Apple、Notion 的设计
 */
const FacadeLogo: React.FC<FacadeLogoProps> = React.memo(({ name, logo, protocol, className }) => {
    if (logo && logo !== "") {
        return (
            <div className={clsx('w-12 h-12 flex-shrink-0', className)}>
                <img
                    className="w-12 h-12 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    src={logo}
                    alt="logo"
                    loading="eager"
                />
            </div>
        );
    }

    return (
        <div
            className={clsx(
                'w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center',
                'text-white font-bold text-lg',
                'ring-1 ring-white/10',
                getImgColor(protocol),
                className
            )}
        >
            {name[0].toUpperCase()}
        </div>
    );
});

FacadeLogo.displayName = 'FacadeLogo';

export default FacadeLogo;
