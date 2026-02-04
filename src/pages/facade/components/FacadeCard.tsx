import React from 'react';
import clsx from 'clsx';
import { Badge, Popover, Tooltip, Typography } from 'antd';
import { ExternalLink, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssetUser } from '@/api/portal-api';
import { getProtocolColor } from '@/helper/asset-helper';
import FacadeLogo from './FacadeLogo';

interface FacadeCardProps {
    item: AssetUser;
    type: 'website' | 'asset';
    // Website 专用
    onOpen?: (id: string) => void;
    onAllowTempIP?: (id: string) => Promise<void>;
    allowLoading?: string;
    className?: string;
}

/**
 * Facade Card 组件 - 现代简洁风格
 * 灵感来自 Apple、Notion、Linear 的设计
 */
const FacadeCard: React.FC<FacadeCardProps> = React.memo(({
    item,
    type,
    onOpen,
    onAllowTempIP,
    allowLoading,
    className
}) => {
    const { t } = useTranslation();
    const tempAllowEnabled = type === 'website' && Boolean(item.attrs?.tempAllowEnabled);
    const isInactive = item.status === 'inactive';
    const hasUsers = item.users && item.users.length > 0;

    // 渲染用户徽章(仅资产模式)
    const renderUserBadge = () => {
        if (type !== 'asset' || !hasUsers) return null;

        return (
            <Tooltip title={item.users!.join("\n")}>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-300">{t('facade.in_use')}</span>
                </div>
            </Tooltip>
        );
    };

    // 渲染卡片内容
    const renderCardContent = () => (
        <div className={clsx(
            'relative overflow-hidden h-full flex flex-col',
            'rounded-xl',
            // 背景 - 纯色简洁设计
            'bg-white dark:bg-slate-900',
            // 边框 - 更细的边框
            'ring-1 ring-slate-200/60 dark:ring-slate-700/60',
            // 阴影 - 柔和且有层次
            'shadow-sm',
            'dark:shadow-md',
            // Hover 效果 - 微妙提升
            'transition-all duration-200 ease-out',
            'hover:shadow-md hover:ring-slate-300/60',
            'dark:hover:shadow-lg dark:hover:ring-slate-600/60',
            'hover:-translate-y-0.5',
            isInactive && 'opacity-50'
        )}>
            {/* 顶部状态栏 */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                {type === 'asset' && renderUserBadge()}
                <span className={clsx(
                    'px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase',
                    'text-white shadow-sm',
                    getProtocolColor(item.protocol)
                )}>
                    {item.protocol}
                </span>
            </div>

            {/* 主内容区 */}
            <div className="p-4 space-y-3 flex-1">
                {/* Logo 和信息 */}
                <div className="flex gap-3">
                    <div className="flex-shrink-0">
                        <FacadeLogo
                            name={item.name}
                            logo={item.logo}
                            protocol={item.protocol}
                        />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                        {/* 名称 */}
                        <Tooltip title={item.name}>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-20">
                                {item.name}
                            </h3>
                        </Tooltip>

                        {/* 别名 (仅资产) */}
                        {type === 'asset' && item.alias && (
                            <Tooltip title={item.alias}>
                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                    {item.alias}
                                </p>
                            </Tooltip>
                        )}

                        {/* 地址 */}
                        <Tooltip title={item.address}>
                            <p className="text-xs text-slate-500 dark:text-slate-500 truncate font-mono">
                                {item.address}
                            </p>
                        </Tooltip>
                    </div>
                </div>

                {/* 描述 */}
                {item.description && (
                    <Popover content={
                        <div onClick={(e) => {
                            if (type === 'asset') {
                                e.stopPropagation();
                                return false;
                            }
                        }}>
                            <Typography.Paragraph copyable style={{ marginBottom: 0, maxWidth: 300 }}>
                                {item.description}
                            </Typography.Paragraph>
                        </div>
                    }>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    </Popover>
                )}

                {/* 标签 */}
                {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {item.tags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/50 dark:ring-slate-700/50"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* 按钮区域 - 仅网站模式 */}
                {type === 'website' && (
                    <div className="flex items-center gap-1.5 pt-2.5 mt-auto border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={() => onOpen?.(item.id)}
                            className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1D79F0] hover:bg-[#1D79F0]/90 shadow-sm transition-all duration-150"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t('assets.access')}
                        </button>
                        {tempAllowEnabled && (
                            <button
                                onClick={() => onAllowTempIP?.(item.id)}
                                disabled={allowLoading === item.id}
                                className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {allowLoading === item.id ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="hidden sm:inline">{t('facade.processing')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{t('assets.temp_allow_action')}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // 网站模式:返回普通 div
    if (type === 'website') {
        return (
            <div className={clsx('group', className)}>
                {renderCardContent()}
            </div>
        );
    }

    // 资产模式:整个卡片可点击
    return (
        <div className={clsx('group', className)}>
            {renderCardContent()}
        </div>
    );
});

FacadeCard.displayName = 'FacadeCard';

export default FacadeCard;
