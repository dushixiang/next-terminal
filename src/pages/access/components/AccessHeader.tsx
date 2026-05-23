import React from 'react';
import {Tooltip} from 'antd';
import {Palette, PanelLeftCloseIcon, PanelLeftOpenIcon, Settings, TerminalIcon} from 'lucide-react';
import brandingApi from '@/api/branding-api';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {Separator} from '@/components/ui/separator';
import {ACCESS_SIDEBAR_DEFAULT_SIZE} from '@/pages/access/constants';

interface AccessHeaderProps {
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    onThemeClick: () => void;
    onSettingClick: () => void;
    onBatchSSHClick: () => void;
}

/**
 * AccessHeader 组件
 * 显示顶部导航栏，包括 Logo、品牌名称和操作按钮
 */
const AccessHeader = React.memo(({
                                     isSidebarCollapsed,
                                     onToggleSidebar,
                                     onThemeClick,
                                     onSettingClick,
                                     onBatchSSHClick,
                                 }: AccessHeaderProps) => {
    const {t} = useTranslation();

    // 查询品牌信息
    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    const iconButtonClassName = 'flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white';

    return (
        <div className={'flex h-10 items-center bg-[#313131] text-white'}>
            <div
                className={'flex h-full shrink-0 items-center gap-2 px-2'}
                style={{width: `${ACCESS_SIDEBAR_DEFAULT_SIZE}%`}}
            >
                <a className={'flex min-w-0 flex-1 items-center gap-2 cursor-pointer'} href={'/'} target={'_blank'}>
                    <img src={brandingApi.getLogo()} alt='logo' className={'h-6 w-6 rounded'}/>
                    <div className={'truncate font-bold text-white'}>
                        {brandingQuery.data?.name}
                    </div>
                </a>

                <button
                    type="button"
                    className={iconButtonClassName}
                    onClick={onToggleSidebar}
                    aria-label="toggle-sidebar"
                >
                    {isSidebarCollapsed ? (
                        <PanelLeftOpenIcon className={'h-4 w-4'}/>
                    ) : (
                        <PanelLeftCloseIcon className={'h-4 w-4'}/>
                    )}
                </button>
            </div>

            <Separator orientation="vertical" className={'!h-5 bg-white/10'}/>

            <div className={'flex min-w-0 flex-1 items-center px-3'}>
                <div className={'flex items-center gap-1'}>
                    <Tooltip title={t('access.settings.theme')} placement={'bottom'}>
                        <button type="button" className={iconButtonClassName} onClick={onThemeClick}>
                            <Palette className={'h-4 w-4'}/>
                        </button>
                    </Tooltip>

                    <Tooltip title={t('menus.setting.label')} placement={'bottom'}>
                        <button type="button" className={iconButtonClassName} onClick={onSettingClick}>
                            <Settings className={'h-4 w-4'}/>
                        </button>
                    </Tooltip>

                    <Tooltip title={t('access.batch.exec')} placement={'bottom'}>
                        <button type="button" className={iconButtonClassName} onClick={onBatchSSHClick}>
                            <TerminalIcon className={'h-4 w-4'}/>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
});

AccessHeader.displayName = 'AccessHeader';

export default AccessHeader;
