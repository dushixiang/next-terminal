import type {AccountInfo} from '@/api/account-api';

export const agentAccessSettingUrl = '/setting?activeKey=security&securityActiveKey=api-access';

// 与后端系统属性接口权限一致，不以管理员身份代替权限检查。
export function canAccessAgentSettings(account: AccountInfo | undefined, method: 'GET' | 'PUT') {
    if (account?.type === 'super-admin') return true;
    return account?.type === 'admin' && account.permissions?.some(permission =>
        permission.method.toUpperCase() === method && permission.path === '/api/admin/properties') === true;
}
