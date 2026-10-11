export interface LdapFormValues {
    'ldap-enabled': boolean;
    'ldap-department': string;
    'ldap-url': string;
    'ldap-user': string;
    'ldap-password': string;
    'ldap-base-dn': string;
    'ldap-user-search-filter': string;
    usernameAttribute: string;
    nicknameAttribute: string;
    mailAttribute: string;
    directoryType: 'ad' | 'openldap' | 'custom';
}

export const ldapPresets = {
    ad: {usernameAttribute: 'sAMAccountName', nicknameAttribute: 'displayName', mailAttribute: 'mail', 'ldap-user-search-filter': '(&(objectCategory=person)(objectClass=user))'},
    openldap: {usernameAttribute: 'uid', nicknameAttribute: 'cn', mailAttribute: 'mail', 'ldap-user-search-filter': '(objectClass=inetOrgPerson)'},
};

export const decodeLdapMapping = (raw?: string) => {
    if (!raw?.trim()) return {username: 'cn', nickname: 'sn', mail: 'mail'};
    const mapping = JSON.parse(raw);
    if (!mapping || typeof mapping.username !== 'string' || !mapping.username.trim()
        || mapping.nickname !== undefined && typeof mapping.nickname !== 'string'
        || mapping.mail !== undefined && typeof mapping.mail !== 'string') {
        throw new Error('Invalid LDAP mapping');
    }
    return mapping as {username: string; nickname?: string; mail?: string};
};

export const ldapFormValues = (properties: Record<string, any>): LdapFormValues => {
    let mapping;
    try {
        mapping = decodeLdapMapping(properties['ldap-user-property-mapping']);
    } catch {
        // Invalid historical settings must be corrected, not silently replaced with defaults.
        mapping = {username: '', nickname: '', mail: ''};
    }
    return {
        'ldap-enabled': properties['ldap-enabled'] === true || properties['ldap-enabled'] === 'true',
        'ldap-department': properties['ldap-department'] ?? '',
        'ldap-url': properties['ldap-url'] ?? '',
        'ldap-user': properties['ldap-user'] ?? '',
        'ldap-password': properties['ldap-password'] ?? '',
        'ldap-base-dn': properties['ldap-base-dn'] ?? '',
        'ldap-user-search-filter': properties['ldap-user-search-filter'] || '(objectClass=*)',
        usernameAttribute: mapping.username,
        nicknameAttribute: mapping.nickname ?? '',
        mailAttribute: mapping.mail ?? '',
        directoryType: 'custom',
    };
};

export const ldapProperties = (values: LdapFormValues): Record<string, unknown> => ({
    'ldap-enabled': values['ldap-enabled'],
    'ldap-department': values['ldap-department']?.trim() ?? '',
    'ldap-url': values['ldap-url']?.trim() ?? '',
    'ldap-user': values['ldap-user']?.trim() ?? '',
    'ldap-password': values['ldap-password'] ?? '',
    'ldap-base-dn': values['ldap-base-dn']?.trim() ?? '',
    'ldap-user-search-filter': values['ldap-user-search-filter']?.trim() ?? '',
    'ldap-user-property-mapping': JSON.stringify({
        username: values.usernameAttribute?.trim() ?? '',
        nickname: values.nicknameAttribute?.trim() ?? '',
        mail: values.mailAttribute?.trim() ?? '',
    }),
});
