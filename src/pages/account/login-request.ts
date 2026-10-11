import type {LoginAccount} from '@/api/account-api';

export const passwordLoginRequest = (values: LoginAccount, ldapEnabled: boolean, captchaKey?: string): LoginAccount => ({
    ...values,
    source: ldapEnabled && values.source === 'ldap' ? 'ldap' : 'password',
    key: captchaKey ?? '',
});
