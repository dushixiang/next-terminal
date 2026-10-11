import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeLdapMapping, ldapFormValues, ldapProperties, ldapPresets} from '../src/pages/sysconf/ldap-settings.ts';

test('LDAP 旧配置往返保留自定义属性，不提交预设和旧搜索上限', () => {
    const input = {
        'ldap-enabled': true,
        'ldap-department': 'default-department',
        'ldap-url': 'ldaps://dc.example.com:636',
        'ldap-user': 'service@example.com',
        'ldap-password': ' password ',
        'ldap-base-dn': 'DC=example,DC=com',
        'ldap-user-search-filter': '(objectClass=person)',
        'ldap-user-search-size-limit': 1000,
        'ldap-user-property-mapping': JSON.stringify({username: 'customUid', nickname: 'customName', mail: ''}),
    };
    const form = ldapFormValues(input);
    assert.equal(form.directoryType, 'custom');
    assert.equal(form.usernameAttribute, 'customUid');
    const output = ldapProperties(form);
    const {['ldap-user-search-size-limit']: ignored, ...expected} = input;
    assert.deepEqual(output, expected);
    assert.equal(output['ldap-password'], ' password ');
});

test('LDAP 错误映射不静默回退，只有未配置时保留历史默认值', () => {
    assert.throws(() => decodeLdapMapping('{bad'));
    assert.throws(() => decodeLdapMapping('{"username":""}'));
    assert.equal(ldapFormValues({'ldap-user-property-mapping': '{bad'}).usernameAttribute, '');
    assert.equal(ldapFormValues({}).usernameAttribute, 'cn');
});

test('AD 预设使用短账号属性并序列化为兼容的映射 JSON', () => {
    const form = {...ldapFormValues({'ldap-enabled': 'true'}), ...ldapPresets.ad};
    const output = ldapProperties(form);
    assert.equal(output['ldap-enabled'], true);
    assert.deepEqual(JSON.parse(output['ldap-user-property-mapping']), {username: 'sAMAccountName', nickname: 'displayName', mail: 'mail'});
    assert.equal(output['ldap-user-search-filter'], '(&(objectCategory=person)(objectClass=user))');
});
