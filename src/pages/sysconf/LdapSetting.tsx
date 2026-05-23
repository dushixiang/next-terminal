import React, {useState} from 'react';
import {Alert, Button, Form, Input, InputNumber, Switch} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import {useFormRequest} from "@/hook/use-antd-form-query";

const LdapSetting = ({
                         get,
                         set
                     }: SettingProps) => {

    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [enabled, setEnabled] = useState(false);
    let {license} = useLicense();

    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['ldap-enabled']);
        return data;
    };

    useFormRequest(form, ["form-request", "web/src/pages/sysconf/LdapSetting.tsx"], wrapGet, true);

    return <div>
        <Disabled disabled={!license.isEnterprise()}>
            <Alert title={t('settings.ldap.tip')} type={"info"} showIcon
                   style={{
                       marginBottom: 16
                   }}
            />
            <Form form={form} onFinish={set} layout="vertical">
                <Form.Item name="ldap-enabled" label={t('settings.ldap.setting')} required={true}
                           valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                            onChange={setEnabled}/>
                </Form.Item>
                <Form.Item name="ldap-url" label={t('settings.ldap.url')} required={true}>
                    <Input placeholder="ldap://server:389" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="ldap-user" label={t('settings.ldap.user')}
                           tooltip='cn=administrator,dc=domain,dc=com | administrator@domain.com' required={true}>
                    <Input placeholder="cn=administrator,dc=domain,dc=com | administrator@domain.com"
                           disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="ldap-password" label={t('settings.ldap.password')} required={true}>
                    <Input placeholder="******" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="ldap-base-dn" label={t('settings.ldap.base_dn')} tooltip='dc=domain,dc=com'
                           required={true}>
                    <Input placeholder="dc=domain,dc=com" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="ldap-user-search-size-limit" label={t('settings.ldap.user_search.size_limit')}
                           tooltip={t('settings.ldap.user_search.size_limit_tooltip')} required={true}>
                    <InputNumber placeholder="1000" disabled={!enabled} min={1} style={{
                        width: "100%"
                    }}/>
                </Form.Item>
                <Form.Item name="ldap-user-search-filter" label={t('settings.ldap.user_search.filter')}
                           tooltip={t('settings.ldap.user_search.filter_tooltip')} required={true}>
                    <Input placeholder="(objectClass=*)" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="ldap-user-property-mapping" label={t('settings.ldap.user_property_mapping')}
                           required={true}>
                    <Input placeholder='{"username": "cn", "nickname": "sn", "mail": "mail"}' disabled={!enabled}/>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                </Form.Item>
            </Form>
        </Disabled>
    </div>;
};
export default LdapSetting;
