import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import type {MenuProps} from 'antd';
import {BugOutlined, ApiOutlined} from '@ant-design/icons';
import {LaptopIcon, LogOutIcon, UserIcon} from 'lucide-react';
import brandingApi from '@/api/branding-api.ts';
import accountApi from '@/api/account-api.ts';
import {canAccessAgentSettings} from '@/utils/agent-access';
import {baseUrl} from '@/api/core/requests.ts';

/**
 * 用户下拉菜单 Hook
 * 生成用户下拉菜单项
 */
export function useUserDropdownMenu() {
    const {t} = useTranslation();

    const brandingQuery = useQuery({
        queryKey: ['branding'],
        queryFn: brandingApi.getBranding,
    });

    const infoQuery = useQuery({queryKey: ['info'], queryFn: accountApi.getUserInfo});

    const dropMenus: MenuProps['items'] = [
        {
            key: 'my-asset',
            icon: <LaptopIcon className={'h-4 w-4'}/>,
            label: <Link to={'/x-asset'} target="_blank">{t('general.my_assets')}</Link>
        },
        {
            key: 'info',
            icon: <UserIcon className={'h-4 w-4'}/>,
            label: <Link to={'/info'}>{t('account.profile')}</Link>
        },
        ...((infoQuery.data?.apiKeyAccessEnabled || canAccessAgentSettings(infoQuery.data, 'PUT')) ? [{
            key: 'agent-access',
            icon: <ApiOutlined/>,
            label: <Link to='/agent-access'>{t('agent_access.title')}</Link>,
        }] : []),
        {
            key: 'openapi',
            icon: <ApiOutlined/>,
            label: <a target="_blank" rel="noopener noreferrer" href="/swagger/index.html">OpenAPI</a>,
        },
        {
            key: 'logout',
            icon: <LogOutIcon className={'h-4 w-4'}/>,
            danger: true,
            label: <div onClick={async () => {
                await accountApi.logout();
                window.location.href = '/login';
            }}>
                {t('account.logout')}
            </div>
        },
    ];

    // 如果启用了 debug 模式，添加 debug 菜单项
    if (brandingQuery.data?.debug) {
        dropMenus.push({
            key: 'debug',
            icon: <BugOutlined/>,
            label: <a target='_blank' rel="noreferrer" href={`${baseUrl()}/debug/pprof/`}>Debug</a>,
        });
    }

    return {dropMenus};
}
