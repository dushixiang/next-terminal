import {Alert, Button, Form, Input, Select, Space, Switch} from 'antd';
import {useMutation} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import type {SettingProps} from './SettingPage';
import Disabled from '@/components/Disabled';
import {useLicense} from '@/hook/LicenseContext';
import {useFormRequest} from '@/hook/use-antd-form-query';
import userApi from '@/api/user-api';
import departmentApi from '@/api/department-api';
import ProFormTreeSelect from '@/components/ProFormTreeSelect';
import {getErrorMessage} from '@/api/core/api-error';
import {decodeLdapMapping, ldapFormValues, ldapPresets, ldapProperties, type LdapFormValues} from './ldap-settings';

const LdapSetting = ({get, set}: SettingProps) => {
    const {t} = useTranslation();
    const {license} = useLicense();
    const [form] = Form.useForm<LdapFormValues>();
    const enabled = Form.useWatch('ldap-enabled', form) ?? false;
    const settings = useFormRequest(form, ['form-request', 'web/src/pages/sysconf/LdapSetting.tsx'], get, {transform: ldapFormValues});
    let invalidMapping = false;
    if (settings.data) {
        try { decodeLdapMapping(settings.data['ldap-user-property-mapping']); } catch { invalidMapping = true; }
    }
    const saveMutation = useMutation({
        mutationFn: (values: LdapFormValues) => set(ldapProperties(values)),
        onSuccess: (saved) => { if (saved !== false) settings.refetch(); },
    });
    const testMutation = useMutation({mutationFn: (values: LdapFormValues) => userApi.testLdap(ldapProperties(values))});
    const busy = saveMutation.isPending || testMutation.isPending;
    const required = [{required: enabled, whitespace: true}];
    const attributeRules = (mandatory: boolean) => [
        {required: enabled && mandatory, whitespace: true},
        {validator: async (_: unknown, value?: string) => {
            if (enabled && value && !/^([a-zA-Z][a-zA-Z0-9-]*|[0-9]+(\.[0-9]+)+)(;[a-zA-Z0-9-]+)*$/.test(value.trim())) {
                throw new Error(t('settings.ldap.attribute_invalid'));
            }
        }},
    ];
    const testConnection = async () => {
        try {
            const values = await form.validateFields();
            testMutation.reset();
            testMutation.mutate(values);
        } catch {
            // 校验错误由表单展示。
        }
    };

    return <Disabled feature="ldap" disabled={!license.hasPremiumFeatures()}>
        <div className="mb-4">
            <Alert type="info" showIcon title={t('settings.ldap.login_hint')} description={t('settings.ldap.ad_hint')}/>
        </div>
        {invalidMapping && <div className="mb-4">
            <Alert type="warning" showIcon title={t('settings.ldap.mapping_invalid')}/>
        </div>}
        {testMutation.isError && <div className="mb-4">
            <Alert type="error" showIcon
                   title={t('settings.ldap.test_failed')}
                   description={getErrorMessage(testMutation.error)}/>
        </div>}
        {testMutation.data && <div className="mb-4">
            <Alert type={testMutation.data.hasUsers ? 'success' : 'warning'} showIcon
                   title={t('settings.ldap.test_success')}
                   description={t(testMutation.data.hasUsers ? 'settings.ldap.test_has_users' : 'settings.ldap.test_no_users')}/>
        </div>}
        <Form form={form} onFinish={(values) => saveMutation.mutate(values)} layout="vertical" disabled={busy || settings.isPending}
              onValuesChange={() => { testMutation.reset(); }}>
            <Form.Item name="ldap-enabled" label={t('settings.ldap.setting')} valuePropName="checked">
                <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}/>
            </Form.Item>
            <Form.Item name="directoryType" label={t('settings.ldap.directory_type')} extra={t('settings.ldap.preset_hint')}>
                <Select disabled={!enabled || busy || settings.isPending} options={[
                    {value: 'ad', label: 'Microsoft Active Directory'},
                    {value: 'openldap', label: 'OpenLDAP'},
                    {value: 'custom', label: t('settings.ldap.custom')},
                ]} onChange={(value: LdapFormValues['directoryType']) => {
                    if (value !== 'custom') form.setFieldsValue(ldapPresets[value]);
                    testMutation.reset();
                }}/>
            </Form.Item>
            <Form.Item name="ldap-url" label={t('settings.ldap.url')} rules={[...required, {
                validator: async (_, value) => {
                    if (!enabled || !value) return;
                    try {
                        const url = new URL(value.trim());
                        if (!['ldap:', 'ldaps:'].includes(url.protocol) || !url.hostname || url.username || url.password
                            || url.pathname && url.pathname !== '/' || url.search || url.hash) throw new Error();
                    } catch { throw new Error(t('settings.ldap.url_invalid')); }
                },
            }]}>
                <Input placeholder="ldaps://dc.domain.com:636" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="ldap-user" label={t('settings.ldap.user')} rules={required}
                       tooltip="CN=service,OU=Service Accounts,DC=domain,DC=com | service@domain.com">
                <Input placeholder="service@domain.com" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="ldap-password" label={t('settings.ldap.password')} rules={[{required: enabled}]}>
                <Input.Password autoComplete="new-password" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="ldap-base-dn" label={t('settings.ldap.base_dn')} rules={required}>
                <Input placeholder="DC=domain,DC=com" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="ldap-user-search-filter" label={t('settings.ldap.user_search.filter')}
                       extra={t('settings.ldap.filter_hint')} rules={required}>
                <Input placeholder="(&(objectCategory=person)(objectClass=user))" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="usernameAttribute" label={t('settings.ldap.username_attribute')} rules={attributeRules(true)}>
                <Input placeholder="sAMAccountName" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="nicknameAttribute" label={t('settings.ldap.nickname_attribute')} rules={attributeRules(false)}>
                <Input placeholder="displayName" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <Form.Item name="mailAttribute" label={t('settings.ldap.mail_attribute')} rules={attributeRules(false)}>
                <Input placeholder="mail" disabled={!enabled || busy || settings.isPending}/>
            </Form.Item>
            <ProFormTreeSelect name="ldap-department" queryKey={['ldap-departments']}
                               label={t('settings.ldap.department')} extra={t('settings.ldap.department_hint')}
                               placeholder={t('settings.oidc.department_placeholder')}
                               allowClear disabled={!enabled || busy || settings.isPending}
                               fieldProps={{showSearch: {treeNodeFilterProp: 'title'}, treeDefaultExpandAll: true}}
                               request={departmentApi.getTree}/>
            <Form.Item>
                <Space wrap>
                    <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>{t('actions.save')}</Button>
                    <Button disabled={!enabled || busy || settings.isPending} loading={testMutation.isPending} onClick={testConnection}>
                        {t('settings.ldap.test_connection')}
                    </Button>

                </Space>
            </Form.Item>
        </Form>
    </Disabled>;
};
export default LdapSetting;
