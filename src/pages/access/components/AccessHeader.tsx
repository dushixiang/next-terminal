import React from 'react';
import {Tooltip} from 'antd';
import {Palette, Settings, TerminalIcon} from 'lucide-react';
import brandingApi from '@/api/branding-api';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';

interface AccessHeaderProps {
    onThemeClick: () => void;
    onSettingClick: () => void;
    onBatchSSHClick: () => void;
}

/**
 * AccessHeader 组件
 * 显示顶部导航栏，包括 Logo、品牌名称和操作按钮
 */
const AccessHeader = React.memo(({
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

    return (
        <div className={'text-white h-10 bg-[#313131] flex items-center gap-6'}>
            <div className={'flex items-center px-2 gap-2'}>
                <img src={brandingApi.getLogo()} alt='logo' className={'h-6 w-6 rounded'}/>
                <div className={'font-bold'}>
                    {brandingQuery.data?.name}
                </div>
            </div>

            <div className={'flex items-center gap-6 text-white'}>
                <Tooltip title={t('access.settings.theme')} placement={'right'}>
                    <Palette className={'h-4 w-4 cursor-pointer'} onClick={onThemeClick}/>
                </Tooltip>

                <Tooltip title={t('menus.setting.label')} placement={'right'}>
                    <Settings className={'h-4 w-4 cursor-pointer'} onClick={onSettingClick}/>
                </Tooltip>

                <Tooltip title={t('access.batch.exec')} placement={'right'}>
                    <TerminalIcon className={'h-4 w-4 cursor-pointer'} onClick={onBatchSSHClick}/>
                </Tooltip>
            </div>
        </div>
    );
});

AccessHeader.displayName = 'AccessHeader';

export default AccessHeader;
