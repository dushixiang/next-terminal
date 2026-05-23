import React, {useState} from 'react';
import {Alert, Button, Form, Input, InputNumber, Switch} from "antd";
import {SettingProps} from "./SettingPage";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {useFormRequest} from "@/hook/use-antd-form-query";

const OidcServerSetting = ({
                               get,
                               set
                           }: SettingProps) => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [enabled, setEnabled] = useState(false);
    const wrapGet = async () => {
        let data = await get();
        setEnabled(data['oidc-server-enabled']);
        return data;
    };
    useFormRequest(form, ["form-request", "web/src/pages/sysconf/OidcServerSetting.tsx"], wrapGet, true);
    return <div>
        <Alert title={t('settings.oidc_server.description')} description={<div>
            <p>
                {t('settings.oidc_server.manage_tip_prefix')}
                <Link to={'/oidc-client'}>{t('settings.oidc_server.manage_link')}</Link>
                {t('settings.oidc_server.manage_tip_suffix')}
            </p>
            <p>{t('settings.oidc_server.endpoints_title')}</p>
            <ul style={{
                marginBottom: 0
            }}>
                <li>{t('settings.oidc_server.endpoint.discovery')}: <code>/api/.well-known/openid-configuration</code>
                </li>
                <li>{t('settings.oidc_server.endpoint.jwks')}: <code>/api/oidc/server/.well-known/jwks.json</code></li>
                <li>{t('settings.oidc_server.endpoint.authorization')}: <code>/api/oidc/server/authorize</code></li>
                <li>{t('settings.oidc_server.endpoint.token')}: <code>/api/oidc/server/token</code></li>
                <li>{t('settings.oidc_server.endpoint.userinfo')}: <code>/api/oidc/server/userinfo</code></li>
            </ul>
        </div>} type="info" showIcon style={{
            marginBottom: 16
        }}/>
        <Form form={form} onFinish={set} layout="vertical">
            <Form.Item name="oidc-server-enabled" label={t('settings.oidc_server.enable_label')} rules={[{
                required: true
            }]} valuePropName="checked">
                <Switch checked={enabled} onChange={setEnabled} checkedChildren={t('general.enabled')}
                        unCheckedChildren={t('general.disabled')}/>
            </Form.Item>

            <Form.Item name="oidc-server-issuer" label={t('settings.oidc_server.issuer_label')}
                       tooltip={t('settings.oidc_server.issuer_tooltip')} rules={[{
                required: enabled,
                message: t('settings.oidc_server.issuer_required')
            }, {
                type: 'url',
                message: t('general.invalid_url')
            }]}>
                <Input disabled={!enabled} placeholder="https://next-terminal.example.com/api"/>
            </Form.Item>

            <Form.Item name="oidc-server-access-token-ttl" label={t('settings.oidc_server.access_token_ttl_label')}
                       tooltip={t('settings.oidc_server.access_token_ttl_tooltip')} rules={[{
                required: enabled,
                message: t('settings.oidc_server.ttl_required')
            }]}>
                <InputNumber precision={0} disabled={!enabled} placeholder="3600" min={60} max={86400} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item name="oidc-server-refresh-token-ttl" label={t('settings.oidc_server.refresh_token_ttl_label')}
                       tooltip={t('settings.oidc_server.refresh_token_ttl_tooltip')} rules={[{
                required: enabled,
                message: t('settings.oidc_server.ttl_required')
            }]}>
                <InputNumber precision={0} disabled={!enabled} placeholder="604800" min={3600} max={2592000} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item name="oidc-server-id-token-ttl" label={t('settings.oidc_server.id_token_ttl_label')}
                       tooltip={t('settings.oidc_server.id_token_ttl_tooltip')} rules={[{
                required: enabled,
                message: t('settings.oidc_server.ttl_required')
            }]}>
                <InputNumber precision={0} disabled={!enabled} placeholder="3600" min={60} max={86400} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item name="oidc-server-auth-code-ttl" label={t('settings.oidc_server.auth_code_ttl_label')}
                       tooltip={t('settings.oidc_server.auth_code_ttl_tooltip')} rules={[{
                required: enabled,
                message: t('settings.oidc_server.ttl_required')
            }]}>
                <InputNumber precision={0} disabled={!enabled} placeholder="600" min={60} max={1800} style={{
                    width: "100%"
                }}/>
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit">{t("actions.save")}</Button>
            </Form.Item>
        </Form>
    </div>;
};
export default OidcServerSetting;
