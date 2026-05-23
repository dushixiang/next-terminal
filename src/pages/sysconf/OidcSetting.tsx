import React, {useState} from 'react';
import {Alert, Button, Form, Input, Switch} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import departmentApi from "@/api/department-api";
import ProFormTreeSelect from "@/components/ProFormTreeSelect";
import {useFormRequest} from "@/hook/use-antd-form-query";

const OidcSetting = ({
                         get,
                         set
                     }: SettingProps) => {
    let {t} = useTranslation();
    const [form] = Form.useForm();
    let [enabled, setEnabled] = useState(false);
    let {license} = useLicense();
    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['oidc-enabled']);
        return data;
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/OidcSetting.tsx"], wrapGet, true);
    return <div>
        <Disabled disabled={!license.isEnterprise()}>
            <Alert title={t('settings.oidc.tip')} type="info" showIcon style={{
                marginBottom: 16
            }}/>
            <Form form={form} onFinish={set} layout="vertical">
                <Form.Item name="oidc-enabled" label={t("settings.oidc.enabled")} rules={[{
                    required: true
                }]} valuePropName="checked">
                    <Switch checkedChildren={t('general.enabled')} unCheckedChildren={t('general.disabled')}
                            onChange={setEnabled}/>
                </Form.Item>
                <Form.Item name="oidc-issuer" label={t('settings.oidc.issuer')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.oidc.issuer_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="oidc-client-id" label={t('settings.oidc.client_id')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.oidc.client_id_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="oidc-client-secret" label={t('settings.oidc.client_secret')} rules={[{
                    required: enabled
                }]}>
                    <Input.Password placeholder="******" disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="oidc-redirect-uri" label={t('identity.oidc_client.redirect_uris')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.oidc.redirect_uri_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <Form.Item name="oidc-scopes" label={t('settings.oidc.scopes')} rules={[{
                    required: enabled
                }]}>
                    <Input placeholder={t('settings.oidc.scopes_placeholder')} disabled={!enabled}/>
                </Form.Item>
                <ProFormTreeSelect name="oidc-department" label={t('settings.oidc.department')}
                                   placeholder={t('settings.oidc.department_placeholder')} disabled={!enabled}
                                   fieldProps={{
                                       showSearch: true,
                                       treeDefaultExpandAll: true,
                                       treeNodeFilterProp: "title"
                                   }} request={async () => {
                    return await departmentApi.getTree();
                }}/>

                <Form.Item>
                    <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
                </Form.Item>
            </Form>
        </Disabled>
    </div>;
};
export default OidcSetting;
